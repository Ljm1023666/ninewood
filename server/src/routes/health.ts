import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { redis, connectRedis } from '../lib/redis.js'

const router = Router()

interface ServiceHealth {
  name: string
  port: number
  status: 'online' | 'offline' | 'error'
  responseTime: number
  error?: string
}

async function checkPostgres(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    return { name: 'PostgreSQL', port: 5432, status: 'online', responseTime: Date.now() - start }
  } catch (e: any) {
    return { name: 'PostgreSQL', port: 5432, status: 'offline', responseTime: Date.now() - start, error: e.message }
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    await connectRedis()
    const result = await redis.ping()
    if (result === 'PONG') {
      return { name: 'Redis', port: 6379, status: 'online', responseTime: Date.now() - start }
    }
    return { name: 'Redis', port: 6379, status: 'error', responseTime: Date.now() - start, error: 'unexpected response' }
  } catch (e: any) {
    return { name: 'Redis', port: 6379, status: 'offline', responseTime: Date.now() - start, error: e.message }
  }
}

async function checkHttp(name: string, url: string, port: number, timeout = 3000): Promise<ServiceHealth> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok || res.status < 500) {
      const elapsed = Date.now() - start
      return { name, port, status: 'online', responseTime: elapsed }
    }
    return { name, port, status: 'error', responseTime: Date.now() - start, error: `HTTP ${res.status}` }
  } catch (e: any) {
    const elapsed = Date.now() - start
    const msg = e.name === 'AbortError' ? '请求超时' : e.message
    return { name, port, status: 'offline', responseTime: elapsed, error: msg }
  }
}

router.get('/health/services', async (_req, res) => {
  const overallStart = Date.now()

  const results = await Promise.allSettled([
    checkPostgres(),
    checkRedis(),
    checkHttp('语义分类器', 'http://127.0.0.1:8001/health', 8001),
    checkHttp('Vite Dev Server', 'http://localhost:5174/', 5174, 2000),
  ])

  const expressCheck: ServiceHealth = {
    name: 'Express 服务器',
    port: 3001,
    status: 'online',
    responseTime: Date.now() - overallStart,
  }

  const services: ServiceHealth[] = [expressCheck]

  for (const r of results) {
    if (r.status === 'fulfilled') {
      services.push(r.value)
    } else {
      services.push({
        name: '内部检查失败',
        port: 0,
        status: 'error',
        responseTime: 0,
        error: r.reason?.message || String(r.reason),
      })
    }
  }

  const overallStatus = services.every((s) => s.status === 'online') ? 'healthy' : 'degraded'

  res.json({
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
    totalCheckTime: Date.now() - overallStart,
  })
})

export { router as healthRouter }
