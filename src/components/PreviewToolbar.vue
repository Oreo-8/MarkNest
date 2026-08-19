<script setup lang="ts">
import alignCenterIcon from '../assets/icons/align-center.svg'
import editIcon from '../assets/icons/edit.svg'
import paletteIcon from '../assets/icons/palette.svg'
import themeIcon from '../assets/icons/theme.svg'
import tocIcon from '../assets/icons/toc.svg'
import BaseIcon from './BaseIcon.vue'
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
        <BaseIcon :src="tocIcon" />
      </BaseIconButton>
      <span class="file-status">{{ statusText }}</span>
    </div>
    <div class="preview-actions">
      <BaseIconButton title="预览外观" aria-label="预览外观" :aria-expanded="appearanceOpen" @click.stop="emit('update:appearanceOpen', !appearanceOpen)">
        <BaseIcon :src="paletteIcon" />
      </BaseIconButton>
      <div v-if="appearanceOpen" class="appearance-popover" @click.stop>
        <div class="font-700 text-3.25">预览外观</div>
        <label class="appearance-field">
          <span>字体大小 <output>{{ fontSize }}px</output></span>
          <input :value="fontSize" type="range" min="12" max="22" step="1" @input="emit('update:fontSize', Number(($event.target as HTMLInputElement).value))">
        </label>
      </div>
      <BaseIconButton :selected="contentCentered" :title="contentCentered ? '取消内容居中' : '内容居中'" :aria-label="contentCentered ? '取消内容居中' : '内容居中'" :aria-pressed="contentCentered" @click="emit('update:contentCentered', !contentCentered)">
        <BaseIcon :src="alignCenterIcon" />
      </BaseIconButton>
      <BaseIconButton :selected="theme === 'dark'" title="切换黑白主题" aria-label="切换黑白主题" @click="emit('update:theme', theme === 'dark' ? 'light' : 'dark')">
        <BaseIcon :src="themeIcon" />
      </BaseIconButton>
      <BaseIconButton :selected="editorExpanded" :title="editorExpanded ? '收起编辑器' : '展开编辑器'" :aria-label="editorExpanded ? '收起编辑器' : '展开编辑器'" :aria-pressed="editorExpanded" @click="emit('update:editorExpanded', !editorExpanded)">
        <BaseIcon :src="editIcon" />
      </BaseIconButton>
    </div>
  </div>
</template>
