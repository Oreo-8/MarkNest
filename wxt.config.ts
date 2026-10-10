import { defineConfig } from 'wxt'
import { AI_MATCHES } from './src/ai-sites'

export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/unocss'],
  srcDir: 'src',
  publicDir: 'public',
  manifest: ({ browser }) => ({
    name: 'MarkNest - 本地 Markdown 阅读与编辑器',
    short_name: 'MarkNest',
    description: '在浏览器中预览、编辑和保存本地 Markdown 文件，并一键收录 AI 对话。',
    permissions: ['storage', 'activeTab', 'scripting', 'downloads'],
    host_permissions: ['file:///*', ...AI_MATCHES],
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: '打开 MarkNest',
      default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' },
    },
    commands: {
      'open-editor': {
        suggested_key: { default: 'Ctrl+Shift+M', mac: 'Command+Shift+M' },
        description: '打开 MarkNest',
      },
    },
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: 'marknest@oreo-8.github.io',
          strict_min_version: '153.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      },
    } : {}),
  }),
  zip: {
    includeSources: [
      'src/**',
      'public/**',
      'package.json',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'uno.config.ts',
      'wxt.config.ts',
      'README.md',
      'FIREFOX_BUILD.md',
    ],
  },
})
