<template>
  <section class="editor-panel" :class="{ 'toolbar-collapsed': !toolbarExpanded }">
    <EditorToolbar
      v-model:expanded="toolbarExpanded"
      :line-count="lineCount"
      :character-count="modelValue.length"
      :cursor-line="cursorLine"
      :cursor-column="cursorColumn"
      :selection-count="selectionCount"
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
      @undo="restoreHistory('undo')"
      @redo="restoreHistory('redo')"
    />

    <div ref="editorHost" class="markdown-editor"></div>
  </section>
</template>

<script setup lang="ts">
import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState, Prec, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import EditorToolbar from './EditorToolbar.vue'
import { t } from '../i18n'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  changed: []
  'scroll-progress': [progress: number]
  save: []
  'save-as': []
}>()

const editorHost = ref<HTMLDivElement | null>(null)
let editor: EditorView | null = null
let editorExtensions: Extension[] = []
const savedSelection = ref({ start: 0, end: 0 })
const toolbarExpanded = ref(true)
const lineCount = computed(() => props.modelValue.length ? props.modelValue.split(/\r\n|\r|\n/).length : 1)
const canUndo = ref(false)
const canRedo = ref(false)
const cursorLine = ref(1)
const cursorColumn = ref(1)
const selectionCount = ref(0)

watch(() => props.modelValue, (value) => {
  if (!editor || value === editor.state.doc.toString()) return
  editor.setState(EditorState.create({ doc: value, extensions: editorExtensions }))
  updateEditorState()
})

function commitValue(value: string) {
  if (value === props.modelValue) return
  emit('update:modelValue', value)
  emit('changed')
}

function restoreHistory(direction: 'undo' | 'redo') {
  if (!editor) return
  ;(direction === 'undo' ? undo : redo)(editor)
}

function rememberSelection() {
  if (!editor) return
  const selection = editor.state.selection.main
  savedSelection.value = { start: selection.from, end: selection.to }
}

function getSelection() {
  if (!editor) return savedSelection.value
  const selection = editor.state.selection.main
  return { start: selection.from, end: selection.to }
}

function replaceRange(start: number, end: number, replacement: string, selectStart: number, selectEnd: number) {
  savedSelection.value = { start: selectStart, end: selectEnd }
  if (!editor) return
  editor.dispatch({ changes: { from: start, to: end, insert: replacement }, selection: { anchor: selectStart, head: selectEnd } })
  editor.focus()
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
    return marker + (clean || (level ? t('heading', { level }) : ''))
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
  const label = props.modelValue.slice(start, end) || (image ? t('insertImage') : t('link'))
  const url = image ? 'https://' : 'https://'
  const replacement = `${image ? '!' : ''}[${label}](${url})`
  const urlStart = start + (image ? 1 : 0) + label.length + 3
  replaceRange(start, end, replacement, urlStart, urlStart + url.length)
}

function insertTable() {
  const column = t('tableColumn')
  const cell = t('tableContent')
  const table = `| ${column} 1 | ${column} 2 | ${column} 3 |\n| --- | --- | --- |\n| ${cell} | ${cell} | ${cell} |`
  insertBlock('', table, '', false)
}

function insertCallout(type: string) {
  const { start, end } = getSelection()
  const selected = props.modelValue.slice(start, end) || t('callout')
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

function run(command: () => void) {
  command()
  return true
}

function onScroll() {
  if (!editor) return
  const scroller = editor.scrollDOM
  const max = scroller.scrollHeight - scroller.clientHeight
  emit('scroll-progress', max > 0 ? scroller.scrollTop / max : 0)
}

function updateEditorState() {
  if (!editor) return
  const selection = editor.state.selection.main
  const line = editor.state.doc.lineAt(selection.head)
  savedSelection.value = { start: selection.from, end: selection.to }
  cursorLine.value = line.number
  cursorColumn.value = selection.head - line.from + 1
  selectionCount.value = selection.to - selection.from
  canUndo.value = undoDepth(editor.state) > 0
  canRedo.value = redoDepth(editor.state) > 0
}

onMounted(() => {
  if (!editorHost.value) return
  editorExtensions = [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      placeholder(t('editorPlaceholder')),
      EditorView.contentAttributes.of({ spellcheck: 'false', 'aria-label': t('textFormat') }),
      Prec.high(keymap.of([
        { key: 'Mod-b', run: () => run(() => wrapSelection('**', '**', t('bold'))) },
        { key: 'Mod-i', run: () => run(() => wrapSelection('*', '*', t('italic'))) },
        { key: 'Mod-k', run: () => run(() => insertLink()) },
        { key: 'Mod-Alt-1', run: () => run(() => setHeading(1)) },
        { key: 'Mod-Alt-2', run: () => run(() => setHeading(2)) },
        { key: 'Mod-Alt-3', run: () => run(() => setHeading(3)) },
      ])),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) commitValue(update.state.doc.toString())
        updateEditorState()
      }),
  ]
  editor = new EditorView({
    parent: editorHost.value,
    doc: props.modelValue,
    extensions: editorExtensions,
  })
  editor.scrollDOM.addEventListener('scroll', onScroll, { passive: true })
  updateEditorState()
})

onBeforeUnmount(() => {
  editor?.scrollDOM.removeEventListener('scroll', onScroll)
  editor?.destroy()
  editor = null
})

</script>
