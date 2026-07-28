#!/usr/bin/env node
/**
 * 注意力机制静态审计（产品时间主权 Phase 0）
 *
 * 默认警告模式：命中明确机制词或警告词时打印，exit 0。
 * ATTENTION_AUDIT_STRICT=1 时，明确机制词导致 exit 1（警告词仍不阻断）。
 *
 * 用法：node scripts/audit-attention-patterns.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strict = process.env.ATTENTION_AUDIT_STRICT === '1'

/** 明确机制：首版可阻断（strict） */
const BLOCK_PATTERNS = [
  '签到奖励',
  '连续登录',
  '开屏广告',
  '激励广告',
  '购买曝光',
  '付费置顶',
  '随机开包',
  '无限连播',
]

/** 仅警告：须在 PR 说明任务价值 */
const WARN_PATTERNS = ['粉丝', '热度', '榜单', '连续', '奖励', '推荐', '无限']

const SCAN_DIRS = [
  'client-react/src',
  'server/src',
]

const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.md'])

const SKIP_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '__snapshots__',
  'archive',
])

/** 审计脚本自身与规格文档中的禁止词示例不计入命中 */
const SKIP_FILE_SUBSTRINGS = [
  'audit-attention-patterns.mjs',
  'PRODUCT-TIME-SOVEREIGNTY',
  'PRODUCT-TIME-SOVEREIGNTY-REVIEW-CHECKLIST',
  'PRODUCT-TIME-SOVEREIGNTY-PHASE0-BASELINE',
]

function shouldSkipFile(rel) {
  const norm = rel.replace(/\\/g, '/')
  return SKIP_FILE_SUBSTRINGS.some((s) => norm.includes(s))
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(full, out)
    else if (INCLUDE_EXT.has(path.extname(ent.name))) out.push(full)
  }
  return out
}

function scanFile(filePath) {
  const rel = path.relative(root, filePath)
  if (shouldSkipFile(rel)) return { blocks: [], warns: [] }
  let text
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return { blocks: [], warns: [] }
  }
  const blocks = []
  const warns = []
  for (const p of BLOCK_PATTERNS) {
    if (text.includes(p)) blocks.push(p)
  }
  for (const p of WARN_PATTERNS) {
    if (text.includes(p)) warns.push(p)
  }
  return { blocks, warns, rel }
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)))
const blockHits = []
const warnHits = []

for (const f of files) {
  const r = scanFile(f)
  if (r.blocks?.length) blockHits.push({ file: r.rel, patterns: r.blocks })
  if (r.warns?.length) warnHits.push({ file: r.rel, patterns: r.warns })
}

console.log('[attention-audit] scanned files:', files.length)
console.log('[attention-audit] mode:', strict ? 'STRICT' : 'WARN')

if (blockHits.length) {
  console.log('\n=== 明确机制词命中（strict 时阻断）===')
  for (const h of blockHits) {
    console.log(`- ${h.file}: ${h.patterns.join(', ')}`)
  }
} else {
  console.log('\n明确机制词：无命中')
}

if (warnHits.length) {
  console.log('\n=== 警告词命中（须说明任务价值；不阻断）===')
  const capped = warnHits.slice(0, 40)
  for (const h of capped) {
    console.log(`- ${h.file}: ${[...new Set(h.patterns)].join(', ')}`)
  }
  if (warnHits.length > capped.length) {
    console.log(`... 另有 ${warnHits.length - capped.length} 个文件含警告词`)
  }
} else {
  console.log('\n警告词：无命中')
}

if (strict && blockHits.length > 0) {
  console.error('\n[attention-audit] STRICT 失败：发现明确机制词')
  process.exit(1)
}

console.log('\n[attention-audit] 完成（警告模式不因命中失败）')
process.exit(0)
