import { useState, useEffect } from 'react'
import api from '../api/axios'
import useAuthStore from '../store/authStore'

const STATUS_LABEL = {
  pending:   { text: 'Chờ xác nhận', color: '#f59e0b', bg: '#451a03' },
  confirmed: { text: 'Đã xác nhận',  color: '#22c55e', bg: '#052e16' },
  rejected:  { text: 'Từ chối',      color: '#ef4444', bg: '#450a0a' },
  cancelled: { text: 'Đã hủy',       color: '#6b7280', bg: '#1c1917' },
  completed: { text: 'Hoàn thành',   color: '#8b5cf6', bg: '#2e1065' },
}

export default function Appointments() {
  const { role } = useAuthStore()
  const [tab, setTab] = useState('list')
  const [appointments, setAppointments] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [mySlots, setMySlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [specialistNotes, setSpecialistNotes] = useState('')
  const [bookForm, setBookForm] = useState({ slot_id: '', reason: '' })
  const [newSlots, setNewSlots] = useState([
    { slot_date: '', start_time: '', end_time: '', location: 'Online', notes: '' }
  ])

  useEffect(() => {
    loadAppointments()
    if (role === 'specialist') loadMySlots()
    if (role === 'parent' || role === 'teacher') loadAvailableSlots()
  }, [filterStatus])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      const res = await api.get('/appointments/my', {
        params: filterStatus ? { status: filterStatus } : {}
      })
      setAppointments(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadAvailableSlots = async () => {
    try {
      const res = await api.get('/appointments/slots/available')
      setAvailableSlots(res.data)
    } catch (e) { console.error(e) }
  }

  const loadMySlots = async () => {
    try {
      const res = await api.get('/appointments/slots/my')
      setMySlots(res.data)
    } catch (e) { console.error(e) }
  }

  const handleBook = async () => {
    if (!bookForm.slot_id) return alert('Chọn khung giờ trước')
    try {
      await api.post('/appointments', bookForm)
      alert('Đặt lịch thành công! Chờ chuyên gia xác nhận.')
      setTab('list')
      setBookForm({ slot_id: '', reason: '' })
      loadAppointments()
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi đặt lịch')
    }
  }

  const handleAction = async () => {
    if (!actionModal) return
    const { appt, action } = actionModal
    try {
      await api.patch(`/appointments/${appt.id}/action`, {
        action,
        reject_reason: rejectReason || undefined,
        specialist_notes: specialistNotes || undefined,
      })
      setActionModal(null)
      setRejectReason('')
      setSpecialistNotes('')
      loadAppointments()
      if (role === 'specialist') loadMySlots()
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi')
    }
  }

  const handleCreateSlots = async () => {
    const valid = newSlots.filter(s => s.slot_date && s.start_time && s.end_time)
    if (!valid.length) return alert('Điền đầy đủ thông tin slot')
    try {
      await api.post('/appointments/slots', { slots: valid })
      alert(`Tạo ${valid.length} khung giờ thành công!`)
      setNewSlots([{ slot_date: '', start_time: '', end_time: '', location: 'Online', notes: '' }])
      loadMySlots()
      setTab('list')
    } catch (e) {
      alert(e.response?.data?.detail || 'Lỗi tạo slot')
    }
  }

  const addSlotRow = () => setNewSlots([...newSlots,
    { slot_date: '', start_time: '', end_time: '', location: 'Online', notes: '' }
  ])
  const removeSlotRow = (i) => setNewSlots(newSlots.filter((_, idx) => idx !== i))
  const updateSlotRow = (i, field, value) =>
    setNewSlots(newSlots.map((s, idx) => idx === i ? { ...s, [field]: value } : s))

  const S = {
    page: { minHeight: '100vh', background: '#0f172a', padding: '24px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { color: '#e2e8f0', fontSize: 24, fontWeight: 700 },
    tabs: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
    tab: (active) => ({
      padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600,
      background: active ? '#3b82f6' : '#1e293b',
      color: active ? '#fff' : '#94a3b8',
      transition: 'all 0.2s',
    }),
    card: {
      background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 12,
      border: '1px solid #334155',
    },
    badge: (status) => ({
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      color: STATUS_LABEL[status]?.color || '#94a3b8',
      background: STATUS_LABEL[status]?.bg || '#1e293b',
    }),
    input: {
      background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
      padding: '8px 12px', color: '#e2e8f0', fontSize: 14, width: '100%', boxSizing: 'border-box',
    },
    btn: (color = '#3b82f6') => ({
      padding: '8px 16px', background: color, color: '#fff',
      border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    }),
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.title}>📅 Lịch hẹn chuyên gia</div>
        <button style={S.btn()} onClick={() => window.history.back()}>← Quay lại</button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button style={S.tab(tab === 'list')} onClick={() => setTab('list')}>
          📋 Lịch của tôi
        </button>
        {(role === 'parent' || role === 'teacher') && (
          <button style={S.tab(tab === 'book')} onClick={() => { setTab('book'); loadAvailableSlots() }}>
            ➕ Đặt lịch mới
          </button>
        )}
        {role === 'specialist' && (
          <button style={S.tab(tab === 'slots')} onClick={() => setTab('slots')}>
            🕐 Quản lý khung giờ
          </button>
        )}
      </div>

      {/* TAB: Danh sách lịch hẹn */}
      {tab === 'list' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['', 'pending', 'confirmed', 'rejected', 'cancelled', 'completed'].map(s => (
              <button key={s} style={S.tab(filterStatus === s)} onClick={() => setFilterStatus(s)}>
                {s ? STATUS_LABEL[s]?.text : 'Tất cả'}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Đang tải...</div>
          ) : appointments.length === 0 ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: 60 }}>
              Chưa có lịch hẹn nào
            </div>
          ) : (
            appointments.map(appt => (
              <div key={appt.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                      📅 {appt.slot_date}&nbsp;
                      <span style={{ color: '#60a5fa' }}>{appt.start_time} – {appt.end_time}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
                      {role !== 'specialist'
                        ? `👨‍⚕️ Chuyên gia: ${appt.specialist_name}`
                        : `👨‍👩‍👧 Phụ huynh: ${appt.parent_name}`}
                      {appt.child_name && ` · Trẻ: ${appt.child_name}`}
                    </div>
                    {appt.location && (
                      <div style={{ color: '#64748b', fontSize: 12 }}>📍 {appt.location}</div>
                    )}
                    {appt.reason && (
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                        💬 {appt.reason}
                      </div>
                    )}
                    {appt.reject_reason && (
                      <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>
                        ❌ Lý do từ chối: {appt.reject_reason}
                      </div>
                    )}
                    {appt.specialist_notes && (
                      <div style={{ color: '#a78bfa', fontSize: 12, marginTop: 4 }}>
                        📝 Ghi chú: {appt.specialist_notes}
                      </div>
                    )}
                  </div>
                  <span style={S.badge(appt.status)}>
                    {STATUS_LABEL[appt.status]?.text || appt.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {role === 'specialist' && appt.status === 'pending' && (
                    <>
                      <button style={S.btn('#22c55e')} onClick={() => setActionModal({ appt, action: 'confirm' })}>
                        ✅ Xác nhận
                      </button>
                      <button style={S.btn('#ef4444')} onClick={() => setActionModal({ appt, action: 'reject' })}>
                        ❌ Từ chối
                      </button>
                    </>
                  )}
                  {role === 'specialist' && appt.status === 'confirmed' && (
                    <button style={S.btn('#8b5cf6')} onClick={() => setActionModal({ appt, action: 'complete' })}>
                      🏁 Hoàn thành
                    </button>
                  )}
                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    <button style={S.btn('#6b7280')} onClick={() => setActionModal({ appt, action: 'cancel' })}>
                      🚫 Hủy
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: Đặt lịch mới */}
      {tab === 'book' && (
        <div>
          <div style={{ color: '#94a3b8', marginBottom: 16, fontSize: 14 }}>
            Chọn khung giờ rảnh của chuyên gia:
          </div>

          {availableSlots.length === 0 ? (
            <div style={{ color: '#64748b', padding: 40, textAlign: 'center' }}>
              Hiện không có khung giờ rảnh nào
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {availableSlots.map(slot => (
                <div
                  key={slot.id}
                  onClick={() => setBookForm(f => ({ ...f, slot_id: slot.id }))}
                  style={{
                    ...S.card,
                    cursor: 'pointer',
                    border: `2px solid ${bookForm.slot_id === slot.id ? '#3b82f6' : '#334155'}`,
                    background: bookForm.slot_id === slot.id ? '#1e3a5f' : '#1e293b',
                  }}
                >
                  <div style={{ color: '#e2e8f0', fontWeight: 700 }}>👨‍⚕️ {slot.specialist_name}</div>
                  <div style={{ color: '#60a5fa', fontSize: 15, marginTop: 4 }}>📅 {slot.slot_date}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>🕐 {slot.start_time} – {slot.end_time}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>📍 {slot.location}</div>
                  {bookForm.slot_id === slot.id && (
                    <div style={{ color: '#22c55e', fontSize: 12, marginTop: 4 }}>✓ Đã chọn</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {bookForm.slot_id && (
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>
                Lý do đặt hẹn (tùy chọn):
              </div>
              <textarea
                value={bookForm.reason}
                onChange={e => setBookForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Mô tả tình trạng của trẻ, câu hỏi cần tư vấn..."
                rows={3}
                style={{ ...S.input, resize: 'vertical' }}
              />
              <button style={{ ...S.btn(), marginTop: 12 }} onClick={handleBook}>
                📅 Xác nhận đặt lịch
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: Quản lý slot (chuyên gia) */}
      {tab === 'slots' && role === 'specialist' && (
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
            Tạo khung giờ rảnh mới
          </div>

          {newSlots.map((slot, i) => (
            <div key={i} style={{ ...S.card, marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Ngày</div>
                  <input type="date" value={slot.slot_date} style={S.input}
                    onChange={e => updateSlotRow(i, 'slot_date', e.target.value)} />
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Bắt đầu</div>
                  <input type="time" value={slot.start_time} style={S.input}
                    onChange={e => updateSlotRow(i, 'start_time', e.target.value)} />
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Kết thúc</div>
                  <input type="time" value={slot.end_time} style={S.input}
                    onChange={e => updateSlotRow(i, 'end_time', e.target.value)} />
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Địa điểm</div>
                  <input value={slot.location} style={S.input} placeholder="Online"
                    onChange={e => updateSlotRow(i, 'location', e.target.value)} />
                </div>
                <button
                  style={{ ...S.btn('#7f1d1d'), padding: '8px 12px' }}
                  onClick={() => removeSlotRow(i)}
                  disabled={newSlots.length === 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button style={S.btn('#334155')} onClick={addSlotRow}>+ Thêm dòng</button>
            <button style={S.btn()} onClick={handleCreateSlots}>
              💾 Lưu {newSlots.length} khung giờ
            </button>
          </div>

          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Khung giờ của tôi
          </div>
          {mySlots.length === 0 ? (
            <div style={{ color: '#64748b', padding: 20 }}>Chưa có khung giờ nào</div>
          ) : (
            mySlots.map(slot => (
              <div key={slot.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{slot.slot_date}</span>
                  <span style={{ color: '#60a5fa', marginLeft: 12 }}>{slot.start_time} – {slot.end_time}</span>
                  <span style={{ color: '#64748b', marginLeft: 12, fontSize: 12 }}>📍 {slot.location}</span>
                  {slot.parent_name && (
                    <span style={{ color: '#94a3b8', marginLeft: 12, fontSize: 12 }}>
                      👤 {slot.parent_name} · {STATUS_LABEL[slot.appointment_status]?.text}
                    </span>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  color: slot.is_available ? '#22c55e' : '#94a3b8',
                  background: slot.is_available ? '#052e16' : '#1e293b',
                }}>
                  {slot.is_available ? 'Rảnh' : 'Đã đặt'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 420, border: '1px solid #334155'
          }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              {actionModal.action === 'confirm'  && '✅ Xác nhận lịch hẹn'}
              {actionModal.action === 'reject'   && '❌ Từ chối lịch hẹn'}
              {actionModal.action === 'complete' && '🏁 Hoàn thành buổi hẹn'}
              {actionModal.action === 'cancel'   && '🚫 Hủy lịch hẹn'}
            </div>

            <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 16 }}>
              📅 {actionModal.appt.slot_date} {actionModal.appt.start_time} – {actionModal.appt.end_time}
            </div>

            {actionModal.action === 'reject' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>Lý do từ chối:</div>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do..."
                  rows={3}
                  style={{ ...S.input, resize: 'vertical' }}
                />
              </div>
            )}

            {actionModal.action === 'complete' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>Ghi chú buổi hẹn:</div>
                <textarea
                  value={specialistNotes}
                  onChange={e => setSpecialistNotes(e.target.value)}
                  placeholder="Nhận xét, khuyến nghị sau buổi tư vấn..."
                  rows={4}
                  style={{ ...S.input, resize: 'vertical' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                style={{ padding: '8px 16px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => { setActionModal(null); setRejectReason(''); setSpecialistNotes('') }}
              >
                Hủy bỏ
              </button>
              <button
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  color: '#fff', fontWeight: 600,
                  background: actionModal.action === 'confirm'  ? '#22c55e'
                            : actionModal.action === 'reject'   ? '#ef4444'
                            : actionModal.action === 'complete' ? '#8b5cf6' : '#6b7280'
                }}
                onClick={handleAction}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}