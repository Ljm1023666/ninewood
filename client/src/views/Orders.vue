<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { orderApi } from '@/api/order';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';
import EmptyState from '@/components/EmptyState.vue';
import ListItemCard from '@/components/ListItemCard.vue';

const route = useRoute();
const router = useRouter();

const orders = ref<any[]>([]);
const role = ref<string>((route.query.role as string) || '');
const loading = ref(false);
const error = ref('');

const statusLabel: Record<string, string> = {
  PENDING: '待确认', IN_PROGRESS: '服务中', WAITING_REVIEW: '待验收',
  COMPLETED: '已完成', DISPUTED: '争议中',
};

async function fetchOrders() {
  loading.value = true;
  error.value = '';
  try {
    const res = await orderApi.list({ role: role.value || undefined });
    orders.value = res.data.data.orders;
  } catch (e: any) {
    error.value = e.response?.data?.message || '加载失败';
  } finally { loading.value = false; }
}

function switchRole(r: string) { role.value = r; fetchOrders(); }

onMounted(fetchOrders);
</script>

<template>
  <div class="orders-page">
    <div class="tabs">
      <t-button :variant="!role ? 'base' : 'outline'" @click="switchRole('')">全部</t-button>
      <t-button :variant="role === 'provider' ? 'base' : 'outline'" @click="switchRole('provider')">我接的单</t-button>
      <t-button :variant="role === 'requester' ? 'base' : 'outline'" @click="switchRole('requester')">我发的单</t-button>
    </div>

    <ErrorState v-if="error" :message="error" @retry="fetchOrders" />
    <LoadingState v-else-if="loading" />

    <div v-else class="list">
      <ListItemCard v-for="o in orders" :key="o.id" @click="router.push(`/orders/${o.id}`)">
        <div class="item-header">
          <span class="title">{{ o.demand?.title || '订单' }}</span>
          <t-tag size="small" :theme="o.status === 'COMPLETED' ? 'success' : o.status === 'DISPUTED' ? 'danger' : o.status === 'IN_PROGRESS' ? 'primary' : o.status === 'WAITING_REVIEW' ? 'warning' : 'default'">
            {{ statusLabel[o.status] || '' }}
          </t-tag>
        </div>
        <div class="item-meta">
          <span>¥{{ o.agreedPrice }}</span>
          <span>{{ o.provider?.nickname }} → {{ o.requester?.nickname }}</span>
        </div>
      </ListItemCard>
      <EmptyState v-if="orders.length === 0" message="暂无订单" />
    </div>
  </div>
</template>

<style scoped>
.orders-page { height: 100%; overflow-y: auto; padding: 20px; --page-accent: #2ecc71; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.item-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; }
.item-meta { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; color: var(--text-secondary); }
</style>
