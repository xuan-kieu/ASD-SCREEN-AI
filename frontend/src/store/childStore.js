import { create } from 'zustand'
import api from '../api/axios'

const useChildStore = create((set) => ({
  children: [],
  selectedChild: null,
  loading: false,
  error: null,

  fetchChildren: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get('/children/')
      set({ children: res.data, loading: false })
    } catch (err) {
      set({ error: 'Không thể tải danh sách trẻ', loading: false })
    }
  },

  addChild: async (data) => {
    set({ loading: true, error: null })
    try {
      const res = await api.post('/children/', data)
      set(state => ({
        children: [...state.children, res.data],
        loading: false
      }))
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Không thể thêm trẻ'
      set({ error: msg, loading: false })
      return { success: false, error: msg }
    }
  },

  selectChild: (child) => set({ selectedChild: child })
}))

export default useChildStore