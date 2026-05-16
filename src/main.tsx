import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

// Sync dark mode with OS preference
function applyDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}
const mq = window.matchMedia('(prefers-color-scheme: dark)')
applyDark(mq.matches)
mq.addEventListener('change', (e) => applyDark(e.matches))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  </React.StrictMode>
)
