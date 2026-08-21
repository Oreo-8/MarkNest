import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

interface EditorResizeOptions {
  tocVisible: Ref<boolean>
  editorWidth: Ref<number | null>
  persistSettings: () => void
}

export function useEditorResize({ tocVisible, editorWidth, persistSettings }: EditorResizeOptions) {
  const workspace = ref<HTMLElement | null>(null)
  let resizing = false
  let resizeRight = 0
  let resizeMaxWidth = 280
  let pendingEditorWidth = 0
  let resizeFrame = 0

  function start(event: PointerEvent) {
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

  function move(event: PointerEvent) {
    if (!resizing || !workspace.value) return
    if (event.buttons === 0) return stop()
    pendingEditorWidth = Math.min(resizeMaxWidth, Math.max(280, resizeRight - event.clientX))
    if (resizeFrame) return
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0
      workspace.value?.style.setProperty('--editor-width', `${pendingEditorWidth}px`)
    })
  }

  function stop() {
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

  function reset() {
    editorWidth.value = null
    persistSettings()
  }

  onMounted(() => {
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('blur', stop)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', stop)
    window.removeEventListener('blur', stop)
    cancelAnimationFrame(resizeFrame)
  })

  return { workspace, start, stop, reset }
}
