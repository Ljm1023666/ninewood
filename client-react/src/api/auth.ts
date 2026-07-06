import api from './index'

export const authApi = {
  sendCode(phone: string, captchaToken: string) {
    return api.post('/auth/send-code', { phone, captchaToken })
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
  getMe() {
    return api.get('/auth/me')
  },
}
