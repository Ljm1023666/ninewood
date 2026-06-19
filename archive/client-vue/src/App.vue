<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const navigating = ref(false);

userStore.init();

let timer: ReturnType<typeof setTimeout> | null = null;

router.beforeEach(() => { navigating.value = true; });
router.afterEach(() => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { navigating.value = false; }, 300);
});
router.onError(() => { navigating.value = false; });
</script>

<template>
  <div class="progress-bar" :class="{ active: navigating }" />
  <router-view />
</template>

<style>
@import './styles/transitions.css';

.progress-bar {
  position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 9999;
  pointer-events: none; opacity: 0; transition: opacity 0.1s;
}
.progress-bar.active { opacity: 1; background: var(--primary-gradient); animation: progress-slide 0.6s ease-in-out; }
@keyframes progress-slide { 0% { width: 0; } 50% { width: 70%; } 100% { width: 95%; } }
</style>
