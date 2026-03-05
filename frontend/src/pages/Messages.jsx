import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Messages() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ to_user_id: '', child_id: '', content: '' })
  const [children, setChildren] = useState([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [msgRes, childRes] = await Promise.all([
        api.get('/messages/inbox'),
        api.get('/children/')
      ])
      setMessages(msgRes.data)
      setChildren(childRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (id) => {
    try {
      await api.patch(`/messages/${id}/read`)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m))
    } catch (err) {}
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/messages/', form)
      setShowCompose(false)
      setForm({ to_user_id: '', child_id: '', content: '' })
      loadData()
    } catch (err) {
      alert('Không thể gửi tin nhắn')
    } finally {
      setSending(false)
    }
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-700 text-sm">
            ← Dashboard
          </button>
          <h1 className="font-bold text-gray-800">
            💬 Tin nhắn {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full ml-1">{unreadCount}</span>
            )}
          </h1>
          <button
            onClick={() => setShowCompose(true)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg"
          >
            + Soạn tin
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h3 className="font-bold text-gray-800 mb-4">📝 Soạn tin nhắn</h3>
              <form onSubmit={sendMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chọn trẻ</label>
                  <select
                    value={form.child_id}
                    onChange={e => setForm(p => ({ ...p, child_id: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">-- Chọn trẻ --</option>
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ID người nhận</label>
                  <input
                    value={form.to_user_id}
                    onChange={e => setForm(p => ({ ...p, to_user_id: e.target.value }))}
                    required
                    placeholder="UUID của người nhận..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung</label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                    required rows={4}
                    placeholder="Nhập nội dung tin nhắn..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCompose(false)}
                    className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">
                    Hủy
                  </button>
                  <button type="submit" disabled={sending}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm">
                    {sending ? '⏳ Đang gửi...' : '📤 Gửi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Message List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">⏳ Đang tải...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">💬</div>
            <p>Chưa có tin nhắn nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => !msg.is_read && markRead(msg.id)}
                className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer border transition-colors ${
                  msg.is_read ? 'border-gray-100' : 'border-indigo-200 bg-indigo-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-medium ${msg.is_read ? 'text-gray-600' : 'text-indigo-700'}`}>
                    {msg.is_read ? '📨' : '📬'} Tin nhắn mới
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                {!msg.is_read && (
                  <span className="inline-block mt-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    Chưa đọc
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