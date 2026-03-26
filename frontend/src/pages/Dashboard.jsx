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
  const [menuOpen, setMenuOpen] = useState(false)

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

  const filtered = useMemo(() => {
    return children.filter(c => {
      if (search && !c.full_name.toLowerCase().includes(search.toLowerCase())) return false
      if (genderFilter !== 'all' && c.gender !== genderFilter) return false
      if (ageFilter !== 'all') {
        const [min, max] = ageFilter.split('-').map(Number)
        if (c.age_months < min || c.age_months >= max) return false
      }
      return true
    })
  }, [children, search, ageFilter, genderFilter])

  const hasFilter = search || ageFilter !== 'all' || genderFilter !== 'all'

  const stats = [
    { label: 'Tổng số trẻ',  value: children.length,                               icon: '👶', color: 'bg-blue-50 text-blue-700' },
    { label: 'Cần theo dõi', value: children.filter(c => c.age_months < 60).length, icon: '👁️', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Đã đánh giá',  value: 0,                                               icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'Báo cáo chờ',  value: 0,                                               icon: '📋', color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white shadow-sm px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🧩</span>
            <div>
              <h1 className="font-bold text-indigo-700 text-base leading-tight">ASD-SCREEN AI</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Hệ thống sàng lọc phát triển</p>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">
              {user?.full_name} · <span className="text-xs">{ROLE_LABEL[user?.role]}</span>
            </span>
            <NavBtn onClick={() => navigate('/messages')} icon="💬" label="Tin nhắn" />
            <NavBtn onClick={() => navigate('/appointments')} icon="📅" label="Lịch hẹn" />
            {user?.role === 'admin' && (
              <NavBtn onClick={() => navigate('/admin')} icon="⚙️" label="Admin" color="purple" />
            )}
            <NavBtn onClick={() => navigate('/profile')} icon="👤" label="Hồ sơ" />
            <button onClick={handleLogout}
              className="bg-red-50 hover:bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg transition-colors">
              Đăng xuất
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            onClick={() => setMenuOpen(o => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
            <div className="text-sm text-gray-500 px-2 pb-2">
              {user?.full_name} · {ROLE_LABEL[user?.role]}
            </div>
            <MobileNavBtn onClick={() => { navigate('/messages'); setMenuOpen(false) }} icon="💬" label="Tin nhắn" />
            <MobileNavBtn onClick={() => { navigate('/appointments'); setMenuOpen(false) }} icon="📅" label="Lịch hẹn" />
            {user?.role === 'admin' && (
              <MobileNavBtn onClick={() => { navigate('/admin'); setMenuOpen(false) }} icon="⚙️" label="Admin" />
            )}
            <MobileNavBtn onClick={() => { navigate('/profile'); setMenuOpen(false) }} icon="👤" label="Hồ sơ" />
            <button onClick={handleLogout}
              className="text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm">
              🚪 Đăng xuất
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Chào mừng */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">
            Xin chào, {user?.full_name}! 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">Hôm nay có {children.length} trẻ trong hệ thống</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className={`${s.color} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs mt-1 opacity-80">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Children List */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-800">📋 Danh sách trẻ</h3>
            <button onClick={() => navigate('/children/add')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
              + Thêm trẻ mới
            </button>
          </div>

          {/* Bộ lọc */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên trẻ..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
              {AGE_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 bg-white">
              <option value="all">Tất cả giới tính</option>
              <option value="male">👦 Nam</option>
              <option value="female">👧 Nữ</option>
            </select>
            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setAgeFilter('all'); setGenderFilter('all') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg bg-white transition-colors">
                ✕ Xóa lọc
              </button>
            )}
          </div>

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
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pl-4 md:pl-0 font-medium">Họ tên</th>
                    <th className="pb-3 font-medium">Tuổi</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Giới tính</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Khu vực</th>
                    <th className="pb-3 font-medium">Trạng thái</th>
                    <th className="pb-3 pr-4 md:pr-0 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(child => (
                    <tr key={child.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 pl-4 md:pl-0 font-medium text-gray-800">
                        {search
                          ? <HighlightText text={child.full_name} query={search} />
                          : child.full_name}
                      </td>
                      <td className="py-3 text-gray-600 whitespace-nowrap">
                        {child.age_months}th
                        <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
                          ({Math.floor(child.age_months / 12)}t {child.age_months % 12}th)
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 hidden sm:table-cell">
                        {child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '—'}
                      </td>
                      <td className="py-3 text-gray-600 hidden md:table-cell">{child.region || '—'}</td>
                      <td className="py-3">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">
                          Đang theo dõi
                        </span>
                      </td>
                      <td className="py-3 pr-4 md:pr-0">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                          <button onClick={() => navigate(`/children/${child.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                            Xem
                          </button>
                          <button
                            onClick={() => handleStartAssessment(child)}
                            disabled={startingAssessment === child.id}
                            className="text-green-600 hover:text-green-800 text-xs font-medium disabled:opacity-40 whitespace-nowrap">
                            {startingAssessment === child.id ? '⏳...' : '▶ Đánh giá'}
                          </button>
                        </div>
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

function NavBtn({ onClick, icon, label, color = 'indigo' }) {
  const cls = color === 'purple'
    ? 'bg-purple-50 hover:bg-purple-100 text-purple-600'
    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
  return (
    <button onClick={onClick} className={`${cls} text-sm px-3 py-2 rounded-lg transition-colors`}>
      {icon} {label}
    </button>
  )
}

function MobileNavBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className="text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">
      {icon} {label}
    </button>
  )
}

function HighlightText({ text, query }) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-gray-800 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}