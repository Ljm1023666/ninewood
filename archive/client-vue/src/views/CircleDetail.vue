<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { circleApi } from '@/api/circle';
import { useUserStore } from '@/stores/user';
import { MessagePlugin } from 'tdesign-vue-next';
import UserIcon from 'tdesign-icons-vue-next/esm/components/user';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const circle = ref<any>(null);
const demands = ref<any[]>([]);
const loading = ref(true);
const error = ref('');
const showMembers = ref(false);
const joining = ref(false);

const isMember = computed(() => circle.value?.members?.some((m: any) => m.userId === userStore.user?.id));
const myRole = computed(() => circle.value?.members?.find((m: any) => m.userId === userStore.user?.id)?.role || null);
const roleLabel: Record<string, string> = { OWNER: '圈主', ADMIN: '管理', MEMBER: '成员' };

async function fetchAll() {
  loading.value = true; error.value = '';
  try {
    const [cRes, dRes] = await Promise.all([
      circleApi.get(route.params.id as string),
      circleApi.getDemands(route.params.id as string),
    ]);
    circle.value = cRes.data.data;
    demands.value = dRes.data.data.demands;
  } catch (e: any) { error.value = e.response?.data?.message || '加载失败'; }
  finally { loading.value = false; }
}

async function joinCircle() {
  joining.value = true;
  try {
    await circleApi.join(circle.value.id);
    MessagePlugin.success('已加入圈子');
    fetchAll();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message || '加入失败'); }
  finally { joining.value = false; }
}

onMounted(fetchAll);
</script>

<template>
  <div class="circle-detail thin-scroll">
    <ErrorState v-if="error" :message="error" @retry="fetchAll" />
    <LoadingState v-else-if="loading" />

    <div v-else-if="circle" class="content">
      <!-- Cover -->
      <div class="cover-wrap" :style="circle.coverUrl ? { backgroundImage: `url(${circle.coverUrl})` } : { background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))` }">
        <div class="cover-status" :class="circle.status">{{ circle.status === 'ACTIVE' ? '活跃' : circle.status === 'WARNING' ? '警告' : '失效' }}</div>
      </div>

      <!-- Header -->
      <section class="detail-hero">
        <h1 class="hero-name">{{ circle.name }}</h1>
        <div class="hero-tags">
          <span>{{ circle.type === 'PUBLIC' ? '公开圈' : '私密圈' }}</span>
          <span>圈主 {{ circle.owner?.nickname }}</span>
          <span>{{ circle._count?.members || 0 }} 人</span>
        </div>
        <div v-if="circle.status === 'WARNING'" class="hero-note warn">⚠️ 活跃度较低，多发布需求可维持圈子活跃</div>
        <div v-if="circle.status === 'DEFUNCT'" class="hero-note error">❌ 圈子已失效，需求已转为公开</div>
      </section>

      <!-- Actions -->
      <div class="action-strip">
        <div v-if="!isMember" class="invite-only-notice">
          <span class="invite-icon">🔒</span>
          <span>仅限圈内成员邀请加入</span>
        </div>
        <button class="strip-btn" @click="showMembers = !showMembers">
          <UserIcon size="17px" /> {{ showMembers ? '收起成员' : `成员 (${circle._count?.members || 0})` }}
        </button>
      </div>

      <!-- Members -->
      <div v-if="showMembers && circle.members" class="members-panel">
        <div v-for="m in circle.members" :key="m.userId" class="member-row" @click="router.push('/profile/' + m.userId)">
          <div class="m-avatar">
            <img v-if="m.user?.avatarUrl" :src="m.user.avatarUrl" class="m-avatar-img" loading="lazy" decoding="async" />
            <span v-else>{{ m.user?.nickname?.charAt(0) }}</span>
          </div>
          <div class="m-info">
            <span class="m-name">{{ m.user?.nickname }}</span>
            <span class="m-cert" v-if="(m.user as any)?.certificationLevel && (m.user as any).certificationLevel !== 'NONE'">{{ (m.user as any).certificationLevel }}</span>
          </div>
          <span class="m-role">{{ roleLabel[m.role] || m.role }}</span>
        </div>
      </div>

      <!-- Demands -->
      <section class="demands-section">
        <div class="section-head">
          <h2>圈内需求</h2>
          <button v-if="isMember" class="publish-link" @click="router.push('/demands/create?circleId=' + circle.id)">+ 发布</button>
        </div>
        <div v-if="demands.length" class="demand-list">
          <div v-for="d in demands" :key="d.id" class="demand-card" @click="router.push('/demands/' + d.id)">
            <div class="d-top">
              <h3 class="d-title">{{ d.title }}</h3>
              <span class="d-price">¥{{ d.minPrice }}</span>
            </div>
            <div class="d-meta">
              <span>{{ d.category }}</span>
              <span>{{ d.serviceType === 'ONLINE' ? '线上' : '线下' }}</span>
              <span>{{ d.applicantCount || 0 }} 人申请</span>
            </div>
          </div>
        </div>
        <div v-else class="no-demands">暂无需求</div>
      </section>
    </div>

  </div>
</template>

<style scoped>
.circle-detail { height: 100%; overflow-y: auto; background: var(--bg-primary); }
.content { max-width: 560px; margin: 0 auto; padding: 16px; }

/* ── Cover ── */
.cover-wrap {
  width: 100%; height: 180px; border-radius: 16px;
  background-size: cover; background-position: center;
  position: relative; margin-bottom: 16px;
}
.cover-status {
  position: absolute; top: 12px; right: 12px;
  padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 1px;
  background: rgba(16,185,129,0.15); color: #34d399;
  backdrop-filter: blur(4px);
}
.cover-status.WARNING { background: rgba(245,158,11,0.15); color: #f59e0b; }
.cover-status.DEFUNCT { background: rgba(239,68,68,0.15); color: #ef4444; }

/* ── Hero ── */
.detail-hero { text-align: center; padding: 0 0 20px; }
.hero-name { font-size: 24px; font-weight: 900; margin: 0 0 10px; color: var(--text-primary); }
.hero-tags { display: flex; justify-content: center; gap: 16px; font-size: 13px; color: var(--text-muted); }
.hero-note { margin-top: 12px; font-size: 13px; }
.hero-note.warn { color: #f59e0b; }
.hero-note.error { color: #ef4444; }

/* ── Action strip ── */
.action-strip { display: flex; gap: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 20px; }
.strip-btn {
  flex: 1; padding: 11px 0; border: none; background: transparent;
  color: var(--text-secondary); font-size: 13px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-family: var(--font-family); transition: all 0.15s;
}
.strip-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.strip-btn + .strip-btn { border-left: 1px solid var(--border-color); }
.strip-btn.primary { background: #fff; color: #000; }
.strip-btn.primary:hover { opacity: 0.85; }

.invite-only-notice {
  flex: 1; padding: 11px 0; display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 13px; color: var(--text-muted); font-weight: 500;
}
.invite-icon { font-size: 14px; }

/* ── Members ── */
.members-panel { border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); margin-bottom: 24px; background: var(--bg-card); }
.member-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.1s; }
.member-row:hover { background: var(--bg-secondary); }
.member-row + .member-row { border-top: 1px solid var(--border-color); }
.m-avatar { width: 34px; height: 34px; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03)); flex-shrink: 0; }
.m-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.m-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.m-name { font-size: 14px; color: var(--text-primary); }
.m-cert { font-size: 11px; color: var(--text-muted); }
.m-role { font-size: 12px; color: var(--text-muted); font-weight: 500; }

/* ── Demands ── */
.demands-section { margin-bottom: 24px; }
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
.section-head h2 { font-size: 18px; font-weight: 800; margin: 0; color: var(--text-primary); }
.publish-link { padding: 0; border: none; background: none; color: var(--accent-color); font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-family); }
.publish-link:hover { opacity: 0.8; }
.demand-list { display: flex; flex-direction: column; gap: 8px; }
.demand-card { padding: 14px 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); cursor: pointer; transition: all 0.15s; }
.demand-card:hover { border-color: rgba(255,255,255,0.12); }
.d-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.d-title { font-size: 15px; font-weight: 600; margin: 0; color: var(--text-primary); }
.d-price { font-size: 15px; font-weight: 700; color: var(--accent-color); }
.d-meta { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); }
.no-demands { text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px; }
.dialog-form { display: flex; flex-direction: column; gap: 12px; }
</style>
