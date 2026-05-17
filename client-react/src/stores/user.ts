import { create } from 'zustand'
import { authApi } from '@/api/auth'
import { userApi } from '@/api/user'

export interface User {
  id: string
  phone: string
  nickname: string
  avatarUrl: string | null
  coverUrl: string | null
  demandCardCoverUrl: string | null
  cityCode: string | null
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
  token: localStorage.getItem('token'),
  ready: false,
  favoriteDemandIds: new Set(),
  favoriteDemands: [],
  favoritePage: 1,
  favoriteTotal: 0,
  favoriteTotalPages: 1,
  favoriteLoading: false,
  get isLoggedIn() {
    return !!get().token
  },

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
    set({
      user: null,
      token: null,
      favoriteDemandIds: new Set(),
      favoriteDemands: [],
    })
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
      set({ favoriteDemandIds })
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
