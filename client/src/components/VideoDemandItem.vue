<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  source: string;
  coverImage?: string;
  isCustomCover?: boolean;
  autoplay?: boolean;
}>();

const playing = ref(false);
const videoRef = ref<HTMLVideoElement | null>(null);
const wrapRef = ref<HTMLElement | null>(null);
/** 素材比外层更瘦高则用 contain（与 Shorts 一致） */
const mediaFitContain = ref(false);

let resizeCleanup: (() => void) | null = null;

function syncContain() {
  const wrap = wrapRef.value;
  const v = videoRef.value;
  if (!wrap || !v?.videoWidth || !v.videoHeight) return;
  const cw = wrap.clientWidth;
  const ch = wrap.clientHeight;
  if (cw < 2 || ch < 2) return;
  const cellAR = cw / ch;
  const mediaAR = v.videoWidth / v.videoHeight;
  mediaFitContain.value = mediaAR < cellAR;
}

function scheduleSync() {
  requestAnimationFrame(() => {
    requestAnimationFrame(syncContain);
  });
}

function onVideoMeta() {
  scheduleSync();
}

watch(() => props.source, () => {
  mediaFitContain.value = false;
});

watch(() => props.autoplay, (v) => {
  if (v && videoRef.value && !props.isCustomCover) {
    videoRef.value.play().catch(() => {});
    playing.value = true;
  } else if (!v && videoRef.value) {
    videoRef.value.pause();
    playing.value = false;
  }
});

function togglePlay() {
  if (!videoRef.value) return;
  if (playing.value) {
    videoRef.value.pause();
    playing.value = false;
  } else {
    videoRef.value.play().catch(() => {});
    playing.value = true;
  }
}

onMounted(() => {
  let t: ReturnType<typeof setTimeout> | null = null;
  const onResize = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      syncContain();
      t = null;
    }, 120);
  };
  window.addEventListener('resize', onResize);
  resizeCleanup = () => {
    window.removeEventListener('resize', onResize);
    if (t) clearTimeout(t);
    resizeCleanup = null;
  };
});

onUnmounted(() => {
  resizeCleanup?.();
});
</script>

<template>
  <div
    ref="wrapRef"
    class="video-item"
    :class="{ 'media-fit-contain': mediaFitContain }"
    @click="togglePlay"
  >
    <video
      ref="videoRef"
      :src="source"
      :poster="coverImage"
      preload="metadata"
      muted
      loop
      playsinline
      @loadedmetadata="onVideoMeta"
    />
    <div v-if="!playing" class="play-overlay">
      <div class="play-btn">▶</div>
    </div>
  </div>
</template>

<style scoped>
.video-item {
  position: relative; width: 100%; aspect-ratio: 9/16;
  background: #000; border-radius: var(--radius); overflow: hidden; cursor: pointer;
}
.video-item video {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: top center;
  background: #000;
}
.video-item.media-fit-contain video {
  object-fit: contain;
  object-position: center center;
}
.play-overlay {
  position: absolute; inset: 0; z-index: 1;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.3);
}
.play-btn {
  width: 56px; height: 56px; border-radius: 50%;
  background: rgba(255,255,255,0.2); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; backdrop-filter: blur(4px);
}
</style>
