<script setup lang="ts">
defineProps<{ image: { src: string; alt: string } }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="image-lightbox" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="emit('close')">
    <button class="image-lightbox-close" type="button" title="关闭预览" aria-label="关闭预览" @click="emit('close')">×</button>
    <img :src="image.src" :alt="image.alt">
  </div>
</template>
