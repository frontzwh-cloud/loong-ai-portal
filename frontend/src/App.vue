<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

type Message = { role: 'user' | 'assistant'; content: string; reasoning?: string; loading?: boolean; error?: boolean }
type Event = { type: string; content?: string }

const messages = ref<Message[]>([])
const input = ref('')
const busy = ref(false)
const activeNav = ref('AI 对话')
const selectedApp = ref('')
const apiStatus = ref('检查中')
const chatEnd = ref<HTMLElement | null>(null)
const suggestions = ['帮我分析昨日产线异常', '打开会议助手', '查询本月 KPI 趋势']
const apps = [
  { icon: '◫', name: '会议助手', note: '预约与会议协作', url: '' },
  { icon: '⌁', name: '知识库', note: 'Demo 入口', url: '' },
  { icon: '▦', name: 'Power BI', note: '配置 URL 后进入', url: '' },
  { icon: '◈', name: 'MES 查询', note: 'Demo 入口', url: '' },
  { icon: '◇', name: 'QMS', note: 'Demo 入口', url: '' },
]

const lastAssistant = computed(() => [...messages.value].reverse().find((message) => message.role === 'assistant'))

async function scrollToEnd() {
  await nextTick()
  chatEnd.value?.scrollIntoView({ behavior: 'smooth' })
}

async function checkHealth() {
  try {
    const response = await fetch('http://localhost:8000/api/health')
    const data = await response.json()
    apiStatus.value = data.deepseek === 'configured' ? '已连接' : '待配置'
  } catch {
    apiStatus.value = '后端未启动'
  }
}

async function send(text = input.value) {
  const content = text.trim()
  if (!content || busy.value) return
  input.value = ''
  messages.value.push({ role: 'user', content })
  const assistant: Message = { role: 'assistant', content: '', reasoning: '', loading: true }
  messages.value.push(assistant)
  busy.value = true
  await scrollToEnd()
  try {
    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.value.filter((m) => !m.loading).map(({ role, content: message }) => ({ role, content: message })) }),
    })
    if (!response.ok || !response.body) throw new Error('连接后端失败')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        const event = JSON.parse(line) as Event
        if (event.type === 'reasoning_delta') assistant.reasoning += event.content || ''
        if (event.type === 'answer_delta') assistant.content += event.content || ''
        if (event.type === 'error') { assistant.error = true; assistant.content = event.content || '请求失败' }
        await scrollToEnd()
      }
      if (done) break
    }
  } catch (error) {
    assistant.error = true
    assistant.content = error instanceof Error ? error.message : '请求失败，请稍后重试。'
  } finally {
    assistant.loading = false
    busy.value = false
    await scrollToEnd()
  }
}

function enterApp(app: typeof apps[number]) {
  selectedApp.value = app.name
  if (app.url) window.open(app.url, '_blank', 'noopener')
}

checkHealth()
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">L</div><div><strong>LOONG <span>AI</span></strong><small>Ask · Analyze · Act</small></div></div>
      <div class="aumovio">AUMOVIO <span>Intelligent mobility</span></div>
      <nav><button v-for="item in ['AI 对话', '首页', '知识库', '应用广场', '数据分析', '会议助手']" :key="item" :class="{ active: activeNav === item }" @click="activeNav = item"><i>{{ ['✦','⌂','⌁','▦','⌁','◫'][['AI 对话', '首页', '知识库', '应用广场', '数据分析', '会议助手'].indexOf(item)] }}</i>{{ item }}</button></nav>
      <div class="sidebar-footer"><div class="avatar">L</div><div><b>Demo workspace</b><small>AUMOVIO · Portal</small></div><span>•••</span></div>
    </aside>

    <main class="main">
      <header><div><p class="eyebrow">AUMOVIO · UNIFIED AI ENTRY</p><h1>你好，我是 <em>Loong AI</em></h1><p class="subtitle">面向 AUMOVIO 工厂场景的统一 AI 入口</p></div><div class="header-actions"><button class="icon-button">⌕</button><button class="help">?</button></div></header>
      <section v-if="messages.length === 0" class="hero"><div class="hero-orbit"><div class="hero-logo">L<span>AI</span></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div></div><div class="hero-copy"><h2>让每个问题，都有清晰的下一步。</h2><p>从日常协作到工厂洞察，和你的 AI 同事一起工作。</p></div><div class="suggestions"><button v-for="suggestion in suggestions" :key="suggestion" @click="send(suggestion)">{{ suggestion }} <span>↗</span></button></div></section>
      <section v-else class="conversation"><article v-for="(message, index) in messages" :key="index" :class="['message', message.role]"><div v-if="message.role === 'assistant'" class="message-avatar">L</div><div class="bubble"><div v-if="message.role === 'assistant' && message.reasoning" class="reasoning"><div class="section-title"><span>✦</span> 思考过程 <b>⌃</b></div><p>{{ message.reasoning }}</p></div><div v-if="message.role === 'assistant'" class="answer"><div class="section-title">最终回答 <span v-if="message.loading" class="typing">●●●</span></div><p :class="{ error: message.error }">{{ message.content || (message.loading ? '正在连接 DeepSeek…' : '') }}</p></div><p v-else>{{ message.content }}</p></div></article><div ref="chatEnd"></div></section>
      <div class="composer"><textarea v-model="input" :disabled="busy" placeholder="输入问题，或直接让 AI 打开应用 / 查询信息..." @keydown.enter.exact.prevent="send()" @keydown.enter.shift.stop></textarea><div class="composer-bottom"><span>Enter 发送 · Shift + Enter 换行</span><button class="send" :disabled="busy || !input.trim()" @click="send()">{{ busy ? '…' : '↑' }}</button></div></div>
      <footer><span>LOONG AI Portal <b>·</b> Demo environment</span><span>Powered by <strong>DeepSeek</strong></span></footer>
    </main>

    <aside class="rightbar"><div class="right-heading"><div><p class="eyebrow">WORKSPACE</p><h3>常用应用</h3></div><button class="more">•••</button></div><div class="app-list"><button v-for="app in apps" :key="app.name" class="app-card" :class="{ selected: selectedApp === app.name }" @click="enterApp(app)"><span class="app-icon">{{ app.icon }}</span><span><b>{{ app.name }}</b><small>{{ app.note }}</small></span><span class="arrow">↗</span></button></div><div class="status-card"><p class="eyebrow">SYSTEM STATUS</p><div class="status-row"><span><i class="dot" :class="{ warning: apiStatus !== '已连接' }"></i>DeepSeek API</span><b>{{ apiStatus }}</b></div><div class="status-row"><span><i class="dot warning"></i>Knowledge</span><b>Demo</b></div><div class="status-row"><span><i class="dot warning"></i>SSO</span><b>Demo</b></div></div><div class="side-note"><span>✦</span><div><b>从这里开始</b><p>探索你的 AI 工作空间，所有入口都在这里。</p></div></div></aside>
  </div>
</template>

