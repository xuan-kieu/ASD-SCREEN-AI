import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

const RISK_CONFIG = {
  'THẤP':       { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: '✅', bar: 'bg-green-500' },
  'TRUNG BÌNH': { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', bar: 'bg-yellow-500' },
  'CAO':        { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🔶', bar: 'bg-orange-500' },
  'RẤT CAO':   { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    icon: '🚨', bar: 'bg-red-500' },
}

const DOMAIN_LABELS = {
  social:          '🤝 Xã hội',
  communication:   '💬 Giao tiếp',
  cognitive:       '🧠 Nhận thức',
  motor:           '🏃 Vận động',
}

export default function Report() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    try {
      const res = await api.get(`/reports/${id}`)
      setReport(res.data)
    } catch (err) {
      setError('Không thể tải báo cáo')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-3 animate-spin">⏳</div>
        <p>Đang tải báo cáo...</p>
      </div>
    </div>
  )

  if (error || !report) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-3">❌</div>
        <p>{error || 'Không tìm thấy báo cáo'}</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 text-indigo-600 underline text-sm">
          Về Dashboard
        </button>
      </div>
    </div>
  )

  const riskConfig = RISK_CONFIG[report.risk_level] || RISK_CONFIG['THẤP']
  const domainScores = report.report?.domain_analysis || {}
  const recommendations = report.report?.recommendations?.actions || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate(`/children/${report.child?.id}`)}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            ← Quay lại
          </button>
          <h1 className="font-bold text-gray-800">📊 Báo cáo đánh giá</h1>
          <button
            onClick={() => window.print()}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            🖨️ In báo cáo
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Child Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-2xl">
              {report.child?.gender === 'female' ? '👧' : '👦'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{report.child?.name}</h2>
              <p className="text-gray-500 text-sm">
                {report.child?.age_months} tháng tuổi •
                Đánh giá: {report.completed_at
                  ? new Date(report.completed_at).toLocaleDateString('vi-VN')
                  : 'Chưa hoàn thành'}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className={`rounded-2xl shadow-sm p-6 border-2 ${riskConfig.bg} ${riskConfig.border}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${riskConfig.color}`}>
              {riskConfig.icon} Mức độ nguy cơ: {report.risk_level || 'Đang xử lý'}
            </h3>
            {report.overall_risk_score && (
              <span className={`text-2xl font-bold ${riskConfig.color}`}>
                {report.overall_risk_score.toFixed(1)}/100
              </span>
            )}
          </div>
          {report.overall_risk_score && (
            <div className="w-full bg-white rounded-full h-3">
              <div
                className={`${riskConfig.bar} h-3 rounded-full transition-all duration-1000`}
                style={{ width: `${report.overall_risk_score}%` }}
              />
            </div>
          )}
        </div>

        {/* Domain Scores */}
        {Object.keys(domainScores).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Phân tích theo lĩnh vực</h3>
            <div className="space-y-4">
              {Object.entries(domainScores).map(([domain, score]) => (
                <div key={domain}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {DOMAIN_LABELS[domain] || domain}
                    </span>
                    <span className={`font-bold ${
                      score >= 75 ? 'text-green-600' :
                      score >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>{score}/100</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        score >= 75 ? 'bg-green-500' :
                        score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Concerns */}
        {report.report?.executive_summary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-5">
              <h4 className="font-bold text-green-700 mb-3">💪 Điểm mạnh</h4>
              {report.report.executive_summary.strengths?.length > 0 ? (
                <ul className="space-y-1">
                  {report.report.executive_summary.strengths.map(s => (
                    <li key={s} className="text-green-600 text-sm">
                      ✓ {DOMAIN_LABELS[s] || s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600 text-sm">Đang đánh giá...</p>
              )}
            </div>
            <div className="bg-red-50 rounded-2xl p-5">
              <h4 className="font-bold text-red-700 mb-3">⚠️ Cần chú ý</h4>
              {report.report.executive_summary.concerns?.length > 0 ? (
                <ul className="space-y-1">
                  {report.report.executive_summary.concerns.map(c => (
                    <li key={c} className="text-red-600 text-sm">
                      • {DOMAIN_LABELS[c] || c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600 text-sm">Không có vấn đề đáng lo ngại</p>
              )}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💡 Khuyến nghị</h3>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl">
                  <span className="text-indigo-500 font-bold text-sm mt-0.5">{i + 1}.</span>
                  <p className="text-indigo-800 text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-gray-100 rounded-2xl p-4">
          <p className="text-gray-500 text-xs text-center">
            ⚠️ Đây là công cụ sàng lọc, không thay thế chẩn đoán chuyên khoa.
            Vui lòng tham khảo ý kiến bác sĩ hoặc chuyên gia tâm lý trẻ em.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={() => navigate(`/children/${report.child?.id}`)}
            className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl hover:bg-gray-50"
          >
            Quay lại hồ sơ
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl"
          >
            Về Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}