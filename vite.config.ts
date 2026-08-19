import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { build } from 'esbuild'
import { resolve } from 'node:path'

function extensionEntries() {
  return {
    name: 'extension-entries',
    async closeBundle() {
      await Promise.all([
        build({ entryPoints: ['src/background.ts'], outfile: 'dist/background.js', bundle: true, format: 'iife', platform: 'browser', target: 'chrome109' }),
        build({ entryPoints: ['src/file-viewer-bootstrap.ts'], outfile: 'dist/file-viewer.js', bundle: true, format: 'iife', platform: 'browser', target: 'chrome109' }),
        build({ entryPoints: ['src/ai-capture.ts'], outfile: 'dist/ai-capture.js', bundle: true, format: 'iife', platform: 'browser', target: 'chrome109' }),
      ])
    },
  }
}

export default defineConfig({
  plugins: [vue(), UnoCSS(), extensionEntries()],
  publicDir: 'public',
  build: {
    emptyOutDir: true,
    target: 'chrome109',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'editor.html'),
      output: {
        entryFileNames: 'editor.js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'editor.css' : 'assets/[name][extname]',
      },
    },
  },
})
