<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { demandApi } from '@/api/demand';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';
import ListItemCard from '@/components/ListItemCard.vue';

const router = useRouter();

const tab = ref<'demands' | 'applications'>('demands');
const demands = ref<any[]>([]);
const applications = ref<any[]>([]);
const loading = ref(false);
const error = ref('');

async function fetchData() {
  loading.value = true;
  error.value = '';
  try {
    const [dRes, aRes] = await Promise.all([demandApi.myDemands(), demandApi.myApplications()]);
    demands.value = dRes.data.data.demands;
    applications.value = aRes.data.data.applications;
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载失败';
  } finally { loading.value = false; }
}

async function deleteDemand(id: string) {
  const dlg = DialogPlugin.confirm({
    header: '确认删除', body: '删除后不可恢复，确定删除该冻结需求？',
    onConfirm: async () => {
      dlg.hide();
      try {
        await demandApi.deleteDemand(id);
        MessagePlugin.success('已删除');
        fetchData();
      } catch (e: any) { MessagePlugin.error(e.response?.data?.message || '删除失败'); }
    },
    onClose: () => dlg.hide(),
  });
}

onMounted(fetchData);
</script>

<template>
  <div class="my-page">
    <div class="tabs">
      <t-button :variant="tab === 'demands' ? 'base' : 'outline'" @click="tab = 'demands'">我的需求</t-button>
      <t-button :variant="tab === 'applications' ? 'base' : 'outline'" @click="tab = 'applications'">我的申请</t-button>
    </div>

    <ErrorState v-if="error" :message="error" @retry="fetchData" />
    <LoadingState v-else-if="loading" />

    <template v-else>
      <div v-if="tab === 'demands'" class="list">
        <ListItemCard v-for="d in demands" :key="d.id" @click="router.push(`/demands/${d.id}`)">
          <div class="item-header">
            <span class="title">{{ d.title }}</span>
            <t-tag size="small">{{ { PENDING: '进行中', FROZEN: '已冻结', COMPLETED: '已完成', CLOSED: '已关闭' }[d.status] || d.status }}</t-tag>
          </div>
          <div class="item-meta">
            <span>{{ d._count?.applications || 0 }}人申请</span>
            <t-button v-if="d.status === 'FROZEN'" size="small" theme="danger" variant="text" @click.stop="deleteDemand(d.id)">删除</t-button>
          </div>
        </ListItemCard>
        <EmptyState v-if="demands.length === 0" message="暂无需求" action-label="发布需求" @action="router.push('/demands/create')" />
      </div>

      <div v-if="tab === 'applications'" class="list">
        <ListItemCard v-for="a in applications" :key="a.id" @click="router.push(`/demands/${a.demand?.id}`)">
          <div class="item-header">
            <span class="title">{{ a.demand?.title }}</span>
            <t-tag size="small">{{ { PENDING: '待处理', ACCEPTED: '已接受', REJECTED: '已拒绝' }[a.status] || a.status }}</t-tag>
          </div>
          <div v-if="a.isSnatched" class="badge">抢单</div>
        </ListItemCard>
        <EmptyState v-if="applications.length === 0" message="暂无申请" action-label="去发现页" @action="router.push('/')" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.my-page { height: 100%; overflow-y: auto; padding: 20px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.item-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; color: var(--text-primary); }
.item-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
.badge { color: var(--warning-color); font-size: 12px; margin-top: 4px; }
</style>
