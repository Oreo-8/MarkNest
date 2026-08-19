<script setup lang="ts">
import saveAsIcon from '../assets/icons/save-as.svg'
import saveIcon from '../assets/icons/save.svg'
import toolbarCollapseIcon from '../assets/icons/toolbar-collapse.svg'
import toolbarExpandIcon from '../assets/icons/toolbar-expand.svg'
import BaseIcon from './BaseIcon.vue'
import BaseIconButton from './BaseIconButton.vue'

defineProps<{
  lineCount: number
  characterCount: number
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

<template>
  <div class="panel-title">
    <div class="flex items-center gap-2.5 tabular-nums"><span>{{ lineCount }} 行</span><span>{{ characterCount }} 字符</span></div>
    <div class="flex items-center gap-1">
      <BaseIconButton
        :title="expanded ? '收起格式工具栏' : '展开格式工具栏'"
        :aria-label="expanded ? '收起格式工具栏' : '展开格式工具栏'"
        :aria-expanded="expanded"
        @click="emit('update:expanded', !expanded)"
      >
        <BaseIcon :src="expanded ? toolbarCollapseIcon : toolbarExpandIcon" />
      </BaseIconButton>
      <BaseIconButton title="保存源文件（首次需要选择授权）" aria-label="保存源文件" @click="emit('save')"><BaseIcon :src="saveIcon" /></BaseIconButton>
      <BaseIconButton title="另存为" aria-label="另存为" @click="emit('save-as')"><BaseIcon :src="saveAsIcon" /></BaseIconButton>
    </div>
  </div>

  <div v-if="expanded" class="format-toolbar" role="toolbar" aria-label="文本格式" @pointerover="alignDropdown">
    <div class="format-dropdown heading-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="正文与标题" @mousedown="emit('remember-selection')">正文<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" aria-label="正文与标题">
        <button v-for="item in [{ level: 0, label: '正文' }, { level: 1, label: '标题 1' }, { level: 2, label: '标题 2' }, { level: 3, label: '标题 3' }]" :key="item.level" type="button" role="menuitem" @mousedown.prevent @click="emit('heading', item.level)">{{ item.label }}</button>
      </div>
    </div>
    <button type="button" class="format-btn format-bold" title="加粗 (Ctrl/⌘ B)" @mousedown.prevent @click="emit('wrap', { prefix: '**', suffix: '**', placeholder: '粗体文字' })">B</button>
    <button type="button" class="format-btn format-italic" title="斜体 (Ctrl/⌘ I)" @mousedown.prevent @click="emit('wrap', { prefix: '*', suffix: '*', placeholder: '斜体文字' })">I</button>
    <button type="button" class="format-btn format-strike" title="删除线" @mousedown.prevent @click="emit('wrap', { prefix: '~~', suffix: '~~', placeholder: '删除文字' })">S</button>
    <button type="button" class="format-btn format-code" title="行内代码" @mousedown.prevent @click="emit('wrap', { prefix: '`', suffix: '`', placeholder: '代码' })">&lt;/&gt;</button>
    <button type="button" class="format-btn format-text" title="高亮" @mousedown.prevent @click="emit('wrap', { prefix: '==', suffix: '==', placeholder: '高亮内容' })">高亮</button>
    <button type="button" class="format-btn" title="代码块" @mousedown.prevent @click="emit('insert-block', { before: '```\n', content: '在这里输入代码', after: '\n```' })">{ }</button>
    <button type="button" class="format-btn format-text" title="引用" @mousedown.prevent @click="emit('quote')">引用</button>
    <div class="format-dropdown callout-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="提示块" @mousedown="emit('remember-selection')">提示块<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" aria-label="提示块">
        <button v-for="item in [{ type: 'NOTE', label: 'ℹ 提示' }, { type: 'TIP', label: '✦ 技巧' }, { type: 'IMPORTANT', label: '★ 重要' }, { type: 'WARNING', label: '⚠ 警告' }, { type: 'SUCCESS', label: '✓ 成功' }]" :key="item.type" type="button" role="menuitem" @mousedown.prevent @click="emit('callout', item.type)">{{ item.label }}</button>
      </div>
    </div>
    <div class="format-dropdown list-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="列表" @mousedown="emit('remember-selection')">列表<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" aria-label="列表">
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'bullet')">无序列表</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'ordered')">有序列表</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('list', 'task')">任务列表</button>
      </div>
    </div>
    <button type="button" class="format-btn format-text" title="插入链接 (Ctrl/⌘ K)" @mousedown.prevent @click="emit('link', false)">链接</button>
    <div class="format-dropdown formula-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="数学公式" @mousedown="emit('remember-selection')">公式<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" aria-label="数学公式">
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('wrap', { prefix: '$', suffix: '$', placeholder: 'E = mc^2' })">行内公式</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('insert-block', { before: '$$\n', content: 'E = mc^2', after: '\n$$' })">公式块</button>
      </div>
    </div>
    <button type="button" class="format-btn format-text" title="插入 Mermaid 流程图" @mousedown.prevent @click="emit('insert-block', { before: '```mermaid\n', content: 'flowchart LR\n  A[开始] --> B[结束]', after: '\n```' })">流程图</button>
    <div class="format-dropdown more-dropdown">
      <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="更多格式" @mousedown="emit('remember-selection')">更多<span class="dropdown-arrow">▾</span></button>
      <div class="format-dropdown-menu" role="menu" aria-label="更多格式">
        <button v-for="level in [4, 5, 6]" :key="level" type="button" role="menuitem" @mousedown.prevent @click="emit('heading', level)">标题 {{ level }}</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('link', true)">插入图片</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('table')">插入表格</button>
        <button type="button" role="menuitem" @mousedown.prevent @click="emit('insert-block', { before: '', content: '---', selectContent: false })">插入分割线</button>
      </div>
    </div>
    <span class="format-separator"></span>
    <div class="format-action-group">
      <button type="button" class="format-btn format-text" title="清除选中内容的格式" @mousedown.prevent @click="emit('clear')">清除</button>
      <button type="button" class="format-btn" :disabled="!canUndo" title="撤销 (Ctrl/⌘ Z)" @mousedown.prevent @click="emit('undo')">↶</button>
      <button type="button" class="format-btn" :disabled="!canRedo" title="重做 (Ctrl/⌘ Shift Z)" @mousedown.prevent @click="emit('redo')">↷</button>
    </div>
  </div>
</template>
