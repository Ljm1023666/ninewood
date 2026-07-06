import type { NavigateFunction } from 'react-router-dom'

/** 壳层内 Tab / 侧栏切换：replace，避免历史栈在子页间堆积 */
export const SUBPAGE_NAV = { replace: true } as const

type SubpageShell = {
  /** 是否处于该壳层内（含子路由） */
  isInside: (pathname: string) => boolean
  /** 侧栏 Tab 切换是否应 replace（通常为壳层内子页） */
  shouldReplaceSwitch: (pathname: string) => boolean
  /** Esc / 返回键的「大退」目标；返回 null 则走 navigate(-1) */
  getExitPath: (pathname: string) => string | null
}

const SETTINGS_PATHS = new Set([
  '/settings',
  '/push-settings',
  '/my-tags-manage',
])

function isSettingsPath(pathname: string): boolean {
  return SETTINGS_PATHS.has(pathname)
}

function isCircleHubPath(pathname: string): boolean {
  return /^\/circles\/[^/]+(\/.*)?$/.test(pathname)
}

function isMessagesThreadPath(pathname: string): boolean {
  return (
    pathname.startsWith('/messages/') && pathname !== '/messages/new-group'
  )
}

const SUBPAGE_SHELLS: SubpageShell[] = [
  {
    isInside: isCircleHubPath,
    shouldReplaceSwitch: isCircleHubPath,
    getExitPath: () => '/circles',
  },
  {
    isInside: isSettingsPath,
    shouldReplaceSwitch: isSettingsPath,
    getExitPath: () => '/profile',
  },
  {
    isInside: (pathname) =>
      pathname === '/messages' || isMessagesThreadPath(pathname),
    shouldReplaceSwitch: isMessagesThreadPath,
    getExitPath: (pathname) =>
      isMessagesThreadPath(pathname) ? '/messages' : '/',
  },
]

function findShell(pathname: string): SubpageShell | null {
  return SUBPAGE_SHELLS.find((shell) => shell.isInside(pathname)) ?? null
}

/** 当前路径是否在某个子页壳层内 */
export function isSubpageShell(pathname: string): boolean {
  return findShell(pathname) !== null
}

/** Esc / 大退：壳层内跳到统一出口，否则 history.back */
export function getSubpageExitPath(pathname: string): string | null {
  return findShell(pathname)?.getExitPath(pathname) ?? null
}

export function navigateSubpageExit(
  navigate: NavigateFunction,
  pathname: string,
): void {
  const exit = getSubpageExitPath(pathname)
  if (exit) navigate(exit)
  else navigate(-1)
}

/** 壳层内 Tab 切换；跨壳层进入仍 push */
export function navigateSubpageSwitch(
  navigate: NavigateFunction,
  targetPath: string,
  currentPathname: string,
): void {
  const shell = findShell(currentPathname)
  const enteringShell = findShell(targetPath)
  if (
    shell &&
    enteringShell &&
    shell === enteringShell &&
    shell.shouldReplaceSwitch(currentPathname)
  ) {
    navigate(targetPath, SUBPAGE_NAV)
    return
  }
  navigate(targetPath)
}
