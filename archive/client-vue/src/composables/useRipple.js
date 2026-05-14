import { onMounted, onUnmounted } from 'vue';
export function useRipple(elRef) {
    function handler(e) {
        const el = elRef.value;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        const ripple = document.createElement('span');
        ripple.style.cssText = [
            `position:absolute; left:${x}px; top:${y}px`,
            `width:${size}px; height:${size}px`,
            'border-radius:50%',
            'background:rgba(255,255,255,0.15)',
            'transform:scale(0)',
            'animation:ripple-effect 0.5s ease-out forwards',
            'pointer-events:none',
        ].join(';');
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }
    onMounted(() => elRef.value?.addEventListener('click', handler));
    onUnmounted(() => elRef.value?.removeEventListener('click', handler));
}
//# sourceMappingURL=useRipple.js.map