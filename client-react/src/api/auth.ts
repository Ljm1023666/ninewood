import api from './index'

export const authApi = {
  sendCode(phone: string, captchaToken: string) {
    return api.post('/auth/send-code', { phone, captchaToken })
  },
  sendEmailCode(email: string, captchaToken: string) {
    return api.post('/auth/send-email-code', { email, captchaToken })
  },
  register(
    phone: string,
    code: string,
    extra?: { birthday?: string; guardianConsent?: boolean },
  ) {
    return api.post('/auth/register', {
      phone,
      code,
      birthday: extra?.birthday,
      guardianConsent: extra?.guardianConsent,
    })
  },
  login(phone: string, password: string) {
    return api.post('/auth/login', { phone, password })
  },
  loginById(accountId: string, password: string) {
    return api.post('/auth/login-id', { accountId, password })
  },
  loginEmail(email: string, code: string) {
    return api.post('/auth/login-email', { email, code })
  },
  getMe() {
    return api.get('/auth/me')
  },
}
