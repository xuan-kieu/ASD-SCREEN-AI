import { useState } from 'react'

const RULES = [
  {
    sequence: ['🔴', '🔵', '🔴', '🔵', '?'],
    answer: '🔴',
    options: ['🔴', '🟡', '🟢', '⭐'],
    rule: 'Xen kẽ đỏ-xanh'
  },
  {
    sequence: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '?'],
    answer: '5️⃣',
    options: ['5️⃣', '6️⃣', '0️⃣', '🔟'],
    rule: 'Đếm tăng dần'
  },
  {
    sequence: ['🌕', '🌖', '🌗', '🌘', '?'],
    answer: '🌑',
    options: ['🌑', '🌒', '🌙', '⭐'],
    rule: 'Pha mặt trăng'
  },
  {
    sequence: ['🐣', '🐥', '🐔', '🥚', '?'],
    answer: '🐣',
    options: ['🐣', '🦅', '🐧', '🦜'],
    rule: 'Vòng đời gà'
  },
]

export default function G4_5_GiaiMaQuyTac({ onFeatureCapture, childName = 'Bé' }) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = RULES[idx]

  const handleSelect = (opt) => {
    if (selected) return
    setSelected(opt)
    const correct = opt === q.answer
    if (correct) setScore(s => s + 25)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G4.5',
      event: 'pattern_decode',
      correct,
      ruleIdx: idx,
      attentionLevel: correct ? 1 : 0.6,
    })

    setTimeout(() => {
      if (idx < RULES.length - 1) {
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
      background: 'linear-gradient(135deg, #1e293b, #0f172a)'
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>
        {score >= 75 ? '🏆' : score >= 50 ? '🥈' : '🥉'}
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700 }}>
        {childName}: {score}/{RULES.length * 25} điểm!
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
        Quy luật {idx + 1}/{RULES.length} | ⭐ {score}
      </div>

      {/* Sequence */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center'
      }}>
        {q.sequence.map((item, i) => (
          <div key={i} style={{
            width: 52, height: 52, fontSize: item === '?' ? 24 : 30,
            background: item === '?' ? '#1e3a5f' : '#1e293b',
            border: `2px solid ${item === '?' ? '#3b82f6' : '#334155'}`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#e2e8f0', fontWeight: item === '?' ? 700 : 400,
            boxShadow: item === '?' ? '0 0 16px rgba(59,130,246,0.5)' : 'none'
          }}>
            {item}
          </div>
        ))}
      </div>

      <div style={{ color: '#94a3b8', fontSize: 15, marginBottom: 20 }}>
        🧩 Ô <strong style={{ color: '#60a5fa' }}>?</strong> là gì?
      </div>

      {/* Options */}
      <div style={{ display: 'flex', gap: 12 }}>
        {q.options.map(opt => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={!!selected}
            style={{
              width: 64, height: 64, fontSize: 30,
              background: selected
                ? opt === q.answer ? '#166534'
                : selected === opt ? '#7f1d1d' : '#1e293b'
                : '#1e293b',
              border: `2px solid ${
                selected && opt === q.answer ? '#22c55e'
                : selected === opt ? '#ef4444' : '#334155'
              }`,
              borderRadius: 12, cursor: selected ? 'default' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{
          marginTop: 16, fontSize: 16, fontWeight: 700,
          color: selected === q.answer ? '#22c55e' : '#ef4444'
        }}>
          {selected === q.answer ? `🎉 Đúng! Quy luật: ${q.rule}` : `💡 Đáp án: ${q.answer} — ${q.rule}`}
        </div>
      )}
    </div>
  )
}