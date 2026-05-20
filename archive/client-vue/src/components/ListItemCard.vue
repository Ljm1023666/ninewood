<script setup lang="ts">
defineProps<{ clickable?: boolean }>();
defineEmits<{ click: [] }>();
</script>

<template>
  <div
    class="list-item-card glass"
    :class="{ clickable: clickable !== false }"
    @click="$emit('click')"
  >
    <div class="card-accent" />
    <slot />
  </div>
</template>

<style scoped>
.list-item-card {
  position: relative; overflow: hidden;
  padding: 14px;
  border-radius: var(--radius);
  transition: transform 0.15s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.list-item-card .card-accent { opacity: 0; transition: opacity 0.2s ease; }
.list-item-card:hover .card-accent { opacity: 0.6; }
.list-item-card.clickable {
  cursor: pointer;
}
.list-item-card.clickable:hover {
  border-color: var(--accent-color);
}
.list-item-card.clickable:active {
  transform: scale(0.98);
  box-shadow: var(--shadow-md);
}
</style>
