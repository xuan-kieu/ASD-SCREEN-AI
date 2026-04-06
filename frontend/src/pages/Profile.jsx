import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api/axios'
import { CITIES } from '../constants/cities'

const ROLE_LABEL = {
  admin:      '👑 Quản trị viên',
  teacher:    '👩‍🏫 Giáo viên',
  specialist: '🩺 Chuyên gia',
  parent:     '👨‍👩‍👦 Phụ huynh',
}

export default function Profile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg]       = useState(null)

  const [city, setCity]               = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg]   = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(res => {
      setCity(res.data.city || '')
    }).catch(() => {})
  }, [])

  const handlePwSubmit = async () => {
    setPwMsg(null)
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password)
      return setPwMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường' })
    if (pwForm.new_password.length < 8)
      return setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
    if (pwForm.new_password !== pwForm.confirm_password)
      return setPwMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })
    if (pwForm.new_password === pwForm.current_password)
      return setPwMsg({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại' })
    setPwSaving(true)
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' })
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => { logout(); navigate('/login') }, 2000)
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Đổi mật khẩu thất bại' })
    } finally { setPwSaving(false) }
  }

  const handleProfileSave = async () => {
    setProfileMsg(null); setProfileSaving(true)
    try {
      await api.patch('/auth/update-profile', { city: city || null })
      setProfileMsg({ type: 'success', text: 'Cập nhật thành công!' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Cập nhật thất bại' })
    } finally { setProfileSaving(false) }
  }

  const cls = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-indigo-400"

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-sm mb-6 flex items-center gap-1">← Quay lại</button>

        {/* Thông tin tài khoản */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl">👤</div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user?.full_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{ROLE_LABEL[user?.role] || user?.role}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Thành phố */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">📍 Thành phố</h3>
          <p className="text-xs text-gray-400 mb-4">
            {user?.role === 'specialist'
              ? 'Phụ huynh sẽ tìm thấy bạn khi tìm kiếm chuyên gia cùng thành phố'
              : 'Dùng để gợi ý chuyên gia cùng khu vực với bạn'}
          </p>

          {profileMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {profileMsg.type === 'success' ? '✅' : '❌'} {profileMsg.text}
            </div>
          )}

          <select value={city} onChange={e => setCity(e.target.value)} className={cls}>
            <option value="">-- Chọn thành phố --</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button onClick={handleProfileSave} disabled={profileSaving}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium">
            {profileSaving ? '⏳ Đang lưu...' : '💾 Lưu thành phố'}
          </button>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5">🔐 Đổi mật khẩu</h3>

          {pwMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${pwMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMsg.type === 'success' ? '✅' : '❌'} {pwMsg.text}
            </div>
          )}

          <div className="space-y-4">
            {[
              { key: 'current_password', label: 'Mật khẩu hiện tại *',      ph: 'Nhập mật khẩu hiện tại' },
              { key: 'new_password',     label: 'Mật khẩu mới *',            ph: 'Ít nhất 8 ký tự' },
              { key: 'confirm_password', label: 'Xác nhận mật khẩu mới *',  ph: 'Nhập lại mật khẩu mới' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="password" value={pwForm[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.ph} className={cls} />
                {f.key === 'confirm_password' && pwForm.confirm_password && (
                  <p className={`text-xs mt-1 ${pwForm.new_password === pwForm.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                    {pwForm.new_password === pwForm.confirm_password ? '✔ Mật khẩu khớp' : '✗ Chưa khớp'}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button onClick={handlePwSubmit} disabled={pwSaving}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium">
            {pwSaving ? '⏳ Đang lưu...' : '💾 Đổi mật khẩu'}
          </button>
        </div>
      </div>
    </div>
  )
}