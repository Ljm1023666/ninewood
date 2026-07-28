#!/usr/bin/env node
/**
 * 产品时间主权 Phase 0：只读聚合基线
 *
 * - 仅输出计数与调用面清单，不读取媒体 URL、私信、需求正文、排除词内容
 * - 有 DATABASE_URL 时调用 server/scripts/phase0-db-baseline.ts
 * - 写入 docs/specs/PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md
 *
 * 用法：node scripts/audit-time-sovereignty-baseline.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'docs/specs/PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE.md')

/** 本地跑基线时尝试加载 server/.env（不打印其中任何密钥） */
function loadServerEnvFile() {
  const envPath = path.join(root, 'server', '.env')
  if (!fs.existsSync(envPath) || process.env.DATABASE_URL) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[1].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    process.env.DATABASE_URL = v
    break
  }
}
loadServerEnvFile()

function countFilesMatching(dir, predicate, acc = { files: 0, hits: [] }) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'archive') continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) countFilesMatching(full, predicate, acc)
    else if (/\.(ts|tsx|js|mjs)$/.test(ent.name)) {
      const text = fs.readFileSync(full, 'utf8')
      if (predicate(text, full)) {
        acc.files += 1
        acc.hits.push(path.relative(root, full).replace(/\\/g, '/'))
      }
    }
  }
  return acc
}

function listCallSites(label, needles) {
  const pred = (text) => needles.some((n) => text.includes(n))
  const server = countFilesMatching(path.join(root, 'server/src'), pred)
  const client = countFilesMatching(path.join(root, 'client-react/src'), pred)
  return {
    label,
    serverFiles: server.files,
    clientFiles: client.files,
    sample: [...server.hits, ...client.hits].slice(0, 25),
  }
}

function dbAggregates() {
  if (!process.env.DATABASE_URL) {
    return { available: false, reason: 'DATABASE_URL 未设置；跳过数据库聚合' }
  }
  const r = spawnSync(
    'pnpm',
    ['exec', 'tsx', 'scripts/phase0-db-baseline.ts'],
    {
      cwd: path.join(root, 'server'),
      env: process.env,
      encoding: 'utf8',
      shell: true,
    },
  )
  const out = (r.stdout || '').trim()
  if (!out) {
    return {
      available: false,
      reason: (r.stderr || `exit ${r.status}`).slice(0, 500),
    }
  }
  try {
    return JSON.parse(out.split('\n').filter(Boolean).pop())
  } catch {
    return { available: false, reason: `无法解析 DB 输出: ${out.slice(0, 200)}` }
  }
}

const callSites = [
  listCallSites('Short / shorts', ['shortsRouter', 'prisma.short', '/api/shorts', 'model Short']),
  listCallSites('PushPreference / push-engine', [
    'pushPreference',
    'PushPreference',
    'shouldReceivePush',
    'receivePushes',
  ]),
  listCallSites('Follow', ['prisma.follow', '/follow', 'followers', 'following']),
  listCallSites('snatchCredits / snatch', [
    'snatchCredits',
    '/snatch',
    'snatchLimiter',
    'startSnatchResetCron',
  ]),
  listCallSites('CardPool（前端工作集）', [
    'card-pool',
    'CardPool',
    'HandPile',
    'PackOpening',
    'ninewood.cardPool',
  ]),
]

const db = dbAggregates()
const generatedAt = new Date().toISOString()
const lines = []
lines.push('# 产品时间主权 · Phase 0 聚合基线')
lines.push('')
lines.push(`> 生成时间：${generatedAt}`)
lines.push('> 只读聚合；不含媒体内容、排除词原文、私信或需求正文。')
lines.push(
  '> **不得**将 `receivePushes=true` / 无 PushPreference 记录解释为对未来通知类别的永久同意。',
)
lines.push('')
lines.push('## 1. 数据库聚合')
lines.push('')
if (!db.available) {
  lines.push(`- 状态：不可用（${db.reason}）`)
  lines.push('- 影响：Phase 1 迁移前请在可连本地库的环境重跑本脚本补齐计数。')
} else {
  lines.push('| 指标 | 值 |')
  lines.push('|------|-----|')
  lines.push(`| Short 行数 | ${db.shortCount} |`)
  lines.push(`| Short 去重作者数 | ${db.shortDistinctAuthors} |`)
  lines.push(`| Follow 行数 | ${db.followCount} |`)
  lines.push(`| PushPreference 行数 | ${db.pushPrefCount} |`)
  lines.push(`| receivePushes=true | ${db.receivePushesTrue} |`)
  lines.push(`| receivePushes=false | ${db.receivePushesFalse} |`)
  lines.push(`| 用户总数 | ${db.usersTotal} |`)
  lines.push(`| snatchCredits>0 用户数 | ${db.usersWithSnatchCreditsGt0} |`)
  lines.push(`| snatchCredits 合计 | ${db.snatchCreditsSum} |`)
  lines.push(`| snatchCredits 均值 | ${db.snatchCreditsAvg ?? 'n/a'} |`)
  lines.push('')
  lines.push('### pushFrequency 分布')
  lines.push('')
  lines.push('```json')
  lines.push(JSON.stringify(db.pushFrequency || {}, null, 2))
  lines.push('```')
  lines.push('')
  lines.push('### 排除列表长度分桶（不读内容）')
  lines.push('')
  lines.push('```json')
  lines.push(
    JSON.stringify(
      {
        keywords: db.excludeKeywordLenBuckets,
        tags: db.excludeTagLenBuckets,
        regions: db.excludeRegionLenBuckets,
      },
      null,
      2,
    ),
  )
  lines.push('```')
  if (db.shortCount > 0) {
    lines.push('')
    lines.push(
      '> 风险：存在 Short 行。删除前须独立产品签字（M3），并提供导出/下架窗口；Phase 0 仅隔离路由。',
    )
  } else {
    lines.push('')
    lines.push('> Short 聚合为 0：删除评审可优先排期，仍须 M3 独立签字。')
  }
}
lines.push('')
lines.push('## 2. 代码调用面（文件数）')
lines.push('')
for (const c of callSites) {
  lines.push(`### ${c.label}`)
  lines.push('')
  lines.push(`- server：${c.serverFiles} 文件；client：${c.clientFiles} 文件`)
  lines.push('- 样例路径：')
  for (const s of c.sample) lines.push(`  - \`${s}\``)
  lines.push('')
}
lines.push('## 3. CardPool 说明')
lines.push('')
lines.push(
  '- Prisma **无** CardPool 表；手牌/焦点持久化在浏览器 `localStorage`（`ninewood.cardPool.*`）。',
)
lines.push('- Phase 0 仅记录调用面；去随机奖励文案与「开包→展开分类」属 Phase 2。')
lines.push('')
lines.push('## 4. Phase 1 通知迁移前基线结论')
lines.push('')
lines.push(
  '- 现行决策：`push-engine.shouldReceivePush` — 无记录则 **accept:true**；`receivePushes` 默认 true。',
)
lines.push('- `pushFrequency` 已存库但引擎未执行频率/安静时段/每日上限（规格 G-02）。')
lines.push(
  '- Phase 1 必须新建 NotificationPolicy/Subscription；旧默认开启 **不能** 映射为 USER_REQUESTED/DIGEST/RELATIONSHIP 的永久开启。',
)
lines.push('- 交易必要通知另案默认保留；本基线不授权扩大营销类触达。')
lines.push('')
lines.push('## 5. snatch / Follow 兼容风险')
lines.push('')
lines.push(
  '- `snatchCredits` 仍被 demand snatch、认证权益文案、cron 月度重置使用；改承接容量前需兼容 API 字段。',
)
lines.push('- Follow 仍支撑粉丝列表、群聊联系人；短视频 follow tab 已随路由隔离。改语义勿先删表。')
lines.push('')

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
console.log('[phase0-baseline] wrote', path.relative(root, outPath))
console.log('[phase0-baseline] db.available =', db.available)
process.exit(0)
