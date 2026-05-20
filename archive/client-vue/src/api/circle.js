import api from './index';
export const circleApi = {
    list() {
        return api.get('/circles/public');
    },
    my() {
        return api.get('/circles/my');
    },
    get(id) {
        return api.get(`/circles/${id}`);
    },
    create(data) {
        return api.post('/circles', data);
    },
    joinByCode(code) {
        return api.post('/circles/join-by-code', { code });
    },
    applyPublic(data) {
        return api.post('/circles/public/apply', data);
    },
    getDemands(circleId, page = 1) {
        return api.get(`/circles/${circleId}/demands`, { params: { page } });
    },
    join(circleId) {
        return api.post(`/circles/${circleId}/join`);
    },
};
//# sourceMappingURL=circle.js.map