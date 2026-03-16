/**
 * components/AudioIndicator.jsx
 * Hiển thị trạng thái thu âm và kết quả phân tích real-time
 * Dùng trong Assessment.jsx khi chơi game
 */
import { useEffect, useState } from 'react'

const EMOTION_EMOJI = {
  happy:   '😊',
  excited: '🤩',
  sad:     '😢',
  neutral: '😐',
}

const EMOTION_VI = {
  happy:   'Vui',
  excited: 'Phấn khích',
  sad:     'Buồn',
  neutral: 'Bình thường',
}

export default function AudioIndicator({ audioResult, isRecording, error }) {
  const [pulse, setPulse] = useState(false)

  // Pulse animation khi có tiếng
  useEffect(() => {
    if (audioResult?.has_voice) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 600)
      return () => clearTimeout(t)
    }
  }, [audioResult])

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#450a0a', borderRadius: 20, padding: '4px 12px',
        fontSize: 11, color: '#fca5a5',
      }}>
        🎤 {error}
      </div>
    )
  }

  if (!isRecording) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#1e293b', borderRadius: 20, padding: '4px 12px',
        fontSize: 11, color: '#64748b',
      }}>
        🎤 Chưa thu âm
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#0f172a', borderRadius: 20, padding: '6px 14px',
      border: `1px solid ${audioResult?.has_voice ? '#22c55e' : '#334155'}`,
      transition: 'border-color 0.3s',
    }}>

      {/* Mic icon với pulse */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: audioResult?.has_voice ? '#22c55e' : '#475569',
        boxShadow: pulse ? '0 0 0 4px rgba(34,197,94,0.3)' : 'none',
        transition: 'all 0.2s',
        flexShrink: 0,
      }} />

      {/* Trạng thái */}
      <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {audioResult?.has_voice ? '🎤 Có tiếng' : '🔇 Im lặng'}
      </span>

      {/* Cảm xúc */}
      {audioResult?.emotion && audioResult.has_voice && (
        <>
          <span style={{ color: '#334155', fontSize: 10 }}>|</span>
          <span style={{ fontSize: 12 }}>
            {EMOTION_EMOJI[audioResult.emotion] || '😐'}
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {EMOTION_VI[audioResult.emotion] || audioResult.emotion}
          </span>
        </>
      )}

      {/* Language score */}
      {audioResult?.language_score > 0 && (
        <>
          <span style={{ color: '#334155', fontSize: 10 }}>|</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: audioResult.language_score >= 70 ? '#22c55e'
              : audioResult.language_score >= 40 ? '#f59e0b' : '#ef4444',
          }}>
            NN: {audioResult.language_label}
          </span>
        </>
      )}
    </div>
  )
}
