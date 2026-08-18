<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { HeadingItem } from '../types'
import BaseIconButton from './BaseIconButton.vue'

const props = defineProps<{ headings: HeadingItem[]; activeHeadingId: string }>()
const emit = defineEmits<{ select: [id: string] }>()
const query = ref('')
const searching = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const navigation = ref<HTMLElement | null>(null)

const filteredHeadings = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase()
  return keyword ? props.headings.filter((item) => item.text.toLocaleLowerCase().includes(keyword)) : props.headings
})

const countText = computed(() => query.value
  ? `${filteredHeadings.value.length} / ${props.headings.length} 项`
  : `${props.headings.length} 项`)

function toggleSearch() {
  searching.value = !searching.value
  if (searching.value) void nextTick(() => searchInput.value?.focus())
  else query.value = ''
}

function closeSearch() {
  searching.value = false
  query.value = ''
}

watch(() => props.activeHeadingId, (id) => {
  if (!id) return
  void nextTick(() => navigation.value?.querySelector(`[data-target="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' }))
})
</script>

<template>
  <aside class="toc-panel" :class="{ searching }">
    <div class="panel-title">
      <strong class="text-ink text-3.25">目录</strong>
      <div class="flex items-center gap-2.5 tabular-nums">
        <span>{{ countText }}</span>
        <BaseIconButton title="搜索目录" aria-label="搜索目录" @click="toggleSearch">
          <svg viewBox="0 0 24 24"><path d="m20.5 19-4.2-4.2a7 7 0 1 0-1.5 1.5l4.2 4.2 1.5-1.5ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" /></svg>
        </BaseIconButton>
      </div>
    </div>
    <div class="toc-search">
      <input ref="searchInput" v-model="query" type="search" placeholder="搜索目录…" @keydown.esc="closeSearch">
    </div>
    <nav ref="navigation" class="toc" aria-label="文档目录">
      <button
        v-for="heading in filteredHeadings"
        :key="heading.id"
        :class="[`level-${heading.level}`, { active: activeHeadingId === heading.id }]"
        :data-target="heading.id"
        :title="heading.text"
        @click="emit('select', heading.id)"
      >{{ heading.text }}</button>
      <p v-if="!headings.length" class="empty-hint">文档标题会显示在这里</p>
      <p v-else-if="!filteredHeadings.length" class="empty-hint">没有匹配的标题</p>
    </nav>
  </aside>
</template>
