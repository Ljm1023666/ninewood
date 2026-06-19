import type { BlackScope, HandEntry } from '@/components/card-pool/types'

const DB_NAME = 'ninewood-card-pool'
const DB_VERSION = 1
const STORE = 'kv'
const GLOBAL_KEY = 'global-hand-v2'
const SHARED_FOCUS_KEY = 'ninewood.cardPool.sharedFocus.v1'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
  })
}

async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    tx.objectStore(STORE).put(value, key)
  })
  db.close()
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDb()
  const v = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const r = tx.objectStore(STORE).get(key)
    r.onsuccess = () => resolve(r.result as string | undefined)
    r.onerror = () => reject(r.error)
  })
  db.close()
  return v
}

/** 与牌桌状态机一致的焦点键（面包屑等） */
export function focusStorageKey(focus: BlackScope): string {
  return `${focus.path.join('/')}|${focus.leafFilter?.join(',') ?? ''}`
}

export type GlobalHandBundle = {
  hand: HandEntry[]
  discard: BlackScope[]
}

export async function loadGlobalHandBundle(): Promise<GlobalHandBundle | null> {
  try {
    const raw = await idbGet(GLOBAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GlobalHandBundle
    if (!Array.isArray(parsed.hand) || !Array.isArray(parsed.discard))
      return null
    return parsed
  } catch {
    return null
  }
}

export async function saveGlobalHandBundle(
  bundle: GlobalHandBundle,
): Promise<void> {
  try {
    await idbPut(GLOBAL_KEY, JSON.stringify(bundle))
  } catch {
    /* 忽略 */
  }
}

function isValidScopePayload(v: unknown): v is BlackScope {
  if (!v || typeof v !== 'object') return false
  const s = v as { path?: unknown; leafFilter?: unknown }
  if (!Array.isArray(s.path) || s.path.length === 0) return false
  if (!s.path.every((x) => typeof x === 'string' && x.length > 0)) return false
  if (
    !(
      s.leafFilter === null ||
      (Array.isArray(s.leafFilter) &&
        s.leafFilter.every((x) => typeof x === 'string'))
    )
  )
    return false
  return true
}

export function loadSharedCardPoolFocus(): BlackScope | null {
  try {
    const raw = localStorage.getItem(SHARED_FOCUS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!isValidScopePayload(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSharedCardPoolFocus(focus: BlackScope): void {
  try {
    localStorage.setItem(SHARED_FOCUS_KEY, JSON.stringify(focus))
  } catch {
    /* ignore */
  }
}
