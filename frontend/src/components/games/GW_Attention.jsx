import { useState, useEffect, useRef, useCallback } from 'react'

const CHARACTERS = ['🐶', '🐱', '🐻', '🐼', '🐨', '🦊', '🐸', '🧸']

export default function GW_Attention({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  childName,
  gameDuration = 120, // Đã sửa thành 120 giây (2 phút)
}) {
  const [currentChar, setCurrentChar] = useState('🐶')
  const [score, setScore]             = useState(0)
  const [phase, setPhase]             = useState('idle') // idle | waiting | responded
  const [message, setMessage]         = useState(`👂 Bấm 🔊 để gọi tên ${childName}!`)
  const [callCount, setCallCount]     = useState(0)

  const gameCompletedRef    = useRef(false)
  const lastRecordTimeRef   = useRef(0)
  const animationRef        = useRef(0)
  const scoreRef            = useRef(0)
  const phaseRef            = useRef('idle')
  const lastCallTimeRef     = useRef(null)
  const callCountRef        = useRef(0)
  const responseCooldownRef = useRef(0)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // Xử lý khi hết 2 phút (120s)
  useEffect(() => {
    if (timeElapsed >= gameDuration && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      // Tính điểm phần trăm: (Số lần phản hồi / Tổng số lần gọi) * 100
      const finalScore = callCountRef.current > 0 
        ? Math.round((scoreRef.current / callCountRef.current) * 100) 
        : 0
      onScore?.(finalScore)
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

  // Gọi tên — Nút gọi sẽ bị disable sau khi bấm
  const callName = useCallback(() => {
    if (gameCompletedRef.current || phaseRef.current === 'waiting') return
    
    speak(`${childName} ơi!`)
    
    const now = Date.now()
    lastCallTimeRef.current     = now
    responseCooldownRef.current = now + 1500 
    callCountRef.current       += 1
    
    setCallCount(callCountRef.current)
    setPhase('waiting')
    phaseRef.current = 'waiting'
    setMessage(`🔊 Đang gọi "${childName}"... Bé có quay lại không?`)
  }, [childName])

  // Xử lý phản hồi (Bấm nút thủ công hoặc AI tự nhận diện)
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
        timestamp:          Date.now(),
        isLookingAtTarget: true,
        responseLatency:    rt,
        callAttempt:        callCountRef.current,
      })
      // Đã xóa điều kiện dừng game khi đạt 3 điểm ở đây
    } else {
      setMessage('😔 Bé chưa phản hồi lần này')
      onFeatureCapture?.({
        timestamp:          Date.now(),
        isLookingAtTarget: false,
        callAttempt:        callCountRef.current,
      })
    }

    // Sau khi xác nhận, đợi 2.5s để reset lại trạng thái cho phép gọi tiếp
    setTimeout(() => {
      if (!gameCompletedRef.current) {
        setCurrentChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
        setPhase('idle')
        phaseRef.current = 'idle'
        lastCallTimeRef.current = null
        setMessage(`👂 Bấm 🔊 để gọi tiếp ${childName}!`)
      }
    }, 2500)
  }, [childName, onFeatureCapture])

  // Vòng lặp AI - Nhận diện tự động nếu bé nhìn vào cam
  const updateLoop = useCallback(() => {
    const now     = Date.now()
    const aiData  = latestAIResult?.current?.features

    if (
      now - lastRecordTimeRef.current > 300 &&
      phaseRef.current === 'waiting' &&
      aiData &&
      !gameCompletedRef.current &&
      now > responseCooldownRef.current
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

      {/* Hiển thị số lần phản hồi / tổng số lần gọi */}
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'white', padding: '10px 25px', borderRadius: 30, fontSize: '1.2rem', fontWeight: 'bold' }}>
        ★ {score} / {callCount}
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

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Nút gọi tên */}
        <button
          onClick={callName}
          disabled={phase !== 'idle'}
          style={{
            fontSize: '1.1rem', padding: '12px 28px',
            background: phase !== 'idle' ? '#94a3b8' : '#00b894',
            color: 'white', border: 'none', borderRadius: 50, cursor: phase !== 'idle' ? 'not-allowed' : 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.2)', fontWeight: 700,
            transition: 'background 0.2s'
          }}>
          🔊 Gọi tên {childName}
        </button>

        {/* Cụm Nút xác nhận — chỉ hiện khi waiting */}
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
      <div style={{ marginTop: 8, fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'center', padding: '0 20px', minHeight: '30px' }}>
        {message}
      </div>
      <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
        Bấm 🔊 → quan sát bé → xác nhận kết quả
      </p>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
    </div>
  )
}