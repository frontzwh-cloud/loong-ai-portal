import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RichMarkdown } from './MarkdownMessageText'

afterEach(cleanup)

describe('safe chat markdown rendering', () => {
  it('formats strong text and ordered list instead of showing Markdown punctuation', () => {
    const { container } = render(<RichMarkdown text={'好的，先了解：\n\n1. **当前阶段？**\n2. **行业岗位？**\n3. **最大困惑？**'} />)
    expect(screen.getByText('当前阶段？').tagName).toBe('STRONG')
    expect(container.querySelectorAll('ol > li')).toHaveLength(3)
    expect(container.textContent).not.toContain('**')
  })

  it('supports headings, paragraphs, inline code and fenced code', () => {
    const { container } = render(<RichMarkdown text={'## 标题\n\n这是一段文字。\n\n行内 \u0060npm ci\u0060\n\n\u0060\u0060\u0060bash\nnpm test\n\u0060\u0060\u0060'} />)
    expect(screen.getByRole('heading', { name: '标题' }).tagName).toBe('H2')
    expect(container.querySelector('p')?.textContent).toBe('这是一段文字。')
    expect(container.querySelector('p code')?.textContent).toBe('npm ci')
    expect(container.querySelector('pre code')?.textContent).toContain('npm test')
  })

  it('renders HTML-like text literally and only links explicit HTTPS URLs', () => {
    const { container } = render(<RichMarkdown text={'<script>alert(1)</script>\n\n[官网](https://example.com)\n\n[危险](javascript:alert(1))'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/')
    expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(container.textContent).toContain('javascript:alert(1)')
  })

  it('keeps incomplete streaming emphasis and code fences visible without throwing', () => {
    const { container } = render(<RichMarkdown text={'1. **正在生成\n\n\u0060\u0060\u0060python\nprint(1)'} />)
    expect(container.textContent).toContain('正在生成')
    expect(container.querySelector('pre code')?.textContent).toBe('print(1)')
  })
})
