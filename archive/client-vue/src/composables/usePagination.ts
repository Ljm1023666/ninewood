import { ref } from 'vue';

export function usePagination<T>(fetchFn: (page: number) => Promise<{ total: number; page: number; totalPages: number; items?: T[] }>) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const page = ref(1);
  const total = ref(0);
  const totalPages = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const hasMore = computed(() => page.value < totalPages.value);

  async function loadMore(reset = false) {
    if (loading.value) return;
    if (reset) {
      page.value = 1;
      items.value = [];
      totalPages.value = 0;
    }
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchFn(page.value);
      items.value.push(...(res.items || (res as any).demands || (res as any).orders || (res as any).complaints || []));
      total.value = res.total;
      totalPages.value = res.totalPages;
      page.value++;
    } catch (e: any) {
      error.value = e.response?.data?.message || e.message || '加载失败';
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, error, hasMore, loadMore, total };
}

import { Ref, computed } from 'vue';
