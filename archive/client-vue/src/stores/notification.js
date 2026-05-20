import { defineStore } from 'pinia';
import { ref } from 'vue';
import { messageApi } from '@/api/message';
export const useNotificationStore = defineStore('notification', () => {
    const unreadCount = ref(0);
    async function fetchUnreadCount() {
        try {
            const res = await messageApi.unreadCount();
            unreadCount.value = res.data.data?.count || 0;
        }
        catch { /* ignore */ }
    }
    return { unreadCount, fetchUnreadCount };
});
//# sourceMappingURL=notification.js.map