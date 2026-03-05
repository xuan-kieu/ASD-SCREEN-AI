import { useState } from 'react'

const CATEGORIES = {
  '🏠 Trong nhà': ['🛋️', '🛏️', '🚿', '🍳', '📺', '🪑'],
  '🌳 Ngoài trời': ['🌳', '🚗', '⛅', '🌸', '🏪', '🐦'],
  '🍽️ Đồ ăn': ['🍎', '🍕', '🍚', '🥛', '🍌', '🍰'],
  '🧸 Đồ chơi': ['🧸', '⚽', '🎪', '🪀', '🎨', '🎯'],
}

export default function G3_1_VeDungNhaNao({ onFeatureCapture, childName = 'Bé' }) {
  const [target, setTarget] = useState(null)
  const [targetCat, setTargetCat] = useState(null)
  const [score, setScore] = useState(0)
  const [result, setResult] = useState(null)
  const [round, setRound] = useState(0)

  const nextRound = () => {
    const cats = Object.keys(CATEGORIES)
    const cat = cats[Math.floor(Math.random() * cats.length)]
    const items = CATEGORIES[cat]
    const item = items[Math.floor(Math.random() * items.length)]
    setTarget(item)
    setTargetCat(cat)
    setResult(null)
    setRound(r => r + 1)
  }

  useState(() => { nextRound() }, [])

  const handleDrop = (category) => {
    const correct = category === targetCat
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 15)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G3.1',
      event: 'categorize',
      correct,
      targetCat,
      selectedCat: category,
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
      <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 20 }}>
        ⭐ {score} | Vòng {round}
      </div>

      <div style={{ fontSize: 80, marginBottom: 12 }}>{target}</div>
      <div style={{ color: '#94a3b8', fontSize: 16, marginBottom: 28 }}>
        Cái này thuộc về đâu?
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Object.keys(CATEGORIES).map(cat => (
          <button
            key={cat}
            onClick={() => handleDrop(cat)}
            disabled={!!result}
            style={{
              padding: '16px 20px',
              background: result
                ? cat === targetCat ? '#166534' : '#1e293b'
                : '#1e293b',
              border: `2px solid ${result && cat === targetCat ? '#22c55e' : '#334155'}`,
              borderRadius: 12, cursor: result ? 'default' : 'pointer',
              color: '#e2e8f0', fontSize: 16, fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          marginTop: 20, fontSize: 18, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? '🎉 Đúng rồi!' : `💡 ${target} thuộc ${targetCat}`}
        </div>
      )}
    </div>
  )
}