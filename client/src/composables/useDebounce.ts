import { ref, watch } from 'vue';

export function useDebounce<T>(source: Ref<T>, delay = 300) {
  const debounced = ref(source.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout>;
  watch(source, (val) => {
    clearTimeout(timer);
    timer = setTimeout(() => { debounced.value = val; }, delay);
  });
  return debounced;
}

import { Ref } from 'vue';
