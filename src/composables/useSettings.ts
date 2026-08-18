import { ref } from 'vue'
import type { UserSettings } from '../types'

async function chromeGet<T>(key: string): Promise<T | undefined> {
  if (!globalThis.chrome?.storage?.local) return undefined
  const stored = await chrome.storage.local.get(key)
  return stored[key] as T | undefined
}

export function useSettings() {
  const theme = ref<'dark' | 'light'>('dark')
  const fontSize = ref(15)
  const contentCentered = ref(false)
  const editorWidth = ref<number | null>(null)

  async function load() {
    const defaults: UserSettings = { theme: 'dark', fontSize: 15, contentCentered: false, editorWidth: null }
    const stored = await chromeGet<Partial<UserSettings>>('userSettings')
    let local: Partial<UserSettings> = {}
    try { local = JSON.parse(localStorage.getItem('userSettings') || '{}') as Partial<UserSettings> } catch { /* ignore */ }
    const settings = { ...defaults, ...local, ...stored }
    theme.value = settings.theme === 'light' ? 'light' : 'dark'
    fontSize.value = Math.min(22, Math.max(12, Number(settings.fontSize) || 15))
    contentCentered.value = Boolean(settings.contentCentered)
    editorWidth.value = settings.editorWidth && settings.editorWidth >= 280 ? settings.editorWidth : null
  }

  function persist() {
    const settings: UserSettings = {
      theme: theme.value,
      fontSize: fontSize.value,
      contentCentered: contentCentered.value,
      editorWidth: editorWidth.value,
    }
    try { localStorage.setItem('userSettings', JSON.stringify(settings)) } catch { /* ignore */ }
    void globalThis.chrome?.storage?.local?.set({ userSettings: settings })
  }

  return { theme, fontSize, contentCentered, editorWidth, load, persist }
}
