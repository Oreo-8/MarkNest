import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { sendMessage } from '../messaging'
import { currentLanguage, t } from '../i18n'

type ShowToast = (message: string) => void

export function useFileAccess(showToast: ShowToast, initiallyRequired = false) {
  const status = ref(t('checkingAccess'))
  const allowed = ref<boolean | null>(null)
  const noticeVisible = ref(initiallyRequired)
  const checking = ref(false)

  function updateStatus() {
    if (typeof globalThis.chrome?.extension?.isAllowedFileSchemeAccess !== 'function') status.value = t('accessLocalOnly')
    else if (allowed.value === null) status.value = t('checkingAccess')
    else status.value = allowed.value ? t('accessEnabled') : t('accessRequired')
  }
  watch(currentLanguage, updateStatus)

  async function check(showWhenDenied = true) {
    if (typeof globalThis.chrome?.extension?.isAllowedFileSchemeAccess !== 'function') {
      status.value = t('accessLocalOnly')
      return null
    }
    checking.value = true
    try {
      const hasAccess = await chrome.extension.isAllowedFileSchemeAccess()
      allowed.value = hasAccess
      updateStatus()
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
      showToast(t('accessManual'))
      return
    }
    const result = await sendMessage('openExtensionSettings')
    if (result?.ok) return

    const settingsUrl = import.meta.env.BROWSER === 'firefox'
      ? 'about:addons'
      : `chrome://extensions/?id=${chrome.runtime.id}`
    try {
      await navigator.clipboard.writeText(settingsUrl)
      showToast(t('settingsCopied'))
    } catch {
      showToast(t('accessOpenPage'))
    }
  }

  function recheck() {
    void check(true).then((hasAccess) => {
      if (hasAccess) showToast(t('accessNowEnabled'))
      else if (hasAccess === false) showToast(t('accessStillDenied'))
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
