import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Messages() {
  const navigate  = useNavigate()
  const { token } = useAuthStore()

  const [tab, setTab]                 = useState('inbox')
  const [inbox, setInbox]             = useState([])
  const [sent, setSent]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [users, setUsers]             = useState([])
  const [children, setChildren]       = useState([])
  const [form, setForm]               = useState({ to_user_id: '', child_id: '', content: '' })
  const [sending, setSending]         = useState(false)
  const [wsStatus, setWsStatus]       = useState('connecting')
  const [newMsgFlash, setNewMsgFlash] = useState(false)

  const wsRef          = useRef(null)
  const reconnectTimer = useRef(null)
  const reconnectCount = useRef(0)
  const mountedRef     = useRef(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [inboxRes, sentRes, childRes, userRes] = await Promise.all([
        api.get('/messages/inbox'),
        api.get('/messages/sent'),
        api.get('/children/'),
        api.get('/messages/users'),
      ])
      if (!mountedRef.current) return
      setInbox(inboxRes.data)
      setSent(sentRes.data)
      setChildren(childRes.data)
      setUsers(userRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const connectWS = useCallback(() => {
    if (!token || !mountedRef.current) return

    // Fix URL cho production: luôn dùng wss:// khi trang dùng https://
    const backendUrl = import.meta.env.VITE_API_URL || ''
    let wsBase = import.meta.env.VITE_WS_URL || ''

    if (!wsBase) {
      // Tự tính từ VITE_API_URL: https://xxx.onrender.com/api → wss://xxx.onrender.com
      if (backendUrl.startsWith('https://')) {
        wsBase = backendUrl.replace('https://', 'wss://').replace('/api', '')
      } else if (backendUrl.startsWith('http://')) {
        wsBase = backendUrl.replace('http://', 'ws://').replace('/api', '')
      } else {
        // Fallback: dùng location hiện tại
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        wsBase = `${proto}://${window.location.host}`
      }
    }

    const wsUrl = `${wsBase}/api/ws/messages?token=${token}`
    console.log('[WS] Connecting to:', wsUrl)

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return
        setWsStatus('connected')
        reconnectCount.current = 0
        console.log('[WS] Connected')
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
          }
          if (msg.type === 'new_message') {
            setInbox(prev => {
              // Tránh duplicate
              if (prev.find(m => m.id === msg.data.id)) return prev
              return [msg.data, ...prev]
            })
            setNewMsgFlash(true)
            setTimeout(() => setNewMsgFlash(false), 3000)
          }
          if (msg.type === 'message_read') {
            setSent(prev => prev.map(m =>
              m.id === msg.data.message_id ? { ...m, is_read: true } : m
            ))
          }
        } catch (e) {}
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return
        setWsStatus('disconnected')
        console.log('[WS] Closed, code:', event.code)

        // Không reconnect nếu đóng chủ động (code 1000) hoặc auth lỗi (4001)
        if (event.code === 1000 || event.code === 4001) return

        // Exponential backoff: 3s, 6s, 12s, tối đa 30s
        const delay = Math.min(3000 * Math.pow(2, reconnectCount.current), 30000)
        reconnectCount.current++
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectCount.current})`)

        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) {
            setWsStatus('connecting')
            connectWS()
          }
        }, delay)
      }

      ws.onerror = (err) => {
        console.error('[WS] Error:', err)
        setWsStatus('disconnected')
      }
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err)
      setWsStatus('disconnected')
    }
  }, [token])

  useEffect(() => {
    mountedRef.current = true
    loadData()
    connectWS()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.close(1000)
        wsRef.current = null
      }
    }
  }, [loadData, connectWS])

  const markRead = async (id) => {
    try {
      await api.patch(`/messages/${id}/read`)
      setInbox(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
    } catch {}
  }

  const sendMessage = async () => {
    if (!form.to_user_id || !form.content.trim()) return
    setSending(true)
    try {
      await api.post('/messages/', form)
      setShowCompose(false)
      setForm({ to_user_id: '', child_id: '', content: '' })
      const sentRes = await api.get('/messages/sent')
      setSent(sentRes.data)
    } catch {
      alert('Không thể gửi tin nhắn')
    } finally {
      setSending(false)
    }
  }

  // Manual reconnect
  const handleReconnect = () => {
    clearTimeout(reconnectTimer.current)
    if (wsRef.current) wsRef.current.close(1000)
    reconnectCount.current = 0
    setWsStatus('connecting')
    setTimeout(connectWS, 500)
  }

  const unreadCount = inbox.filter(m => !m.is_read).length
  const messages    = tab === 'inbox' ? inbox : sent

  const wsInfo = {
    connecting:   { color: '#f59e0b', text: '⏳ Đang kết nối', bg: '#fef3c7' },
    connected:    { color: '#22c55e', text: '🟢 Realtime',     bg: '#dcfce7' },
    disconnected: { color: '#ef4444', text: '🔴 Mất kết nối',  bg: '#fee2e2' },
  }[wsStatus]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Dashboard
          </button>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <h1 className="font-bold text-gray-800">
              💬 Tin nhắn
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-2">
                  {unreadCount}
                </span>
              )}
            </h1>
            {/* WS Status badge */}
            <button
              onClick={wsStatus === 'disconnected' ? handleReconnect : undefined}
              style={{ fontSize: 11, color: wsInfo.color, border: `1px solid ${wsInfo.color}`, borderRadius: 20, padding: '2px 8px', background: wsInfo.bg, cursor: wsStatus === 'disconnected' ? 'pointer' : 'default' }}
              title={wsStatus === 'disconnected' ? 'Click để kết nối lại' : ''}
            >
              {wsInfo.text}{wsStatus === 'disconnected' ? ' (Click để thử lại)' : ''}
            </button>
          </div>
          <button onClick={() => setShowCompose(true)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg">
            + Soạn tin
          </button>
        </div>
      </div>

      {/* Flash tin mới */}
      {newMsgFlash && (
        <div className="bg-green-500 text-white text-center py-2 text-sm font-semibold">
          📬 Bạn có tin nhắn mới!
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 flex">
          {[
            { key: 'inbox', label: '📥 Hộp thư đến', count: unreadCount },
            { key: 'sent',  label: '📤 Đã gửi',      count: sent.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  t.key === 'inbox' && unreadCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-gray-800 mb-4">📝 Soạn tin nhắn</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Người nhận *</label>
                  <select value={form.to_user_id}
                    onChange={e => setForm(p => ({ ...p, to_user_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                    <option value="">-- Chọn người nhận --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Liên quan đến trẻ (không bắt buộc)</label>
                  <select value={form.child_id}
                    onChange={e => setForm(p => ({ ...p, child_id: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm">
                    <option value="">-- Không chọn --</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung *</label>
                  <textarea value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    rows={4} placeholder="Nhập nội dung tin nhắn..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowCompose(false); setForm({ to_user_id: '', child_id: '', content: '' }) }}
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">Hủy</button>
                  <button onClick={sendMessage}
                    disabled={sending || !form.to_user_id || !form.content.trim()}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm disabled:opacity-40">
                    {sending ? '⏳ Đang gửi...' : '📤 Gửi'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">⏳ Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">💬</div>
            <p>{tab === 'inbox' ? 'Chưa có tin nhắn nào' : 'Chưa gửi tin nhắn nào'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id}
                onClick={() => tab === 'inbox' && !msg.is_read && markRead(msg.id)}
                className={`bg-white rounded-xl p-4 shadow-sm border transition-all duration-300 ${
                  tab === 'inbox' && !msg.is_read
                    ? 'border-indigo-200 bg-indigo-50 cursor-pointer hover:shadow-md'
                    : 'border-gray-100'
                }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${tab === 'inbox' && !msg.is_read ? 'text-indigo-700' : 'text-gray-600'}`}>
                      {tab === 'inbox'
                        ? `${msg.is_read ? '📨' : '📬'} ${msg.from_name || 'Ẩn danh'}`
                        : `📤 Gửi đến: ${msg.to_name || 'Ẩn danh'}`}
                    </span>
                    {msg.child_name && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        👶 {msg.child_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(msg.created_at).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                {tab === 'inbox' && !msg.is_read && (
                  <span className="inline-block mt-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    Chưa đọc • Click để đánh dấu đã đọc
                  </span>
                )}
                {tab === 'sent' && msg.is_read && (
                  <span className="inline-block mt-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    ✓ Đã đọc
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}