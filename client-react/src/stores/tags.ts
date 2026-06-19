import { create } from 'zustand'
import api from '@/api'

interface TagData {
  name: string
  category: 'service' | 'demand' | 'both'
  totalCompleted: number
}

interface TagsStore {
  allTags: TagData[]
  selectedTags: string[]
  excludedTags: string[]
  fetchAll: () => Promise<void>
  toggle: (tag: string) => void
  exclude: (tag: string) => void
  clear: () => void
  setUserTags: (tags: string[]) => Promise<void>
  fetchUserTags: (userId: string) => Promise<string[]>
}

export const useTagsStore = create<TagsStore>((set, get) => ({
  allTags: [],
  selectedTags: [],
  excludedTags: [],

  fetchAll: async () => {
    const { data } = await api.get('/tags')
    set({ allTags: Array.isArray(data) ? data : data.data || [] })
  },

  toggle: (tag) =>
    set((s) => {
      const has = s.selectedTags.includes(tag)
      return {
        selectedTags: has
          ? s.selectedTags.filter((t) => t !== tag)
          : [...s.selectedTags, tag],
      }
    }),

  exclude: (tag) =>
    set((s) => {
      const has = s.excludedTags.includes(tag)
      return {
        excludedTags: has
          ? s.excludedTags.filter((t) => t !== tag)
          : [...s.excludedTags, tag],
      }
    }),

  clear: () => set({ selectedTags: [], excludedTags: [] }),

  setUserTags: async (tags) => {
    await api.put('/tags/user', { tags })
  },

  fetchUserTags: async (userId) => {
    const { data } = await api.get(`/tags/user/${userId}`)
    return Array.isArray(data) ? data : data.tags || []
  },
}))
