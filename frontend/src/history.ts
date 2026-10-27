// V0 local-only history. No backend storage or cross-user sharing without authentication.
export type SavedPart = { type: 'text' | 'reasoning'; text: string }
export type SavedMessage = { id?: string; role: 'user' | 'assistant'; content: SavedPart[] }
export type SavedThread = {
  id: string
  title: string
  customTitle: boolean
  updatedAt: number
  messages: SavedMessage[]
}
export type HistoryState = { activeId: string; threads: SavedThread[] }

export const HISTORY_KEY = 'loong-ai-portal.chat-history.v1'
export const MAX_THREADS = 20
export const MAX_MESSAGES = 40
const MAX_THREAD_CHARS = 64000

function id(): string {
  return 'chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)
}

export function emptyHistory(): HistoryState {
  return { activeId: id(), threads: [] }
}

export function normalizeMessages(input: unknown): SavedMessage[] {
  if (!Array.isArray(input)) return []
  const normalized: SavedMessage[] = []
  for (const value of input.slice(-MAX_MESSAGES)) {
    if (!value || typeof value !== 'object') continue
    const m = value as Record<string, unknown>
    if (m.role !== 'user' && m.role !== 'assistant') continue
    if (!Array.isArray(m.content)) continue
    const parts: SavedPart[] = []
    for (const part of m.content) {
      if (!part || typeof part !== 'object') continue
      const p = part as Record<string, unknown>
      if ((p.type === 'text' || p.type === 'reasoning') && typeof p.text === 'string' && p.text.length > 0 && p.text.length <= 16000) {
        parts.push({ type: p.type, text: p.text })
      }
    }
    if (!parts.length) continue
    normalized.push({ ...(typeof m.id === 'string' && m.id.length < 100 ? { id: m.id } : {}), role: m.role, content: parts })
  }
  let size = normalized.reduce((total, message) =>
    total + message.content.reduce((partTotal, part) => partTotal + part.text.length, 0), 0)
  while (normalized.length > 1 && size > MAX_THREAD_CHARS) {
    const removed = normalized.shift()!
    size -= removed.content.reduce((total, part) => total + part.text.length, 0)
  }
  return normalized
}

export function loadHistory(): { history: HistoryState; warning: boolean } {
  try {
    const stored = window.localStorage.getItem(HISTORY_KEY)
    if (!stored) return { history: emptyHistory(), warning: false }
    const input: unknown = JSON.parse(stored)
    if (!input || typeof input !== 'object' || !Array.isArray((input as HistoryState).threads))
      return { history: emptyHistory(), warning: true }
    const source = input as Record<string, unknown>
    const threads: SavedThread[] = []
    const seen = new Set<string>()
    for (const candidate of (source.threads as unknown[]).slice(0, MAX_THREADS)) {
      if (!candidate || typeof candidate !== 'object') continue
      const thread = candidate as Record<string, unknown>
      if (typeof thread.id !== 'string' || thread.id.length > 100 || seen.has(thread.id)) continue
      const messages = normalizeMessages(thread.messages)
      if (!messages.length) continue
      seen.add(thread.id)
      threads.push({
        id: thread.id,
        title: typeof thread.title === 'string' ? thread.title.slice(0, 60) : '未命名对话',
        customTitle: thread.customTitle === true,
        updatedAt: typeof thread.updatedAt === 'number' && Number.isFinite(thread.updatedAt) ? thread.updatedAt : 0,
        messages,
      })
    }
    threads.sort((a, b) => b.updatedAt - a.updatedAt)
    const activeId = typeof source.activeId === 'string' && (threads.some(t => t.id === source.activeId) || source.activeId.length < 100)
      ? source.activeId : (threads[0]?.id || id())
    return { history: { activeId, threads }, warning: false }
  } catch {
    return { history: emptyHistory(), warning: true }
  }
}

export function titleFromMessages(messages: SavedMessage[]): string {
  const first = messages.find(m => m.role === 'user')
  const text = first?.content.filter(p => p.type === 'text').map(p => p.text).join(' ').trim().replace(/\s+/g, ' ') || '新对话'
  return text.length > 25 ? text.slice(0, 25) + '…' : text
}

export function saveSnapshot(state: HistoryState, threadId: string, input: SavedMessage[]): HistoryState {
  const messages = normalizeMessages(input)
  if (!messages.length) return state
  const previous = state.threads.find(t => t.id === threadId)
  if (previous && JSON.stringify(previous.messages) === JSON.stringify(messages)) return state
  const thread: SavedThread = {
    id: threadId,
    title: previous?.customTitle ? previous.title : titleFromMessages(messages),
    customTitle: previous?.customTitle || false,
    updatedAt: Date.now(),
    messages,
  }
  return { ...state, threads: [thread, ...state.threads.filter(t => t.id !== threadId)].slice(0, MAX_THREADS) }
}

export function selectThread(state: HistoryState, threadId: string): HistoryState {
  return state.threads.some(t => t.id === threadId) ? { ...state, activeId: threadId } : state
}

export function newThread(state: HistoryState): HistoryState {
  return { ...state, activeId: id() }
}

export function renameThread(state: HistoryState, threadId: string, name: string): HistoryState {
  const title = name.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (!title) return state
  return { ...state, threads: state.threads.map(t =>
    t.id === threadId ? { ...t, title, customTitle: true } : t) }
}

export function removeThread(state: HistoryState, threadId: string): HistoryState {
  const threads = state.threads.filter(t => t.id !== threadId)
  return { threads, activeId: state.activeId === threadId ? id() : state.activeId }
}
