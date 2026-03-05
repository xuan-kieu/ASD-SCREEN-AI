import { useState, useEffect } from 'react'

const SHAPES = [
  { id: 'circle', label: 'Hình tròn', emoji: '🔵', color: '#3b82f6' },
  { id: 'square', label: 'Hình vuông', emoji: '🟥', color: '#ef4444' },
  { id: 'triangle', label: 'Tam giác', emoji: '🔺', color: '#f97316' },
  { id: 'star', label: 'Ngôi sao', emoji: '⭐', color: '#eab308' },
  { id: 'heart', label: 'Trái tim', emoji: '❤️', color: '#ec4899' },
]

export default function G2_1_ChiTayTinhMat({ onFeatureCapture, childName = 'Bé' }) {
  const [target, setTarget] = useState(null)
  const [options, setOptions] = useState([])
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [pointer, setPointer] = useState({ x: 50, y: 40 })

  const nextRound = () => {
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5).slice(0, 4)
    const t = shuffled[Math.floor(Math.random() * shuffled.length)]
    setTarget(t)
    setOptions(shuffled.sort(() => Math.random() - 0.5))
    setResult(null)
    setPointer({ x: 30 + Math.random() * 40, y: 25 + Math.random() * 20 })
    setRound(r => r + 1)
  }

  useEffect(() => { nextRound() }, [])

  const handleSelect = (shape) => {
    const correct = shape.id === target?.id
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 10)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G2.1',
      event: 'shape_select',
      correct,
      targetId: target?.id,
      selectedId: shape.id,
      attentionLevel: correct ? 1 : 0.5,
    })

    setTimeout(nextRound, 1200)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ color: '#fbbf24', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
        ⭐ {score} điểm
      </div>

      {/* Instruction */}
      <div style={{
        background: '#1e3a5f', borderRadius: 16, padding: '16px 32px',
        marginBottom: 32, textAlign: 'center'
      }}>
        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
          👆 Chỉ vào...
        </div>
        <div style={{ fontSize: 64 }}>{target?.emoji}</div>
        <div style={{ fontSize: 20, color: '#e2e8f0', fontWeight: 600, marginTop: 8 }}>
          {target?.label}
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {options.map(shape => (
          <button
            key={shape.id}
            onClick={() => handleSelect(shape)}
            disabled={!!result}
            style={{
              width: 110, height: 110,
              background: result
                ? shape.id === target?.id ? '#166534' : shape.id === result ? '#7f1d1d' : '#1e293b'
                : '#1e293b',
              border: `3px solid ${result && shape.id === target?.id ? '#22c55e' : '#334155'}`,
              borderRadius: 16, fontSize: 52,
              cursor: result ? 'default' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {shape.emoji}
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          marginTop: 20, fontSize: 20, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? '🎉 Đúng rồi!' : '😊 Cố gắng tiếp nhé!'}
        </div>
      )}
    </div>
  )
}