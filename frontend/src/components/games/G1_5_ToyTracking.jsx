import { useEffect, useRef, useState } from 'react'

const TOYS = ['🧸', '🎪', '🎈', '🎠', '🪀', '🎯']

export default function G1_5_ToyTracking({ onFeatureCapture, timeElapsed, gameDuration = 120, childName = 'Bé' }) {
  const [toyPos, setToyPos] = useState({ x: 50, y: 50 })
  const [currentToy, setCurrentToy] = useState('🧸')
  const [trail, setTrail] = useState([])
  const [trackScore, setTrackScore] = useState(0)
  const [isMoving, setIsMoving] = useState(false)
  const intervalRef = useRef(null)

  const moveToy = () => {
    const newPos = {
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70
    }
    setToyPos(newPos)
    setTrail(t => [...t.slice(-8), newPos])
    setCurrentToy(TOYS[Math.floor(Math.random() * TOYS.length)])

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G1.5',
      targetX: newPos.x, targetY: newPos.y,
      isMoving: true,
    })
  }

  useEffect(() => {
    setIsMoving(true)
    intervalRef.current = setInterval(moveToy, 1800)
    return () => clearInterval(intervalRef.current)
  }, [])

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * 100
    const cy = ((e.clientY - rect.top) / rect.height) * 100

    const dx = cx - toyPos.x, dy = cy - toyPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 8) {
      setTrackScore(s => s + 1)
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G1.5',
        event: 'tracking_hit',
        attentionLevel: 1,
        isLookingAtTarget: true,
      })
    }
  }

  return (
    <div
      onClick={handleClick}
      style={{
        height: '100%', position: 'relative',
        background: 'linear-gradient(135deg, #0f2027, #1e3a5f)',
        cursor: 'crosshair', overflow: 'hidden'
      }}
    >
      {/* Trail */}
      {trail.map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${pos.x}%`, top: `${pos.y}%`,
          transform: 'translate(-50%, -50%)',
          fontSize: 16 + i * 2,
          opacity: (i / trail.length) * 0.5,
          pointerEvents: 'none',
          transition: 'all 0.5s'
        }}>
          ✨
        </div>
      ))}

      {/* Toy */}
      <div style={{
        position: 'absolute',
        left: `${toyPos.x}%`, top: `${toyPos.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: 56,
        transition: 'left 0.8s ease-in-out, top 0.8s ease-in-out',
        filter: 'drop-shadow(0 0 16px rgba(59,130,246,0.8))',
        animation: 'bounce 0.5s infinite alternate'
      }}>
        {currentToy}
      </div>

      {/* HUD */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        background: 'rgba(0,0,0,0.6)', borderRadius: 12,
        padding: '8px 16px', color: '#fff'
      }}>
        🎯 {trackScore} lần chạm
      </div>

      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.4)', fontSize: 14
      }}>
        👀 {childName} hãy nhìn theo đồ chơi!
      </div>
    </div>
  )
}