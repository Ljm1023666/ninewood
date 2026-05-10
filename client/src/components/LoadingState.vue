<script setup lang="ts">
defineProps<{ text?: string }>();
</script>

<template>
  <div class="loading-state">
    <t-loading size="medium" />
    <p>{{ text || '加载中...' }}</p>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 20px; gap: 12px; color: var(--text-muted);
}
.loading-state p { margin: 0; font-size: 14px; }
</style>
