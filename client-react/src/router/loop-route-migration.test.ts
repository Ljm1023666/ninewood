import { describe, expect, it } from 'vitest'
import { migrateLegacyLoopUrl } from './loop-route-migration'

describe('migrateLegacyLoopUrl', () => {
  it('迁移旧入口并原样保留查询参数', () => {
    expect(migrateLegacyLoopUrl('/path-search', '?q=wood&sort=recent')).toBe('/loops/accept?q=wood&sort=recent')
    expect(migrateLegacyLoopUrl('/services/abc', '?from=favorite')).toBe('/loops/offerings/abc?from=favorite')
    expect(migrateLegacyLoopUrl('/services', '?q=x')).toBe('/loops/discover?q=x')
  })

  it('旧 loops 筛选视图进入我的回，无参数进入发现回', () => {
    expect(migrateLegacyLoopUrl('/loops', '?mode=single&kinds=EARTH')).toBe('/loops/mine?mode=single&kinds=EARTH')
    expect(migrateLegacyLoopUrl('/loops')).toBe('/loops/discover')
  })
})
