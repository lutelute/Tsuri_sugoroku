import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages用のbase pathはビルド時のみ使用
  base: process.env.NODE_ENV === 'production' ? '/Tsuri_sugoroku/' : '/',
})
