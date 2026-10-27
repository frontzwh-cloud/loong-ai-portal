import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ConversationHistory } from './ConversationHistory'
import type { SavedThread } from './history'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const example: SavedThread = {
  id: 'history-1', title: '第一段对话', customTitle: false, updatedAt: 123,
  messages: [{ role: 'user', content: [{ type: 'text', text: '你好' }] }],
}

describe('conversation history controls', () => {
  it('switches and renames a conversation without changing message content', () => {
    const onSelect = vi.fn(), onRename = vi.fn()
    render(<ConversationHistory threads={[example]} currentId="other" onSelect={onSelect}
      onRename={onRename} onDelete={vi.fn()} onClear={vi.fn()}/>)
    fireEvent.click(screen.getByRole('button', { name: '打开对话：第一段对话' }))
    expect(onSelect).toHaveBeenCalledWith('history-1')
    fireEvent.click(screen.getByRole('button', { name: '重命名对话：第一段对话' }))
    fireEvent.change(screen.getByRole('textbox', { name: '对话标题' }), { target: { value: '改名成功' } })
    fireEvent.click(screen.getByRole('button', { name: '保存标题' }))
    expect(onRename).toHaveBeenCalledWith('history-1', '改名成功')
  })

  it('confirms deletion and full clear', () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const onDelete = vi.fn(), onClear = vi.fn()
    render(<ConversationHistory threads={[example]} currentId="history-1" onSelect={vi.fn()}
      onRename={vi.fn()} onDelete={onDelete} onClear={onClear}/>)
    fireEvent.click(screen.getByRole('button', { name: '删除对话：第一段对话' }))
    expect(onDelete).toHaveBeenCalledWith('history-1')
    fireEvent.click(screen.getByRole('button', { name: '清空全部历史对话' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
