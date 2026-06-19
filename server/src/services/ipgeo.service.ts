/**
 * IP 属地服务 — 从 IP 解析城市/省份
 * 优先使用内置 Region 表，开发环境直接走 IP→cityCode→城市名
 */
import { prisma } from '../lib/prisma.js'

const LOCAL_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']

// IP 段 → cityCode 快速映射（常见城市运营商IP段）
const IP_CITY_MAP: [string[], string][] = [
  [['1.','2.','3.','4.','5.','8.','9.'], '110000'],   // 北京
  [['101.','124.','180.','183.','222.'], '310000'],      // 上海
  [['113.','116.','119.','120.','121.','183.'], '440100'],// 广州
  [['113.','183.','210.'], '440300'],                      // 深圳
  [['115.','122.','125.','183.','218.'], '330100'],       // 杭州
  [['110.','118.','125.','171.','182.','222.'], '510100'],// 成都
  [['106.','113.','119.','122.','125.','183.'], '500000'],// 重庆
  [['111.','113.','119.','171.','221.'], '420100'],       // 武汉
  [['114.','117.','121.','122.','180.','221.','223.'], '320100'],// 南京
  [['113.','117.','124.','210.'], '610100'],              // 西安
  [['111.','117.','125.','221.'], '120000'],              // 天津
  [['113.','175.','222.'], '430100'],                     // 长沙
  [['115.','123.','125.','171.','222.'], '410100'],       // 郑州
  [['112.','119.','123.','124.','140.','144.'], '370200'],// 青岛
  [['112.','116.','183.','220.'], '530100'],              // 昆明
  [['114.','121.','122.','180.','221.'], '320500'],       // 苏州
  [['110.','117.','120.','121.','125.','222.'], '350200'],// 厦门
  [['113.','119.','123.','124.','175.','210.','218.'], '210100'],// 沈阳
  [['113.','122.','123.','125.','218.','220.','221.'], '230100'],// 哈尔滨
  [['125.','218.','220.'], '350100'],                     // 福州
]

const ipCache = new Map<string, { region: string; ts: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } }): string {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0]!.trim()
  if (Array.isArray(xff)) return xff[0]!.trim()
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') return realIp.trim()
  return req.socket.remoteAddress || '127.0.0.1'
}

export async function resolveIpRegion(ip: string): Promise<string> {
  if (LOCAL_IPS.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return '本地开发'
  }

  // 检查缓存
  const cached = ipCache.get(ip)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.region

  // IP 段匹配
  const prefix = ip.split('.')[0]
  for (const [prefixes, cityCode] of IP_CITY_MAP) {
    if (prefixes.some(p => ip.startsWith(p))) {
      const region = await prisma.region.findUnique({ where: { id: parseInt(cityCode) } })
      const name = region?.name?.replace(/市$/, '') || cityCode
      ipCache.set(ip, { region: name, ts: Date.now() })
      return name
    }
  }

  // 兜底：在线查询
  try {
    const name = await queryIpApiOnline(ip)
    ipCache.set(ip, { region: name, ts: Date.now() })
    return name
  } catch {
    const fallback = '未知'
    ipCache.set(ip, { region: fallback, ts: Date.now() })
    return fallback
  }
}

async function queryIpApiOnline(ip: string): Promise<string> {
  const resp = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN&fields=regionName,city`, { signal: AbortSignal.timeout(3000) })
  const data = await resp.json() as any
  if (data.city) return data.city
  if (data.regionName) return data.regionName
  throw new Error('无结果')
}
