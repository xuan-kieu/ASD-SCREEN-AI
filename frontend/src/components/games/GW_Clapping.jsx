import { useState, useEffect, useRef, useCallback } from 'react'

const ACTIONS = [
  { name: 'vỗ tay', emoji: '👏' },
  { name: 'vẫy tay', emoji: '👋' },
]

export default function GW_Clapping({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  gameDuration = 120,
}) {
  const [currentAction, setCurrentAction] = useState({ name: 'vỗ tay', emoji: '👏' })
  const [score, setScore] = useState(0)
  const [isWaiting, setIsWaiting] = useState(false)
  const [lastActionTime, setLastActionTime] = useState(null)
  const [message, setMessage] = useState('🐻 Làm theo bạn nhé!')

  const gameCompletedRef = useRef(false)
  const lastRecordTimeRef = useRef(0)
  const animationRef = useRef(0)
  const scoreRef = useRef(0)
  const isWaitingRef = useRef(false)
  const lastActionTimeRef = useRef(null)
  const currentActionRef = useRef({ name: 'vỗ tay', emoji: '👏' })

  useEffect(() => { isWaitingRef.current = isWaiting }, [isWaiting])
  useEffect(() => { lastActionTimeRef.current = lastActionTime }, [lastActionTime])
  useEffect(() => { currentActionRef.current = currentAction }, [currentAction])

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
      window.speechSynthesis.speak(msg)
    }
  }

  const performAction = useCallback(() => {
    if (gameCompletedRef.current) return
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
    setCurrentAction(action)
    currentActionRef.current = action
    setIsWaiting(true)
    isWaitingRef.current = true
    const now = Date.now()
    setLastActionTime(now)
    lastActionTimeRef.current = now
    setMessage(`🐻 Bé hãy ${action.name} nào!`)
    speak(`Bé hãy ${action.name} nào!`)
  }, [])

  const handleSuccess = useCallback((reactionTime) => {
    if (gameCompletedRef.current) return
    scoreRef.current += 1
    setScore(scoreRef.current)
    setMessage(`🎉 Đúng rồi! (${reactionTime}ms)`)
    setIsWaiting(false)
    isWaitingRef.current = false

    onFeatureCapture?.({
      timestamp: Date.now(),
      isLookingAtTarget: true,
      imitationLatency: reactionTime,
      imitationSuccess: true,
      actionName: currentActionRef.current.name,
    })

    if (scoreRef.current >= 3 && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      setTimeout(() => onScore?.(scoreRef.current * 30), 1000)
      return
    }

    setTimeout(performAction, 2500)
  }, [onFeatureCapture, onScore, performAction])

  const updateLoop = useCallback(() => {
    const now = Date.now()
    if (now - lastRecordTimeRef.current > 200) {
      const aiData = latestAIResult?.current?.features
      if (isWaitingRef.current && aiData && !gameCompletedRef.current) {
        if (aiData.handDetected) {
          handleSuccess(now - (lastActionTimeRef.current || now))
        }
      }
      lastRecordTimeRef.current = now
    }
    animationRef.current = requestAnimationFrame(updateLoop)
  }, [latestAIResult, handleSuccess])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateLoop)
    const startTimer = setTimeout(performAction, 2000)
    return () => {
      cancelAnimationFrame(animationRef.current)
      clearTimeout(startTimer)
      window.speechSynthesis.cancel()
    }
  }, [updateLoop, performAction])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffeaa7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 40 }}>
      <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '10px 20px', borderRadius: 30 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'white', padding: '10px 25px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold', color: '#00b894' }}>
        ★ {score}/3
      </div>

      <div style={{ fontSize: 180, marginBottom: 20 }}>{currentAction.emoji}</div>
      <div style={{ fontSize: '1.5rem', marginBottom: 20, fontWeight: 'bold' }}>{message}</div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Nút bấm thủ công khi bé vỗ tay */}
        <div
          onClick={() => isWaitingRef.current && handleSuccess(Date.now() - (lastActionTimeRef.current || 0))}
          style={{ width: 120, height: 120, borderRadius: 60, background: '#22c55e', border: '5px solid white', cursor: 'pointer', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
        >
          👏
        </div>
        {/* Nút bé không làm theo */}
        {isWaiting && (
          <div
            onClick={() => {
              if (!isWaitingRef.current || gameCompletedRef.current) return
              setIsWaiting(false)
              isWaitingRef.current = false
              setMessage('😔 Bé chưa làm theo lần này')
              onFeatureCapture?.({ timestamp: Date.now(), imitationSuccess: false, actionName: currentActionRef.current.name })
              setTimeout(performAction, 2000)
            }}
            style={{ width: 120, height: 120, borderRadius: 60, background: '#ef4444', border: '5px solid white', cursor: 'pointer', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
          >
            ❌
          </div>
        )}
      </div>
      <p style={{ marginTop: 16, color: '#666', fontSize: 13 }}>Bấm 👏 khi bé làm theo • Bấm ❌ nếu không</p>
    </div>
  )
}