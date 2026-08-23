<template>
  <div class="file-tree-branch">
    <button
      type="button"
      class="file-tree-item"
      :class="{ directory: node.kind === 'directory', markdown: isMarkdown(node.name), active: node.kind === 'file' && node.name === activeFileName }"
      :style="{ '--tree-depth': depth }"
      :disabled="node.kind === 'file' && !isMarkdown(node.name)"
      :title="decodeUrl(node.url)"
      @click="activate"
    >
      <span v-if="node.kind === 'directory'" class="tree-chevron" :class="{ expanded: node.expanded }">›</span>
      <span class="tree-icon" aria-hidden="true">{{ node.kind === 'directory' ? '📁' : isMarkdown(node.name) ? 'M' : '·' }}</span>
      <span class="tree-name">{{ node.name }}</span>
    </button>
    <div v-if="node.kind === 'directory' && node.expanded" class="file-tree-children">
      <p v-if="node.loading" class="tree-state" :style="{ '--tree-depth': depth + 1 }">正在读取…</p>
      <p v-else-if="node.children && !node.children.length" class="tree-state" :style="{ '--tree-depth': depth + 1 }">空文件夹</p>
      <FileTreeItem
        v-for="child in node.children"
        :key="child.url"
        :node="child"
        :depth="depth + 1"
        :active-file-name="activeFileName"
        @toggle="emit('toggle', $event)"
        @open="emit('open', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileTreeNode } from '../types'

const props = defineProps<{ node: FileTreeNode; depth: number; activeFileName: string }>()
const emit = defineEmits<{ toggle: [node: FileTreeNode]; open: [url: string] }>()

function isMarkdown(name: string) {
  return /\.(md|markdown)$/i.test(name)
}

function decodeUrl(url: string) {
  try { return decodeURIComponent(new URL(url).pathname) } catch { return url }
}

function activate() {
  if (props.node.kind === 'directory') emit('toggle', props.node)
  else if (isMarkdown(props.node.name)) emit('open', props.node.url)
}
</script>
