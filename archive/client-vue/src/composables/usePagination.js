import { ref } from 'vue';
export function usePagination(fetchFn) {
    const items = ref([]);
    const page = ref(1);
    const total = ref(0);
    const totalPages = ref(0);
    const loading = ref(false);
    const error = ref(null);
    const hasMore = computed(() => page.value < totalPages.value);
    async function loadMore(reset = false) {
        if (loading.value)
            return;
        if (reset) {
            page.value = 1;
            items.value = [];
            totalPages.value = 0;
        }
        loading.value = true;
        error.value = null;
        try {
            const res = await fetchFn(page.value);
            items.value.push(...(res.items || res.demands || res.orders || res.complaints || []));
            total.value = res.total;
            totalPages.value = res.totalPages;
            page.value++;
        }
        catch (e) {
            error.value = e.response?.data?.message || e.message || '加载失败';
        }
        finally {
            loading.value = false;
        }
    }
    return { items, loading, error, hasMore, loadMore, total };
}
import { computed } from 'vue';
//# sourceMappingURL=usePagination.js.map