import { describe, it, expect } from 'vitest'
import { derivePaths, parsePath, priceToBucket } from '@/utils/path-codec'

/** 与 server/src/__tests__/path-codec.test.ts 共享向量，保证双端 derivePaths 一致 */
describe('path-codec (client mirror)', () => {
  const base = {
    category: 'IT技术',
    taxonomyLeafId: 'oldvwf-react',
    serviceType: 'ONLINE' as const,
    minPrice: 800,
    regionId: 110105,
    isCertifiedOnly: true,
    tags: ['React', '前端'],
    tagsConfirmed: true,
  }

  it('全字段需求生成稳定路径集', () => {
    const paths = derivePaths(base)
    expect(paths).toContain('tx:oldvwf-react')
    expect(paths).toContain('cat:it技术')
    expect(paths).toContain('attr:servicetype=online')
    expect(paths).toContain('attr:certonly=true')
    expect(paths).toContain('bkt:price=500_1000')
    expect(paths).toContain('rgn:110105')
    expect(paths).toContain('tag:react')
    expect(paths).toContain('tag:前端')
  })

  it('parsePath 与 priceToBucket 边界', () => {
    expect(parsePath('TX:Oldvwf-React')?.raw).toBe('tx:oldvwf-react')
    expect(priceToBucket(800)).toBe('500_1000')
  })
})
