import { defineExtensionMessaging } from '@webext-core/messaging'

export interface CapturedConversation {
  title: string
  content: string
  sourceUrl: string
  siteId: string
  siteName: string
}

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface CaptureResult extends ActionResult {
  cancelled?: boolean
  conversation?: CapturedConversation
}

interface MarkNestProtocol {
  openEditor(): ActionResult
  captureAiConversation(data: { tabId?: number }): CaptureResult
  captureAiPage(): CaptureResult
  openExtensionSettings(): ActionResult
  refreshFileAccessBadge(): ActionResult & { allowed?: boolean }
  openLocalLink(data: { url: string }): ActionResult
}

export const { onMessage, sendMessage } = defineExtensionMessaging<MarkNestProtocol>()
