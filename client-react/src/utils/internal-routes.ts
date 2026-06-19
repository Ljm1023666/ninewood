/** 不铺 Layout 用户封面氛围层的内部页路由 */
const INTERNAL_AMBIENT_PREFIXES = [
  '/settings',
  '/push-settings',
  '/my-tags-manage',
  '/orders',
  '/my-demands',
  '/my-bids',
  '/transactions',
  '/cert-center',
  '/messages',
  '/circles',
  '/search',
  '/providers',
  '/help',
  '/privacy',
  '/terms',
  '/licenses',
  '/profile',
  '/follows',
  '/welfare',
  '/dashboard',
  '/agent',
  '/filters-preview',
  '/card-pool',
  '/new-group',
  '/tag-stats',
  '/certified-search',
  '/circle-list',
  '/my-tags',
] as const

export function suppressLayoutAmbient(pathname: string): boolean {
  if (
    pathname === '/demands/create' ||
    pathname.startsWith('/demands/create/')
  ) {
    return true
  }
  return INTERNAL_AMBIENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
