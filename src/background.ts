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

async function openEditor() {
  const session = crypto.randomUUID()
  const allowed = await updateAccessBadge()
  const query = new URLSearchParams({ session, fresh: '1' })
  if (!allowed) query.set('access', 'required')
  await chrome.tabs.create({ url: `${chrome.runtime.getURL('editor.html')}?${query}` })
}

async function createFreshEditor() {
  const session = crypto.randomUUID()
  await chrome.tabs.create({ url: `${chrome.runtime.getURL('editor.html')}?session=${session}&fresh=1` })
}

function isChatGptUrl(url?: string) {
  if (!url) return false
  try {
    const host = new URL(url).hostname
    return host === 'chatgpt.com' || host === 'chat.openai.com'
  } catch { return false }
}

function safeMarkdownName(title: string) {
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'ChatGPT-对话'
  return `${safeTitle}.md`
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return '未知错误'
}

function isUserCancellation(error: unknown) {
  return /cancel(?:ed|led)|取消/i.test(errorMessage(error))
}

async function captureActiveConversation(requestedTabId?: number) {
  const tab = requestedTabId == null
    ? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]
    : await chrome.tabs.get(requestedTabId)
  if (tab?.id == null || !isChatGptUrl(tab.url)) throw new Error('请先打开一个 ChatGPT 对话页面')

  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['chatgpt-capture.js'] })
  } catch (error) {
    throw new Error(`无法读取当前页面：${errorMessage(error)}`)
  }

  let result: {
    ok?: boolean
    error?: string
    conversation?: { title: string; content: string; sourceUrl: string }
  }
  try {
    result = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CHATGPT_PAGE' })
  } catch (error) {
    throw new Error(`采集脚本未响应：${errorMessage(error)}`)
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
  try {
    await chrome.storage.local.set({
      [storageKey]: {
        name: fileName,
        content: result.conversation.content,
        sourceUrl: result.conversation.sourceUrl,
        unsaved: false,
        updatedAt: Date.now(),
      },
    })
    await chrome.tabs.create({ url: `${chrome.runtime.getURL('editor.html')}?capture=${captureId}&session=${captureId}` })
  } catch (error) {
    throw new Error(`Markdown 已保存，但无法打开编辑页：${errorMessage(error)}`)
  }
  return { cancelled: false }
}

chrome.runtime.onInstalled.addListener(() => { void updateAccessBadge() })
chrome.runtime.onStartup.addListener(() => { void updateAccessBadge() })
chrome.action.onClicked.addListener(() => { void openEditor() })
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-editor') void openEditor()
})

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!message || typeof message !== 'object' || !('type' in message)) return
  const payload = message as {
    type: string
    url?: string
    tabId?: number
    file?: { name?: unknown; content?: unknown; sourceUrl?: unknown }
  }

  if (payload.type === 'OPEN_LOCAL_FILE') {
    void (async () => {
      try {
        const file = payload.file
        const tabId = sender.tab?.id
        if (
          tabId == null
          || !file
          || typeof file.name !== 'string'
          || typeof file.content !== 'string'
          || typeof file.sourceUrl !== 'string'
        ) {
          throw new Error('本地 Markdown 文件信息不完整')
        }

        const captureId = crypto.randomUUID()
        await chrome.storage.local.set({
          [`capture-${captureId}`]: {
            name: file.name,
            content: file.content,
            sourceUrl: file.sourceUrl,
            unsaved: false,
            updatedAt: Date.now(),
          },
        })
        const editorUrl = `${chrome.runtime.getURL('editor.html')}?capture=${captureId}&session=${captureId}`
        sendResponse({ ok: true, editorUrl })
      } catch (error) {
        sendResponse({ ok: false, error: errorMessage(error) })
      }
    })()
    return true
  }

  if (payload.type === 'OPEN_EDITOR') {
    void createFreshEditor().then(() => sendResponse({ ok: true })).catch((error) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : '编辑页打开失败' })
    })
    return true
  }

  if (payload.type === 'CAPTURE_CHATGPT') {
    void captureActiveConversation(payload.tabId).then(({ cancelled }) => sendResponse({ ok: true, cancelled })).catch((error) => {
      sendResponse({ ok: false, error: errorMessage(error) })
    })
    return true
  }

  if (payload.type === 'OPEN_EXTENSION_SETTINGS') {
    void (async () => {
      try {
        await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
        sendResponse({ ok: true })
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : '无法自动打开扩展设置' })
      }
    })()
    return true
  }

  if (payload.type === 'REFRESH_FILE_ACCESS_BADGE') {
    void updateAccessBadge().then((allowed) => sendResponse({ ok: true, allowed }))
    return true
  }

  if (payload.type !== 'OPEN_LOCAL_LINK' || !payload.url) return
  const requestedUrl = payload.url
  void (async () => {
    try {
      const target = new URL(requestedUrl)
      if (target.protocol !== 'file:' || !/\.(md|markdown)$/i.test(target.pathname)) {
        sendResponse({ ok: false, error: '链接不是本地 Markdown 文件' })
        return
      }
      if (!(await chrome.extension.isAllowedFileSchemeAccess())) {
        await updateAccessBadge()
        sendResponse({ ok: false, error: '请先在扩展详情中开启“允许访问文件网址”' })
        return
      }
      let tabId = sender.tab?.id
      if (tabId == null) {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
        tabId = activeTab?.id
      }
      if (tabId == null) {
        sendResponse({ ok: false, error: '无法定位当前浏览器标签页' })
        return
      }
      await chrome.tabs.update(tabId, { url: target.href })
      sendResponse({ ok: true })
    } catch (error) {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : '本地文档打开失败' })
    }
  })()
  return true
})
