import { useState, useEffect } from 'react'

const EMOTIONS = [
  { name: 'Vui', emoji: '😄', color: '#22c55e', scenario: 'Được tặng quà sinh nhật 🎁' },
  { name: 'Buồn', emoji: '😢', color: '#3b82f6', scenario: 'Mất đồ chơi yêu thích 🧸' },
  { name: 'Sợ', emoji: '😨', color: '#8b5cf6', scenario: 'Nghe tiếng sấm to ⛈️' },
  { name: 'Tức giận', emoji: '😠', color: '#ef4444', scenario: 'Bị bạn giành đồ chơi 😤' },
  { name: 'Ngạc nhiên', emoji: '😲', color: '#f97316', scenario: 'Thấy điều bất ngờ 🎉' },
]

export default function G3_2_CamXucGiDay({ onFeatureCapture, childName = 'Bé' }) {
  const [current, setCurrent] = useState(null)
  const [options, setOptions] = useState([])
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)

  const nextRound = () => {
    const shuffled = [...EMOTIONS].sort(() => Math.random() - 0.5)
    setCurrent(shuffled[0])
    setOptions(shuffled.slice(0, 4).sort(() => Math.random() - 0.5))
    setResult(null)
    setRound(r => r + 1)
  }

  useEffect(() => { nextRound() }, [])

  const handleSelect = (emotion) => {
    if (result) return
    const correct = emotion.name === current?.name
    setResult(correct ? 'correct' : 'wrong')
    if (correct) setScore(s => s + 15)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G3.2',
      event: 'emotion_identify',
      correct,
      targetEmotion: current?.name,
      selectedEmotion: emotion.name,
      attentionLevel: correct ? 1 : 0.5,
    })

    setTimeout(nextRound, 1500)
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

      {/* Scenario */}
      <div style={{
        background: '#1e3a5f', borderRadius: 20, padding: '20px 32px',
        marginBottom: 24, textAlign: 'center', maxWidth: 320
      }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{current?.emoji}</div>
        <div style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.5 }}>
          {current?.scenario}
        </div>
        <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>
          {childName} cảm thấy thế nào?
        </div>
      </div>

      {/* Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {options.map(emotion => (
          <button
            key={emotion.name}
            onClick={() => handleSelect(emotion)}
            disabled={!!result}
            style={{
              padding: '14px 18px',
              background: result
                ? emotion.name === current?.name ? '#166534' : '#1e293b'
                : '#1e293b',
              border: `2px solid ${result && emotion.name === current?.name ? '#22c55e' : '#334155'}`,
              borderRadius: 12, cursor: result ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: 28 }}>{emotion.emoji}</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{emotion.name}</span>
          </button>
        ))}
      </div>

      {result && (
        <div style={{
          marginTop: 16, fontSize: 18, fontWeight: 700,
          color: result === 'correct' ? '#22c55e' : '#ef4444'
        }}>
          {result === 'correct' ? '🎉 Giỏi quá!' : `💡 Đó là cảm xúc ${current?.name} ${current?.emoji}`}
        </div>
      )}
    </div>
  )
}