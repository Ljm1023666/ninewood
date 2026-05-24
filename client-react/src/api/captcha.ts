import api from './index'

export const captchaApi = {
  /** 获取 hCaptcha site key */
  async getSiteKey(): Promise<string> {
    const res = await api.get<{ siteKey: string }>('/captcha')
    return res.data.siteKey
  },

  /** 向服务端验证 hCaptcha token */
  async verify(token: string) {
    const res = await api.post<{
      success: boolean
      token: string
      message: string
    }>('/captcha/verify', { token })
    return res.data
  },
}
