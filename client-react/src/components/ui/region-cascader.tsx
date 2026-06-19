'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { cn } from '@/lib/utils'

interface RegionNode {
  id: number
  name: string
  level: number
  parentId: number
  children?: RegionNode[]
}

interface RegionCascaderProps {
  value?: number
  onChange?: (regionId: number, region: RegionNode) => void
  placeholder?: string
  className?: string
}

const PARENT_ID_CHINA = 100000

function getApiBaseURL(): string {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'http://localhost:3001/api'
  }
  return '/api'
}

async function fetchRegions(parentId: number): Promise<RegionNode[]> {
  const res = await fetch(
    `${getApiBaseURL()}/regions?parentId=${parentId}`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json.code === 200) return json.data as RegionNode[]
  throw new Error(json.message || '获取地区数据失败')
}

export function RegionCascader({
  value,
  onChange,
  className,
}: RegionCascaderProps) {
  const [provinces, setProvinces] = useState<RegionNode[]>([])
  const [cities, setCities] = useState<RegionNode[]>([])
  const [districts, setDistricts] = useState<RegionNode[]>([])

  const [selectedProvinceId, setSelectedProvinceId] = useState<
    number | undefined
  >()
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>()
  const [selectedDistrictId, setSelectedDistrictId] = useState<
    number | undefined
  >()

  const [loadingProvince, setLoadingProvince] = useState(true)
  const [loadingCity, setLoadingCity] = useState(false)
  const [loadingDistrict, setLoadingDistrict] = useState(false)

  // Track previous value to detect external changes
  const prevValueRef = useRef(value)

  // 1. 加载省份列表（仅挂载时）
  useEffect(() => {
    setLoadingProvince(true)
    fetchRegions(PARENT_ID_CHINA)
      .then(setProvinces)
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProvince(false))
  }, [])

  // 2. 选中省后加载市列表
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([])
      return
    }
    setLoadingCity(true)
    setSelectedCityId(undefined)
    setSelectedDistrictId(undefined)
    setDistricts([])
    fetchRegions(selectedProvinceId)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoadingCity(false))
  }, [selectedProvinceId])

  // 3. 选中市后加载区县列表
  useEffect(() => {
    if (!selectedCityId) {
      setDistricts([])
      return
    }
    setLoadingDistrict(true)
    setSelectedDistrictId(undefined)
    fetchRegions(selectedCityId)
      .then(setDistricts)
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistrict(false))
  }, [selectedCityId])

  // 4. 外部 value 变化（如重置）时重新加载整条链路
  useEffect(() => {
    if (value === prevValueRef.current) return
    prevValueRef.current = value
    if (value !== selectedDistrictId) {
      setSelectedProvinceId(undefined)
      setSelectedCityId(undefined)
      setSelectedDistrictId(undefined)
      setCities([])
      setDistricts([])
    }
  }, [value])

  const handleProvinceChange = (val: string) => {
    setSelectedProvinceId(Number(val))
  }

  const handleCityChange = (val: string) => {
    setSelectedCityId(Number(val))
  }

  const handleDistrictChange = (val: string) => {
    const id = Number(val)
    setSelectedDistrictId(id)
    if (onChange) {
      const district = districts.find((d) => d.id === id)
      if (district) onChange(id, district)
    }
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {/* 省 */}
      <Select
        value={selectedProvinceId?.toString() || ''}
        onValueChange={handleProvinceChange}
      >
        <SelectTrigger className="min-w-[120px]">
          <SelectValue placeholder="省份" />
        </SelectTrigger>
        <SelectContent>
          {loadingProvince ? (
            <SelectItem value="loading-province" disabled>
              加载中...
            </SelectItem>
          ) : provinces.length === 0 ? (
            <SelectItem value="empty-province" disabled>
              暂无数据
            </SelectItem>
          ) : (
            provinces.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* 市 */}
      <Select
        value={selectedCityId?.toString() || ''}
        onValueChange={handleCityChange}
        disabled={!selectedProvinceId}
      >
        <SelectTrigger className="min-w-[120px]">
          <SelectValue placeholder="城市" />
        </SelectTrigger>
        <SelectContent>
          {loadingCity ? (
            <SelectItem value="loading-city" disabled>
              加载中...
            </SelectItem>
          ) : cities.length === 0 ? (
            <SelectItem value="empty-city" disabled>
              暂无数据
            </SelectItem>
          ) : (
            cities.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* 区县 */}
      <Select
        value={selectedDistrictId?.toString() || ''}
        onValueChange={handleDistrictChange}
        disabled={!selectedCityId}
      >
        <SelectTrigger className="min-w-[120px]">
          <SelectValue placeholder="区县" />
        </SelectTrigger>
        <SelectContent>
          {loadingDistrict ? (
            <SelectItem value="loading-district" disabled>
              加载中...
            </SelectItem>
          ) : districts.length === 0 ? (
            <SelectItem value="empty-district" disabled>
              暂无数据
            </SelectItem>
          ) : (
            districts.map((d) => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
