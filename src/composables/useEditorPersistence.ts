import { onBeforeUnmount, type Ref } from 'vue'
import type { EditorSession } from '../types'

interface EditorPersistenceState {
  content: Ref<string>
  fileName: Ref<string>
  sourceUrl: Ref<string | null>
  unsaved: Ref<boolean>
}

async function chromeGet<T>(key: string): Promise<T | undefined> {
  if (!globalThis.chrome?.storage?.local) return undefined
  const stored = await chrome.storage.local.get(key)
  return stored[key] as T | undefined
}

export function useEditorPersistence(sessionId: string, state: EditorPersistenceState) {
  const sessionKey = `editorSession:${sessionId}`
  const handleKey = `source:${sessionId}`
  let sourceHandle: FileSystemFileHandle | null = null
  let handleDbPromise: Promise<IDBDatabase | null> | null = null
  let sessionTimer = 0

  function sessionData(): EditorSession {
    return {
      name: state.fileName.value,
      content: state.content.value,
      sourceUrl: state.sourceUrl.value,
      unsaved: state.unsaved.value,
      updatedAt: Date.now(),
    }
  }

  function persistSession() {
    window.clearTimeout(sessionTimer)
    const data = sessionData()
    try { localStorage.setItem(sessionKey, JSON.stringify(data)) } catch { /* chrome.storage 是主存储 */ }
    void globalThis.chrome?.storage?.local?.set({ [sessionKey]: data })
  }

  function schedulePersistSession() {
    window.clearTimeout(sessionTimer)
    sessionTimer = window.setTimeout(persistSession, 180)
  }

  async function restoreSession() {
    let data: EditorSession | null = null
    try { data = JSON.parse(localStorage.getItem(sessionKey) || 'null') as EditorSession | null } catch { /* ignore */ }
    data ??= await chromeGet<EditorSession>(sessionKey) ?? null
    if (!data || typeof data.content !== 'string') return false
    state.content.value = data.content
    state.fileName.value = data.name || '未命名.md'
    state.sourceUrl.value = data.sourceUrl || null
    state.unsaved.value = Boolean(data.unsaved)
    return true
  }

  async function clearSession() {
    localStorage.removeItem(sessionKey)
    await globalThis.chrome?.storage?.local?.remove(sessionKey)
  }

  function getHandleDb() {
    if (handleDbPromise) return handleDbPromise
    handleDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('marknest-file-handles', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('handles')) request.result.createObjectStore('handles')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }).catch(() => null)
    return handleDbPromise
  }

  function idbResult<T>(request: IDBRequest<T>) {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function setSourceHandle(handle: FileSystemFileHandle | null) {
    sourceHandle = handle
    const db = await getHandleDb()
    if (!db) return
    const store = db.transaction('handles', 'readwrite').objectStore('handles')
    try {
      if (handle) await idbResult(store.put(handle, handleKey))
      else await idbResult(store.delete(handleKey))
    } catch { /* 某些浏览器不允许持久化句柄 */ }
  }

  async function restoreSourceHandle() {
    const db = await getHandleDb()
    if (!db) return
    try {
      const handle = await idbResult(db.transaction('handles', 'readonly').objectStore('handles').get(handleKey)) as FileSystemFileHandle | undefined
      if (handle?.name === state.fileName.value) sourceHandle = handle
    } catch { /* ignore */ }
  }

  function getSourceHandle() { return sourceHandle }

  onBeforeUnmount(() => window.clearTimeout(sessionTimer))

  return {
    persistSession,
    schedulePersistSession,
    restoreSession,
    clearSession,
    setSourceHandle,
    restoreSourceHandle,
    getSourceHandle,
  }
}
