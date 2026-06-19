<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { formatChatTime } from '@/utils/time';
import { messageApi } from '@/api/message';
import { useUserStore } from '@/stores/user';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';
import AnimateOnScroll from '@/components/AnimateOnScroll.vue';
import PullRefresh from '@/components/PullRefresh.vue';

const router = useRouter();
const userStore = useUserStore();
const conversations = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

async function fetchConversations() {
  loading.value = true; error.value = '';
  try {
    const res = await messageApi.conversations();
    conversations.value = res.data.data;
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载失败';
  } finally { loading.value = false; }
}

onMounted(fetchConversations);
</script>

<template>
  <PullRefresh class="messages-page thin-scroll" @refresh="fetchConversations">
    <ErrorState v-if="error" :message="error" @retry="fetchConversations" />
    <LoadingState v-else-if="loading" />

    <div v-else class="list">
      <div class="list-header">
        <span class="header-label">消息</span>
        <span class="header-count" v-if="conversations.length">{{ conversations.length }} 个对话</span>
      </div>

      <EmptyState
        v-if="conversations.length === 0"
        icon="💬" message="还没有消息，去首页找人聊聊吧"
        action-label="去首页" @action="router.push('/')"
      />

      <AnimateOnScroll animation="slideRight" :stagger="50">
        <div
          v-for="c in conversations" :key="c.user.id"
          class="chat-item"
          @click="router.push(`/messages/${c.user.id}`)"
        >
        <div class="avatar-wrap">
          <img v-if="c.user.avatarUrl" :src="c.user.avatarUrl" class="avatar-img" loading="lazy" decoding="async" />
          <span v-else class="avatar-text">{{ c.user.nickname?.charAt(0) }}</span>
          <div v-if="c.unreadCount" class="dot" />
        </div>
        <div class="item-body">
          <div class="item-row">
            <span class="name">{{ c.user.nickname }}</span>
            <span class="time">{{ formatChatTime(c.lastMessage?.createdAt) }}</span>
          </div>
          <div class="item-row">
            <span class="preview">
              {{ c.lastMessage?.content?.slice(0, 40) || '暂无消息' }}
            </span>
          </div>
        </div>
      </div>
      </AnimateOnScroll>
    </div>
  </PullRefresh>
</template>

<style scoped>
.messages-page {
  height: 100%;
  background: var(--bg-primary);
}

.list { display: flex; flex-direction: column; }

.list-header {
  display: flex; align-items: baseline; justify-content: space-between;
  padding: 20px 20px 8px;
}
.header-label { font-size: 24px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.3px; }
.header-count { font-size: 12px; color: var(--text-muted); }

.chat-item {
  position: relative; overflow: hidden;
  display: flex; gap: 14px; padding: 16px 20px;
  cursor: pointer; align-items: center;
  transition: background 0.12s;
}
.chat-item {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
              background 0.15s ease;
}
.chat-item:hover { background: var(--bg-secondary); transform: translateX(4px); }
.chat-item:active { transform: scale(0.985); }

.avatar-wrap {
  position: relative; width: 48px; height: 48px; border-radius: 50%;
  flex-shrink: 0; overflow: hidden;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-card));
  display: flex; align-items: center; justify-content: center;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text { font-size: 18px; font-weight: 700; color: var(--text-secondary); }

.dot {
  position: absolute; top: 4px; right: 4px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--error-color);
  animation: dot-pulse 2s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--error-color) 40%, transparent); }
  50%      { box-shadow: 0 0 0 6px color-mix(in srgb, var(--error-color) 0%, transparent); }
}

.item-body {
  flex: 1; min-width: 0;
  padding-bottom: 2px; border-bottom: 1px solid var(--border-color);
}

.chat-item:last-child .item-body { border-bottom: none; }

.item-row {
  display: flex; justify-content: space-between; align-items: center;
}
.item-row:first-child { margin-bottom: 4px; }

.name { font-size: 17px; color: var(--text-primary); font-weight: 600; }

.time { font-size: 12px; color: var(--text-muted); flex-shrink: 0; margin-left: 8px; }

.preview {
  font-size: 13px; color: var(--text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>
