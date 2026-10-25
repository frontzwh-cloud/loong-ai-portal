import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AuiIf, AssistantRuntimeProvider, ComposerPrimitive, MessagePartPrimitive,
  MessagePrimitive, ThreadPrimitive, useLocalRuntime, type ChatModelAdapter,
} from '@assistant-ui/react'
import {
  ArrowDownToLine, ArrowRight, ArrowUp, BookOpen, ChevronDown, ChevronLeft,
  ChevronRight, ExternalLink, FileText, Grid2X2, Home, LayoutPanelLeft,
  Link2, Menu, MessageSquareText, Mic2, Monitor, PanelRightClose,
  Plus, Search, Sparkles, X,
} from 'lucide-react'
import { applyRuntimeLinks, catalog, type Service, type ServiceCategory } from './catalog'

type View = 'chat' | 'services'
type Filter = 'all' | 'download' | ServiceCategory
type StreamEvent = { type: string; content?: string }

const slideOutline = [
  { title: '项目背景', note: '为什么需要在工厂推进 AI' },
  { title: '我们做了什么', note: '平台与应用建设的阶段性成果' },
  { title: '实际业务价值', note: '可量化的效率与业务改善' },
  { title: '下一步计划', note: '明确试点与推广边界' },
]
const mascotUrl = `${import.meta.env.BASE_URL}loong-ai-mascot.png`

// Prototype-only routing: transparent keyword matching, not an AI agent.
// Production routing should return a reviewed service id from the Portal backend.
function suggestedService(input: string): Service | undefined {
  if (!/(想|我要|帮我|打开|进入|使用|查看|查一下|看一下|下载|在哪|推荐|链接|地址)/i.test(input)) return undefined
  const match = [
    { id: 'gemba', pattern: /gemba|oee|fpy|停机|产线|良率|生产指标/i },
    { id: 'meeting', pattern: /会议助手|会议纪要|录音|语音转写|会议记录|实时字幕/i },
    { id: 'knowledge', pattern: /知识库|培训资料|mes文档|知识助手/i },
    { id: 'workflow', pattern: /workflow|工作流|审批|请假/i },
    { id: 'pdf', pattern: /pdf|合并文档|拆分文件/i },
  ].find(rule => rule.pattern.test(input))
  return catalog.find(item => item.id === match?.id)
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={small ? 'brand-mark small' : 'brand-mark'}>
    <img src={mascotUrl} alt="龙小智头像" />
  </span>
}

function ServiceIcon({ service, size = 21 }: { service: Service; size?: number }) {
  switch (service.id) {
    case 'presentation': return <FileText size={size} />
    case 'gemba': return <LayoutPanelLeft size={size} />
    case 'meeting': return <Mic2 size={size} />
    case 'knowledge': return <BookOpen size={size} />
    case 'workflow': return <Grid2X2 size={size} />
    case 'pdf': return <FileText size={size} />
    default: return <Monitor size={size} />
  }
}

function UserMessage() {
  return <MessagePrimitive.Root className="thread-message user-message">
    <div className="user-bubble"><MessagePrimitive.Parts /></div>
  </MessagePrimitive.Root>
}

function AssistantMessage() {
  return <MessagePrimitive.Root className="thread-message assistant-message">
    <BrandMark small />
    <div className="assistant-body">
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === 'reasoning') {
            return <details className="reasoning-block">
              <summary><Sparkles size={13} /> 思考过程 <ChevronDown size={13} /></summary>
              <div className="reasoning-text"><MessagePartPrimitive.Text /></div>
            </details>
          }
          if (part.type === 'text') return <div className="assistant-text"><MessagePartPrimitive.Text /></div>
          return null
        }}
      </MessagePrimitive.Parts>
    </div>
  </MessagePrimitive.Root>
}

const featuredAiIds = ['presentation', 'gemba', 'meeting'] as const
const featuredOfficeIds = ['workflow', 'pdf', 'tools'] as const

function QuickLaunch({ onOpen, onBrowse }: {
  onOpen: (service: Service) => void; onBrowse: (filter: Filter) => void
}) {
  const featured = (ids: readonly string[]) => ids.flatMap(id => catalog.filter(item => item.id === id))
  return <section className="quick-launch" aria-label="快捷启动">
    <div className="quick-heading">
      <div><span>AI APPLICATIONS</span><h2>用 AI 完成任务</h2></div>
      <button type="button" onClick={() => onBrowse('ai')}>全部 AI 应用 <ArrowRight size={14}/></button>
    </div>
    <div className="quick-ai-grid">
      {featured(featuredAiIds).map(item => {
        const enabled = item.demo || Boolean(item.url)
        return <button type="button" className="quick-ai-card" key={item.id}
          onClick={() => onOpen(item)} disabled={!enabled}
          aria-label={`${item.name}，${item.demo ? '界面演示' : enabled ? (item.type === 'windows' ? '下载客户端' : '打开应用') : '地址待配置'}`}>
          <span className="quick-ai-icon"><ServiceIcon service={item} size={19}/></span>
          <span className="quick-ai-body"><strong>{item.name}</strong><small>{item.id === 'presentation' ? '对话制作演示文稿' : item.id === 'gemba' ? '分析工厂运营指标' : '会议录音与纪要'}</small></span>
          <span className={enabled ? 'quick-ai-action' : 'quick-ai-action unavailable'}>
            {item.demo ? '演示' : !enabled ? '待配置' : item.type === 'windows' ? '下载' : <ArrowRight size={15}/>}
          </span>
        </button>
      })}
    </div>
    <div className="quick-heading office-heading">
      <div><span>WORKSPACE LINKS</span><h2>常用办公服务</h2></div>
      <button type="button" onClick={() => onBrowse('office')}>查看全部 <ArrowRight size={14}/></button>
    </div>
    <div className="quick-office-links">
      {featured(featuredOfficeIds).map(item => <button type="button" key={item.id}
        className="quick-office-link" disabled={!item.url} onClick={() => onOpen(item)}
        aria-label={`${item.name}，${item.url ? '打开服务' : '地址待配置'}`}>
        <ServiceIcon service={item} size={15}/><span>{item.name}</span>
        {item.url ? <ExternalLink size={13}/> : <small>待配置</small>}
      </button>)}
    </div>
  </section>
}

function ChatPane({ demo, recommendation, onOpenServices, onOpenRecommendation, onOpenService, onBrowseCategory }: {
  demo: boolean; recommendation: Service | null; onOpenRecommendation: () => void
  onOpenServices: () => void
  onOpenService: (service: Service) => void; onBrowseCategory: (filter: Filter) => void
}) {
  return <ThreadPrimitive.Root className="thread-root">
    <ThreadPrimitive.Viewport className="thread-viewport" turnAnchor="top">
      <AuiIf condition={state => state.thread.isEmpty}>
        {demo ? <div className="demo-intro">
          <div className="demo-intro-icon"><FileText size={22} /></div>
          <h1>AI Presentation</h1>
          <p>已打开交互原型。右侧展示可选择的模拟故事板；尚未连接真实 PPT 服务。</p>
        </div> : <div className="chat-hero">
          <div className="mascot-slot">
            <img src={mascotUrl} alt="龙小智完整形象" />
          </div>
          <h1>你好，我是龙小智</h1>
          <p>聊天、使用 AI、寻找工具，从这里开始。</p>
          <QuickLaunch onOpen={onOpenService} onBrowse={onBrowseCategory}/>
        </div>}
      </AuiIf>
      <div className="thread-content">
        <ThreadPrimitive.Messages>
          {({ message }) => message.role === 'user' ? <UserMessage /> : <AssistantMessage />}
        </ThreadPrimitive.Messages>
        {demo && <div className="task-receipt" role="status">
          <div className="task-receipt-title"><FileText size={17} /> AI Presentation <span>UI DEMO</span></div>
          <p>右侧故事板用于验证聊天与 Canvas 的布局。真实生成、修改和下载尚未接入。</p>
        </div>}
        {!demo && recommendation && <div className="recommendation" role="status">
          <div className="recommendation-icon"><ServiceIcon service={recommendation} size={20}/></div>
          <div className="recommendation-copy">
            <span>应用推荐 · 关键词演示</span>
            <strong>{recommendation.name}</strong>
            <p>{recommendation.description}</p>
            {!recommendation.url && <small>内部服务地址尚未配置</small>}
          </div>
          <button type="button" onClick={onOpenRecommendation}>
            {recommendation.url ? '立即使用' : '查看服务'} <ArrowRight size={14}/>
          </button>
        </div>}
      </div>
      <ThreadPrimitive.ViewportFooter className="composer-zone">
        <ComposerPrimitive.Root className="composer">
          <ComposerPrimitive.Input maxLength={16000} rows={2} placeholder={demo
            ? '继续描述 PPT 需求（当前只演示交互，不执行生成）...'
            : '向龙小智提问，或描述你想完成的工作...'} />
          <div className="composer-actions">
            <div className="composer-left">
              <button type="button" className="composer-apps" aria-label="打开应用中心" onClick={onOpenServices}>
                <Grid2X2 size={15}/> 应用
              </button>
              <span className="composer-hint">Enter 发送 · Shift + Enter 换行</span>
            </div>
            <AuiIf condition={state => !state.thread.isRunning}><ComposerPrimitive.Send className="send-button" aria-label="发送消息">
              <ArrowUp size={18} />
            </ComposerPrimitive.Send></AuiIf>
            <AuiIf condition={state => state.thread.isRunning}><ComposerPrimitive.Cancel className="send-button" aria-label="停止回答"><X size={18}/></ComposerPrimitive.Cancel></AuiIf>
          </div>
        </ComposerPrimitive.Root>
        <p className="chat-disclaimer">龙小智可能出错。企业数据仅能发送到经过批准的模型服务。刷新或关闭页面会清空对话。</p>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
  </ThreadPrimitive.Root>
}

function PresentationCanvas({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState(0)
  const slide = slideOutline[selected]
  return <aside className="canvas" aria-label="Presentation Canvas 演示区">
    <div className="canvas-heading">
      <div className="canvas-heading-copy">
        <span className="canvas-kicker">WORKSPACE / UI DEMO</span>
        <h2>Presentation Canvas</h2>
      </div>
      <button type="button" className="icon-action" onClick={onClose} aria-label="关闭工作区"><PanelRightClose size={19} /></button>
    </div>
    <div className="canvas-banner"><Sparkles size={16}/><span>此处为模拟故事板，不代表 PPT 已生成。</span></div>
    <div className="canvas-preview">
      <div className="slide-artboard">
        <div className="slide-brand"><span className="slide-brand-dot"/>AUMOVIO</div>
        <div className="slide-content">
          <span>LOONG AI · PROJECT REVIEW</span>
          <h3>{slide.title}</h3>
          <p>{slide.note}</p>
        </div>
        <div className="slide-bottom"><span>Ask · Analyze · Act</span><span>0{selected + 1} / 0{slideOutline.length}</span></div>
      </div>
      <div className="slide-switcher">
        <button type="button" aria-label="上一页" disabled={selected === 0} onClick={() => setSelected(v => v - 1)}><ChevronLeft size={16}/></button>
        <span>第 {selected + 1} / {slideOutline.length} 页</span>
        <button type="button" aria-label="下一页" disabled={selected === slideOutline.length - 1} onClick={() => setSelected(v => v + 1)}><ChevronRight size={16}/></button>
      </div>
    </div>
    <div className="outline-title"><h3>故事板</h3><span>点击切换预览</span></div>
    <div className="outline-list">
      {slideOutline.map((item, index) => <button type="button" key={item.title}
        className={selected === index ? 'outline-item selected' : 'outline-item'} onClick={() => setSelected(index)}>
        <span className="outline-number">{String(index + 1).padStart(2, '0')}</span>
        <span><b>{item.title}</b><small>{item.note}</small></span>
        <ChevronRight size={16}/>
      </button>)}
    </div>
    <div className="canvas-bottom"><span>生成 PPTX</span><span className="muted-pill">待真实集成</span></div>
  </aside>
}

function ServiceCenter({ filter, onFilter, onOpen, onBack }: {
  filter: Filter; onFilter: (value: Filter) => void; onOpen: (item: Service) => void; onBack: () => void
}) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { searchRef.current?.focus() }, [])
  const query = search.trim().toLowerCase()
  const visible = catalog.filter(item => (filter === 'all' || (filter === 'download' ? item.type === 'windows' : item.category === filter)) &&
    (item.name + item.description).toLowerCase().includes(query))
  const filters: { label: string; value: Filter }[] = [
    { label: '全部', value: 'all' }, { label: 'AI 应用', value: 'ai' },
    { label: '办公服务', value: 'office' }, { label: '下载中心', value: 'download' },
  ]
  return <div className="services-page">
    <div className="services-header">
      <button type="button" className="back-to-chat" onClick={onBack}><ChevronLeft size={16}/> 返回对话</button>
      <h1>探索工作所需的一切</h1>
      <p>AI 应用、办公服务和客户端，集中在一个地方。</p></div>
    <div className="service-toolbar">
      <div className="service-search"><Search size={18}/>
        <input ref={searchRef} aria-label="搜索应用" value={search}
          onChange={event => setSearch(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape' && search) { event.stopPropagation(); setSearch('') } }}
          placeholder="搜索应用名称或用途" />
        {search && <button type="button" className="search-clear" aria-label="清除搜索"
          onClick={() => { setSearch(''); searchRef.current?.focus() }}><X size={15}/></button>}
      </div>
      <div className="service-filters" role="group" aria-label="服务分类">
        {filters.map(item => <button key={item.value} type="button" onClick={() => onFilter(item.value)}
          className={filter === item.value ? 'filter active' : 'filter'}>{item.label}</button>)}
      </div>
    </div>
    <p className="service-result-count" role="status">{query ? `找到 ${visible.length} 个匹配服务` : `共 ${visible.length} 个服务`}</p>
    <div className="service-grid">
      {visible.map(item => <article className="service-card" key={item.id}>
        <div className="service-card-top"><div className="service-icon"><ServiceIcon service={item}/></div>
          <span className="service-kind">{item.demo ? 'UI DEMO' : item.type === 'windows' ? 'WINDOWS' : 'WEB'}</span></div>
        <h2>{item.name}</h2><p>{item.description}</p>
        <button type="button" className="service-action" onClick={() => onOpen(item)}
          disabled={!item.demo && !item.url}>
          {item.demo ? '进入交互演示' : item.url ? (item.type === 'windows' ? '下载客户端' : '打开服务') : '地址待配置'}
          {item.demo ? <ArrowRight size={15}/> : item.url ? (item.type === 'windows' ? <ArrowDownToLine size={15}/> : <ExternalLink size={15}/>) : null}
        </button>
      </article>)}
    </div>
    {visible.length === 0 && <div className="empty-services">
      <p>没有找到匹配的服务。</p>
      <button type="button" onClick={() => { setSearch(''); onFilter('all'); searchRef.current?.focus() }}>查看全部服务</button>
    </div>}
    <p className="services-note">真实服务链接通过内部部署配置提供。未配置的入口不会打开虚构地址。</p>
  </div>
}

export default function App() {
  const [view, setView] = useState<View>('chat')
  const [filter, setFilter] = useState<Filter>('all')
  const [presentationDemo, setPresentationDemo] = useState(false)
  const [recommendation, setRecommendation] = useState<Service | null>(null)
  const [apiState, setApiState] = useState<'ready' | 'missing' | 'offline' | 'demo'>('offline')
  const [, setConfigVersion] = useState(0)
  const [mobileNav, setMobileNav] = useState(false)
  const demoRef = useRef(false)

  function setDemo(next: boolean) { demoRef.current = next; setPresentationDemo(next) }

  const adapter = useMemo<ChatModelAdapter>(() => ({
    async *run({ messages, abortSignal }) {
      const last = [...messages].reverse().find(message => message.role === 'user')
      const input = last?.content.filter(part => part.type === 'text').map(part => part.text).join('\n') || ''
      const asksForPpt = /ppt|幻灯片|演示文稿|做个汇报|制作汇报/i.test(input)
      setRecommendation(null)
      if (asksForPpt || demoRef.current) {
        if (!demoRef.current) {
          demoRef.current = true
          setPresentationDemo(true)
          setView('chat')
        }
        yield { content: [{ type: 'text', text: asksForPpt
          ? '已打开 AI Presentation 的交互原型。右侧是模拟故事板，可以切换页面查看布局。真实需求讨论、内容修改与 PPTX 生成尚未接入。'
          : '当前是 AI Presentation 界面原型，暂不处理真实 PPT 修改。后续将把这条消息交给 Presentation 服务，并同步更新右侧 Canvas。' }] }
        return
      }
      const service = suggestedService(input)
      if (service) {
        setRecommendation(service)
        yield { content: [{ type: 'text', text: `你可以使用「${service.name}」完成这项工作。我已在下方展示应用入口。${service.url ? '点击后会打开已配置的内部服务。' : '当前尚未配置内部地址，可先到服务中心查看入口。'}（本次为关键词推荐演示，尚未接入 AI 意图路由。）` }] }
        return
      }
      if (/龙小智.*(能做|功能)|介绍.*龙小智/i.test(input)) {
        yield { content: [{ type: 'text', text: '我可以与你日常交流，也可以帮助你找到 AI Gemba、龙小智会议助手等工具。AI Presentation 的右侧工作区正在演示阶段；尚未开放的服务不会冒充已连接。' }] }
        return
      }
      try {
        const response = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abortSignal,
          body: JSON.stringify({ messages: messages.filter(message => message.role === 'user' || message.role === 'assistant')
            .map(message => ({ role: message.role, content: message.content.filter(part => part.type === 'text').map(part => part.text).join('\n') })).filter(message => message.content.trim()).slice(-40) }),
        })
        if (!response.ok || !response.body) throw new Error(response.status === 422 || response.status === 413 ? '对话过长或格式无效，请缩短消息或开始新对话。' : 'AI 后端不可用（HTTP ' + response.status + '），请检查启动窗口后重试。')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = '', text = '', reasoning = ''
        let completed = false
        try {
        while (true) {
          const { value, done } = await reader.read()
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
          const lines = (buffer + (done && !buffer.endsWith('\n') ? '\n' : '')).split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            let event: StreamEvent
            try { event = JSON.parse(line) as StreamEvent } catch { continue }
            if (event.type === 'reasoning_delta') reasoning += event.content || ''
            if (event.type === 'answer_delta') text += event.content || ''
            if (event.type === 'completed' || event.type === 'error') completed = true
            if (event.type === 'error') text += '\n\n' + (event.content || 'AI 服务暂时不可用')
            if (event.type === 'answer_delta' || event.type === 'reasoning_delta' || event.type === 'error') {
              yield { content: [
                ...(reasoning ? [{ type: 'reasoning' as const, text: reasoning }] : []),
                ...(text ? [{ type: 'text' as const, text }] : []),
              ] }
            }
          }
          if (done) break
        }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
        if (!completed) text += '\n\n连接提前结束，回答可能不完整，请重试。'
        if (!completed) yield { content: [{ type: 'text', text }] }
        if (!text && !reasoning) yield { content: [{ type: 'text', text: '本次请求未返回有效内容。' }] }
      } catch (error) {
        if (abortSignal.aborted) return
        yield { content: [{ type: 'text', text: error instanceof Error && (error.message.startsWith('AI 后端') || error.message.startsWith('对话过长')) ? error.message : '无法连接 AI 后端。请检查启动窗口，然后重新发送消息。' }] }
      }
    },
  }), [])
  const runtime = useLocalRuntime(adapter)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/health', { signal: controller.signal })
      .then(response => response.json()).then(data => setApiState(data.mode === 'demo' ? 'demo' : data.deepseek === 'configured' ? 'ready' : 'missing'))
      .catch(() => { if (!controller.signal.aborted) setApiState('offline') })
    fetch('/api/config', { signal: controller.signal }).then(response => response.json()).then(data => {
      if (data.links && !controller.signal.aborted) { applyRuntimeLinks(data.links); setConfigVersion(v => v + 1) }
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (mobileNav) setMobileNav(false)
      else if (presentationDemo && view === 'chat') setDemo(false)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [mobileNav, presentationDemo, view])

  function navigate(next: View, nextFilter: Filter = 'all') {
    setView(next); setFilter(nextFilter); setMobileNav(false)
  }
  function openService(item: Service) {
    if (item.demo) { setDemo(true); navigate('chat'); return }
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
  }
  function newChat() { runtime.thread.cancelRun(); runtime.thread.reset(); setDemo(false); setRecommendation(null); navigate('chat') }

  return <AssistantRuntimeProvider runtime={runtime}>
    <div className={presentationDemo && view === 'chat' ? 'portal-shell with-canvas' : 'portal-shell'}>
      <aside id="portal-sidebar" className={mobileNav ? 'sidebar mobile-open' : 'sidebar'}>
        <div className="sidebar-brand"><BrandMark/><div><strong>LOONG AI</strong><span>Ask · Analyze · Act</span></div></div>
        <button className="new-chat" type="button" onClick={newChat}><Plus size={17}/> 新对话</button>
        <div className="nav-section-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="主要导航">
          <button type="button" className={view === 'chat' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('chat')}>
            <MessageSquareText size={18}/> 龙小智助手
          </button>
          <button type="button" className={view === 'services' && filter === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('services')}>
            <Grid2X2 size={18}/> 全部服务
          </button>
        </nav>
        <div className="nav-section-label nav-label-spaced">SERVICES</div>
        <nav className="side-nav" aria-label="服务分类">
          <button type="button" className={view === 'services' && filter === 'ai' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('services','ai')}><Sparkles size={18}/> AI 应用</button>
          <button type="button" className={view === 'services' && filter === 'office' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('services','office')}><Link2 size={18}/> 办公服务</button>
          <button type="button" className={view === 'services' && filter === 'download' ? 'nav-item active' : 'nav-item'} onClick={() => navigate('services','download')}><ArrowDownToLine size={18}/> 下载中心</button>
        </nav>
        <div className="sidebar-spacer"/>
        <div className="sidebar-bottom"><div className="avatar-placeholder">L</div><div><b>LOONG AI Portal</b><small>本地版 · 会话不保存</small></div></div>
      </aside>
      {mobileNav && <button type="button" className="mobile-overlay" aria-label="关闭导航" onClick={() => setMobileNav(false)}/>}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-action mobile-menu" aria-expanded={mobileNav} aria-controls="portal-sidebar" onClick={() => setMobileNav(true)} aria-label="打开导航"><Menu size={19}/></button>
            <div className="topbar-breadcrumb"><Home size={16}/><ChevronRight size={14}/><span>{view === 'chat' ? '龙小智助手' : '服务中心'}</span></div>
            {presentationDemo && view === 'chat' && <span className="active-task-badge"><FileText size={14}/> Presentation · Demo</span>}
          </div>
          <div className="topbar-right"><span className="system-state"><i className={apiState === 'ready' ? 'status-dot green' : 'status-dot'} />{apiState === 'demo' ? '本地演示 · 非真实 AI' : apiState === 'ready' ? 'AI 已配置' : apiState === 'missing' ? 'AI 待配置' : '后端未连接'}</span>
            {presentationDemo && view === 'chat' && <button type="button" className="icon-action canvas-toggle" aria-label="关闭演示工作区" onClick={() => setDemo(false)}><PanelRightClose size={19}/></button>}
          </div>
        </header>
        {view === 'chat' ? <ChatPane demo={presentationDemo} recommendation={recommendation}
          onOpenServices={() => navigate('services')}
          onOpenService={openService} onBrowseCategory={filter => navigate('services', filter)}
          onOpenRecommendation={() => recommendation && (recommendation.url ? openService(recommendation) : navigate('services', recommendation.category))}/> :
          <ServiceCenter filter={filter} onFilter={setFilter} onOpen={openService} onBack={() => navigate('chat')}/>}
      </main>
      {view === 'chat' && presentationDemo && <PresentationCanvas onClose={() => setDemo(false)} />}
    </div>
  </AssistantRuntimeProvider>
}
