export type CertWorkspacePanel =
  | 'dashboard'
  | 'center'
  | 'tournament'
  | 'resources'
  | 'community'
  | 'settings'
  | 'support'

export const CERT_WORKSPACE_NAV: {
  id: CertWorkspacePanel
  icon: string
  label: string
}[] = [
  { id: 'dashboard', icon: 'dashboard', label: '仪表盘' },
  { id: 'center', icon: 'verified', label: '认证中心' },
  { id: 'tournament', icon: 'workspace_premium', label: '技术锦标赛' },
  { id: 'resources', icon: 'inventory_2', label: '资源库' },
  { id: 'community', icon: 'groups', label: '精英社区' },
]

export const CERT_WORKSPACE_FOOTER_NAV: {
  id: CertWorkspacePanel
  icon: string
  label: string
}[] = [
  { id: 'settings', icon: 'settings', label: '设置' },
  { id: 'support', icon: 'help_outline', label: '支持' },
]
