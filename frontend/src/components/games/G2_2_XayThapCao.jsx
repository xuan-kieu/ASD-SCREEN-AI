import { useState } from 'react'

const BLOCKS = [
  { id: 1, color: '#ef4444', label: 'Đỏ', emoji: '🟥' },
  { id: 2, color: '#f97316', label: 'Cam', emoji: '🟧' },
  { id: 3, color: '#eab308', label: 'Vàng', emoji: '🟨' },
  { id: 4, color: '#22c55e', label: 'Xanh lá', emoji: '🟩' },
  { id: 5, color: '#3b82f6', label: 'Xanh dương', emoji: '🟦' },
]

export default function G2_2_XayThapCao({ onFeatureCapture, childName = 'Bé' }) {
  const [tower, setTower] = useState([])
  const [available, setAvailable] = useState([...BLOCKS])
  const [fallen, setFallen] = useState(false)
  const [score, setScore] = useState(0)

  const addBlock = (block) => {
    if (fallen) return
    const newTower = [block, ...tower]
    setTower(newTower)
    setAvailable(a => a.filter(b => b.id !== block.id))

    const wobble = newTower.length > 3 && Math.random() < (newTower.length - 3) * 0.15
    if (wobble) {
      setTimeout(() => {
        setFallen(true)
        onFeatureCapture({
          timestamp: Date.now(),
          gameId: 'G2.2',
          event: 'tower_fall',
          height: newTower.length,
          attentionLevel: 0.8,
        })
      }, 500)
    } else {
      setScore(s => s + 10)
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G2.2',
        event: 'block_placed',
        height: newTower.length,
        attentionLevel: 1,
      })
    }
  }

  const reset = () => {
    setTower([])
    setAvailable([...BLOCKS])
    setFallen(false)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', gap: 32,
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0f172a, #1e293b)', padding: 24
    }}>
      {/* Tower */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 140 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
          🏗️ Tháp của {childName}
        </div>
        <div style={{
          minHeight: 300, display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', alignItems: 'center', gap: 4,
          filter: fallen ? 'blur(2px) rotate(5deg)' : 'none',
          transition: 'filter 0.3s, transform 0.3s'
        }}>
          {tower.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 13 }}>Chưa có khối nào</div>
          ) : (
            tower.map((b, i) => (
              <div key={`${b.id}-${i}`} style={{
                width: 80 - i * 2, height: 36,
                background: b.color, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                animation: i === 0 ? 'slideIn 0.2s' : 'none'
              }}>
                {b.emoji}
              </div>
            ))
          )}
        </div>
        {/* Ground */}
        <div style={{
          width: 120, height: 8, background: '#475569',
          borderRadius: 4, marginTop: 4
        }} />
        <div style={{ color: '#fbbf24', fontWeight: 700, marginTop: 12 }}>
          ⭐ {score} | Cao {tower.length} tầng
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        {fallen ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💥</div>
            <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 16 }}>Tháp đổ rồi!</div>
            <button onClick={reset} style={{
              padding: '10px 24px', background: '#3b82f6', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
            }}>
              🔄 Xây lại
            </button>
          </div>
        ) : (
          <>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
              Chọn khối để xây:
            </div>
            {available.map(b => (
              <button key={b.id} onClick={() => addBlock(b)} style={{
                width: 100, height: 44, background: b.color,
                border: 'none', borderRadius: 8, fontSize: 22,
                cursor: 'pointer', fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'transform 0.1s',
              }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {b.emoji}
              </button>
            ))}
            {available.length === 0 && (
              <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>
                🎉 Xây xong rồi!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}