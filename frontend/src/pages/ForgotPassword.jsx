import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

// Bước 1: Nhập email → nhận OTP
// Bước 2: Nhập OTP
// Bước 3: Đặt mật khẩu mới

export default function ForgotPassword() {
  const [step, setStep]         = useState(1)
  const [email, setEmail]       = useState('')
  const [otp, setOtp]           = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)

  // Bước 1 — Gửi OTP về email
  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Không tìm thấy email trong hệ thống')
    } finally {
      setLoading(false)
    }
  }

  // Bước 2 — Xác nhận OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/verify-otp', { email, otp })
      setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Mã OTP không đúng hoặc đã hết hạn')
    } finally {
      setLoading(false)
    }
  }

  // Bước 3 — Đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Đặt lại mật khẩu thất bại')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
  const btnClass   = "w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors"

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="text-2xl font-bold text-indigo-700">Quên mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">ASD-SCREEN AI</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s < step ? 'bg-green-500 text-white'
                : s === step ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* Success */}
        {success ? (
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-xl mb-6 text-sm">
              ✅ Đặt lại mật khẩu thành công!
            </div>
            <Link to="/login"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-colors text-center">
              🔐 Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Bước 1: Nhập email */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email đã đăng ký
                  </label>
                  <input type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required className={inputClass} />
                  <p className="text-xs text-gray-400 mt-1">
                    Chúng tôi sẽ gửi mã xác nhận đến email này
                  </p>
                </div>
                <button type="submit" disabled={loading} className={btnClass}>
                  {loading ? '⏳ Đang gửi...' : '📧 Gửi mã xác nhận'}
                </button>
              </form>
            )}

            {/* Bước 2: Nhập OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
                  📧 Mã xác nhận đã gửi đến <strong>{email}</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã xác nhận (OTP)
                  </label>
                  <input type="text" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className={`${inputClass} text-center text-2xl tracking-widest font-bold`} />
                  <p className="text-xs text-gray-400 mt-1">Mã có hiệu lực trong 10 phút</p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className={btnClass}>
                  {loading ? '⏳ Đang xác nhận...' : '✅ Xác nhận'}
                </button>
                <button type="button" onClick={() => { setStep(1); setOtp(''); setError(null) }}
                  className="w-full text-gray-500 hover:text-gray-700 text-sm py-2">
                  ← Đổi email khác
                </button>
              </form>
            )}

            {/* Bước 3: Đặt mật khẩu mới */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Ít nhất 8 ký tự"
                      required className={`${inputClass} pr-12`} />
                    <button type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Xác nhận mật khẩu mới
                  </label>
                  <input type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                    className={`${inputClass} ${
                      confirmPassword && newPassword !== confirmPassword ? 'border-red-300' : ''
                    }`} />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-0.5">❌ Mật khẩu không khớp</p>
                  )}
                </div>
                <button type="submit"
                  disabled={loading || (confirmPassword && newPassword !== confirmPassword)}
                  className={btnClass}>
                  {loading ? '⏳ Đang đặt lại...' : '🔐 Đặt lại mật khẩu'}
                </button>
              </form>
            )}
          </>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-indigo-600 hover:underline">← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
