<script setup lang="ts">
defineProps<{ checking?: boolean }>()
const emit = defineEmits<{ dismiss: []; recheck: []; 'open-settings': [] }>()
</script>

<template>
  <div class="permission-backdrop" role="dialog" aria-modal="true" aria-labelledby="fileAccessTitle">
    <section class="permission-dialog">
      <div class="permission-icon" aria-hidden="true">!</div>
      <div>
        <p class="permission-eyebrow">需要完成一项设置</p>
        <h2 id="fileAccessTitle">开启“允许访问文件网址”</h2>
        <p class="permission-summary">未开启时，浏览器不会让 MarkNest 读取本地 Markdown 文件，直接打开 `.md` 或 `.markdown` 文件也无法进入阅读界面。</p>
      </div>

      <ol class="permission-steps">
        <li>点击下方“打开扩展设置”。</li>
        <li>找到并开启“允许访问文件网址”。</li>
        <li>返回此页面，MarkNest 会自动重新检测。</li>
      </ol>

      <div class="permission-actions">
        <button type="button" class="permission-button secondary" :disabled="checking" @click="emit('recheck')">{{ checking ? '正在检测…' : '我已开启，重新检测' }}</button>
        <button type="button" class="permission-button primary" @click="emit('open-settings')">打开扩展设置</button>
      </div>
      <button type="button" class="permission-later" @click="emit('dismiss')">暂时继续使用编辑器</button>
    </section>
  </div>
</template>
