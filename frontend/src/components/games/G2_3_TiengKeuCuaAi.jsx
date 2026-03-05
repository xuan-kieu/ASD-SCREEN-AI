import { useState, useEffect, useRef } from 'react'

const ANIMALS = [
  { name: 'Chó', emoji: '🐶', sound: 'Gâu gâu!', color: '#f97316' },
  { name: 'Mèo', emoji: '🐱', sound: 'Meo meo!', color: '#8b5cf6' },
  { name: 'Bò', emoji: '🐮', sound: 'Moo moo!', color: '#eab308' },
  { name: 'Vịt', emoji: '🦆', sound: 'Quạc quạc!', color: '#22c55e' },
  { name: 'Gà', emoji: '🐔', sound: 'Cục tác!', color: '#ef4444' },
  { name: 'Mèo con', emoji: '🐱', sound: 'Miu miu!', color: '#ec4899' },
]

export default function G2_3_TiengKeuCuaAi({ onFeatureCapture, childName = 'Bé' }) {
  const [current, setCurrent] = useState(null)
  const [options, setOptions] = useState([])
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [showAnimal, setShowAnimal] = useState(false)

  const nextRound = () => {
    const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5)
    const target = shuffled[0]
    const opts = shuffled.slice(0, 4).sort(() => Math.random() - 0.5)
    setCurrent(target)
    setOptions(opts)
    setResult(null)
    setShowAnimal(false)
    setRound(r => r + 1)

    setTimeout(() => setShowAnimal(true), 300)
  }

  useEffect(() => { nextRound() }, [])

  const handleSelect = (animal) => {
    if (result) return
    const correct = animal.name === current?.name
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 10)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G2.3',
      event: 'sound_match',
      correct,
      targetAnimal: current?.name,
      selectedAnimal: animal.name,
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
      <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 24, fontSize: 18 }}>
        ⭐ {score} | Vòng {round}
      </div>

      {/* Sound display */}
      <div style={{
        background: '#1e3a5f', borderRadius: 20, padding: '24px 40px',
        marginBottom: 32, textAlign: 'center',
        boxShadow: '0 0 30px rgba(59,130,246,0.3)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔊</div>
        <div style={{ fontSize: 28, color: '#e2e8f0', fontWeight: 700, marginBottom: 4 }}>
          {showAnimal ? current?.sound : '...'}
        </div>
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Con gì kêu vậy?
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {options.map(animal => (
          <button
            key={animal.name}
            onClick={() => handleSelect(animal)}
            disabled={!!result}
            style={{
              padding: '16px 20px',
              background: result
                ? animal.name === current?.name ? '#166534'
                : '#1e293b'
                : '#1e293b',
              border: `2px solid ${result && animal.name === current?.name ? '#22c55e' : '#334155'}`,
              borderRadius: 12, cursor: result ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 36 }}>{animal.emoji}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{animal.name}</span>
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          marginTop: 20, fontSize: 20, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? `🎉 Đúng! ${current?.emoji} kêu ${current?.sound}` : '😊 Thử lại nhé!'}
        </div>
      )}
    </div>
  )
}