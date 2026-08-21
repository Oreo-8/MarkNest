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
          v-model:content-side-margin="contentSideMargin"
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
      <EditorPanel v-model="content" @changed="onContentChanged" @scroll-progress="markdownPreview?.syncToProgress($event)" @save="save" @save-as="saveAs" />

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

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import FileAccessNotice from './components/FileAccessNotice.vue'
import ImageLightbox from './components/ImageLightbox.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import PreviewToolbar from './components/PreviewToolbar.vue'
import ToastMessage from './components/ToastMessage.vue'
import TocPanel from './components/TocPanel.vue'
import { useEditorResize } from './composables/useEditorResize'
import { useFileAccess } from './composables/useFileAccess'
import { useMarkdownDocument } from './composables/useMarkdownDocument'
import { useSettings } from './composables/useSettings'
import { useToast } from './composables/useToast'
import { createMarkdownRenderer } from './markdown'

const params = new URLSearchParams(location.search)
const initialFile = window.__markdownInitialFile ?? null
const capturedConversationId = params.get('capture')
const sessionId = params.get('session') || (initialFile ? `file:${location.href}` : 'default')
const renderer = createMarkdownRenderer()

const editorExpanded = ref(false)
const tocVisible = ref(true)
const activeHeadingId = ref('')
const appearanceOpen = ref(false)
const lightbox = ref<{ src: string; alt: string } | null>(null)
const markdownPreview = ref<InstanceType<typeof MarkdownPreview> | null>(null)

const { message: toastMessage, show: showToast } = useToast()
const { theme, fontSize, contentCentered, contentSideMargin, editorWidth, load: loadSettings, persist: persistSettings } = useSettings()
const {
  content, fileName, unsaved, dropVisible, persistence,
  changed, openLocalLink, save, saveAs,
  onDragEnter, onDragLeave, onDrop, initialize: initializeDocument,
} = useMarkdownDocument({
  sessionId,
  initialFile,
  capturedConversationId,
  fresh: params.get('fresh') === '1',
  showToast,
})
const {
  status: fileAccessStatus,
  allowed: fileAccessAllowed,
  noticeVisible: showFileAccessNotice,
  checking: checkingFileAccess,
  check: checkFileAccess,
  openSettings: openExtensionSettings,
  recheck: recheckFileAccess,
} = useFileAccess(showToast, params.get('access') === 'required')
const { workspace, start: startResize, stop: stopResize, reset: resetEditorWidth } = useEditorResize({
  tocVisible,
  editorWidth,
  persistSettings,
})

const rendered = computed(() => renderer.render(content.value))
const statusText = computed(() => `${fileName.value}${unsaved.value ? ' · 有未保存修改' : ''}`)
const workspaceStyle = computed(() => ({
  '--editor-width': editorWidth.value ? `${editorWidth.value}px` : '42%',
  '--content-side-margin': `${contentSideMargin.value}px`,
}))
const bodyClasses = computed(() => ({
  dark: theme.value === 'dark',
  'hide-editor': !editorExpanded.value,
  'hide-toc': !tocVisible.value,
  'content-centered': contentCentered.value,
}))

function onContentChanged() {
  changed()
  void nextTick(() => markdownPreview.value?.updateScrollSpy())
}

function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    appearanceOpen.value = false
    lightbox.value = null
    stopResize()
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 's') {
    event.preventDefault()
    void (event.shiftKey ? saveAs() : save())
  }
}

async function initialize() {
  await loadSettings()
  await initializeDocument()
  editorExpanded.value = fileName.value === '未命名.md'
  await checkFileAccess(true)
  await nextTick()
  markdownPreview.value?.updateScrollSpy()
}

watch([theme, fontSize, contentCentered, contentSideMargin], persistSettings)
watch([fileName, unsaved], () => { document.title = `${unsaved.value ? '• ' : ''}${fileName.value}` })
watch(rendered, () => {
  activeHeadingId.value = ''
  void nextTick(() => markdownPreview.value?.updateScrollSpy())
})

onMounted(() => {
  void initialize()
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('beforeunload', persistence.persistSession)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('beforeunload', persistence.persistSession)
})
</script>
