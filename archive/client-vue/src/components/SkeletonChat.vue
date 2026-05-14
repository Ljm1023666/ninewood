<template>
  <div
    v-for="i in 5"
    :key="i"
    class="sk-chat"
    :style="{ animationDelay: `${(i - 1) * 0.08}s` }"
  >
    <div class="sk-avatar shimmer" />
    <div class="sk-body">
      <div class="sk-line w30 shimmer" />
      <div class="sk-line w60 shimmer" />
    </div>
  </div>
</template>

<style scoped>
.sk-chat {
  display: flex; gap: 12px; padding: 14px 20px; align-items: center;
  border-bottom: 1px solid var(--border-color);
  animation: fadeUp 0.35s ease-out both;
}
.sk-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-tertiary); flex-shrink: 0; }
.sk-body { flex: 1; }
.sk-line { height: 12px; border-radius: 4px; background: var(--bg-tertiary); margin-bottom: 6px; }
.w30 { width: 30%; } .w60 { width: 60%; }
.shimmer {
  background: linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-tertiary) 100%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
</style>
