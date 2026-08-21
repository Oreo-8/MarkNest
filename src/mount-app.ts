import { createPinia } from 'pinia'
import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import 'katex/dist/katex.min.css'
import './styles.css'
import App from './App.vue'

export function mountEditor(target: Element) {
  const app = createApp(App)
  app.use(createPinia())
  app.mount(target)
}
