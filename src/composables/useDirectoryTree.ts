import { ref } from 'vue'
import { sendMessage } from '../messaging'
import type { FileTreeNode } from '../types'

type ShowToast = (message: string) => void

function directoryName(url: URL) {
  const parts = url.pathname.split('/').filter(Boolean)
  try { return decodeURIComponent(parts.at(-1) || '/') } catch { return parts.at(-1) || '/' }
}

export function useDirectoryTree(getSourceUrl: () => string | null, showToast: ShowToast) {
  const root = ref<FileTreeNode | null>(null)
  const error = ref('')

  function currentDirectory() {
    const sourceUrl = getSourceUrl()
    if (!sourceUrl) return null
    try {
      const file = new URL(sourceUrl)
      if (file.protocol !== 'file:') return null
      return new URL('.', file)
    } catch {
      return null
    }
  }

  function createNode(name: string, kind: 'file' | 'directory', url: string): FileTreeNode {
    return { name, kind, url, children: kind === 'directory' ? null : [], expanded: false, loading: false }
  }

  async function loadChildren(node: FileTreeNode) {
    if (node.kind !== 'directory' || node.children !== null || node.loading) return
    node.loading = true
    error.value = ''
    try {
      const result = await sendMessage('listLocalDirectory', { url: node.url })
      if (!result?.ok || !result.entries) throw new Error(result?.error || '目录读取失败')
      node.children = result.entries.map((entry) => createNode(entry.name, entry.kind, entry.url))
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '目录读取失败'
      showToast(error.value)
    } finally {
      node.loading = false
    }
  }

  async function initializeDirectory() {
    const directory = currentDirectory()
    if (!directory) {
      root.value = null
      error.value = ''
      return
    }
    const node = createNode(directoryName(directory), 'directory', directory.href)
    node.expanded = true
    root.value = node
    await loadChildren(node)
  }

  async function toggleDirectory(node: FileTreeNode) {
    if (node.kind !== 'directory') return
    node.expanded = !node.expanded
    if (node.expanded) await loadChildren(node)
  }

  async function retry() {
    if (!root.value) return initializeDirectory()
    root.value.children = null
    await loadChildren(root.value)
  }

  return { root, error, toggleDirectory, initializeDirectory, retry }
}
