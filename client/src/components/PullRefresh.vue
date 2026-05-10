<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ refresh: [] }>();
const pulling = ref(false);
const refreshing = ref(false);
const translateY = ref(0);
let startY = 0;

function onTouchStart(e: TouchEvent) { startY = e.touches[0].clientY; }
function onTouchMove(e: TouchEvent) {
  const dy = e.touches[0].clientY - startY;
  if (dy > 10 && !refreshing.value) { pulling.value = true; translateY.value = Math.min(dy * 0.4, 60); }
}
async function onTouchEnd() {
  if (translateY.value > 40 && !refreshing.value) {
    refreshing.value = true; translateY.value = 40;
    emit('refresh');
    await new Promise(r => setTimeout(r, 800));
    refreshing.value = false;
  }
  pulling.value = false; translateY.value = 0;
}
</script>

<template>
  <div
    class="pull-refresh"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="pull-indicator" :style="{ height: translateY + 'px', opacity: pulling ? 1 : 0 }">
      <t-loading v-if="refreshing" size="small" />
      <span v-else>↓ 下拉刷新</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.pull-refresh { overflow-y: auto; }
.pull-indicator { display: flex; align-items: center; justify-content: center; overflow: hidden; color: var(--text-muted); font-size: 13px; transition: height 0.2s; }
</style>
