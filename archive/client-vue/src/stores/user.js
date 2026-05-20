import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '@/api/auth';
import { useChatStore } from './chat';
export const useUserStore = defineStore('user', () => {
    const user = ref(null);
    const token = ref(localStorage.getItem('token'));
    const isLoggedIn = computed(() => !!token.value);
    const ready = ref(false);
    function init() {
        if (token.value)
            fetchUser();
        else
            ready.value = true;
    }
    async function fetchUser() {
        try {
            const res = await authApi.getMe();
            user.value = res.data.data;
            const t = token.value;
            if (user.value && t) {
                useChatStore().connect(t);
            }
        }
        catch {
            user.value = null;
            token.value = null;
            localStorage.removeItem('token');
            useChatStore().disconnect();
        }
        finally {
            ready.value = true;
        }
    }
    function setAuth(data) {
        token.value = data.token;
        user.value = data.user;
        localStorage.setItem('token', data.token);
        if (data.token)
            useChatStore().connect(data.token);
    }
    async function sendCode(phone) {
        await authApi.sendCode(phone);
    }
    function logout() {
        user.value = null;
        token.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('ninewood-onboarded');
        useChatStore().disconnect();
    }
    return {
        user, token, isLoggedIn, ready,
        init, fetchUser, sendCode, setAuth, logout,
    };
});
//# sourceMappingURL=user.js.map