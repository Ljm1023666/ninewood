<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useChatStore } from '@/stores/chat';
import { useThemeStore } from '@/stores/theme';
import { useKeyboard } from '@/composables/useKeyboard';
import { DialogPlugin, Badge } from 'tdesign-vue-next';
import HomeIcon from 'tdesign-icons-vue-next/esm/components/home';
import FileIcon from 'tdesign-icons-vue-next/esm/components/file';
import ChatMessageIcon from 'tdesign-icons-vue-next/esm/components/chat-message';
import User1Icon from 'tdesign-icons-vue-next/esm/components/user-1';
import LogoutIcon from 'tdesign-icons-vue-next/esm/components/logout';
import CompassIcon from 'tdesign-icons-vue-next/esm/components/compass';
import UsergroupIcon from 'tdesign-icons-vue-next/esm/components/usergroup';
import SunnyIcon from 'tdesign-icons-vue-next/esm/components/sunny';
import MoonIcon from 'tdesign-icons-vue-next/esm/components/moon';
import SearchIcon from 'tdesign-icons-vue-next/esm/components/search';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const chatStore = useChatStore();
const themeStore = useThemeStore();
const isDark = computed(() => themeStore.current.dark);

const navItems = [
  { path: '/', icon: HomeIcon, label: '发现' },
  { path: '/demands/create', icon: FileIcon, label: '发布' },
  { path: '/shorts', icon: CompassIcon, label: '探索' },
  { path: '/circles', icon: UsergroupIcon, label: '圈子' },
  { path: '/search', icon: SearchIcon, label: '找人' },
  { path: '/messages', icon: ChatMessageIcon, label: '消息', badge: true },
  { path: '/profile', icon: User1Icon, label: '我的' },
];

const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value < 768);
const currentPath = computed(() => route.path);
const isOtherProfile = computed(() => {
  const parts = route.path.split('/');
  return parts[1] === 'profile' && parts[2] && parts[2] !== userStore.user?.id;
});

function onResize() { windowWidth.value = window.innerWidth; }
onMounted(() => { window.addEventListener('resize', onResize); });
onUnmounted(() => { window.removeEventListener('resize', onResize); });

// 通过左侧导航栏直接进入的页面不显示返回按钮
const navPaths = new Set(navItems.map(item => item.path));

const showBackBtn = computed(() => {
  const p = currentPath.value;
  if (navPaths.has(p)) return false;
  if (p.startsWith('/messages/')) return false;
  return true;
});

function navigate(path: string) { router.push(path); }
onMounted(() => { chatStore.fetchUnreadCount(); });
useKeyboard([
  { key: 'k', ctrl: true, handler: () => { if (route.path === '/') { const el = document.querySelector('.search-input-wrap input') as HTMLInputElement; el?.focus(); } } },
  { key: 'Escape', handler: () => { if (route.path !== '/') router.back(); } },
]);

function handleLogout() {
  const dlg = DialogPlugin.confirm({
    header: '退出登录', body: '确定要退出当前账号吗？', confirmBtn: '退出',
    onConfirm: () => { dlg.hide(); userStore.logout(); router.push('/login'); },
    onClose: () => dlg.hide(),
  });
}

function toggleTheme() { themeStore.toggleDarkMode(); }
</script>

<template>
  <div class="layout">
    <aside v-if="!isOtherProfile || isMobile" class="sidebar glass">
      <div class="sidebar-logo" @click="navigate('/')">
        <span class="logo-text cyber-glow">N</span>
      </div>
      <nav class="sidebar-nav">
        <div
          v-for="item in navItems" :key="item.path"
          class="nav-item"
          :class="{ active: item.path === '/' ? currentPath === '/' : currentPath.startsWith(item.path) }"
          @click="navigate(item.path)">
          <Badge v-if="item.badge && chatStore.unreadCount" :count="chatStore.unreadCount" :offset="[6, -2]">
            <component :is="item.icon" class="nav-icon" />
          </Badge>
          <component v-else :is="item.icon" class="nav-icon" />
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="nav-item" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
          <SunnyIcon v-if="isDark" class="nav-icon" />
          <MoonIcon v-else class="nav-icon" />
          <span class="nav-label">主题</span>
        </div>
        <div class="nav-item" @click="handleLogout" title="退出登录">
          <LogoutIcon class="nav-icon" /><span class="nav-label">注销</span>
        </div>
      </div>
    </aside>
    <main class="main-content">
      <div class="page-glow" aria-hidden="true" />
      <button v-if="showBackBtn" class="global-back" :class="{ 'no-sidebar': isOtherProfile }" @click="router.back()" aria-label="返回">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; overflow: hidden; }
.sidebar {
  width: var(--sidebar-w); display: flex; flex-direction: column; align-items: center; padding: 16px 0;
  border-radius: 0; border-right: 1px solid var(--border-color); flex-shrink: 0; z-index: 10;
  border-top: none; border-bottom: none; border-left: none;
}
.sidebar-logo { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: 12px; }
.logo-text { font-size: 28px; font-weight: 900; }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  width: 48px; height: 48px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; cursor: pointer; border-radius: var(--radius-sm);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: var(--text-secondary);
  position: relative;
}
.nav-item::before {
  content: ''; position: absolute; inset: 2px; border-radius: var(--radius-sm);
  background: radial-gradient(ellipse at center, var(--primary-start) 0%, transparent 70%);
  opacity: 0; transition: opacity 0.35s ease;
}
.nav-item:hover { background: rgba(102, 126, 234, 0.1); color: var(--text-primary); }
.nav-item.active {
  background: rgba(102, 126, 234, 0.15); color: var(--primary-start);
  box-shadow: inset 3px 0 0 var(--primary-start);
}
.nav-item.active::before { opacity: 0.12; }
.nav-icon {
  font-size: 18px; line-height: 1; position: relative; z-index: 1;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease, opacity 0.3s ease;
  opacity: 0.5;
}
.nav-item:hover .nav-icon, .nav-item.active .nav-icon { opacity: 1; }
.nav-item:hover .nav-icon { transform: rotate(15deg) scale(1.1); }
.nav-item:active .nav-icon { transform: rotate(30deg) scale(0.9); }
.nav-label { font-size: 10px; margin-top: 2px; }
.sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 2px; }
.main-content { flex: 1; overflow-y: auto; scrollbar-gutter: stable; position: relative; isolation: isolate; }
.main-content > :not(.page-glow):not(.global-back) { position: relative; z-index: 1; }

/* ── Global back button ── */
.global-back {
  position: fixed; top: 14px; left: 86px; z-index: 999;
  width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;
  color: var(--text-secondary); cursor: pointer;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.2); transition: all 0.2s;
}
.global-back:hover { color: var(--text-primary); border-color: var(--accent-color); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }

.global-back.no-sidebar { left: 16px; }

@media (max-width: 768px) {
  .global-back { left: 12px; top: 12px; }
  .global-back.no-sidebar { left: 12px; }
}

@media (min-width: 1024px) {
  .main-content > :not(.full-width):not(.force-wide) {
    max-width: var(--content-max-w); margin-left: auto; margin-right: auto;
  }
}

@media (min-width: 1440px) {
  .main-content > :not(.full-width):not(.force-wide) {
    --content-max-w: 900px;
    max-width: var(--content-max-w);
  }
}

@media (max-width: 768px) {
  .layout { flex-direction: column; }
  .sidebar {
    position: fixed; bottom: 0; left: 0; right: 0; width: 100%;
    height: calc(64px + env(safe-area-inset-bottom, 0px));
    padding: 0 8px env(safe-area-inset-bottom, 0px);
    flex-direction: row; border-right: none; border-top: 1px solid var(--border-color);
    z-index: 100;
  }
  .sidebar-logo, .sidebar-footer { display: none; }
  .sidebar-nav { flex-direction: row; flex: 1; justify-content: space-around; gap: 0; }
  .nav-item { width: auto; height: 100%; padding: 0 12px; flex: 1; }
  .nav-item.active { box-shadow: none; border-top: 2px solid var(--primary-start); background: radial-gradient(ellipse at 50% 0%, var(--primary-start) 0%, transparent 70%); }
.nav-item.active .nav-icon { opacity: 1; }
  .nav-icon { font-size: 20px; }
}
</style>
