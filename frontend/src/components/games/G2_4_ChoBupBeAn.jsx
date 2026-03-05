import { useState } from 'react'

const FOODS = [
  { id: 'apple', emoji: '🍎', label: 'Táo', good: true },
  { id: 'banana', emoji: '🍌', label: 'Chuối', good: true },
  { id: 'milk', emoji: '🥛', label: 'Sữa', good: true },
  { id: 'cake', emoji: '🎂', label: 'Bánh', good: true },
  { id: 'shoe', emoji: '👟', label: 'Giày', good: false },
  { id: 'book', emoji: '📚', label: 'Sách', good: false },
  { id: 'car', emoji: '🚗', label: 'Xe', good: false },
  { id: 'ball', emoji: '⚽', label: 'Bóng', good: false },
]

export default function G2_4_ChoBupBeAn({ onFeatureCapture, childName = 'Bé' }) {
  const [fed, setFed] = useState([])
  const [rejected, setRejected] = useState([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [remaining, setRemaining] = useState([...FOODS].sort(() => Math.random() - 0.5))
  const [dollHappy, setDollHappy] = useState(true)

  const feed = (food) => {
    const correct = food.good
    if (correct) {
      setFed(f => [...f, food])
      setScore(s => s + 10)
      setFeedback(`😋 Búp bê thích ${food.label}!`)
      setDollHappy(true)
    } else {
      setRejected(r => [...r, food])
      setFeedback(`🙅 Búp bê không ăn ${food.label} được!`)
      setDollHappy(false)
    }

    setRemaining(r => r.filter(f => f.id !== food.id))

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G2.4',
      event: 'feed_attempt',
      correct,
      foodId: food.id,
      attentionLevel: correct ? 1 : 0.6,
    })

    setTimeout(() => setFeedback(''), 1500)
  }

  const allDone = remaining.length === 0

  return (
    <div style={{
      height: '100%', display: 'flex', gap: 24,
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #2d1b69, #0f172a)', padding: 24
    }}>
      {/* Doll */}
      <div style={{ textAlign: 'center', minWidth: 160 }}>
        <div style={{
          fontSize: 80, marginBottom: 8,
          filter: dollHappy ? 'none' : 'grayscale(0.5)',
          transition: 'filter 0.3s'
        }}>
          {dollHappy ? '🪆' : '😞'}
        </div>
        <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>Búp bê đang đói!</div>

        {feedback && (
          <div style={{
            background: 'rgba(0,0,0,0.6)', borderRadius: 12,
            padding: '8px 16px', color: '#fbbf24', fontSize: 14
          }}>
            {feedback}
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
          {fed.map(f => (
            <span key={f.id} style={{ fontSize: 24 }}>{f.emoji}</span>
          ))}
        </div>

        <div style={{ color: '#fbbf24', fontWeight: 700, marginTop: 12 }}>
          ⭐ {score}
        </div>
      </div>

      {/* Food grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
          Chọn thức ăn cho búp bê:
        </div>
        {allDone ? (
          <div style={{ textAlign: 'center', color: '#22c55e', fontSize: 18, fontWeight: 700 }}>
            🎉 Hoàn thành! {childName} giỏi quá!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {remaining.slice(0, 6).map(food => (
              <button
                key={food.id}
                onClick={() => feed(food)}
                style={{
                  padding: '12px 16px',
                  background: '#1e293b',
                  border: '2px solid #334155',
                  borderRadius: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'transform 0.1s',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: 28 }}>{food.emoji}</span>
                <span style={{ color: '#e2e8f0', fontSize: 13 }}>{food.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}