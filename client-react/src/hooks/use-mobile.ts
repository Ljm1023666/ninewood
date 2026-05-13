/**
 * 项目仅面向 Windows 桌面端，不提供窄屏/移动端布局分支。
 * 保留 hook 名称以便 shadcn 侧栏等组件不改 API。
 */
export function useIsMobile() {
  return false
}
