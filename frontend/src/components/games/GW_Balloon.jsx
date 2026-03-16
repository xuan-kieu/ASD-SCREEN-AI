import { useState, useEffect, useRef, useCallback } from 'react'

export default function GW_Balloon({
  latestAIResult,
  onFeatureCapture,
  onScore,
  timeElapsed,
  childName,
  gameDuration = 120,
}) {
  const CANVAS_WIDTH  = 600
  const CANVAS_HEIGHT = 450
  const RECORD_INTERVAL = 200

  const canvasRef           = useRef(null)
  const animationRef        = useRef(0)
  const bubblesRef          = useRef([])
  const specialBubbleRef    = useRef(null)
  const gameCompletedRef    = useRef(false)
  const lastRecordTimeRef   = useRef(0)
  const gazeOnSpecialRef    = useRef(false)
  const lookedAtParentRef   = useRef(false)
  const scoreRef            = useRef(0)

  const [message, setMessage] = useState('✨ Tìm bong bóng đặc biệt!')

  useEffect(() => {
    if (timeElapsed >= gameDuration && !gameCompletedRef.current) {
      gameCompletedRef.current = true
      onScore?.(scoreRef.current)
    }
  }, [timeElapsed, gameDuration, onScore])

  const createBubble = useCallback((isSpecial = false) => ({
    x:       Math.random() * (CANVAS_WIDTH - 80) + 40,
    y:       CANVAS_HEIGHT + 50,
    r:       isSpecial ? 50 : Math.random() * 25 + 20,
    // ── Tốc độ giảm mạnh: 0.3–0.8 thay vì 0.8–2.3 ──
    speed:   isSpecial ? 0.4 : Math.random() * 0.5 + 0.3,
    color:   isSpecial ? 'hsl(50, 100%, 60%)' : `hsl(${Math.random() * 360}, 80%, 70%)`,
    isSpecial,
  }), [])

  // Khởi tạo bong bóng
  useEffect(() => {
    bubblesRef.current = Array.from({ length: 8 }, () => createBubble(false))

    const timer = setTimeout(() => {
      if (!gameCompletedRef.current) {
        const special = createBubble(true)
        bubblesRef.current = [...bubblesRef.current, special]
        specialBubbleRef.current = special
        setMessage('🎈 Bong bóng đặc biệt! Nhìn và chia sẻ với mẹ!')
      }
    }, 4000) // Delay lâu hơn: 4s thay vì 3s

    return () => clearTimeout(timer)
  }, [createBubble])

  const updateGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Vẽ nền gradient nhẹ
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    grad.addColorStop(0, '#b3e5fc')
    grad.addColorStop(1, '#6ec3e0')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    bubblesRef.current = bubblesRef.current.map(b => {
      const newY = b.y - b.speed
      const resetY = newY + b.r < 0
        ? CANVAS_HEIGHT + b.r
        : newY

      const updated = {
        ...b,
        y: resetY,
        x: resetY === CANVAS_HEIGHT + b.r
          ? Math.random() * (CANVAS_WIDTH - 2 * b.r) + b.r
          : b.x,
      }

      // Vẽ bong bóng
      ctx.beginPath()
      ctx.arc(updated.x, updated.y, updated.r, 0, Math.PI * 2)
      ctx.fillStyle = updated.color
      ctx.globalAlpha = 0.85
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.stroke()

      if (updated.isSpecial) {
        ctx.font = `${updated.r * 0.7}px Arial`
        ctx.fillStyle = '#000'
        ctx.fillText('😊', updated.x - updated.r * 0.4, updated.y + updated.r * 0.25)
        specialBubbleRef.current = updated
      }

      return updated
    })

    const now = Date.now()
    if (now - lastRecordTimeRef.current > RECORD_INTERVAL) {
      const aiData   = latestAIResult?.current?.features
      const special  = specialBubbleRef.current

      if (aiData && special && !gameCompletedRef.current) {
        const gazeX   = aiData.gazeX ?? 0.5
        const gazeY   = aiData.gazeY ?? 0.5
        const targetX = special.x / CANVAS_WIDTH
        const targetY = special.y / CANVAS_HEIGHT

        const isLookingAtSpecial =
          Math.abs(gazeX - targetX) < 0.15 &&
          Math.abs(gazeY - targetY) < 0.15

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
          timestamp:        now,
          gazeX, gazeY,
          targetX:          targetX * 100,
          targetY:          targetY * 100,
          isLookingAtTarget: isLookingAtSpecial,
          attentionLevel:   aiData.avgAttention ?? 0.5,
          smileIntensity:   aiData.avgSmile ?? 0,
          jointAttention:   (gazeOnSpecialRef.current && lookedAtParentRef.current) ? 1 : 0,
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

  const handleManualScore = (passed) => {
    if (gameCompletedRef.current) return
    gameCompletedRef.current = true
    setMessage(passed ? '🎉 Bé đã nhìn theo!' : '😔 Bé chưa phản hồi')
    onScore?.(passed ? 100 : 0)
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#6ec3e0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* Timer */}
      <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '8px 15px', borderRadius: 20, zIndex: 10 }}>
        ⏱ {timeElapsed}s / {gameDuration}s
      </div>

      {/* Nút thủ công */}
      <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 8, zIndex: 10 }}>
        <button onClick={() => handleManualScore(true)}
          style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          ✅ Bé nhìn theo
        </button>
        <button onClick={() => handleManualScore(false)}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          ❌ Không phản hồi
        </button>
      </div>

      {/* Góc mẹ */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 100, height: 80, background: '#2d5a27', border: '3px solid white', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, zIndex: 10 }}>
        👩 Mẹ
      </div>

      <div style={{ border: '8px solid #b2f0e5', borderRadius: 30, background: '#a3e0fd', overflow: 'hidden' }}>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
      </div>

      <div style={{ marginTop: 15, background: 'white', padding: '10px 30px', borderRadius: 30, fontWeight: 'bold', fontSize: '1.1rem' }}>
        {message}
      </div>
    </div>
  )
}