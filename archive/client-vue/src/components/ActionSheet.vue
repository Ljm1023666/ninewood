<script setup lang="ts">
defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: []; select: [action: string] }>();

const actions = [
  { key: 'image', label: '图片', icon: '🖼' },
  { key: 'video', label: '视频', icon: '🎬' },
];
</script>

<template>
  <Transition name="sheet">
    <div v-if="visible" class="sheet-overlay" @click="emit('close')">
      <div class="sheet-panel" @click.stop>
        <div class="sheet-grid">
          <button
            v-for="a in actions" :key="a.key"
            class="sheet-item"
            @click="emit('select', a.key)"
          >
            <span class="sheet-icon">{{ a.icon }}</span>
            <span class="sheet-label">{{ a.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.3);
}
.sheet-panel {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--bg-card); border-radius: 16px 16px 0 0;
  padding: 20px 16px 32px;
  border-top: 1px solid var(--border-color);
}
.sheet-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
}
.sheet-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: none; border: none; color: var(--text-primary); cursor: pointer;
  padding: 12px 8px; border-radius: 12px; transition: background 0.15s;
}
.sheet-item:hover { background: var(--bg-tertiary); }
.sheet-icon { font-size: 32px; }
.sheet-label { font-size: 12px; color: var(--text-secondary); }

/* Transition */
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .sheet-panel, .sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sheet-enter-from .sheet-panel, .sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
