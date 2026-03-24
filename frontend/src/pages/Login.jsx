import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { login, loading, error } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧩</div>
          <h1 className="text-2xl font-bold text-indigo-700">ASD-SCREEN AI</h1>
          <p className="text-gray-500 text-sm mt-1">Hệ thống sàng lọc phát triển trẻ em</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <Link to="/forgot-password"
                className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                required
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? '⏳ Đang đăng nhập...' : '🔐 Đăng nhập'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">
            Đăng ký ngay
          </Link>
        </p>

        {/* <p className="text-center text-xs text-gray-400 mt-3">
          Admin mặc định: <strong>admin</strong> / <strong>Admin@123456</strong>
        </p> */}
      </div>
    </div>
  )
}
