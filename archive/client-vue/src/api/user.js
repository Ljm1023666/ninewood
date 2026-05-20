import api from './index';
export const userApi = {
    getMe() {
        return api.get('/users/me');
    },
    get(id) {
        return api.get(`/users/${id}`);
    },
    updateProfile(data) {
        const isFormData = data instanceof FormData;
        return api.put('/users/profile', data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
    },
    certStatus() {
        return api.get('/users/cert-status');
    },
    upgradeCert() {
        return api.post('/users/upgrade-cert');
    },
    snatchStatus() {
        return api.get('/users/snatch-status');
    },
    search(keyword) {
        return api.get('/users/search', { params: { keyword } });
    },
    follow(id) {
        return api.post(`/users/${id}/follow`);
    },
    unfollow(id) {
        return api.delete(`/users/${id}/follow`);
    },
    followers(id, page = 1) {
        return api.get(`/users/${id}/followers`, { params: { page } });
    },
    following(id, page = 1) {
        return api.get(`/users/${id}/following`, { params: { page } });
    },
};
//# sourceMappingURL=user.js.map