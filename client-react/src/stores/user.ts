import { create } from 'zustand'
import { authApi } from '@/api/auth'

export interface User {
  id: string
  phone: string
  nickname: string
  avatarUrl: string | null
  coverUrl: string | null
  cityCode: string | null
  certificationLevel: string
  snatchCredits: number
  creditScore: number
  completedOrders?: number
  createdAt?: string
  bio?: string | null
}

interface UserState {
  user: User | null
  token: string | null
  ready: boolean
  isLoggedIn: boolean
  init: () => Promise<void>
  setAuth: (data: { user: User; token: string }) => void
  /** 与服务器同步当前用户（昵称/简介等更新后调用） */
  refreshUser: () => Promise<void>
  sendCode: (phone: string) => Promise<void>
  logout: () => void
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  ready: false,
  get isLoggedIn() { return !!get().token },

  async init() {
    const { token } = get()
    if (!token) {
      set({ ready: true })
      return
    }
    try {
      const res = await authApi.getMe()
      set({ user: res.data.data, ready: true })
    } catch {
      set({ user: null, token: null, ready: true })
      localStorage.removeItem('token')
    }
  },

  setAuth(data) {
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user })
  },

  async refreshUser() {
    const { token } = get()
    if (!token) return
    try {
      const res = await authApi.getMe()
      set({ user: res.data.data })
    } catch {
      /* 保持原 user，由拦截器处理 401 */
    }
  },

  async sendCode(phone) {
    await authApi.sendCode(phone)
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('ninewood-onboarded')
    set({ user: null, token: null })
  },
}))
