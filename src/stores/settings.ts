import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserSettings } from '../types'

const defaults: UserSettings = {
  theme: 'dark',
  fontSize: 15,
  contentCentered: false,
  contentSideMargin: 120,
  editorWidth: null,
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'dark' | 'light'>(defaults.theme)
  const fontSize = ref(defaults.fontSize)
  const contentCentered = ref(defaults.contentCentered)
  const contentSideMargin = ref(defaults.contentSideMargin)
  const editorWidth = ref<number | null>(defaults.editorWidth)

  async function load() {
    const stored = await chrome.storage.local.get('userSettings')
    let local: Partial<UserSettings> = {}
    try { local = JSON.parse(localStorage.getItem('userSettings') || '{}') as Partial<UserSettings> } catch { /* ignore */ }
    const settings = { ...defaults, ...local, ...stored.userSettings as Partial<UserSettings> }
    theme.value = settings.theme === 'light' ? 'light' : 'dark'
    fontSize.value = Math.min(22, Math.max(12, Number(settings.fontSize) || defaults.fontSize))
    contentCentered.value = Boolean(settings.contentCentered)
    contentSideMargin.value = Math.min(320, Math.max(32, Number(settings.contentSideMargin) || defaults.contentSideMargin))
    editorWidth.value = settings.editorWidth && settings.editorWidth >= 280 ? settings.editorWidth : null
  }

  function persist() {
    const settings: UserSettings = {
      theme: theme.value,
      fontSize: fontSize.value,
      contentCentered: contentCentered.value,
      contentSideMargin: contentSideMargin.value,
      editorWidth: editorWidth.value,
    }
    try { localStorage.setItem('userSettings', JSON.stringify(settings)) } catch { /* ignore */ }
    void chrome.storage.local.set({ userSettings: settings })
  }

  return { theme, fontSize, contentCentered, contentSideMargin, editorWidth, load, persist }
})
