import { useState, useEffect, useRef, useCallback } from 'react'

const ACTIONS = [
  { name: 'vỗ tay', emoji: '👏' },
  { name: 'vẫy tay', emoji: '👋' },
]

const playClap = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const bufferSize = ctx.sampleRate * 0.15
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1200
    filter.Q.value = 0.8
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(1.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start()
    setTimeout(() => ctx.close(), 500)
  } catch (e) {
    console.log('Audio not supported')
  }
}

export default function GW_Clapping({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  gameDuration = 120,
}) {
  const [currentAction, setCurrentAction] = useState(ACTIONS[0])
  const [score, setScore]                 = useState(0)
  const [phase, setPhase]                 = useState('idle')
  const [message, setMessage]             = useState('🐻 Bấm ▶ để bắt đầu!')

  const gameCompletedRef    = useRef(false)
  const lastRecordTimeRef   = useRef(0)
  const animationRef        = useRef(0)
  const scoreRef            = useRef(0)
  const phaseRef            = useRef('idle')
  const lastActionTimeRef   = useRef(null)
  const currentActionRef    = useRef(ACTIONS[0])
  const handCooldownRef     = useRef(0)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { currentActionRef.current = currentAction }, [currentAction])

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
      msg.lang = 'vi-VN'
      window.speechSynthesis.speak(msg)
    }
  }

  const performAction = useCallback(() => {
    if (gameCompletedRef.current) return
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
    setCurrentAction(action)
    currentActionRef.current = action
    const now = Date.now()
    lastActionTimeRef.current = now
    handCooldownRef.current   = now + 1000
    setPhase('waiting')
    phaseRef.current = 'waiting'
    setMessage(`🐻 Bé hãy ${action.name} nào!`)
    speak(`Bé hãy ${action.name} nào!`)
    if (action.name === 'vỗ tay') {
      // Phát 2 tiếng vỗ tay liên tiếp để làm mẫu
      playClap()
      setTimeout(playClap, 300)
      setTimeout(playClap, 600)
    }
  }, [])

  const handleSuccess = useCallback((reactionTime) => {
    if (gameCompletedRef.current || phaseRef.current !== 'waiting') return

    // Phát tiếng vỗ tay khi bé làm đúng
    playClap()
    setTimeout(playClap, 250)

    scoreRef.current += 1
    setScore(scoreRef.current)
    setPhase('responded')
    phaseRef.current = 'responded'
    setMessage(`🎉 Đúng rồi! (${reactionTime}ms)`)

    onFeatureCapture?.({
      timestamp:         Date.now(),
      isLookingAtTarget: true,
      imitationLatency:  reactionTime,
      imitationSuccess:  true,
      actionName:        currentActionRef.current.name,
    })

    if (scoreRef.current >= 3 && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      // Phát 3 tiếng vỗ tay chúc mừng
      playClap()
      setTimeout(playClap, 250)
      setTimeout(playClap, 500)
      setTimeout(() => onScore?.(Math.min(100, scoreRef.current * 30)), 1000)
      return
    }
    setTimeout(performAction, 2500)
  }, [onFeatureCapture, onScore, performAction])

  const handleFail = useCallback(() => {
    if (gameCompletedRef.current || phaseRef.current !== 'waiting') return
    setPhase('responded')
    phaseRef.current = 'responded'
    setMessage('😔 Bé chưa làm theo lần này')
    onFeatureCapture?.({
      timestamp:        Date.now(),
      imitationSuccess: false,
      actionName:       currentActionRef.current.name,
    })
    setTimeout(performAction, 2000)
  }, [onFeatureCapture, performAction])

  const updateLoop = useCallback(() => {
    const now    = Date.now()
    const aiData = latestAIResult?.current?.features

    if (
      now - lastRecordTimeRef.current > 250 &&
      phaseRef.current === 'waiting' &&
      aiData?.handDetected &&
      !gameCompletedRef.current &&
      now > handCooldownRef.current
    ) {
      const rt = lastActionTimeRef.current ? now - lastActionTimeRef.current : 500
      handleSuccess(rt)
      lastRecordTimeRef.current = now
    }

    animationRef.current = requestAnimationFrame(updateLoop)
  }, [latestAIResult, handleSuccess])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateLoop)
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.speechSynthesis.cancel()
    }
  }, [updateLoop])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#ffeaa7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 40 }}>

      {/* Timer */}
      <div style={{ position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '10px 20px', borderRadius: 30 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>

      {/* Score */}
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'white', padding: '10px 25px', borderRadius: 30, fontSize: '1.5rem', fontWeight: 'bold', color: '#00b894' }}>
        ★ {score}/3
      </div>

      {/* Emoji hành động */}
      <div style={{
        fontSize: 160,
        marginBottom: 10,
        filter: phase === 'waiting' ? 'drop-shadow(0 0 20px rgba(255,165,0,0.9))' : 'none',
        transition: 'filter 0.3s',
        animation: phase === 'waiting' ? 'bounce 0.5s infinite alternate' : 'none',
      }}>
        {currentAction.emoji}
      </div>

      {/* Message */}
      <div style={{ fontSize: '1.4rem', marginBottom: 24, fontWeight: 'bold', textAlign: 'center' }}>
        {message}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>

        {phase === 'idle' && (
          <button
            onClick={performAction}
            style={{ width: 130, height: 130, borderRadius: 65, background: '#3b82f6', border: '5px solid white', cursor: 'pointer', fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', color: 'white', fontWeight: 700, flexDirection: 'column', gap: 4 }}>
            <span>▶</span>
            <span style={{ fontSize: 13 }}>Bắt đầu</span>
          </button>
        )}

        {phase === 'waiting' && (
          <>
            <button
              onClick={() => handleSuccess(lastActionTimeRef.current ? Date.now() - lastActionTimeRef.current : 500)}
              style={{ width: 130, height: 130, borderRadius: 65, background: '#22c55e', border: '5px solid white', cursor: 'pointer', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.25)', flexDirection: 'column', gap: 4 }}>
              <span>👏</span>
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>Bé làm theo</span>
            </button>
            <button
              onClick={handleFail}
              style={{ width: 130, height: 130, borderRadius: 65, background: '#ef4444', border: '5px solid white', cursor: 'pointer', fontSize: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.25)', flexDirection: 'column', gap: 4 }}>
              <span>❌</span>
              <span style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>Không làm</span>
            </button>
          </>
        )}

        {phase === 'responded' && (
          <div style={{ fontSize: 14, color: '#666' }}>⏳ Chuẩn bị lượt tiếp theo...</div>
        )}
      </div>

      <p style={{ marginTop: 20, color: '#666', fontSize: 13 }}>
        {phase === 'idle' ? 'Bấm ▶ để bắt đầu trò chơi' : 'Bấm 👏 khi bé làm theo • Bấm ❌ nếu không'}
      </p>

      <style>{`
        @keyframes bounce {
          from { transform: scale(1); }
          to   { transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}