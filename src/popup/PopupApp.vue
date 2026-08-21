<template>
  <main class="popup-shell">
    <header class="popup-header">
      <img :src="iconUrl" alt="" width="32" height="32">
      <div><strong>MarkNest</strong><span>本地 Markdown 工作台</span></div>
    </header>

    <section class="popup-actions">
      <button type="button" class="popup-action" @click="newEditor">
        <span class="action-icon" aria-hidden="true">＋</span>
        <span><strong>新建编辑页</strong><small>打开一个空白 Markdown 页面</small></span>
        <span class="action-arrow" aria-hidden="true">›</span>
      </button>

      <button type="button" class="popup-action" :disabled="!activeSite || busy" @click="captureConversation">
        <span class="action-icon chat" aria-hidden="true">↧</span>
        <span><strong>收录对话</strong><small>{{ activeSite ? `选择位置保存当前 ${activeSite.name} 对话` : '支持主流 AI 对话网站' }}</small></span>
        <span class="action-arrow" aria-hidden="true">›</span>
      </button>
    </section>

    <p v-if="status" class="popup-status" :class="statusKind" role="status">{{ status }}</p>
    <footer>内容仅在本机处理</footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { findAiSite } from '../ai-sites'
import { sendMessage } from '../messaging'

const activeSite = ref<ReturnType<typeof findAiSite>>()
const busy = ref(false)
const status = ref('')
const statusKind = ref<'info' | 'error' | 'success'>('info')
const iconUrl = chrome.runtime.getURL('/icons/icon-32.png')
let activeTabId: number | undefined

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
  setStatus('正在整理当前对话，随后请选择保存位置…')
  try {
    const result = await sendMessage('captureAiConversation', { tabId: activeTabId })
    if (!result?.ok) throw new Error(result?.error || '对话收录失败')
    if (result.cancelled) {
      setStatus('已取消保存')
      return
    }
    setStatus('已保存并在 MarkNest 中打开', 'success')
    window.setTimeout(() => window.close(), 700)
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
    setStatus(message || '对话收录失败', 'error')
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  activeTabId = tab?.id
  activeSite.value = findAiSite(tab?.url)
  if (!activeSite.value) setStatus('请先打开一个支持的 AI 对话页面')
})
</script>
