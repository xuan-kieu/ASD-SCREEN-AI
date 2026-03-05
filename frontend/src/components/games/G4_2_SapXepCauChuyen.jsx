import { useState } from 'react'

const STORIES = [
  {
    title: 'Trồng cây',
    steps: [
      { id: 1, emoji: '🌱', text: 'Gieo hạt xuống đất' },
      { id: 2, emoji: '💧', text: 'Tưới nước mỗi ngày' },
      { id: 3, emoji: '☀️', text: 'Cây lớn dần dưới nắng' },
      { id: 4, emoji: '🌳', text: 'Cây to và ra quả' },
    ]
  },
  {
    title: 'Buổi sáng',
    steps: [
      { id: 1, emoji: '⏰', text: 'Thức dậy khi chuông reo' },
      { id: 2, emoji: '🪥', text: 'Đánh răng rửa mặt' },
      { id: 3, emoji: '🍳', text: 'Ăn sáng cùng gia đình' },
      { id: 4, emoji: '🎒', text: 'Đến trường học bài' },
    ]
  }
]

export default function G4_2_SapXepCauChuyen({ onFeatureCapture, childName = 'Bé' }) {
  const [storyIdx] = useState(Math.floor(Math.random() * STORIES.length))
  const story = STORIES[storyIdx]
  const [shuffled] = useState([...story.steps].sort(() => Math.random() - 0.5))
  const [order, setOrder] = useState([])
  const [result, setResult] = useState(null)

  const addStep = (step) => {
    if (order.find(s => s.id === step.id)) return
    const newOrder = [...order, step]
    setOrder(newOrder)

    if (newOrder.length === story.steps.length) {
      const correct = newOrder.every((s, i) => s.id === story.steps[i].id)
      setResult(correct ? 'correct' : 'wrong')
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G4.2',
        event: 'story_complete',
        correct,
        attentionLevel: correct ? 1 : 0.6,
      })
    }
  }

  const reset = () => { setOrder([]); setResult(null) }

  return (
    <div style={{
      height: '100%', display: 'flex', gap: 24,
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      {/* Left: Shuffled cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>Chọn theo thứ tự:</div>
        {shuffled.map(step => {
          const used = order.find(s => s.id === step.id)
          return (
            <button
              key={step.id}
              onClick={() => !used && addStep(step)}
              style={{
                padding: '12px 16px', width: 160,
                background: used ? '#334155' : '#1e293b',
                border: `2px solid ${used ? '#475569' : '#3b82f6'}`,
                borderRadius: 10, cursor: used ? 'default' : 'pointer',
                opacity: used ? 0.4 : 1,
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: 28 }}>{step.emoji}</span>
              <span style={{ color: '#e2e8f0', fontSize: 12 }}>{step.text}</span>
            </button>
          )
        })}
      </div>

      {/* Right: Order slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
          📖 {story.title}
        </div>
        {story.steps.map((_, i) => {
          const placed = order[i]
          const correct = placed && placed.id === story.steps[i].id
          return (
            <div key={i} style={{
              width: 160, height: 56,
              background: placed ? (result ? (correct ? '#166534' : '#7f1d1d') : '#1e3a5f') : '#0f172a',
              border: `2px solid ${placed ? (result ? (correct ? '#22c55e' : '#ef4444') : '#3b82f6') : '#334155'}`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0 12px'
            }}>
              <span style={{ color: '#64748b', fontWeight: 700 }}>{i + 1}.</span>
              {placed ? (
                <>
                  <span style={{ fontSize: 24 }}>{placed.emoji}</span>
                  <span style={{ color: '#e2e8f0', fontSize: 11 }}>{placed.text}</span>
                </>
              ) : (
                <span style={{ color: '#475569', fontSize: 12 }}>Chọn bước {i + 1}</span>
              )}
            </div>
          )
        })}

        {result && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <div style={{ color: result === 'correct' ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {result === 'correct' ? '🎉 Đúng thứ tự!' : '😊 Thứ tự chưa đúng!'}
            </div>
            <button onClick={reset} style={{
              padding: '8px 20px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13
            }}>
              🔄 Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  )
}