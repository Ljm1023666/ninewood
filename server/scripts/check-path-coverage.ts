/**
 * TASK-11 · P2 路径覆盖门禁（CI gate）
 *
 * 读取 seed-data/path-coverage-manifest.json，对每条查询核对：
 *   1. requiredPaths：每条路径在 active 需求池中 demandCount >= 1
 *   2. minActiveDemands：命中 requiredPaths（+ requiredFacets）的 active 需求数 >= 阈值
 *   3. requiredFacets： facets 必须能被满足（与 minActiveDemands 合并核对）
 *   4. excludePaths 数据卫生：命中 requiredPaths 的需求不得同时挂任一 excludePath
 *      （锁定「租车/出租车分离」等不回退）
 *
 * 任一失败 → exit 1（CI 门禁）。用法:
 *   npx tsx scripts/check-path-coverage.ts
 *   npx tsx scripts/check-path-coverage.ts --only=外包,打车,租车
 */
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MANIFEST_PATH = path.join(__dirname, '../../seed-data/path-coverage-manifest.json')
const prisma = new PrismaClient()

interface ManifestEntry {
  query: string
  requiredPaths: string[]
  requiredFacets?: string[]
  excludePaths?: string[]
  minActiveDemands: number
  notes?: string
}

const ACTIVE_WHERE = {
  stage: 'active' as const,
  status: { notIn: ['CLOSED', 'FROZEN', 'IN_PROGRESS'] },
}

type CheckRow = {
  query: string
  checks: { name: string; ok: boolean; detail: string }[]
}

async function checkEntry(e: ManifestEntry): Promise<CheckRow> {
  const checks: CheckRow['checks'] = []

  // 1. requiredPaths 存在性
  for (const rp of e.requiredPaths) {
    const c = await prisma.demand.count({ where: { ...ACTIVE_WHERE, paths: { has: rp } } })
    checks.push({
      name: `requiredPath ${rp}`,
      ok: c >= 1,
      detail: `active=${c}`,
    })
  }

  // 2+3. minActiveDemands（含 requiredFacets）
  const facets = e.requiredFacets ?? []
  const matchWhere =
    facets.length > 0
      ? { ...ACTIVE_WHERE, AND: [{ paths: { hasSome: e.requiredPaths } }, { paths: { hasEvery: facets } }] }
      : { ...ACTIVE_WHERE, paths: { hasSome: e.requiredPaths } }
  const activeCount = await prisma.demand.count({ where: matchWhere })
  checks.push({
    name: `minActiveDemands>=${e.minActiveDemands}${facets.length ? ` (+facets ${facets.join(',')})` : ''}`,
    ok: activeCount >= e.minActiveDemands,
    detail: `active=${activeCount}`,
  })

  // requiredFacets 自身存在性（即使 minActive 满足也单独确认 facet 在池中）
  for (const f of facets) {
    const c = await prisma.demand.count({ where: { ...ACTIVE_WHERE, paths: { has: f } } })
    checks.push({ name: `requiredFacet ${f}`, ok: c >= 1, detail: `active=${c}` })
  }

  // 4. excludePaths 数据卫生：命中 requiredPaths 的需求不得同时挂 excludePath
  const excludes = e.excludePaths ?? []
  if (excludes.length > 0) {
    const leak = await prisma.demand.count({
      where: { ...ACTIVE_WHERE, AND: [{ paths: { hasSome: e.requiredPaths } }, { paths: { hasSome: excludes } }] },
    })
    checks.push({
      name: `exclude hygiene (no ${excludes.join(',')} co-occurs)`,
      ok: leak === 0,
      detail: `leak=${leak}`,
    })
  }

  return { query: e.query, checks }
}

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const onlySet = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean))
    : null

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as { entries: ManifestEntry[] }
  const entries = onlySet
    ? manifest.entries.filter((e) => onlySet.has(e.query))
    : manifest.entries
  if (entries.length === 0) {
    console.error('无匹配 manifest 条目（检查 --only= 参数）')
    process.exit(1)
  }
  console.log(`路径覆盖门禁：${entries.length} 条查询${onlySet ? `（--only 子集）` : ''}\n`)

  let failures = 0
  for (const e of entries) {
    const row = await checkEntry(e)
    const allOk = row.checks.every((c) => c.ok)
    const tag = allOk ? '✓' : '✗'
    console.log(`${tag} [${e.query}]`)
    for (const c of row.checks) {
      console.log(`    ${c.ok ? '✓' : '✗'} ${c.name} — ${c.detail}`)
    }
    if (!allOk) failures++
  }

  console.log(`\n${failures === 0 ? '✅ 全部通过' : `✗ ${failures} 条查询未通过门禁`}`)
  if (failures > 0) process.exit(1)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
