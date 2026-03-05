import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      // Mọi request /api/* từ browser → Vite dev server → backend container
      '/api': {
        target: 'http://backend:8000',  // tên service trong docker-compose
        changeOrigin: true,
        // KHÔNG rewrite — giữ nguyên /api prefix vì backend dùng /api
      }
    }
  }
})