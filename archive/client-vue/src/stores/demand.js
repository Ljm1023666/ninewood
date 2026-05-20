import { defineStore } from 'pinia';
import { ref } from 'vue';
import { demandApi } from '@/api/demand';
export const useDemandStore = defineStore('demand', () => {
    const demands = ref([]);
    const currentDemand = ref(null);
    const loading = ref(false);
    async function fetchDemands(params) {
        loading.value = true;
        try {
            const res = await demandApi.list(params);
            demands.value = res.data.data?.demands || [];
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchDemand(id) {
        const res = await demandApi.get(id);
        currentDemand.value = res.data.data;
    }
    return { demands, currentDemand, loading, fetchDemands, fetchDemand };
});
//# sourceMappingURL=demand.js.map