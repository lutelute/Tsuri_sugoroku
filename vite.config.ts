import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages用のbase pathはビルド時のみ使用
  base: process.env.NODE_ENV === 'production' ? '/Tsuri_sugoroku/' : '/',
  build: {
    rollupOptions: {
      output: {
        // 変更の少ないライブラリを別チャンクにしてキャッシュを効かせる
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler') || id.includes('node_modules/zustand')) return 'react';
        },
      },
    },
  },
})
