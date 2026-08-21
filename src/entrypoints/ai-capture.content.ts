import { captureConversation } from '../ai-capture'
import { AI_MATCHES } from '../ai-sites'
import { onMessage } from '../messaging'

export default defineContentScript({
  matches: AI_MATCHES,
  runAt: 'document_idle',
  main() {
    onMessage('captureAiPage', () => {
      try {
        return { ok: true, conversation: captureConversation() }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : '对话读取失败' }
      }
    })
  },
})
