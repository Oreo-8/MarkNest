import MarkdownIt from 'markdown-it'
import taskLists from 'markdown-it-task-lists'
import hljs from 'highlight.js/lib/common'
import DOMPurify from 'dompurify'
import katex from 'katex'
import type { HeadingItem } from './types'

const escapeHtml = (value: string) => MarkdownIt().utils.escapeHtml(value)

export function createMarkdownRenderer() {
  const headings: HeadingItem[] = []
  const used = new Set<string>()
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
    .use(taskLists, { enabled: false, label: true, labelAfter: true })

  md.inline.ruler.after('escape', 'highlight', (state, silent) => {
    if (state.src.slice(state.pos, state.pos + 2) !== '==') return false
    const end = state.src.indexOf('==', state.pos + 2)
    if (end < 0 || end === state.pos + 2) return false
    if (!silent) {
      const token = state.push('highlight', 'mark', 0)
      token.content = state.src.slice(state.pos + 2, end)
    }
    state.pos = end + 2
    return true
  })
  md.renderer.rules.highlight = (tokens, index) => `<mark>${escapeHtml(tokens[index].content)}</mark>`

  md.inline.ruler.after('highlight', 'math_inline', (state, silent) => {
    if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false
    if (/\s/.test(state.src[state.pos + 1] ?? '')) return false
    let end = state.pos + 1
    while ((end = state.src.indexOf('$', end)) >= 0) {
      if (state.src[end - 1] !== '\\' && !/\s/.test(state.src[end - 1])) break
      end += 1
    }
    if (end < 0 || end === state.pos + 1) return false
    if (!silent) {
      const token = state.push('math_inline', 'span', 0)
      token.content = state.src.slice(state.pos + 1, end)
    }
    state.pos = end + 1
    return true
  })
  md.renderer.rules.math_inline = (tokens, index) => katex.renderToString(tokens[index].content, { throwOnError: false, output: 'htmlAndMathml' })

  md.block.ruler.before('fence', 'math_block', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine]
    if (state.src.slice(start, state.eMarks[startLine]).trim() !== '$$') return false
    let nextLine = startLine + 1
    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      if (state.src.slice(lineStart, state.eMarks[nextLine]).trim() === '$$') break
      nextLine += 1
    }
    if (nextLine >= endLine) return false
    if (silent) return true
    const token = state.push('math_block', 'div', 0)
    token.block = true
    token.content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], true).trim()
    token.map = [startLine, nextLine + 1]
    state.line = nextLine + 1
    return true
  })
  md.renderer.rules.math_block = (tokens, index) => `<div class="math-block">${katex.renderToString(tokens[index].content, { displayMode: true, throwOnError: false, output: 'htmlAndMathml' })}</div>`

  const calloutLabels: Record<string, string> = {
    NOTE: '提示', TIP: '技巧', IMPORTANT: '重要', WARNING: '警告', CAUTION: '注意', SUCCESS: '成功',
  }
  md.core.ruler.after('block', 'callouts', (state) => {
    for (let index = 0; index < state.tokens.length; index += 1) {
      if (state.tokens[index].type !== 'blockquote_open') continue
      const inline = state.tokens.slice(index + 1, index + 5).find(token => token.type === 'inline')
      const match = inline?.content.match(/^\[!([A-Z]+)\]\s*\n?/i)
      if (!inline || !match) continue
      const type = match[1].toLocaleUpperCase()
      if (!calloutLabels[type]) continue
      state.tokens[index].attrJoin('class', `callout callout-${type.toLocaleLowerCase()}`)
      state.tokens[index].attrSet('data-callout-title', calloutLabels[type])
      inline.content = inline.content.slice(match[0].length)
      const firstText = inline.children?.find(token => token.type === 'text' && token.content.includes(match[0].trim()))
      if (firstText) firstText.content = firstText.content.replace(/^\[![A-Z]+\]\s*\n?/i, '')
    }
  })

  const defaultHeadingOpen = md.renderer.rules.heading_open
  md.renderer.rules.heading_open = (tokens, index, options, env, self) => {
    const token = tokens[index]
    const inline = tokens[index + 1]
    const text = inline?.content ?? ''
    const base = text.replace(/[*_`~[\]()]/g, '').trim().toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section'
    let id = base
    let suffix = 2
    while (used.has(id)) id = `${base}-${suffix++}`
    used.add(id)
    token.attrSet('id', id)
    headings.push({ level: Number(token.tag.slice(1)), text, id })
    return defaultHeadingOpen ? defaultHeadingOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options)
  }

  const defaultLinkOpen = md.renderer.rules.link_open
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet('href') ?? ''
    if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
      tokens[index].attrSet('target', '_blank')
      tokens[index].attrSet('rel', 'noopener noreferrer')
    }
    return defaultLinkOpen ? defaultLinkOpen(tokens, index, options, env, self) : self.renderToken(tokens, index, options)
  }

  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index]
    const requested = token.info.trim().split(/\s+/)[0]?.toLocaleLowerCase() ?? ''
    let language = requested || 'text'
    let highlighted = escapeHtml(token.content)
    if (requested === 'mermaid') return `<div class="mermaid-block"><pre class="mermaid">${highlighted}</pre></div>`
    try {
      if (requested && hljs.getLanguage(requested)) highlighted = hljs.highlight(token.content, { language: requested }).value
      else if (!requested) {
        const result = hljs.highlightAuto(token.content)
        highlighted = result.value
        language = result.language || 'text'
      }
    } catch { /* 保留已转义的原始代码 */ }
    return `<div class="code-block"><div class="code-toolbar"><button class="copy-code" type="button" title="复制代码" aria-label="复制代码"><span class="code-language">${escapeHtml(language)}</span><span class="copy-symbol" aria-hidden="true">⧉</span><span class="check-symbol" aria-hidden="true">✓</span></button></div><pre><code>${highlighted}</code></pre></div>`
  }

  return {
    render(source: string) {
      headings.length = 0
      used.clear()
      const html = md.render(source)
      return {
        html: DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] }),
        headings: [...headings],
      }
    },
  }
}
