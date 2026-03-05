import { useState, useEffect, useRef } from 'react'

const FACES = ['😊', '😄', '🤗', '😁', '🥰']

export default function G1_4_Peekaboo({ onFeatureCapture, timeElapsed, childName = 'Bé' }) {
  const [visible, setVisible] = useState(false)
  const [face, setFace] = useState('😊')
  const [count, setCount] = useState(0)
  const [reactions, setReactions] = useState([])
  const intervalRef = useRef(null)

  const peek = () => {
    setFace(FACES[Math.floor(Math.random() * FACES.length)])
    setVisible(true)
    setCount(c => c + 1)

    setTimeout(() => {
      setVisible(false)
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G1.4',
        event: 'peek',
        count: count + 1,
        anticipation: true,
      })
    }, 2000)
  }

  useEffect(() => {
    intervalRef.current = setInterval(peek, 3500)
    return () => clearInterval(intervalRef.current)
  }, [count])

  const handleReaction = (type) => {
    setReactions(r => [...r, type])
    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G1.4',
      event: 'child_reaction',
      reactionType: type,
      isLookingAtTarget: true,
      attentionLevel: type === 'laugh' ? 1 : 0.7,
      smileIntensity: type === 'laugh' ? 0.9 : 0.5,
    })
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(circle, #1e3a5f, #0f172a)'
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 16 }}>
        Ú òa! {childName} có nhìn không? 👀
      </p>

      {/* Peek box */}
      <div style={{
        width: 200, height: 200,
        background: visible ? '#fbbf24' : '#334155',
        borderRadius: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: visible ? 100 : 60,
        transition: 'all 0.3s',
        boxShadow: visible ? '0 0 60px rgba(251,191,36,0.6)' : 'none',
        cursor: 'pointer',
        marginBottom: 32
      }} onClick={peek}>
        {visible ? face : '🙈'}
      </div>

      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
        Đã ú òa {count} lần
      </p>

      {/* Reaction buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { type: 'laugh', emoji: '😂', label: 'Cười' },
          { type: 'smile', emoji: '😊', label: 'Mỉm cười' },
          { type: 'neutral', emoji: '😐', label: 'Không phản ứng' },
        ].map(r => (
          <button key={r.type} onClick={() => handleReaction(r.type)} style={{
            padding: '10px 16px', background: '#1e293b', border: '1px solid #334155',
            borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13
          }}>
            {r.emoji} {r.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 4 }}>
        {reactions.slice(-10).map((r, i) => (
          <span key={i} style={{ fontSize: 20 }}>
            {r === 'laugh' ? '😂' : r === 'smile' ? '😊' : '😐'}
          </span>
        ))}
      </div>
    </div>
  )
}