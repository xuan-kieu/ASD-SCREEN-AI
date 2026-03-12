import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

const DOMAIN_LABELS = {
  social:        { label: 'Kỹ năng xã hội', icon: '👥' },
  communication: { label: 'Giao tiếp',       icon: '💬' },
  cognitive:     { label: 'Nhận thức',        icon: '🧠' },
  motor:         { label: 'Vận động',         icon: '🏃' },
}

const RISK_CONFIG = {
  'THẤP':       { color: '#22c55e', bg: '#14532d', border: '#166534', icon: '✅' },
  'TRUNG BÌNH': { color: '#eab308', bg: '#713f12', border: '#854d0e', icon: '⚠️' },
  'CAO':        { color: '#f97316', bg: '#7c2d12', border: '#9a3412', icon: '🔶' },
  'RẤT CAO':   { color: '#ef4444', bg: '#450a0a', border: '#7f1d1d', icon: '🚨' },
}

// ── Gọi Gemini API ────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.7, 
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 }
      }
    })
  })
  if (!res.ok) throw new Error(`Gemini API lỗi: ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// ── Tạo prompt từ dữ liệu báo cáo ────────────────────────────────────────────
function buildPrompt(child, riskLevel, score, domains, concerns, strengths, recs) {
  const domainText = Object.entries(domains)
    .map(([k, v]) => `${DOMAIN_LABELS[k]?.label || k}: ${Math.round(v)}/100`)
    .join(', ')

  const strengthText = strengths.map(s => DOMAIN_LABELS[s]?.label || s).join(', ') || 'Chưa xác định'
  const concernText  = concerns.map(c => DOMAIN_LABELS[c]?.label || c).join(', ')  || 'Không có'

  return `Bạn là chuyên gia tâm lý nhi khoa và phát triển trẻ em. Hãy phân tích kết quả sàng lọc phát triển sau và đưa ra tư vấn chuyên sâu bằng tiếng Việt.

THÔNG TIN TRẺ:
- Tên: ${child?.full_name || 'Trẻ'}
- Tuổi: ${child?.age_months || 'N/A'} tháng

KẾT QUẢ ĐÁNH GIÁ:
- Mức nguy cơ: ${riskLevel}
- Điểm tổng hợp: ${score}/100
- Chi tiết theo lĩnh vực: ${domainText}
- Điểm mạnh: ${strengthText}
- Lĩnh vực cần chú ý: ${concernText}

Hãy cung cấp:

1. **NHẬN XÉT TỔNG QUAN** (2-3 câu ngắn gọn về tình trạng phát triển)

2. **PHÂN TÍCH CHI TIẾT** theo từng lĩnh vực có vấn đề (nếu có)

3. **GỢI Ý CAN THIỆP CỤ THỂ** (3-5 hoạt động/bài tập phụ huynh có thể làm tại nhà, phù hợp lứa tuổi ${child?.age_months} tháng)

4. **KHUYẾN NGHỊ CHUYÊN GIA** (khi nào cần đưa trẻ đến chuyên gia, loại chuyên gia nào)

Lưu ý: Trả lời ngắn gọn, thực tế, dễ hiểu cho phụ huynh không có chuyên môn y tế. Không dùng thuật ngữ quá kỹ thuật.`
}

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [aiText, setAiText]     = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError]   = useState('')
  const [aiDone, setAiDone]     = useState(false)

  useEffect(() => {
    api.get(`/reports/${id}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Không tải được báo cáo'))
      .finally(() => setLoading(false))
  }, [id])

  const handleAiAnalysis = useCallback(async () => {
    if (!GEMINI_API_KEY) {
      setAiError('Chưa cấu hình VITE_GEMINI_API_KEY trong .env')
      return
    }
    setAiLoading(true)
    setAiText('')
    setAiError('')
    try {
      const report    = data?.report
      const child     = data?.child
      const riskLevel = data?.risk_level || report?.executive_summary?.risk_level || 'THẤP'
      const score     = data?.overall_score ?? report?.executive_summary?.weighted_score ?? 0
      const domains   = report?.domain_analysis || {}
      const strengths = report?.executive_summary?.strengths || []
      const concerns  = report?.executive_summary?.concerns  || []
      const recs      = report?.recommendations || {}
      const prompt    = buildPrompt(child, riskLevel, score, domains, concerns, strengths, recs)
      const text      = await callGemini(prompt)
      setAiText(text)
      setAiDone(true)
    } catch (e) {
      setAiError(`Lỗi: ${e.message}`)
    } finally {
      setAiLoading(false)
    }
  }, [data])

  // ── Parse markdown đơn giản ────────────────────────────────────────────────
  const renderAiText = (text) => {
    if (!text) return null
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14, marginTop: 14, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
      }
      if (line.match(/^\d+\.\s\*\*/)) {
        const clean = line.replace(/\*\*/g, '')
        return <div key={i} style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginTop: 10 }}>{clean}</div>
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, paddingLeft: 8 }}>
            <span style={{ color: '#60a5fa' }}>•</span>
            <span style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{line.slice(2).replace(/\*\*/g, '')}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
      return <p key={i} style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: '2px 0' }}>{line.replace(/\*\*/g, '')}</p>
    })
  }

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
        <button onClick={() => navigate('/dashboard')} style={S.btnBlue}>← Dashboard</button>
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
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
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
        <div style={{ ...S.card, background: riskCfg.bg, border: `2px solid ${riskCfg.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{riskCfg.icon}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: riskCfg.color, marginBottom: 4 }}>{riskLevel}</div>
          <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
            {report?.executive_summary?.summary || 'Kết quả đánh giá phát triển'}
          </div>
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Điểm tổng hợp</span>
              <span style={{ color: riskCfg.color, fontWeight: 700 }}>{score}/100</span>
            </div>
            <div style={{ height: 12, background: '#334155', borderRadius: 6 }}>
              <div style={{ height: '100%', width: `${score}%`, background: riskCfg.color, borderRadius: 6, transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>

        {/* Domain analysis */}
        {Object.keys(domains).length > 0 && (
          <div style={S.card}>
            <h3 style={S.sectionTitle}>🔍 Phân tích theo lĩnh vực</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries(domains).map(([domain, score]) => {
                const cfg   = DOMAIN_LABELS[domain] || { label: domain, icon: '📊' }
                const info  = interp[domain] || {}
                const pct   = Math.round(score)
                const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444'
                return (
                  <div key={domain} style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{cfg.icon} {cfg.label}</span>
                      <span style={{ color, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: '#334155', borderRadius: 3, marginBottom: 8 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{info.note || ''}</div>
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
                    <span style={{ color: '#bbf7d0', fontSize: 14 }}>{DOMAIN_LABELS[s]?.label || s}</span>
                  </div>
                ))}
            </div>
            <div style={{ ...S.card, background: '#450a0a', border: '1px solid #7f1d1d' }}>
              <h3 style={{ ...S.sectionTitle, color: '#ef4444' }}>⚠️ Cần chú ý</h3>
              {concerns.length === 0
                ? <p style={{ color: '#64748b', fontSize: 13 }}>Không có điểm lo ngại</p>
                : concerns.map(c => (
                  <div key={c} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#ef4444' }}>!</span>
                    <span style={{ color: '#fecaca', fontSize: 14 }}>{DOMAIN_LABELS[c]?.label || c}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── GEMINI AI ANALYSIS ─────────────────────────────────────────── */}
        <div style={{ ...S.card, border: '1px solid #3730a3', background: '#0f172a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ ...S.sectionTitle, marginBottom: 2, color: '#818cf8' }}>
                🤖 Phân tích AI
              </h3>
              <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>
                Powered by Google Gemini — Tư vấn chuyên sâu cho phụ huynh
              </p>
            </div>
            {!aiDone && (
              <button
                onClick={handleAiAnalysis}
                disabled={aiLoading}
                style={{
                  padding: '9px 20px',
                  background: aiLoading ? '#1e1b4b' : '#4f46e5',
                  border: '1px solid #4338ca',
                  borderRadius: 10, color: '#e0e7ff',
                  fontWeight: 700, cursor: aiLoading ? 'not-allowed' : 'pointer',
                  fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.2s', whiteSpace: 'nowrap'
                }}>
                {aiLoading
                  ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Đang phân tích...</>
                  : '✨ Phân tích với AI'}
              </button>
            )}
            {aiDone && (
              <button
                onClick={() => { setAiDone(false); setAiText('') }}
                style={{ padding: '7px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 12 }}>
                🔄 Phân tích lại
              </button>
            )}
          </div>

          {/* Trạng thái chờ */}
          {!aiLoading && !aiText && !aiError && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#334155' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
              <p style={{ fontSize: 13, color: '#475569' }}>
                Bấm <strong style={{ color: '#818cf8' }}>Phân tích với AI</strong> để nhận tư vấn chuyên sâu<br />
                dựa trên kết quả đánh giá của trẻ
              </p>
            </div>
          )}

          {/* Loading animation */}
          {aiLoading && (
            <div style={{ padding: '20px 0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', animation: 'pulse 1s infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', animation: 'pulse 1s 0.2s infinite' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', animation: 'pulse 1s 0.4s infinite' }} />
                <span style={{ color: '#475569', fontSize: 13, marginLeft: 4 }}>Gemini đang phân tích kết quả...</span>
              </div>
              {[80, 60, 70, 50].map((w, i) => (
                <div key={i} style={{ height: 10, background: '#1e293b', borderRadius: 5, marginBottom: 8, width: `${w}%`, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          )}

          {/* Kết quả AI */}
          {aiText && (
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16 }}>
              {renderAiText(aiText)}
              <div style={{ marginTop: 16, padding: '8px 12px', background: '#1e293b', borderRadius: 8, fontSize: 11, color: '#475569' }}>
                ⚠️ Đây là gợi ý từ AI, không thay thế chẩn đoán lâm sàng. Tham khảo chuyên gia khi cần thiết.
              </div>
            </div>
          )}

          {/* Lỗi */}
          {aiError && (
            <div style={{ padding: '12px 16px', background: '#450a0a', borderRadius: 10, border: '1px solid #7f1d1d' }}>
              <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>❌ {aiError}</p>
              {aiError.includes('API_KEY') && (
                <p style={{ color: '#64748b', fontSize: 12, margin: '6px 0 0' }}>
                  Thêm <code style={{ color: '#fbbf24' }}>VITE_GEMINI_API_KEY=AIza...</code> vào file <code>.env</code> rồi restart frontend.
                </p>
              )}
            </div>
          )}
        </div>

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
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
                    </div>
                    <span style={{ color, fontWeight: 700, fontSize: 13, minWidth: 36 }}>{pct}</span>
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
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, padding: '10px 14px', background: '#0f172a', borderRadius: 10, borderLeft: `3px solid ${riskCfg.color}` }}>
                <span style={{ color: riskCfg.color, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                <span style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 }}>{action}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ ...S.card, background: '#1e293b', border: '1px solid #334155', fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 1.7 }}>
          ⚠️ Đây là công cụ sàng lọc phát triển, <strong>không thay thế</strong> chẩn đoán lâm sàng.
          Kết quả chỉ mang tính tham khảo. Vui lòng tham khảo ý kiến chuyên gia y tế nếu có lo ngại.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 32 }}>
          <button onClick={() => navigate(-1)} style={S.btnGray}>← Hồ sơ trẻ</button>
          <button onClick={() => navigate('/dashboard')} style={S.btnBlue}>🏠 Dashboard</button>
        </div>

      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}

const S = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: "'Segoe UI', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 10 },
  content: { maxWidth: 720, margin: '0 auto', padding: '24px 16px', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 },
  card: { background: '#1e293b', borderRadius: 16, padding: 20, border: '1px solid #334155' },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 14, marginTop: 0 },
  backBtn:  { padding: '6px 14px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  printBtn: { padding: '6px 14px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
  btnBlue: { padding: '10px 24px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600 },
  btnGray: { padding: '10px 24px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontWeight: 600 },
}