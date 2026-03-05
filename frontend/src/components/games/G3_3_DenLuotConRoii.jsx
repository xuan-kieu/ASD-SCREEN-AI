import { useState, useEffect, useRef } from 'react'

const PATTERNS = [
  ['🔴', '🔵', '🔴', '🔵'],
  ['⭐', '🌙', '⭐', '🌙'],
  ['🐶', '🐱', '🐶', '🐱'],
  ['🍎', '🍌', '🍎', '🍌'],
]

export default function G3_3_DenLuotConRoii({ onFeatureCapture, childName = 'Bé' }) {
  const [pattern, setPattern] = useState([])
  const [userTurn, setUserTurn] = useState(false)
  const [userInput, setUserInput] = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)
  const [result, setResult] = useState(null)

  const items = ['🔴', '🔵', '⭐', '🌙', '🐶', '🐱', '🍎', '🍌']

  const newRound = () => {
    const len = 3 + Math.min(round, 3)
    const p = Array.from({ length: len }, () => items[Math.floor(Math.random() * items.length)])
    setPattern(p)
    setUserInput([])
    setUserTurn(false)
    setResult(null)
    setRound(r => r + 1)

    // Show pattern
    p.forEach((_, i) => {
      setTimeout(() => setHighlight(i), i * 700)
      setTimeout(() => setHighlight(-1), i * 700 + 500)
    })
    setTimeout(() => setUserTurn(true), p.length * 700 + 300)
  }

  useEffect(() => { newRound() }, [])

  const handleInput = (item) => {
    if (!userTurn) return
    const newInput = [...userInput, item]
    setUserInput(newInput)

    if (newInput[newInput.length - 1] !== pattern[newInput.length - 1]) {
      setResult('wrong')
      onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.3', event: 'turn_wrong', attentionLevel: 0.5 })
      setTimeout(newRound, 1500)
      return
    }

    if (newInput.length === pattern.length) {
      setResult('correct')
      setScore(s => s + pattern.length * 5)
      onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.3', event: 'turn_complete', attentionLevel: 1 })
      setTimeout(newRound, 1500)
    }
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ color: '#fbbf24', fontWeight: 700, marginBottom: 16 }}>
        ⭐ {score} | Vòng {round}
      </div>

      <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
        {userTurn ? `👆 Đến lượt ${childName}!` : '👀 Hãy ghi nhớ thứ tự...'}
      </div>

      {/* Pattern display */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {pattern.map((item, i) => (
          <div key={i} style={{
            width: 52, height: 52, fontSize: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: highlight === i ? '#3b82f6' : userTurn ? '#1e293b' : '#1e293b',
            border: `2px solid ${highlight === i ? '#60a5fa' : userInput[i] ? '#22c55e' : '#334155'}`,
            borderRadius: 10,
            transform: highlight === i ? 'scale(1.2)' : 'scale(1)',
            transition: 'all 0.2s'
          }}>
            {userTurn ? (userInput[i] || '?') : item}
          </div>
        ))}
      </div>

      {/* Input buttons */}
      {userTurn && !result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {items.map(item => (
            <button key={item} onClick={() => handleInput(item)} style={{
              width: 52, height: 52, fontSize: 26,
              background: '#1e293b', border: '2px solid #334155',
              borderRadius: 10, cursor: 'pointer', transition: 'transform 0.1s'
            }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {result && (
        <div style={{
          fontSize: 20, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? '🎉 Xuất sắc!' : '😊 Cố gắng lần sau!'}
        </div>
      )}
    </div>
  )
}