<template>
  <article ref="element" class="markdown-body" :style="{ '--preview-font-size': `${fontSize}px` }" @scroll.passive="onScroll" @click="onClick" v-html="html || '<p class=empty-hint>预览内容会显示在这里</p>'"></article>
  <button v-if="showBackToTop" class="back-to-top" title="返回顶部" aria-label="返回顶部" @click="scrollToTop">↑</button>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ html: string; fontSize: number; theme: 'dark' | 'light' }>()
const emit = defineEmits<{
  'active-change': [id: string]
  image: [payload: { src: string; alt: string }]
  'local-link': [href: string]
  toast: [message: string]
}>()

const element = ref<HTMLElement | null>(null)
const showBackToTop = ref(false)
let diagramVersion = 0

async function renderDiagrams() {
  const version = ++diagramVersion
  await nextTick()
  const nodes = [...(element.value?.querySelectorAll<HTMLElement>('.mermaid') ?? [])]
  if (!nodes.length) return
  try {
    const { default: mermaid } = await import('mermaid')
    if (version !== diagramVersion) return
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: props.theme === 'dark' ? 'dark' : 'default' })
    await mermaid.run({ nodes, suppressErrors: true })
  } catch { /* 保留 Mermaid 源码，避免影响其他预览内容 */ }
}

watch([() => props.html, () => props.theme], () => { void renderDiagrams() }, { immediate: true, flush: 'post' })

function updateScrollSpy() {
  if (!element.value) return
  const headings = [...element.value.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')]
  if (!headings.length) return emit('active-change', '')
  const previewTop = element.value.getBoundingClientRect().top
  let current = headings[0]
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top - previewTop <= 70) current = heading
    else break
  }
  emit('active-change', current.id)
}

function onScroll() {
  updateScrollSpy()
  showBackToTop.value = (element.value?.scrollTop ?? 0) >= 260
}

async function onClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const image = target.closest<HTMLImageElement>('img')
  if (image) {
    event.preventDefault()
    emit('image', { src: image.currentSrc || image.src, alt: image.alt || '图片预览' })
    return
  }
  const copy = target.closest<HTMLButtonElement>('.copy-code')
  if (copy) {
    const text = copy.closest('.code-block')?.querySelector('code')?.textContent ?? ''
    try {
      await navigator.clipboard.writeText(text)
      copy.classList.add('copied')
      copy.title = '已复制'
      window.setTimeout(() => { copy.classList.remove('copied'); copy.title = '复制代码' }, 1400)
    } catch { emit('toast', '复制失败，请手动选择代码') }
    return
  }
  const link = target.closest<HTMLAnchorElement>('a')
  if (!link) return
  const href = link.getAttribute('href') ?? ''
  if (/^(https?:|mailto:)/i.test(href)) return
  event.preventDefault()
  if (href.startsWith('#')) goToHeading(decodeURIComponent(href.slice(1)))
  else emit('local-link', href)
}

function goToHeading(id: string) {
  element.value?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function syncToProgress(progress: number) {
  if (!element.value) return
  const max = element.value.scrollHeight - element.value.clientHeight
  const behavior = element.value.style.scrollBehavior
  element.value.style.scrollBehavior = 'auto'
  element.value.scrollTop = Math.max(0, progress * Math.max(0, max))
  element.value.style.scrollBehavior = behavior
}

function scrollToTop() { element.value?.scrollTo({ top: 0, behavior: 'smooth' }) }

defineExpose({ goToHeading, syncToProgress, updateScrollSpy })
</script>
