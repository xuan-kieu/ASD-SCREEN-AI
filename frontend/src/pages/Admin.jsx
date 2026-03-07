import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

export default function Admin() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({
    username: '', password: '', full_name: '', email: '', role: 'specialist'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return }
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [usersRes, childrenRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/children/'),
      ])
      setUsers(usersRes.data)

      // Tính stats từ data
      const children = childrenRes.data
      setStats({
        totalUsers:    usersRes.data.length,
        totalChildren: children.length,
        byRole: usersRes.data.reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1
          return acc
        }, {}),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/auth/register', newUser)
      setShowAddUser(false)
      setNewUser({ username: '', password: '', full_name: '', email: '', role: 'specialist' })
      loadData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi tạo người dùng')
    } finally {
      setSaving(false)
    }
  }

  const ROLE_CONFIG = {
    admin:      { label: 'Quản trị viên', color: '#7c3aed', bg: '#4c1d95' },
    specialist: { label: 'Chuyên gia',    color: '#0ea5e9', bg: '#0c4a6e' },
    teacher:    { label: 'Giáo viên',     color: '#22c55e', bg: '#14532d' },
    parent:     { label: 'Phụ huynh',     color: '#f59e0b', bg: '#78350f' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 24 }}>🧩</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ASD-SCREEN AI</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Admin Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>👑 {user?.full_name}</span>
          <button onClick={() => navigate('/dashboard')} style={{
            padding: '6px 16px', background: '#334155', border: 'none',
            borderRadius: 6, color: '#e2e8f0', cursor: 'pointer', fontSize: 13
          }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '0 32px', display: 'flex', gap: 4
      }}>
        {[
          { id: 'overview', label: '📊 Tổng quan' },
          { id: 'users',    label: '👥 Người dùng' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            color: tab === t.id ? '#60a5fa' : '#64748b',
            cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 32 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>⏳ Đang tải...</div>
        ) : (

          // ---- TAB: OVERVIEW ----
          tab === 'overview' ? (
            <div>
              {/* Stats cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Tổng người dùng', value: stats?.totalUsers,    icon: '👥', color: '#3b82f6' },
                  { label: 'Tổng trẻ em',     value: stats?.totalChildren, icon: '👶', color: '#22c55e' },
                  { label: 'Chuyên gia',       value: stats?.byRole?.specialist || 0, icon: '🩺', color: '#8b5cf6' },
                  { label: 'Giáo viên',        value: stats?.byRole?.teacher || 0,    icon: '👩‍🏫', color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: '#1e293b', borderRadius: 16, padding: '20px 24px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Role breakdown */}
              <div style={{ background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #334155' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 Phân bổ vai trò</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                    <div key={role} style={{
                      padding: '12px 20px', borderRadius: 10,
                      background: cfg.bg, border: `1px solid ${cfg.color}`,
                      minWidth: 120, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>
                        {stats?.byRole?.[role] || 0}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{cfg.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          // ---- TAB: USERS ----
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  👥 Danh sách người dùng ({users.length})
                </h3>
                <button onClick={() => setShowAddUser(true)} style={{
                  padding: '8px 20px', background: '#3b82f6', border: 'none',
                  borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600
                }}>
                  + Thêm người dùng
                </button>
              </div>

              {/* Add User Modal */}
              {showAddUser && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                  <div style={{
                    background: '#1e293b', borderRadius: 20, padding: 32,
                    width: 400, border: '1px solid #334155'
                  }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                      ➕ Thêm người dùng mới
                    </h3>
                    <form onSubmit={handleAddUser}>
                      {[
                        { key: 'username',  label: 'Tên đăng nhập *', type: 'text' },
                        { key: 'password',  label: 'Mật khẩu *',      type: 'password' },
                        { key: 'full_name', label: 'Họ và tên *',      type: 'text' },
                        { key: 'email',     label: 'Email',            type: 'email' },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom: 14 }}>
                          <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>
                            {f.label}
                          </label>
                          <input
                            type={f.type}
                            value={newUser[f.key]}
                            onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                            required={f.label.includes('*')}
                            style={{
                              width: '100%', padding: '8px 12px', background: '#0f172a',
                              border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0',
                              fontSize: 14, boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      ))}
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>
                          Vai trò *
                        </label>
                        <select
                          value={newUser.role}
                          onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                          style={{
                            width: '100%', padding: '8px 12px', background: '#0f172a',
                            border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0',
                            fontSize: 14
                          }}
                        >
                          {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                            <option key={r} value={r}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={() => setShowAddUser(false)} style={{
                          flex: 1, padding: '10px', background: '#334155', border: 'none',
                          borderRadius: 8, color: '#e2e8f0', cursor: 'pointer'
                        }}>
                          Hủy
                        </button>
                        <button type="submit" disabled={saving} style={{
                          flex: 1, padding: '10px', background: '#3b82f6', border: 'none',
                          borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600
                        }}>
                          {saving ? '⏳ Đang lưu...' : '✅ Tạo tài khoản'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Users table */}
              <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      {['Tên đăng nhập', 'Họ và tên', 'Vai trò', 'Email', 'Trạng thái'].map(h => (
                        <th key={h} style={{
                          padding: '12px 16px', textAlign: 'left',
                          color: '#64748b', fontSize: 12, fontWeight: 600,
                          borderBottom: '1px solid #334155'
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.parent
                      return (
                        <tr key={u.id} style={{
                          borderBottom: '1px solid #1e293b',
                          background: i % 2 === 0 ? 'transparent' : '#0f172a'
                        }}>
                          <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
                            {u.username}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 14 }}>
                            {u.full_name}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: roleCfg.bg, color: roleCfg.color
                            }}>
                              {roleCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                            {u.email || '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 10px', borderRadius: 6, fontSize: 12,
                              background: u.is_active ? '#14532d' : '#450a0a',
                              color: u.is_active ? '#22c55e' : '#ef4444'
                            }}>
                              {u.is_active ? '● Hoạt động' : '○ Vô hiệu'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}