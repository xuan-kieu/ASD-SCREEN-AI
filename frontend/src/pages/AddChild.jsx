import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useChildStore from '../store/childStore'
import { CITIES } from '../constants/cities'

export default function AddChild() {
  const navigate = useNavigate()
  const { addChild, loading, error } = useChildStore()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    full_name: '', birth_date: '', gender: '',
    region: '', primary_language: 'vi', notes: ''
  })
  const [success, setSuccess]     = useState(false)
  const [dateError, setDateError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'birth_date') setDateError(value > today ? 'Ngày sinh không được sau ngày hôm nay' : '')
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.birth_date > today) { setDateError('Ngày sinh không được sau ngày hôm nay'); return }
    const result = await addChild(form)
    if (result.success) { setSuccess(true); setTimeout(() => navigate('/dashboard'), 1500) }
  }

  const cls = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm"

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('/dashboard')}
          className="text-gray-500 hover:text-gray-700 text-sm mb-6 flex items-center gap-1">← Quay lại</button>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">👶 Thêm trẻ mới</h2>

          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">✅ Thêm trẻ thành công!</div>}
          {error  && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
              <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Nguyễn Văn An" className={cls} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh <span className="text-red-500">*</span></label>
                <input type="date" name="birth_date" value={form.birth_date} onChange={handleChange}
                  required max={today} className={`${cls} ${dateError ? 'border-red-400 bg-red-50' : ''}`} />
                {dateError && <p className="text-xs text-red-500 mt-1">❌ {dateError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                <select name="gender" value={form.gender} onChange={handleChange} className={cls}>
                  <option value="">-- Chọn --</option>
                  <option value="male">👦 Nam</option>
                  <option value="female">👧 Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực (Tỉnh/Thành phố)</label>
              <select name="region" value={form.region} onChange={handleChange} className={cls}>
                <option value="">-- Chọn tỉnh/thành phố --</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Dùng để gợi ý chuyên gia cùng khu vực</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea name="notes" value={form.notes} onChange={handleChange}
                placeholder="Thông tin thêm..." rows={3} className={`${cls} resize-none`} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/dashboard')}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm">Hủy</button>
              <button type="submit" disabled={loading || !!dateError}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-xl text-sm font-medium">
                {loading ? '⏳ Đang lưu...' : '💾 Lưu thông tin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}