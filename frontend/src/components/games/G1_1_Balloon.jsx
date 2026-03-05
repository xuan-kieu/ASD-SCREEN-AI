import { useEffect, useRef, useState } from 'react'

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899']

export default function G1_1_Balloon({ onFeatureCapture, timeElapsed, gameDuration = 120, childName = 'Bé' }) {
  const canvasRef = useRef(null)
  const balloonsRef = useRef([])
  const animRef = useRef(null)
  const [popped, setPopped] = useState(0)
  const [score, setScore] = useState(0)

  const createBalloon = (canvas) => ({
    id: Math.random(),
    x: Math.random() * (canvas.width - 80) + 40,
    y: canvas.height + 60,
    vy: -(1.5 + Math.random() * 1.5),
    radius: 30 + Math.random() * 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 1,
    popped: false,
    wobble: Math.random() * Math.PI * 2,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Spawn balloons
    for (let i = 0; i < 5; i++) {
      const b = createBalloon(canvas)
      b.y = canvas.height - Math.random() * canvas.height
      balloonsRef.current.push(b)
    }

    const spawnInterval = setInterval(() => {
      if (balloonsRef.current.length < 12) {
        balloonsRef.current.push(createBalloon(canvas))
      }
    }, 1500)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      grad.addColorStop(0, '#0f172a')
      grad.addColorStop(1, '#1e3a5f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      balloonsRef.current = balloonsRef.current.filter(b => {
        if (b.popped) { b.opacity -= 0.08; return b.opacity > 0 }
        return b.y > -100
      })

      balloonsRef.current.forEach(b => {
        if (!b.popped) {
          b.y += b.vy
          b.wobble += 0.05
          b.x += Math.sin(b.wobble) * 0.5
        }

        ctx.save()
        ctx.globalAlpha = b.opacity
        ctx.beginPath()
        ctx.ellipse(b.x, b.y, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2)
        ctx.fillStyle = b.popped ? '#fff' : b.color
        ctx.fill()

        if (!b.popped) {
          // Shine
          ctx.beginPath()
          ctx.ellipse(b.x - b.radius * 0.25, b.y - b.radius * 0.3, b.radius * 0.2, b.radius * 0.15, -0.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fill()

          // String
          ctx.beginPath()
          ctx.moveTo(b.x, b.y + b.radius)
          ctx.quadraticCurveTo(b.x + 10, b.y + b.radius + 20, b.x, b.y + b.radius + 40)
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'
          ctx.lineWidth = 1.5
          ctx.stroke()
        } else {
          // Pop effect
          ctx.font = `${b.radius}px Arial`
          ctx.textAlign = 'center'
          ctx.fillText('💥', b.x, b.y)
        }
        ctx.restore()
      })

      // Capture behavior
      if (Math.random() < 0.1) {
        onFeatureCapture({
          timestamp: Date.now(),
          gameId: 'G1.1',
          balloonsOnScreen: balloonsRef.current.filter(b => !b.popped).length,
          poppedCount: popped,
          timeElapsed,
          attentionLevel: Math.min(1, popped / 10),
        })
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      clearInterval(spawnInterval)
    }
  }, [])

  const handleClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    balloonsRef.current.forEach(b => {
      if (b.popped) return
      const dx = mx - b.x, dy = my - b.y
      if (Math.sqrt(dx * dx + dy * dy) < b.radius) {
        b.popped = true
        setPopped(p => p + 1)
        setScore(s => s + 10)
        onFeatureCapture({
          timestamp: Date.now(),
          gameId: 'G1.1',
          event: 'balloon_pop',
          targetX: b.x, targetY: b.y,
          isLookingAtTarget: true,
          attentionLevel: 1,
        })
      }
    })
  }

  const progress = Math.round((timeElapsed / gameDuration) * 100)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ width: '100%', height: '100%', cursor: 'pointer', display: 'block' }}
      />
      {/* HUD */}
      <div style={{
        position: 'absolute', top: 16, left: 16, right: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '8px 16px', color: '#fff' }}>
          <span style={{ fontSize: 20 }}>🎈</span>
          <span style={{ fontSize: 18, fontWeight: 700, marginLeft: 8 }}>{score}</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '8px 16px', color: '#94a3b8', fontSize: 13 }}>
          {childName} đã bấm {popped} bong bóng
        </div>
        <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '6px 12px', minWidth: 80 }}>
          <div style={{ height: 6, background: '#334155', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: 3, transition: 'width 1s' }} />
          </div>
          <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 2 }}>
            {gameDuration - timeElapsed}s còn lại
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.4)', fontSize: 14, pointerEvents: 'none'
      }}>
        👆 Nhấn vào bong bóng để bắt!
      </div>
    </div>
  )
}