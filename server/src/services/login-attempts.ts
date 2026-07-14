/**
 * 登录失败计数与临时锁定（H15）
 * 优先 Redis；不可用时回退内存 Map（单进程开发环境）
 */

import { getCache, setCache, delCache } from '../lib/redis.js'

const MAX_FAILURES = 5
const LOCK_MS = 15 * 60 * 1000
const KEY_PREFIX = 'login:fail:'

type AttemptState = {
  fails: number
  lockedUntil?: number
}

const memory = new Map<string, AttemptState>()

function normalizeKey(accountKey: string): string {
  return accountKey.trim().toLowerCase()
}

async function readState(key: string): Promise<AttemptState | null> {
  const cached = await getCache<AttemptState>(`${KEY_PREFIX}${key}`)
  if (cached) return cached
  return memory.get(key) ?? null
}

async function writeState(key: string, state: AttemptState): Promise<void> {
  memory.set(key, state)
  await setCache(`${KEY_PREFIX}${key}`, state, Math.ceil(LOCK_MS / 1000))
}

async function removeState(key: string): Promise<void> {
  memory.delete(key)
  await delCache(`${KEY_PREFIX}${key}`)
}

export async function assertLoginNotLocked(accountKey: string): Promise<void> {
  const key = normalizeKey(accountKey)
  const state = await readState(key)
  if (state?.lockedUntil && state.lockedUntil > Date.now()) {
    throw {
      status: 429,
      message: '登录尝试过多，请 15 分钟后再试',
    }
  }
}

export async function recordLoginFailure(accountKey: string): Promise<void> {
  const key = normalizeKey(accountKey)
  const state = (await readState(key)) ?? { fails: 0 }
  const fails = state.fails + 1
  const next: AttemptState = { fails }
  if (fails >= MAX_FAILURES) {
    next.lockedUntil = Date.now() + LOCK_MS
  }
  await writeState(key, next)
}

export async function clearLoginFailures(accountKey: string): Promise<void> {
  await removeState(normalizeKey(accountKey))
}
