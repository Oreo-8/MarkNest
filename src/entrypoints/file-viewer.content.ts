import { createPinia } from 'pinia'
import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import 'katex/dist/katex.min.css'
import '../styles.css'
import App from '../App.vue'

export default defineContentScript({
  matches: ['file:///*.md', 'file:///*.markdown'],
  runAt: 'document_idle',
  main() {
    const initialFile = {
      name: decodeURIComponent(location.pathname.split('/').pop() || '未命名.md'),
      content: document.querySelector('pre')?.textContent ?? document.body?.innerText ?? '',
      sourceUrl: location.href,
    }

    document.documentElement.replaceChildren(document.createElement('head'), document.createElement('body'))
    const viewport = document.createElement('meta')
    viewport.name = 'viewport'
    viewport.content = 'width=device-width, initial-scale=1.0'
    document.head.append(viewport)
    document.title = initialFile.name

    const target = document.createElement('div')
    target.id = 'app'
    document.body.append(target)
    window.__markdownInitialFile = initialFile

    const app = createApp(App)
    app.use(createPinia())
    app.mount(target)
  },
})
