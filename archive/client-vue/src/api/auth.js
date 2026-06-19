import api from './index';
export const authApi = {
    sendCode(phone) {
        return api.post('/auth/send-code', { phone });
    },
    register(phone, code) {
        return api.post('/auth/register', { phone, code });
    },
    login(phone, password) {
        return api.post('/auth/login', { phone, password });
    },
    getMe() {
        return api.get('/auth/me');
    },
};
//# sourceMappingURL=auth.js.map