/**
 * TASK-11 · 路径检索池诊断（验收用）
 * 覆盖文档 §6 查询样例：外包 / 打车 / 租车 / 南京 租车
 * 用法: npx tsx scripts/_diag-path-pool.ts
 */
import { prisma } from '../src/lib/prisma.js'
import { resolveQueryToPaths, searchByPaths } from '../src/services/path-search.js'
import { parseSearchQuery } from '../src/services/path-search-query.js'

function line(s: string, n = 80): string {
  return s.padEnd(n, '=')
}

async function probeResolve(q: string) {
  const r = await resolveQueryToPaths(q)
  console.log(`\n${line(` resolve: ${q} `)}`)
  console.log('  status      :', r.status)
  console.log('  paths       :', r.paths)
  console.log('  intentPaths :', r.intentPaths)
  console.log('  facets      :', r.facets)
  console.log('  excludePaths:', r.excludePaths)
  console.log('  unresolved  :', r.unresolvedSegments)
  console.log('  suggestions :', r.suggestions)
  return r
}

async function probeSearch(q: string, limit = 5) {
  const r = await resolveQueryToPaths(q)
  if (r.paths.length === 0) {
    console.log(`\n[search ${q}] 无解析路径，跳过检索（status=${r.status}）`)
    return
  }
  const query = parseSearchQuery({ q, pathCount: r.paths.length, sort: 'cross_hit' })
  const s = await searchByPaths({
    paths: r.paths,
    facets: r.facets,
    intentPaths: r.intentPaths,
    excludePaths: r.excludePaths,
    page: 1,
    limit,
    query,
  })
  console.log(`\n${line(` search: ${q} `)}`)
  console.log('  total:', s.total, '| minHitRequired:', s.meta.minHitRequired, '| excludePaths:', s.meta.excludePaths)
  for (const d of s.items) {
    const row = await prisma.demand.findUnique({
      where: { id: d.id },
      select: { title: true, tags: true, paths: true },
    })
    console.log(`  - ${row?.title}`)
    console.log(`    tags:${JSON.stringify(row?.tags)} matched:${d.matchedPaths.join(',')}`)
    console.log(`    has租车tag:${row?.tags?.includes('租车') ?? false} has出租车tag:${row?.tags?.includes('出租车') ?? false}`)
  }
  return s
}

async function main() {
  // §6 样例：外包
  const r外包 = await probeResolve('外包')
  if (!r外包.paths.some((p) => p === 'tag:财务外包' || p === 'tag:客服外包')) {
    console.log('\n  ⚠️ 外包 未挂到 财务外包/客服外包')
  } else {
    console.log('\n  ✓ 外包 已挂到 财务外包/客服外包')
  }

  // 池内含「外包」的路径
  const tags = await prisma.$queryRaw<Array<{ p: string; c: number }>>`
    SELECT p, COUNT(*)::int AS c
    FROM "Demand" d, unnest(d.paths) p
    WHERE p LIKE '%外包%'
    GROUP BY p ORDER BY c DESC LIMIT 15
  `
  console.log('\n=== pool paths containing 外包 ===')
  console.log(tags)

  // §6 样例：打车（核心：网约车/叫车，排除出租车/包车/租车）
  await probeResolve('打车')
  const s打车 = await probeSearch('打车')
  if (s打车) {
    const leak = s打车.items.filter((d) => d.matchedPaths.includes('tag:出租车') || d.matchedPaths.includes('tag:租车'))
    console.log(leak.length === 0 ? '  ✓ 打车 结果未混入 出租车/租车' : `  ⚠️ 打车 结果混入 出租车/租车: ${leak.length} 条`)
  }

  // §6 样例：租车（应含 tag:租车，不含 tag:出租车）
  const r租车 = await probeResolve('租车')
  if (r租车.paths.includes('tag:租车') && !r租车.paths.includes('tag:出租车')) {
    console.log('\n  ✓ 租车 含 tag:租车 且不含 tag:出租车')
  } else {
    console.log('\n  ⚠️ 租车 解析异常:', r租车.paths)
  }
  if (r租车.excludePaths.includes('tag:出租车') && r租车.excludePaths.includes('tag:包车')) {
    console.log('  ✓ 租车 excludePaths 含 出租车/包车')
  } else {
    console.log('  ⚠️ 租车 excludePaths 缺失:', r租车.excludePaths)
  }
  const s租车 = await probeSearch('租车', 5)
  if (s租车) {
    const leak = s租车.items.filter(
      (d) =>
        d.matchedPaths.includes('tag:出租车') ||
        d.matchedPaths.includes('tag:包车') ||
        (d.title?.includes('出租车') ?? false),
    )
    console.log(
      leak.length === 0 ? '  ✓ 租车 结果未混入 出租车/包车' : `  ⚠️ 租车 结果泄漏: ${leak.length} 条`,
    )
  }

  // §6 样例：南京 租车（facets 含 rgn:320100，paths 含 tag:租车）
  const r南京租车 = await probeResolve('南京 租车')
  if (r南京租车.facets.includes('rgn:320100') && r南京租车.paths.includes('tag:租车')) {
    console.log('  ✓ 南京 租车 facets 含 rgn:320100 且 paths 含 tag:租车')
  } else {
    console.log('  ⚠️ 南京 租车 解析异常 facets:', r南京租车.facets, 'paths:', r南京租车.paths)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
