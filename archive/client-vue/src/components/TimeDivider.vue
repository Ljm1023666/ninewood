<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ timestamp: string; prevTimestamp?: string | null }>();

const label = computed(() => {
  const now = new Date();
  const d = new Date(props.timestamp);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (msgDay.getTime() === today.getTime()) return `今天 ${time}`;
  if (msgDay.getTime() === yesterday.getTime()) return `昨天 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
});

const show = computed(() => {
  if (!props.prevTimestamp) return true;
  const gap = new Date(props.timestamp).getTime() - new Date(props.prevTimestamp).getTime();
  return gap > 5 * 60 * 1000;
});
</script>

<template>
  <div v-if="show" class="time-divider">
    <span class="time-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.time-divider {
  display: flex; justify-content: center; padding: 14px 0 10px;
}
.time-label {
  font-size: 11px; color: var(--text-muted);
  background: var(--bg-secondary); padding: 4px 10px; border-radius: 2px;
}
</style>
