<template>
  <aside class="toc-panel" :class="{ searching: activeTab === 'toc' && searching }">
    <div class="panel-title">
      <div class="sidebar-tabs" role="tablist" aria-label="侧边栏内容">
        <BaseIconButton
          role="tab"
          title="目录"
          aria-label="目录"
          :aria-selected="activeTab === 'toc'"
          :selected="activeTab === 'toc'"
          @click="activeTab = 'toc'"
        ><BaseIcon :src="tocIcon" /></BaseIconButton>
        <BaseIconButton
          role="tab"
          title="文件"
          aria-label="文件"
          :aria-selected="activeTab === 'files'"
          :selected="activeTab === 'files'"
          @click="activeTab = 'files'"
        ><BaseIcon :src="folderIcon" /></BaseIconButton>
      </div>
      <div v-if="activeTab === 'toc'" class="flex items-center gap-2.5 tabular-nums">
        <span>{{ countText }}</span>
        <BaseIconButton title="搜索目录" aria-label="搜索目录" @click="toggleSearch">
          <BaseIcon :src="searchIcon" />
        </BaseIconButton>
      </div>
      <span v-else-if="root" class="folder-name" :title="root.name">{{ root.name }}</span>
    </div>
    <div v-if="activeTab === 'toc'" class="toc-search">
      <input ref="searchInput" v-model="query" type="search" placeholder="搜索目录…" @keydown.esc="closeSearch">
    </div>
    <nav v-if="activeTab === 'toc'" ref="navigation" class="toc" aria-label="文档目录">
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
    <div v-else class="file-tree" aria-label="文件夹树">
      <div v-if="!sourceUrl || !sourceUrl.startsWith('file:')" class="file-tree-empty">
        <p>当前文档没有本地文件地址，无法定位所在文件夹。</p>
      </div>
      <template v-else-if="root">
        <div v-if="error && root.children === null" class="file-tree-empty">
          <p>{{ error }}</p>
          <button type="button" @click="retry">重试</button>
        </div>
        <FileTreeItem
          v-else
          :node="root"
          :depth="0"
          :active-file-name="activeFileName"
          @toggle="toggleDirectory"
          @open="emit('open-file', $event)"
        />
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import folderIcon from '../assets/icons/folder.svg'
import searchIcon from '../assets/icons/search.svg'
import tocIcon from '../assets/icons/toc.svg'
import { useDirectoryTree } from '../composables/useDirectoryTree'
import type { HeadingItem } from '../types'
import BaseIcon from './BaseIcon.vue'
import BaseIconButton from './BaseIconButton.vue'
import FileTreeItem from './FileTreeItem.vue'

const props = defineProps<{ headings: HeadingItem[]; activeHeadingId: string; activeFileName: string; sourceUrl: string | null; showToast: (message: string) => void }>()
const emit = defineEmits<{ select: [id: string]; 'open-file': [url: string] }>()
const activeTab = ref<'toc' | 'files'>('toc')
const query = ref('')
const searching = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const navigation = ref<HTMLElement | null>(null)
const { root, error, toggleDirectory, initializeDirectory, retry } = useDirectoryTree(() => props.sourceUrl, props.showToast)

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

watch(() => props.sourceUrl, () => { void initializeDirectory() }, { immediate: true })
</script>
