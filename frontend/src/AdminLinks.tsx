import { useState } from 'react'
import { ExternalLink, LockKeyhole, Save } from 'lucide-react'
import { catalog, safeLink } from './catalog'

const editable = catalog.filter(service => !service.demo)
type Links = Record<string, string>
const emptyLinks = Object.fromEntries(editable.map(item => [item.id, ''])) as Links

function localAdminOrigin(): boolean {
  return ['127.0.0.1', 'localhost'].includes(window.location.hostname) &&
    window.location.protocol === 'http:'
}

function messageFrom(response: Response): Promise<string> {
  return response.json()
    .then((data: { detail?: string }) => data.detail || 'HTTP ' + response.status)
    .catch(() => 'HTTP ' + response.status)
}

export function AdminLinks({ onSaved }: { onSaved: (links: Links) => void }) {
  const [token, setToken] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [links, setLinks] = useState<Links>({ ...emptyLinks })
  const [previous, setPrevious] = useState<Links>({ ...emptyLinks })
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const local = localAdminOrigin()

  async function load() {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const response = await fetch('/api/admin/links', {
        headers: { Authorization: 'Bearer ' + token.trim() },
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(await messageFrom(response))
      const data = await response.json() as { links: Links }
      const next = Object.fromEntries(editable.map(item => [item.id, data.links?.[item.id] || ''])) as Links
      setLinks(next)
      setPrevious(next)
      setAuthorized(true)
      setStatus('已加载当前服务器配置。')
    } catch (reason) {
      setAuthorized(false)
      setError(reason instanceof Error ? reason.message : '无法连接管理服务。')
    } finally {
      setBusy(false)
    }
  }

  function change(id: string, value: string) {
    setLinks(prev => ({ ...prev, [id]: value }))
    setStatus('')
  }

  async function save() {
    for (const item of editable) {
      const url = links[item.id].trim()
      if (url && safeLink(url) !== url) {
        setError('「' + item.name + '」需要合法 HTTP(S) 地址，不能包含凭据或空格。')
        return
      }
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const response = await fetch('/api/admin/links', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token.trim(), 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ links: Object.fromEntries(editable.map(item => [item.id, links[item.id].trim()])) }),
      })
      if (!response.ok) throw new Error(await messageFrom(response))
      const data = await response.json() as { links: Links }
      setLinks(data.links)
      setPrevious(data.links)
      onSaved(data.links)
      setStatus('已保存。服务中心和快捷入口已更新，无需重启 Portal。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败。')
    } finally {
      setBusy(false)
    }
  }

  return <div className="admin-page" aria-label="应用链接管理">
    <header className="admin-heading">
      <span className="admin-eyebrow">LOONG AI / APPLICATION LINKS</span>
      <h1>应用链接管理</h1>
      <p>统一维护 AI 应用和办公服务的入口地址。这里只管理导航，不读取其他系统的业务数据。</p>
    </header>

    {!local ? <div className="admin-alert" role="note">
      <LockKeyhole size={18}/>
      <div><strong>管理接口仅限本机安全访问</strong>
        <p>普通员工可继续使用当前 Portal。管理员请通过 SSH 转发，在浏览器打开 <code>http://127.0.0.1:8000</code>，再进入此页面。管理密钥不会通过普通 HTTP 内网页面发送。</p>
      </div>
    </div> : !authorized ? <section className="admin-auth">
      <div className="admin-auth-icon"><LockKeyhole size={23}/></div>
      <h2>管理员验证</h2>
      <p>请输入服务器配置的 <code>PORTAL_ADMIN_TOKEN</code>。密钥仅保留在页面内存中，不保存到浏览器历史或本地存储。</p>
      <form onSubmit={event => { event.preventDefault(); void load() }}>
        <label htmlFor="portal-admin-token">管理员密钥</label>
        <input id="portal-admin-token" type="password" value={token} autoComplete="off"
          onChange={event => setToken(event.target.value)} required minLength={32} placeholder="输入管理员密钥"/>
        <button type="submit" disabled={busy || token.trim().length < 32}>{busy ? '正在验证…' : '验证并读取配置'}</button>
      </form>
    </section> : <>
      <div className="admin-toolbar"><span><LockKeyhole size={14}/> 当前页面已验证</span>
        <button type="button" onClick={() => { setAuthorized(false); setToken(''); setLinks({ ...emptyLinks }); setStatus('') }}>退出管理</button>
      </div>
      {(['ai', 'office'] as const).map(category => <section className="admin-section" key={category}>
        <div className="admin-section-title"><h2>{category === 'ai' ? 'AI 应用' : '办公服务'}</h2>
          <span>仅修改访问地址</span></div>
        {editable.filter(item => item.category === category).map(item => <div className="admin-link-row" key={item.id}>
          <div className="admin-link-info"><strong>{item.name}</strong>
            <span>{item.id === 'meeting' ? '点击后打开独立的会议助手下载页面' : item.description}</span></div>
          <div className="admin-link-input">
            <label htmlFor={'admin-url-' + item.id}>{item.id === 'meeting' ? '下载页 URL' : '服务访问 URL'}</label>
            <div className="admin-link-field">
              <input id={'admin-url-' + item.id} value={links[item.id] || ''} maxLength={2048}
                placeholder="https://..." onChange={event => change(item.id, event.target.value)}/>
              <button type="button" aria-label={'测试' + item.name + '地址'} title="在新标签打开目标页"
                disabled={!safeLink(links[item.id])} onClick={() => window.open(links[item.id], '_blank', 'noopener,noreferrer')}>
                <ExternalLink size={16}/>
              </button>
            </div>
          </div>
        </div>)}
      </section>)}
      <div className="admin-footer"><span>留空表示停用启动入口；仍保留服务目录中的占位卡片。</span>
        <button type="button" onClick={() => { setLinks({ ...previous }); setError(''); setStatus('') }} disabled={busy}>撤销修改</button>
        <button type="button" className="admin-save" disabled={busy || JSON.stringify(previous) === JSON.stringify(links)} onClick={() => void save()}>
          <Save size={16}/>{busy ? '正在保存…' : '保存链接配置'}
        </button>
      </div>
    </>}
    {error && <div className="admin-feedback error" role="alert">{error}</div>}
    {status && !error && <div className="admin-feedback" role="status">{status}</div>}
    <p className="admin-help">管理员配置只影响已有服务导航。模型参数、API 密钥和企业权限不在此页面编辑。</p>
  </div>
}
