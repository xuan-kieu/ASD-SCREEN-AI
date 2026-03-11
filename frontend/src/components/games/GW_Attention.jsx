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
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [lastCallTime, setLastCallTime] = useState(null)
  const [responded, setResponded] = useState(false)
  const [message, setMessage] = useState('👂 Nghe gọi tên và quay lại nhé!')

  const gameCompletedRef = useRef(false)
  const lastRecordTimeRef = useRef(0)
  const animationRef = useRef(0)
  const scoreRef = useRef(0)
  const respondedRef = useRef(false)
  const lastCallTimeRef = useRef(null)
  const attemptsRef = useRef(0)

  useEffect(() => { respondedRef.current = responded }, [responded])
  useEffect(() => { lastCallTimeRef.current = lastCallTime }, [lastCallTime])
  useEffect(() => { attemptsRef.current = attempts }, [attempts])

  // Fallback: hết giờ → gọi onScore với điểm hiện tại
  useEffect(() => {
    if (timeElapsed >= gameDuration && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      onScore?.(scoreRef.current * 30)
    }
  }, [timeElapsed, gameDuration, onScore])

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const msg = new SpeechSynthesisUtterance(text)
      msg.lang = 'vi-VN'
      msg.rate = 0.9
      window.speechSynthesis.speak(msg)
    }
  }

  const callName = useCallback(() => {
    if (respondedRef.current || gameCompletedRef.current) return
    speak(`${childName} ơi!`)
    const now = Date.now()
    setLastCallTime(now)
    lastCallTimeRef.current = now
    setResponded(false)
    respondedRef.current = false
    setMessage(`📢 Gọi ${childName}...`)
    setAttempts(prev => { attemptsRef.current = prev + 1; return prev + 1 })
  }, [childName])

  // Nút thủ công: giám sát viên xác nhận bé có/không phản hồi
  const handleManualResponse = (didRespond) => {
    if (respondedRef.current || gameCompletedRef.current || !lastCallTimeRef.current) return
    const reactionMs = Date.now() - lastCallTimeRef.current
    setResponded(true)
    respondedRef.current = true

    if (didRespond) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      setMessage(`🎉 Bé phản ứng! (${reactionMs}ms)`)
      onFeatureCapture?.({
        timestamp: Date.now(),
        isLookingAtTarget: true,
        responseLatency: reactionMs,
        callAttempt: attemptsRef.current,
        manualInput: true,
      })

      if (scoreRef.current >= 3 && !gameCompletedRef.current) {
        gameCompletedRef.current = true
        setTimeout(() => onScore?.(scoreRef.current * 30), 1000)
        return
      }
    } else {
      setMessage('😔 Bé chưa phản hồi lần này')
      onFeatureCapture?.({
        timestamp: Date.now(),
        isLookingAtTarget: false,
        callAttempt: attemptsRef.current,
        manualInput: true,
      })
    }

    setTimeout(() => {
      if (!gameCompletedRef.current) {
        setCurrentChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
        setResponded(false)
        respondedRef.current = false
        setLastCallTime(null)
        lastCallTimeRef.current = null
      }
    }, 2000)
  }

  const updateLoop = useCallback(() => {
    const now = Date.now()
    if (now - lastRecordTimeRef.current > 250) {
      const aiData = latestAIResult?.current?.features
      const lct = lastCallTimeRef.current

      if (aiData && lct && !respondedRef.current && !gameCompletedRef.current) {
        const gazeX = aiData.gazeX ?? 0.5
        const gazeY = aiData.gazeY ?? 0.5
        const isLookingAtCharacter = gazeX > 0.35 && gazeX < 0.65 && gazeY > 0.35 && gazeY < 0.65

        if (isLookingAtCharacter) {
          const reactionMs = now - lct
          setResponded(true)
          respondedRef.current = true
          scoreRef.current += 1
          setScore(scoreRef.current)
          setMessage(`🎉 Bé phản ứng sau ${reactionMs}ms!`)

          onFeatureCapture?.({
            timestamp: now, gazeX, gazeY,
            targetX: 50, targetY: 50,
            isLookingAtTarget: true,
            responseLatency: reactionMs,
            callAttempt: attemptsRef.current,
          })

          if (scoreRef.current >= 3 && !gameCompletedRef.current) {
            gameCompletedRef.current = true
            setTimeout(() => onScore?.(scoreRef.current * 30), 1000)
          }

          setTimeout(() => {
            if (!gameCompletedRef.current) {
              setCurrentChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)])
              setResponded(false)
              respondedRef.current = false
              setLastCallTime(null)
              lastCallTimeRef.current = null
            }
          }, 2000)
        }
      }
      lastRecordTimeRef.current = now
    }
    animationRef.current = requestAnimationFrame(updateLoop)
  }, [latestAIResult, onFeatureCapture, onScore, childName])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateLoop)
    const startTimer = setTimeout(callName, 2000)
    return () => {
      cancelAnimationFrame(animationRef.current)
      clearTimeout(startTimer)
      window.speechSynthesis.cancel()
    }
  }, [updateLoop, callName])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'linear-gradient(135deg, #ffeaa7, #74b9ff)', borderRadius: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '10px 20px', borderRadius: 30 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'white', padding: '10px 25px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold' }}>
        ★ {score}/3
      </div>

      <div style={{ fontSize: 150, margin: '40px 0', animation: 'bounce 2s infinite' }}>{currentChar}</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={callName}
          style={{ fontSize: '1.2rem', padding: '12px 24px', background: '#00b894', color: 'white', border: 'none', borderRadius: 50, cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
          📢 Gọi tên bé
        </button>
        {lastCallTime && !responded && (
          <>
            <button onClick={() => handleManualResponse(true)}
              style={{ fontSize: '1rem', padding: '12px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 50, cursor: 'pointer' }}>
              ✅ Bé quay lại
            </button>
            <button onClick={() => handleManualResponse(false)}
              style={{ fontSize: '1rem', padding: '12px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 50, cursor: 'pointer' }}>
              ❌ Không phản hồi
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: '1.2rem', fontWeight: 'bold' }}>{message}</div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
    </div>
  )
}