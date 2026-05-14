<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = withDefaults(defineProps<{
  animation?: string;
  delay?: number;
  stagger?: number;
  threshold?: number;
  rootMargin?: string;
}>(), {
  animation: 'fadeUp',
  delay: 0,
  stagger: 0,
  threshold: 0.1,
  rootMargin: '0px 0px -30px 0px',
});

const visible = ref(false);
const el = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function applyStagger() {
  if (!el.value || !props.stagger) return;
  const children = el.value.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    child.style.animationDelay = `${props.delay + i * props.stagger}ms`;
  }
}

onMounted(() => {
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      visible.value = true;
      observer?.disconnect();
      nextTick(applyStagger);
    }
  }, { threshold: props.threshold, rootMargin: props.rootMargin });
  if (el.value) observer.observe(el.value);
});

onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div
    ref="el"
    :class="visible ? `animate-${animation}` : ''"
    :style="{ opacity: visible ? undefined : 0 }"
  >
    <slot />
  </div>
</template>
