<script setup lang="ts">
const props = defineProps<{ type?: string; message?: string; actionLabel?: string }>();
defineEmits<{ action: [] }>();

const presets: Record<string, { icon: string; msg: string; action?: string }> = {
  demand: { icon: '📋', msg: '还没有需求', action: '发布第一个需求' },
  message: { icon: '💬', msg: '暂无消息', action: '去发现页看看' },
  order: { icon: '📦', msg: '暂无订单' },
  circle: { icon: '👥', msg: '暂无圈子', action: '创建圈子' },
  search: { icon: '🔍', msg: '没有找到相关内容' },
  video: { icon: '🎬', msg: '暂无视频案例', action: '发布带视频的需求' },
};
const p = presets[props.type || 'search'] || presets.search;
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">{{ props.type ? p.icon : (props.message ? '📭' : p.icon) }}</div>
    <p class="empty-message">{{ props.message || p.msg }}</p>
    <t-button v-if="props.actionLabel || p.action" theme="primary" variant="outline" @click="$emit('action')">
      {{ props.actionLabel || p.action }}
    </t-button>
  </div>
</template>

<style scoped>
.empty-state { text-align: center; padding: 60px 20px; animation: fadeUp 0.4s ease-out both; }
.empty-icon { font-size: 52px; margin-bottom: 12px; }
.empty-message { color: var(--text-muted); margin: 0 0 16px; font-size: 14px; }
</style>
