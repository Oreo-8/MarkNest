import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  publicDir: false,
  build: {
    emptyOutDir: false,
    target: 'chrome109',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'popup.html'),
      output: {
        entryFileNames: 'popup.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'popup.css' : 'assets/[name][extname]',
      },
    },
  },
})
