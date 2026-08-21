import TurndownService from 'turndown'
import { AI_SITES, findAiSite, type AiSiteDefinition } from './ai-sites'

import type { CapturedConversation } from './messaging'

type MessageRole = 'user' | 'assistant' | 'system'

interface MessageCandidate {
  element: HTMLElement
  role: MessageRole
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
      const dataLanguage = code?.dataset.language ?? element.dataset.language ?? ''
      const language = languageClass?.slice('language-'.length) ?? dataLanguage
      return `\n\n\`\`\`${language}\n${(code?.textContent ?? element.textContent ?? '').trimEnd()}\n\`\`\`\n\n`
    },
  })
  return service
}

function cleanMessage(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement
  clone.querySelectorAll([
    'button', 'svg', 'script', 'style', 'noscript', 'textarea', 'input',
    '[aria-hidden="true"]', '[data-testid*="copy"]', '[data-testid*="feedback"]',
    '[class*="copy-button"]', '[class*="feedback"]', '.sr-only',
  ].join(',')).forEach((node) => node.remove())
  return clone
}

function selectAll(selectors: string[]) {
  const elements: HTMLElement[] = []
  for (const selector of selectors) {
    try {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => elements.push(element))
    } catch {
      // A stale optional selector must not prevent the remaining fallbacks from running.
    }
  }
  return elements
}

function inferRole(element: HTMLElement): MessageRole | undefined {
  const roleText = [
    element.dataset.messageAuthorRole,
    element.dataset.messageRole,
    element.dataset.role,
    element.dataset.author,
    element.getAttribute('aria-label'),
    element.getAttribute('data-testid'),
    element.className,
  ].filter((value): value is string => typeof value === 'string').join(' ').toLowerCase()

  if (/(^|[\s_-])(user|human|question|prompt|query|mine|self)([\s_-]|$)/.test(roleText)) return 'user'
  if (/(^|[\s_-])(assistant|bot|model|answer|response|ai)([\s_-]|$)/.test(roleText)) return 'assistant'
  if (/(^|[\s_-])system([\s_-]|$)/.test(roleText)) return 'system'
  return undefined
}

function documentOrder(a: MessageCandidate, b: MessageCandidate) {
  if (a.element === b.element) return 0
  return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

function removeNestedDuplicates(candidates: MessageCandidate[]) {
  const kept: MessageCandidate[] = []
  for (const candidate of candidates.sort(documentOrder)) {
    if (!candidate.element.innerText.trim()) continue
    const duplicateIndex = kept.findIndex((item) => item.role === candidate.role && (
      item.element === candidate.element || item.element.contains(candidate.element) || candidate.element.contains(item.element)
    ))
    if (duplicateIndex < 0) {
      kept.push(candidate)
      continue
    }
    // Prefer the narrower node so surrounding controls and labels are not exported.
    if (kept[duplicateIndex].element.contains(candidate.element)) kept[duplicateIndex] = candidate
  }
  return kept.sort(documentOrder)
}

function collectMessages(site: AiSiteDefinition) {
  const candidates: MessageCandidate[] = [
    ...selectAll(site.userSelectors).map((element) => ({ element, role: 'user' as const })),
    ...selectAll(site.assistantSelectors).map((element) => ({ element, role: 'assistant' as const })),
  ]

  for (const element of selectAll([
    ...site.turnSelectors,
    '[data-message-author-role]', '[data-message-role]', '[data-role]', '[data-author]',
  ])) {
    const role = inferRole(element)
    if (role) candidates.push({ element, role })
  }
  return removeNestedDuplicates(candidates)
}

function conversationTitle(site: AiSiteDefinition) {
  const heading = document.querySelector<HTMLElement>('main h1, [role="main"] h1')?.innerText.trim()
  let documentTitle = document.title.trim()
  for (const suffix of site.titleSuffixes) {
    documentTitle = documentTitle.replace(new RegExp(`\\s*[-–—|·]\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '').trim()
  }
  return heading || documentTitle || `${site.name} 对话`
}

function siteForCurrentPage() {
  const site = findAiSite(location.href)
  if (site) return site
  // Local fixture pages can select an adapter without adding test domains to extension permissions.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return AI_SITES.find((candidate) => candidate.id === document.documentElement.dataset.marknestSite)
  }
  return undefined
}

export function captureConversation(): CapturedConversation {
  const site = siteForCurrentPage()
  if (!site) throw new Error('当前网站暂不支持 AI 对话收录')
  const converter = createConverter()
  const messages = collectMessages(site)
  const sections: string[] = []

  for (const { element, role } of messages) {
    const label = role === 'user' ? '你' : role === 'assistant' ? site.name : '系统'
    const markdown = converter.turndown(cleanMessage(element)).trim()
    if (markdown) sections.push(`## ${label}\n\n${markdown}`)
  }

  if (!sections.length) {
    throw new Error(`没有读取到对话内容，请确认当前页面已打开一段 ${site.name} 对话并已加载完成`)
  }
  const title = conversationTitle(site)
  const exportedAt = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())
  return {
    title,
    sourceUrl: location.href,
    siteId: site.id,
    siteName: site.name,
    content: `# ${title}\n\n> 来源：[${site.name} 对话](${location.href})  \n> 收录时间：${exportedAt}\n\n---\n\n${sections.join('\n\n---\n\n')}\n`,
  }
}
