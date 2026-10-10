<template>
  <aside class="toc-panel" :class="{ searching: activeTab === 'toc' && searching }">
    <div class="panel-title">
      <div class="sidebar-tabs" role="tablist" :aria-label="t('sidebar')">
        <BaseIconButton
          role="tab"
          :title="t('toc')"
          :aria-label="t('toc')"
          :aria-selected="activeTab === 'toc'"
          :selected="activeTab === 'toc'"
          @click="activeTab = 'toc'"
        ><BaseIcon :src="tocIcon" /></BaseIconButton>
        <BaseIconButton
          role="tab"
          :title="t('files')"
          :aria-label="t('files')"
          :aria-selected="activeTab === 'files'"
          :selected="activeTab === 'files'"
          @click="activeTab = 'files'"
        ><BaseIcon :src="folderIcon" /></BaseIconButton>
      </div>
      <div v-if="activeTab === 'toc'" class="flex items-center gap-2.5 tabular-nums">
        <span>{{ countText }}</span>
        <BaseIconButton :title="t('searchToc')" :aria-label="t('searchToc')" @click="toggleSearch">
          <BaseIcon :src="searchIcon" />
        </BaseIconButton>
      </div>
      <span v-else-if="root" class="folder-name" :title="root.name">{{ root.name }}</span>
    </div>
    <div v-if="activeTab === 'toc'" class="toc-search">
      <input ref="searchInput" v-model="query" type="search" :placeholder="t('searchPlaceholder')" @keydown.esc="closeSearch">
    </div>
    <nav v-if="activeTab === 'toc'" ref="navigation" class="toc" :aria-label="t('documentToc')">
      <button
        v-for="heading in filteredHeadings"
        :key="heading.id"
        :class="[`level-${heading.level}`, { active: activeHeadingId === heading.id }]"
        :data-target="heading.id"
        :title="heading.text"
        @click="emit('select', heading.id)"
      >{{ heading.text }}</button>
      <p v-if="!headings.length" class="empty-hint">{{ t('headingsEmpty') }}</p>
      <p v-else-if="!filteredHeadings.length" class="empty-hint">{{ t('noMatches') }}</p>
    </nav>
    <div v-else class="file-tree" :aria-label="t('folderTree')">
      <div v-if="!sourceUrl || !sourceUrl.startsWith('file:')" class="file-tree-empty">
        <p>{{ t('noLocalPath') }}</p>
      </div>
      <template v-else-if="root">
        <div v-if="error && root.children === null" class="file-tree-empty">
          <p>{{ error }}</p>
          <button type="button" @click="retry">{{ t('retry') }}</button>
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
import { t } from '../i18n'

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
  ? t('filteredItems', { shown: filteredHeadings.value.length, total: props.headings.length })
  : t('items', { count: props.headings.length }))

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
