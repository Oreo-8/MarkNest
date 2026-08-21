import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sendMessage } from '../messaging'

type ShowToast = (message: string) => void

export function useFileAccess(showToast: ShowToast, initiallyRequired = false) {
  const status = ref('正在检查本地文件接管权限…')
  const allowed = ref<boolean | null>(null)
  const noticeVisible = ref(initiallyRequired)
  const checking = ref(false)

  async function check(showWhenDenied = true) {
    if (typeof globalThis.chrome?.extension?.isAllowedFileSchemeAccess !== 'function') {
      status.value = '文件仅在本机处理'
      return null
    }
    checking.value = true
    try {
      const hasAccess = await chrome.extension.isAllowedFileSchemeAccess()
      allowed.value = hasAccess
      status.value = hasAccess
        ? '✓ 已开启本地 MD 自动接管'
        : '⚠ 请开启“允许访问文件网址”，否则无法打开本地 MD'
      if (hasAccess) noticeVisible.value = false
      else if (showWhenDenied) noticeVisible.value = true
      void sendMessage('refreshFileAccessBadge').catch(() => undefined)
      return hasAccess
    } finally {
      checking.value = false
    }
  }

  async function openSettings() {
    if (!globalThis.chrome?.runtime?.sendMessage) {
      showToast('请手动打开扩展管理页，并开启“允许访问文件网址”')
      return
    }
    const result = await sendMessage('openExtensionSettings')
    if (result?.ok) return

    const settingsUrl = `chrome://extensions/?id=${chrome.runtime.id}`
    try {
      await navigator.clipboard.writeText(settingsUrl)
      showToast('扩展设置地址已复制，请粘贴到地址栏打开')
    } catch {
      showToast('请打开扩展管理页，并开启“允许访问文件网址”')
    }
  }

  function recheck() {
    void check(true).then((hasAccess) => {
      if (hasAccess) showToast('本地文件访问已开启')
      else if (hasAccess === false) showToast('尚未检测到权限，请确认开关已经开启')
    })
  }

  function checkAfterReturn() {
    if (!document.hidden) void check(noticeVisible.value)
  }

  onMounted(() => {
    window.addEventListener('focus', checkAfterReturn)
    document.addEventListener('visibilitychange', checkAfterReturn)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('focus', checkAfterReturn)
    document.removeEventListener('visibilitychange', checkAfterReturn)
  })

  return { status, allowed, noticeVisible, checking, check, openSettings, recheck }
}
