<script setup lang="ts">
defineProps<{ message?: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="error-state">
    <div class="error-icon">⚠</div>
    <p class="error-message">{{ message || '加载失败' }}</p>
    <t-button theme="primary" variant="outline" @click="$emit('retry')">重试</t-button>
  </div>
</template>

<style scoped>
.error-state { text-align: center; padding: 60px 20px; }
.error-icon { font-size: 48px; margin-bottom: 12px; }
.error-message { color: var(--error-color); margin: 0 0 16px; font-size: 14px; }
</style>
