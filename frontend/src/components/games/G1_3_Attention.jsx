import { useEffect, useRef, useState } from 'react'

const TARGETS = [
  { emoji: '🐶', label: 'Chó', x: 20, y: 30 },
  { emoji: '🐱', label: 'Mèo', x: 70, y: 20 },
  { emoji: '🐸', label: 'Ếch', x: 50, y: 60 },
  { emoji: '🦋', label: 'Bướm', x: 80, y: 70 },
  { emoji: '🐠', label: 'Cá', x: 15, y: 70 },
]

export default function G1_3_Attention({ onFeatureCapture, timeElapsed, gameDuration = 120, childName = 'Bé' }) {
  const [currentTarget, setCurrentTarget] = useState(null)
  const [pointer, setPointer] = useState({ x: 50, y: 50 })
  const [hit, setHit] = useState(false)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [showTarget, setShowTarget] = useState(false)
  const timeoutRef = useRef(null)

  const nextRound = () => {
    const target = TARGETS[Math.floor(Math.random() * TARGETS.length)]
    setCurrentTarget(target)
    setPointer({ x: 50, y: 50 })
    setHit(false)
    setShowTarget(false)

    // Animate pointer moving to target
    setTimeout(() => setShowTarget(true), 500)

    setTimeout(() => {
      setPointer({ x: target.x, y: target.y })
    }, 800)
  }

  useEffect(() => {
    nextRound()
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    if (!showTarget) return
    timeoutRef.current = setTimeout(() => {
      // Auto advance
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G1.3',
        round,
        hit,
        targetLabel: currentTarget?.label,
        attentionLevel: hit ? 1 : 0.3,
      })
      setRound(r => r + 1)
      nextRound()
    }, 4000)
    return () => clearTimeout(timeoutRef.current)
  }, [showTarget])

  const handleTargetClick = (target) => {
    if (target.emoji !== currentTarget?.emoji) return
    clearTimeout(timeoutRef.current)
    setHit(true)
    setScore(s => s + 15)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G1.3',
      event: 'joint_attention_success',
      targetLabel: target.label,
      isLookingAtTarget: true,
      attentionLevel: 1,
    })

    setTimeout(() => {
      setRound(r => r + 1)
      nextRound()
    }, 1000)
  }

  return (
    <div style={{
      height: '100%', position: 'relative',
      background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
      overflow: 'hidden'
    }}>
      {/* Instruction */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '8px 20px',
        color: '#e2e8f0', fontSize: 16, whiteSpace: 'nowrap', zIndex: 10
      }}>
        👆 Nhìn theo tay chỉ, tìm <strong style={{ color: '#fbbf24' }}>
          {currentTarget?.emoji} {currentTarget?.label}
        </strong>!
      </div>

      {/* Score */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: '8px 16px',
        color: '#fbbf24', fontSize: 18, fontWeight: 700, zIndex: 10
      }}>
        ⭐ {score}
      </div>

      {/* Pointer (finger) */}
      <div style={{
        position: 'absolute',
        left: `${pointer.x}%`, top: `${pointer.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: 40,
        transition: 'left 1.5s ease-in-out, top 1.5s ease-in-out',
        zIndex: 5, pointerEvents: 'none',
        filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.8))'
      }}>
        👆
      </div>

      {/* Targets */}
      {TARGETS.map(t => (
        <div
          key={t.emoji}
          onClick={() => handleTargetClick(t)}
          style={{
            position: 'absolute',
            left: `${t.x}%`, top: `${t.y}%`,
            transform: `translate(-50%, -50%) scale(${showTarget && t.emoji === currentTarget?.emoji && !hit ? 1.2 : 1})`,
            fontSize: 52,
            cursor: 'pointer',
            transition: 'transform 0.3s',
            filter: hit && t.emoji === currentTarget?.emoji
              ? 'drop-shadow(0 0 16px #22c55e)'
              : 'none',
            animation: showTarget && t.emoji === currentTarget?.emoji && !hit
              ? 'pulse 1s infinite' : 'none'
          }}
        >
          {t.emoji}
          {hit && t.emoji === currentTarget?.emoji && (
            <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 20 }}>
              ✅
            </div>
          )}
        </div>
      ))}

      {/* Round indicator */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        color: '#64748b', fontSize: 13
      }}>
        Vòng {round + 1} • {childName}
      </div>
    </div>
  )
}