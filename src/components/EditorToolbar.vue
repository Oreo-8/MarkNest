<template>
  <div class="panel-title">
    <div class="editor-status tabular-nums">
      <span>{{ t('cursorPosition', { line: cursorLine, column: cursorColumn }) }}</span>
      <span>{{ t('lines', { count: lineCount }) }}</span>
      <span>{{ t('characters', { count: characterCount }) }}</span>
      <span v-if="selectionCount">{{ t('selectedCharacters', { count: selectionCount }) }}</span>
    </div>
    <div class="flex items-center gap-1">
      <BaseIconButton
        :title="expanded ? t('collapseFormat') : t('expandFormat')"
        :aria-label="expanded ? t('collapseFormat') : t('expandFormat')"
        :aria-expanded="expanded"
        @click="emit('update:expanded', !expanded)"
      >
        <BaseIcon :src="expanded ? toolbarCollapseIcon : toolbarExpandIcon" />
      </BaseIconButton>
      <BaseIconButton :title="t('saveSource')" :aria-label="t('save')" @click="emit('save')"><BaseIcon :src="saveIcon" /></BaseIconButton>
      <BaseIconButton :title="t('saveAs')" :aria-label="t('saveAs')" @click="emit('save-as')"><BaseIcon :src="saveAsIcon" /></BaseIconButton>
    </div>
  </div>

  <div v-if="expanded" class="format-toolbar" role="toolbar" :aria-label="t('textFormat')" @pointerover="alignDropdown">
    <div class="format-dropdown heading-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" :title="t('bodyAndHeading')" @mousedown="emit('remember-selection')">{{ t('body') }}<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" :aria-label="t('bodyAndHeading')">
        <button v-for="item in headingItems" :key="item.level" type="button" role="menuitem" @mousedown.prevent @click="emit('heading', item.level)">{{ item.label }}</button>
      </div>
    </div>
    <button type="button" class="format-btn format-bold" :title="`${t('bold')} (Ctrl/⌘ B)`" @mousedown.prevent @click="emit('wrap', { prefix: '**', suffix: '**', placeholder: t('bold') })">B</button>
    <button type="button" class="format-btn format-italic" :title="`${t('italic')} (Ctrl/⌘ I)`" @mousedown.prevent @click="emit('wrap', { prefix: '*', suffix: '*', placeholder: t('italic') })">I</button>
    <button type="button" class="format-btn format-strike" :title="t('strike')" @mousedown.prevent @click="emit('wrap', { prefix: '~~', suffix: '~~', placeholder: t('strike') })">S</button>
    <button type="button" class="format-btn format-code" :title="t('inlineCode')" @mousedown.prevent @click="emit('wrap', { prefix: '`', suffix: '`', placeholder: t('inlineCode') })">&lt;/&gt;</button>
    <button type="button" class="format-btn format-text" :title="t('highlight')" @mousedown.prevent @click="emit('wrap', { prefix: '==', suffix: '==', placeholder: t('highlight') })">{{ t('highlight') }}</button>
    <button type="button" class="format-btn" :title="t('codeBlock')" @mousedown.prevent @click="emit('insert-block', { before: '```\n', content: t('codeBlock'), after: '\n```' })">{ }</button>
    <button type="button" class="format-btn format-text" :title="t('quote')" @mousedown.prevent @click="emit('quote')">{{ t('quote') }}</button>
    <div class="format-dropdown callout-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" :title="t('callout')" @mousedown="emit('remember-selection')">{{ t('callout') }}<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" :aria-label="t('callout')">
        <button v-for="item in calloutItems" :key="item.type" type="button" role="menuitem" @mousedown.prevent @click="emit('callout', item.type)">{{ item.label }}</button>
      </div>
    </div>
    <div class="format-dropdown list-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" :title="t('list')" @mousedown="emit('remember-selection')">{{ t('list') }}<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" :aria-label="t('list')">
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'bullet')">{{ t('bulletList') }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'ordered')">{{ t('orderedList') }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'task')">{{ t('taskList') }}</button>
      </div>
    </div>
    <button type="button" class="format-btn format-text" :title="`${t('link')} (Ctrl/⌘ K)`" @mousedown.prevent @click="emit('link', false)">{{ t('link') }}</button>
    <div class="format-dropdown formula-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" :title="t('formula')" @mousedown="emit('remember-selection')">{{ t('formula') }}<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" :aria-label="t('formula')">
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('wrap', { prefix: '$', suffix: '$', placeholder: 'E = mc^2' })">{{ t('inlineFormula') }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('insert-block', { before: '$$\n', content: 'E = mc^2', after: '\n$$' })">{{ t('formulaBlock') }}</button>
      </div>
    </div>
    <button type="button" class="format-btn format-text" :title="t('flowchart')" @mousedown.prevent @click="emit('insert-block', { before: '```mermaid\n', content: 'flowchart LR\n  A[Start] --> B[End]', after: '\n```' })">{{ t('flowchart') }}</button>
    <div class="format-dropdown more-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" :title="t('more')" @mousedown="emit('remember-selection')">{{ t('more') }}<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" :aria-label="t('more')">
        <button v-for="level in [4, 5, 6]" :key="level" type="button" role="menuitem" @mousedown.prevent @click="emit('heading', level)">{{ t('heading', { level }) }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('link', true)">{{ t('insertImage') }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('table')">{{ t('insertTable') }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('insert-block', { before: '', content: '---', selectContent: false })">{{ t('insertDivider') }}</button>
      </div>
    </div>
    <span class="format-separator"></span>
    <div class="format-action-group">
      <button type="button" class="format-btn format-text" :title="t('clear')" @mousedown.prevent @click="emit('clear')">{{ t('clear') }}</button>
      <button type="button" class="format-btn" :disabled="!canUndo" :title="`${t('undo')} (Ctrl/⌘ Z)`" @mousedown.prevent @click="emit('undo')">↶</button>
      <button type="button" class="format-btn" :disabled="!canRedo" :title="`${t('redo')} (Ctrl/⌘ Shift Z)`" @mousedown.prevent @click="emit('redo')">↷</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import saveAsIcon from '../assets/icons/save-as.svg'
import saveIcon from '../assets/icons/save.svg'
import toolbarCollapseIcon from '../assets/icons/toolbar-collapse.svg'
import toolbarExpandIcon from '../assets/icons/toolbar-expand.svg'
import BaseIcon from './BaseIcon.vue'
import BaseIconButton from './BaseIconButton.vue'
import { computed } from 'vue'
import { t } from '../i18n'

const headingItems = computed(() => [0, 1, 2, 3].map(level => ({ level, label: level ? t('heading', { level }) : t('body') })))
const calloutItems = computed(() => [
  { type: 'NOTE', label: `ℹ ${t('note')}` }, { type: 'TIP', label: `✦ ${t('tip')}` },
  { type: 'IMPORTANT', label: `★ ${t('important')}` }, { type: 'WARNING', label: `⚠ ${t('warning')}` },
  { type: 'SUCCESS', label: `✓ ${t('success')}` },
])

defineProps<{
  lineCount: number
  characterCount: number
  cursorLine: number
  cursorColumn: number
  selectionCount: number
  expanded: boolean
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'remember-selection': []
  save: []
  'save-as': []
  heading: [level: number]
  wrap: [payload: { prefix: string; suffix: string; placeholder: string }]
  'insert-block': [payload: { before: string; content: string; after?: string; selectContent?: boolean }]
  quote: []
  callout: [type: string]
  list: [type: string]
  link: [image: boolean]
  table: []
  clear: []
  undo: []
  redo: []
}>()

function alignDropdown(event: PointerEvent) {
  const dropdown = (event.target as HTMLElement).closest<HTMLElement>('.format-dropdown')
  const panel = dropdown?.closest<HTMLElement>('.editor-panel')
  const menu = dropdown?.querySelector<HTMLElement>('.format-dropdown-menu')
  if (!dropdown || !panel || !menu) return
  const dropdownRect = dropdown.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  dropdown.classList.toggle('align-right', dropdownRect.left + menu.offsetWidth > panelRect.right - 8)
}
</script>
