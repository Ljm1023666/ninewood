import api from './index';
export const messageApi = {
    conversations() {
        return api.get('/messages/conversations');
    },
    list(userId, page = 1) {
        return api.get(`/messages/${userId}`, { params: { page } });
    },
    send(toUserId, content) {
        return api.post('/messages/send', { toUserId, content });
    },
    sendForm(formData) {
        return api.post('/messages/send', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    unreadCount() {
        return api.get('/messages/unread-count');
    },
};
//# sourceMappingURL=message.js.map