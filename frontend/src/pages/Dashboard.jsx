import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useChildStore from '../store/childStore'
import api from '../api/axios'
import { CITIES } from '../constants/cities'

const ROLE_LABEL = {
  admin:      '👑 Quản trị viên',
  teacher:    '👩‍🏫 Giáo viên',
  specialist: '🩺 Chuyên gia',
  parent:     '👨‍👩‍👦 Phụ huynh'
}

const AGE_GROUPS = [
  { label: 'Tất cả',      value: 'all' },
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

  // Bộ lọc
  const [search, setSearch]             = useState('')
  const [ageFilter, setAgeFilter]       = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')

  // Teacher: quản lý lớp
  const [classrooms, setClassrooms]           = useState([])
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [className, setClassName]             = useState('')
  const [creatingClass, setCreatingClass]     = useState(false)
  const [newClassCode, setNewClassCode]       = useState(null)

  // Parent: nhập mã lớp
  const [showJoinClass, setShowJoinClass] = useState(false)
  const [joinCode, setJoinCode]           = useState('')
  const [joinChildId, setJoinChildId]     = useState('')
  const [joiningClass, setJoiningClass]   = useState(false)
  const [joinMsg, setJoinMsg]             = useState(null)

  // Parent: tìm chuyên gia
  const [showFindSpecialist, setShowFindSpecialist] = useState(false)
  const [specialistCity, setSpecialistCity]         = useState('')
  const [specialists, setSpecialists]               = useState([])
  const [loadingSpecialists, setLoadingSpecialists] = useState(false)

  useEffect(() => {
    fetchChildren()
    if (user?.role === 'teacher') loadClassrooms()
    // Tự điền thành phố từ profile user nếu có
    if (user?.city) setSpecialistCity(user.city)
  }, [])

  const loadClassrooms = async () => {
    try { const res = await api.get('/admin/classrooms/my'); setClassrooms(res.data) } catch {}
  }

  const searchSpecialists = async () => {
    setLoadingSpecialists(true)
    try {
      const res = await api.get('/admin/specialists', {
        params: specialistCity ? { city: specialistCity } : {}
      })
      setSpecialists(res.data)
    } catch { setSpecialists([]) }
    finally { setLoadingSpecialists(false) }
  }

  useEffect(() => {
    if (showFindSpecialist) searchSpecialists()
  }, [showFindSpecialist, specialistCity])

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
    } finally { setStartingAssessment(null) }
  }

  const handleCreateClass = async () => {
    if (!className.trim()) return
    setCreatingClass(true)
    try {
      const res = await api.post('/admin/classrooms', { name: className })
      setNewClassCode(res.data.class_code); setClassName(''); setShowCreateClass(false)
      loadClassrooms()
    } catch (err) { alert(err.response?.data?.detail || 'Lỗi tạo lớp') }
    finally { setCreatingClass(false) }
  }

  const handleJoinClass = async () => {
    if (!joinCode || !joinChildId) return
    setJoiningClass(true); setJoinMsg(null)
    try {
      const res = await api.post('/admin/classrooms/join', {
        class_code: joinCode.toUpperCase(), child_id: joinChildId
      })
      setJoinMsg({ type: 'success', text: res.data.message }); setJoinCode('')
      setTimeout(() => { setShowJoinClass(false); setJoinMsg(null) }, 2000)
    } catch (err) {
      setJoinMsg({ type: 'error', text: err.response?.data?.detail || 'Mã lớp không hợp lệ' })
    } finally { setJoiningClass(false) }
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
    { label: 'Tổng số trẻ',  value: children.length,                                icon: '👶', color: 'bg-blue-50 text-blue-700' },
    { label: 'Cần theo dõi', value: children.filter(c => c.age_months < 60).length,  icon: '👁️', color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Đã đánh giá',  value: 0,                                                icon: '✅', color: 'bg-green-50 text-green-700' },
    { label: 'Báo cáo chờ',  value: 0,                                                icon: '📋', color: 'bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🧩</span>
            <div>
              <h1 className="font-bold text-indigo-700 text-base leading-tight">ASD-SCREEN AI</h1>
              <p className="text-xs text-gray-400 hidden sm:block">Hệ thống sàng lọc phát triển</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">{user?.full_name} · <span className="text-xs">{ROLE_LABEL[user?.role]}</span></span>
            <NavBtn onClick={() => navigate('/messages')} icon="💬" label="Tin nhắn" />
            <NavBtn onClick={() => navigate('/appointments')} icon="📅" label="Lịch hẹn" />
            {user?.role === 'admin' && <NavBtn onClick={() => navigate('/admin')} icon="⚙️" label="Admin" color="purple" />}
            <NavBtn onClick={() => navigate('/profile')} icon="👤" label="Hồ sơ" />
            <button onClick={handleLogout} className="bg-red-50 hover:bg-red-100 text-red-600 text-sm px-3 py-2 rounded-lg">Đăng xuất</button>
          </div>
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1">
            <div className="text-sm text-gray-500 px-2 pb-2">{user?.full_name} · {ROLE_LABEL[user?.role]}</div>
            <MobileNavBtn onClick={() => { navigate('/messages'); setMenuOpen(false) }} icon="💬" label="Tin nhắn" />
            <MobileNavBtn onClick={() => { navigate('/appointments'); setMenuOpen(false) }} icon="📅" label="Lịch hẹn" />
            {user?.role === 'admin' && <MobileNavBtn onClick={() => { navigate('/admin'); setMenuOpen(false) }} icon="⚙️" label="Admin" />}
            <MobileNavBtn onClick={() => { navigate('/profile'); setMenuOpen(false) }} icon="👤" label="Hồ sơ" />
            <button onClick={handleLogout} className="text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm">🚪 Đăng xuất</button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">

        {/* Chào mừng */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Xin chào, {user?.full_name}! 👋</h2>
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

        {/* ── TEACHER: Quản lý lớp ── */}
        {user?.role === 'teacher' && (
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base md:text-lg font-bold text-gray-800">🏫 Lớp của tôi</h3>
              <button onClick={() => setShowCreateClass(true)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm px-3 py-2 rounded-lg">
                + Tạo lớp mới
              </button>
            </div>
            {newClassCode && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm font-medium text-green-700 mb-2">✅ Tạo lớp thành công! Chia sẻ mã này cho phụ huynh:</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-3xl font-bold tracking-widest text-green-700 bg-white px-4 py-2 rounded-lg border border-green-300 font-mono">{newClassCode}</span>
                  <button onClick={() => { navigator.clipboard.writeText(newClassCode); alert('Đã copy!') }}
                    className="text-xs text-green-600 border border-green-300 px-3 py-2 rounded-lg hover:bg-green-100">📋 Copy</button>
                  <button onClick={() => setNewClassCode(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
              </div>
            )}
            {classrooms.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🏫</div>
                <p className="text-sm">Chưa có lớp nào. Tạo lớp để nhận học sinh!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {classrooms.map(cls => (
                  <div key={cls.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800 text-sm">{cls.name}</h4>
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-mono font-bold">{cls.class_code}</span>
                    </div>
                    <p className="text-xs text-gray-500">👶 {cls.student_count} học sinh</p>
                    <button onClick={() => { navigator.clipboard.writeText(cls.class_code); alert(`Đã copy: ${cls.class_code}`) }}
                      className="text-xs text-indigo-600 hover:underline mt-2">📋 Copy mã lớp</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PARENT: Tìm chuyên gia + Nhập mã lớp ── */}
        {user?.role === 'parent' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Tìm chuyên gia */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex justify-between items-center gap-4">
              <div>
                <p className="text-sm font-medium text-indigo-700">🩺 Tìm chuyên gia</p>
                <p className="text-xs text-indigo-500 mt-0.5">Gợi ý chuyên gia cùng thành phố</p>
              </div>
              <button onClick={() => setShowFindSpecialist(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0">
                Tìm ngay
              </button>
            </div>
            {/* Nhập mã lớp */}
            {children.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-green-700">🏫 Thêm con vào lớp</p>
                  <p className="text-xs text-green-500 mt-0.5">Nhập mã lớp từ giáo viên</p>
                </div>
                <button onClick={() => setShowJoinClass(true)}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0">
                  Nhập mã
                </button>
              </div>
            )}
          </div>
        )}

        {/* Children List */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-800">📋 Danh sách trẻ</h3>
            <button onClick={() => navigate('/children/add')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm px-3 md:px-4 py-2 rounded-lg whitespace-nowrap">
              + Thêm trẻ mới
            </button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên trẻ..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400" />
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
              <button onClick={() => { setSearch(''); setAgeFilter('all'); setGenderFilter('all') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg bg-white">
                ✕ Xóa lọc
              </button>
            )}
          </div>

          {hasFilter && (
            <p className="text-xs text-gray-400 mb-3">
              Hiển thị {filtered.length}/{children.length} trẻ
              {search && <span> • "<strong>{search}</strong>"</span>}
            </p>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">⏳</div><p>Đang tải...</p></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-3">{hasFilter ? '🔍' : '👶'}</div>
              <p className="font-medium">{hasFilter ? 'Không tìm thấy' : 'Chưa có trẻ nào'}</p>
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
                        {search ? <HighlightText text={child.full_name} query={search} /> : child.full_name}
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
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full whitespace-nowrap">Đang theo dõi</span>
                      </td>
                      <td className="py-3 pr-4 md:pr-0">
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                          <button onClick={() => navigate(`/children/${child.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Xem</button>
                          <button onClick={() => handleStartAssessment(child)} disabled={startingAssessment === child.id}
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

      {/* Modal tạo lớp */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-4">🏫 Tạo lớp mới</h3>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên lớp *</label>
            <input value={className} onChange={e => setClassName(e.target.value)}
              placeholder="VD: Lớp Mầm 2024" onKeyDown={e => e.key === 'Enter' && handleCreateClass()}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            <p className="text-xs text-gray-400 mt-1 mb-5">Hệ thống tự tạo mã lớp 6 ký tự</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateClass(false); setClassName('') }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Hủy</button>
              <button onClick={handleCreateClass} disabled={creatingClass || !className.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-2.5 rounded-xl text-sm font-medium">
                {creatingClass ? '⏳...' : '✅ Tạo lớp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nhập mã lớp */}
      {showJoinClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-gray-800 text-lg mb-4">🏫 Nhập mã lớp</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chọn con *</label>
                <select value={joinChildId} onChange={e => setJoinChildId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                  <option value="">-- Chọn trẻ --</option>
                  {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mã lớp *</label>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="VD: AB1C2D" maxLength={6}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-center text-xl font-bold tracking-widest" />
              </div>
              {joinMsg && (
                <div className={`px-3 py-2 rounded-xl text-sm ${joinMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {joinMsg.type === 'success' ? '✅' : '⚠️'} {joinMsg.text}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowJoinClass(false); setJoinCode(''); setJoinChildId(''); setJoinMsg(null) }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Hủy</button>
              <button onClick={handleJoinClass} disabled={joiningClass || !joinCode || joinCode.length < 6 || !joinChildId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-xl text-sm font-medium">
                {joiningClass ? '⏳...' : '🏫 Vào lớp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tìm chuyên gia (Parent) */}
      {showFindSpecialist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 text-lg">🩺 Tìm chuyên gia</h3>
                <button onClick={() => setShowFindSpecialist(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Lọc theo thành phố</label>
                <select value={specialistCity} onChange={e => setSpecialistCity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">-- Tất cả thành phố --</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {loadingSpecialists ? (
                <div className="text-center py-8 text-gray-400">⏳ Đang tìm kiếm...</div>
              ) : specialists.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🔍</div>
                  <p className="text-sm">Không tìm thấy chuyên gia{specialistCity ? ` tại ${specialistCity}` : ''}</p>
                  <p className="text-xs mt-1">Thử chọn thành phố khác hoặc xem tất cả</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-3">Tìm thấy {specialists.length} chuyên gia</p>
                  {specialists.map(s => (
                    <div key={s.id} className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">🩺 {s.full_name}</p>
                          {s.city && <p className="text-xs text-indigo-600 mt-0.5">📍 {s.city}</p>}
                          {s.email && <p className="text-xs text-gray-400 mt-0.5">✉️ {s.email}</p>}
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                          {s.child_count} trẻ
                        </span>
                      </div>
                      <button
                        onClick={() => { setShowFindSpecialist(false); navigate('/appointments') }}
                        className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs py-2 rounded-lg font-medium transition-colors">
                        📅 Đặt lịch hẹn với chuyên gia này
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, icon, label, color = 'indigo' }) {
  const cls = color === 'purple' ? 'bg-purple-50 hover:bg-purple-100 text-purple-600' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
  return <button onClick={onClick} className={`${cls} text-sm px-3 py-2 rounded-lg transition-colors`}>{icon} {label}</button>
}

function MobileNavBtn({ onClick, icon, label }) {
  return <button onClick={onClick} className="text-left px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm">{icon} {label}</button>
}

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