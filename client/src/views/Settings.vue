<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useThemeStore, presetThemes } from '@/stores/theme';
import { DialogPlugin } from 'tdesign-vue-next';

const router = useRouter();
const userStore = useUserStore();
const themeStore = useThemeStore();

const themeNames = Object.keys(presetThemes);

function setTheme(name: string) {
  themeStore.setTheme(name);
}

function handleLogout() {
  const dlg = DialogPlugin.confirm({
    header: '退出登录', body: '确定退出？', confirmBtn: '退出',
    onConfirm: () => { dlg.hide(); userStore.logout(); router.push('/login'); },
    onClose: () => dlg.hide(),
  });
}
</script>

<template>
  <div class="settings-page">
    <div class="card glass">
      <h2>设置</h2>

      <h3 class="section-title">主题</h3>
      <div class="theme-grid">
        <div
          v-for="name in themeNames" :key="name"
          class="theme-chip"
          :class="{ active: themeStore.current.name === name }"
          :style="{ background: `linear-gradient(135deg, ${presetThemes[name].primaryStart}, ${presetThemes[name].primaryEnd})` }"
          @click="setTheme(name)"
        >
          <span>{{ presetThemes[name].label }}</span>
        </div>
      </div>

      <div class="menu">
        <t-button variant="text" block @click="router.push('/cert-center')">认证中心</t-button>
        <t-button variant="text" block @click="handleLogout">退出登录</t-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page { height: 100%; overflow-y: auto; padding: 20px; }
.card { max-width: 420px; margin: 0 auto; padding: 24px; border-radius: var(--radius); }
h2 { margin: 0 0 20px; }
.section-title { font-size: 14px; color: var(--text-secondary); margin: 0 0 12px; }
.theme-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px; }
.theme-chip {
  padding: 12px 8px; border-radius: var(--radius-sm); cursor: pointer;
  text-align: center; color: #fff; font-size: 13px; font-weight: 600;
  transition: transform var(--transition-fast); border: 2px solid transparent;
}
.theme-chip:hover { transform: scale(1.05); }
.theme-chip.active { border-color: #fff; box-shadow: 0 0 16px rgba(255,255,255,0.4); transform: scale(1.05); }
.theme-chip { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.menu { display: flex; flex-direction: column; gap: 4px; }
</style>
