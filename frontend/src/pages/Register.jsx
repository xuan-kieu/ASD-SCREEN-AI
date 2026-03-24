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
  const [showPassword, setShowPassword]         = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // Kiểm tra độ mạnh mật khẩu
  const getPasswordStrength = (pwd) => {
    if (!pwd) return null
    let score = 0
    if (pwd.length >= 8)  score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { label: 'Yếu', color: '#ef4444', width: '25%' }
    if (score === 2) return { label: 'Trung bình', color: '#f59e0b', width: '50%' }
    if (score === 3) return { label: 'Khá', color: '#3b82f6', width: '75%' }
    return { label: 'Mạnh', color: '#22c55e', width: '100%' }
  }

  const strength = getPasswordStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (form.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register', {
        username:  form.username,
        password:  form.password,
        full_name: form.full_name,
        email:     form.email  || null,
        phone:     form.phone  || null,
        role:      form.role
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

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu *</label>
            <div className="relative">
              <input name="password" type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleChange} required
                className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Ít nhất 8 ký tự" />
              <button type="button" onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {/* Thanh độ mạnh mật khẩu */}
            {strength && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: strength.width, background: strength.color, height: '100%', transition: 'all 0.3s' }} />
                </div>
                <p className="text-xs mt-0.5" style={{ color: strength.color }}>
                  Độ mạnh: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Xác nhận mật khẩu *</label>
            <div className="relative">
              <input name="confirm_password" type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirm_password} onChange={handleChange} required
                className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  form.confirm_password && form.password !== form.confirm_password
                    ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Nhập lại mật khẩu" />
              <button type="button" onClick={() => setShowConfirmPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {form.confirm_password && form.password !== form.confirm_password && (
              <p className="text-xs text-red-500 mt-0.5">❌ Mật khẩu không khớp</p>
            )}
            {form.confirm_password && form.password === form.confirm_password && (
              <p className="text-xs text-green-500 mt-0.5">✅ Mật khẩu khớp</p>
            )}
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

          <button type="submit" disabled={loading || (form.confirm_password && form.password !== form.confirm_password)}
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
