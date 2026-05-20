import { defineStore } from 'pinia';
import { ref } from 'vue';
import { demandApi } from '@/api/demand';

export const useDemandStore = defineStore('demand', () => {
  const demands = ref<any[]>([]);
  const currentDemand = ref<any>(null);
  const loading = ref(false);

  async function fetchDemands(params?: Record<string, any>) {
    loading.value = true;
    try {
      const res = await demandApi.list(params);
      demands.value = res.data.data?.demands || [];
    } finally { loading.value = false; }
  }

  async function fetchDemand(id: string) {
    const res = await demandApi.get(id);
    currentDemand.value = res.data.data;
  }

  return { demands, currentDemand, loading, fetchDemands, fetchDemand };
});
