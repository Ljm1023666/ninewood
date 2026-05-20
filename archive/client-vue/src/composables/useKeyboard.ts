import { onMounted, onUnmounted } from 'vue';

type Shortcut = { key: string; ctrl?: boolean; handler: () => void };

export function useKeyboard(shortcuts: Shortcut[]) {
  function onKeydown(e: KeyboardEvent) {
    for (const s of shortcuts) {
      const keyMatch = e.key === s.key;
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
      if (keyMatch && ctrlMatch) { e.preventDefault(); s.handler(); return; }
    }
  }
  onMounted(() => document.addEventListener('keydown', onKeydown));
  onUnmounted(() => document.removeEventListener('keydown', onKeydown));
}
