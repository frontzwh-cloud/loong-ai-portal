import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminLinks } from './AdminLinks'

const blank = { gemba: '', meeting: '', knowledge: '', workflow: '', pdf: '', tools: '' }
beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState({}, '', '/admin')
})
afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
  vi.unstubAllGlobals()
})

describe('loopback-only passwordless application settings', () => {
  it('automatically loads and saves the Meeting Assistant download URL', async () => {
    const url = 'https://example.test/download/meeting'
    const fetcher = vi.fn(async (_url: string, options?: RequestInit) => ({
      ok: true,
      json: async () => ({ links: options?.method === 'PUT' ? { ...blank, meeting: url } : blank }),
    }))
    vi.stubGlobal('fetch', fetcher)
    const onSaved = vi.fn()
    render(<AdminLinks onSaved={onSaved} />)
    await waitFor(() => expect(screen.getByLabelText('下载页 URL')).toBeTruthy())
    expect(screen.queryByLabelText('管理员密钥')).toBeNull()
    fireEvent.change(screen.getByLabelText('下载页 URL'), { target: { value: url } })
    fireEvent.click(screen.getByRole('button', { name: '保存链接配置' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ meeting: url })))
    expect(fetcher).toHaveBeenCalledWith('/api/admin/links', expect.objectContaining({ method: 'PUT' }))
    for (const [,options] of fetcher.mock.calls) {
      expect(JSON.stringify(options || {})).not.toContain('Authorization')
    }
    expect(window.localStorage.length).toBe(0)
  })

  it('rejects invalid navigation URLs before sending a mutation', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ links: blank }) }))
    vi.stubGlobal('fetch', fetcher)
    render(<AdminLinks onSaved={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('下载页 URL')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('下载页 URL'), { target: { value: 'javascript:alert(1)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存链接配置' }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
