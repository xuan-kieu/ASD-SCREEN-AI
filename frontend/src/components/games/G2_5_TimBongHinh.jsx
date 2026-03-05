import { useState, useEffect } from 'react'

const SHAPES = ['🔴', '🔵', '🟡', '🟢', '🟠', '🟣']

export default function G2_5_TimBongHinh({ onFeatureCapture, childName = 'Bé' }) {
  const [target, setTarget] = useState(null)
  const [grid, setGrid] = useState([])
  const [found, setFound] = useState([])
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(0)

  const newRound = () => {
    const t = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const count = 3 + Math.floor(Math.random() * 3)
    const cells = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      isTarget: false
    }))
    let placed = 0
    const positions = [...Array(16).keys()].sort(() => Math.random() - 0.5)
    positions.slice(0, count).forEach(pos => {
      cells[pos].shape = t
      cells[pos].isTarget = true
      placed++
    })
    setTarget(t)
    setGrid(cells)
    setFound([])
    setRound(r => r + 1)
  }

  useEffect(() => { newRound() }, [])

  const handleClick = (cell) => {
    if (found.includes(cell.id)) return

    if (cell.isTarget) {
      const newFound = [...found, cell.id]
      setFound(newFound)
      setScore(s => s + 10)
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G2.5',
        event: 'found_target',
        foundCount: newFound.length,
        attentionLevel: 1,
      })
      const totalTargets = grid.filter(c => c.isTarget).length
      if (newFound.length >= totalTargets) {
        setTimeout(newRound, 1000)
      }
    } else {
      onFeatureCapture({
        timestamp: Date.now(),
        gameId: 'G2.5',
        event: 'wrong_click',
        attentionLevel: 0.5,
      })
    }
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>Tìm tất cả </span>
        <span style={{ fontSize: 32 }}>{target}</span>
        <span style={{ color: '#fbbf24', fontWeight: 700, marginLeft: 16 }}>⭐ {score}</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8
      }}>
        {grid.map(cell => (
          <button
            key={cell.id}
            onClick={() => handleClick(cell)}
            style={{
              width: 64, height: 64, fontSize: 32,
              background: found.includes(cell.id) ? '#166534' : '#1e293b',
              border: `2px solid ${found.includes(cell.id) ? '#22c55e' : '#334155'}`,
              borderRadius: 10, cursor: 'pointer',
              transition: 'all 0.2s',
              transform: found.includes(cell.id) ? 'scale(0.9)' : 'scale(1)'
            }}
          >
            {found.includes(cell.id) ? '✅' : cell.shape}
          </button>
        ))}
      </div>

      <div style={{ color: '#64748b', fontSize: 13, marginTop: 16 }}>
        Đã tìm: {found.length}/{grid.filter(c => c.isTarget).length}
      </div>
    </div>
  )
}