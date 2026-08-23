import { ref } from 'vue'
import type { InitialLocalFile } from '../types'
import { sendMessage } from '../messaging'
import { useEditorPersistence } from './useEditorPersistence'

type ShowToast = (message: string) => void

interface MarkdownDocumentOptions {
  sessionId: string
  initialFile: InitialLocalFile | null
  capturedConversationId: string | null
  fresh: boolean
  showToast: ShowToast
}

export function useMarkdownDocument(options: MarkdownDocumentOptions) {
  const content = ref('')
  const fileName = ref('未命名.md')
  const sourceUrl = ref<string | null>(null)
  const unsaved = ref(false)
  const dropVisible = ref(false)
  const persistence = useEditorPersistence(options.sessionId, { content, fileName, sourceUrl, unsaved })
  let dragDepth = 0

  function changed() {
    unsaved.value = true
    persistence.schedulePersistSession()
  }

  async function openLocalLink(href: string) {
    if (!sourceUrl.value) return options.showToast('当前文件没有本地路径，无法定位相对链接')
    try {
      const url = new URL(href, sourceUrl.value)
      if (url.protocol !== 'file:' || !/\.(md|markdown)$/i.test(url.pathname)) return options.showToast('目前仅支持打开本地 Markdown 链接')
      const result = await sendMessage('openLocalLink', { url: url.href })
      if (!result?.ok) options.showToast(result?.error || '文档打开失败')
    } catch (error) {
      options.showToast(error instanceof Error ? error.message : '链接地址无效')
    }
  }

  async function loadFile(file?: File, handle: FileSystemFileHandle | null = null) {
    if (!file) return
    if (!/\.(md|markdown)$/i.test(file.name)) return options.showToast('请选择 .md 或 .markdown 文件')
    try {
      content.value = await file.text()
      fileName.value = file.name
      sourceUrl.value = null
      unsaved.value = false
      await persistence.setSourceHandle(handle)
      persistence.persistSession()
      options.showToast(`已打开 ${file.name}`)
    } catch {
      options.showToast('文件读取失败')
    }
  }

  async function save() {
    if (!window.showOpenFilePicker) return options.showToast('当前浏览器不支持直接修改源文件')
    try {
      let handle = persistence.getSourceHandle()
      if (!handle) {
        const [selected] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'Markdown 文件', accept: { 'text/markdown': ['.md', '.markdown'] } }],
        })
        if (fileName.value !== '未命名.md' && selected.name !== fileName.value && !confirm(`选择的是 ${selected.name}，不是当前的 ${fileName.value}。仍要覆盖吗？`)) return
        await persistence.setSourceHandle(selected)
        handle = selected
      }
      let permission = await handle.queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'readwrite' })
      if (permission !== 'granted') return options.showToast('未获得源文件写入权限')
      const writable = await handle.createWritable()
      await writable.write(content.value)
      await writable.close()
      fileName.value = handle.name
      unsaved.value = false
      persistence.persistSession()
      options.showToast(`已保存 ${fileName.value}`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      options.showToast('源文件保存失败，请重新选择文件')
    }
  }

  async function saveAs() {
    const suggestedName = `${fileName.value.replace(/\.(md|markdown)$/i, '') || '未命名'}-副本.md`
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'Markdown 文件', accept: { 'text/markdown': ['.md', '.markdown'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(content.value)
        await writable.close()
        fileName.value = handle.name
        await persistence.setSourceHandle(handle)
      } else {
        const url = URL.createObjectURL(new Blob([content.value], { type: 'text/markdown;charset=utf-8' }))
        Object.assign(document.createElement('a'), { href: url, download: suggestedName }).click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        fileName.value = suggestedName
        await persistence.setSourceHandle(null)
      }
      unsaved.value = false
      persistence.persistSession()
      options.showToast(`已保存为 ${fileName.value}`)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) options.showToast('保存失败')
    }
  }

  function onDragEnter(event: DragEvent) {
    event.preventDefault()
    dragDepth += 1
    dropVisible.value = true
  }

  function onDragLeave(event: DragEvent) {
    event.preventDefault()
    dragDepth -= 1
    if (dragDepth <= 0) {
      dragDepth = 0
      dropVisible.value = false
    }
  }

  async function onDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth = 0
    dropVisible.value = false
    const item = event.dataTransfer?.items?.[0]
    let handle: FileSystemHandle | null = null
    try { handle = await item?.getAsFileSystemHandle?.() ?? null } catch { /* 使用 File 回退 */ }
    const fileHandle = handle?.kind === 'file' ? handle as FileSystemFileHandle : null
    await loadFile(fileHandle ? await fileHandle.getFile() : event.dataTransfer?.files?.[0], fileHandle)
  }

  async function initialize() {
    if (options.capturedConversationId && globalThis.chrome?.storage?.local) {
      const storageKey = `capture-${options.capturedConversationId}`
      const stored = await chrome.storage.local.get(storageKey)
      const captured = stored[storageKey] as { name?: string; content?: string; sourceUrl?: string } | undefined
      if (captured?.content) {
        content.value = captured.content
        fileName.value = captured.name || 'AI-对话.md'
        sourceUrl.value = captured.sourceUrl || null
        unsaved.value = false
        await chrome.storage.local.remove(storageKey)
        await persistence.setSourceHandle(null)
        persistence.persistSession()
        options.showToast(`已收录 ${fileName.value}`)
      }
    } else if (options.fresh) {
      await persistence.clearSession()
      await persistence.setSourceHandle(null)
      const cleanUrl = new URL(location.href)
      cleanUrl.searchParams.delete('fresh')
      history.replaceState(null, '', cleanUrl.href)
    } else if (options.initialFile) {
      const restored = await persistence.restoreSession()
      if (!restored || !unsaved.value) {
        content.value = options.initialFile.content
        fileName.value = options.initialFile.name
        sourceUrl.value = options.initialFile.sourceUrl
        unsaved.value = false
        persistence.persistSession()
      }
      // file:// 地址只能用来读取；恢复用户首次保存时授权的文件句柄，
      // 使同一文件之后再打开时可以直接 Ctrl/⌘ S 覆盖保存。
      await persistence.restoreSourceHandle()
    } else {
      await persistence.restoreSession()
      await persistence.restoreSourceHandle()
    }
  }

  return {
    content,
    fileName,
    sourceUrl,
    unsaved,
    dropVisible,
    persistence,
    changed,
    openLocalLink,
    save,
    saveAs,
    onDragEnter,
    onDragLeave,
    onDrop,
    initialize,
  }
}
