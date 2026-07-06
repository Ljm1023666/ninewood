/**
 * Bento Productivity Hub 导航 — 圈子 Hub 嵌套路由单源
 * 路径均在 /circles/:id/* 下，由 AppBentoSidebar 注入 circleId
 */

export type BentoNavItem = {
  key: string
  icon: string
  label: string
  path: string
  match: (pathname: string) => boolean
}

const circleBase = (circleId: string) => `/circles/${circleId}`

export function getBentoMainNav(circleId: string): BentoNavItem[] {
  const base = circleBase(circleId)
  return [
    {
      key: 'home',
      icon: 'home',
      label: '首页',
      path: `${base}/home`,
      match: (p) => p === `${base}/home`,
    },
    {
      key: 'community',
      icon: 'group',
      label: '圈子社区',
      path: `${base}/community`,
      match: (p) => p === base || p === `${base}/community`,
    },
    {
      key: 'resources',
      icon: 'folder',
      label: '资源文件',
      path: `${base}/resources`,
      match: (p) => p === `${base}/resources`,
    },
    {
      key: 'analytics',
      icon: 'insights',
      label: '分析数据',
      path: `${base}/analytics`,
      match: (p) => p === `${base}/analytics`,
    },
    {
      key: 'teams',
      icon: 'diversity_3',
      label: '我的团队',
      path: `${base}/teams`,
      match: (p) => p === `${base}/teams`,
    },
  ]
}

export function getBentoFooterNav(circleId: string): BentoNavItem[] {
  const base = circleBase(circleId)
  return [
    {
      key: 'help',
      icon: 'help',
      label: '帮助中心',
      path: `${base}/help`,
      match: (p) => p === `${base}/help`,
    },
  ]
}

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

export function getCommunityPath(circleId: string): string {
  return `${circleBase(circleId)}/community`
}

import { SUBPAGE_NAV } from '@/utils/subpage-nav'

/** @deprecated 使用 SUBPAGE_NAV；保留别名避免大范围重命名 */
export const HUB_SUBPAGE_NAV = SUBPAGE_NAV

/** Hub 壳层统一退出目标（Esc / 大退） */
export const HUB_EXIT_PATH = '/circles'
