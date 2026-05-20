<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useChatStore } from '@/stores/chat';
import { messageApi } from '@/api/message';
import { userApi } from '@/api/user';
import ChatNavBar from '@/components/ChatNavBar.vue';
import TimeDivider from '@/components/TimeDivider.vue';
import MessageBubble from '@/components/MessageBubble.vue';
import ActionSheet from '@/components/ActionSheet.vue';

const route = useRoute();
const userStore = useUserStore();
const chatStore = useChatStore();
const peerId = computed(() => route.params.userId as string);
const router = useRouter();

const messages = computed(() => chatStore.messages.filter(m =>
  ((m.senderId || m.fromUserId) === userStore.user?.id && (m.receiverId || m.toUserId) === peerId.value) ||
  ((m.senderId || m.fromUserId) === peerId.value && (m.receiverId || m.toUserId) === userStore.user?.id)
));
const input = ref('');
const showEmoji = ref(false);
const showSheet = ref(false);
const isVoiceMode = ref(false);
const uploadFile = ref<File | null>(null);
const uploadPreview = ref('');
const uploadIsVideo = ref(false);
const listRef = ref<HTMLElement | null>(null);

// Fetch peer user info so nickname is available before any messages
const peerUser = ref<{ nickname: string; avatarUrl: string | null } | null>(null);
async function fetchPeerUser() {
  try {
    const res = await userApi.get(peerId.value);
    peerUser.value = res.data.data;
  } catch { peerUser.value = null; }
}
watch(peerId, fetchPeerUser, { immediate: true });

const peerInfo = computed(() => {
  const hit = messages.value.find((msg) => {
    const sid = msg.senderId || msg.fromUserId;
    const rid = msg.receiverId || msg.toUserId;
    const sidMatches = sid === peerId.value;
    const ridMatches = rid === peerId.value;
    return sidMatches || ridMatches;
  });
  if (!hit) {
    if (peerUser.value) return { nickname: peerUser.value.nickname, avatarUrl: peerUser.value.avatarUrl };
    return { nickname: '', avatarUrl: '' };
  }
  const sid = hit.senderId || hit.fromUserId;
  if (sid === peerId.value) {
    return { nickname: hit.fromUser?.nickname, avatarUrl: hit.fromUser?.avatarUrl ?? null };
  }
  return { nickname: hit.toUser?.nickname, avatarUrl: hit.toUser?.avatarUrl ?? null };
});

const peerNickname = computed(() => peerInfo.value.nickname || '聊天');
const peerAvatar = computed(() => peerInfo.value.avatarUrl || '');

const emojis = ['😀','😂','🤣','😍','🥰','😎','🤩','👍','🙏','💪','🔥','🎉','❤','💔','🎨','💻','📱','💰','⭐','✅','❌','🤝','🍳','🚗','☕','📖','🎵','🌙','✨','🎂'];

function insertEmoji(e: string) { input.value += e; showEmoji.value = false; }

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) {
    uploadFile.value = f;
    uploadPreview.value = URL.createObjectURL(f);
    uploadIsVideo.value = f.type.startsWith('video/');
  }
}

async function sendFile() {
  if (!uploadFile.value) return;
  try {
    const fd = new FormData();
    fd.append('toUserId', peerId.value);
    fd.append('file', uploadFile.value);
    fd.append('content', '');
    await messageApi.sendForm(fd);
    uploadFile.value = null; uploadPreview.value = ''; uploadIsVideo.value = false;
    chatStore.fetchMessages(peerId.value);
    nextTick(() => scrollBottom(true));
  } catch {}
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  try {
    const res = await messageApi.send(peerId.value, text);
    chatStore.messages = [...chatStore.messages, res.data.data];
    input.value = '';
    nextTick(() => scrollBottom(true));
  } catch {}
}

function onSheetSelect(action: string) {
  showSheet.value = false;
  if (action === 'image') document.getElementById('imageFileInput')?.click();
  if (action === 'video') document.getElementById('videoFileInput')?.click();
}

function scrollBottom(force = false) {
  if (!listRef.value) return;
  if (force) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
    return;
  }
  // Only auto-scroll if user is near the bottom
  const el = listRef.value;
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  if (atBottom) el.scrollTop = el.scrollHeight;
}

// Auto-scroll when new messages arrive
watch(() => messages.value.length, () => {
  nextTick(() => scrollBottom());
});

// Refresh messages when switching chats or gaining focus
let pollTimer: ReturnType<typeof setInterval> | null = null;
const pollActive = ref(false);

function startPolling() {
  if (pollActive.value || chatStore.connected) return;
  pollActive.value = true;
  pollTimer = setInterval(() => {
    chatStore.fetchMessages(peerId.value);
  }, 10000);
}

function stopPolling() {
  pollActive.value = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

function onSocketDisconnect() { startPolling(); }
function onSocketConnect() { stopPolling(); }

watch([peerId, chatStore.connected], ([, connected]) => {
  if (connected) stopPolling(); else startPolling();
});

watch(peerId, () => {
  chatStore.fetchMessages(peerId.value);
  nextTick(() => scrollBottom(true));
  if (!chatStore.connected) startPolling();
});

onMounted(() => {
  if (peerId.value === userStore.user?.id) {
    router.replace('/messages');
    return;
  }
  chatStore.fetchMessages(peerId.value);
  nextTick(scrollBottom);
  if (!chatStore.connected) startPolling();
  document.addEventListener('visibilitychange', onVisible);
});

onUnmounted(() => {
  stopPolling();
  document.removeEventListener('visibilitychange', onVisible);
});

function onVisible() {
  if (document.visibilityState === 'visible') {
    chatStore.fetchMessages(peerId.value);
    if (!chatStore.connected) startPolling();
  } else {
    stopPolling();
  }
}
</script>

<template>
  <div class="chat-page full-width">
    <ChatNavBar :nickname="peerNickname" />

    <div ref="listRef" class="chat-list thin-scroll">
      <template v-for="(m, idx) in messages" :key="m.id || m.createdAt">
        <TimeDivider
          :timestamp="m.createdAt"
          :prev-timestamp="idx > 0 ? messages[idx - 1].createdAt : null"
        />
        <MessageBubble
          :content="m.content"
          :is-mine="(m.senderId || m.fromUserId) === userStore.user?.id"
          :type="m.type"
          :nickname="peerNickname"
          :avatar-url="peerAvatar"
          :hide-avatar="idx < messages.length - 1 && (messages[idx + 1].senderId || messages[idx + 1].fromUserId) === (m.senderId || m.fromUserId)"
        />
      </template>
    </div>

    <!-- Image preview bar -->
    <div v-if="uploadPreview" class="image-preview-bar">
      <video v-if="uploadIsVideo" :src="uploadPreview" controls muted class="preview-media" />
      <img v-else :src="uploadPreview" class="preview-media" loading="lazy" decoding="async" />
      <t-button size="small" theme="primary" @click="sendFile">发送</t-button>
      <t-button size="small" variant="text" @click="uploadFile = null; uploadPreview = ''; uploadIsVideo = false">取消</t-button>
    </div>

    <!-- Emoji panel -->
    <Transition name="slide-up">
      <div v-if="showEmoji && !showSheet" class="emoji-panel">
        <span v-for="e in emojis" :key="e" class="emoji-item" @click="insertEmoji(e)">{{ e }}</span>
      </div>
    </Transition>

    <!-- Action sheet -->
    <ActionSheet :visible="showSheet" @close="showSheet = false" @select="onSheetSelect" />

    <!-- Input bar -->
    <div class="input-bar">
      <button class="ibar-btn" @click="isVoiceMode = !isVoiceMode">
        <span v-if="isVoiceMode" style="font-size:18px">🎤</span>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="1" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/>
        </svg>
      </button>

      <div v-if="isVoiceMode" class="voice-btn" @touchstart.prevent @mousedown.prevent>
        按住 说话
      </div>
      <div v-else class="input-wrap">
        <input
          v-model="input"
          class="text-input"
          placeholder="输入消息..."
          @keyup.enter="send"
        />
      </div>

      <button class="ibar-btn" @click="showEmoji = !showEmoji; showSheet = false">
        <span style="font-size:17px">😊</span>
      </button>

      <template v-if="input.trim()">
        <button class="send-btn" @click="send">发送</button>
      </template>
      <template v-else>
        <button class="ibar-btn" @click="showSheet = !showSheet; showEmoji = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </button>
      </template>

      <input id="imageFileInput" type="file" accept="image/*" hidden @change="onFileChange" />
      <input id="videoFileInput" type="file" accept="video/*" hidden @change="onFileChange" />
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex; flex-direction: column; height: 100%;
  background: var(--bg-primary);
}

/* ── Message list ── */
.chat-list {
  flex: 1; overflow-y: auto; padding: 8px 0;
  display: flex; flex-direction: column;
}

/* ── Image preview ── */
.image-preview-bar {
  display: flex; gap: 8px; align-items: center;
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.preview-media {
  width: 64px; height: 64px; border-radius: 6px; object-fit: cover;
}

/* ── Emoji panel ── */
.emoji-panel {
  display: flex; flex-wrap: wrap; gap: 2px;
  padding: 10px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-card);
  max-height: 200px; overflow-y: auto;
}
.emoji-item {
  font-size: 28px; cursor: pointer; padding: 6px 8px;
  border-radius: 6px; transition: background 0.1s;
}
.emoji-item:hover { background: var(--bg-tertiary); }

/* ── Slide-up transition ── */
.slide-up-enter-active,
.slide-up-leave-active { transition: all 0.25s ease; }
.slide-up-enter-from,
.slide-up-leave-to { opacity: 0; transform: translateY(20px); }

/* ── Input bar ── */
.input-bar {
  display: flex; gap: 4px; align-items: center;
  padding: 8px 10px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
}

.ibar-btn {
  width: 40px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; color: var(--text-secondary);
  cursor: pointer; border-radius: 50%; transition: background 0.15s;
}
.ibar-btn:hover { background: var(--bg-tertiary); }

.input-wrap {
  flex: 1; min-width: 0;
}
.text-input {
  width: 100%; height: 36px; padding: 0 12px;
  background: var(--bg-secondary); border: none; border-radius: 18px;
  color: var(--text-primary); font-size: 15px; outline: none;
}
.text-input::placeholder { color: var(--text-muted); }

.voice-btn {
  flex: 1; height: 36px; display: flex; align-items: center; justify-content: center;
  background: var(--bg-secondary); border-radius: 8px;
  color: var(--text-secondary); font-size: 14px; font-weight: 600;
  cursor: pointer; user-select: none;
}
.voice-btn:active { background: var(--bg-tertiary); }

.send-btn {
  height: 36px; padding: 0 18px; flex-shrink: 0;
  background: var(--success-color); border: none; border-radius: 6px;
  color: #000; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.send-btn:hover { opacity: 0.85; }
</style>
