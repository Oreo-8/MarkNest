export type AiSiteId = 'chatgpt' | 'gemini' | 'deepseek' | 'qianwen' | 'grok' | 'doubao' | 'kimi' | 'chatglm'

export interface AiSiteDefinition {
  id: AiSiteId
  name: string
  hosts: string[]
  titleSuffixes: string[]
  userSelectors: string[]
  assistantSelectors: string[]
  turnSelectors: string[]
}

export const AI_SITES: AiSiteDefinition[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    hosts: ['chatgpt.com', 'chat.openai.com'],
    titleSuffixes: ['ChatGPT'],
    userSelectors: ['[data-message-author-role="user"]'],
    assistantSelectors: ['[data-message-author-role="assistant"]'],
    turnSelectors: ['[data-message-author-role]', 'article[data-testid^="conversation-turn"]'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    hosts: ['gemini.google.com'],
    titleSuffixes: ['Gemini'],
    userSelectors: [
      'user-query .query-text',
      '[data-test-id="user-query"]',
      '.user-query-bubble-with-background .query-text',
      '[class*="user-query"] [class*="query-text"]',
    ],
    assistantSelectors: [
      'model-response .model-response-text',
      '[data-test-id="model-response"]',
      '.model-response-text',
      '[class*="model-response"] [class*="response-text"]',
    ],
    turnSelectors: ['user-query', 'model-response', '[data-test-id*="response"]'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    hosts: ['chat.deepseek.com'],
    titleSuffixes: ['DeepSeek'],
    userSelectors: [
      '[data-message-role="user"]',
      '[data-role="user"]',
      '[data-testid*="user-message"]',
      '[class*="user-message"]',
    ],
    assistantSelectors: [
      '[data-message-role="assistant"]',
      '[data-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[class*="assistant-message"]',
    ],
    turnSelectors: ['[data-message-role]', '[data-role]', '[data-testid*="message"]'],
  },
  {
    id: 'qianwen',
    name: '通义千问',
    hosts: ['qianwen.com', 'www.qianwen.com', 'tongyi.aliyun.com', 'chat.qwen.ai'],
    titleSuffixes: ['通义千问', '千问', 'Qwen'],
    userSelectors: [
      '[data-message-role="user"]',
      '[data-role="user"]',
      '[data-testid*="user-message"]',
      '[class*="user-message"]',
      '[class*="message-user"]',
    ],
    assistantSelectors: [
      '[data-message-role="assistant"]',
      '[data-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[class*="assistant-message"]',
      '[class*="message-assistant"]',
    ],
    turnSelectors: ['[data-message-role]', '[data-role]', '[data-testid*="message"]', '[class*="message-item"]'],
  },
  {
    id: 'grok',
    name: 'Grok',
    hosts: ['grok.com', 'www.grok.com'],
    titleSuffixes: ['Grok'],
    userSelectors: [
      '[data-message-author-role="user"]',
      '[data-message-role="user"]',
      '[data-testid="user-message"]',
      '[data-testid*="user-message"]',
    ],
    assistantSelectors: [
      '[data-message-author-role="assistant"]',
      '[data-message-role="assistant"]',
      '[data-testid="assistant-message"]',
      '[data-testid*="assistant-message"]',
    ],
    turnSelectors: ['[data-message-author-role]', '[data-message-role]', '[data-testid*="message"]'],
  },
  {
    id: 'doubao',
    name: '豆包',
    hosts: ['doubao.com', 'www.doubao.com'],
    titleSuffixes: ['豆包'],
    userSelectors: [
      '[data-message-role="user"]',
      '[data-role="user"]',
      '[data-testid="message_user"]',
      '[data-testid*="user-message"]',
      '[class*="user-message"]',
    ],
    assistantSelectors: [
      '[data-message-role="assistant"]',
      '[data-role="assistant"]',
      '[data-testid="message_assistant"]',
      '[data-testid*="assistant-message"]',
      '[class*="assistant-message"]',
    ],
    turnSelectors: ['[data-message-role]', '[data-role]', '[data-testid*="message"]', '[class*="message-item"]'],
  },
  {
    id: 'kimi',
    name: 'Kimi',
    hosts: ['kimi.com', 'www.kimi.com', 'kimi.moonshot.cn'],
    titleSuffixes: ['Kimi'],
    userSelectors: [
      '[data-message-role="user"]',
      '[data-role="user"]',
      '.segment-user',
      '[class*="segment-user"]',
      '[class*="user-content"]',
    ],
    assistantSelectors: [
      '[data-message-role="assistant"]',
      '[data-role="assistant"]',
      '.segment-assistant',
      '[class*="segment-assistant"]',
      '[class*="assistant-content"]',
    ],
    turnSelectors: ['[data-message-role]', '[data-role]', '[class*="segment-"]', '[class*="message-item"]'],
  },
  {
    id: 'chatglm',
    name: '智谱清言',
    hosts: ['chatglm.cn', 'www.chatglm.cn'],
    titleSuffixes: ['智谱清言', 'ChatGLM'],
    userSelectors: [
      '[data-message-role="user"]',
      '[data-role="user"]',
      '[data-testid*="user-message"]',
      '[class*="user-message"]',
      '[class*="question-content"]',
    ],
    assistantSelectors: [
      '[data-message-role="assistant"]',
      '[data-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[class*="assistant-message"]',
      '[class*="answer-content"]',
    ],
    turnSelectors: ['[data-message-role]', '[data-role]', '[data-testid*="message"]', '[class*="message-item"]'],
  },
]

export const AI_MATCHES = AI_SITES.flatMap((site) => site.hosts.map((host) => `https://${host}/*`))

export function findAiSite(url?: string): AiSiteDefinition | undefined {
  if (!url) return undefined
  try {
    const host = new URL(url).hostname.toLowerCase()
    return AI_SITES.find((site) => site.hosts.includes(host))
  } catch {
    return undefined
  }
}
