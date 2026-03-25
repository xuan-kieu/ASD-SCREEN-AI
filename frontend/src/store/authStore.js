import { create } from 'zustand'
import api from '../api/axios'

const parseError = (data) => {
  if (!data) return 'Lỗi không xác định'
  if (Array.isArray(data.detail)) return data.detail.map(e => e.msg).join(', ')
  if (typeof data.detail === 'string') return data.detail
  return 'Đăng nhập thất bại'
}

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/auth/login', { email, password })
      const { access_token, refresh_token, role, full_name } = res.data
      const user = { email, role, full_name }
      localStorage.setItem('token', access_token)
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token: access_token, user, loading: false })
      return true
    } catch (err) {
      const msg = parseError(err.response?.data)
      set({ error: msg, loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  }
}))

export default useAuthStore