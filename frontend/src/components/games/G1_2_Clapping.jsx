import { useEffect, useRef, useState } from 'react'

export default function G1_2_Clapping({ onFeatureCapture, timeElapsed, gameDuration = 120, childName = 'Bé' }) {
  const [phase, setPhase] = useState('watch') // watch | imitate | result
  const [clapCount, setClapCount] = useState(0)
  const [targetClaps, setTargetClaps] = useState(3)
  const [feedback, setFeedback] = useState('')
  const [round, setRound] = useState(1)
  const [scores, setScores] = useState([])
  const animRef = useRef(null)
  const [handScale, setHandScale] = useState(1)

  const ROUNDS = [
    { claps: 2, label: '2 lần' },
    { claps: 3, label: '3 lần' },
    { claps: 5, label: '5 lần' },
  ]

  useEffect(() => {
    if (phase === 'watch') {
      let count = 0
      const target = ROUNDS[round - 1]?.claps || 3
      setTargetClaps(target)
      setFeedback(`👀 Hãy nhìn ${childName}! Vỗ tay ${target} lần nhé!`)

      const interval = setInterval(() => {
        count++
        setHandScale(s => s === 1 ? 1.3 : 1)
        if (count >= target * 2) {
          clearInterval(interval)
          setPhase('imitate')
          setFeedback(`👏 Đến lượt ${childName} vỗ tay ${target} lần!`)
        }
      }, 600)
      return () => clearInterval(interval)
    }
  }, [phase, round])

  const handleClap = () => {
    if (phase !== 'imitate') return
    const newCount = clapCount + 1
    setClapCount(newCount)
    setHandScale(1.4)
    setTimeout(() => setHandScale(1), 200)

    onFeatureCapture({
      timestamp: Date.now(),
      gameId: 'G1.2',
      event: 'clap',
      clapCount: newCount,
      targetClaps,
      round,
    })

    if (newCount >= targetClaps) {
      const accuracy = Math.min(1, newCount / targetClaps)
      const newScore = { round, accuracy, claps: newCount, target: targetClaps }
      setScores(s => [...s, newScore])
      setFeedback(accuracy >= 1 ? '🎉 Tuyệt vời! Đúng rồi!' : '👍 Cố gắng lắm!')

      setTimeout(() => {
        if (round < ROUNDS.length) {
          setRound(r => r + 1)
          setClapCount(0)
          setPhase('watch')
        } else {
          setPhase('result')
        }
      }, 1500)
    }
  }

  const avgAccuracy = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + r.accuracy, 0) / scores.length * 100)
    : 0

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: 24
    }}>
      {phase === 'result' ? (
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>
            {avgAccuracy >= 80 ? '🏆' : avgAccuracy >= 50 ? '👍' : '💪'}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Hoàn thành!</h2>
          <p style={{ color: '#94a3b8', fontSize: 18 }}>
            {childName} đạt {avgAccuracy}% độ chính xác
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            {scores.map((s, i) => (
              <div key={i} style={{
                background: s.accuracy >= 1 ? '#166534' : '#854d0e',
                padding: '8px 16px', borderRadius: 8, color: '#fff', fontSize: 13
              }}>
                Vòng {i + 1}: {s.claps}/{s.target}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
            Vòng {round}/{ROUNDS.length}
          </div>

          <div style={{ fontSize: 18, color: '#e2e8f0', marginBottom: 32, textAlign: 'center' }}>
            {feedback}
          </div>

          {/* Hands animation */}
          <div
            onClick={handleClap}
            style={{
              fontSize: 100,
              cursor: phase === 'imitate' ? 'pointer' : 'default',
              transform: `scale(${handScale})`,
              transition: 'transform 0.15s',
              userSelect: 'none',
              filter: phase === 'imitate' ? 'drop-shadow(0 0 20px #3b82f6)' : 'none'
            }}
          >
            👏
          </div>

          {phase === 'imitate' && (
            <>
              <div style={{
                display: 'flex', gap: 8, marginTop: 24, marginBottom: 16
              }}>
                {Array.from({ length: targetClaps }).map((_, i) => (
                  <div key={i} style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: i < clapCount ? '#22c55e' : '#334155',
                    border: '2px solid', borderColor: i < clapCount ? '#22c55e' : '#475569',
                    transition: 'all 0.2s'
                  }} />
                ))}
              </div>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>
                {clapCount}/{targetClaps} — Nhấn để vỗ tay!
              </p>
            </>
          )}
        </>
      )}
    </div>
  )
}