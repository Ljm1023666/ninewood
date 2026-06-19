import api from './index';
export const orderApi = {
    create(demandId, applicationId) {
        return api.post('/orders', { demandId, applicationId });
    },
    list(params) {
        return api.get('/orders', { params });
    },
    get(id) {
        return api.get(`/orders/${id}`);
    },
    prepay(id) {
        return api.post(`/orders/${id}/prepay`);
    },
    complete(id) {
        return api.post(`/orders/${id}/complete`);
    },
    confirm(id) {
        return api.post(`/orders/${id}/confirm`);
    },
    dispute(id) {
        return api.post(`/orders/${id}/dispute`);
    },
    partial(id, newPrice, description) {
        return api.post(`/orders/${id}/partial`, { newPrice, description });
    },
};
//# sourceMappingURL=order.js.map