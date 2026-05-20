<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{ nickname: string }>();
const router = useRouter();
</script>

<template>
  <div class="chat-navbar glass">
    <button class="nav-btn" @click="router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <span class="nav-title">{{ nickname }}</span>
    <button class="nav-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
    </button>
  </div>
</template>

<style scoped>
.chat-navbar {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  height: 48px; padding: 0 4px;
  border-bottom: 1px solid var(--border-color);
}
.nav-btn {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; color: var(--text-primary); cursor: pointer;
  border-radius: 50%; transition: background 0.15s;
}
.nav-btn:hover { background: var(--bg-tertiary); }
.nav-title {
  font-size: 16px; font-weight: 600; color: var(--text-primary);
  max-width: 50%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
