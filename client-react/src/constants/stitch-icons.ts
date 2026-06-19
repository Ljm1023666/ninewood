/**
 * Stitch v3 页面矩阵 / 内部页图标（Material Symbols Outlined）
 * 与 _tmp/stitch/index.html 及各 stitch-*.html 保持一致
 */
export const STITCH_PAGE_ICONS = {
  'demand-create': 'edit_document',
  providers: 'person_search',
  'my-demands': 'assignment',
  orders: 'inventory_2',
  'cert-center': 'verified_user',
  messages: 'chat',
  settings: 'settings',
  profile: 'person',
  'card-pool': 'layers',
  circles: 'groups',
  'dead-pool': 'delete',
  'my-bids': 'gavel',
  'my-tags': 'sell',
  'my-tags-manage': 'sell',
  'certified-search': 'badge',
  search: 'search',
  licenses: 'description',
  'push-settings': 'notifications',
  welfare: 'favorite',
  'circles-list': 'diversity_3',
  'tag-stats': 'bar_chart',
  dashboard: 'dashboard',
  transactions: 'receipt_long',
  agent: 'smart_toy',
  'help-docs': 'menu_book',
  home: 'home',
  discover: 'explore',
} as const

export type StitchPageIconId = keyof typeof STITCH_PAGE_ICONS

/** Profile 页 Stitch 专用 */
export const STITCH_PROFILE_ICONS = {
  location: 'location_on',
  edit: 'edit',
  verified: 'verified_user',
  star: 'star',
  bolt: 'bolt',
  trending: 'trending_up',
  group: 'group',
  cert: 'workspace_premium',
  demands: 'description',
  favorites: 'favorite',
  orders: 'shopping_bag',
  chat: 'chat',
  settings: 'settings',
  message: 'chat',
} as const
