import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import 'katex/dist/katex.min.css'
import './styles.css'
import App from './App.vue'

const target = document.querySelector('#app')
if (target) createApp(App).mount(target)
