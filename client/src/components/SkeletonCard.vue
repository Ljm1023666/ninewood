<script setup lang="ts">
defineProps<{ count?: number }>();
</script>

<template>
  <div v-for="i in (count || 3)" :key="i" class="skeleton-card">
    <div class="sk-line w60 shimmer" />
    <div class="sk-line w40 shimmer" />
    <div class="sk-line w80 shimmer" />
    <div class="sk-row">
      <div class="sk-line w30 shimmer" />
      <div class="sk-line w20 shimmer" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-card { padding: 16px; margin-bottom: 12px; border-radius: var(--radius); background: var(--bg-card); border: 1px solid var(--border-color); }
.sk-line { height: 14px; border-radius: 4px; background: var(--bg-tertiary); margin-bottom: 8px; }
.sk-row { display: flex; gap: 16px; }
.sk-row .sk-line { flex: 1; }
.w60 { width: 60%; } .w40 { width: 40%; } .w80 { width: 80%; } .w30 { width: 30%; } .w20 { width: 20%; }
.shimmer {
  background: linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
  background-size: 200px 100%; animation: shimmer 1.5s infinite;
}
</style>
