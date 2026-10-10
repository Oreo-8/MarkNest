import { captureConversation } from '../ai-capture'
import { AI_MATCHES } from '../ai-sites'
import { onMessage } from '../messaging'
import { setCurrentLanguage, t } from '../i18n'

export default defineContentScript({
  matches: AI_MATCHES,
  runAt: 'document_idle',
  main() {
    onMessage('captureAiPage', async () => {
      const stored = await chrome.storage.local.get('userSettings')
      setCurrentLanguage(stored.userSettings?.language)
      try {
        return { ok: true, conversation: captureConversation() }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : t('conversationReadFailed') }
      }
    })
  },
})
