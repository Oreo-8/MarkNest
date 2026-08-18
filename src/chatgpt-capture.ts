import TurndownService from 'turndown'

interface CapturedConversation {
  title: string
  content: string
  sourceUrl: string
}

declare global {
  var __markNestChatCaptureReady: boolean | undefined
}

function createConverter() {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  })
  service.addRule('fencedCodeWithLanguage', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (_content, node) => {
      const element = node as HTMLElement
      const code = element.querySelector('code')
      const languageClass = [...(code?.classList ?? [])].find((name) => name.startsWith('language-'))
      const language = languageClass?.slice('language-'.length) ?? ''
      return `\n\n\`\`\`${language}\n${(code?.textContent ?? element.textContent ?? '').trimEnd()}\n\`\`\`\n\n`
    },
  })
  return service
}

function cleanMessage(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll('button,svg,script,style,noscript,[aria-hidden="true"],[data-testid*="copy"],.sr-only').forEach((node) => node.remove())
  return clone
}

function conversationTitle() {
  const heading = document.querySelector<HTMLElement>('main h1')?.innerText.trim()
  const documentTitle = document.title.replace(/\s*[-–—]\s*ChatGPT\s*$/i, '').trim()
  return heading || documentTitle || 'ChatGPT 对话'
}

function captureConversation(): CapturedConversation {
  const converter = createConverter()
  const messageElements = [...document.querySelectorAll<HTMLElement>('[data-message-author-role]')]
  const seen = new Set<HTMLElement>()
  const sections: string[] = []

  for (const messageElement of messageElements) {
    const container = messageElement.closest<HTMLElement>('article[data-testid^="conversation-turn"]') ?? messageElement
    if (seen.has(container)) continue
    seen.add(container)
    const role = messageElement.dataset.messageAuthorRole ?? 'assistant'
    const label = role === 'user' ? '你' : role === 'assistant' ? 'ChatGPT' : '系统'
    const markdown = converter.turndown(cleanMessage(messageElement)).trim()
    if (markdown) sections.push(`## ${label}\n\n${markdown}`)
  }

  if (!sections.length) throw new Error('没有读取到对话内容，请确认当前页面已打开一段 ChatGPT 对话')
  const title = conversationTitle()
  const exportedAt = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  return {
    title,
    sourceUrl: location.href,
    content: `# ${title}\n\n> 来源：[ChatGPT 对话](${location.href})  \n> 收录时间：${exportedAt}\n\n---\n\n${sections.join('\n\n---\n\n')}\n`,
  }
}

if (!globalThis.__markNestChatCaptureReady) {
  globalThis.__markNestChatCaptureReady = true
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!message || typeof message !== 'object' || !('type' in message) || message.type !== 'CAPTURE_CHATGPT_PAGE') return
    try { sendResponse({ ok: true, conversation: captureConversation() }) }
    catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : '对话读取失败' }) }
  })
}
