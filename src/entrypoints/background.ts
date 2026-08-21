import { findAiSite } from '../ai-sites'
import { onMessage, sendMessage } from '../messaging'

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
