<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { orderApi } from '@/api/order';
import { MessagePlugin } from 'tdesign-vue-next';

const route = useRoute();
const router = useRouter();
const order = ref<any>(null);
const paid = ref(false);

async function fetchOrder() {
  try {
    const res = await orderApi.get(route.params.id as string);
    order.value = res.data.data;
  } catch { router.replace('/orders'); }
}

async function mockPay() {
  try {
    await orderApi.prepay(order.value.id);
    paid.value = true;
    MessagePlugin.success('支付成功（模拟）');
    setTimeout(() => router.push(`/orders/${order.value.id}`), 1500);
  } catch (e: any) { MessagePlugin.error(e.response?.data?.message); }
}

onMounted(fetchOrder);
</script>

<template>
  <div class="payment-page" v-if="order">
    <div class="pay-card glass">
      <h2>模拟支付</h2>
      <p class="amount">支付金额：¥{{ order.agreedPrice }}</p>
      <p class="note">预付最低报酬的50%（模拟）</p>
      <t-button theme="primary" block size="large" :disabled="paid" @click="mockPay">
        {{ paid ? '支付成功 ✓' : '模拟支付成功' }}
      </t-button>
    </div>
  </div>
</template>

<style scoped>
.payment-page { height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; }
.pay-card { padding: 32px; border-radius: var(--radius); text-align: center; max-width: 360px; width: 100%; }
h2 { margin: 0 0 16px; }
.amount { font-size: 20px; color: var(--error-color); font-weight: 700; }
.note { color: var(--text-muted); font-size: 13px; margin-bottom: 24px; }
</style>
