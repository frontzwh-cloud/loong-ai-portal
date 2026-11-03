import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Identity = { enabled: boolean; user?: { uid: string; name: string } | null }

export function AuthGate({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Identity unavailable'); return response.json() })
      .then(setIdentity)
      .catch(() => setError(true))
  }, [])
  if (error) return <main style={{ padding: 32 }}><h1>无法验证登录状态</h1><p>请检查 Portal 服务后刷新页面。</p></main>
  if (!identity) return <main style={{ padding: 32 }}>正在检查登录状态…</main>
  if (identity.enabled && !identity.user) return <main style={{ padding: 32 }}>
    <h1>LOONG AI Portal</h1><p>使用企业域账户登录。</p>
    <a href="/sso/login">企业统一登录</a>
  </main>
  return <>{children}</>
}
