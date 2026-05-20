import api from './index';

export const circleApi = {
  list() {
    return api.get('/circles/public');
  },
  my() {
    return api.get('/circles/my');
  },
  get(id: string) {
    return api.get(`/circles/${id}`);
  },
  create(data: { name: string; description?: string }) {
    return api.post('/circles', data);
  },
  joinByCode(code: string) {
    return api.post('/circles/join-by-code', { code });
  },
  applyPublic(data: { name: string; description?: string; cityCode?: string }) {
    return api.post('/circles/public/apply', data);
  },
  getDemands(circleId: string, page = 1) {
    return api.get(`/circles/${circleId}/demands`, { params: { page } });
  },
  join(circleId: string) {
    return api.post(`/circles/${circleId}/join`);
  },
};
