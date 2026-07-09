/**
 * TASK-11 · P2 需求路径审计（只读报告，不修改数据）
 *
 * 扫描项：
 *   1. tag/paths 一致性：tagsConfirmed 需求的每个 tag 应有对应 tag:<norm> 路径
 *   2. 租车/出租车 混标：tags 或 paths 同时出现 租车 + 出租车（分离逻辑回退预警）
 *   3. 空 paths：active 需求 paths 为空（需 backfill）
 *   4. manifest exclude 泄漏：命中 requiredPaths 且同时挂 excludePath 的需求（信息项）
 *
 * 用法: npx tsx scripts/audit-demand-paths.ts
 */
import { PrismaClient } from '@prisma/client'
import { normalizeValue } from '../src/services/path-codec.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = path.join(__dirname, '../../seed-data/path-coverage-manifest.json')
const prisma = new PrismaClient()

const ACTIVE_WHERE = {
  stage: 'active' as const,
  status: { notIn: ['CLOSED', 'FROZEN', 'IN_PROGRESS'] },
}

async function main() {
  console.log('=== 需求路径审计（只读） ===\n')

  // 1. tag/paths 一致性
  const confirmed = await prisma.demand.findMany({
    where: { ...ACTIVE_WHERE, tagsConfirmed: true },
    select: { id: true, title: true, tags: true, paths: true },
    take: 5000,
  })
  let tagMismatch = 0
  const mismatchSamples: string[] = []
  for (const d of confirmed) {
    const pathSet = new Set(d.paths)
    for (const t of d.tags) {
      const raw = `tag:${normalizeValue(t)}`
      if (!pathSet.has(raw)) {
        tagMismatch++
        if (mismatchSamples.length < 15) {
          mismatchSamples.push(`  · [${d.id}] tag「${t}」缺路径 ${raw} — ${d.title.slice(0, 30)}`)
        }
      }
    }
  }
  console.log(`[1] tag/paths 一致性：扫描 ${confirmed.length} 条 tagsConfirmed 需求，缺失 ${tagMismatch} 处`)
  if (tagMismatch > 0) {
    console.log('    样例：')
    for (const s of mismatchSamples) console.log(s)
  }

  // 2. 租车/出租车 混标
  const mixByTags = await prisma.demand.count({
    where: { ...ACTIVE_WHERE, AND: [{ tags: { has: '租车' } }, { tags: { has: '出租车' } }] },
  })
  const mixByPaths = await prisma.demand.count({
    where: { ...ACTIVE_WHERE, AND: [{ paths: { has: 'tag:租车' } }, { paths: { has: 'tag:出租车' } }] },
  })
  console.log(`\n[2] 租车/出租车 混标：tags 同时含二者=${mixByTags}，paths 同时含二者=${mixByPaths}`)
  if (mixByTags > 0 || mixByPaths > 0) {
    console.log('    ⚠️ 存在混标，请检查是否回退了租车/出租车分离逻辑')
  } else {
    console.log('    ✓ 无混标')
  }

  // 3. 空 paths
  const emptyPaths = await prisma.demand.count({
    where: { ...ACTIVE_WHERE, OR: [{ paths: { isEmpty: true } }, { paths: { equals: [] } }] },
  })
  console.log(`\n[3] 空 paths 的 active 需求：${emptyPaths}${emptyPaths > 0 ? '（建议跑 backfill-demand-paths.ts --force）' : ' ✓'}`)

  // 4. manifest exclude 泄漏（信息项）
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
    entries: { query: string; requiredPaths: string[]; excludePaths?: string[] }[]
  }
  console.log('\n[4] manifest exclude 泄漏（命中 requiredPaths 且挂 excludePath）：')
  let anyLeak = false
  for (const e of manifest.entries) {
    const excludes = e.excludePaths ?? []
    if (excludes.length === 0) continue
    const leak = await prisma.demand.count({
      where: { ...ACTIVE_WHERE, AND: [{ paths: { hasSome: e.requiredPaths } }, { paths: { hasSome: excludes } }] },
    })
    const flag = leak > 0 ? '⚠️' : '✓'
    console.log(`    ${flag} [${e.query}] leak=${leak} (excludes: ${excludes.join(',')})`)
    if (leak > 0) anyLeak = true
  }
  if (!anyLeak) console.log('    ✓ 无 exclude 泄漏')

  console.log('\n=== 审计完成 ===')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
