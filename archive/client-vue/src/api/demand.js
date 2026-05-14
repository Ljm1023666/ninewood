import api from './index';
export const demandApi = {
    list(params) {
        return api.get('/demands/search', { params });
    },
    get(id) {
        return api.get(`/demands/${id}`);
    },
    create(formData) {
        return api.post('/demands', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    apply(id, data) {
        return api.post(`/demands/${id}/apply`, data);
    },
    snatch(id) {
        return api.post(`/demands/${id}/snatch`);
    },
    acceptSnatch(id, applicationId) {
        return api.post(`/demands/${id}/accept-snatch`, { applicationId });
    },
    myDemands(page = 1) {
        return api.get('/demands/my', { params: { page } });
    },
    myApplications(page = 1) {
        return api.get('/demands/my-applications', { params: { page } });
    },
    getApplications(id) {
        return api.get(`/demands/${id}/applications`);
    },
    deleteDemand(id) {
        return api.delete(`/demands/${id}`);
    },
    getMyStatus() {
        return api.get('/demands/my-status');
    },
};
//# sourceMappingURL=demand.js.map