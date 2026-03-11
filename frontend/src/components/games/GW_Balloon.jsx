import { useState, useEffect, useRef, useCallback } from 'react'

export default function GW_Balloon({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  childName,
  gameDuration = 120,
}) {
  const CANVAS_WIDTH = 600
  const CANVAS_HEIGHT = 450
  const RECORD_INTERVAL = 200

  const canvasRef = useRef(null)
  const animationRef = useRef(0)
  const specialBubbleRef = useRef(null)
  const gameCompletedRef = useRef(false)
  const lastRecordTimeRef = useRef(0)
  const gazeOnSpecialRef = useRef(false)
  const lookedAtParentRef = useRef(false)
  const scoreRef = useRef(0)

  const [bubbles, setBubbles] = useState([])
  const [message, setMessage] = useState('✨ Tìm bong bóng đặc biệt!')

  // Fallback: khi hết giờ mà onScore chưa gọi → gọi với điểm hiện tại
  useEffect(() => {
    if (timeElapsed >= gameDuration && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      onScore?.(scoreRef.current)
    }
  }, [timeElapsed, gameDuration, onScore])

  const createBubble = useCallback((isSpecial = false) => ({
    x: Math.random() * (CANVAS_WIDTH - 80) + 40,
    y: Math.random() * (CANVAS_HEIGHT - 80) + 40,
    r: isSpecial ? 50 : Math.random() * 25 + 20,
    speed: Math.random() * 1.5 + 0.8,
    color: isSpecial ? 'hsl(50, 100%, 60%)' : `hsl(${Math.random() * 360}, 80%, 70%)`,
    isSpecial,
  }), [])

  useEffect(() => {
    const initialBubbles = Array.from({ length: 10 }, () => createBubble(false))
    setBubbles(initialBubbles)
    const timer = setTimeout(() => {
      if (!gameCompletedRef.current) {
        const special = createBubble(true)
        setBubbles(prev => [...prev, special])
        specialBubbleRef.current = special
        setMessage('🎈 Bong bóng đặc biệt! Nhìn và chia sẻ với mẹ!')
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [createBubble])

  const updateGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    setBubbles(prev => prev.map(b => {
      let newY = b.y - b.speed
      if (newY + b.r < 0) {
        newY = CANVAS_HEIGHT + b.r
        return { ...b, y: newY, x: Math.random() * (CANVAS_WIDTH - 2 * b.r) + b.r }
      }
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fillStyle = b.color
      ctx.fill()
      if (b.isSpecial) {
        ctx.font = `${b.r * 0.6}px Arial`
        ctx.fillText('😊', b.x - b.r * 0.35, b.y + b.r * 0.2)
        specialBubbleRef.current = { ...b, y: newY }
      }
      return { ...b, y: newY }
    }))

    const now = Date.now()
    if (now - lastRecordTimeRef.current > RECORD_INTERVAL) {
      const aiData = latestAIResult?.current?.features
      const special = specialBubbleRef.current

      if (aiData && special && !gameCompletedRef.current) {
        const gazeX = aiData.gazeX ?? 0.5
        const gazeY = aiData.gazeY ?? 0.5
        const targetX = special.x / CANVAS_WIDTH
        const targetY = special.y / CANVAS_HEIGHT

        const isLookingAtSpecial = Math.abs(gazeX - targetX) < 0.15 && Math.abs(gazeY - targetY) < 0.15
        if (isLookingAtSpecial && !gazeOnSpecialRef.current) {
          gazeOnSpecialRef.current = true
          scoreRef.current += 40
        }

        const isLookingAtParent = gazeX > 0.7 && gazeY > 0.7
        if (gazeOnSpecialRef.current && isLookingAtParent && !lookedAtParentRef.current) {
          lookedAtParentRef.current = true
          scoreRef.current += 60
          setMessage('🎉 Tuyệt vời! Bé đã chia sẻ niềm vui!')
          gameCompletedRef.current = true
          setTimeout(() => onScore?.(scoreRef.current), 1500)
        }

        onFeatureCapture?.({
          timestamp: now,
          gazeX, gazeY,
          targetX: targetX * 100,
          targetY: targetY * 100,
          isLookingAtTarget: isLookingAtSpecial,
          attentionLevel: aiData.avgAttention ?? 0.5,
          smileIntensity: aiData.avgSmile ?? 0,
          jointAttention: (gazeOnSpecialRef.current && lookedAtParentRef.current) ? 1 : 0,
        })
      }
      lastRecordTimeRef.current = now
    }

    animationRef.current = requestAnimationFrame(updateGame)
  }, [latestAIResult, onFeatureCapture, onScore])

  useEffect(() => {
    animationRef.current = requestAnimationFrame(updateGame)
    return () => cancelAnimationFrame(animationRef.current)
  }, [updateGame])

  // Nút thủ công cho giám sát viên
  const handleManualScore = (passed) => {
    if (gameCompletedRef.current) return
    gameCompletedRef.current = true
    onScore?.(passed ? 100 : 0)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#6ec3e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 15px', borderRadius: 20 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>

      {/* Nút thủ công cho giám sát viên */}
      <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => handleManualScore(true)}
          style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          ✅ Bé nhìn theo
        </button>
        <button onClick={() => handleManualScore(false)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
          ❌ Không phản hồi
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 100, height: 80, background: '#2d5a27', border: '3px solid white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>
        👩 Mẹ
      </div>
      <div style={{ border: '8px solid #b2f0e5', borderRadius: 30, background: '#a3e0fd', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
      </div>
      <div style={{ marginTop: 15, background: 'white', padding: '10px 30px', borderRadius: 30, fontWeight: 'bold', fontSize: '1.2rem' }}>
        {message}
      </div>
    </div>
  )
}