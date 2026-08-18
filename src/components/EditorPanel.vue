<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BaseIconButton from './BaseIconButton.vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  changed: []
  'scroll-progress': [progress: number]
  save: []
  'save-as': []
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)
const savedSelection = ref({ start: 0, end: 0 })
const history = ref<string[]>([props.modelValue])
const historyIndex = ref(0)
const toolbarExpanded = ref(true)
const lineCount = computed(() => props.modelValue.length ? props.modelValue.split(/\r\n|\r|\n/).length : 1)
const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)
let lastTypingAt = 0

watch(() => props.modelValue, (value) => {
  if (value === history.value[historyIndex.value]) return
  history.value = [value]
  historyIndex.value = 0
  lastTypingAt = 0
})

function commitValue(value: string, mergeTyping = false) {
  if (value === props.modelValue) return
  const now = Date.now()
  if (mergeTyping && lastTypingAt > 0 && now - lastTypingAt < 800 && historyIndex.value === history.value.length - 1) {
    history.value[historyIndex.value] = value
    lastTypingAt = now
    emit('update:modelValue', value)
    emit('changed')
    return
  }
  const nextHistory = history.value.slice(0, historyIndex.value + 1)
  nextHistory.push(value)
  if (nextHistory.length > 100) nextHistory.shift()
  history.value = nextHistory
  historyIndex.value = nextHistory.length - 1
  lastTypingAt = mergeTyping ? now : 0
  emit('update:modelValue', value)
  emit('changed')
}

function restoreHistory(index: number) {
  if (index < 0 || index >= history.value.length) return
  historyIndex.value = index
  lastTypingAt = 0
  emit('update:modelValue', history.value[index])
  emit('changed')
  void nextTick(() => {
    textarea.value?.focus()
    const position = Math.min(savedSelection.value.start, history.value[index].length)
    textarea.value?.setSelectionRange(position, position)
  })
}

function rememberSelection() {
  if (!textarea.value) return
  savedSelection.value = { start: textarea.value.selectionStart, end: textarea.value.selectionEnd }
}

function getSelection() {
  if (!textarea.value || document.activeElement !== textarea.value) return savedSelection.value
  return { start: textarea.value.selectionStart, end: textarea.value.selectionEnd }
}

function replaceRange(start: number, end: number, replacement: string, selectStart: number, selectEnd: number) {
  commitValue(props.modelValue.slice(0, start) + replacement + props.modelValue.slice(end))
  savedSelection.value = { start: selectStart, end: selectEnd }
  void nextTick(() => {
    textarea.value?.focus()
    textarea.value?.setSelectionRange(selectStart, selectEnd)
  })
}

function wrapSelection(prefix: string, suffix: string, placeholder: string) {
  const { start, end } = getSelection()
  const selected = props.modelValue.slice(start, end)
  const alreadyWrapped = start >= prefix.length
    && props.modelValue.slice(start - prefix.length, start) === prefix
    && props.modelValue.slice(end, end + suffix.length) === suffix

  if (alreadyWrapped) {
    replaceRange(start - prefix.length, end + suffix.length, selected, start - prefix.length, end - prefix.length)
    return
  }
  const text = selected || placeholder
  replaceRange(start, end, `${prefix}${text}${suffix}`, start + prefix.length, start + prefix.length + text.length)
}

function getLineRange() {
  const { start, end } = getSelection()
  const lineStart = props.modelValue.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  let lineEnd = props.modelValue.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = props.modelValue.length
  return { start: lineStart, end: lineEnd, text: props.modelValue.slice(lineStart, lineEnd) }
}

function transformLines(transform: (lines: string[]) => string[]) {
  const range = getLineRange()
  const replacement = transform(range.text.split('\n')).join('\n')
  replaceRange(range.start, range.end, replacement, range.start, range.start + replacement.length)
}

function setHeading(level: number) {
  const marker = level ? `${'#'.repeat(level)} ` : ''
  transformLines(lines => lines.map((line) => {
    const clean = line.replace(/^#{1,6}\s+/, '')
    if (!clean && lines.length > 1) return ''
    return marker + (clean || (level ? '标题' : ''))
  }))
}

function toggleLinePrefix(pattern: RegExp, prefix: string | ((index: number) => string)) {
  transformLines((lines) => {
    const nonEmpty = lines.filter(line => line.trim())
    const remove = nonEmpty.length > 0 && nonEmpty.every(line => pattern.test(line))
    let itemIndex = 0
    return lines.map((line) => {
      if (!line.trim()) return line
      const clean = line.replace(pattern, '')
      const marker = typeof prefix === 'function' ? prefix(itemIndex) : prefix
      itemIndex += 1
      return remove ? clean : `${marker}${clean}`
    })
  })
}

function insertBlock(before: string, content: string, after = '', selectContent = true) {
  const { start, end } = getSelection()
  const selected = props.modelValue.slice(start, end) || content
  const leadingBreak = start > 0 && props.modelValue[start - 1] !== '\n' ? '\n' : ''
  const trailingBreak = end < props.modelValue.length && props.modelValue[end] !== '\n' ? '\n' : ''
  const replacement = `${leadingBreak}${before}${selected}${after}${trailingBreak}`
  const contentStart = start + leadingBreak.length + before.length
  const cursorEnd = selectContent ? contentStart + selected.length : start + replacement.length
  replaceRange(start, end, replacement, selectContent ? contentStart : cursorEnd, cursorEnd)
}

function insertLink(image = false) {
  const { start, end } = getSelection()
  const label = props.modelValue.slice(start, end) || (image ? '图片描述' : '链接文字')
  const url = image ? '图片地址' : 'https://'
  const replacement = `${image ? '!' : ''}[${label}](${url})`
  const urlStart = start + (image ? 1 : 0) + label.length + 3
  replaceRange(start, end, replacement, urlStart, urlStart + url.length)
}

function insertTable() {
  const table = '| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'
  insertBlock('', table, '', false)
}

function insertCallout(type: string) {
  const { start, end } = getSelection()
  const selected = props.modelValue.slice(start, end) || '提示内容'
  const body = selected.split('\n').map(line => `> ${line}`).join('\n')
  const leadingBreak = start > 0 && props.modelValue[start - 1] !== '\n' ? '\n' : ''
  const trailingBreak = end < props.modelValue.length && props.modelValue[end] !== '\n' ? '\n' : ''
  const prefix = `${leadingBreak}> [!${type}]\n`
  const replacement = `${prefix}${body}${trailingBreak}`
  replaceRange(start, end, replacement, start + prefix.length + 2, start + prefix.length + body.length)
}

function clearFormatting() {
  let { start, end } = getSelection()
  if (start === end) ({ start, end } = getLineRange())
  const selected = props.modelValue.slice(start, end)
  const cleaned = selected
    .replace(/^```[^\n]*\n?|\n?```$/gm, '')
    .replace(/^\s*>\s*\[![A-Z]+\]\s*$/gim, '')
    .replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/==([^=]+)==/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*([^*]+)\*|_([^_]+)_/g, '$1$2')
    .replace(/^\$\$\s*|\s*\$\$$/g, '')
    .replace(/^\$|\$$/g, '')
  replaceRange(start, end, cleaned, start, start + cleaned.length)
}

function applyList(value: string) {
  if (value === 'bullet') toggleLinePrefix(/^[-*+]\s+/, '- ')
  if (value === 'ordered') toggleLinePrefix(/^\d+\.\s+/, index => `${index + 1}. `)
  if (value === 'task') toggleLinePrefix(/^- \[[ xX]\]\s+/, '- [ ] ')
}

function onKeydown(event: KeyboardEvent) {
  const command = event.ctrlKey || event.metaKey
  const key = event.key.toLocaleLowerCase()
  if (command && key === 'z') { event.preventDefault(); restoreHistory(historyIndex.value + (event.shiftKey ? 1 : -1)); return }
  if (command && key === 'y') { event.preventDefault(); restoreHistory(historyIndex.value + 1); return }
  if (command && key === 'b') { event.preventDefault(); wrapSelection('**', '**', '粗体文字'); return }
  if (command && key === 'i') { event.preventDefault(); wrapSelection('*', '*', '斜体文字'); return }
  if (command && key === 'k') { event.preventDefault(); insertLink(); return }
  if (command && event.altKey && ['1', '2', '3'].includes(event.key)) { event.preventDefault(); setHeading(Number(event.key)); return }
  if (event.key !== 'Tab' || !textarea.value) return
  event.preventDefault()
  const { start, end } = getSelection()
  textarea.value.setRangeText('  ', start, end, 'end')
  commitValue(textarea.value.value)
  rememberSelection()
}

function onScroll() {
  if (!textarea.value) return
  const max = textarea.value.scrollHeight - textarea.value.clientHeight
  emit('scroll-progress', max > 0 ? textarea.value.scrollTop / max : 0)
}

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
  <section class="editor-panel">
    <div class="panel-title">
      <div class="flex items-center gap-2.5 tabular-nums"><span>{{ lineCount }} 行</span><span>{{ modelValue.length }} 字符</span></div>
      <div class="flex items-center gap-1">
        <BaseIconButton
          :title="toolbarExpanded ? '收起格式工具栏' : '展开格式工具栏'"
          :aria-label="toolbarExpanded ? '收起格式工具栏' : '展开格式工具栏'"
          :aria-expanded="toolbarExpanded"
          @click="toolbarExpanded = !toolbarExpanded"
        >
          <svg v-if="toolbarExpanded" viewBox="0 0 24 24"><path d="M5 5h14v2H5V5Zm0 5h14v2H5v-2Zm7 4 5 5H7l5-5Z" /></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M5 5h14v2H5V5Zm0 5h14v2H5v-2Zm-5 2 5-5H7l5 5Z" /></svg>
        </BaseIconButton>
        <BaseIconButton title="保存源文件（首次需要选择授权）" aria-label="保存源文件" @click="emit('save')"><svg viewBox="0 0 24 24"><path d="M5 3h12l3 3v15H4V3h1Zm1 2v14h12V7.2L15.8 5H15v5H7V5H6Zm3 0v3h4V5H9Zm-1 8h8v4H8v-4Z" /></svg></BaseIconButton>
        <BaseIconButton title="另存为" aria-label="另存为" @click="emit('save-as')"><svg viewBox="0 0 24 24"><path d="M6 2h8l5 5v5h-2V8h-4V4H6v16h6v2H4V2h2Zm9 12h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z" /></svg></BaseIconButton>
      </div>
    </div>

    <div v-if="toolbarExpanded" class="format-toolbar" role="toolbar" aria-label="文本格式" @pointerover="alignDropdown">
      <div class="format-dropdown heading-dropdown">
        <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="正文与标题" @mousedown="rememberSelection">正文<span class="dropdown-arrow">▾</span></button>
        <div class="format-dropdown-menu" role="menu" aria-label="正文与标题">
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(0)">正文</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(1)">标题 1</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(2)">标题 2</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(3)">标题 3</button>
        </div>
      </div>
      <button type="button" class="format-btn format-bold" title="加粗 (Ctrl/⌘ B)" @mousedown.prevent @click="wrapSelection('**', '**', '粗体文字')">B</button>
      <button type="button" class="format-btn format-italic" title="斜体 (Ctrl/⌘ I)" @mousedown.prevent @click="wrapSelection('*', '*', '斜体文字')">I</button>
      <button type="button" class="format-btn format-strike" title="删除线" @mousedown.prevent @click="wrapSelection('~~', '~~', '删除文字')">S</button>
      <button type="button" class="format-btn format-code" title="行内代码" @mousedown.prevent @click="wrapSelection('`', '`', '代码')">&lt;/&gt;</button>
      <button type="button" class="format-btn format-text" title="高亮" @mousedown.prevent @click="wrapSelection('==', '==', '高亮内容')">高亮</button>
      <button type="button" class="format-btn" title="代码块" @mousedown.prevent @click="insertBlock('```\n', '在这里输入代码', '\n```')">{ }</button>
      <button type="button" class="format-btn format-text" title="引用" @mousedown.prevent @click="toggleLinePrefix(/^&gt;\s?/, '&gt; ')">引用</button>
      <div class="format-dropdown callout-dropdown">
        <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="提示块" @mousedown="rememberSelection">提示块<span class="dropdown-arrow">▾</span></button>
        <div class="format-dropdown-menu" role="menu" aria-label="提示块">
          <button type="button" role="menuitem" @mousedown.prevent @click="insertCallout('NOTE')">ℹ 提示</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertCallout('TIP')">✦ 技巧</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertCallout('IMPORTANT')">★ 重要</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertCallout('WARNING')">⚠ 警告</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertCallout('SUCCESS')">✓ 成功</button>
        </div>
      </div>
      <div class="format-dropdown list-dropdown">
        <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="列表" @mousedown="rememberSelection">列表<span class="dropdown-arrow">▾</span></button>
        <div class="format-dropdown-menu" role="menu" aria-label="列表">
          <button type="button" role="menuitem" @mousedown.prevent @click="applyList('bullet')">无序列表</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="applyList('ordered')">有序列表</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="applyList('task')">任务列表</button>
        </div>
      </div>
      <button type="button" class="format-btn format-text" title="插入链接 (Ctrl/⌘ K)" @mousedown.prevent @click="insertLink(false)">链接</button>
      <div class="format-dropdown formula-dropdown">
        <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="数学公式" @mousedown="rememberSelection">公式<span class="dropdown-arrow">▾</span></button>
        <div class="format-dropdown-menu" role="menu" aria-label="数学公式">
          <button type="button" role="menuitem" @mousedown.prevent @click="wrapSelection('$', '$', 'E = mc^2')">行内公式</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertBlock('$$\n', 'E = mc^2', '\n$$')">公式块</button>
        </div>
      </div>
      <button type="button" class="format-btn format-text" title="插入 Mermaid 流程图" @mousedown.prevent @click="insertBlock('```mermaid\n', 'flowchart LR\n  A[开始] --&gt; B[结束]', '\n```')">流程图</button>
      <div class="format-dropdown more-dropdown">
        <button type="button" class="format-dropdown-trigger" aria-haspopup="menu" title="更多格式" @mousedown="rememberSelection">更多<span class="dropdown-arrow">▾</span></button>
        <div class="format-dropdown-menu" role="menu" aria-label="更多格式">
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(4)">标题 4</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(5)">标题 5</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="setHeading(6)">标题 6</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertLink(true)">插入图片</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertTable">插入表格</button>
          <button type="button" role="menuitem" @mousedown.prevent @click="insertBlock('', '---', '', false)">插入分割线</button>
        </div>
      </div>
      <span class="format-separator"></span>
      <div class="format-action-group">
        <button type="button" class="format-btn format-text" title="清除选中内容的格式" @mousedown.prevent @click="clearFormatting">清除</button>
        <button type="button" class="format-btn" :disabled="!canUndo" title="撤销 (Ctrl/⌘ Z)" @mousedown.prevent @click="restoreHistory(historyIndex - 1)">↶</button>
        <button type="button" class="format-btn" :disabled="!canRedo" title="重做 (Ctrl/⌘ Shift Z)" @mousedown.prevent @click="restoreHistory(historyIndex + 1)">↷</button>
      </div>
    </div>

    <textarea
      ref="textarea" :value="modelValue" spellcheck="false" placeholder="# 从这里开始写 Markdown…"
      @input="commitValue(($event.target as HTMLTextAreaElement).value, true); rememberSelection()"
      @keydown="onKeydown" @keyup="rememberSelection" @click="rememberSelection" @select="rememberSelection" @scroll.passive="onScroll"
    ></textarea>
  </section>
</template>
