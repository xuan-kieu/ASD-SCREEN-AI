import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import api from '../api/axios'
import MChatScreen from '../components/MChatScreen'
import useAuthStore from '../store/authStore'
import { CITIES } from '../constants/cities'

const RISK_COLOR = {
  'THẤP':       '#22c55e',
  'TRUNG BÌNH': '#eab308',
  'CAO':        '#f97316',
  'RẤT CAO':   '#ef4444',
}

export default function ChildDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuthStore()

  const [child, setChild]           = useState(null)
  const [assessments, setAssessments] = useState([])
  const [transfers, setTransfers]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('assessments') // 'assessments' | 'transfers'

  const [showEdit, setShowEdit]     = useState(false)
  const [editForm, setEditForm]     = useState({})
  const [saving, setSaving]         = useState(false)
  const [showMChat, setShowMChat]   = useState(false)
  const [mchatHistory, setMchatHistory] = useState([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [childRes, assessRes] = await Promise.all([
        api.get(`/children/${id}`),
        api.get(`/assessments/child/${id}`)
      ])
      setChild(childRes.data)
      setAssessments(assessRes.data)
      try { const r = await api.get(`/mchat/results/child/${id}`); setMchatHistory(r.data) } catch {}
      try { const r = await api.get(`/admin/children/${id}/transfers`); setTransfers(r.data) } catch {}
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openEdit = () => {
    setEditForm({
      full_name:        child.full_name,
      birth_date:       child.birth_date,
      gender:           child.gender || '',
      region:           child.region || '',
      primary_language: child.primary_language || 'vi',
      notes:            child.notes || '',
    })
    setShowEdit(true)
  }

  const saveEdit = async () => {
    if (!editForm.full_name?.trim() || !editForm.birth_date) return
    if (editForm.birth_date > today) { alert('Ngày sinh không được sau hôm nay'); return }
    setSaving(true)
    try {
      const res = await api.put(`/children/${id}`, editForm)
      setChild(res.data); setShowEdit(false)
    } catch { alert('Không thể cập nhật thông tin') }
    finally { setSaving(false) }
  }

  const startAssessment = async () => {
    try {
      const res = await api.post('/assessments/', { child_id: id })
      navigate(`/assessment/${res.data.id}`, {
        state: { childName: child?.full_name, birthDate: child?.birth_date }
      })
    } catch { alert('Không thể tạo phiên đánh giá') }
  }

  const getRiskBadge = (level) => ({
    'THẤP':       'bg-green-100 text-green-700',
    'TRUNG BÌNH': 'bg-yellow-100 text-yellow-700',
    'CAO':        'bg-orange-100 text-orange-700',
    'RẤT CAO':   'bg-red-100 text-red-700',
  }[level] || 'bg-gray-100 text-gray-600')

  const chartData = assessments
    .filter(a => a.status === 'completed' && a.overall_risk_score != null)
    .sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
    .map((a, i) => ({
      name:  `Lần ${i + 1}`,
      date:  new Date(a.started_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      score: Math.round(a.overall_risk_score),
      risk:  a.risk_level,
      id:    a.id,
    }))

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px' }}>
        <p style={{ color: '#e2e8f0', fontWeight: 700, margin: 0 }}>{d.name} — {d.date}</p>
        <p style={{ color: RISK_COLOR[d.risk] || '#94a3b8', margin: '4px 0 0', fontWeight: 600 }}>
          Điểm: {d.score}/100 • {d.risk || 'N/A'}
        </p>
      </div>
    )
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400"><div className="text-4xl mb-3">⏳</div><p>Đang tải...</p></div>
    </div>
  )
  if (!child) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400"><div className="text-4xl mb-3">❌</div><p>Không tìm thấy trẻ</p></div>
    </div>
  )

  const latestMChat    = mchatHistory[0]
  const mchatRiskColor = latestMChat?.risk_level === 'high' ? '#ef4444' : '#22c55e'
  const mchatRiskText  = latestMChat?.risk_level === 'high' ? 'DƯƠNG TÍNH' : 'ÂM TÍNH'

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        <button onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-700 text-sm mb-6 flex items-center gap-1">
          ← Quay lại Dashboard
        </button>

        {/* Child Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start flex-wrap gap-4">
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
                {child.notes && <p className="text-gray-400 text-xs mt-1">📝 {child.notes}</p>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={openEdit}
                className="border border-gray-300 text-gray-600 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-sm font-medium">
                ✏️ Chỉnh sửa
              </button>
              <button onClick={() => setShowMChat(true)}
                className="border border-purple-300 text-purple-600 hover:bg-purple-50 px-4 py-2.5 rounded-xl text-sm font-medium">
                📋 M-CHAT-R/F
              </button>
              <button onClick={startAssessment}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
                🎮 Đánh giá mới
              </button>
            </div>
          </div>

          {latestMChat && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-xl flex-wrap">
              <span className="text-sm text-gray-500">📋 M-CHAT-R/F gần nhất:</span>
              <span style={{ color: mchatRiskColor }} className="font-bold text-sm">{mchatRiskText}</span>
              <span className="text-xs text-gray-400">• Điểm R: {latestMChat.r_score}/20</span>
              <span className="text-xs text-gray-400">• {new Date(latestMChat.created_at).toLocaleDateString('vi-VN')}</span>
              <button onClick={() => setShowMChat(true)} className="ml-auto text-xs text-purple-500 hover:underline">Làm lại →</button>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-medium text-blue-700 mb-2">📊 Nhóm tuổi phù hợp</p>
            <AgeRangeBar ageMonths={child.age_months} />
          </div>
        </div>

        {/* Biểu đồ */}
        {chartData.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">📈 Tiến triển theo thời gian</h3>
            <p className="text-xs text-gray-400 mb-4">{chartData.length} lần đánh giá hoàn thành</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'THẤP', fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine y={50} stroke="#eab308" strokeDasharray="4 4" label={{ value: 'TB',   fill: '#eab308', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine y={30} stroke="#f97316" strokeDasharray="4 4" label={{ value: 'CAO',  fill: '#f97316', fontSize: 10, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    return <circle key={payload.id} cx={cx} cy={cy} r={5} fill={RISK_COLOR[payload.risk] || '#6366f1'} stroke="#fff" strokeWidth={2} />
                  }}
                  activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
            {(() => {
              const diff = chartData[chartData.length-1].score - chartData[0].score
              return (
                <div className={`mt-3 text-center text-sm font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {diff > 0 ? `📈 Cải thiện +${diff} điểm` : diff < 0 ? `📉 Giảm ${Math.abs(diff)} điểm` : '➡️ Không đổi'}
                </div>
              )
            })()}
          </div>
        )}

        {chartData.length === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex items-center gap-4">
            <div className="text-3xl">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-700">Lần đánh giá gần nhất</p>
              <p className="text-xs text-gray-400">Điểm: <strong>{chartData[0].score}/100</strong> • <strong style={{ color: RISK_COLOR[chartData[0].risk] }}>{chartData[0].risk}</strong></p>
              <p className="text-xs text-gray-400 mt-0.5">Cần ít nhất 2 lần để xem biểu đồ</p>
            </div>
          </div>
        )}

        {/* Tabs: Lịch sử đánh giá + Chuyển giao */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'assessments' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
              📋 Lịch sử đánh giá ({assessments.length})
            </button>
            {(user?.role === 'admin' || user?.role === 'specialist') && (
              <button
                onClick={() => setActiveTab('transfers')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'transfers' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                🔄 Lịch sử chuyển giao ({transfers.length})
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Tab: Đánh giá */}
            {activeTab === 'assessments' && (
              assessments.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">📝</div>
                  <p>Chưa có phiên đánh giá nào</p>
                  <p className="text-sm mt-1">Nhấn "Đánh giá mới" để bắt đầu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...assessments].sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).map(a => (
                    <div key={a.id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 transition-colors cursor-pointer"
                      onClick={() => a.status === 'completed' && navigate(`/report/${a.id}`)}>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">Phiên #{a.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            🕐 {new Date(a.started_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {a.risk_level && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadge(a.risk_level)}`}>{a.risk_level}</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {a.status === 'completed' ? '✅ Hoàn thành' : '⏳ Đang thực hiện'}
                          </span>
                          {a.status === 'completed' && <span className="text-indigo-500 text-xs">Xem báo cáo →</span>}
                        </div>
                      </div>
                      {a.overall_risk_score && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Điểm tổng hợp</span><span>{a.overall_risk_score}/100</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${a.overall_risk_score}%`, background: RISK_COLOR[a.risk_level] || '#6366f1' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Tab: Chuyển giao */}
            {activeTab === 'transfers' && (
              transfers.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">🔄</div>
                  <p>Chưa có lịch sử chuyển giao</p>
                  <p className="text-sm mt-1 text-gray-300">Mỗi lần Admin đổi chuyên gia/giáo viên sẽ được ghi lại ở đây</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((t, i) => (
                    <div key={t.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            t.transfer_type === 'specialist' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {t.transfer_type === 'specialist' ? '🩺' : '👩‍🏫'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {t.transfer_type === 'specialist' ? 'Đổi chuyên gia' : 'Đổi giáo viên'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <span>{t.from_name || 'Chưa có'}</span>
                              <span>→</span>
                              <span className="text-indigo-600 font-medium">{t.to_name || 'Bỏ phân công'}</span>
                            </div>
                            {t.reason && <p className="text-xs text-gray-400 mt-1">💬 {t.reason}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {new Date(t.transferred_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          {t.by_name && <p className="text-xs text-gray-300 mt-0.5">bởi {t.by_name}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-300 text-center pt-2">
                    Dữ liệu không bao giờ bị xóa — mọi thay đổi đều được ghi lại
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-5">✏️ Chỉnh sửa thông tin trẻ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Họ tên *</label>
                <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ngày sinh *</label>
                <input type="date" value={editForm.birth_date} max={today}
                  onChange={e => setEditForm(p => ({ ...p, birth_date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Giới tính</label>
                <select value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                  <option value="">-- Chọn --</option>
                  <option value="male">👦 Nam</option>
                  <option value="female">👧 Nữ</option>
                </select>
              </div>
              {/* Khu vực — dùng dropdown chuẩn hóa */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Khu vực</label>
                <select value={editForm.region} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                  <option value="">-- Chọn tỉnh/thành phố --</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ngôn ngữ chính</label>
                <select value={editForm.primary_language} onChange={e => setEditForm(p => ({ ...p, primary_language: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇬🇧 Tiếng Anh</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none"
                  placeholder="Thông tin thêm..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Hủy</button>
              <button onClick={saveEdit} disabled={saving || !editForm.full_name?.trim() || !editForm.birth_date}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-40">
                {saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMChat && (
        <MChatScreen childName={child.full_name} childId={child.id}
          onComplete={() => { setShowMChat(false); loadData() }}
          onClose={() => setShowMChat(false)} />
      )}
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
          <div className={`h-2 rounded-full mb-1 ${ageMonths >= r.min && ageMonths < r.max ? r.color : 'bg-gray-200'}`} />
          <span className={`text-xs ${ageMonths >= r.min && ageMonths < r.max ? 'text-blue-700 font-bold' : 'text-gray-400'}`}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}