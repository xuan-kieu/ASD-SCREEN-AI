import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useChildStore from '../store/childStore'
import api from '../api/axios'

const ROLE_LABEL = {
  admin: '👑 Quản trị viên',
  teacher: '👩‍🏫 Giáo viên',
  specialist: '🩺 Chuyên gia',
  parent: '👨‍👩‍👦 Phụ huynh'
}

const AGE_GROUPS = [
  { label: 'Tất cả', value: 'all' },
  { label: '12-18 tháng', value: '12-18' },
  { label: '18-24 tháng', value: '18-24' },
  { label: '24-36 tháng', value: '24-36' },
  { label: '36-60 tháng', value: '36-60' },
]

export default function Dashboard() {
  const { user, logout } = useAuthStore()
  const { children, loading, fetchChildren } = useChildStore()
  const navigate = useNavigate()
  const [startingAssessment, setStartingAssessment] = useState(null)

  // ── Bộ lọc ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [ageFilter, setAgeFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')

  useEffect(() => { fetchChildren() }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const handleStartAssessment = async (child) => {
    setStartingAssessment(child.id)
    try {
      const res = await api.post('/assessments/', { child_id: child.id })
      navigate(`/assessment/${res.data.id}`, {
        state: { childName: child.full_name, birthDate: child.birth_date }
      })
    } catch {
      alert('Không thể tạo phiên đánh giá. Vui lòng thử lại.')
    } finally {
      setStartingAssessment(null)
    }
  }

  // ── Lọc danh sách ───────────────────────────────────────
  const filtered = useMemo(() => {
    return children.filter(c => {
      // Tìm kiếm tên
      if (search && !c.full_name.toLowerCase().includes(search.toLowerCase())) return false
      // Lọc giới tính
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false
      // Lọc nhóm tuổi
      if (ageFilter !== 'all') {
        const [min, max] = ageFilter.split('-').map(Number)
        if (c.age_months < min || c.age_months >= max) return false
      }
      return true
    })
  }, [children, search, ageFilter, genderFilter])

  const hasFilter = search || ageFilter !== 'all' || genderFilter !== 'all'

  const stats = [
    { label: 'Tổng số trẻ',   value: children.length,                                 icon: '👶', color: 'bg-blue-50 text-blue-700' },
    { label: 'Cần theo dõi',  value: children.filter(c => c.age_months < 60).length,  icon: '👁️', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Đã đánh giá',   value: 0,                                                icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'Báo cáo chờ',   value: 0,                                                icon: '📋', color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧩</span>
          <div>
            <h1 className="font-bold text-indigo-700 text-lg">ASD-SCREEN AI</h1>
            <p className="text-xs text-gray-400">Hệ thống sàng lọc phát triển</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
            <p className="text-xs text-gray-400">{ROLE_LABEL[user?.role] || user?.role}</p>
          </div>
          <button onClick={() => navigate('/messages')}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm px-4 py-2 rounded-lg transition-colors">
            💬 Tin nhắn
          </button>
          <button onClick={() => navigate('/appointments')}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm px-4 py-2 rounded-lg transition-colors">
            📅 Lịch hẹn
          </button>
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')}
              className="bg-purple-50 hover:bg-purple-100 text-purple-600 text-sm px-4 py-2 rounded-lg">
              ⚙️ Admin
            </button>
          )}
          <button onClick={() => navigate('/profile')}
            className="bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-lg">
            👤 {user?.full_name}
          </button>
          <button onClick={handleLogout}
            className="bg-red-50 hover:bg-red-100 text-red-600 text-sm px-4 py-2 rounded-lg transition-colors">
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Chào mừng */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Xin chào, {user?.full_name}! 👋</h2>
          <p className="text-gray-500 mt-1">Hôm nay có {children.length} trẻ trong hệ thống</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className={`${s.color} rounded-xl p-4`}>
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-sm mt-1 opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Children List */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-800">📋 Danh sách trẻ</h3>
            <button onClick={() => navigate('/children/add')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              + Thêm trẻ mới
            </button>
          </div>

          {/* ── Thanh tìm kiếm + lọc ── */}
          <div className="flex flex-wrap gap-3 mb-5 p-4 bg-gray-50 rounded-xl">
            {/* Tìm kiếm tên */}
            <div className="flex-1 min-w-48 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên trẻ..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Lọc nhóm tuổi */}
            <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
              {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>

            {/* Lọc giới tính */}
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
              <option value="all">Tất cả giới tính</option>
              <option value="male">👦 Nam</option>
              <option value="female">👧 Nữ</option>
            </select>

            {/* Nút xóa lọc */}
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setAgeFilter('all'); setGenderFilter('all') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg bg-white transition-colors">
                ✕ Xóa lọc
              </button>
            )}
          </div>

          {/* Kết quả lọc */}
          {hasFilter && (
            <p className="text-xs text-gray-400 mb-3">
              Hiển thị {filtered.length}/{children.length} trẻ
              {search && <span> • tên chứa "<strong>{search}</strong>"</span>}
              {ageFilter !== 'all' && <span> • {ageFilter} tháng</span>}
              {genderFilter !== 'all' && <span> • {genderFilter === 'male' ? 'Nam' : 'Nữ'}</span>}
            </p>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">⏳</div>
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">{hasFilter ? '🔍' : '👶'}</div>
              <p className="font-medium">{hasFilter ? 'Không tìm thấy trẻ phù hợp' : 'Chưa có trẻ nào trong hệ thống'}</p>
              <p className="text-sm mt-1">{hasFilter ? 'Thử thay đổi bộ lọc' : 'Nhấn "Thêm trẻ mới" để bắt đầu'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Họ tên</th>
                    <th className="pb-3 font-medium">Tuổi</th>
                    <th className="pb-3 font-medium">Giới tính</th>
                    <th className="pb-3 font-medium">Khu vực</th>
                    <th className="pb-3 font-medium">Trạng thái</th>
                    <th className="pb-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(child => (
                    <tr key={child.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 font-medium text-gray-800">
                        {search ? (
                          // Highlight từ tìm kiếm
                          <HighlightText text={child.full_name} query={search} />
                        ) : child.full_name}
                      </td>
                      <td className="py-3 text-gray-600">
                        {child.age_months} tháng
                        <span className="text-xs text-gray-400 ml-1">
                          ({Math.floor(child.age_months / 12)}t {child.age_months % 12}th)
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">
                        {child.gender === 'male' ? '👦 Nam' : child.gender === 'female' ? '👧 Nữ' : '—'}
                      </td>
                      <td className="py-3 text-gray-600">{child.region || '—'}</td>
                      <td className="py-3">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          Đang theo dõi
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => navigate(`/children/${child.id}`)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-3">
                          Xem chi tiết
                        </button>
                        <button
                          onClick={() => handleStartAssessment(child)}
                          disabled={startingAssessment === child.id}
                          className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-40">
                          {startingAssessment === child.id ? '⏳ Đang tạo...' : '▶ Đánh giá'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Highlight từ khóa tìm kiếm trong tên
function HighlightText({ text, query }) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}
