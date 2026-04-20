import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
})

// ── Request: gắn access token vào mỗi request ────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response: tự động refresh khi 401 ────────────────────────────────────────
let isRefreshing  = false
let failedQueue   = []  // Hàng đợi các request bị lỗi 401
let redirectingToLogin = false

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

const isAuthEndpoint = (url = '') => url.includes('/auth/')

const emitAuthLogout = (reason = 'token_expired') => {
  if (redirectingToLogin) return
  redirectingToLogin = true
  clearAuth()
  sessionStorage.setItem('auth_logout_reason', reason)
  window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason } }))
}

api.interceptors.response.use(
  res => {
    redirectingToLogin = false
    return res
  },
  async err => {
    const originalRequest = err.config

    // Chỉ refresh cho endpoint protected (không áp dụng cho /auth/*)
    if (err.response?.status === 401 && !originalRequest._retry
        && !isAuthEndpoint(originalRequest.url)) {

      // Nếu đang refresh rồi → cho vào hàng đợi
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(e => Promise.reject(e))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        // Không có refresh token → logout
        isRefreshing = false
        emitAuthLogout('missing_refresh_token')
        return Promise.reject(err)
      }

      try {
        const res = await axios.post('/api/auth/refresh', { refresh_token: refreshToken })
        const newToken = res.data.access_token

        // Lưu token mới
        localStorage.setItem('token', newToken)

        // Cập nhật header default
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

        // Xử lý hàng đợi
        processQueue(null, newToken)

        // Retry request gốc
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)

      } catch (refreshErr) {
        // Refresh thất bại → logout
        processQueue(refreshErr, null)
        emitAuthLogout('refresh_failed')
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export default api