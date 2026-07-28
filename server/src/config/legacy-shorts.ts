/**
 * Legacy 短视频 Feed（/api/shorts）闸门。
 * 生产永远关闭；非生产仅当 ENABLE_LEGACY_SHORTS=1 时挂载，便于本地回归旧路由。
 * 退出条件：Short 表经独立产品签字删除（见 PRODUCT-TIME-SOVEREIGNTY M3）后移除此 flag。
 */
export function isLegacyShortsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.ENABLE_LEGACY_SHORTS === '1'
}
