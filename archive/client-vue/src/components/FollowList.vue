<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { userApi } from '@/api/user';
import { useUserStore } from '@/stores/user';
import { certLabel, certColor } from '@/constants/cert';
import LoadingState from '@/components/LoadingState.vue';
import CloseIcon from 'tdesign-icons-vue-next/esm/components/close';

const props = defineProps<{
  visible: boolean;
  userId: string;
  mode: 'followers' | 'following';
}>();
const emit = defineEmits<{ close: [] }>();

const router = useRouter();
const userStore = useUserStore();

const users = ref<any[]>([]);
const loading = ref(false);
const page = ref(1);
const hasMore = ref(true);
const followLoading = ref<Set<string>>(new Set());

const title = computed(() => props.mode === 'followers' ? '粉丝' : '关注');

async function fetchUsers(reset = false) {
  if (reset) { page.value = 1; users.value = []; hasMore.value = true; }
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    const fn = props.mode === 'followers' ? userApi.followers : userApi.following;
    const res = await fn(props.userId, page.value);
    const data = res.data.data;
    const list = data.list || data.users || [];
    users.value.push(...list);
    hasMore.value = list.length >= 20;
    page.value++;
  } catch { /* noop */ } finally { loading.value = false; }
}

async function toggleFollow(user: any) {
  const uid = user.id || user.followerId || user.followingId;
  if (!uid || followLoading.value.has(uid)) return;
  const s = new Set(followLoading.value); s.add(uid); followLoading.value = s;
  try {
    if (user.isFollowing) {
      await userApi.unfollow(uid);
      user.isFollowing = false;
    } else {
      await userApi.follow(uid);
      user.isFollowing = true;
    }
  } catch { /* noop */ } finally {
    const s2 = new Set(followLoading.value); s2.delete(uid); followLoading.value = s2;
  }
}

function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) fetchUsers();
}

function goProfile(uid: string) {
  emit('close');
  router.push(`/profile/${uid}`);
}

const me = computed(() => userStore.user?.id);
const isMe = (uid: string) => uid === me.value;

watch(() => props.visible, (v) => {
  if (v) fetchUsers(true);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="follow-panel">
      <div v-if="visible" class="follow-overlay" @click.self="emit('close')">
        <div class="follow-sheet">
          <div class="follow-header">
            <h2 class="follow-title">{{ title }} <span class="follow-count">{{ users.length }}</span></h2>
            <button class="follow-close" @click="emit('close')"><CloseIcon size="20px" /></button>
          </div>

          <div class="follow-list" @scroll="onScroll">
            <div v-for="u in users" :key="u.id || u.followerId || u.followingId" class="follow-item" @click="goProfile(u.id || u.followerId || u.followingId)">
              <div class="fi-avatar" :style="{ background: certColor[u.certificationLevel || 'NONE'] }">
                <img v-if="u.avatarUrl" :src="u.avatarUrl" class="fi-avatar-img" loading="lazy" decoding="async" />
                <span v-else>{{ (u.nickname || u.name || '?').charAt(0) }}</span>
              </div>
              <div class="fi-info">
                <div class="fi-name-row">
                  <span class="fi-name">{{ u.nickname || u.name }}</span>
                  <span v-if="u.certificationLevel && u.certificationLevel !== 'NONE'" class="fi-cert" :style="{ color: certColor[u.certificationLevel] }">
                    {{ certLabel[u.certificationLevel] }}
                  </span>
                </div>
                <span v-if="u.bio" class="fi-bio">{{ u.bio.slice(0, 30) }}{{ u.bio.length > 30 ? '...' : '' }}</span>
              </div>
              <button
                v-if="!isMe(u.id || u.followerId || u.followingId)"
                class="fi-follow-btn"
                :class="{ on: u.isFollowing }"
                :disabled="followLoading.has(u.id || u.followerId || u.followingId)"
                @click.stop="toggleFollow(u)"
              >
                {{ followLoading.has(u.id || u.followerId || u.followingId) ? '...' : u.isFollowing ? '已关注' : '关注' }}
              </button>
            </div>
            <LoadingState v-if="loading" text="加载中..." />
            <div v-if="!hasMore && users.length > 0" class="follow-end">— 没有更多了 —</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.follow-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: flex-end; justify-content: center;
}
.follow-sheet {
  width: 100%; max-width: 480px; max-height: 80vh;
  background: var(--bg-secondary); border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column; overflow: hidden;
}
.follow-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 20px 12px; flex-shrink: 0;
}
.follow-title { font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; }
.follow-count { font-size: 14px; color: var(--text-muted); font-weight: 500; margin-left: 6px; }
.follow-close { background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px; }
.follow-list { flex: 1; overflow-y: auto; padding: 0 16px 24px; }
.follow-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
  cursor: pointer; transition: background 0.12s;
}
.follow-item + .follow-item { border-top: 1px solid var(--border-color); }
.fi-avatar {
  width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff; overflow: hidden;
}
.fi-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.fi-info { flex: 1; min-width: 0; }
.fi-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.fi-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.fi-cert { font-size: 10px; font-weight: 700; white-space: nowrap; }
.fi-bio { font-size: 12px; color: var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fi-follow-btn {
  flex-shrink: 0; padding: 6px 16px; border-radius: 6px; border: none;
  background: #fe2c55; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: var(--font-family); transition: all 0.15s;
}
.fi-follow-btn.on { background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-color); }
.fi-follow-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.follow-end { text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px; }

/* ── Transition ── */
.follow-panel-enter-active, .follow-panel-leave-active { transition: opacity 0.25s ease; }
.follow-panel-enter-from, .follow-panel-leave-to { opacity: 0; }
.follow-panel-enter-active .follow-sheet, .follow-panel-leave-active .follow-sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.follow-panel-enter-from .follow-sheet, .follow-panel-leave-to .follow-sheet { transform: translateY(100%); }
</style>
