<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { authApi } from '@/api/auth';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const mode = ref<'login' | 'register'>('login');
const phone = ref('');
const password = ref('');
const code = ref('');
const sending = ref(false);
const countdown = ref(0);
const loading = ref(false);

const phoneValid = computed(() => /^\d{1,2}$/.test(phone.value));
const canLogin = computed(() => phoneValid.value && password.value.length >= 1 && !loading.value);
const canRegister = computed(() => phoneValid.value && /^\d{6}$/.test(code.value) && !loading.value);
const canSend = computed(() => phoneValid.value && !sending.value && countdown.value === 0);

let timer: ReturnType<typeof setInterval> | null = null;

async function handleSendCode() {
  if (!canSend.value) return;
  sending.value = true;
  try {
    await authApi.sendCode(phone.value);
    MessagePlugin.success('验证码已发送');
    countdown.value = 60;
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0 && timer) clearInterval(timer);
    }, 1000);
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '发送失败');
  } finally { sending.value = false; }
}

async function handleLogin() {
  if (!canLogin.value) return;
  loading.value = true;
  try {
    const res = await authApi.login(phone.value, password.value);
    userStore.token = res.data.data.token;
    userStore.user = res.data.data.user;
    localStorage.setItem('token', res.data.data.token);
    MessagePlugin.success('登录成功');
    router.replace('/');
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '登录失败');
  } finally { loading.value = false; }
}

async function handleRegister() {
  if (!canRegister.value) return;
  loading.value = true;
  try {
    const res = await authApi.register(phone.value, code.value);
    userStore.token = res.data.data.token;
    userStore.user = res.data.data.user;
    localStorage.setItem('token', res.data.data.token);
    MessagePlugin.success('注册成功');
    router.replace('/');
  } catch (e: any) {
    MessagePlugin.error(e.response?.data?.message || '注册失败');
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="logo">Ninewood</h1>
      <p class="subtitle">本地服务交易平台</p>

      <!-- Mode tabs -->
      <div class="mode-tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <div class="form">
        <t-input v-model="phone" placeholder="输入用户编号 1-20" maxlength="2" size="large" clearable />

        <!-- Password login -->
        <template v-if="mode === 'login'">
          <t-input v-model="password" placeholder="输入密码，默认 1" size="large" @enter="handleLogin" />
          <t-button theme="primary" block size="large" :loading="loading" :disabled="!canLogin" @click="handleLogin">
            登录
          </t-button>
          <p class="switch-hint">
            还没有账号？
            <a @click="mode = 'register'">获取验证码注册</a>
          </p>
        </template>

        <!-- SMS register -->
        <template v-else>
          <div class="code-row">
            <t-input v-model="code" placeholder="6位验证码" maxlength="6" size="large" @enter="handleRegister" />
            <t-button theme="primary" variant="outline" :disabled="!canSend" :loading="sending" @click="handleSendCode">
              {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </t-button>
          </div>
          <t-button theme="primary" block size="large" :loading="loading" :disabled="!canRegister" @click="handleRegister">
            注册并登录
          </t-button>
          <p class="switch-hint">
            已有账号？
            <a @click="mode = 'login'">直接登录</a>
          </p>
        </template>
      </div>

      <div class="hint">测试账号：1~20，密码：1</div>
    </div>
  </div>
</template>

<style scoped>
.login-page { position: fixed; inset: 0; overflow-y: auto; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); padding: 20px; }
.login-card { width: 100%; max-width: 380px; background: var(--bg-card); border: var(--border-width) solid var(--border-color); border-radius: var(--radius); padding: 40px 32px; backdrop-filter: blur(var(--glass-blur)); }
.logo { text-align: center; font-size: 28px; background: var(--primary-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0 0 4px; }
.subtitle { text-align: center; color: var(--text-muted); margin: 0 0 20px; font-size: 14px; }
.mode-tabs { display: flex; gap: 0; margin-bottom: 20px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-color); }
.mode-tabs button { flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-secondary); font-size: 15px; cursor: pointer; transition: all var(--transition-fast); }
.mode-tabs button.active { background: var(--primary-gradient); color: #fff; }
.form { display: flex; flex-direction: column; gap: 16px; }
.code-row { display: flex; gap: 12px; }
.code-row :deep(.t-input) { flex: 1; }
.code-row :deep(.t-button) { white-space: nowrap; min-width: 110px; }
.switch-hint { text-align: center; font-size: 13px; color: var(--text-muted); margin-top: 12px; }
.switch-hint a { color: var(--primary-start); cursor: pointer; }
.hint { margin-top: 16px; text-align: center; font-size: 12px; color: var(--text-muted); }
</style>
