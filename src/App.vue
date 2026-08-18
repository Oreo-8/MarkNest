<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import FileAccessNotice from './components/FileAccessNotice.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import PreviewToolbar from './components/PreviewToolbar.vue'
import ToastMessage from './components/ToastMessage.vue'
import TocPanel from './components/TocPanel.vue'
import { useEditorPersistence } from './composables/useEditorPersistence'
import { useSettings } from './composables/useSettings'
import { useToast } from './composables/useToast'
import { createMarkdownRenderer } from './markdown'

const params = new URLSearchParams(location.search)
const initialFile = window.__markdownInitialFile ?? null
const capturedConversationId = params.get('capture')
const sessionId = params.get('session') || (initialFile ? `file:${location.href}` : 'default')
const renderer = createMarkdownRenderer()

const content = ref('')
const fileName = ref('未命名.md')
const sourceUrl = ref<string | null>(null)
const unsaved = ref(false)
const editorExpanded = ref(false)
const tocVisible = ref(true)
const activeHeadingId = ref('')
const appearanceOpen = ref(false)
const fileAccessStatus = ref('正在检查本地文件接管权限…')
const fileAccessAllowed = ref<boolean | null>(null)
const showFileAccessNotice = ref(params.get('access') === 'required')
const checkingFileAccess = ref(false)
const dropVisible = ref(false)
const lightbox = ref<{ src: string; alt: string } | null>(null)
const workspace = ref<HTMLElement | null>(null)
const markdownPreview = ref<InstanceType<typeof MarkdownPreview> | null>(null)

const { message: toastMessage, show: showToast } = useToast()
const { theme, fontSize, contentCentered, editorWidth, load: loadSettings, persist: persistSettings } = useSettings()
const persistence = useEditorPersistence(sessionId, { content, fileName, sourceUrl, unsaved })

let dragDepth = 0
let resizing = false
let resizeRight = 0
let resizeMaxWidth = 280
let pendingEditorWidth = 0
let resizeFrame = 0

const rendered = computed(() => renderer.render(content.value))
const statusText = computed(() => `${fileName.value}${unsaved.value ? ' · 有未保存修改' : ''}`)
const workspaceStyle = computed(() => ({ '--editor-width': editorWidth.value ? `${editorWidth.value}px` : '42%' }))
const bodyClasses = computed(() => ({
  dark: theme.value === 'dark',
  'hide-editor': !editorExpanded.value,
  'hide-toc': !tocVisible.value,
  'content-centered': contentCentered.value,
}))

function onContentChanged() {
  unsaved.value = true
  persistence.schedulePersistSession()
  void nextTick(() => markdownPreview.value?.updateScrollSpy())
}

async function checkFileAccess(showWhenDenied = true) {
  if (typeof globalThis.chrome?.extension?.isAllowedFileSchemeAccess !== 'function') {
    fileAccessStatus.value = '文件仅在本机处理'
    return null
  }
  checkingFileAccess.value = true
  try {
    const allowed = await chrome.extension.isAllowedFileSchemeAccess()
    fileAccessAllowed.value = allowed
    fileAccessStatus.value = allowed
      ? '✓ 已开启本地 MD 自动接管'
      : '⚠ 请开启“允许访问文件网址”，否则无法打开本地 MD'
    if (allowed) showFileAccessNotice.value = false
    else if (showWhenDenied) showFileAccessNotice.value = true
    void chrome.runtime.sendMessage({ type: 'REFRESH_FILE_ACCESS_BADGE' }).catch(() => undefined)
    return allowed
  } finally {
    checkingFileAccess.value = false
  }
}

async function openExtensionSettings() {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    showToast('请手动打开扩展管理页，并开启“允许访问文件网址”')
    return
  }
  const result = await chrome.runtime.sendMessage({ type: 'OPEN_EXTENSION_SETTINGS' }) as { ok?: boolean; error?: string }
  if (!result?.ok) {
    const settingsUrl = `chrome://extensions/?id=${chrome.runtime.id}`
    try { await navigator.clipboard.writeText(settingsUrl); showToast('扩展设置地址已复制，请粘贴到地址栏打开') }
    catch { showToast('请打开扩展管理页，并开启“允许访问文件网址”') }
  }
}

function recheckFileAccess() {
  void checkFileAccess(true).then((allowed) => {
    if (allowed) showToast('本地文件访问已开启')
    else if (allowed === false) showToast('尚未检测到权限，请确认开关已经开启')
  })
}

function onWindowFocus() { void checkFileAccess(showFileAccessNotice.value) }
function onVisibilityChange() {
  if (!document.hidden) void checkFileAccess(showFileAccessNotice.value)
}

async function openLocalLink(href: string) {
  if (!sourceUrl.value) return showToast('当前文件没有本地路径，无法定位相对链接')
  try {
    const url = new URL(href, sourceUrl.value)
    if (url.protocol !== 'file:' || !/\.(md|markdown)$/i.test(url.pathname)) return showToast('目前仅支持打开本地 Markdown 链接')
    const result = await chrome.runtime.sendMessage({ type: 'OPEN_LOCAL_LINK', url: url.href }) as { ok?: boolean; error?: string }
    if (!result?.ok) showToast(result?.error || '文档打开失败')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '链接地址无效')
  }
}

async function loadFile(file?: File, handle: FileSystemFileHandle | null = null) {
  if (!file) return
  if (!/\.(md|markdown)$/i.test(file.name)) return showToast('请选择 .md 或 .markdown 文件')
  try {
    content.value = await file.text()
    fileName.value = file.name
    sourceUrl.value = null
    unsaved.value = false
    await persistence.setSourceHandle(handle)
    persistence.persistSession()
    showToast(`已打开 ${file.name}`)
  } catch { showToast('文件读取失败') }
}

async function saveSource() {
  if (!window.showOpenFilePicker) return showToast('当前浏览器不支持直接修改源文件')
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
    if (permission !== 'granted') return showToast('未获得源文件写入权限')
    const writable = await handle.createWritable()
    await writable.write(content.value)
    await writable.close()
    fileName.value = handle.name
    unsaved.value = false
    persistence.persistSession()
    showToast(`已保存 ${fileName.value}`)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    showToast('源文件保存失败，请重新选择文件')
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
    showToast(`已保存为 ${fileName.value}`)
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) showToast('保存失败')
  }
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    appearanceOpen.value = false
    lightbox.value = null
    stopResize()
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 's') {
    event.preventDefault()
    void (event.shiftKey ? saveAs() : saveSource())
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
  if (dragDepth <= 0) { dragDepth = 0; dropVisible.value = false }
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

function startResize(event: PointerEvent) {
  if (event.button !== 0 || !workspace.value) return
  event.preventDefault()
  const rect = workspace.value.getBoundingClientRect()
  const tocWidth = tocVisible.value ? workspace.value.querySelector('.toc-panel')?.getBoundingClientRect().width ?? 0 : 0
  resizeRight = rect.right
  // 为预览标题栏保留 360px，另加 6px 分隔条，避免右侧操作被遮住。
  resizeMaxWidth = Math.max(280, rect.width - tocWidth - 366)
  pendingEditorWidth = editorWidth.value ?? workspace.value.querySelector('.editor-panel')?.getBoundingClientRect().width ?? 280
  resizing = true
  document.body.classList.add('resizing')
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function resizeMove(event: PointerEvent) {
  if (!resizing || !workspace.value) return
  if (event.buttons === 0) return stopResize()
  pendingEditorWidth = Math.min(resizeMaxWidth, Math.max(280, resizeRight - event.clientX))
  if (resizeFrame) return
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0
    workspace.value?.style.setProperty('--editor-width', `${pendingEditorWidth}px`)
  })
}

function stopResize() {
  if (!resizing) return
  resizing = false
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = 0
    workspace.value?.style.setProperty('--editor-width', `${pendingEditorWidth}px`)
  }
  document.body.classList.remove('resizing')
  editorWidth.value = Math.round(pendingEditorWidth)
  persistSettings()
}

function resetEditorWidth() {
  editorWidth.value = null
  persistSettings()
}

async function initialize() {
  await loadSettings()
  if (capturedConversationId && globalThis.chrome?.storage?.local) {
    const storageKey = `capture-${capturedConversationId}`
    const stored = await chrome.storage.local.get(storageKey)
    const captured = stored[storageKey] as { name?: string; content?: string; sourceUrl?: string } | undefined
    if (captured?.content) {
      content.value = captured.content
      fileName.value = captured.name || 'ChatGPT-对话.md'
      sourceUrl.value = captured.sourceUrl || null
      unsaved.value = false
      await chrome.storage.local.remove(storageKey)
      await persistence.setSourceHandle(null)
      persistence.persistSession()
      showToast(`已收录 ${fileName.value}`)
    }
  } else if (params.get('fresh') === '1') {
    await persistence.clearSession()
    await persistence.setSourceHandle(null)
    const cleanUrl = new URL(location.href)
    cleanUrl.searchParams.delete('fresh')
    history.replaceState(null, '', cleanUrl.href)
  } else if (initialFile) {
    const restored = await persistence.restoreSession()
    if (!restored || !unsaved.value) {
      content.value = initialFile.content
      fileName.value = initialFile.name
      sourceUrl.value = initialFile.sourceUrl
      unsaved.value = false
      persistence.persistSession()
    }
  } else {
    await persistence.restoreSession()
    await persistence.restoreSourceHandle()
  }
  editorExpanded.value = fileName.value === '未命名.md'
  await checkFileAccess(true)
  await nextTick()
  markdownPreview.value?.updateScrollSpy()
}

watch([theme, fontSize, contentCentered], persistSettings)
watch([fileName, unsaved], () => { document.title = `${unsaved.value ? '• ' : ''}${fileName.value}` })
watch(rendered, () => {
  activeHeadingId.value = ''
  void nextTick(() => markdownPreview.value?.updateScrollSpy())
})

onMounted(() => {
  void initialize()
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('pointermove', resizeMove)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('blur', stopResize)
  window.addEventListener('focus', onWindowFocus)
  window.addEventListener('beforeunload', persistence.persistSession)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('pointermove', resizeMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('blur', stopResize)
  window.removeEventListener('focus', onWindowFocus)
  window.removeEventListener('beforeunload', persistence.persistSession)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  cancelAnimationFrame(resizeFrame)
})
</script>

<template>
  <main class="app-shell" :class="bodyClasses" @click="appearanceOpen = false">
    <section ref="workspace" class="workspace" :style="workspaceStyle" @dragenter="onDragEnter" @dragover.prevent @dragleave="onDragLeave" @drop="onDrop">
      <TocPanel :headings="rendered.headings" :active-heading-id="activeHeadingId" @select="markdownPreview?.goToHeading($event)" />

      <section class="preview-panel">
        <PreviewToolbar
          v-model:toc-visible="tocVisible"
          v-model:appearance-open="appearanceOpen"
          v-model:font-size="fontSize"
          v-model:content-centered="contentCentered"
          v-model:theme="theme"
          v-model:editor-expanded="editorExpanded"
          :status-text="statusText"
        />
        <MarkdownPreview
          ref="markdownPreview"
          :html="rendered.html"
          :font-size="fontSize"
          :theme="theme"
          @active-change="activeHeadingId = $event"
          @image="lightbox = $event"
          @local-link="openLocalLink"
          @toast="showToast"
        />
      </section>

      <div class="resizer" title="拖动调整预览与编辑宽度；双击恢复默认比例" @pointerdown="startResize" @dblclick="resetEditorWidth"></div>
      <EditorPanel v-model="content" @changed="onContentChanged" @scroll-progress="markdownPreview?.syncToProgress($event)" @save="saveSource" @save-as="saveAs" />

      <div v-if="dropVisible" class="drop-overlay"><div><strong>松开即可打开</strong><span>支持 .md 和 .markdown 文件</span></div></div>
    </section>
    <footer>
      <button v-if="fileAccessAllowed === false" type="button" class="file-access-link" @click="showFileAccessNotice = true">{{ fileAccessStatus }}</button>
      <span v-else>{{ fileAccessStatus }}</span>
      <span v-if="editorExpanded"><kbd>Ctrl/⌘ S</kbd> 保存　<kbd>Ctrl/⌘ Shift S</kbd> 另存为</span>
    </footer>
    <FileAccessNotice
      v-if="showFileAccessNotice"
      :checking="checkingFileAccess"
      @dismiss="showFileAccessNotice = false"
      @recheck="recheckFileAccess"
      @open-settings="openExtensionSettings"
    />
  </main>

  <ToastMessage v-if="toastMessage" :message="toastMessage" />
  <ImageLightbox v-if="lightbox" :image="lightbox" @close="lightbox = null" />
</template>
