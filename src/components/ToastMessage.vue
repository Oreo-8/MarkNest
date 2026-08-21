<template>
  <div class="toast show" role="status">{{ message }}</div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>
