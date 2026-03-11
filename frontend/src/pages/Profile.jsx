import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api/axios'

export default function Profile() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async () => {
    setMsg(null)
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      return setMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường' })
    }
    if (form.new_password.length < 8) {
      return setMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
    }
    if (form.new_password !== form.confirm_password) {
      return setMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })
    }
    if (form.new_password === form.current_password) {
      return setMsg({ type: 'error', text: 'Mật khẩu mới phải khác mật khẩu hiện tại' })
    }

    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.' })
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      setTimeout(() => { logout(); navigate('/login') }, 2000)
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Đổi mật khẩu thất bại' })
    } finally {
      setSaving(false)
    }
  }

  const ROLE_LABEL = {
    admin: '👑 Quản trị viên',
    teacher: '👩‍🏫 Giáo viên',
    specialist: '🩺 Chuyên gia',
    parent: '👨‍👩‍👦 Phụ huynh',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto">

        <button onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-sm mb-6 flex items-center gap-1">
          ← Quay lại
        </button>

        {/* Thông tin tài khoản */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user?.full_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{ROLE_LABEL[user?.role] || user?.role}</p>
              <p className="text-xs text-gray-400 mt-0.5">@{user?.username}</p>
            </div>
          </div>
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-5">🔐 Đổi mật khẩu</h3>

          {msg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
              msg.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu hiện tại *</label>
              <input
                type="password" name="current_password"
                value={form.current_password} onChange={handleChange}
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu mới *</label>
              <input
                type="password" name="new_password"
                value={form.new_password} onChange={handleChange}
                placeholder="Ít nhất 8 ký tự"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới *</label>
              <input
                type="password" name="confirm_password"
                value={form.confirm_password} onChange={handleChange}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
              />
              {/* Indicator khớp mật khẩu */}
              {form.confirm_password && (
                <p className={`text-xs mt-1 ${form.new_password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                  {form.new_password === form.confirm_password ? '✔ Mật khẩu khớp' : '✗ Mật khẩu chưa khớp'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white py-3 rounded-xl text-sm font-medium transition-colors">
            {saving ? '⏳ Đang lưu...' : '💾 Đổi mật khẩu'}
          </button>
        </div>

      </div>
    </div>
  )
}   