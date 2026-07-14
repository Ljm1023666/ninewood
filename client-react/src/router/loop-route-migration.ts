export function migrateLegacyLoopUrl(pathname: string, search = ''): string {
  if (pathname === '/path-search') return `/loops/accept${search}`
  if (pathname === '/services') return `/loops/discover${search}`
  if (pathname.startsWith('/services/')) {
    return `/loops/offerings/${pathname.slice('/services/'.length)}${search}`
  }
  if (pathname === '/loops') return `${search ? '/loops/mine' : '/loops/discover'}${search}`
  return `${pathname}${search}`
}
