import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

const ROLE_CONFIG = {
  admin:      { label: 'Quản trị viên', color: '#7c3aed', bg: '#4c1d95' },
  specialist: { label: 'Chuyên gia',    color: '#0ea5e9', bg: '#0c4a6e' },
  teacher:    { label: 'Giáo viên',     color: '#22c55e', bg: '#14532d' },
  parent:     { label: 'Phụ huynh',     color: '#f59e0b', bg: '#78350f' },
}

const S = {
  page:    { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "'Segoe UI', sans-serif" },
  header:  { background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tabs:    { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', display: 'flex', gap: 4 },
  card:    { background: '#1e293b', borderRadius: 16, padding: 24, border: '1px solid #334155' },
  input:   { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' },
  select:  { width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 14 },
  btnBlue: { padding: '8px 20px', background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  btnGray: { padding: '8px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer', fontSize: 13 },
}

export default function Admin() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [users, setUsers]       = useState([])
  const [children, setChildren] = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('overview')

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', email: '', phone: '', role: 'specialist', city: '' })
  const [saving, setSaving]   = useState(false)
  const [toggling, setToggling] = useState(null)

  // Assign modal
  const [assignModal, setAssignModal] = useState(null) // { child }
  const [assigningId, setAssigningId] = useState('')
  const [assigning, setAssigning]     = useState(false)

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, childrenRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/children'),
      ])
      setUsers(usersRes.data)
      setChildren(childrenRes.data)
      setStats({
        totalUsers:    usersRes.data.length,
        totalChildren: childrenRes.data.length,
        activeUsers:   usersRes.data.filter(u => u.is_active).length,
        byRole: usersRes.data.reduce((acc, u) => {
          acc[u.role] = (acc[u.role] || 0) + 1; return acc
        }, {}),
        unassigned: childrenRes.data.filter(c => !c.specialist_id).length,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (userId, username) => {
    if (username === 'admin') return
    setToggling(userId)
    try {
      const res = await api.patch(`/admin/users/${userId}/toggle`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: res.data.is_active } : u))
    } catch { alert('Không thể thay đổi trạng thái') }
    finally { setToggling(null) }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) return
    setSaving(true)
    try {
      await api.post('/auth/register', newUser)
      setShowAddUser(false)
      setNewUser({ username: '', password: '', full_name: '', email: '', phone: '', role: 'specialist', city: '' })
      loadData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi tạo người dùng')
    } finally { setSaving(false) }
  }

  const handleAssign = async () => {
    setAssigning(true)
    try {
      await api.patch(`/admin/children/${assignModal.child.id}/assign`, {
        specialist_id: assigningId || null
      })
      setAssignModal(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi phân công')
    } finally { setAssigning(false) }
  }

  const specialists = users.filter(u => u.role === 'specialist' && u.is_active)

  const TABS = [
    { id: 'overview', label: '📊 Tổng quan' },
    { id: 'users',    label: '👥 Người dùng' },
    { id: 'assign',   label: '🔗 Phân công trẻ' },
  ]

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 24 }}>🧩</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ASD-SCREEN AI</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>Admin Dashboard</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>👑 {user?.full_name}</span>
          <button onClick={() => navigate('/dashboard')} style={S.btnGray}>← Dashboard</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 20px', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
            color: tab === t.id ? '#60a5fa' : '#64748b',
            cursor: 'pointer', fontSize: 14, fontWeight: tab === t.id ? 600 : 400
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 32 }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>⏳ Đang tải...</div>
        ) : tab === 'overview' ? (

          // ── OVERVIEW ──────────────────────────────────────
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Tổng người dùng', value: stats?.totalUsers,    icon: '👥', color: '#3b82f6' },
                { label: 'Đang hoạt động',  value: stats?.activeUsers,   icon: '✅', color: '#22c55e' },
                { label: 'Tổng trẻ em',     value: stats?.totalChildren, icon: '👶', color: '#f59e0b' },
                { label: 'Chưa phân công',  value: stats?.unassigned,    icon: '⚠️', color: '#ef4444' },
                { label: 'Chuyên gia',       value: stats?.byRole?.specialist || 0, icon: '🩺', color: '#8b5cf6' },
              ].map((s, i) => (
                <div key={i} style={{ ...S.card, padding: '20px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 Phân bổ vai trò</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
                  <div key={role} style={{ padding: '12px 20px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.color}`, minWidth: 120, textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>{stats?.byRole?.[role] || 0}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{cfg.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : tab === 'users' ? (

          // ── USERS ─────────────────────────────────────────
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>👥 Người dùng ({users.length})</h3>
              <button onClick={() => setShowAddUser(true)} style={S.btnBlue}>+ Thêm người dùng</button>
            </div>

            {/* Add User Modal */}
            {showAddUser && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ background: '#1e293b', borderRadius: 20, padding: 32, width: 440, border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>➕ Thêm người dùng</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      { key: 'username',  label: 'Tên đăng nhập *', type: 'text' },
                      { key: 'password',  label: 'Mật khẩu *',      type: 'password' },
                      { key: 'full_name', label: 'Họ và tên *',      type: 'text' },
                      { key: 'email',     label: 'Email',            type: 'email' },
                      { key: 'phone',     label: 'Số điện thoại',    type: 'text' },
                      { key: 'city',      label: 'Thành phố',        type: 'text' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>{f.label}</label>
                        <input type={f.type} value={newUser[f.key]}
                          onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                          style={S.input} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 5 }}>Vai trò *</label>
                      <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} style={S.select}>
                        {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                          <option key={r} value={r}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button onClick={() => setShowAddUser(false)} style={{ ...S.btnGray, flex: 1 }}>Hủy</button>
                    <button onClick={handleAddUser} disabled={saving} style={{ ...S.btnBlue, flex: 1, opacity: saving ? 0.5 : 1 }}>
                      {saving ? '⏳...' : '✅ Tạo tài khoản'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {['Họ và tên', 'Vai trò', 'Email', 'Thành phố', 'Trạng thái', 'Hành động'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => {
                    const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.parent
                    const isAdmin = u.username === 'admin'
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #0f172a', background: i % 2 === 0 ? 'transparent' : '#0f172a' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14 }}>
                          {u.full_name}
                          {isAdmin && <span style={{ marginLeft: 6, fontSize: 10, background: '#4c1d95', color: '#7c3aed', padding: '2px 6px', borderRadius: 4 }}>SYSTEM</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{u.email || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{u.city || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, background: u.is_active ? '#14532d' : '#450a0a', color: u.is_active ? '#22c55e' : '#ef4444' }}>
                            {u.is_active ? '● Hoạt động' : '○ Vô hiệu'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button onClick={() => handleToggle(u.id, u.username)}
                            disabled={isAdmin || toggling === u.id}
                            style={{ padding: '5px 14px', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: isAdmin ? 'not-allowed' : 'pointer', opacity: isAdmin ? 0.3 : 1, background: u.is_active ? '#450a0a' : '#14532d', color: u.is_active ? '#ef4444' : '#22c55e' }}>
                            {toggling === u.id ? '⏳' : u.is_active ? '🚫 Vô hiệu' : '✅ Kích hoạt'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        ) : (

          // ── PHÂN CÔNG TRẺ ─────────────────────────────────
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🔗 Phân công trẻ cho chuyên gia</h3>
              <span style={{ color: '#64748b', fontSize: 13 }}>
                ⚠️ Chưa phân công: <strong style={{ color: '#ef4444' }}>{children.filter(c => !c.specialist_id).length}</strong>
              </span>
            </div>

            {/* Assign Modal */}
            {assignModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ background: '#1e293b', borderRadius: 20, padding: 32, width: 400, border: '1px solid #334155' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                    🔗 Phân công: <span style={{ color: '#60a5fa' }}>{assignModal.child.full_name}</span>
                  </h3>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>
                    Chọn chuyên gia
                  </label>
                  <select value={assigningId} onChange={e => setAssigningId(e.target.value)} style={S.select}>
                    <option value="">— Bỏ phân công —</option>
                    {specialists.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}{s.city ? ` (${s.city})` : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={() => setAssignModal(null)} style={{ ...S.btnGray, flex: 1 }}>Hủy</button>
                    <button onClick={handleAssign} disabled={assigning} style={{ ...S.btnBlue, flex: 1, opacity: assigning ? 0.5 : 1 }}>
                      {assigning ? '⏳...' : '✅ Xác nhận'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {['Tên trẻ', 'Phụ huynh', 'Giáo viên', 'Chuyên gia phụ trách', 'Thao tác'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #334155' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {children.map((c, i) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #0f172a', background: i % 2 === 0 ? 'transparent' : '#0f172a' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>{c.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{c.parent_name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{c.teacher_name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.specialist_name
                          ? <span style={{ color: '#0ea5e9', fontSize: 13 }}>🩺 {c.specialist_name}</span>
                          : <span style={{ color: '#ef4444', fontSize: 12 }}>⚠️ Chưa phân công</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => { setAssignModal({ child: c }); setAssigningId(c.specialist_id || '') }}
                          style={{ padding: '5px 14px', background: '#1e40af', border: 'none', borderRadius: 6, color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          ✏️ Phân công
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}