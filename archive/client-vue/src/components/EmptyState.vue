<script setup lang="ts">
import { computed } from 'vue';
import File1Icon from 'tdesign-icons-vue-next/esm/components/file-1';
import ChatMessageIcon from 'tdesign-icons-vue-next/esm/components/chat-message';
import ShopIcon from 'tdesign-icons-vue-next/esm/components/shop';
import UsergroupIcon from 'tdesign-icons-vue-next/esm/components/usergroup';
import SearchIcon from 'tdesign-icons-vue-next/esm/components/search';
import VideoIcon from 'tdesign-icons-vue-next/esm/components/video';
import InfoCircleIcon from 'tdesign-icons-vue-next/esm/components/info-circle';
import ErrorCircleIcon from 'tdesign-icons-vue-next/esm/components/error-circle';

const props = defineProps<{
  type?: string;
  message?: string;
  actionLabel?: string;
  variant?: 'default' | 'error';
}>();
defineEmits<{ action: [] }>();

const iconMap: Record<string, any> = {
  demand: File1Icon,
  message: ChatMessageIcon,
  order: ShopIcon,
  circle: UsergroupIcon,
  search: SearchIcon,
  video: VideoIcon,
};

const presetMsgs: Record<string, string> = {
  demand: '还没有需求',
  message: '暂无消息',
  order: '暂无订单',
  circle: '暂无圈子',
  search: '没有找到相关内容',
  video: '暂无视频案例',
};

const presetActions: Record<string, string> = {
  demand: '发布第一个需求',
  message: '去发现页看看',
  circle: '创建圈子',
  video: '发布带视频的需求',
};

const iconComponent = computed(() => iconMap[props.type || ''] || InfoCircleIcon);
const statusIcon = computed(() => (props.variant === 'error' ? ErrorCircleIcon : iconComponent.value));
const msg = computed(() => props.message || presetMsgs[props.type || ''] || '暂无内容');
const btnLabel = computed(() => props.actionLabel || presetActions[props.type || ''] || '');
const isError = computed(() => props.variant === 'error');
</script>

<template>
  <div class="empty-state" :class="{ 'is-error': isError }">
    <!-- 三图标交叠布局 -->
    <div class="icons-stack">
      <span class="icon-slot left"><SearchIcon size="22px" /></span>
      <span class="icon-slot center"><component :is="statusIcon" size="28px" /></span>
      <span class="icon-slot right"><File1Icon size="22px" /></span>
    </div>
    <p class="empty-message">{{ msg }}</p>
    <t-button
      v-if="btnLabel"
      :theme="isError ? 'danger' : 'primary'"
      variant="outline"
      @click="$emit('action')"
    >
      {{ btnLabel }}
    </t-button>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ── 三图标交叠 ── */
.icons-stack {
  display: flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  margin-bottom: 4px;
}

.icon-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  transition: transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.icon-slot.left {
  z-index: 1;
  transform: translateX(16px) rotate(-6deg);
  animation: icon-drop-left 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
}

.icon-slot.center {
  z-index: 2;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  animation: icon-drop-center 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.18s both;
}

.icon-slot.right {
  z-index: 1;
  transform: translateX(-16px) rotate(6deg);
  animation: icon-drop-right 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
}

/* 错误态 center slot 强调 */
.is-error .icon-slot.center {
  border-color: var(--error-color);
  color: var(--error-color);
  box-shadow: 0 0 24px rgba(255, 71, 87, 0.2);
}

/* hover 微动效 */
.icons-stack:hover .icon-slot.left  { transform: translateX(22px) translateY(-4px) rotate(-12deg); }
.icons-stack:hover .icon-slot.center { transform: translateY(-6px) scale(1.08); }
.icons-stack:hover .icon-slot.right { transform: translateX(-22px) translateY(-4px) rotate(12deg); }

@keyframes icon-drop-left {
  from { opacity: 0; transform: translateX(16px) translateY(16px) rotate(-12deg) scale(0.8); }
  to   { opacity: 1; transform: translateX(16px) rotate(-6deg) scale(1); }
}

@keyframes icon-drop-center {
  from { opacity: 0; transform: translateY(20px) scale(0.7); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes icon-drop-right {
  from { opacity: 0; transform: translateX(-16px) translateY(16px) rotate(12deg) scale(0.8); }
  to   { opacity: 1; transform: translateX(-16px) rotate(6deg) scale(1); }
}

.empty-message {
  color: var(--text-muted);
  margin: 0;
  font-size: 14px;
  animation: fadeUp 0.4s ease-out 0.35s both;
}

.is-error .empty-message { color: var(--error-color); }
</style>
