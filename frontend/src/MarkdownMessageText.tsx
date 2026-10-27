import { useAuiState } from '@assistant-ui/react'
import type { ReactNode } from 'react'

// A deliberately bounded, dependency-free subset of Markdown for V0.1 chat.
// React escapes all text; only literal http(s) links become clickable.
// Richer syntax (tables, nested lists, math) should use a vetted renderer later.
const inlineTokens = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|\u0060[^\u0060\n]+\u0060|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g
const fencePattern = /^ {0,3}(\u0060{3,}|~{3,})([\w+#.-]*)\s*$/
const listPattern = /^ {0,3}([-*+]|\d+[.)])\s+(.+)$/
const headingPattern = /^ {0,3}(#{1,4})\s+(.+)$/

function inline(content: string): ReactNode[] {
  return content.split(inlineTokens).filter(Boolean).map((token, index) => {
    const key = index
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4)
      return <strong key={key}>{inline(token.slice(2, -2))}</strong>
    if (token.startsWith('__') && token.endsWith('__') && token.length > 4)
      return <strong key={key}>{inline(token.slice(2, -2))}</strong>
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2)
      return <em key={key}>{token.slice(1, -1)}</em>
    if (token.startsWith('\u0060') && token.endsWith('\u0060') && token.length > 2)
      return <code key={key}>{token.slice(1, -1)}</code>
    const link = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(token)
    if (link) {
      try {
        const url = new URL(link[2])
        if (url.protocol === 'http:' || url.protocol === 'https:')
          return <a key={key} href={url.href} target="_blank" rel="noopener noreferrer">{link[1]}</a>
      } catch { /* Invalid links remain visible as text. */ }
    }
    return token
  })
}

function isNewBlock(line: string): boolean {
  return fencePattern.test(line) || headingPattern.test(line) ||
    listPattern.test(line) || /^ {0,3}>\s?/.test(line) ||
    /^ {0,3}(?:-{3,}|\*{3,})\s*$/.test(line)
}

export function RichMarkdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }

    const fence = fencePattern.exec(line)
    if (fence) {
      const code: string[] = []
      const opening = fence[1][0]
      const minLength = fence[1].length
      const language = fence[2]
      index++
      while (index < lines.length) {
        const current = lines[index]
        if (current.trim().startsWith(opening.repeat(minLength)) &&
            current.trim().replaceAll(opening, '').trim() === '') { index++; break }
        code.push(current)
        index++
      }
      blocks.push(<div className="markdown-code" key={blocks.length}>
        {language && <div className="markdown-code-language">{language}</div>}
        <pre><code>{code.join('\n')}</code></pre>
      </div>)
      continue
    }

    const heading = headingPattern.exec(line)
    if (heading) {
      const title = inline(heading[2])
      const key = blocks.length
      blocks.push(heading[1].length === 1 ? <h1 key={key}>{title}</h1> :
        heading[1].length === 2 ? <h2 key={key}>{title}</h2> :
        heading[1].length === 3 ? <h3 key={key}>{title}</h3> : <h4 key={key}>{title}</h4>)
      index++
      continue
    }

    if (/^ {0,3}(?:-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={blocks.length} />)
      index++
      continue
    }

    const list = listPattern.exec(line)
    if (list) {
      const ordered = /^\d/.test(list[1])
      const start = ordered ? parseInt(list[1], 10) || 1 : 1
      const items: ReactNode[] = []
      while (index < lines.length) {
        const item = listPattern.exec(lines[index])
        if (!item || /^\d/.test(item[1]) !== ordered) break
        items.push(<li key={items.length}>{inline(item[2])}</li>)
        index++
      }
      blocks.push(ordered ? <ol key={blocks.length} start={start}>{items}</ol> :
        <ul key={blocks.length}>{items}</ul>)
      continue
    }

    if (/^ {0,3}>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^ {0,3}>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^ {0,3}>\s?/, ''))
        index++
      }
      blocks.push(<blockquote key={blocks.length}>{inline(quote.join(' '))}</blockquote>)
      continue
    }

    const paragraph = [line]
    index++
    while (index < lines.length && lines[index].trim() && !isNewBlock(lines[index])) {
      paragraph.push(lines[index])
      index++
    }
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(' '))}</p>)
  }

  return <div className="markdown-content">{blocks}</div>
}

export function MarkdownMessageText() {
  // Selecting the string, rather than throwing on a transient part mismatch,
  // keeps this renderer safe during thread updates.
  const text = useAuiState(state => state.part.type === 'text' ? state.part.text : '')
  return <RichMarkdown text={text} />
}
