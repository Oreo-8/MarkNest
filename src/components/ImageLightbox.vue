<template>
  <div class="image-lightbox" role="dialog" aria-modal="true" :aria-label="t('imagePreview')" @click.self="emit('close')">
    <button class="image-lightbox-close" type="button" :title="t('closePreview')" :aria-label="t('closePreview')" @click="emit('close')">×</button>
    <img :src="image.src" :alt="image.alt">
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
defineProps<{ image: { src: string; alt: string } }>()
const emit = defineEmits<{ close: [] }>()
</script>
