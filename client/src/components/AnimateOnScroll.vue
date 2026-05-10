<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{ animation?: string; delay?: number }>();
const visible = ref(false);
const el = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { visible.value = true; observer?.disconnect(); }
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  if (el.value) observer.observe(el.value);
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div ref="el" :class="visible ? `animate-${animation || 'fadeUp'}` : ''" :style="{ opacity: visible ? 1 : 0, animationDelay: `${delay || 0}ms` }">
    <slot />
  </div>
</template>
