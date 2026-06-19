<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { userApi } from '@/api/user';
import { MessagePlugin } from 'tdesign-vue-next';
import CameraIcon from 'tdesign-icons-vue-next/esm/components/camera';
import CallIcon from 'tdesign-icons-vue-next/esm/components/call';
import LocationIcon from 'tdesign-icons-vue-next/esm/components/location';
import CertificateIcon from 'tdesign-icons-vue-next/esm/components/certificate';
import ChatIcon from 'tdesign-icons-vue-next/esm/components/chat';
import { certLabel, certColor, certGlow } from '@/constants/cert';
import ProfileInfoSection from '@/components/ProfileInfoSection.vue';
import FollowList from '@/components/FollowList.vue';
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
      } catch { /* best-effort, follow state non-critical */ }
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
  } catch { /* best-effort */ }
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
watch(() => userStore.user, () => { if (isMe.value) profileUser.value = userStore.user; }, { immediate: true });
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
const showFollowList = ref(false);
const followMode = ref<'followers' | 'following'>('followers');
function openFollowList(mode: 'followers' | 'following') {
  followMode.value = mode;
  showFollowList.value = true;
}

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
  }, 1000);
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

  <div v-if="user" class="profile-page thin-scroll" :class="{ 'force-wide': !isMe }">
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
    <div class="hero-area animate-fadeUp" style="animation-delay:100ms">
      <div class="avatar-ring" :style="{ boxShadow: certGlow[level], borderColor: certColor[level] }">
        <div class="avatar-inner" @click="isMe ? (editing = true) : null">
          <img v-if="avatarPreview" :src="avatarPreview" class="avatar-img" loading="lazy" decoding="async" />
          <img v-else-if="user.avatarUrl" :src="user.avatarUrl" class="avatar-img" loading="lazy" decoding="async" />
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

    <ProfileInfoSection
      :user="user"
      :is-me="isMe"
      :follow-counts="followCounts"
      :cert-status="certStatus"
      :order-target="orderTarget"
      :snatch-max="snatchMax"
      @start-edit="startEdit"
      @show-follow="openFollowList"
    />

    <FollowList
      :visible="showFollowList"
      :user-id="user?.id || userStore.user?.id"
      :mode="followMode"
      @close="showFollowList = false"
    />
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
  padding: 3px; margin-bottom: 16px;
  transition: box-shadow 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.avatar-ring:hover {
  transform: scale(1.05) rotate(-3deg);
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

/* ── Info ── */
.info-area { text-align: center; }
.nickname { font-size: 28px; font-weight: 900; margin: 0 0 8px; color: var(--text-primary); letter-spacing: -0.5px; }
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
  background: var(--brand-red); color: #fff;
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

.loading { text-align: center; padding: 60px; color: var(--text-muted); }
</style>
