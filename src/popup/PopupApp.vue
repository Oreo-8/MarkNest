<template>
  <main class="popup-shell">
    <header class="popup-header">
      <img :src="iconUrl" alt="" width="32" height="32">
      <div class="popup-brand"><strong>MarkNest</strong><span>{{ t('localWorkbench') }}</span></div>
      <div class="language-picker">
        <button type="button" class="language-trigger" :title="t('language')" :aria-label="t('language')" :aria-expanded="languageOpen" @click.stop="languageOpen = !languageOpen">
          <svg class="translate-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12.87 15.07-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17A15.66 15.66 0 0 1 9 11.35 15.66 15.66 0 0 1 6.69 8h-2c.73 1.63 1.73 3.17 3.04 4.56l-5.09 5.02L4.06 19l5-5 3.11 3.11.7-2.04ZM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12Zm-2.62 7 1.62-4.33L19.12 17h-3.24Z" />
          </svg><small>{{ activeLanguage.short }}</small>
        </button>
        <div v-if="languageOpen" class="language-menu" role="menu">
          <button v-for="option in languageOptions" :key="option.value" type="button" role="menuitemradio" :aria-checked="language === option.value" :class="{ active: language === option.value }" @click="changeLanguage(option.value)">
            <span>{{ option.short }}</span>{{ option.label }}<b aria-hidden="true">{{ language === option.value ? '✓' : '' }}</b>
          </button>
        </div>
      </div>
    </header>

    <section class="popup-actions">
      <button type="button" class="popup-action" @click="newEditor">
        <span class="action-icon" aria-hidden="true">＋</span>
        <span><strong>{{ t('newEditor') }}</strong><small>{{ t('newEditorHint') }}</small></span>
        <span class="action-arrow" aria-hidden="true">›</span>
      </button>

      <button type="button" class="popup-action" :disabled="!activeSite || busy" @click="captureConversation">
        <span class="action-icon chat" aria-hidden="true">↧</span>
        <span><strong>{{ t('capture') }}</strong><small>{{ activeSite ? t('captureCurrent', { site: activeSite.name }) : t('captureHint') }}</small></span>
        <span class="action-arrow" aria-hidden="true">›</span>
      </button>
    </section>

    <p v-if="status" class="popup-status" :class="statusKind" role="status">{{ status }}</p>
    <footer>{{ t('localOnly') }}</footer>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { findAiSite } from '../ai-sites'
import { currentLanguage, languageOptions, normalizeLanguage, setCurrentLanguage, t, type Language } from '../i18n'
import { sendMessage } from '../messaging'

const activeSite = ref<ReturnType<typeof findAiSite>>()
const busy = ref(false)
const status = ref('')
const statusKind = ref<'info' | 'error' | 'success'>('info')
const iconUrl = chrome.runtime.getURL('/icons/icon-32.png')
const language = currentLanguage
const languageOpen = ref(false)
const activeLanguage = computed(() => languageOptions.find(option => option.value === language.value) ?? languageOptions[0])
let activeTabId: number | undefined

async function changeLanguage(value: Language) {
  setCurrentLanguage(value)
  languageOpen.value = false
  const stored = await chrome.storage.local.get('userSettings')
  await chrome.storage.local.set({ userSettings: { ...(stored.userSettings || {}), language: value } })
}

function onStorageChanged(changes: Record<string, chrome.storage.StorageChange>, area: string) {
  if (area === 'local' && changes.userSettings) setCurrentLanguage(changes.userSettings.newValue?.language)
}

function setStatus(message: string, kind: 'info' | 'error' | 'success' = 'info') {
  status.value = message
  statusKind.value = kind
}

async function newEditor() {
  await sendMessage('openEditor')
  window.close()
}

async function captureConversation() {
  if (!activeSite.value || busy.value) return
  busy.value = true
  setStatus(t('preparing'))
  try {
    const result = await sendMessage('captureAiConversation', { tabId: activeTabId })
    if (!result?.ok) throw new Error(result?.error || t('captureFailed'))
    if (result.cancelled) {
      setStatus(t('saveCancelled'))
      return
    }
    setStatus(t('captured'), 'success')
    window.setTimeout(() => window.close(), 700)
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
    setStatus(message || t('captureFailed'), 'error')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  const stored = await chrome.storage.local.get('userSettings')
  setCurrentLanguage(normalizeLanguage(stored.userSettings?.language))
  chrome.storage.onChanged.addListener(onStorageChanged)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  activeTabId = tab?.id
  activeSite.value = findAiSite(tab?.url)
  if (!activeSite.value) setStatus(t('unsupportedSite'))
})

onBeforeUnmount(() => chrome.storage.onChanged.removeListener(onStorageChanged))
</script>
