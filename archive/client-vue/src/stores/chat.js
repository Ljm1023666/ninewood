import { defineStore } from 'pinia';
import { ref } from 'vue';
import { messageApi } from '@/api/message';
import { connectSocket, disconnectSocket, getSocket } from '@/utils/socket';
function messageKey(msg) {
    if (msg.id)
        return `id:${msg.id}`;
    const from = msg.senderId || msg.fromUserId || '';
    const to = msg.receiverId || msg.toUserId || '';
    return `${from}|${to}|${msg.createdAt}|${msg.content}`;
}
export const useChatStore = defineStore('chat', () => {
    const conversations = ref([]);
    const messages = ref([]);
    const unreadCount = ref(0);
    const connected = ref(false);
    const onPrivMsg = (msg) => {
        const incoming = messageKey(msg);
        const exists = messages.value.some((m) => (Boolean(msg.id) && m.id === msg.id) ||
            messageKey(m) === incoming);
        if (!exists) {
            messages.value = [...messages.value, msg];
        }
    };
    const onNotificationNew = () => {
        fetchUnreadCount();
    };
    const onSockConnect = () => { connected.value = true; };
    const onSockDisconnect = () => { connected.value = false; };
    function wireSocketHandlers(s) {
        s.off('private:message', onPrivMsg).on('private:message', onPrivMsg);
        s.off('notification:new', onNotificationNew).on('notification:new', onNotificationNew);
        s.off('connect', onSockConnect).on('connect', onSockConnect);
        s.off('disconnect', onSockDisconnect).on('disconnect', onSockDisconnect);
    }
    function unwireSocketHandlers() {
        const s = getSocket();
        if (!s)
            return;
        s.off('private:message', onPrivMsg);
        s.off('notification:new', onNotificationNew);
        s.off('connect', onSockConnect);
        s.off('disconnect', onSockDisconnect);
    }
    function connect(token) {
        const s = connectSocket(token);
        wireSocketHandlers(s);
        connected.value = s.connected;
        return s;
    }
    function disconnect() {
        unwireSocketHandlers();
        disconnectSocket();
        connected.value = false;
    }
    async function fetchConversations() {
        const res = await messageApi.conversations();
        conversations.value = res.data.data;
    }
    async function fetchMessages(userId, page = 1) {
        const res = await messageApi.list(userId, page);
        const fetched = res.data.data;
        // Merge: keep any socket-delivered messages that aren't in the fetched set
        const existingIds = new Set(fetched.map(m => m.id).filter(Boolean));
        const socketOnly = messages.value.filter(m => !m.id || !existingIds.has(m.id));
        const merged = [...fetched];
        for (const sm of socketOnly) {
            if (!merged.some(m => m.content === sm.content && m.createdAt === sm.createdAt)) {
                merged.push(sm);
            }
        }
        messages.value = merged;
    }
    async function sendMessage(toUserId, content) {
        await messageApi.send(toUserId, content);
    }
    async function fetchUnreadCount() {
        try {
            const res = await messageApi.unreadCount();
            unreadCount.value = res.data.data?.count || 0;
        }
        catch { }
    }
    return {
        conversations, messages, unreadCount, connected,
        connect, disconnect,
        fetchConversations, fetchMessages, sendMessage, fetchUnreadCount,
    };
});
//# sourceMappingURL=chat.js.map