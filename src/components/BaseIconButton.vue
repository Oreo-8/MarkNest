<script setup lang="ts">
defineOptions({ inheritAttrs: false })
defineProps<{ selected?: boolean }>()
</script>

<template>
  <button v-bind="$attrs" type="button" class="icon-btn" :class="{ selected }">
    <slot />
  </button>
</template>
