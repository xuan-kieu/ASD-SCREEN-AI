import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useChildStore from '../store/childStore'
import api from '../api/axios'

export default function ChildDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { children } = useChildStore()
  const [child, setChild] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [childRes, assessRes] = await Promise.all([
        api.get(`/children/${id}`),
        api.get(`/assessments/child/${id}`)
      ])
      setChild(childRes.data)
      setAssessments(assessRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ← ĐÃ SỬA: truyền childName + birthDate qua navigate state
  const startAssessment = async () => {
    try {
      const res = await api.post('/assessments/', { child_id: id })
      navigate(`/assessment/${res.data.id}`, {
        state: {
          childName: child?.full_name,
          birthDate: child?.birth_date
        }
      })
    } catch (err) {
      alert('Không thể tạo phiên đánh giá')
    }
  }

  const getRiskBadge = (level) => {
    const map = {
      'THẤP':       'bg-green-100 text-green-700',
      'TRUNG BÌNH': 'bg-yellow-100 text-yellow-700',
      'CAO':        'bg-orange-100 text-orange-700',
      'RẤT CAO':   'bg-red-100 text-red-700',
    }
    return map[level] || 'bg-gray-100 text-gray-600'
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-3">⏳</div>
        <p>Đang tải...</p>
      </div>
    </div>
  )

  if (!child) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <div className="text-4xl mb-3">❌</div>
        <p>Không tìm thấy trẻ</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-700 text-sm mb-6 flex items-center gap-1"
        >
          ← Quay lại Dashboard
        </button>

        {/* Child Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl">
                {child.gender === 'female' ? '👧' : '👦'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{child.full_name}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {child.age_months} tháng tuổi
                  ({Math.floor(child.age_months / 12)} tuổi {child.age_months % 12} tháng)
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  📍 {child.region || 'Chưa cập nhật'} &nbsp;|&nbsp;
                  🗣️ {child.primary_language === 'vi' ? 'Tiếng Việt' : child.primary_language}
                </p>
              </div>
            </div>
            <button
              onClick={startAssessment}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              🎮 Bắt đầu đánh giá mới
            </button>
          </div>

          {/* Age range indicator */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-medium text-blue-700 mb-2">
              📊 Nhóm tuổi phù hợp
            </p>
            <AgeRangeBar ageMonths={child.age_months} />
          </div>
        </div>

        {/* Assessment History */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            📋 Lịch sử đánh giá ({assessments.length})
          </h3>

          {assessments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">📝</div>
              <p>Chưa có phiên đánh giá nào</p>
              <p className="text-sm mt-1">Nhấn "Bắt đầu đánh giá mới" để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map(a => (
                <div
                  key={a.id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors cursor-pointer"
                  onClick={() => a.status === 'completed' && navigate(`/report/${a.id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        Phiên đánh giá #{a.id.slice(-6).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        🕐 {new Date(a.started_at).toLocaleDateString('vi-VN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.risk_level && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadge(a.risk_level)}`}>
                          {a.risk_level}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        a.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'completed' ? '✅ Hoàn thành' : '⏳ Đang thực hiện'}
                      </span>
                      {a.status === 'completed' && (
                        <span className="text-indigo-500 text-xs">Xem báo cáo →</span>
                      )}
                    </div>
                  </div>
                  {a.overall_risk_score && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Điểm tổng hợp</span>
                        <span>{a.overall_risk_score}/100</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${a.overall_risk_score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AgeRangeBar({ ageMonths }) {
  const ranges = [
    { label: '12-18th', min: 12, max: 18, color: 'bg-blue-400' },
    { label: '18-24th', min: 18, max: 24, color: 'bg-green-400' },
    { label: '24-36th', min: 24, max: 36, color: 'bg-yellow-400' },
    { label: '36-48th', min: 36, max: 48, color: 'bg-orange-400' },
    { label: '48-60th', min: 48, max: 60, color: 'bg-red-400' },
  ]
  return (
    <div className="flex gap-2">
      {ranges.map(r => (
        <div key={r.label} className="flex-1 text-center">
          <div className={`h-2 rounded-full mb-1 ${
            ageMonths >= r.min && ageMonths < r.max ? r.color : 'bg-gray-200'
          }`} />
          <span className={`text-xs ${
            ageMonths >= r.min && ageMonths < r.max
              ? 'text-blue-700 font-bold'
              : 'text-gray-400'
          }`}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}