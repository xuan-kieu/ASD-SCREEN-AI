import { useState, useEffect } from 'react'

const PAIRS = ['🐶', '🐱', '🐸', '🦋', '🌸', '⭐', '🍎', '🎈']

export default function G3_4_TimHinhGhepCap({ onFeatureCapture, childName = 'Bé' }) {
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)

  useEffect(() => {
    const deck = [...PAIRS, ...PAIRS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, face: false }))
    setCards(deck)
  }, [])

  const handleFlip = (card) => {
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.emoji)) return

    const newFlipped = [...flipped, card.id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(m => m + 1)
      const [a, b] = newFlipped.map(id => cards.find(c => c.id === id))
      if (a.emoji === b.emoji) {
        setMatched(m => [...m, a.emoji])
        setScore(s => s + 20)
        setFlipped([])
        onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.4', event: 'match', attentionLevel: 1 })
      } else {
        setTimeout(() => setFlipped([]), 1000)
        onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.4', event: 'mismatch', attentionLevel: 0.7 })
      }
    }
  }

  const allMatched = matched.length === PAIRS.length

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 16
    }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16, color: '#94a3b8', fontSize: 14 }}>
        <span>⭐ {score}</span>
        <span>🔄 {moves} lần lật</span>
        <span>✅ {matched.length}/{PAIRS.length} cặp</span>
      </div>

      {allMatched ? (
        <div style={{ textAlign: 'center', color: '#22c55e', fontSize: 24, fontWeight: 700 }}>
          🎉 {childName} tìm được hết {PAIRS.length} cặp!<br />
          <span style={{ fontSize: 16, color: '#94a3b8' }}>Chỉ dùng {moves} lần lật</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {cards.map(card => {
            const isFlipped = flipped.includes(card.id)
            const isMatched = matched.includes(card.emoji)
            return (
              <button
                key={card.id}
                onClick={() => handleFlip(card)}
                style={{
                  width: 60, height: 60, fontSize: 28,
                  background: isMatched ? '#166534' : isFlipped ? '#1e3a5f' : '#1e293b',
                  border: `2px solid ${isMatched ? '#22c55e' : isFlipped ? '#3b82f6' : '#334155'}`,
                  borderRadius: 10, cursor: isMatched ? 'default' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {isFlipped || isMatched ? card.emoji : '❓'}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}