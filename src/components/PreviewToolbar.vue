<script setup lang="ts">
import BaseIconButton from './BaseIconButton.vue'

defineProps<{
  statusText: string
  tocVisible: boolean
  appearanceOpen: boolean
  fontSize: number
  contentCentered: boolean
  theme: 'dark' | 'light'
  editorExpanded: boolean
}>()

const emit = defineEmits<{
  'update:tocVisible': [value: boolean]
  'update:appearanceOpen': [value: boolean]
  'update:fontSize': [value: number]
  'update:contentCentered': [value: boolean]
  'update:theme': [value: 'dark' | 'light']
  'update:editorExpanded': [value: boolean]
}>()
</script>

<template>
  <div class="panel-title px-2.5">
    <div class="min-w-0 flex flex-1 items-center gap-2">
      <BaseIconButton :title="tocVisible ? '收起目录' : '展开目录'" :aria-label="tocVisible ? '收起目录' : '展开目录'" :aria-pressed="tocVisible" @click="emit('update:tocVisible', !tocVisible)">
        <svg viewBox="0 0 24 24"><path d="M4 5h3v14H4V5Zm5 0h11v2H9V5Zm0 6h11v2H9v-2Zm0 6h11v2H9v-2Z" /></svg>
      </BaseIconButton>
      <span class="file-status">{{ statusText }}</span>
    </div>
    <div class="preview-actions">
      <BaseIconButton title="预览外观" aria-label="预览外观" :aria-expanded="appearanceOpen" @click.stop="emit('update:appearanceOpen', !appearanceOpen)">
        <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18h1.4a2.6 2.6 0 0 0 1.8-4.4l-.4-.4a.7.7 0 0 1 .5-1.2H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Zm-4.5 9A1.5 1.5 0 1 1 7.5 9a1.5 1.5 0 0 1 0 3Zm2-4A1.5 1.5 0 1 1 9.5 5a1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm2 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" /></svg>
      </BaseIconButton>
      <div v-if="appearanceOpen" class="appearance-popover" @click.stop>
        <div class="font-700 text-3.25">预览外观</div>
        <label class="appearance-field">
          <span>字体大小 <output>{{ fontSize }}px</output></span>
          <input :value="fontSize" type="range" min="12" max="22" step="1" @input="emit('update:fontSize', Number(($event.target as HTMLInputElement).value))">
        </label>
      </div>
      <BaseIconButton :selected="contentCentered" :title="contentCentered ? '取消内容居中' : '内容居中'" :aria-label="contentCentered ? '取消内容居中' : '内容居中'" :aria-pressed="contentCentered" @click="emit('update:contentCentered', !contentCentered)">
        <svg viewBox="0 0 24 24"><path d="M4 5h16v2H4V5Zm3 4h10v2H7V9Zm-3 4h16v2H4v-2Zm3 4h10v2H7v-2Z" /></svg>
      </BaseIconButton>
      <BaseIconButton :selected="theme === 'dark'" title="切换黑白主题" aria-label="切换黑白主题" @click="emit('update:theme', theme === 'dark' ? 'light' : 'dark')">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20V2Zm-1.5 17.8a8 8 0 0 1 0-15.6v15.6Z" /></svg>
      </BaseIconButton>
      <BaseIconButton :selected="editorExpanded" :title="editorExpanded ? '收起编辑器' : '展开编辑器'" :aria-label="editorExpanded ? '收起编辑器' : '展开编辑器'" :aria-pressed="editorExpanded" @click="emit('update:editorExpanded', !editorExpanded)">
        <svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16v4Zm2-3.2 9-9L16.2 9l-9 9H6v-1.2ZM17.7 6.3l1-1a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4l-1 1-2-2Z" /></svg>
      </BaseIconButton>
    </div>
  </div>
</template>
