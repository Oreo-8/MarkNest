import { defineConfig } from 'wxt'
import { AI_MATCHES } from './src/ai-sites'

export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/unocss'],
  srcDir: 'src',
  publicDir: 'public',
  manifest: {
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
  },
})
