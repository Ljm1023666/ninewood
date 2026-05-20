<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';

const props = withDefaults(defineProps<{
  snap?: boolean;
  snapStop?: boolean;
}>(), {
  snap: false,
  snapStop: false,
});

const emit = defineEmits<{ refresh: [] }>();

const scrollEl = useTemplateRef('scrollEl');

// ── Pull-to-refresh states ──
type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';
const state = ref<PullState>('idle');
const translateY = ref(0);

let startY = 0;

const INDICATOR_H = 52;       // indicator 高度
const READY_THRESHOLD = 56;   // 松手即触发阈值

function onTouchStart(e: TouchEvent) {
  startY = e.touches[0].clientY;
}

function onTouchMove(e: TouchEvent) {
  if (state.value === 'refreshing') return;
  const st = scrollEl.value?.scrollTop ?? 0;
  // 仅在滚动到顶且下拉时才介入
  if (st > 0) { state.value = 'idle'; translateY.value = 0; return; }

  const dy = e.touches[0].clientY - startY;
  if (dy < 8) { state.value = 'idle'; translateY.value = 0; return; }

  // 阻止浏览器原生下拉弹性效果
  if (dy > 0 && st === 0) e.preventDefault();

  translateY.value = Math.min(dy * 0.5, INDICATOR_H + 24);
  state.value = translateY.value >= READY_THRESHOLD ? 'ready' : 'pulling';
}

async function onTouchEnd() {
  if (state.value === 'refreshing') return;
  if (state.value === 'ready') {
    state.value = 'refreshing';
    translateY.value = INDICATOR_H;
    emit('refresh');
    return;
  }
  resetPull();
}

function resetPull() {
  state.value = 'idle';
  translateY.value = 0;
}

// 外部调用：刷新完成后复位
function done() {
  resetPull();
}

defineExpose({ scrollEl, done });
</script>

<template>
  <div
    ref="scrollEl"
    class="pull-refresh"
    :class="{ snap: props.snap, 'snap-stop': props.snapStop }"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 下拉指示器 -->
    <div
      class="pull-indicator"
      :class="state"
      :style="{ height: translateY + 'px' }"
    >
      <div class="indicator-inner">
        <t-loading v-if="state === 'refreshing'" size="18px" />
        <span v-else-if="state === 'ready'">释放刷新</span>
        <span v-else>下拉刷新</span>
      </div>
    </div>

    <!-- 内容 -->
    <div class="pr-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pull-refresh {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

/* scroll-snap 模式 */
.pull-refresh.snap {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}
.pull-refresh.snap-stop {
  scroll-snap-stop: always;
}

.pull-refresh::-webkit-scrollbar { width: 0; }

/* ── Indicator ── */
.pull-indicator {
  overflow: hidden;
  transition: height 0.15s ease;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.pull-indicator.refreshing {
  transition: height 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.indicator-inner {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Content ── */
.pr-content {
  min-height: 100%;
}

</style>
