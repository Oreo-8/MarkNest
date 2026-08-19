<script setup lang="ts">
defineProps<{ src: string }>()
</script>

<template>
  <span
    class="base-icon"
    :style="{ '--icon-source': `url(&quot;${src}&quot;)` }"
    aria-hidden="true"
  />
</template>
