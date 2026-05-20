import { onMounted, onUnmounted } from 'vue';
export function useKeyboard(shortcuts) {
    function onKeydown(e) {
        for (const s of shortcuts) {
            const keyMatch = e.key === s.key;
            const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
            if (keyMatch && ctrlMatch) {
                e.preventDefault();
                s.handler();
                return;
            }
        }
    }
    onMounted(() => document.addEventListener('keydown', onKeydown));
    onUnmounted(() => document.removeEventListener('keydown', onKeydown));
}
//# sourceMappingURL=useKeyboard.js.map