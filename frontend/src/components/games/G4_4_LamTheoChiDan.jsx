import { useState, useEffect } from 'react'

const INSTRUCTIONS = [
  { text: 'Nhấn vào hình tròn màu đỏ', target: { shape: 'circle', color: 'red' } },
  { text: 'Nhấn vào hình vuông màu xanh', target: { shape: 'square', color: 'blue' } },
  { text: 'Nhấn vào ngôi sao màu vàng', target: { shape: 'star', color: 'yellow' } },
  { text: 'Nhấn vào hình tam giác màu xanh lá', target: { shape: 'triangle', color: 'green' } },
]

const SHAPES = [
  { shape: 'circle', color: 'red', emoji: '🔴' },
  { shape: 'circle', color: 'blue', emoji: '🔵' },
  { shape: 'square', color: 'red', emoji: '🟥' },
  { shape: 'square', color: 'blue', emoji: '🟦' },
  { shape: 'star', color: 'yellow', emoji: '⭐' },
  { shape: 'star', color: 'red', emoji: '🌟' },
  { shape: 'triangle', color: 'red', emoji: '🔺' },
  { shape: 'triangle', color: 'green', emoji: '🟢' },
]

export default function G4_4_LamTheoChiDan({ onFeatureCapture, childName = 'Bé' }) {
  const [idx, setIdx] = useState(0)
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [grid, setGrid] = useState([])

  const current = INSTRUCTIONS[idx]

  useEffect(() => {
    setGrid([...SHAPES].sort(() => Math.random() - 0.5))
    setResult(null)
  }, [idx])

  const handleClick = (shape) => {
    if (result) return
    const correct = shape.shape === current.target.shape && shape.color === current.target.color
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 15)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G4.4',
      event: 'follow_instruction',
      correct,
      instructionIdx: idx,
      attentionLevel: correct ? 1 : 0.5,
    })

    setTimeout(() => {
      if (idx < INSTRUCTIONS.length - 1) setIdx(i => i + 1)
      else setIdx(0)
    }, 1200)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 20 }}>
        ⭐ {score} | Lệnh {idx + 1}/{INSTRUCTIONS.length}
      </div>

      <div style={{
        background: '#1e3a5f', borderRadius: 20, padding: '20px 32px',
        marginBottom: 28, textAlign: 'center',
        boxShadow: '0 0 30px rgba(59,130,246,0.3)'
      }}>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 6 }}>📋 Làm theo chỉ dẫn:</div>
        <div style={{ fontSize: 18, color: '#e2e8f0', fontWeight: 600 }}>
          👉 {current?.text}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {grid.map((shape, i) => (
          <button
            key={i}
            onClick={() => handleClick(shape)}
            disabled={!!result}
            style={{
              width: 64, height: 64, fontSize: 36,
              background: '#1e293b', border: '2px solid #334155',
              borderRadius: 10, cursor: result ? 'default' : 'pointer',
              transition: 'transform 0.1s'
            }}
            onMouseDown={e => !result && (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {shape.emoji}
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          marginTop: 20, fontSize: 18, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? '🎉 Làm đúng rồi!' : '😊 Thử lại nhé!'}
        </div>
      )}
    </div>
  )
}