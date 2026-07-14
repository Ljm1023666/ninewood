/**
 * 毕设展示页截图脚本
 * 用法: node scripts/capture-thesis-screenshots.mjs
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs', 'archive', 'designs', 'thesis-demo-screenshots')
const BASE_URL = 'http://localhost:3080'
const API_URL = 'http://localhost:3001/api'

const VIEWPORT = { width: 1440, height: 900 }

/** @type {{ file: string; path: string; title: string; auth?: 'user' | 'admin' | 'none'; waitMs?: number; readySelector?: string }[]} */
const PAGES = [
  { file: '01-login.png', path: '/login', title: '登录页', auth: 'none', readySelector: 'text=欢迎回来' },
  { file: '02-discover.png', path: '/', title: '发现页（星空发现）', auth: 'none', waitMs: 3000 },
  { file: '03-demand-create.png', path: '/demands/create', title: '发布需求', auth: 'user', waitMs: 2000 },
  { file: '04-my-demands.png', path: '/my-demands', title: '我的需求', auth: 'user', waitMs: 1500 },
  { file: '05-orders.png', path: '/orders', title: '订单列表', auth: 'user', waitMs: 1500 },
  { file: '06-messages.png', path: '/messages', title: '消息中心', auth: 'user', waitMs: 1500 },
  { file: '07-circles.png', path: '/circles', title: '需求圈子', auth: 'user', waitMs: 1500 },
  { file: '08-card-pool.png', path: '/card-pool', title: '卡池桌面', auth: 'user', waitMs: 2500 },
  { file: '09-tag-stats.png', path: '/tag-stats', title: '市场分析', auth: 'user', waitMs: 2000 },
  { file: '10-agent-chat.png', path: '/agent', title: 'AI 助手', auth: 'user', waitMs: 2000 },
  { file: '11-wallet.png', path: '/wallet', title: '钱包与充值', auth: 'user', waitMs: 1500 },
  { file: '12-cert-center.png', path: '/cert-center', title: '认证中心', auth: 'user', waitMs: 1500 },
  { file: '13-help.png', path: '/help', title: '帮助中心', auth: 'user', waitMs: 1500 },
  { file: '14-admin-dashboard.png', path: '/dashboard', title: '管理后台', auth: 'admin', waitMs: 2000 },
  { file: '15-path-search.png', path: '/path-search', title: '路径搜索', auth: 'none', waitMs: 2000 },
]

async function login(phone, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`登录失败 ${phone}: ${res.status} ${text}`)
  }
  const body = await res.json()
  const token = body?.data?.token
  if (!token) throw new Error(`登录响应缺少 token: ${JSON.stringify(body).slice(0, 200)}`)
  return token
}

async function createContext(browser, token) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  })
  if (token) {
    await context.addInitScript((t) => {
      localStorage.setItem('token', t)
    }, token)
  }
  return context
}

async function capture(page, item) {
  const url = `${BASE_URL}${item.path}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })

  if (item.readySelector) {
    await page.waitForSelector(item.readySelector, { timeout: 15000 }).catch(() => {})
  }
  await page.waitForTimeout(item.waitMs ?? 1000)

  const outPath = path.join(OUT_DIR, item.file)
  await page.screenshot({ path: outPath, fullPage: false })
  return outPath
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const userToken = await login('13901001002', '1')
  const adminToken = await login('13800000000', '1')

  const browser = await chromium.launch({ headless: true })
  const manifest = []

  // 公开页面
  {
    const context = await createContext(browser, null)
    const page = await context.newPage()
    for (const item of PAGES.filter((p) => p.auth === 'none' && p.path !== '/path-search')) {
      manifest.push({ ...item, saved: await capture(page, item) })
    }
    await context.close()
  }

  // 普通用户页面
  {
    const context = await createContext(browser, userToken)
    const page = await context.newPage()
    for (const item of PAGES.filter((p) => p.auth === 'user')) {
      manifest.push({ ...item, saved: await capture(page, item) })
    }
    await context.close()
  }

  // 管理后台
  {
    const context = await createContext(browser, adminToken)
    const page = await context.newPage()
    const item = PAGES.find((p) => p.auth === 'admin')
    manifest.push({ ...item, saved: await capture(page, item) })
    await context.close()
  }

  // 路径搜索（无需登录，单独 Layout）
  {
    const context = await createContext(browser, null)
    const page = await context.newPage()
    const item = PAGES.find((p) => p.path === '/path-search')
    manifest.push({ ...item, saved: await capture(page, item) })
    await context.close()
  }

  await browser.close()

  manifest.sort((a, b) => a.file.localeCompare(b.file))

  const readme = [
    '# 九木毕设展示截图',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `视口：${VIEWPORT.width}×${VIEWPORT.height}`,
    '',
    '| 文件 | 页面 | 路由 |',
    '|------|------|------|',
    ...manifest.map((m) => `| ${m.file} | ${m.title} | \`${m.path}\` |`),
    '',
    '测试账号：普通用户 `13901001002` / 管理员 `13800000000`，密码均为 `1`。',
    '',
    '重新生成：`node scripts/capture-thesis-screenshots.mjs`（需先 `pnpm run dev`）',
  ].join('\n')

  await writeFile(path.join(OUT_DIR, 'README.md'), readme, 'utf8')

  console.log(`\n已保存 ${manifest.length} 张截图到:\n${OUT_DIR}\n`)
  for (const m of manifest) {
    console.log(`  ✓ ${m.file} — ${m.title}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
