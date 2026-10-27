import { useEffect, useState } from 'react'
import { ExternalLink, Save } from 'lucide-react'
import { catalog, safeLink } from './catalog'

const editable = catalog.filter(service => !service.demo)
type Links = Record<string, string>
const emptyLinks = Object.fromEntries(editable.map(service => [service.id, ''])) as Links

function isAdminAddress() {
  return window.location.pathname === '/admin' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    window.location.protocol === 'http:'
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json() as { detail?: string }
    return data.detail || 'HTTP ' + response.status
  } catch {
    return 'HTTP ' + response.status
  }
}

export function AdminLinks({ onSaved }: { onSaved: (links: Links) => void }) {
  const [links, setLinks] = useState<Links>({ ...emptyLinks })
  const [saved, setSaved] = useState<Links>({ ...emptyLinks })
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const allowed = isAdminAddress()

  async function load() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const response = await fetch('/api/admin/links', { cache: 'no-store' })
      if (!response.ok) throw new Error(await errorMessage(response))
      const data = await response.json() as { links: Links }
      const current = Object.fromEntries(editable.map(item =>
        [item.id, data.links?.[item.id] || ''])) as Links
      setLinks(current)
      setSaved(current)
      setLoaded(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法读取配置')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (allowed) void load()
  }, [allowed])

  async function save() {
    const validated: Links = {}
    for (const item of editable) {
      const value = (links[item.id] || '').trim()
      if (value && safeLink(value) !== value) {
        setError('「' + item.name + '」地址无效：只接受不包含凭据的 HTTP(S) 链接。')
        return
      }
      validated[item.id] = value
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const response = await fetch('/api/admin/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ links: validated }),
      })
      if (!response.ok) throw new Error(await errorMessage(response))
      const data = await response.json() as { links: Links }
      setLinks(data.links)
      setSaved(data.links)
      onSaved(data.links)
      setStatus('链接已保存，员工页面刷新后立即生效。')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  return <main className="admin-page" aria-label="应用链接管理">
    <header className="admin-heading">
      <span className="admin-eyebrow">LOONG AI / APPLICATION LINKS</span>
      <h1>应用链接管理</h1>
      <p>维护 AI 应用与办公服务入口。会议助手使用其独立下载页面地址。</p>
    </header>

    {!allowed ? <div className="admin-alert" role="note">
      管理功能只在本机专用地址开放，请使用 SSH 转发访问 http://127.0.0.1:8001/admin。
    </div> : !loaded ? <div className="admin-alert" role="status">
      <span>{busy ? '正在读取应用配置…' : '尚未加载应用配置。'}</span>
      {!busy && <button type="button" onClick={() => void load()}>重新读取</button>}
    </div> : <>
      {(['ai', 'office'] as const).map(category => <section className="admin-section" key={category}>
        <div className="admin-section-title">
          <h2>{category === 'ai' ? 'AI 应用' : '办公服务'}</h2>
          <span>只修改导航地址</span>
        </div>
        {editable.filter(item => item.category === category).map(item =>
          <div className="admin-link-row" key={item.id}>
            <div className="admin-link-info">
              <strong>{item.name}</strong>
              <span>{item.id === 'meeting' ? '跳转独立下载页，不直接提供安装包' : item.description}</span>
            </div>
            <div className="admin-link-input">
              <label htmlFor={'admin-url-' + item.id}>
                {item.id === 'meeting' ? '下载页 URL' : '应用地址 URL'}
              </label>
              <div className="admin-link-field">
                <input id={'admin-url-' + item.id} maxLength={2048}
                  value={links[item.id] || ''} placeholder="https://..."
                  onChange={e => { setLinks(prev => ({ ...prev, [item.id]: e.target.value })); setStatus('') }}/>
                <button type="button" aria-label={'测试' + item.name + '地址'}
                  disabled={!safeLink(links[item.id])}
                  onClick={() => window.open(links[item.id], '_blank', 'noopener,noreferrer')}>
                  <ExternalLink size={16}/>
                </button>
              </div>
            </div>
          </div>)}
      </section>)}
      <div className="admin-footer">
        <span>留空即停用该入口；链接编辑不影响 AI 模型配置。</span>
        <button type="button" onClick={() => { setLinks({ ...saved }); setError(''); setStatus('') }} disabled={busy}>撤销修改</button>
        <button type="button" className="admin-save" onClick={() => void save()}
          disabled={busy || JSON.stringify(saved) === JSON.stringify(links)}>
          <Save size={16}/>{busy ? '保存中…' : '保存链接配置'}
        </button>
      </div>
    </>}
    {error && <div className="admin-feedback error" role="alert">{error}</div>}
    {status && !error && <div className="admin-feedback" role="status">{status}</div>}
    <p className="admin-help">此服务仅可通过服务器本机或 SSH 转发地址访问。任何有该地址访问权的人均可修改链接。</p>
  </main>
}
