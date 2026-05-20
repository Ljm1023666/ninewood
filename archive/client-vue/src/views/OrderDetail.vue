<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { orderApi } from '@/api/order';
import { useUserStore } from '@/stores/user';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import LoadingState from '@/components/LoadingState.vue';
import ErrorState from '@/components/ErrorState.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const order = ref<any>(null);
const loading = ref(true);
const error = ref('');

const isProvider = computed(() => order.value?.providerId === userStore.user?.id);
const isRequester = computed(() => order.value?.requesterId === userStore.user?.id);

async function fetchOrder() {
  loading.value = true;
  error.value = '';
  try {
    const res = await orderApi.get(route.params.id as string);
    order.value = res.data.data;
  } catch {
    error.value = '加载失败，请确认订单存在';
  } finally { loading.value = false; }
}

async function prepay() {
  try {
    await orderApi.prepay(order.value.id);
    MessagePlugin.success('支付成功（模拟）');
    fetchOrder();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
}

async function complete() {
  try {
    await orderApi.complete(order.value.id);
    MessagePlugin.success('已标记完成');
    fetchOrder();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
}

async function confirm() {
  try {
    await orderApi.confirm(order.value.id);
    MessagePlugin.success('订单已完成');
    fetchOrder();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
}

async function dispute() {
  const dlg = DialogPlugin.confirm({
    header: '发起争议', body: '确认发起争议？', onConfirm: async () => {
      dlg.hide();
      try {
        await orderApi.dispute(order.value.id);
        MessagePlugin.success('争议已提交');
        fetchOrder();
      } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
    },
    onClose: () => dlg.hide(),
  });
}

const showPartial = ref(false);
const partialForm = ref({ newPrice: 0, description: '' });

async function submitPartial() {
  try {
    await orderApi.partial(order.value.id, partialForm.value.newPrice, partialForm.value.description);
    MessagePlugin.success('部分完成已提交');
    showPartial.value = false;
    fetchOrder();
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
}

const statusLabel: Record<string, string> = {
  PENDING: '待确认', IN_PROGRESS: '服务中', WAITING_REVIEW: '待验收',
  COMPLETED: '已完成', DISPUTED: '争议中',
};

onMounted(fetchOrder);
</script>

<template>
  <div class="order-detail">
    <ErrorState v-if="error" :message="error" @retry="fetchOrder" />
    <LoadingState v-else-if="loading" />

    <div v-else-if="order" class="order-card glass">
      <div class="back-row">
        <t-button variant="text" @click="router.back()">← 返回</t-button>
      </div>
      <h2>{{ order.demand?.title }}</h2>
      <div class="status-row">
        <t-tag :theme="order.status === 'COMPLETED' ? 'success' : order.status === 'DISPUTED' ? 'danger' : 'primary'">
          {{ statusLabel[order.status] || order.status }}
        </t-tag>
      </div>

      <div class="info-grid">
        <div class="info"><span class="lbl">金额</span><span class="val">¥{{ order.agreedPrice }}</span></div>
        <div class="info"><span class="lbl">服务方</span><span class="val">{{ order.provider?.nickname }}</span></div>
        <div class="info"><span class="lbl">需求方</span><span class="val">{{ order.requester?.nickname }}</span></div>
        <div class="info" v-if="order.paidAt"><span class="lbl">支付时间</span><span class="val">{{ new Date(order.paidAt).toLocaleString() }}</span></div>
        <div class="info" v-if="order.completedAt"><span class="lbl">完成时间</span><span class="val">{{ new Date(order.completedAt).toLocaleString() }}</span></div>
      </div>

      <div class="actions">
        <!-- Requester: prepay if in progress -->
        <t-button v-if="isRequester && order.status === 'IN_PROGRESS' && !order.paidAt" theme="primary" @click="prepay">
          模拟支付 (预付50%)
        </t-button>
        <!-- Provider: mark complete -->
        <t-button v-if="isProvider && order.status === 'IN_PROGRESS' && order.paidAt" theme="primary" @click="complete">
          标记完成
        </t-button>
        <!-- Requester: confirm -->
        <t-button v-if="isRequester && order.status === 'WAITING_REVIEW'" theme="success" @click="confirm">
          确认验收
        </t-button>
        <!-- Dispute -->
        <t-button v-if="(isProvider || isRequester) && ['IN_PROGRESS', 'WAITING_REVIEW'].includes(order.status)" theme="danger" variant="outline" @click="dispute">
          发起争议
        </t-button>
        <!-- Partial complete (provider) -->
        <t-button v-if="isProvider && order.status === 'IN_PROGRESS'" variant="outline" @click="showPartial = true">
          部分完成
        </t-button>
      </div>
    </div>

    <!-- Partial complete dialog -->
    <t-dialog v-model:visible="showPartial" header="部分完成" :footer="false">
      <div class="partial-form">
        <t-input v-model="partialForm.newPrice" placeholder="新价格（低于原价）" type="number" />
        <t-textarea v-model="partialForm.description" placeholder="说明剩余部分" />
        <t-button theme="primary" block @click="submitPartial">提交</t-button>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped>
.order-detail { height: 100%; overflow-y: auto; padding: 20px; }
.order-card { max-width: 500px; margin: 0 auto; padding: 24px; border-radius: var(--radius); }
.back-row { margin-bottom: 12px; }
h2 { margin: 0 0 16px; }
.status-row { margin-bottom: 16px; }
.info-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
.info { display: flex; justify-content: space-between; }
.lbl { color: var(--text-muted); font-size: 13px; }
.val { font-weight: 600; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.partial-form { display: flex; flex-direction: column; gap: 12px; }
</style>
