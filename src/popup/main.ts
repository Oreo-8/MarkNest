import { createPinia } from 'pinia'
import { createApp } from 'vue'
import PopupApp from './PopupApp.vue'
import './popup.css'

const app = createApp(PopupApp)
app.use(createPinia())
app.mount('#popup-app')
