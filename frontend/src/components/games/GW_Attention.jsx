import { useState, useEffect, useRef, useCallback } from 'react'

const CHARACTERS = ['🐶', '🐱', '🐻', '🐼', '🐨', '🦊', '🐸', '🧸']

export default function GW_Attention({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  childName,
  gameDuration = 60,
}) {
  const [currentChar, setCurrentChar] = useState('🐶')
  const [score, setScore]             = useState(0)
  const [phase, setPhase]             = useState('idle') // idle | calling | waiting | responded
  const [message, setMessage]         = useState(`👂 Bấm 🔊 để gọi tên ${childName}!`)
  const [callCount, setCallCount]     = useState(0)

  const gameCompletedRef    = useRef(false)
  const lastRecordTimeRef   = useRef(0)
  const animationRef        = useRef(0)
  const scoreRef            = useRef(0)
  const phaseRef            = useRef('idle')
  const lastCallTimeRef     = useRef(null)
  const callCountRef        = useRef(0)
  // Cooldown để tránh AI detect liên tục gây phản hồi ngay lập tức
  const responseCooldownRef = useRef(0)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // Fallback hết giờ
  useEffect(() => {
    if (timeElapsed >= gameDuration && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      onScore?.(Math.min(100, scoreRef.current * 30))
    }
  }, [timeElapsed, gameDuration, onScore])

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const msg = new SpeechSynthesisUtterance(text)
      msg.lang  = 'vi-VN'
      msg.rate  = 0.85
      window.speechSynthesis.speak(msg)
    }
  }

  // Gọi tên — chỉ khi bấm nút, không tự động
  const callName = useCallback(() => {
    if (gameCompletedRef.current || phaseRef.current === 'waiting') return
    speak(`${childName} ơi!`)
    const now = Date.now()
    lastCallTimeRef.current   = now
    responseCooldownRef.current = now + 1500 // Cooldown 1.5s — tránh AI phản hồi ngay
    callCountRef.current += 1
    setCallCount(callCountRef.current)
    setPhase('waiting')
    phaseRef.current = 'waiting'
    setMessage(`🔊 Đang gọi "${childName}"... Bé có quay lại không?`)
  }, [childName])

  // Xử lý phản hồi
  const handleResponse = useCallback((didRespond, reactionMs = null) => {
    if (phaseRef.current !== 'waiting' || gameCompletedRef.current) return

    const rt = reactionMs ?? (lastCallTimeRef.current ? Date.now() - lastCallTimeRef.current : 0)

    setPhase('responded')
    phaseRef.current = 'responded'

    if (didRespond) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      setMessage(`🎉 Bé phản hồi! (${rt}ms)`)
      onFeatureCapture?.({
        timestamp:        Date.now(),
        isLookingAtTarget: true,
        responseLatency:  rt,
        callAttempt:      callCountRef.current,
      })
      if (scoreRef.current >= 3 && !gameCompletedRef.current) {
        gameCompletedRef.current = true
        setTimeout(() => onScore?.(Math.min(100, scoreRef.current * 30)), 1000)
        return
      }
    } else {
      setMessage('😔 Bé chưa phản hồi lần này')
      onFeatureCapture?.({
        timestamp:        Date.now(),
        isLookingAtTarget: false,
        callAttempt:      callCountRef.current,
      })
    }

    // Reset sau 2.5s
    setTimeout(() => {
      if (!gameCompletedRef.current) {
        setCurrentChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
        setPhase('idle')
        phaseRef.current = 'idle'
        lastCallTimeRef.current = null
        setMessage(`👂 Bấm 🔊 để gọi tên ${childName}!`)
      }
    }, 2500)
  }, [childName, onFeatureCapture, onScore])

  // AI detection loop — chỉ detect khi đang waiting VÀ hết cooldown
  const updateLoop = useCallback(() => {
    const now     = Date.now()
    const aiData  = latestAIResult?.current?.features

    if (
      now - lastRecordTimeRef.current > 300 &&
      phaseRef.current === 'waiting' &&
      aiData &&
      !gameCompletedRef.current &&
      now > responseCooldownRef.current // Hết cooldown mới detect
    ) {
      const gazeX = aiData.gazeX ?? 0.5
      const gazeY = aiData.gazeY ?? 0.5
      const isLooking = gazeX > 0.35 && gazeX < 0.65 && gazeY > 0.25 && gazeY < 0.75

      if (isLooking && lastCallTimeRef.current) {
        const rt = now - lastCallTimeRef.current
        handleResponse(true, rt)
      }
      lastRecordTimeRef.current = now
    }

    animationRef.current = requestAnimationFrame(updateLoop)
  }, [latestAIResult, handleResponse])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateLoop)
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.speechSynthesis.cancel()
    }
  }, [updateLoop])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(135deg, #ffeaa7, #74b9ff)', borderRadius: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>

      {/* Timer */}
      <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '10px 20px', borderRadius: 30 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>

      {/* Score */}
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'white', padding: '10px 25px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold' }}>
        ★ {score}/3
      </div>

      {/* Nhân vật */}
      <div style={{
        fontSize: 140, margin: '50px 0 20px',
        filter: phase === 'waiting' ? 'drop-shadow(0 0 20px rgba(255,200,0,0.8))' : 'none',
        transition: 'filter 0.3s',
        animation: 'bounce 2s infinite'
      }}>
        {currentChar}
      </div>

      {/* Số lần gọi */}
      {callCount > 0 && (
        <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
          Đã gọi {callCount} lần
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Nút gọi tên — luôn hiện, disable khi đang waiting */}
        <button
          onClick={callName}
          disabled={phase === 'waiting' || phase === 'calling'}
          style={{
            fontSize: '1.1rem', padding: '12px 28px',
            background: phase === 'waiting' ? '#94a3b8' : '#00b894',
            color: 'white', border: 'none', borderRadius: 50, cursor: phase === 'waiting' ? 'not-allowed' : 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)', fontWeight: 700,
            transition: 'background 0.2s'
          }}>
          🔊 Gọi tên {childName}
        </button>

        {/* Nút xác nhận — chỉ hiện khi waiting */}
        {phase === 'waiting' && (
          <>
            <button
              onClick={() => handleResponse(true)}
              style={{ fontSize: '1rem', padding: '12px 22px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 50, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              ✅ Bé quay lại
            </button>
            <button
              onClick={() => handleResponse(false)}
              style={{ fontSize: '1rem', padding: '12px 22px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 50, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              ❌ Không phản hồi
            </button>
          </>
        )}
      </div>

      {/* Hướng dẫn */}
      <div style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', padding: '0 20px' }}>
        {message}
      </div>
      <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
        Bấm 🔊 → quan sát bé → xác nhận kết quả
      </p>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
    </div>
  )
}