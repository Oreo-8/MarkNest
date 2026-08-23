import { findAiSite } from '../ai-sites'
import { onMessage, sendMessage } from '../messaging'
import type { LocalDirectoryEntry } from '../messaging'

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '未知错误'
}

function isUserCancellation(error: unknown) {
  return /cancel(?:ed|led)|取消/i.test(errorMessage(error))
}

function safeMarkdownName(title: string) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'AI-对话'
  return `${safeTitle}.md`
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

async function fetchLocalText(url: string) {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (attempt > 1) await new Promise((resolve) => setTimeout(resolve, 300))
    try {
      const response = await fetch(url)
      // file:// 响应不保证具有 HTTP 2xx 状态，只要能读取正文就是成功。
      return await response.text()
    } catch (error) {
      lastError = error
      console.warn(`[MarkNest] 第 ${attempt}/3 次读取本地目录失败：${url}`, error)
    }
  }
  throw lastError
}

function localDirectoryEntries(html: string, directoryUrl: URL) {
  const entries = new Map<string, LocalDirectoryEntry>()
  const basePath = directoryUrl.pathname.endsWith('/') ? directoryUrl.pathname : `${directoryUrl.pathname}/`

  function add(rawHref: string, directoryHint?: boolean) {
    let target: URL
    try { target = new URL(decodeHtmlAttribute(rawHref), directoryUrl) } catch { return }
    if (target.protocol !== 'file:' || target.origin !== directoryUrl.origin || !target.pathname.startsWith(basePath)) return
    const relativePath = target.pathname.slice(basePath.length)
    const pathWithoutSlash = relativePath.replace(/\/$/, '')
    if (!pathWithoutSlash || pathWithoutSlash.includes('/')) return
    let name: string
    try { name = decodeURIComponent(pathWithoutSlash) } catch { name = pathWithoutSlash }
    const kind = (directoryHint ?? target.pathname.endsWith('/')) ? 'directory' : 'file'
    if (kind === 'directory' && !target.pathname.endsWith('/')) target.pathname += '/'
    target.search = ''
    target.hash = ''
    entries.set(target.href, { name, kind, url: target.href })
  }

  const addRowPattern = /addRow\(\s*("(?:\\.|[^"\\])*")\s*,\s*("(?:\\.|[^"\\])*")\s*,\s*(true|false|0|1)/g
  for (const match of html.matchAll(addRowPattern)) {
    try { add(JSON.parse(match[2]), match[3] === 'true' || match[3] === '1') } catch { /* 忽略无法解析的目录项 */ }
  }

  const hrefPattern = /href\s*=\s*(["'])(.*?)\1/gi
  for (const match of html.matchAll(hrefPattern)) add(match[2])

  return [...entries.values()].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1
    return left.name.localeCompare(right.name, 'zh-CN', { numeric: true })
  })
}

export default defineBackground(() => {
  async function hasFileAccess() {
    return chrome.extension.isAllowedFileSchemeAccess()
  }

  async function updateAccessBadge() {
    const allowed = await hasFileAccess()
    await chrome.action.setBadgeBackgroundColor({ color: '#e05252' })
    await chrome.action.setBadgeText({ text: allowed ? '' : '!' })
    await chrome.action.setTitle({ title: allowed ? '打开 MarkNest' : 'MarkNest：请开启“允许访问文件网址”' })
    return allowed
  }

  async function createEditor(query: URLSearchParams) {
    await chrome.tabs.create({ url: `${chrome.runtime.getURL('/editor.html')}?${query}` })
  }

  async function openEditor() {
    const query = new URLSearchParams({ session: crypto.randomUUID(), fresh: '1' })
    if (!(await updateAccessBadge())) query.set('access', 'required')
    await createEditor(query)
  }

  async function requestConversation(tabId: number) {
    let result = await sendMessage('captureAiPage', undefined, tabId).catch(() => undefined)
    if (result) return result

    // Existing tabs do not receive newly installed/updated manifest content scripts until reload.
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/ai-capture.js'] })
    result = await sendMessage('captureAiPage', undefined, tabId)
    return result
  }

  async function captureActiveConversation(requestedTabId?: number) {
    const tab = requestedTabId == null
      ? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]
      : await chrome.tabs.get(requestedTabId)
    const site = findAiSite(tab?.url)
    if (tab?.id == null || !site) throw new Error('请先打开一个支持的 AI 对话页面')

    let result
    try {
      result = await requestConversation(tab.id)
    } catch (error) {
      throw new Error(`无法读取当前页面：${errorMessage(error)}`)
    }
    if (!result?.ok || !result.conversation) throw new Error(result?.error || '对话读取失败')

    const fileName = safeMarkdownName(result.conversation.title)
    const dataUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(result.conversation.content)}`
    try {
      await chrome.downloads.download({ url: dataUrl, filename: fileName, saveAs: true })
    } catch (error) {
      if (isUserCancellation(error)) return { cancelled: true }
      throw new Error(`Markdown 保存失败：${errorMessage(error)}`)
    }

    const captureId = crypto.randomUUID()
    const storageKey = `capture-${captureId}`
    await chrome.storage.local.set({
      [storageKey]: {
        name: fileName,
        content: result.conversation.content,
        sourceUrl: result.conversation.sourceUrl,
        siteId: result.conversation.siteId,
        siteName: result.conversation.siteName,
        unsaved: false,
        updatedAt: Date.now(),
      },
    })
    await chrome.tabs.create({ url: `${chrome.runtime.getURL('/editor.html')}?capture=${captureId}&session=${captureId}` })
    return { cancelled: false }
  }

  chrome.runtime.onInstalled.addListener(() => { void updateAccessBadge() })
  chrome.runtime.onStartup.addListener(() => { void updateAccessBadge() })
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'open-editor') void openEditor()
  })

  onMessage('openEditor', async () => {
    try {
      await createEditor(new URLSearchParams({ session: crypto.randomUUID(), fresh: '1' }))
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  onMessage('captureAiConversation', async ({ data }) => {
    try {
      const { cancelled } = await captureActiveConversation(data.tabId)
      return { ok: true, cancelled }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  onMessage('openExtensionSettings', async () => {
    try {
      await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })

  onMessage('refreshFileAccessBadge', async () => {
    const allowed = await updateAccessBadge()
    return { ok: true, allowed }
  })

  onMessage('listLocalDirectory', async ({ data }) => {
    try {
      const directoryUrl = new URL(data.url)
      if (directoryUrl.protocol !== 'file:') return { ok: false, error: '只能读取本地文件夹' }
      if (!(await hasFileAccess())) return { ok: false, error: '请先开启扩展的“允许访问文件网址”' }
      if (!directoryUrl.pathname.endsWith('/')) directoryUrl.pathname += '/'
      const html = await fetchLocalText(directoryUrl.href)
      if (!/(?:addRow|start)\s*\(|href\s*=/i.test(html)) return { ok: false, error: '浏览器未提供该文件夹的目录索引' }
      return { ok: true, entries: localDirectoryEntries(html, directoryUrl) }
    } catch (error) {
      return { ok: false, error: `目录读取失败：${errorMessage(error)}` }
    }
  })

  onMessage('openLocalLink', async ({ data, sender }) => {
    try {
      const target = new URL(data.url)
      if (target.protocol !== 'file:' || !/\.(md|markdown)$/i.test(target.pathname)) {
        return { ok: false, error: '链接不是本地 Markdown 文件' }
      }
      if (!(await hasFileAccess())) {
        await updateAccessBadge()
        return { ok: false, error: '请先在扩展详情中开启“允许访问文件网址”' }
      }
      const tabId = sender.tab?.id ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id
      if (tabId == null) return { ok: false, error: '无法定位当前浏览器标签页' }
      await chrome.tabs.update(tabId, { url: target.href })
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })
})
