<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import PullRefresh from '@/components/PullRefresh.vue';
import { demandApi } from '@/api/demand';
import { certLabel, certColor } from '@/constants/cert';
import SearchIcon from 'tdesign-icons-vue-next/esm/components/search';
import CloseIcon from 'tdesign-icons-vue-next/esm/components/close';
import FilterIcon from 'tdesign-icons-vue-next/esm/components/filter';
import MoneyIcon from 'tdesign-icons-vue-next/esm/components/money';
import UserIcon from 'tdesign-icons-vue-next/esm/components/user';
import TimeIcon from 'tdesign-icons-vue-next/esm/components/time';
import LocationIcon from 'tdesign-icons-vue-next/esm/components/location';
import StarFilledIcon from 'tdesign-icons-vue-next/esm/components/star-filled';
import CertificateIcon from 'tdesign-icons-vue-next/esm/components/certificate';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';
import AnimateOnScroll from '@/components/AnimateOnScroll.vue';

const router = useRouter();
const userStore = useUserStore();

const demands = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const keyword = ref('');
const category = ref('');
const minPrice = ref('');
const maxPrice = ref('');
const distance = ref('');
const page = ref(1);
const hasMore = ref(true);
const showFilters = ref(false);
const activeTab = ref<'all' | 'online' | 'offline'>('all');
const expandedId = ref<string | null>(null);

const categories = ['技术开发', '设计', '维修服务', '家政服务', '教育培训', '咨询服务', '其他'];

function getCertColor(level: string) { return certColor[level] || '#6b7280'; }

const certIconComp: Record<string, any> = { MASTER: StarFilledIcon, ADVANCED: CertificateIcon, INTERMEDIATE: CertificateIcon, BASIC: CertificateIcon, NONE: UserIcon };

async function search(reset = false) {
  if (reset) { page.value = 1; demands.value = []; hasMore.value = true; error.value = ''; }
  if (loading.value || (!reset && !hasMore.value)) return;
  loading.value = true; error.value = '';
  try {
    const params: any = { page: page.value, limit: 20, excludeExample: false };
    if (userStore.user?.cityCode) params.cityCode = userStore.user.cityCode;
    if (keyword.value) params.keyword = keyword.value;
    if (category.value) params.category = category.value;
    if (minPrice.value) params.minPrice = Number(minPrice.value);
    if (maxPrice.value) params.maxPrice = Number(maxPrice.value);
    if (distance.value) params.distance = Number(distance.value);
    if (activeTab.value === 'online') params.serviceType = 'ONLINE';
    if (activeTab.value === 'offline') params.serviceType = 'OFFLINE';
    const res = await demandApi.list(params);
    const data = res.data.data;
    demands.value.push(...data.demands);
    hasMore.value = data.page < data.totalPages;
    page.value++;
  } catch (e: any) {
    error.value = e.response?.data?.message || '搜索失败';
  } finally { loading.value = false; }
}

function goDetail(id: string) { router.push(`/demands/${id}`); }
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}
function handleSearch() { search(true); }
function switchTab(t: 'all' | 'online' | 'offline') { activeTab.value = t; search(true); }
function onScroll(e: Event) {
  const el = e.target as HTMLElement;
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) search();
}

const pageRef = ref<InstanceType<typeof PullRefresh> | null>(null);

onMounted(() => {
  search(true);
  const el = pageRef.value?.$el as HTMLElement | undefined;
  el?.addEventListener('scroll', onScroll);
});
</script>

<template>
  <PullRefresh ref="pageRef" class="home-page thin-scroll" @refresh="search(true)">
    <!-- Hero banner -->
    <div class="hero-banner">
      <div class="hero-glow" />
      <div class="hero-content">
        <h1 class="hero-title">九木</h1>
        <p class="hero-sub">发现身边的高手，解决你的需求</p>
      </div>
      <div class="hero-ornament left" />
      <div class="hero-ornament right" />
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <div class="search-box">
        <SearchIcon class="search-icon" />
        <input v-model="keyword" placeholder="搜索需求..." @keyup.enter="handleSearch" class="search-input" />
        <button v-if="keyword" class="search-clear" @click="keyword = ''; handleSearch()"><CloseIcon size="14px" /></button>
      </div>
      <button class="filter-btn" :class="{ active: showFilters }" @click="showFilters = !showFilters">
        <FilterIcon size="18px" />
      </button>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="filters-panel animate-fadeIn">
      <select v-model="category" class="filter-select">
        <option value="">全部分类</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <input v-model="minPrice" type="number" placeholder="最低价" class="filter-input" />
      <span class="filter-sep">—</span>
      <input v-model="maxPrice" type="number" placeholder="最高价" class="filter-input" />
      <input v-model="distance" type="number" placeholder="距离(km)" class="filter-input" />
      <button class="apply-btn" @click="search(true)">筛选</button>
    </div>

    <!-- Tabs -->
    <div class="tab-row">
      <t-button :variant="activeTab === 'all' ? 'base' : 'outline'" @click="switchTab('all')">全部</t-button>
      <t-button :variant="activeTab === 'online' ? 'base' : 'outline'" @click="switchTab('online')">线上</t-button>
      <t-button :variant="activeTab === 'offline' ? 'base' : 'outline'" @click="switchTab('offline')">线下</t-button>
    </div>

    <!-- Content -->
    <ErrorState v-if="error && demands.length === 0" :message="error" @retry="search(true)" />
    <LoadingState v-else-if="loading && demands.length === 0" />

    <div v-else class="demand-grid">
      <EmptyState v-if="demands.length === 0" type="search" action-label="发布需求" @action="router.push('/demands/create')" />

      <AnimateOnScroll v-else animation="fadeUp" :stagger="60">
        <div v-for="(d, idx) in demands" :key="d.id" class="demand-card" :class="{ expanded: expandedId === d.id }" @click="toggleExpand(d.id)">
        <!-- Card glow border -->
        <div class="card-border" :style="{ background: `linear-gradient(135deg, ${getCertColor(d.user?.certificationLevel)}44, transparent)` }" />

        <!-- Preview (always visible) -->
        <div class="card-preview">
          <div class="preview-top">
            <h3 class="card-title">{{ d.title }}</h3>
            <span class="preview-price">¥{{ d.minPrice }}</span>
          </div>
          <div class="preview-tags">
            <span class="tag-type" :class="d.serviceType === 'ONLINE' ? 'online' : 'offline'">
              {{ d.serviceType === 'ONLINE' ? '线上' : '线下' }}
            </span>
            <span class="tag-cat">{{ d.category }}</span>
            <span v-if="d.isExample" class="tag-example">示例</span>
            <span class="chevron" :class="{ open: expandedId === d.id }" />
          </div>
        </div>

        <!-- Expandable details -->
        <div class="card-details" :class="{ open: expandedId === d.id }">
          <div class="detail-divider" />

          <div class="card-head">
            <div class="publisher" @click.stop="router.push('/profile/' + d.user.id)">
              <div class="pub-avatar" :style="{ background: getCertColor(d.user?.certificationLevel) }">
                <img v-if="d.user?.avatarUrl" :src="d.user.avatarUrl" class="pub-avatar-img" loading="lazy" decoding="async" />
                <span v-else>{{ d.user?.nickname?.charAt(0) || '?' }}</span>
              </div>
              <div class="pub-info">
                <span class="pub-name">{{ d.user?.nickname }}</span>
                <span class="pub-cert" :style="{ color: getCertColor(d.user?.certificationLevel) }">
                  <component :is="certIconComp[d.user?.certificationLevel] || UserIcon" size="12px" />
                  {{ certLabel[d.user?.certificationLevel] || d.user?.certificationLevel }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="d.description" class="preview-desc">{{ d.description.slice(0, 100) }}{{ d.description.length > 100 ? '...' : '' }}</div>

          <div class="card-footer">
            <div class="stat">
              <MoneyIcon class="stat-icon" />
              <span class="stat-val gold">¥{{ d.minPrice }}</span>
            </div>
            <div class="stat">
              <UserIcon class="stat-icon" />
              <span class="stat-val">{{ d.applicantCount }}人申请</span>
            </div>
            <div class="stat">
              <TimeIcon class="stat-icon" />
              <span class="stat-val">{{ d.createdAgo }}</span>
            </div>
            <div v-if="d.distance != null" class="stat">
              <LocationIcon class="stat-icon" />
              <span class="stat-val">{{ d.distance }}km</span>
            </div>
          </div>

          <button class="detail-btn" @click.stop="goDetail(d.id)">查看详情</button>
        </div>
      </div>

      </AnimateOnScroll>

      <LoadingState v-if="loading && demands.length > 0" text="加载更多..." />
      <div v-if="!hasMore && demands.length > 0" class="end-line">
        <span class="end-ornament" />
        <span>已展示全部</span>
        <span class="end-ornament" />
      </div>
    </div>
  </PullRefresh>
</template>

<style scoped>
/* ── Base ── */
.home-page { height: 100%; background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 30%, var(--bg-primary) 100%); color: var(--text-primary); }
/* ── Hero Banner ── */
.hero-banner {
  position: relative; padding: 36px 24px 28px; text-align: center;
  background: radial-gradient(ellipse at 50% 0%, var(--bg-secondary) 0%, transparent 60%);
  overflow: hidden;
}
.hero-glow {
  position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
  width: 300px; height: 160px; background: radial-gradient(ellipse, var(--bg-tertiary) 0%, transparent 70%);
  pointer-events: none;
}
.hero-content { position: relative; z-index: 1; }
.hero-title {
  font-size: 32px; font-weight: 900; margin: 0; letter-spacing: 4px;
  background: var(--primary-gradient);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.hero-sub { margin: 8px 0 0; font-size: 13px; color: var(--text-secondary); letter-spacing: 2px; }
.hero-ornament {
  position: absolute; top: 50%; width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-color), transparent);
  transform: translateY(-50%);
}
.hero-ornament.left { left: 16px; }
.hero-ornament.right { right: 16px; }

/* ── Search ── */
.search-bar { display: flex; gap: 8px; padding: 0 20px 16px; align-items: center; }
.search-box {
  flex: 1; display: flex; align-items: center; gap: 10px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 10px 16px; transition: border-color 0.2s;
}
.search-box:focus-within { border-color: var(--accent-color); }
.search-icon { color: var(--text-muted); font-size: 18px; flex-shrink: 0; }
.search-input {
  flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-size: 14px;
}
.search-input::placeholder { color: var(--text-muted); }
.search-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 14px; }
.filter-btn {
  width: 44px; height: 44px; border-radius: var(--radius); background: var(--bg-card);
  border: 1px solid var(--border-color); color: var(--accent-color); font-size: 18px;
  cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
}
.filter-btn.active { background: var(--bg-tertiary); border-color: var(--accent-color); }

/* ── Filters ── */
.filters-panel {
  display: flex; gap: 8px; padding: 0 20px 16px; align-items: center; flex-wrap: wrap;
}
.filter-select, .filter-input {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-sm); padding: 8px 12px; color: var(--text-primary); font-size: 13px; outline: none;
}
.filter-select option { background: var(--bg-secondary); color: var(--text-primary); }
.filter-input { width: 90px; }
.filter-sep { color: var(--text-muted); }
.apply-btn {
  background: var(--primary-gradient); border: none; border-radius: var(--radius-sm);
  padding: 8px 18px; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer;
}

/* ── Tabs ── */
.tab-row { display: flex; gap: 8px; padding: 0 20px 16px; }
.tab-row :deep(.t-button) { flex: 1; }

/* ── Cards ── */
.demand-grid { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 40px; }
.demand-card {
  position: relative; padding: 20px 24px; border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  cursor: pointer; overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.demand-card {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 0.3s ease,
              border-color 0.25s ease;
}
.demand-card:hover {
  transform: translateY(-3px) scale(1.005);
  box-shadow: var(--shadow-lg);
  border-color: color-mix(in srgb, var(--accent-color) 50%, transparent);
}
/* hover 四角装饰 */
.demand-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  background:
    linear-gradient(to bottom right, var(--accent-color) 2px, transparent 2px) top left / 8px 8px no-repeat,
    linear-gradient(to bottom left, var(--accent-color) 2px, transparent 2px) top right / 8px 8px no-repeat,
    linear-gradient(to top right, var(--accent-color) 2px, transparent 2px) bottom left / 8px 8px no-repeat,
    linear-gradient(to top left, var(--accent-color) 2px, transparent 2px) bottom right / 8px 8px no-repeat;
}
.demand-card:hover::after {
  opacity: 0.5;
}
.demand-card:active {
  transform: translateY(-1px) scale(0.995);
  transition-duration: 0.1s;
}
.demand-card.expanded {
  border-color: var(--accent-color);
  box-shadow: var(--shadow-md);
}
.card-border {
  position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 16px 16px 0 0;
}
/* ── Card Preview (collapsed) ── */
.card-preview { position: relative; z-index: 1; }
.preview-top {
  display: flex; justify-content: space-between; align-items: center;
  gap: 12px; margin-bottom: 8px;
}
.card-title {
  font-size: 16px; font-weight: 700; margin: 0; color: var(--text-primary);
  line-height: 1.4; flex: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.preview-price {
  font-size: 20px; font-weight: 800; color: var(--accent-color); flex-shrink: 0;
  font-family: var(--font-mono);
}
.preview-tags {
  display: flex; align-items: center; gap: 6px;
}
.tag-type {
  padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
}
.tag-type.online { background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2); }
.tag-type.offline { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.2); }
.tag-cat {
  padding: 2px 8px; border-radius: 4px; font-size: 10px;
  background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-color);
}
.tag-example {
  padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;
  background: var(--bg-tertiary); color: var(--accent-color); border: 1px solid var(--border-color);
}

/* ── Chevron indicator ── */
.chevron {
  margin-left: auto; transition: transform 0.25s ease; flex-shrink: 0;
}
.chevron::after {
  content: ''; display: block;
  width: 7px; height: 7px;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
  transform: rotate(-45deg);
  transition: transform 0.25s ease;
}
.chevron.open::after {
  transform: rotate(45deg);
}

/* ── Card Details (expandable) ── */
.card-details {
  max-height: 0; opacity: 0; overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease;
}
.card-details.open {
  max-height: 500px; opacity: 1;
}
.detail-divider {
  height: 1px; background: var(--border-color); margin: 14px 0 12px;
}
.card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.publisher { display: flex; gap: 10px; align-items: center; }
.pub-avatar {
  width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center;
  justify-content: center; font-size: 14px; font-weight: 700; color: #fff;
  box-shadow: 0 0 12px rgba(0,0,0,0.3); flex-shrink: 0; overflow: hidden;
  cursor: pointer;
}
.pub-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.pub-name { cursor: pointer; }
.pub-name:hover { color: var(--accent-color); }
.pub-info { display: flex; flex-direction: column; gap: 2px; }
.pub-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.pub-cert { font-size: 10px; display: inline-flex; align-items: center; gap: 2px; }
.preview-desc {
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
  margin-bottom: 12px;
}
.card-footer { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.stat { display: flex; align-items: center; gap: 4px; }
.stat-icon { font-size: 12px; color: var(--text-secondary); flex-shrink: 0; }
.stat-val { font-size: 12px; color: var(--text-secondary); }
.stat-val.gold { color: var(--accent-color); font-weight: 700; }

.detail-btn {
  width: 100%; padding: 9px; border-radius: 10px;
  background: transparent; border: 1px solid var(--border-color);
  color: var(--text-secondary); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; font-family: var(--font-family);
}
.detail-btn:hover {
  border-color: var(--accent-color); color: var(--accent-color);
  background: var(--bg-tertiary);
}

/* ── End ── */
.end-line {
  display: flex; align-items: center; gap: 12px; justify-content: center;
  padding: 20px; color: var(--text-muted); font-size: 12px;
}
.end-ornament { width: 40px; height: 1px; background: var(--border-color); }

/* ── Grid hover cascade ── */
.demand-grid:has(.demand-card:hover) .demand-card:not(:hover) {
  opacity: 0.7;
  filter: saturate(0.8);
  transition: all 0.3s ease;
}
.demand-card:hover + .demand-card {
  transform: translateY(-1px);
}
</style>
