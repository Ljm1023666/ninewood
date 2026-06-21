import { useLocation } from 'react-router-dom'

/**
 * Bento Productivity Hub 导航单源
 * → 取代原 CircleDetailBentoSidebar 里的 MAIN_NAV 硬编码
 * → active 根据路由计算，不再写死
 * → 匹配规则与 TASK-7 spec §2.3 一致：
 *   /circles → /circles + /circles/:id
 *   /card-pool → /card-pool + /card-pool/*
 *   /tag-stats → 精确
 *   /help → /help + /help/*
 *   /circles-list → 精确（Wave 1 保留 legacy 路由，Wave 3 再切 /teams）
 *   / → 仅匹配本身（主页不在 Bento shell 内，应为"离开"设计）
 */

export type BentoNavItem = {
  key: string
  icon: string
  label: string
  path: string
  match: (pathname: string) => boolean
}

const startsWith = (prefix: string) => (p: string) =>
  p === prefix || p.startsWith(`${prefix}/`)

const eq = (target: string) => (p: string) => p === target

export const BENTO_MAIN_NAV: BentoNavItem[] = [
  { key: 'home', icon: 'home', label: '首页', path: '/', match: eq('/') },
  {
    key: 'circles',
    icon: 'group',
    label: '圈子社区',
    path: '/circles',
    match: (p) => p === '/circles' || /^\/circles\/[^/]+$/.test(p),
  },
  {
    key: 'card-pool',
    icon: 'folder',
    label: '资源文件',
    path: '/card-pool',
    match: startsWith('/card-pool'),
  },
  {
    key: 'tag-stats',
    icon: 'insights',
    label: '分析数据',
    path: '/tag-stats',
    match: eq('/tag-stats'),
  },
  {
    key: 'my-teams',
    icon: 'diversity_3',
    label: '我的团队',
    path: '/circles-list',
    match: eq('/circles-list'),
  },
]

export const BENTO_FOOTER_NAV: BentoNavItem[] = [
  { key: 'help', icon: 'help', label: '帮助中心', path: '/help', match: startsWith('/help') },
]

export const BENTO_LOGOUT_NAV: BentoNavItem = {
  key: 'logout',
  icon: 'logout',
  label: '退出登录',
  path: '/login',
  match: () => false,
}

export function isBentoActive(item: BentoNavItem, pathname: string): boolean {
  return item.match(pathname)
}

/** 便捷 hook：返回当前 active 的 nav key（主区/页脚/退出） */
export function useBentoActiveKey(): string | null {
  const { pathname } = useLocation()
  for (const item of BENTO_MAIN_NAV) if (item.match(pathname)) return item.key
  for (const item of BENTO_FOOTER_NAV) if (item.match(pathname)) return item.key
  return null
}