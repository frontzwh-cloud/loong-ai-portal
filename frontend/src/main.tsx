import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AdminLinks } from './AdminLinks'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {window.location.pathname === '/admin' ? <div className="admin-standalone"><div className="admin-standalone-brand"><strong>LOONG AI</strong><span>应用链接管理</span></div><AdminLinks onSaved={() => {}} /></div> : <App />}
  </React.StrictMode>,
)
