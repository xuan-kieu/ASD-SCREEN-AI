import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const DOMAIN_LABELS = {
  social:        { label: 'Kỹ năng xã hội',  icon: '👥' },
  communication: { label: 'Giao tiếp',        icon: '💬' },
  cognitive:     { label: 'Nhận thức',         icon: '🧠' },
  motor:         { label: 'Vận động',          icon: '🏃' },
}

const RISK_CONFIG = {
  'THẤP':       { color: '#22c55e', bg: '#14532d', border: '#166534', icon: '✅' },
  'TRUNG BÌNH': { color: '#eab308', bg: '#713f12', border: '#854d0e', icon: '⚠️' },
  'CAO':        { color: '#f97316', bg: '#7c2d12', border: '#9a3412', icon: '🔶' },
  'RẤT CAO':   { color: '#ef4444', bg: '#450a0a', border: '#7f1d1d', icon: '🚨' },
}

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/reports/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Không tải được báo cáo'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={S.root}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', fontSize: 18 }}>
        ⏳ Đang tải báo cáo...
      </div>
    </div>
  )

  if (error) return (
    <div style={S.root}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
        <button onClick={() => navigate('/dashboard')} style={S.btnBlue}>
          ← Dashboard
        </button>
      </div>
    </div>
  )

  const report     = data?.report
  const child      = data?.child
  const riskLevel  = data?.risk_level || report?.executive_summary?.risk_level || 'THẤP'
  const riskCfg    = RISK_CONFIG[riskLevel] || RISK_CONFIG['THẤP']
  const score      = data?.overall_score ?? report?.executive_summary?.weighted_score ?? 0
  const domains    = report?.domain_analysis || {}
  const interp     = report?.domain_interpretation || {}
  const recs       = report?.recommendations || {}
  const strengths  = report?.executive_summary?.strengths || []
  const concerns   = report?.executive_summary?.concerns  || []
  const gameScores = report?.game_scores || {}

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={() => navigate(-1)} style={S.backBtn}>← Quay lại</button>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
          📊 Báo cáo đánh giá
        </h1>
        <button onClick={() => window.print()} style={S.printBtn}>🖨️ In</button>
      </div>

      <div style={S.content}>

        {/* Child info */}
        <div style={S.card}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#1e3a5f', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 28
            }}>
              👶
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                {child?.full_name || 'Trẻ'}
              </h2>
              <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
                {child?.age_months} tháng tuổi •
                {child?.gender === 'male' ? ' Nam' : child?.gender === 'female' ? ' Nữ' : ''} •
                Ngày đánh giá: {data?.completed_at?.split('T')[0] || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Risk level */}
        <div style={{
          ...S.card,
          background: riskCfg.bg,
          border: `2px solid ${riskCfg.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{riskCfg.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: riskCfg.color, marginBottom: 4 }}>
            {riskLevel}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
            {report?.executive_summary?.summary || 'Kết quả đánh giá phát triển'}
          </div>

          {/* Score bar */}
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Điểm tổng hợp</span>
              <span style={{ color: riskCfg.color, fontWeight: 700 }}>{score}/100</span>
            </div>
            <div style={{ height: 12, background: '#334155', borderRadius: 6 }}>
              <div style={{
                height: '100%',
                width: `${score}%`,
                background: riskCfg.color,
                borderRadius: 6,
                transition: 'width 1s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Domain analysis */}
        {Object.keys(domains).length > 0 && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>🔍 Phân tích theo lĩnh vực</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(domains).map(([domain, score]) => {
                const cfg  = DOMAIN_LABELS[domain] || { label: domain, icon: '📊' }
                const info = interp[domain] || {}
                const pct  = Math.round(score)
                const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
                return (
                  <div key={domain} style={{
                    background: '#0f172a', borderRadius: 12, padding: 16,
                    border: '1px solid #1e293b'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#334155', borderRadius: 3, marginBottom: 8 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: color, borderRadius: 3
                      }} />
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>
                      {info.note || ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Strengths & Concerns */}
        {(strengths.length > 0 || concerns.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ ...S.card, background: '#14532d', border: '1px solid #166534' }}>
              <h3 style={{ ...S.sectionTitle, color: '#22c55e' }}>💪 Điểm mạnh</h3>
              {strengths.length === 0
                ? <p style={{ color: '#64748b', fontSize: 13 }}>Chưa xác định</p>
                : strengths.map(s => (
                  <div key={s} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#22c55e' }}>✓</span>
                    <span style={{ color: '#bbf7d0', fontSize: 14 }}>
                      {DOMAIN_LABELS[s]?.label || s}
                    </span>
                  </div>
                ))
              }
            </div>
            <div style={{ ...S.card, background: '#450a0a', border: '1px solid #7f1d1d' }}>
              <h3 style={{ ...S.sectionTitle, color: '#ef4444' }}>⚠️ Cần chú ý</h3>
              {concerns.length === 0
                ? <p style={{ color: '#64748b', fontSize: 13 }}>Không có điểm lo ngại</p>
                : concerns.map(c => (
                  <div key={c} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#ef4444' }}>!</span>
                    <span style={{ color: '#fecaca', fontSize: 14 }}>
                      {DOMAIN_LABELS[c]?.label || c}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Game scores */}
        {Object.keys(gameScores).length > 0 && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>🎮 Điểm từng game</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(gameScores).map(([code, score]) => {
                const pct   = Math.round(score)
                const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
                return (
                  <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#94a3b8', fontSize: 13, minWidth: 80 }}>{code}</span>
                    <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 4 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: color, borderRadius: 4
                      }} />
                    </div>
                    <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 36 }}>
                      {pct}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recs?.actions?.length > 0 && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>📋 Khuyến nghị</h3>
            {recs.actions.map((action, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, marginBottom: 12,
                padding: '10px 14px', background: '#0f172a',
                borderRadius: 10, borderLeft: `3px solid ${riskCfg.color}`
              }}>
                <span style={{ color: riskCfg.color, fontWeight: 700, minWidth: 20 }}>
                  {i + 1}.
                </span>
                <span style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>
                  {action}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          ...S.card,
          background: '#1e293b',
          border: '1px solid #334155',
          fontSize: 12,
          color: '#64748b',
          textAlign: 'center',
          lineHeight: 1.7
        }}>
          ⚠️ Đây là công cụ sàng lọc phát triển, <strong>không thay thế</strong> chẩn đoán lâm sàng.
          Kết quả chỉ mang tính tham khảo. Vui lòng tham khảo ý kiến chuyên gia y tế nếu có lo ngại.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={S.btnGray}>
            ← Hồ sơ trẻ
          </button>
          <button onClick={() => navigate('/dashboard')} style={S.btnBlue}>
            🏠 Dashboard
          </button>
        </div>

      </div>
    </div>
  )
}

const S = {
  root: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: '#0f172a', fontFamily: "'Segoe UI', sans-serif"
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: '#1e293b',
    borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10
  },
  content: { maxWidth: 720, margin: '0 auto', padding: '24px 16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1e293b', borderRadius: 16, padding: 20, border: '1px solid #334155' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 14, marginTop: 0 },
  backBtn: { padding: '6px 14px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  printBtn: { padding: '6px 14px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  btnBlue: { padding: '10px 24px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600 },
  btnGray: { padding: '10px 24px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontWeight: 600 },
}