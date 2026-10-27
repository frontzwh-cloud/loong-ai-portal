import { describe, expect, it } from 'vitest'
import { safeLink } from './catalog'

describe('configured navigation links', () => {
  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'https://user:password@example.com', '//example.com', '', null])('rejects unsafe or absent link %s', value => {
    expect(safeLink(value)).toBe('')
  })
  it('allows explicit HTTP(S) links without credentials', () => {
    expect(safeLink('https://example.com/app')).toBe('https://example.com/app')
    expect(safeLink('http://intranet.local/tool')).toBe('http://intranet.local/tool')
  })
})
