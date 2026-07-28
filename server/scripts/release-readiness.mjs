import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const production = process.argv.includes('--production')
const failures = []
const warnings = []

const required = production
  ? ['JWT_SECRET', 'ADMIN_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM']
  : []
for (const name of required) {
  if (!process.env[name]?.trim()) failures.push(`缺少 ${name}`)
}

for (const [name, expected] of [
  ['IDEMPOTENCY_REQUIRED', '1'],
  ['FEE_QUOTE_REQUIRED', '1'],
  ['NOTIFICATION_SOVEREIGNTY_ENABLED', '1'],
  ['TASK_QUIET_ENABLED', '1'],
  ['OUTCOME_METRICS_ENABLED', '1'],
]) {
  if (production && process.env[name] !== expected) failures.push(`${name} 必须为 ${expected}`)
  else if (!production && process.env[name] !== expected) warnings.push(`${name} 当前不是 ${expected}`)
}

const prismaCli = fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url))
const migration = spawnSync(process.execPath, [prismaCli, 'migrate', 'status'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
  shell: false,
  env: process.env,
})
if (migration.status !== 0 || !migration.stdout.includes('Database schema is up to date')) {
  failures.push('数据库 migration status 未确认最新')
}

console.log(`[release-readiness] mode=${production ? 'production' : 'local'}`)
for (const warning of warnings) console.warn(`[WARN] ${warning}`)
for (const failure of failures) console.error(`[FAIL] ${failure}`)
if (failures.length) process.exit(1)
console.log('[release-readiness] PASS')
