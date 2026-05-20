import api from './index';

export const authApi = {
  sendCode(phone: string) {
    return api.post('/auth/send-code', { phone });
  },
  register(phone: string, code: string) {
    return api.post('/auth/register', { phone, code });
  },
  login(phone: string, password: string) {
    return api.post('/auth/login', { phone, password });
  },
  getMe() {
    return api.get('/auth/me');
  },
};
