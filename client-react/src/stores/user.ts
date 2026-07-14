import { create } from 'zustand'
import { authApi } from '@/api/auth'
import { setAuthToken } from '@/api/index'
import { userApi } from '@/api/user'
import { useChatStore } from '@/stores/chat'

const AUTH_CHANNEL =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('ninewood-auth')
    : null

function broadcastAuth(event: 'login' | 'logout') {
  try {
    AUTH_CHANNEL?.postMessage({ type: event, at: Date.now() })
  } catch {
    /* ignore */
  }
}

export interface User {
  id: string
  accountNo?: number | null
  phone: string
  email?: string | null
  nickname: string
  avatarUrl: string | null
  coverUrl: string | null
  demandCardCoverUrl: string | null
  cityCode: string | null
  ipRegion?: string | null
  certificationLevel: string
  snatchCredits: number
  creditScore: number
  completedOrders?: number
  createdAt?: string
  bio?: string | null
}

export interface FavoriteDemand {
  id: string
  title: string
  minPrice: string
  category: string
  serviceType: string
  mediaUrls: string[]
  status: string
  createdAt: string
  user: { id: string; nickname: string; avatarUrl: string | null }
}

interface FavoriteState {
  favoriteDemandIds: Set<string>
  favoriteDemands: FavoriteDemand[]
  favoritePage: number
  favoriteTotal: number
  favoriteTotalPages: number
  favoriteLoading: boolean
}

interface UserState extends FavoriteState {
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
  toggleFavorite: (demandId: string) => Promise<boolean>
  loadFavorites: (page?: number) => Promise<void>
  checkFavoriteStatus: (demandId: string) => Promise<boolean>
  isFavorited: (demandId: string) => boolean
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  ready: false,
  favoriteDemandIds: new Set(),
  favoriteDemands: [],
  favoritePage: 1,
  favoriteTotal: 0,
  favoriteTotalPages: 1,
  favoriteLoading: false,
  get isLoggedIn() {
    return !!get().user
  },

  async init() {
    try {
      const res = await authApi.getMe()
      const token = get().token
      set({ user: res.data.data, ready: true })
      // Cookie 会话下内存 token 可能为空，Socket 走 withCredentials
      useChatStore.getState().connect(token || undefined)
    } catch {
      useChatStore.getState().disconnect()
      setAuthToken(null)
      set({ user: null, token: null, ready: true })
    }
  },

  setAuth(data) {
    setAuthToken(data.token)
    set({ token: data.token, user: data.user })
    useChatStore.getState().connect(data.token)
    broadcastAuth('login')
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
    useChatStore.getState().disconnect()
    setAuthToken(null)
    void authApi.logout().catch(() => {})
    localStorage.removeItem('ninewood-onboarded')
    set({
      user: null,
      token: null,
      favoriteDemandIds: new Set(),
      favoriteDemands: [],
    })
    broadcastAuth('logout')
  },

  async toggleFavorite(demandId) {
    const { favoriteDemandIds } = get()
    const wasFavorited = favoriteDemandIds.has(demandId)
    if (wasFavorited) {
      set({
        favoriteDemandIds: new Set(
          [...favoriteDemandIds].filter((id) => id !== demandId),
        ),
      })
    } else {
      set({ favoriteDemandIds: new Set([...favoriteDemandIds, demandId]) })
    }
    try {
      const res = await userApi.toggleFavorite(demandId)
      const { favorited } = res.data.data
      set((state) => {
        const newIds = new Set(state.favoriteDemandIds)
        if (favorited) {
          newIds.add(demandId)
        } else {
          newIds.delete(demandId)
        }
        return { favoriteDemandIds: newIds }
      })
      return favorited
    } catch {
      set((state) => {
        const newIds = new Set(state.favoriteDemandIds)
        if (wasFavorited) newIds.add(demandId)
        else newIds.delete(demandId)
        return { favoriteDemandIds: newIds }
      })
      throw new Error('操作失败')
    }
  },

  async loadFavorites(page = 1) {
    set({ favoriteLoading: true })
    try {
      const res = await userApi.getFavorites(page)
      const { list, total, totalPages } = res.data.data
      const ids = list.map((d: FavoriteDemand) => d.id)
      set({
        favoriteDemands: list,
        favoriteDemandIds: new Set<string>([
          ...get().favoriteDemandIds,
          ...ids,
        ]),
        favoritePage: page,
        favoriteTotal: total,
        favoriteTotalPages: totalPages,
        favoriteLoading: false,
      })
    } catch {
      set({ favoriteLoading: false })
    }
  },

  async checkFavoriteStatus(demandId) {
    try {
      const res = await userApi.getFavoriteStatus(demandId)
      const { favorited } = res.data.data
      if (favorited) {
        set((state) => ({
          favoriteDemandIds: new Set([...state.favoriteDemandIds, demandId]),
        }))
      }
      return favorited
    } catch {
      return false
    }
  },

  isFavorited(demandId) {
    return get().favoriteDemandIds.has(demandId)
  },
}))

// 跨标签页登录态同步（Cookie 共享；本页刷新 user/token 内存态）
if (AUTH_CHANNEL) {
  AUTH_CHANNEL.onmessage = (ev: MessageEvent<{ type?: string }>) => {
    const type = ev.data?.type
    if (type === 'logout') {
      setAuthToken(null)
      useChatStore.getState().disconnect()
      useUserStore.setState({
        user: null,
        token: null,
        favoriteDemandIds: new Set(),
        favoriteDemands: [],
      })
    } else if (type === 'login') {
      void useUserStore.getState().init()
    }
  }
}
