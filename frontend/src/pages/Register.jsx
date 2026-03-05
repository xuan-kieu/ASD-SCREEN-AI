import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

const ROLES = [
  { value: 'parent',     label: '👨‍👩‍👦 Phụ huynh' },
  { value: 'teacher',    label: '👩‍🏫 Giáo viên' },
  { value: 'specialist', label: '🩺 Chuyên gia' },
]

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', password: '', confirm_password: '',
    full_name: '', email: '', phone: '', role: 'parent'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register', {
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        role: form.role
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const data = err.response?.data
      if (Array.isArray(data?.detail)) setError(data.detail.map(e => e.msg).join(', '))
      else setError(data?.detail || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🧩</div>
          <h1 className="text-xl font-bold text-indigo-700">Đăng ký tài khoản</h1>
          <p className="text-gray-400 text-sm">ASD-SCREEN AI</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
            ✅ Đăng ký thành công! Đang chuyển đến trang đăng nhập...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên đăng nhập *</label>
              <input name="username" value={form.username} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="username123" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Họ và tên *</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Nguyễn Văn A" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Xác nhận mật khẩu *</label>
              <input name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="email@example.com" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="0901234567" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vai trò *</label>
            <select name="role" value={form.role} onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl font-medium transition-colors">
            {loading ? '⏳ Đang đăng ký...' : '📝 Đăng ký'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}