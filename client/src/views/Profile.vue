<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { userApi } from '@/api/user';
import { MessagePlugin } from 'tdesign-vue-next';
import CameraIcon from 'tdesign-icons-vue-next/esm/components/camera';
import CallIcon from 'tdesign-icons-vue-next/esm/components/call';
import LocationIcon from 'tdesign-icons-vue-next/esm/components/location';
import LightingCircleIcon from 'tdesign-icons-vue-next/esm/components/lighting-circle';
import TaskIcon from 'tdesign-icons-vue-next/esm/components/task';
import CertificateIcon from 'tdesign-icons-vue-next/esm/components/certificate';
import Edit1Icon from 'tdesign-icons-vue-next/esm/components/edit-1';
import ShopIcon from 'tdesign-icons-vue-next/esm/components/shop';
import File1Icon from 'tdesign-icons-vue-next/esm/components/file-1';
import ChatIcon from 'tdesign-icons-vue-next/esm/components/chat';
import SettingIcon from 'tdesign-icons-vue-next/esm/components/setting';
import EditIcon from 'tdesign-icons-vue-next/esm/components/edit';
import StarFilledIcon from 'tdesign-icons-vue-next/esm/components/star-filled';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isMe = computed(() => !route.params.id || route.params.id === userStore.user?.id);

// Profile user — can be self or someone else
const profileUser = ref<any>(null);
const user = computed(() => (isMe.value ? userStore.user : profileUser.value));
const followCounts = ref({ following: 0, followers: 0 });
const amFollowing = ref(false);
const followLoading = ref(false);

async function loadProfile() {
  const uid = (route.params.id as string) || userStore.user?.id;
  if (!uid) return;
  try {
    const res = await userApi.get(uid);
    profileUser.value = res.data.data;
    // Check if current user is following this profile
    if (!isMe.value && userStore.user) {
      try {
        const r = await userApi.following(userStore.user.id);
        amFollowing.value = (r.data.data?.list || []).some((f: any) => f.id === uid);
      } catch { amFollowing.value = false; }
    }
    // Fetch follow counts
    fetchFollowCounts(uid);
  } catch {}
}

async function fetchFollowCounts(uid: string) {
  try {
    // Simple approach: use follower/following list lengths
    const [fing, fers] = await Promise.all([
      userApi.following(uid).catch(() => ({ data: { data: { total: 0 } } })),
      userApi.followers(uid).catch(() => ({ data: { data: { total: 0 } } })),
    ]);
    followCounts.value = {
      following: fing.data.data?.total || 0,
      followers: fers.data.data?.total || 0,
    };
  } catch {}
}

async function toggleFollow() {
  if (followLoading.value || !profileUser.value) return;
  followLoading.value = true;
  try {
    if (amFollowing.value) {
      await userApi.unfollow(profileUser.value.id);
      amFollowing.value = false;
      followCounts.value.followers--;
    } else {
      await userApi.follow(profileUser.value.id);
      amFollowing.value = true;
      followCounts.value.followers++;
    }
  } catch {
    // ignore
  } finally { followLoading.value = false; }
}

// Watch route params to reload when viewing another user
watch(() => route.params.id, () => { if (!isMe.value) loadProfile(); });
watch(userStore.user, () => { if (isMe.value) profileUser.value = userStore.user; }, { immediate: true });
onMounted(() => { if (!isMe.value || !profileUser.value) loadProfile(); if (isMe.value) profileUser.value = userStore.user; });

const INTRO_SS = 'ninewood_profile_cover_intro_done';
const introOverlay = ref(false);
const introShrink = ref(false);
const introLeaving = ref(false);
const introEntering = ref(false);

function startCoverIntroShrink() {
  if (!introOverlay.value || introShrink.value || introLeaving.value) return;
  introShrink.value = true;
}

function onIntroShellClick() {
  if (!introOverlay.value || introLeaving.value) return;
  if (!introShrink.value) startCoverIntroShrink();
  else hideIntroOverlay();
}

function hideIntroOverlay() {
  if (introKickTimer) {
    clearTimeout(introKickTimer);
    introKickTimer = null;
  }
  if (!introOverlay.value) return;
  if (!isMe.value && user.value) {
    sessionStorage.setItem(`profile_intro_${user.value.id}`, '1');
  }
  introLeaving.value = false;
  introShrink.value = false;
  introOverlay.value = false;
}

function onIntroCoverTransitionEnd(e: TransitionEvent) {
  if (!introShrink.value || introLeaving.value) return;
  if (e.propertyName !== 'height' && e.propertyName !== 'max-height') return;
  introLeaving.value = true;
  window.requestAnimationFrame(hideIntroOverlay);
}

const editing = ref(false);
const editForm = ref({ nickname: '', bio: '' });
const avatarFile = ref<File | null>(null);
const avatarPreview = ref('');
const coverFile = ref<File | null>(null);
const coverPreview = ref('');
const coverInputRef = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const certStatus = ref<any>(null);

function triggerCoverUpload() {
  if (isMe.value && !introOverlay.value) coverInputRef.value?.click();
}

const certLabel: Record<string, string> = { NONE: '未认证', BASIC: '初级认证', INTERMEDIATE: '中级认证', ADVANCED: '高级认证', MASTER: '顶级认证' };
const certColor: Record<string, string> = { NONE: '#6b7280', BASIC: '#3b82f6', INTERMEDIATE: '#8b5cf6', ADVANCED: '#f59e0b', MASTER: '#ef4444' };
const certGlow: Record<string, string> = { NONE: 'none', BASIC: '0 0 12px rgba(59,130,246,0.3)', INTERMEDIATE: '0 0 16px rgba(139,92,246,0.4)', ADVANCED: '0 0 20px rgba(245,158,11,0.5)', MASTER: '0 0 24px rgba(239,68,68,0.6)' };
const certBadgeIcon: Record<string, any> = { NONE: CertificateIcon, BASIC: CertificateIcon, INTERMEDIATE: CertificateIcon, ADVANCED: StarFilledIcon, MASTER: StarFilledIcon };

const orderTarget = computed(() => certStatus.value?.promotion?.needed || 50);
const snatchMax = 3;

const level = computed(() => user.value?.certificationLevel || 'NONE');

const coverLayerStyle = computed(() => {
  const u = user.value;
  const url = coverPreview.value || u?.coverUrl;
  if (!url) {
    return { background: `linear-gradient(180deg, ${certColor[level.value]}44, var(--bg-primary))` };
  }
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
  };
});

let introKickTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleIntroReveal() {
  if (!user.value) return;
  if (introKickTimer || introOverlay.value) return;
  // For other users: play only once per session
  if (!isMe.value && sessionStorage.getItem(`profile_intro_${user.value.id}`)) return;
  introOverlay.value = true;
  introEntering.value = true;
  setTimeout(() => { introEntering.value = false; }, 700);
  introKickTimer = setTimeout(async () => {
    introKickTimer = null;
    await nextTick();
    requestAnimationFrame(() => {
      startCoverIntroShrink();
      window.setTimeout(() => {
        if (introOverlay.value) hideIntroOverlay();
      }, 1300);
    });
  }, 5000);
}

onMounted(async () => {
  if (isMe.value) {
    try {
      const r = await userApi.certStatus();
      certStatus.value = r.data.data;
    } catch { /* noop */ }
  }
});

watch(
  [user, isMe],
  () => scheduleIntroReveal(),
  { immediate: true },
);

watch(introOverlay, (v) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = v ? 'hidden' : '';
});

onUnmounted(() => {
  if (introKickTimer) {
    clearTimeout(introKickTimer);
    introKickTimer = null;
  }
  document.body.style.overflow = '';
});

function startEdit() { editForm.value.nickname = user.value?.nickname || ''; editForm.value.bio = (user.value as any)?.bio || ''; editing.value = true; }
function onAvatarChange(e: Event) { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { avatarFile.value = f; avatarPreview.value = URL.createObjectURL(f); } }
async function onCoverChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  coverFile.value = f; coverPreview.value = URL.createObjectURL(f);
  // Auto-upload cover immediately
  try {
    const fd = new FormData(); fd.append('cover', f);
    await userApi.updateProfile(fd);
    await userStore.fetchUser();
    coverFile.value = null;
    MessagePlugin.success('封面已更新');
  } catch { MessagePlugin.error('封面更新失败'); }
}
async function saveProfile() {
  saving.value = true;
  try {
    const fd = new FormData(); fd.append('nickname', editForm.value.nickname); fd.append('bio', editForm.value.bio);
    if (avatarFile.value) fd.append('avatar', avatarFile.value);
    if (coverFile.value) fd.append('cover', coverFile.value);
    await userApi.updateProfile(fd); await userStore.fetchUser();
    MessagePlugin.success('已保存'); editing.value = false;
  } catch { MessagePlugin.error('保存失败'); }
  finally { saving.value = false; }
}

</script>

<template>
  <Teleport to="body">
    <Transition name="intro-root">
      <div
        v-if="introOverlay && user"
        class="cover-intro-shell"
        :class="{ 'intro-shrinking': introShrink }"
        @click="onIntroShellClick"
      >
        <div class="intro-fill" aria-hidden="true" />
        <div
          class="intro-cover"
          :class="{ shrinking: introShrink, 'intro-slide-in': introEntering && !introShrink }"
          :style="coverLayerStyle"
          @transitionend.self="onIntroCoverTransitionEnd"
        />
        <div class="intro-fab" aria-hidden="true">
          {{ user.nickname }}
          <span class="intro-fab-hint">轻触收起</span>
        </div>
      </div>
    </Transition>
  </Teleport>

  <div v-if="user" class="profile-page" :class="{ 'force-wide': !isMe }">
    <!-- Background glow -->
    <div class="bg-glow" :style="{ background: `radial-gradient(ellipse at 50% 0%, ${certColor[level]}14 0%, transparent 52%)` }" />

    <!-- Cover image -->
    <div class="cover-wrap" :class="{ clickable: isMe }" @click="triggerCoverUpload">
      <div
        class="cover-bg"
        :style="{
          backgroundImage: coverPreview
            ? `url(${coverPreview})`
            : user.coverUrl
              ? `url(${user.coverUrl})`
              : `linear-gradient(180deg, ${certColor[level]}22, var(--bg-primary))`
        }"
      />
      <div v-if="isMe" class="cover-hint">
        <CameraIcon size="14px" /> 更换背景
      </div>
      <input ref="coverInputRef" type="file" accept="image/*" hidden @change="onCoverChange" />
    </div>

    <!-- Hero Area -->
    <div class="hero-area">
      <div class="avatar-ring" :style="{ boxShadow: certGlow[level], borderColor: certColor[level] }">
        <div class="avatar-inner" @click="isMe ? (editing = true) : null">
          <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" />
          <img v-else-if="user.avatarUrl" :src="user.avatarUrl" class="avatar-img" />
          <span v-else class="avatar-text">{{ user.nickname?.charAt(0) }}</span>
          <div v-if="isMe && !editing" class="avatar-overlay">
            <CameraIcon size="24px" />
          </div>
        </div>
      </div>

      <!-- Cert badge -->
      <div class="cert-badge" :style="{ color: certColor[level], textShadow: certGlow[level] }">
        <component :is="certBadgeIcon[level]" class="cert-icon" />
        <span class="cert-label">{{ certLabel[level] }}</span>
      </div>

      <!-- Edit mode -->
      <div v-if="editing" class="edit-area animate-fadeIn">
        <input type="file" accept="image/*" hidden id="avatarInput" @change="onAvatarChange" />
        <label for="avatarInput" class="avatar-upload-btn">更换头像</label>
        <input v-model="editForm.nickname" class="edit-input" placeholder="昵称" />
        <textarea v-model="editForm.bio" class="edit-textarea" placeholder="写一段自我介绍..." rows="3" />
        <div class="edit-actions">
          <button class="save-btn" :disabled="saving" @click="saveProfile">{{ saving ? '保存中...' : '保 存' }}</button>
          <button class="cancel-btn" @click="editing = false">取消</button>
        </div>
      </div>

      <!-- Display mode -->
      <div v-else class="info-area">
        <h1 class="nickname">{{ user.nickname }}</h1>
        <p v-if="(user as any).bio" class="bio">"{{ (user as any).bio }}"</p>
        <p v-else-if="isMe" class="bio-placeholder" @click="startEdit">点击这里写下你的个性签名...</p>
        <div class="contact-row">
          <span class="contact-item"><CallIcon size="14px" /> {{ user.phone }}</span>
          <span v-if="user.cityCode" class="contact-item"><LocationIcon size="14px" /> {{ user.cityCode }}</span>
        </div>
        <!-- Social row (non-self) -->
        <div v-if="!isMe" class="social-row">
          <button class="follow-btn" :class="{ on: amFollowing }" :disabled="followLoading" @click="toggleFollow">
            {{ followLoading ? '...' : amFollowing ? '已关注' : '+ 关注' }}
          </button>
          <button class="msg-btn-sm" @click="router.push(`/messages/${user.id}`)">
            <ChatIcon size="15px" />
          </button>
        </div>
      </div>
    </div>

    <!-- Activity Stats -->
    <div class="stats-section">
      <div class="section-header">
        <LightingCircleIcon class="section-icon" />
        <span class="section-title">社交</span>
        <span class="section-line" />
      </div>
      <div class="stats-grid social-grid">
        <div class="stat-card">
          <div class="stat-num">{{ followCounts.following }}</div>
          <div class="stat-desc">关注</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ followCounts.followers }}</div>
          <div class="stat-desc">粉丝</div>
        </div>
      </div>
    </div>

    <!-- Service Stats -->
    <div class="stats-section">
      <div class="section-header">
        <LightingCircleIcon class="section-icon" />
        <span class="section-title">服务数据</span>
        <span class="section-line" />
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-num">{{ user.completedOrders || 0 }}</div>
          <div class="stat-desc">完成订单</div>
          <div class="stat-bar"><div class="stat-fill" :style="{ width: Math.min((user.completedOrders || 0) / orderTarget * 100, 100) + '%', background: certColor[level] }" /></div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ user.creditScore }}</div>
          <div class="stat-desc">信誉积分 <span class="stat-hint">反映可靠程度</span></div>
          <div class="stat-bar"><div class="stat-fill" :style="{ width: (user.creditScore ?? 0) + '%', background: '#10b981' }" /></div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ user.snatchCredits }}</div>
          <div class="stat-desc">本月抢单</div>
          <div class="stat-bar"><div class="stat-fill" :style="{ width: (user.snatchCredits || 0) / snatchMax * 100 + '%', background: '#ef4444' }" /></div>
        </div>
        <div class="stat-card" v-if="certStatus?.promotion">
          <div class="stat-num">{{ Math.round(certStatus.promotion.progress * 100) }}%</div>
          <div class="stat-desc">升级进度（{{ certLabel[certStatus.promotion.next] || '' }}）</div>
          <div class="stat-bar"><div class="stat-fill" :style="{ width: certStatus.promotion.progress * 100 + '%', background: certColor[certStatus.promotion.next] || certColor[level] }" /></div>
        </div>
      </div>
    </div>

    <!-- Menu -->
    <div v-if="isMe" class="menu-section">
      <div class="section-header">
        <TaskIcon class="section-icon" />
        <span class="section-title">功能</span>
        <span class="section-line" />
      </div>
      <div class="menu-grid">
        <button class="menu-card" @click="router.push('/cert-center')">
          <CertificateIcon class="menu-icon" />
          <span class="menu-label">认证中心</span>
        </button>
        <button class="menu-card" @click="router.push('/my-demands')">
          <Edit1Icon class="menu-icon" />
          <span class="menu-label">我的需求</span>
        </button>
        <button class="menu-card" @click="router.push('/orders?role=provider')">
          <ShopIcon class="menu-icon" />
          <span class="menu-label">我接的单</span>
        </button>
        <button class="menu-card" @click="router.push('/orders?role=requester')">
          <File1Icon class="menu-icon" />
          <span class="menu-label">我发的单</span>
        </button>
        <button class="menu-card" @click="router.push('/messages')">
          <ChatIcon class="menu-icon" />
          <span class="menu-label">消息</span>
        </button>
        <button class="menu-card" @click="router.push('/settings')">
          <SettingIcon class="menu-icon" />
          <span class="menu-label">设置</span>
        </button>
      </div>
      <button v-if="isMe" class="edit-profile-btn" @click="startEdit">
        <EditIcon size="15px" /> {{ editing ? '编辑中...' : '编辑资料' }}
      </button>
    </div>
  </div>

  <div v-else class="loading">加载中...</div>
</template>

<style scoped>
/* ── 封面入场：全屏 cover → 缩至与顶栏横幅同高（16:9、主内容宽度）── */
.cover-intro-shell {
  position: fixed;
  inset: 0;
  z-index: 2000;
  --sidebar-w: 72px;
  cursor: pointer;
  overflow: hidden;
}
@media (max-width: 768px) {
  .cover-intro-shell { --sidebar-w: 0px; inset: 0 0 env(safe-area-inset-bottom) 0; }
}
.intro-fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--bg-primary);
}
.intro-cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  z-index: 1;
  transform-origin: top center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  transition:
    left 0.82s cubic-bezier(0.32, 0.72, 0, 1),
    width 0.82s cubic-bezier(0.32, 0.72, 0, 1),
    height 0.82s cubic-bezier(0.32, 0.72, 0, 1),
    max-height 0.82s cubic-bezier(0.32, 0.72, 0, 1);
}
.intro-cover.intro-slide-in {
  animation: cover-slide-in 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
@keyframes cover-slide-in {
  from { transform: translateX(8%); opacity: 0.7; }
  to   { transform: translateX(0); opacity: 1; }
}
@media (max-width: 768px) {
  .intro-cover {
    left: 0;
    width: 100vw;
  }
}
.intro-cover.shrinking {
  left: var(--sidebar-w);
  width: calc(100vw - var(--sidebar-w));
  height: calc((100vw - var(--sidebar-w)) * 9 / 16);
  max-height: calc((100vw - var(--sidebar-w)) * 9 / 16);
}
@media (max-width: 768px) {
  .intro-cover.shrinking {
    left: 0;
    width: 100vw;
    height: calc(100vw * 9 / 16);
    max-height: calc(100vw * 9 / 16);
  }
}
.cover-intro-shell.intro-shrinking .intro-fab {
  left: calc(var(--sidebar-w) + 16px);
}
.intro-fab {
  position: absolute;
  z-index: 2;
  left: 16px;
  right: 16px;
  bottom: 60%;
  text-align: center;
  pointer-events: none;
  font-size: 26px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
  letter-spacing: 4px;
  transition: opacity 0.38s ease, transform 0.38s ease;
}
.intro-fab-hint {
  display: block;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.55);
}
.cover-intro-shell.intro-shrinking .intro-fab {
  opacity: 0;
  transform: translateY(12px);
}
.intro-root-enter-active,
.intro-root-leave-active {
  transition: opacity 0.22s ease;
}
.intro-root-enter-from,
.intro-root-leave-to {
  opacity: 0;
}

/* ── Base ── */
.profile-page {
  height: 100%; overflow-y: auto;
  background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 40%, var(--bg-primary) 100%);
  color: var(--text-primary); position: relative;
}
.profile-page::-webkit-scrollbar { width: 4px; }
.profile-page::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }

.bg-glow {
  position: fixed; top: 0; left: 0; right: 0; height: 320px; pointer-events: none; z-index: 0;
}

/* ── Cover ── */
.cover-wrap {
  position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
}
.cover-wrap.clickable {
  cursor: pointer;
}
.cover-wrap.clickable:hover .cover-hint {
  opacity: 1;
}
.cover-bg {
  width: 100%; height: 100%;
  background-size: cover; background-position: center;
  transition: filter 0.2s;
}
.cover-wrap.clickable:hover .cover-bg {
  filter: brightness(0.7);
}
.cover-hint {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  background: rgba(0,0,0,0.3); color: #fff;
  font-size: 13px; opacity: 0; transition: opacity 0.2s;
  pointer-events: none;
}

/* ── Hero（不透出顶层光晕的假「重影封面」）── */
.hero-area {
  position: relative; z-index: 1; display: flex; flex-direction: column;
  align-items: center; padding: 24px 24px 24px; margin-top: -40px;
  background: var(--bg-primary);
}
.avatar-ring {
  width: 100px; height: 100px; border-radius: 50%; border: 3px solid;
  padding: 3px; margin-bottom: 16px; transition: all 0.3s;
}
.avatar-inner {
  width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-card));
  display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text { font-size: 36px; font-weight: 900; color: var(--text-primary); }
.avatar-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s;
  color: #fff;
}
.avatar-inner:hover .avatar-overlay { opacity: 1; }

/* ── Cert Badge ── */
.cert-badge { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.cert-icon { font-size: 20px; }
.cert-label { font-size: 14px; font-weight: 800; letter-spacing: 2px; }

/* ── Stat hint ── */
.stat-hint { font-weight: 400; font-size: 10px; color: var(--text-muted); }

/* ── Info ── */
.info-area { text-align: center; }
.nickname { font-size: 24px; font-weight: 800; margin: 0 0 8px; color: var(--text-primary); }
.bio { font-size: 13px; color: var(--text-secondary); font-style: italic; margin: 0 0 10px; }
.bio-placeholder { font-size: 13px; color: var(--text-muted); margin: 0 0 10px; cursor: pointer; }
.contact-row { display: flex; gap: 16px; justify-content: center; font-size: 12px; color: var(--text-secondary); }
.contact-item { display: inline-flex; align-items: center; gap: 4px; }
.msg-btn {
  margin-top: 12px; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 10px; border: none;
  background: var(--primary-gradient); color: #fff;
  font-size: 14px; font-weight: 600; cursor: pointer;
  font-family: var(--font-family); transition: opacity 0.2s;
}
.msg-btn:hover { opacity: 0.9; }

/* ── Social Row ── */
.social-row {
  display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 14px;
}
.follow-btn {
  padding: 8px 28px; border-radius: 10px; border: none;
  background: #fe2c55; color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer;
  font-family: var(--font-family); transition: all 0.2s;
}
.follow-btn:hover { opacity: 0.85; }
.follow-btn.on {
  background: var(--bg-tertiary); color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.follow-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.msg-btn-sm {
  width: 40px; height: 40px; border-radius: 10px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.msg-btn-sm:hover { border-color: var(--accent-color); color: var(--accent-color); }

.social-grid {
  max-width: 360px; margin: 0 auto;
}

/* ── Edit ── */
.edit-area {
  width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 10px; margin-top: 8px;
}
.avatar-upload-btn {
  text-align: center; padding: 8px; border-radius: var(--radius-sm); border: 1px dashed var(--border-color);
  color: var(--accent-color); font-size: 13px; cursor: pointer;
}
.edit-input, .edit-textarea {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm);
  padding: 10px 14px; color: var(--text-primary); font-size: 14px; outline: none; width: 100%; box-sizing: border-box;
  font-family: inherit;
}
.edit-input:focus, .edit-textarea:focus { border-color: var(--accent-color); }
.edit-textarea { resize: vertical; }
.edit-actions { display: flex; gap: 8px; }
.save-btn {
  flex: 1; padding: 10px; border-radius: var(--radius-sm); border: none;
  background: var(--primary-gradient); color: #fff;
  font-weight: 700; font-size: 14px; cursor: pointer;
}
.cancel-btn {
  flex: 1; padding: 10px; border-radius: var(--radius-sm);
  background: var(--bg-card); border: 1px solid var(--border-color);
  color: var(--text-secondary); font-size: 14px; cursor: pointer;
}

/* ── Stats ── */
.stats-section, .menu-section { position: relative; z-index: 1; padding: 0 20px 20px; }
.section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.section-icon { font-size: 16px; color: var(--text-secondary); flex-shrink: 0; }
.section-title { font-size: 14px; font-weight: 700; color: var(--text-secondary); letter-spacing: 2px; flex-shrink: 0; }
.section-line { flex: 1; height: 1px; background: linear-gradient(90deg, var(--border-color), transparent); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 14px;
}
.stat-num { font-size: 28px; font-weight: 900; color: var(--text-primary); line-height: 1; }
.stat-desc { font-size: 11px; color: var(--text-secondary); margin: 6px 0 10px; }
.stat-bar { height: 3px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; }
.stat-fill { height: 100%; border-radius: 2px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

/* ── Menu ── */
.menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.menu-card {
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); cursor: pointer; transition: all 0.2s;
}
.menu-card:hover { border-color: var(--accent-color); background: var(--bg-tertiary); transform: translateY(-1px); }
.menu-icon { font-size: 22px; color: var(--accent-color); }
.menu-label { font-size: 12px; color: var(--text-secondary); }
.edit-profile-btn {
  width: 100%; padding: 12px; border-radius: var(--radius);
  background: var(--bg-card); border: 1px solid var(--border-color); color: var(--accent-color);
  font-size: 14px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.edit-profile-btn:hover { background: var(--bg-tertiary); }

.loading { text-align: center; padding: 60px; color: var(--text-muted); }
</style>
