import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue(), UnoCSS()],
  base: '',
  publicDir: false,
  build: {
    emptyOutDir: false,
    target: 'chrome109',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/file-viewer.ts'),
      output: {
        entryFileNames: 'file-app.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'file-viewer.css' : 'assets/[name][extname]',
      },
    },
  },
})
