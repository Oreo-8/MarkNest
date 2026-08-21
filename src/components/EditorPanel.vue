<template>
  <section class="editor-panel" :class="{ 'toolbar-collapsed': !toolbarExpanded }">
    <EditorToolbar
      v-model:expanded="toolbarExpanded"
      :line-count="lineCount"
      :character-count="modelValue.length"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @remember-selection="rememberSelection"
      @save="emit('save')"
      @save-as="emit('save-as')"
      @heading="setHeading"
      @wrap="wrapSelection($event.prefix, $event.suffix, $event.placeholder)"
      @insert-block="insertBlock($event.before, $event.content, $event.after, $event.selectContent)"
      @quote="toggleLinePrefix(/^>\s?/, '> ')"
      @callout="insertCallout"
      @list="applyList"
      @link="insertLink"
      @table="insertTable"
      @clear="clearFormatting"
      @undo="restoreHistory(historyIndex - 1)"
      @redo="restoreHistory(historyIndex + 1)"
    />

    <textarea
      ref="textarea" :value="modelValue" spellcheck="false" placeholder="# 从这里开始写 Markdown…"
      @input="commitValue(($event.target as HTMLTextAreaElement).value, true); rememberSelection()"
      @keydown="onKeydown" @keyup="rememberSelection" @click="rememberSelection" @select="rememberSelection" @scroll.passive="onScroll"
    ></textarea>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import EditorToolbar from './EditorToolbar.vue'

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

</script>
