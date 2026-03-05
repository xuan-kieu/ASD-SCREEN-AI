import { useState, useEffect } from 'react'

const QUESTIONS = [
  { q: 'Tại sao chúng ta phải ngủ?', options: ['Để lớn lên và khỏe mạnh 💪', 'Vì bị phạt 😅', 'Để xem phim 📺', 'Để chơi game 🎮'], correct: 0 },
  { q: 'Tại sao lá cây có màu xanh?', options: ['Do có chất diệp lục 🌿', 'Do được sơn xanh 🎨', 'Do ăn rau xanh 🥦', 'Do bị bệnh 🤒'], correct: 0 },
  { q: 'Tại sao cần rửa tay trước khi ăn?', options: ['Cho tay sạch 👏', 'Vì mẹ bắt làm vậy 👩', 'Để tay ướt 💧', 'Vì tay bẩn mới ngon 😋'], correct: 0 },
  { q: 'Tại sao trời có mưa?', options: ['Do hơi nước bốc lên tạo mây ☁️', 'Do trời khóc 😢', 'Do máy bay tưới nước ✈️', 'Do mây bị lạnh 🥶'], correct: 0 },
]

export default function G4_1_ViSaoTheNhi({ onFeatureCapture, childName = 'Bé' }) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState([])

  const q = QUESTIONS[idx]

  const handleSelect = (i) => {
    if (selected !== null) return
    setSelected(i)
    const correct = i === q.correct
    if (correct) setScore(s => s + 20)
    setAnswers(a => [...a, { correct, question: q.q }])

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G4.1',
      event: 'answer',
      correct,
      questionIdx: idx,
      attentionLevel: correct ? 1 : 0.6,
    })

    setTimeout(() => {
      if (idx < QUESTIONS.length - 1) {
        setIdx(i => i + 1)
        setSelected(null)
      } else {
        setDone(true)
      }
    }, 1500)
  }

  if (done) return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {score >= 60 ? '🏆' : score >= 40 ? '🥈' : '🥉'}
      </div>
      <h2 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        {childName} đạt {score}/{QUESTIONS.length * 20} điểm!
      </h2>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {answers.map((a, i) => (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: '50%', fontSize: 16,
            background: a.correct ? '#166534' : '#7f1d1d',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {a.correct ? '✓' : '✗'}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
        Câu {idx + 1}/{QUESTIONS.length} | ⭐ {score}
      </div>

      <div style={{
        background: '#1e3a5f', borderRadius: 20, padding: '20px 28px',
        marginBottom: 24, textAlign: 'center', maxWidth: 360,
        boxShadow: '0 0 30px rgba(59,130,246,0.2)'
      }}>
        <div style={{ fontSize: 20, color: '#e2e8f0', fontWeight: 600, lineHeight: 1.5 }}>
          🤔 {q.q}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 360 }}>
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
            style={{
              padding: '14px 20px', textAlign: 'left',
              background: selected === null ? '#1e293b'
                : i === q.correct ? '#166534'
                : selected === i ? '#7f1d1d' : '#1e293b',
              border: `2px solid ${
                selected !== null && i === q.correct ? '#22c55e'
                : selected === i ? '#ef4444' : '#334155'
              }`,
              borderRadius: 12, cursor: selected !== null ? 'default' : 'pointer',
              color: '#e2e8f0', fontSize: 14, fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}