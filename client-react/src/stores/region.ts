import { create } from 'zustand'
import api from '@/api'

interface Region {
  id: number
  name: string
  level: number
  parentId: number
  children?: Region[]
}

interface RegionStore {
  selectedRegionId: number | null
  selectedRegionName: string
  regionTree: Region[]
  children: Region[]
  setSelected: (id: number | null, name?: string) => void
  fetchTree: () => Promise<void>
  fetchChildren: (parentId?: number) => Promise<void>
}

export const useRegionStore = create<RegionStore>((set) => ({
  selectedRegionId: null,
  selectedRegionName: '',
  regionTree: [],
  children: [],

  setSelected: (id, name) =>
    set({ selectedRegionId: id, selectedRegionName: name || '' }),

  fetchTree: async () => {
    const { data } = await api.get('/regions/tree')
    set({ regionTree: Array.isArray(data) ? data : data.data || [] })
  },

  fetchChildren: async (parentId?: number) => {
    const url = parentId ? `/regions?parentId=${parentId}` : '/regions'
    const { data } = await api.get(url)
    set({ children: Array.isArray(data) ? data : data.data || [] })
  },
}))
