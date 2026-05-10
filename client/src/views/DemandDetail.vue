<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { demandApi } from '@/api/demand';
import { orderApi } from '@/api/order';
import { useUserStore } from '@/stores/user';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import ErrorState from '@/components/ErrorState.vue';
import ListItemCard from '@/components/ListItemCard.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const demand = ref<any>(null);
const loading = ref(true);
const error = ref('');
const showApplyModal = ref(false);
const applyForm = ref({ offerPrice: 0, message: '' });
const descExpanded = ref(false);
const showApplications = ref(false);

const isOwner = computed(() => demand.value?.userId === userStore.user?.id);
const isLoggedIn = computed(() => !!userStore.token);
const canSnatch = computed(() => {
  if (!userStore.user) return false;
  const level = userStore.user.certificationLevel;
  return (level === 'INTERMEDIATE' || level === 'ADVANCED' || level === 'MASTER')
    && userStore.user.snatchCredits > 0;
});
const hasOrder = computed(() => demand.value?.hasOrder);
const canApply = computed(() => !isOwner.value && !hasOrder.value);
const descLong = computed(() => (demand.value?.description?.length || 0) > 150);

async function fetchDemand() {
  loading.value = true;
  error.value = '';
  try {
    const res = await demandApi.get(route.params.id as string);
    demand.value = res.data.data;
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function apply() {
  try {
    const dlg = DialogPlugin.confirm({
      header: '申请接单',
      body: '确认提交申请？',
      onConfirm: async () => {
        dlg.hide();
        try {
          await demandApi.apply(demand.value.id, applyForm.value);
          MessagePlugin.success('申请成功');
          showApplyModal.value = false;
          fetchDemand();
        } catch (e: any) {
          MessagePlugin.error(e.response?.data?.message || '申请失败');
        }
      },
      onClose: () => dlg.hide(),
    });
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '操作失败');
  }
}

async function snatch() {
  const dlg = DialogPlugin.confirm({
    header: '确认抢单',
    body: `消耗1抢单积分，承诺做得更好。当前剩余：${userStore.user?.snatchCredits}次。确认抢单？`,
    onConfirm: async () => {
      dlg.hide();
      try {
        await demandApi.snatch(demand.value.id);
        MessagePlugin.success('抢单成功');
        fetchDemand();
      } catch (e: any) {
        MessagePlugin.error(e.response?.data?.message || '抢单失败');
      }
    },
    onClose: () => dlg.hide(),
  });
}

async function acceptSnatch(appId: string) {
  try {
    await demandApi.acceptSnatch(demand.value.id, appId);
    MessagePlugin.success('已接受抢单');
    fetchDemand();
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '操作失败');
  }
}

async function createOrder(appId: string) {
  try {
    const res = await orderApi.create(demand.value.id, appId);
    MessagePlugin.success('订单已创建');
    router.push(`/orders/${res.data.data.id}`);
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '创建订单失败');
  }
}

onMounted(fetchDemand);
</script>

<template>
  <div class="detail-page" v-if="demand && !loading && !error">
    <div class="detail-card glass">
      <div class="back-row">
      </div>
      <div class="header">
        <t-tag v-if="demand.isExample" theme="warning">示例需求</t-tag>
        <t-tag :theme="demand.serviceType === 'ONLINE' ? 'primary' : 'success'" variant="light">
          {{ demand.serviceType === 'ONLINE' ? '线上' : '线下' }}
        </t-tag>
        <t-tag variant="outline">{{ demand.category }}</t-tag>
        <t-tag variant="outline" size="small" style="margin-left:auto">{{ { PENDING: '进行中', FROZEN: '已冻结', COMPLETED: '已完成', CLOSED: '已关闭' }[demand.status] || demand.status }}</t-tag>
      </div>

      <h1>{{ demand.title }}</h1>
      <div class="desc-wrap">
          <p class="description" :class="{ collapsed: !descExpanded && descLong }">{{ demand.description }}</p>
          <button v-if="descLong" class="desc-toggle" @click="descExpanded = !descExpanded">
            {{ descExpanded ? '收起' : '展开全文' }}
          </button>
        </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="label">报酬</span><span class="value price">¥{{ demand.minPrice }}</span></div>
        <div class="meta-item"><span class="label">发布者</span><span class="value">{{ demand.user.nickname }}</span></div>
        <div class="meta-item">
          <span class="label">操作</span>
          <button v-if="!isOwner" class="contact-btn" @click="router.push(`/messages/${demand.userId}`)">联系发布者</button>
          <span v-else class="value" style="color:var(--text-muted)">我的需求</span>
        </div>
        <div class="meta-item"><span class="label">认证</span><span class="value">{{ { NONE: '未认证', BASIC: '初级', INTERMEDIATE: '中级', ADVANCED: '高级', MASTER: '顶级' }[demand.user.certificationLevel] || demand.user.certificationLevel }}</span></div>
        <div v-if="demand.cityCode" class="meta-item"><span class="label">城市</span><span class="value">{{ demand.cityCode }}</span></div>
      </div>

      <!-- Media -->
      <div v-if="(demand.mediaUrls as any[])?.length" class="media-section">
        <div v-for="url in demand.mediaUrls" :key="url" class="media-item">
          <img v-if="url.match(/\.(jpg|jpeg|png|gif|webp)/i)" :src="url" />
          <video v-else-if="url.match(/\.(mp4|mov|webm|mkv)/i)" :src="url" controls />
        </div>
      </div>

      <!-- Applications (visible to owner) -->
      <div v-if="isOwner && demand.applications?.length" class="applications">
        <div class="applications-header" @click="showApplications = !showApplications">
            <h3>申请列表 ({{ demand.applications.length }})</h3>
            <span class="apps-chevron" :class="{ open: showApplications }" />
          </div>
          <div v-show="showApplications" class="applications-body">
        <ListItemCard v-for="app in demand.applications" :key="app.id" class="app-card">
          <div class="app-user">
            <span class="app-name">{{ app.user.nickname }}</span>
            <t-tag size="small">{{ { NONE: '未认证', BASIC: '初级', INTERMEDIATE: '中级', ADVANCED: '高级', MASTER: '顶级' }[app.user.certificationLevel] || '' }}</t-tag>
            <t-tag v-if="app.isSnatched" theme="warning" size="small">抢单</t-tag>
          </div>
          <div v-if="app.offerPrice" class="app-price">报价: ¥{{ app.offerPrice }}</div>
          <div v-if="app.message" class="app-msg">{{ app.message }}</div>
          <div class="app-actions">
            <t-tag v-if="app.status === 'PENDING'" theme="default" size="small">待处理</t-tag>
            <t-tag v-else-if="app.status === 'ACCEPTED'" theme="success" size="small">已接受</t-tag>
            <t-tag v-else theme="danger" size="small">已拒绝</t-tag>

            <t-button v-if="app.status === 'ACCEPTED'" size="small" theme="primary" @click="createOrder(app.id)">
              确认订单
            </t-button>
            <t-button v-else-if="app.status === 'PENDING'" size="small" @click="acceptSnatch(app.id)">
              接受
            </t-button>
          </div>
        </ListItemCard>
        </div>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="bottom-actions glass" v-if="canApply && !demand.isExample">
      <t-button v-if="canSnatch" theme="warning" block @click="snatch">抢单 (剩余{{ userStore.user?.snatchCredits }}次)</t-button>
      <div v-else class="snatch-hint">
        🔒 中级及以上认证才能抢单 <router-link to="/cert-center">前往认证中心</router-link>
      </div>
      <t-button theme="primary" block @click="showApplyModal = true">申请接单</t-button>
    </div>

    <!-- Apply Modal -->
    <t-dialog v-model:visible="showApplyModal" header="申请接单" :footer="false">
      <div class="apply-form">
        <t-input v-model="applyForm.offerPrice" placeholder="报价 (可选)" type="number" />
        <t-textarea v-model="applyForm.message" placeholder="留言 (可选)" :autosize="{ minRows: 2, maxRows: 4 }" />
        <t-button theme="primary" block @click="apply">提交申请</t-button>
      </div>
    </t-dialog>
  </div>

  <ErrorState v-else-if="error" :message="error" @retry="fetchDemand" />
  <div v-else-if="loading" class="loading">加载中...</div>
</template>

<style scoped>
.detail-page { height: 100%; overflow-y: auto; padding: 20px; padding-bottom: 100px; }
.detail-card { padding: 24px; border-radius: var(--radius); }
.back-row { margin-bottom: 12px; }
.header { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
h1 { font-size: 20px; margin: 0 0 12px; color: var(--text-primary); }
.description { color: var(--text-secondary); line-height: 1.6; margin: 0; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.meta-item { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 12px; color: var(--text-muted); }
.value { font-size: 14px; color: var(--text-primary); }
.price { color: var(--error-color); font-weight: 600; }
.contact-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--accent-color);
  background: transparent; color: var(--accent-color); font-size: 13px;
  font-weight: 600; cursor: pointer; transition: all 0.2s;
  font-family: var(--font-family);
}
.contact-btn:hover { background: var(--accent-color); color: #fff; }
.media-section { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.media-item { width: 120px; height: 120px; border-radius: var(--radius-sm); overflow: hidden; }
.media-item img,
.media-item video {
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: top center;
}
.applications { margin-top: 20px; }
.applications h3 { margin: 0 0 12px; }
.app-card { margin-bottom: 8px; }
.app-user { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.app-name { font-weight: 600; }
.app-price { color: var(--error-color); font-size: 13px; }
.app-msg { color: var(--text-secondary); font-size: 13px; margin-bottom: 8px; }
.app-actions { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.bottom-actions {
  position: fixed; bottom: 0; left: 72px; right: 0;
  padding: 12px 20px; display: flex; flex-direction: column; gap: 8px;
  border-top: 1px solid var(--border-color);
}
.snatch-hint {
  font-size: 12px; color: var(--text-muted); text-align: center;
  padding: 4px 0;
}
.snatch-hint a { color: var(--accent-color); font-weight: 600; }
@media (max-width: 768px) { .bottom-actions { left: 0; bottom: 64px; } }
.apply-form { display: flex; flex-direction: column; gap: 12px; }
.loading { text-align: center; padding: 60px; color: var(--text-muted); }

/* ── Collapsible Description ── */
.desc-wrap { margin-bottom: 20px; }
.description.collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.desc-toggle {
  display: block; margin-top: 8px; padding: 0; background: none;
  border: none; color: var(--accent-color); font-size: 13px;
  cursor: pointer; font-family: var(--font-family);
}
.desc-toggle:hover { opacity: 0.8; }

/* ── Collapsible Applications ── */
.applications-header {
  display: flex; align-items: center; gap: 8px;
  cursor: pointer; padding: 8px 0; user-select: none;
}
.applications-header h3 { margin: 0; flex: 1; font-size: 15px; }
.apps-chevron {
  flex-shrink: 0; transition: transform 0.25s ease;
}
.apps-chevron::after {
  content: ''; display: block;
  width: 7px; height: 7px;
  border-right: 1.5px solid var(--text-muted);
  border-bottom: 1.5px solid var(--text-muted);
  transform: rotate(-45deg);
  transition: transform 0.25s ease;
}
.apps-chevron.open::after { transform: rotate(45deg); }
</style>
