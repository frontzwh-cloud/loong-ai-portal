import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'

beforeEach(() => {
  window.localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ status: 'ok', deepseek: 'not_configured' }),
  })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('LOONG AI Portal UI prototype', () => {
  it('does not expose the private admin editor in public navigation', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: '应用链接管理' })).toBeNull()
  })

  it('shows the chat-first entry point', () => {
    render(<App />)
    expect(screen.getByText('你好，我是龙小智')).toBeTruthy()
    expect(screen.getByRole('img', { name: '龙小智完整形象' })).toBeTruthy()
    expect(screen.getAllByRole('img', { name: '龙小智头像' }).length).toBeGreaterThan(0)
    const quick = within(screen.getByRole('region', { name: '快捷启动' }))
    expect(quick.getByRole('button', { name: 'AI Presentation，界面演示' })).toBeTruthy()
    expect(quick.getByRole('button', { name: 'AI Gemba，地址待配置' })).toHaveProperty('disabled', true)
    expect(quick.getByRole('button', { name: 'Workflow，地址待配置' })).toHaveProperty('disabled', true)
  })

  it('opens Presentation from the homepage and browses office tools without losing chat', () => {
    render(<App />)
    const quick = within(screen.getByRole('region', { name: '快捷启动' }))
    fireEvent.click(quick.getByRole('button', { name: '查看全部' }))
    expect(screen.getByText('探索工作所需的一切')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '龙小智助手' }))
    fireEvent.click(within(screen.getByRole('region', { name: '快捷启动' })).getByRole('button', { name: 'AI Presentation，界面演示' }))
    expect(screen.getByText('Presentation Canvas')).toBeTruthy()
  })

  it('lists a Windows AI app in both AI apps and Download Center', () => {
    render(<App />)
    fireEvent.click(within(screen.getByRole('region', { name: '快捷启动' })).getByRole('button', { name: '全部 AI 应用' }))
    expect(screen.getByRole('heading', { name: '龙小智会议助手' })).toBeTruthy()
    fireEvent.click(within(screen.getByRole('group', { name: '服务分类' })).getByRole('button', { name: '下载中心' }))
    expect(screen.getByRole('heading', { name: '龙小智会议助手' })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'AI Gemba' })).toBeNull()
  })

  it('focuses service search, recovers from empty results and returns to conversation', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '全部服务' }))
    const search = screen.getByRole('textbox', { name: '搜索应用' }) as HTMLInputElement
    expect(document.activeElement).toBe(search)
    fireEvent.change(search, { target: { value: 'no_matching_service_123' } })
    expect(screen.getByText('没有找到匹配的服务。')).toBeTruthy()
    expect(screen.getByText('找到 0 个匹配服务')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看全部服务' }))
    expect(search.value).toBe('')
    expect(screen.getByRole('heading', { name: 'AI Gemba' })).toBeTruthy()
    fireEvent.change(search, { target: { value: 'AI Gemba' } })
    expect(screen.getByText('找到 1 个匹配服务')).toBeTruthy()
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search.value).toBe('')
    fireEvent.click(screen.getByRole('button', { name: '返回对话' }))
    expect(screen.getByText('你好，我是龙小智')).toBeTruthy()
  })

  it('dismisses the mobile navigation and demo Canvas with Escape', () => {
    render(<App />)
    const menu = screen.getByRole('button', { name: '打开导航' })
    fireEvent.click(menu)
    expect(menu.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(menu.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(within(screen.getByRole('region', { name: '快捷启动' }))
      .getByRole('button', { name: 'AI Presentation，界面演示' }))
    expect(screen.getByText('Presentation Canvas')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('Presentation Canvas')).toBeNull()
  })

  it('navigates to the service directory and keeps unknown links disabled', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '全部服务' }))
    expect(screen.getByText('探索工作所需的一切')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('group', { name: '服务分类' })).getByRole('button', { name: '办公服务' }))
    const unconfigured = screen.getAllByRole('button', { name: '地址待配置' })
    expect(unconfigured.length).toBeGreaterThan(0)
    expect(unconfigured.every(item => (item as HTMLButtonElement).disabled)).toBe(true)
  })

  it('opens an explicitly simulated Presentation Canvas and changes the selected slide', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '全部服务' }))
    fireEvent.click(screen.getByRole('button', { name: '进入交互演示' }))
    expect(screen.getByText('Presentation Canvas')).toBeTruthy()
    expect(screen.getByText('此处为模拟故事板，不代表 PPT 已生成。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByText('第 2 / 4 页')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭工作区' }))
    expect(screen.queryByText('Presentation Canvas')).toBeNull()
  })

  it('recommends an application inside the conversation without inventing a URL', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('向龙小智提问，或描述你想完成的工作...'), {
      target: { value: '我想看一下产线 OEE' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => expect(screen.getByText('应用推荐 · 关键词演示')).toBeTruthy())
    expect(screen.getByText('内部服务地址尚未配置')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '查看服务' }))
    expect(screen.getByText('探索工作所需的一切')).toBeTruthy()
  })

  it('opens the application directory from the composer and retains chat context', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('向龙小智提问，或描述你想完成的工作...'), {
      target: { value: '我想看一下产线 OEE' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => expect(screen.getByText('应用推荐 · 关键词演示')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '打开应用中心' }))
    expect(screen.getByText('探索工作所需的一切')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '龙小智助手' }))
    expect(screen.getByText('应用推荐 · 关键词演示')).toBeTruthy()
  })

  it('keeps one chat across reloads, then deletes it without resurrecting the old content', async () => {
    const first = render(<App />)
    fireEvent.change(screen.getByPlaceholderText('向龙小智提问，或描述你想完成的工作...'), {
      target: { value: '我的本地历史测试' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '打开对话：我的本地历史测试' })).toBeTruthy())
    await waitFor(() => expect(window.localStorage.getItem('loong-ai-portal.chat-history.v1')).toContain('我的本地历史测试'))
    first.unmount()

    const second = render(<App />)
    expect(screen.getByRole('button', { name: '打开对话：我的本地历史测试' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '新对话' }))
    expect(screen.getByText('你好，我是龙小智')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '打开对话：我的本地历史测试' }))
    expect(screen.getAllByText('我的本地历史测试').length).toBeGreaterThan(0)
    vi.stubGlobal('confirm', vi.fn(() => true))
    fireEvent.click(screen.getByRole('button', { name: '删除对话：我的本地历史测试' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '打开对话：我的本地历史测试' })).toBeNull())
    second.unmount()

    render(<App />)
    expect(screen.queryByRole('button', { name: '打开对话：我的本地历史测试' })).toBeNull()
  })

})
