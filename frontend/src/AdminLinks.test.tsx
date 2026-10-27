import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminLinks } from './AdminLinks'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('protected app link management', () => {
  it('keeps secrets in memory and saves Meeting Assistant download page', async () => {
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return
    const url = 'https://internal.example.test/meeting-download'
    const links = { gemba: '', meeting: '', knowledge: '', workflow: '', pdf: '', tools: '' }
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => {
      const responseLinks = options?.method === 'PUT' ? { ...links, meeting: url } : links
      return { ok: true, json: async () => ({ links: responseLinks }) }
    })
    vi.stubGlobal('fetch', fetcher)
    const onSaved = vi.fn()
    render(<AdminLinks onSaved={onSaved}/>)
    fireEvent.change(screen.getByLabelText('管理员密钥'), { target: { value: 'x'.repeat(64) } })
    fireEvent.click(screen.getByRole('button', { name: '验证并读取配置' }))
    await waitFor(() => expect(screen.getByLabelText('下载页 URL')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('下载页 URL'), { target: { value: url } })
    fireEvent.click(screen.getByRole('button', { name: '保存链接配置' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(onSaved.mock.calls[0][0].meeting).toBe(url)
    expect(fetcher).toHaveBeenCalledWith('/api/admin/links', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: 'Bearer ' + 'x'.repeat(64) }),
    }))
    expect(window.localStorage.length).toBe(0)
  })

  it('refuses an unsafe URL before submitting it', async () => {
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return
    const links = { gemba: '', meeting: '', knowledge: '', workflow: '', pdf: '', tools: '' }
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ links }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<AdminLinks onSaved={vi.fn()}/>)
    fireEvent.change(screen.getByLabelText('管理员密钥'), { target: { value: 'x'.repeat(64) } })
    fireEvent.click(screen.getByRole('button', { name: '验证并读取配置' }))
    await waitFor(() => expect(screen.getByLabelText('下载页 URL')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('下载页 URL'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存链接配置' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
