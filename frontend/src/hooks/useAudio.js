/**
 * hooks/useAudio.js
 * Hook thu âm real-time và gửi lên backend phân tích mỗi 5 giây
 *
 * Usage trong game:
 *   const { audioResult, isRecording, startRecording, stopRecording } = useAudio({
 *     gameSessionId,
 *     gameCode,
 *     onResult: (result) => console.log(result),
 *   })
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import api from '../api/axios'

const CHUNK_INTERVAL_MS = 5000  // Gửi chunk mỗi 5 giây

export default function useAudio({
  gameSessionId = null,
  gameCode = null,
  onResult = null,
  enabled = true,
} = {}) {
  const [isRecording, setIsRecording]   = useState(false)
  const [audioResult, setAudioResult]   = useState(null)  // Kết quả chunk mới nhất
  const [allResults, setAllResults]     = useState([])    // Tất cả kết quả
  const [error, setError]               = useState(null)
  const [permission, setPermission]     = useState(null)  // 'granted'|'denied'|null

  const mediaRecorderRef = useRef(null)
  const streamRef        = useRef(null)
  const intervalRef      = useRef(null)
  const chunksRef        = useRef([])
  const isActiveRef      = useRef(false)

  // ── Xin quyền mic ──────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 22050,
        }
      })
      streamRef.current = stream
      setPermission('granted')
      return true
    } catch (err) {
      setPermission('denied')
      setError('Không có quyền truy cập microphone')
      return false
    }
  }, [])

  // ── Gửi chunk lên backend ──────────────────────────────────────────────
  const sendChunk = useCallback(async (blob) => {
    if (!blob || blob.size < 500) return

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'chunk.webm')
      if (gameSessionId) formData.append('game_session_id', gameSessionId)
      if (gameCode)      formData.append('game_code', gameCode)

      const res = await api.post('/audio/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 8000,
      })

      const result = res.data.analysis
      setAudioResult(result)
      setAllResults(prev => [...prev, result])

      // Callback cho game component
      if (onResult) onResult(result)

    } catch (err) {
      console.warn('[AUDIO] Chunk send error:', err?.message)
    }
  }, [gameSessionId, gameCode, onResult])

  // ── Bắt đầu recording ──────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!enabled) return
    if (isActiveRef.current) return

    // Xin quyền nếu chưa có stream
    if (!streamRef.current) {
      const ok = await requestPermission()
      if (!ok) return
    }

    try {
      // Chọn mimeType phù hợp với browser
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'

      const recorder = new MediaRecorder(streamRef.current, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      isActiveRef.current = true
      setIsRecording(true)
      setError(null)

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.start()

      // Mỗi CHUNK_INTERVAL_MS giây: dừng → gửi → bắt đầu lại
      intervalRef.current = setInterval(() => {
        if (!isActiveRef.current) return
        if (recorder.state === 'recording') {
          recorder.stop()
          recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType })
            chunksRef.current = []
            sendChunk(blob)
            // Bắt đầu lại nếu vẫn active
            if (isActiveRef.current) {
              try { recorder.start() } catch (e) {}
            }
          }
        }
      }, CHUNK_INTERVAL_MS)

    } catch (err) {
      setError(`Lỗi khởi động microphone: ${err.message}`)
      setIsRecording(false)
      isActiveRef.current = false
    }
  }, [enabled, requestPermission, sendChunk])

  // ── Dừng recording ─────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    isActiveRef.current = false
    clearInterval(intervalRef.current)

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    setIsRecording(false)

    // Finalize session trên backend
    if (gameSessionId) {
      try {
        const res = await api.post(`/audio/session/${gameSessionId}/finalize`)
        return res.data.summary
      } catch (err) {
        console.warn('[AUDIO] Finalize error:', err?.message)
      }
    }
    return null
  }, [gameSessionId])

  // ── Cleanup khi unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      clearInterval(intervalRef.current)
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ── Tóm tắt kết quả hiện tại ──────────────────────────────────────────
  const getCurrentSummary = useCallback(() => {
    if (!allResults.length) return null
    const hasVoiceCount = allResults.filter(r => r.has_voice).length
    const emotions = allResults.map(r => r.emotion).filter(Boolean)
    const emotionCounts = emotions.reduce((acc, e) => {
      acc[e] = (acc[e] || 0) + 1; return acc
    }, {})
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'
    const avgLanguageScore = allResults.reduce((s, r) => s + (r.language_score || 0), 0)
      / allResults.length

    return {
      has_voice_ratio:  hasVoiceCount / allResults.length,
      dominant_emotion: dominantEmotion,
      language_score:   Math.round(avgLanguageScore),
      chunks_count:     allResults.length,
    }
  }, [allResults])

  return {
    isRecording,
    audioResult,      // Kết quả chunk mới nhất
    allResults,       // Tất cả kết quả
    error,
    permission,
    startRecording,
    stopRecording,
    getCurrentSummary,
    requestPermission,
  }
}
