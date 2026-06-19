<script setup lang="ts">
defineProps<{ count?: number }>();
</script>

<template>
  <div
    v-for="i in (count || 3)"
    :key="i"
    class="skeleton-card"
    :style="{ animationDelay: `${(i - 1) * 0.12}s` }"
  >
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
.skeleton-card {
  padding: 16px; margin-bottom: 12px;
  border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  animation: fadeUp 0.4s ease-out both;
}
.sk-line { height: 14px; border-radius: 4px; background: var(--bg-tertiary); margin-bottom: 8px; }
.sk-row { display: flex; gap: 16px; }
.sk-row .sk-line { flex: 1; }
.w60 { width: 60%; } .w40 { width: 40%; } .w80 { width: 80%; } .w30 { width: 30%; } .w20 { width: 20%; }
.shimmer {
  background: linear-gradient(
    105deg,
    var(--bg-tertiary) 0%,
    var(--bg-tertiary) 30%,
    color-mix(in srgb, var(--bg-card) 80%, var(--accent-color)) 50%,
    var(--bg-tertiary) 70%,
    var(--bg-tertiary) 100%
  );
  background-size: 300% 100%;
  animation: shimmer 2s ease-in-out infinite;
}
</style>
