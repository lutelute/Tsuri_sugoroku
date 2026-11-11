import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 開発ビルドだけ: 撮影スクリプト（scripts/shots.mjs）と手元の確かめ用に、ストアを window.__tsuri に出す
if (import.meta.env.DEV) {
  void import('./store/useGameStore').then(m => {
    (window as unknown as { __tsuri?: unknown }).__tsuri = m.useGameStore;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
