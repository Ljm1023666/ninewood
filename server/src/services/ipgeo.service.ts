/**
 * 简易 IP 地理位置服务
 * 生产环境可替换为 GeoLite2 / ipip.net 等付费数据库
 */

// 常见内网/本地 IP 映射
const LOCAL_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']

/** 从请求中提取客户端真实 IP */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]!.trim()
  if (Array.isArray(xff)) return xff[0]!.trim()
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') return realIp.trim()
  return req.socket.remoteAddress || '127.0.0.1'
}

/** 简单 IP → 城市映射（生产环境替换为真实数据库） */
export function ipToCity(ip: string): string {
  if (LOCAL_IPS.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return '本地'
  }
  // 返回 IP 前缀，后续可接入真实 IP 库替换
  return ip.split('.').slice(0, 2).join('.') + '.x.x'
}
