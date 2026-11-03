import { beforeEach, describe, expect, it } from 'vitest'
import {
  HISTORY_KEY, MAX_MESSAGES, MAX_THREADS, emptyHistory, loadHistory, newThread, normalizeMessages,
  removeThread, renameThread, saveSnapshot, selectThread, type SavedMessage,
} from './history'

beforeEach(() => window.localStorage.clear())

const user = (text: string): SavedMessage =>
  ({ role: 'user', content: [{ type: 'text', text }] })
const answer = (text: string): SavedMessage =>
  ({ role: 'assistant', content: [{ type: 'text', text }] })

describe('browser-local thread history', () => {
  it('creates, names, switches and resumes independent conversations', () => {
    const first = emptyHistory()
    const saved = saveSnapshot(first, first.activeId, [user('帮我看看今天的工作'), answer('好的')])
    expect(saved.threads[0].title).toBe('帮我看看今天的工作')
    const second = newThread(saved)
    expect(second.activeId).not.toBe(first.activeId)
    expect(second.threads).toHaveLength(1)
    const appended = saveSnapshot(second, second.activeId, [user('第二个问题')])
    const restored = selectThread(appended, first.activeId)
    expect(restored.activeId).toBe(first.activeId)
    expect(restored.threads.find(t => t.id === first.activeId)?.messages).toEqual([user('帮我看看今天的工作'), answer('好的')])
  })

  it('preserves manual titles when subsequent replies arrive', () => {
    const first = emptyHistory()
    const withMessage = saveSnapshot(first, first.activeId, [user('自动标题')])
    const renamed = renameThread(withMessage, first.activeId, '  手动标题  ')
    const withReply = saveSnapshot(renamed, first.activeId, [user('自动标题'), answer('收到')])
    expect(withReply.threads[0].title).toBe('手动标题')
    expect(withReply.threads[0].customTitle).toBe(true)
  })

  it('removes the selected thread and resets only that conversation', () => {
    const first = emptyHistory()
    const withMessage = saveSnapshot(first, first.activeId, [user('要删除')])
    const deleted = removeThread(withMessage, first.activeId)
    expect(deleted.threads).toHaveLength(0)
    expect(deleted.activeId).not.toBe(first.activeId)
  })

  it('restores valid data and fails safely on malformed storage', () => {
    const state = emptyHistory()
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(saveSnapshot(state, state.activeId, [user('恢复测试')])))
    const valid = loadHistory()
    expect(valid.warning).toBe(false)
    expect(valid.history.threads[0].title).toBe('恢复测试')
    window.localStorage.setItem(HISTORY_KEY, '{broken')
    const broken = loadHistory()
    expect(broken.warning).toBe(true)
    expect(broken.history.threads).toHaveLength(0)
  })

  it('bounds saved transcript size and conversation count', () => {
    const messages = Array.from({ length: MAX_MESSAGES + 15 }, (_, i) => user(String(i)))
    expect(normalizeMessages(messages)).toHaveLength(MAX_MESSAGES)
    let history = emptyHistory()
    for (let i = 0; i < MAX_THREADS + 2; i++) {
      history = saveSnapshot(history, history.activeId, [user('对话 ' + i)])
      history = newThread(history)
    }
    expect(history.threads).toHaveLength(MAX_THREADS)
    expect(history.threads[0].title).toBe('对话 ' + (MAX_THREADS + 1))
  })

  it('does not add empty conversations to the history list', () => {
    const state = emptyHistory()
    expect(saveSnapshot(state, state.activeId, [])).toBe(state)
    expect(newThread(state).threads).toHaveLength(0)
  })
})
