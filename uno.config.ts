import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  shortcuts: {
    'icon-btn': 'grid h-7 w-7 place-items-center rounded-2 border-0 bg-transparent p-0 text-muted cursor-pointer transition-colors hover:bg-soft hover:text-accent',
    'panel-title': 'h-12 flex items-center justify-between gap-3 border-b border-line px-3 text-xs text-muted whitespace-nowrap',
  },
  theme: {
    colors: {
      ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)',
      accent: 'var(--accent)', soft: 'var(--soft)', panel: 'var(--panel)',
    },
  },
})
