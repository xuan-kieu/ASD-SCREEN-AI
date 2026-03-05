import { useState } from 'react'

const MAZE = [
  [0,0,1,0,0],
  [1,0,1,0,1],
  [1,0,0,0,1],
  [1,1,1,0,1],
  [0,0,0,0,0],
]
const START = { r: 0, c: 0 }
const END = { r: 4, c: 4 }

export default function G3_5_MeCungDonGian({ onFeatureCapture, childName = 'Bé' }) {
  const [pos, setPos] = useState(START)
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [path, setPath] = useState([START])

  const move = (dr, dc) => {
    if (won) return
    const nr = pos.r + dr, nc = pos.c + dc
    if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) return
    if (MAZE[nr][nc] === 1) return
    const newPos = { r: nr, c: nc }
    setPos(newPos)
    setPath(p => [...p, newPos])
    setMoves(m => m + 1)

    if (nr === END.r && nc === END.c) {
      setWon(true)
      onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.5', event: 'maze_complete', moves: moves + 1, attentionLevel: 1 })
    } else {
      onFeatureCapture({ timestamp: Date.now(), gameId: 'G3.5', event: 'move', moves: moves + 1, attentionLevel: 0.8 })
    }
  }

  const reset = () => {
    setPos(START)
    setMoves(0)
    setWon(false)
    setPath([START])
  }

  const CELL = 56

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
        🏃 {childName} giúp nhân vật tìm đường! | 🔄 {moves} bước
      </div>

      {/* Maze grid */}
      <div style={{ marginBottom: 24 }}>
        {MAZE.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.map((cell, c) => {
              const isPlayer = pos.r === r && pos.c === c
              const isEnd = END.r === r && END.c === c
              const isWall = cell === 1
              const isPath = path.some(p => p.r === r && p.c === c)
              return (
                <div key={c} style={{
                  width: CELL, height: CELL,
                  background: isWall ? '#1e293b' : isPath && !isPlayer ? '#1e3a5f' : '#0f172a',
                  border: isWall ? '2px solid #334155' : '1px solid #1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, borderRadius: 4
                }}>
                  {isPlayer ? '🐭' : isEnd ? '🧀' : isWall ? '🧱' : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {won ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            Thoát ra rồi! Chỉ dùng {moves} bước!
          </div>
          <button onClick={reset} style={{
            padding: '10px 24px', background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
          }}>
            🔄 Chơi lại
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 4 }}>
          {[
            { label: '↖', dr: -1, dc: -1, hidden: true },
            { label: '⬆', dr: -1, dc: 0 },
            { label: '↗', dr: -1, dc: 1, hidden: true },
            { label: '⬅', dr: 0, dc: -1 },
            { label: '·', dr: 0, dc: 0, hidden: true },
            { label: '➡', dr: 0, dc: 1 },
            { label: '↙', dr: 1, dc: -1, hidden: true },
            { label: '⬇', dr: 1, dc: 0 },
            { label: '↘', dr: 1, dc: 1, hidden: true },
          ].map((btn, i) => (
            <button key={i} onClick={() => !btn.hidden && move(btn.dr, btn.dc)} style={{
              width: 56, height: 56, fontSize: 22,
              background: btn.hidden ? 'transparent' : '#1e293b',
              border: btn.hidden ? 'none' : '2px solid #334155',
              borderRadius: 8, cursor: btn.hidden ? 'default' : 'pointer',
              color: '#e2e8f0', visibility: btn.hidden ? 'hidden' : 'visible'
            }}>
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}