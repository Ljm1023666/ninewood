<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import api from '@/api/index';
import { userApi } from '@/api/user';
import { useUserStore } from '@/stores/user';
import { certLabel, certColor } from '@/constants/cert';
import { formatRelativeTime, formatDuration } from '@/utils/time';
import HeartIcon from 'tdesign-icons-vue-next/esm/components/heart';
import HeartFilledIcon from 'tdesign-icons-vue-next/esm/components/heart-filled';
import BrowseIcon from 'tdesign-icons-vue-next/esm/components/browse';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';
import PullRefresh from '@/components/PullRefresh.vue';

const router = useRouter();
const userStore = useUserStore();

interface Short {
  id: string;
  mediaUrl: string;
  coverUrl?: string;
  description?: string;
  tags: string[];
  likeCount: number;
  viewCount: number;
  userId: string;
  user: { id: string; nickname: string; avatarUrl?: string };
  createdAt: string;
}

const shorts = ref<Short[]>([]);
const currentIdx = ref(0);
const playing = ref(true);
const muted = ref(true);
const progressMap = ref<Record<number, number>>({});
const durationMap = ref<Record<number, number>>({});
const lastTap = ref<Record<number, number>>({});
const hearts = ref<{ id: number; idx: number }[]>([]);
const showDetail = ref(false);
const selectedShort = ref<Short | null>(null);
const loading = ref(false);
const error = ref('');
const pr = ref<InstanceType<typeof PullRefresh> | null>(null);
const likedIds = ref<Set<string>>(new Set());
const followedIds = ref<Set<string>>(new Set());
const followLoading = ref<Set<string>>(new Set());
const videoRefs = ref<Map<number, HTMLVideoElement>>(new Map());
const mediaUseContain = ref<Record<number, boolean>>({});
const activeTab = ref('all');

const tabs = [
  { key: 'all', label: '推荐' },
  { key: 'follow', label: '关注' },
  { key: 'nearby', label: '附近' },
];

let observer: IntersectionObserver | null = null;
let resizeCleanup: (() => void) | null = null;

function isVideo(url: string) { return /\.(mp4|mov|webm|mkv)$/i.test(url); }
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp)$/i.test(url); }


async function fetchShorts() {
  loading.value = true; error.value = '';
  try {
    const params: any = { limit: 20 };
    if (activeTab.value === 'follow') params.tab = 'follow';
    if (activeTab.value === 'nearby') params.tab = 'nearby';
    const res = await api.get('/shorts', { params });
    shorts.value = res.data.data.videos;
    mediaUseContain.value = {};
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载失败';
  } finally { loading.value = false; pr.value?.done(); }
}

// Re-fetch when tab changes
function switchTab(tab: string) {
  activeTab.value = tab;
  fetchShorts();
}

function setVideoRef(idx: number, el: HTMLVideoElement | null) {
  if (el) videoRefs.value.set(idx, el);
  else videoRefs.value.delete(idx);
  if (el?.videoWidth && el.videoHeight) scheduleRecalcFit(idx);
}

function attachResizeWatcher() {
  resizeCleanup?.();
  let t: ReturnType<typeof setTimeout> | null = null;
  const debounced = () => { if (t) clearTimeout(t); t = setTimeout(() => { recalcAllMediaFit(); t = null; }, 120); };
  window.addEventListener('resize', debounced);
  resizeCleanup = () => { window.removeEventListener('resize', debounced); if (t) clearTimeout(t); resizeCleanup = null; };
}

function setContainFlag(idx: number, useContain: boolean) { mediaUseContain.value = { ...mediaUseContain.value, [idx]: useContain }; }

function applyFitFromDims(idx: number, card: HTMLElement, mw: number, mh: number) {
  if (!mw || !mh) return;
  const cw = card.clientWidth; const ch = card.clientHeight;
  if (cw < 2 || ch < 2) return;
  setContainFlag(idx, (cw / ch) > (mw / mh));
}

function recalcFitForIndex(idx: number) {
  const card = document.querySelector(`.case-card[data-index="${idx}"]`) as HTMLElement | null;
  if (!card) return;
  const video = card.querySelector(':scope > video') as HTMLVideoElement | null;
  const img = card.querySelector(':scope > img') as HTMLImageElement | null;
  if (video?.videoWidth && video.videoHeight) applyFitFromDims(idx, card, video.videoWidth, video.videoHeight);
  else if (img?.naturalWidth && img.naturalHeight) applyFitFromDims(idx, card, img.naturalWidth, img.naturalHeight);
}

function scheduleRecalcFit(idx: number) { requestAnimationFrame(() => { requestAnimationFrame(() => { recalcFitForIndex(idx); }); }); }
function recalcAllMediaFit() { document.querySelectorAll('.case-card[data-index]').forEach((card) => { const idx = Number((card as HTMLElement).dataset.index); if (Number.isFinite(idx)) recalcFitForIndex(idx); }); }
function onVideoLoadedMeta(_e: Event, idx: number) { scheduleRecalcFit(idx); }
function onMainImageLoad(_e: Event, idx: number) { scheduleRecalcFit(idx); }

function setupObserver() {
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const idx = Number((entry.target as HTMLElement).dataset.index);
      const video = videoRefs.value.get(idx);
      if (!video) continue;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        if (currentIdx.value !== idx) {
          currentIdx.value = idx;
          video.currentTime = 0;
          if (playing.value) video.play().catch(() => {});
        }
      } else {
        if (currentIdx.value === idx) video.pause();
      }
    }
  }, { threshold: [0.3, 0.5, 0.7, 0.9] });
  nextTick(() => { setTimeout(() => { document.querySelectorAll('.case-card').forEach(el => observer?.observe(el)); recalcAllMediaFit(); }, 300); });
}

// ── Interactions ──
function togglePlay() {
  playing.value = !playing.value;
  const video = videoRefs.value.get(currentIdx.value);
  if (!video) return;
  if (playing.value) video.play().catch(() => {}); else video.pause();
}

function toggleMute() {
  muted.value = !muted.value;
  videoRefs.value.forEach(v => { v.muted = muted.value; });
}

function onVideoTimeUpdate(e: Event, idx: number) {
  const v = e.target as HTMLVideoElement;
  if (v.duration) {
    progressMap.value = { ...progressMap.value, [idx]: (v.currentTime / v.duration) * 100 };
    durationMap.value = { ...durationMap.value, [idx]: v.duration };
  }
}

let tapTimers: Record<number, ReturnType<typeof setTimeout>> = {};

function handleVideoTap(idx: number, s: Short) {
  const now = Date.now();
  const prev = lastTap.value[idx] || 0;
  lastTap.value = { ...lastTap.value, [idx]: now };

  if (now - prev < 250) {
    // Double tap → like (first tap already toggled play, just add like)
    clearTimeout(tapTimers[idx]);
    delete tapTimers[idx];
    toggleLike(s.id);
    const hid = Date.now();
    hearts.value = [...hearts.value, { id: hid, idx }];
    setTimeout(() => { hearts.value = hearts.value.filter(h => h.id !== hid); }, 900);
  } else {
    // Single tap → toggle play/pause immediately
    togglePlay();
    tapTimers[idx] = setTimeout(() => {
      delete tapTimers[idx];
    }, 250);
  }
}

function toggleLike(id: string) {
  const next = new Set(likedIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  likedIds.value = next;
}

async function toggleFollow(id: string) {
  if (followLoading.value.has(id)) return;
  const loading = new Set(followLoading.value); loading.add(id); followLoading.value = loading;
  try {
    if (followedIds.value.has(id)) {
      await userApi.unfollow(id);
      const next = new Set(followedIds.value); next.delete(id); followedIds.value = next;
    } else {
      await userApi.follow(id);
      const next = new Set(followedIds.value); next.add(id); followedIds.value = next;
    }
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message || '操作失败'); } finally {
    const loading2 = new Set(followLoading.value); loading2.delete(id); followLoading.value = loading2;
  }
}

function openDetail(s: Short) { selectedShort.value = s; showDetail.value = true; }

onMounted(async () => { await fetchShorts(); setupObserver(); attachResizeWatcher(); });
onUnmounted(() => { observer?.disconnect(); resizeCleanup?.(); });
</script>

<template>
  <PullRefresh ref="pr" snap class="shorts-page full-width" @refresh="fetchShorts">
    <ErrorState v-if="error" :message="error" @retry="fetchShorts" />
    <LoadingState v-else-if="loading" />

    <div v-else class="feed">
      <!-- Tabs -->
      <div class="feed-tabs">
        <button v-for="t in tabs" :key="t.key" class="feed-tab" :class="{ on: activeTab === t.key }" @click="switchTab(t.key)">{{ t.label }}</button>
      </div>

      <EmptyState v-if="shorts.length === 0" type="video" message="暂无内容" action-label="回首页" @action="router.push('/')" />

      <div v-for="(s, idx) in shorts" :key="s.id" class="case-card" :class="{ 'media-fit-contain': mediaUseContain[idx] }" :data-index="idx" @click="handleVideoTap(idx, s)">
        <video v-if="isVideo(s.mediaUrl)" :ref="(el: any) => setVideoRef(idx, el as HTMLVideoElement)" :src="s.mediaUrl" :poster="s.coverUrl" preload="metadata" :muted="muted" loop playsinline @loadedmetadata="onVideoLoadedMeta($event, idx)" @timeupdate="onVideoTimeUpdate($event, idx)" />
        <img v-else-if="isImage(s.mediaUrl)" :src="s.mediaUrl" loading="lazy" decoding="async" @load="onMainImageLoad($event, idx)" />
        <div v-else class="no-media"><span class="no-media-icon">🎬</span></div>

        <!-- Double-tap heart -->
        <div v-for="h in hearts.filter(h => h.idx === idx)" :key="h.id" class="tap-heart">❤️</div>

        <!-- Pause overlay -->
        <div v-if="!playing && isVideo(s.mediaUrl)" class="pause-icon">▶</div>

        <!-- Volume mute -->
        <button v-if="isVideo(s.mediaUrl)" class="mute-btn" @click.stop="toggleMute">{{ muted ? '🔇' : '🔊' }}</button>

        <!-- Overlay -->
        <div class="overlay">
          <div v-if="s.tags?.length" class="overlay-top">
            <span v-for="tag in s.tags" :key="tag" class="tag-chip">{{ tag }}</span>
          </div>

          <!-- Right action bar -->
          <div class="action-bar">
            <!-- Avatar -->
            <button class="act-btn" @click.stop="router.push('/profile/' + s.userId)">
              <div class="act-avatar" :style="{ background: certColor[(s.user as any)?.certificationLevel || 'NONE'] }">
                <img v-if="s.user?.avatarUrl" :src="s.user.avatarUrl" class="act-avatar-img" loading="lazy" decoding="async" />
                <span v-else>{{ s.user?.nickname?.charAt(0) }}</span>
              </div>
            </button>
            <!-- Follow -->
            <button class="act-btn" :class="{ on: followedIds.has(s.userId) }" :disabled="followLoading.has(s.userId)" @click.stop="toggleFollow(s.userId)">
              <span class="act-plus">{{ followedIds.has(s.userId) ? '✓' : '+' }}</span>
              <span class="act-label">{{ followedIds.has(s.userId) ? '已关注' : '关注' }}</span>
            </button>
            <!-- Like -->
            <button class="act-btn" :class="{ liked: likedIds.has(s.id) }" @click.stop="toggleLike(s.id)">
              <component :is="likedIds.has(s.id) ? HeartFilledIcon : HeartIcon" class="act-icon" />
              <span class="act-label">{{ s.likeCount || '' }}</span>
            </button>
            <!-- Detail -->
            <button class="act-btn" @click.stop="openDetail(s)">
              <BrowseIcon class="act-icon" />
              <span class="act-label">详情</span>
            </button>
          </div>

          <!-- Bottom info -->
          <div class="video-info" @click.stop="openDetail(s)">
            <div class="info-author">
              <span class="author-name">@{{ s.user?.nickname }}</span>
              <span v-if="(s.user as any)?.certificationLevel && (s.user as any).certificationLevel !== 'NONE'" class="author-cert" :style="{ color: certColor[(s.user as any).certificationLevel] }">{{ certLabel[(s.user as any)?.certificationLevel] || '' }}</span>
            </div>
            <p v-if="s.description" class="info-desc">{{ s.description }}</p>
            <div class="info-meta"><span>{{ formatRelativeTime(s.createdAt) }}</span></div>
          </div>

          <!-- CTA button -->
          <button class="cta-btn" @click.stop="router.push('/messages/' + s.userId)">联系TA</button>
        </div>
        <!-- Progress bar -->
        <div v-if="isVideo(s.mediaUrl)" class="progress-bar"><div class="progress-fill" :style="{ width: (progressMap[idx] || 0) + '%' }" /></div>
      </div>

      <div v-if="shorts.length > 1" class="counter">{{ currentIdx + 1 }} / {{ shorts.length }}</div>
    </div>

    <!-- Detail panel -->
    <Transition name="panel">
      <div v-if="showDetail && selectedShort" class="panel-overlay" @click="showDetail = false">
        <div class="panel-sheet" @click.stop>
          <div class="panel-handle" />
          <div class="panel-body">
            <!-- Author card -->
            <div class="panel-author" @click="showDetail = false; router.push('/profile/' + selectedShort.userId)">
              <div class="pa-avatar" :style="{ background: certColor[(selectedShort.user as any)?.certificationLevel || 'NONE'] }">
                <img v-if="selectedShort.user?.avatarUrl" :src="selectedShort.user.avatarUrl" class="pa-avatar-img" loading="lazy" decoding="async" />
                <span v-else>{{ selectedShort.user?.nickname?.charAt(0) }}</span>
              </div>
              <div class="pa-info">
                <span class="pa-name">{{ selectedShort.user?.nickname }}</span>
                <span v-if="(selectedShort.user as any)?.certificationLevel && (selectedShort.user as any).certificationLevel !== 'NONE'" class="pa-cert" :style="{ color: certColor[(selectedShort.user as any).certificationLevel] }">{{ certLabel[(selectedShort.user as any)?.certificationLevel] || '' }}</span>
              </div>
            </div>

            <p v-if="selectedShort.description" class="panel-desc">{{ selectedShort.description }}</p>
            <div v-if="selectedShort.tags?.length" class="panel-tags">
              <span v-for="tag in selectedShort.tags" :key="tag" class="tag-chip-panel" @click="showDetail = false">{{ tag }}</span>
            </div>
            <div class="panel-grid">
              <div class="panel-grid-row"><span>发布时间</span><span>{{ formatRelativeTime(selectedShort.createdAt) }}</span></div>
              <div class="panel-grid-row"><span>播放</span><span>{{ selectedShort.viewCount }} 次</span></div>
              <div class="panel-grid-row"><span>喜欢</span><span>{{ selectedShort.likeCount }}</span></div>
            </div>
            <div class="panel-actions">
              <button class="pa-follow-btn" :class="{ on: followedIds.has(selectedShort.userId) }" @click="toggleFollow(selectedShort.userId)">{{ followedIds.has(selectedShort.userId) ? '✓ 已关注' : '+ 关注' }}</button>
              <button class="pa-msg-btn" @click="showDetail = false; router.push('/messages/' + selectedShort.userId)">发消息</button>
              <button class="pa-close-btn" @click="showDetail = false">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </PullRefresh>
</template>

<style scoped>
/* ── Page ── */
.shorts-page { height: 100%; background: #000; }
.feed { display: flex; flex-direction: column; align-items: stretch; width: 100%; min-height: 100%; }

/* ── Tabs ── */
.feed-tabs { display: flex; gap: 0; padding: 8px 12px; position: fixed; top: 0; z-index: 50; }
.feed-tab { padding: 8px 16px; border: none; background: none; color: rgba(255,255,255,0.5); font-size: 14px; font-weight: 600; cursor: pointer; transition: color 0.2s; }
.feed-tab.on { color: #fff; font-weight: 700; }

/* ── Card ── */
.case-card { position: relative; width: 100%; height: 100vh; height: 100dvh; flex-shrink: 0; scroll-snap-align: start; background: #0a0a0a; overflow: hidden; cursor: pointer; }
.case-card video, .case-card > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; }
.case-card.media-fit-contain video, .case-card.media-fit-contain > img { object-fit: contain; object-position: center center; }
.case-card > .no-media { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #141414, #0a0a0a); }
.no-media-icon { font-size: 40px; opacity: 0.3; }
.pause-icon { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; font-size: 60px; color: rgba(255,255,255,0.6); pointer-events: none; }

/* ── Mute button ── */
.mute-btn { position: absolute; top: 80px; right: 14px; z-index: 3; background: none; border: none; font-size: 20px; cursor: pointer; padding: 6px; opacity: 0.6; pointer-events: auto; }
.mute-btn:hover { opacity: 1; }

/* ── Progress bar ── */
.progress-bar { position: absolute; bottom: 0; left: 0; right: 0; z-index: 5; height: 3px; background: rgba(255,255,255,0.25); pointer-events: none; }
.progress-fill { height: 100%; background: #fff; box-shadow: 0 0 4px rgba(255,255,255,0.4); transition: width 0.2s linear; }

/* ── Double-tap heart ── */
.tap-heart { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; font-size: 80px; pointer-events: none; animation: heart-pop 0.9s ease-out forwards; }
@keyframes heart-pop { 0% { opacity: 1; transform: scale(0.5); } 40% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0; transform: scale(1.4); } }

/* ── Overlay ── */
.overlay { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 40%, transparent 58%, rgba(0,0,0,0.08) 82%, rgba(0,0,0,0.22) 100%); display: flex; flex-direction: column; justify-content: space-between; }
.overlay-top { padding: 50px 14px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tag-chip { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.85); letter-spacing: 1px; }

/* ── Action bar ── */
.action-bar { position: absolute; right: 12px; bottom: 22%; display: flex; flex-direction: column; gap: 18px; align-items: center; }
.act-btn { pointer-events: auto; border: none; background: none; color: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0; transition: transform 0.12s ease; }
.act-btn:active { transform: scale(0.88); }
.act-btn.liked { color: var(--brand-red); }
.act-btn.on { color: var(--warning-color); }
.act-btn:disabled { opacity: 0.5; }
.act-icon { font-size: 30px; }
.act-label { font-size: 11px; font-weight: 600; }
.act-plus { width: 28px; height: 28px; border-radius: 50%; background: var(--brand-red); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; }
.act-btn.on .act-plus { background: rgba(255,255,255,0.15); }
.act-avatar { width: 44px; height: 44px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; font-size: 18px; font-weight: 700; }
.act-avatar-img { width: 100%; height: 100%; object-fit: cover; }

/* ── Video info ── */
.video-info { padding: 0 14px 80px; pointer-events: auto; cursor: pointer; }
.info-author { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.author-name { font-size: 15px; font-weight: 700; color: #fff; }
.author-cert { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; background: rgba(255,255,255,0.1); }
.info-desc { margin: 0 0 6px; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.info-meta { display: flex; font-size: 11px; color: rgba(255,255,255,0.4); }

/* ── CTA ── */
.cta-btn { pointer-events: auto; position: absolute; bottom: 20px; left: 14px; padding: 8px 20px; border-radius: 24px; border: none; background: linear-gradient(135deg, var(--brand-red), var(--brand-red-light)); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; letter-spacing: 1px; box-shadow: 0 4px 16px rgba(254,44,85,0.3); }

/* ── Counter ── */
.counter { width: 100%; padding: 28px; color: rgba(255,255,255,0.15); font-size: 13px; text-align: center; }

/* ── Detail Panel ── */
.panel-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; }
.panel-sheet { width: 100%; max-height: 75vh; overflow-y: auto; background: var(--bg-secondary); border-radius: 20px 20px 0 0; padding: 12px 20px 28px; }
.panel-handle { width: 36px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.2); margin: 0 auto 16px; }
.panel-body { color: #e0e0e0; }
.panel-author { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; cursor: pointer; }
.pa-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; }
.pa-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.pa-info { display: flex; flex-direction: column; gap: 2px; }
.pa-name { font-size: 16px; font-weight: 700; color: #fff; }
.pa-cert { font-size: 12px; }
.panel-desc { font-size: 14px; color: rgba(255,255,255,0.75); line-height: 1.7; margin: 0 0 14px; }
.panel-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.tag-chip-panel { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; background: rgba(102,126,234,0.2); color: rgba(255,255,255,0.85); cursor: pointer; }
.panel-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.panel-grid-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.panel-grid-row span:first-child { color: rgba(255,255,255,0.45); }
.panel-grid-row span:last-child { font-weight: 600; color: rgba(255,255,255,0.85); }
.panel-actions { display: flex; gap: 8px; }
.pa-follow-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; background: var(--brand-red); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.pa-follow-btn.on { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
.pa-msg-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; background: var(--primary-gradient); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
.pa-close-btn { padding: 12px 16px; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; background: none; color: rgba(255,255,255,0.5); font-size: 14px; cursor: pointer; }

/* ── Panel transition ── */
.panel-enter-active, .panel-leave-active { transition: opacity 0.25s ease; }
.panel-enter-from, .panel-leave-to { opacity: 0; }
.panel-enter-active .panel-sheet, .panel-leave-active .panel-sheet { transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1); }
.panel-enter-from .panel-sheet, .panel-leave-to .panel-sheet { transform: translateY(100%); }
</style>
