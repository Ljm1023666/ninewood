import { defineStore } from 'pinia';
import { ref } from 'vue';
export const presetThemes = {
    cyberpunk: {
        name: 'cyberpunk', label: '赛博朋克', type: 'preset', dark: true,
        primaryStart: '#667eea', primaryEnd: '#764ba2', accentColor: '#667eea',
        bgPrimary: '#0a0a1a', bgSecondary: '#12122a', bgTertiary: '#1a1a3a',
        bgCard: 'rgba(102,126,234,0.08)',
        textPrimary: '#e0e0f0', textSecondary: '#b0b0d0', textMuted: '#8080a8',
        borderColor: 'rgba(102,126,234,0.2)',
        successColor: '#2ecc71', warningColor: '#f39c12', errorColor: '#ff4757',
        glassBlur: '20px', glassOpacity: '0.08',
        borderRadius: '12px', borderRadiusSm: '8px', borderWidth: '1px',
        shadowSm: '0 4px 16px rgba(0,0,0,0.4)', shadowMd: '0 8px 32px rgba(0,0,0,0.5)',
        shadowLg: '0 16px 48px rgba(0,0,0,0.6)',
        glowPrimary: '0 0 30px rgba(102,126,234,0.25)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    ocean: {
        name: 'ocean', label: '深海', type: 'preset', dark: true,
        primaryStart: '#00b4d8', primaryEnd: '#0077b6', accentColor: '#00b4d8',
        bgPrimary: '#0a1628', bgSecondary: '#0f2038', bgTertiary: '#152d4a',
        bgCard: 'rgba(0,180,216,0.08)',
        textPrimary: '#d0e8f0', textSecondary: '#90c0d8', textMuted: '#6a98b0',
        borderColor: 'rgba(0,180,216,0.2)',
        successColor: '#2ecc71', warningColor: '#f39c12', errorColor: '#e74c3c',
        glassBlur: '20px', glassOpacity: '0.08',
        borderRadius: '14px', borderRadiusSm: '10px', borderWidth: '1px',
        shadowSm: '0 4px 16px rgba(0,0,0,0.4)', shadowMd: '0 8px 32px rgba(0,100,180,0.2)',
        shadowLg: '0 16px 48px rgba(0,0,0,0.6)',
        glowPrimary: '0 0 30px rgba(0,180,216,0.25)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    sunset: {
        name: 'sunset', label: '日落', type: 'preset', dark: true,
        primaryStart: '#f093fb', primaryEnd: '#f5576c', accentColor: '#f093fb',
        bgPrimary: '#1a0f14', bgSecondary: '#2a151c', bgTertiary: '#3a1c24',
        bgCard: 'rgba(240,147,251,0.08)',
        textPrimary: '#f0d8e0', textSecondary: '#c098a8', textMuted: '#987880',
        borderColor: 'rgba(240,147,251,0.2)',
        successColor: '#2ecc71', warningColor: '#f39c12', errorColor: '#ff4757',
        glassBlur: '20px', glassOpacity: '0.08',
        borderRadius: '12px', borderRadiusSm: '8px', borderWidth: '1px',
        shadowSm: '0 4px 16px rgba(0,0,0,0.4)', shadowMd: '0 8px 32px rgba(240,147,251,0.18)',
        shadowLg: '0 16px 48px rgba(0,0,0,0.6)',
        glowPrimary: '0 0 30px rgba(240,147,251,0.25)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    forest: {
        name: 'forest', label: '森林', type: 'preset', dark: true,
        primaryStart: '#2ecc71', primaryEnd: '#27ae60', accentColor: '#2ecc71',
        bgPrimary: '#0a1a0f', bgSecondary: '#0f2416', bgTertiary: '#15301e',
        bgCard: 'rgba(46,204,113,0.08)',
        textPrimary: '#d0e8d0', textSecondary: '#98c898', textMuted: '#70a070',
        borderColor: 'rgba(46,204,113,0.2)',
        successColor: '#2ecc71', warningColor: '#f39c12', errorColor: '#e74c3c',
        glassBlur: '20px', glassOpacity: '0.08',
        borderRadius: '10px', borderRadiusSm: '6px', borderWidth: '1px',
        shadowSm: '0 4px 16px rgba(0,0,0,0.4)', shadowMd: '0 8px 32px rgba(46,204,113,0.18)',
        shadowLg: '0 16px 48px rgba(0,0,0,0.6)',
        glowPrimary: '0 0 30px rgba(46,204,113,0.25)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    crimson: {
        name: 'crimson', label: '赤红', type: 'preset', dark: true,
        primaryStart: '#ff6b6b', primaryEnd: '#c0392b', accentColor: '#ff6b6b',
        bgPrimary: '#1a0a0a', bgSecondary: '#2a1010', bgTertiary: '#3a1818',
        bgCard: 'rgba(255,107,107,0.08)',
        textPrimary: '#f0d0d0', textSecondary: '#c09898', textMuted: '#a07878',
        borderColor: 'rgba(255,107,107,0.2)',
        successColor: '#2ecc71', warningColor: '#f39c12', errorColor: '#ff4757',
        glassBlur: '20px', glassOpacity: '0.08',
        borderRadius: '8px', borderRadiusSm: '4px', borderWidth: '1px',
        shadowSm: '0 4px 16px rgba(0,0,0,0.4)', shadowMd: '0 8px 32px rgba(255,107,107,0.18)',
        shadowLg: '0 16px 48px rgba(0,0,0,0.6)',
        glowPrimary: '0 0 30px rgba(255,107,107,0.25)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
    light: {
        name: 'light', label: '纯净', type: 'preset', dark: false,
        primaryStart: '#667eea', primaryEnd: '#764ba2', accentColor: '#667eea',
        // Brighter page bg + more opaque cards so glass/blur does not read as “gray haze”
        bgPrimary: '#ffffff', bgSecondary: '#f5f6fa', bgTertiary: '#ebecef',
        bgCard: 'rgba(255,255,255,0.97)',
        textPrimary: '#12121f', textSecondary: '#4a4a5c', textMuted: '#7a7a8c',
        borderColor: 'rgba(102,126,234,0.18)',
        successColor: '#27ae60', warningColor: '#e67e22', errorColor: '#e74c3c',
        glassBlur: '6px', glassOpacity: '0.72',
        borderRadius: '12px', borderRadiusSm: '8px', borderWidth: '1px',
        shadowSm: '0 1px 4px rgba(0,0,0,0.06)', shadowMd: '0 4px 16px rgba(0,0,0,0.07)',
        shadowLg: '0 12px 36px rgba(0,0,0,0.1)',
        glowPrimary: '0 0 16px rgba(102,126,234,0.12)',
        transitionFast: '0.15s ease', transitionNormal: '0.3s ease', animationEnable: true,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    },
};
function cssVarsFromTheme(t) {
    const vars = {
        '--primary-start': t.primaryStart,
        '--primary-end': t.primaryEnd,
        '--accent-color': t.accentColor,
        '--primary-gradient': `linear-gradient(135deg, ${t.primaryStart}, ${t.primaryEnd})`,
        '--bg-primary': t.bgPrimary,
        '--bg-secondary': t.bgSecondary,
        '--bg-tertiary': t.bgTertiary,
        '--bg-card': t.bgCard,
        '--text-primary': t.textPrimary,
        '--text-secondary': t.textSecondary,
        '--text-muted': t.textMuted,
        '--text-tertiary': t.textMuted,
        '--text-disabled': t.textMuted,
        '--border-color': t.borderColor,
        '--success-color': t.successColor,
        '--warning-color': t.warningColor,
        '--error-color': t.errorColor,
        '--glass-blur': t.glassBlur,
        '--glass-opacity': t.glassOpacity,
        '--radius': t.borderRadius,
        '--radius-sm': t.borderRadiusSm,
        '--border-width': t.borderWidth,
        '--shadow-sm': t.shadowSm,
        '--shadow-md': t.shadowMd,
        '--shadow-lg': t.shadowLg,
        '--glow-primary': t.glowPrimary,
        '--transition-fast': t.transitionFast,
        '--transition-normal': t.transitionNormal,
        '--font-family': t.fontFamily,
    };
    // Bridge TDesign's internal CSS variable system so ALL TDesign components follow the theme
    Object.assign(vars, {
        '--td-bg-color-page': t.bgPrimary,
        '--td-bg-color-container': t.bgSecondary,
        '--td-bg-color-container-hover': t.bgTertiary,
        '--td-bg-color-component': t.bgCard,
        '--td-text-color-primary': t.textPrimary,
        '--td-text-color-secondary': t.textSecondary,
        '--td-text-color-placeholder': t.textMuted,
        '--td-border-level-1-color': t.borderColor,
        '--td-border-level-2-color': t.borderColor,
        '--td-success-color': t.successColor,
        '--td-warning-color': t.warningColor,
        '--td-error-color': t.errorColor,
        '--td-brand-color': t.primaryStart,
        '--td-radius-default': t.borderRadius,
        '--td-radius-small': t.borderRadiusSm,
        '--td-shadow-1': t.shadowSm,
        '--td-shadow-2': t.shadowMd,
        '--td-font-family': t.fontFamily,
    });
    return vars;
}
const STORAGE_KEY = 'ninewood-theme';
export const useThemeStore = defineStore('theme', () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const current = ref(saved ? JSON.parse(saved) : { ...presetThemes.cyberpunk });
    function applyTheme(t) {
        const vars = cssVarsFromTheme(t);
        const root = document.documentElement;
        for (const [key, val] of Object.entries(vars)) {
            root.style.setProperty(key, val);
        }
        root.setAttribute('data-theme', t.name);
        root.setAttribute('data-dark', String(t.dark));
        root.setAttribute('theme-mode', t.dark ? 'dark' : 'light');
        root.style.colorScheme = t.dark ? 'dark' : 'light';
    }
    function setTheme(name) {
        const preset = presetThemes[name];
        if (!preset)
            return;
        if (name === 'light') {
            // Explicit light mode switch
            current.value = { ...preset };
        }
        else if (!current.value.dark) {
            // Currently in light mode — apply the preset's primary colors with light backgrounds
            current.value = {
                ...presetThemes.light,
                primaryStart: preset.primaryStart,
                primaryEnd: preset.primaryEnd,
                accentColor: preset.accentColor,
                name: preset.name,
                label: preset.label,
                type: 'preset',
            };
        }
        else {
            // In dark mode — apply directly
            current.value = { ...preset };
        }
        applyTheme(current.value);
        persist();
    }
    function updateCustom(config) {
        current.value = { ...current.value, ...config, type: 'custom' };
        applyTheme(current.value);
        persist();
    }
    function exportTheme() {
        return JSON.stringify(current.value, null, 2);
    }
    function importTheme(json) {
        try {
            const t = JSON.parse(json);
            if (!t.primaryStart || !t.bgPrimary)
                return false;
            current.value = { ...t, type: 'custom' };
            applyTheme(current.value);
            persist();
            return true;
        }
        catch {
            return false;
        }
    }
    function resetTo(name) {
        setTheme(name);
    }
    function toggleDarkMode() {
        const cur = current.value;
        const pStart = cur.primaryStart;
        const pEnd = cur.primaryEnd;
        const accent = cur.accentColor;
        const presetName = cur.name;
        const presetLabel = cur.label;
        if (cur.dark) {
            current.value = {
                ...presetThemes.light,
                primaryStart: pStart,
                primaryEnd: pEnd,
                accentColor: accent,
                name: presetName,
                label: presetLabel,
                type: 'custom',
            };
        }
        else {
            current.value = {
                ...presetThemes.cyberpunk,
                primaryStart: pStart,
                primaryEnd: pEnd,
                accentColor: accent,
                name: presetName,
                label: presetLabel,
                type: 'custom',
            };
        }
        applyTheme(current.value);
        persist();
    }
    function persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current.value));
    }
    // Init
    applyTheme(current.value);
    return {
        current, setTheme, updateCustom, exportTheme, importTheme, resetTo, toggleDarkMode,
    };
});
//# sourceMappingURL=theme.js.map