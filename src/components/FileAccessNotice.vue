<template>
  <div class="permission-backdrop" role="dialog" aria-modal="true" aria-labelledby="fileAccessTitle">
    <section class="permission-dialog">
      <div class="permission-icon" aria-hidden="true">!</div>
      <div>
        <p class="permission-eyebrow">{{ t('permissionEyebrow') }}</p>
        <h2 id="fileAccessTitle">{{ t('permissionTitle') }}</h2>
        <p class="permission-summary">{{ t('permissionSummary') }}</p>
      </div>

      <ol class="permission-steps">
        <li>{{ t('permissionStep1') }}</li>
        <li>{{ t('permissionStep2') }}</li>
        <li>{{ t('permissionStep3') }}</li>
      </ol>

      <div class="permission-actions">
        <button type="button" class="permission-button secondary" :disabled="checking" @click="emit('recheck')">{{ checking ? t('checking') : t('recheck') }}</button>
        <button type="button" class="permission-button primary" @click="emit('open-settings')">{{ t('openSettings') }}</button>
      </div>
      <button type="button" class="permission-later" @click="emit('dismiss')">{{ t('continueEditor') }}</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { t } from '../i18n'
defineProps<{ checking?: boolean }>()
const emit = defineEmits<{ dismiss: []; recheck: []; 'open-settings': [] }>()
</script>
