import { describe, it, expect } from 'vitest'
import { priceFacetFromText, priceFacetRaw } from '../services/price-facet-resolve.js'

describe('priceFacetRaw', () => {
  it('金额分桶与 derivePaths 一致', () => {
    expect(priceFacetRaw(500)).toBe('bkt:price=100_500')
    expect(priceFacetRaw(1000)).toBe('bkt:price=500_1000')
    expect(priceFacetRaw(0)).toBe('bkt:price=0_100')
    expect(priceFacetRaw(99999)).toBe('bkt:price=20000_plus')
  })
})

describe('priceFacetFromText · 预算短语识别', () => {
  it('预算500 → bkt:price=100_500', () => {
    expect(priceFacetFromText('预算500')).toBe('bkt:price=100_500')
  })

  it('预算500元', () => {
    expect(priceFacetFromText('预算500元')).toBe('bkt:price=100_500')
  })

  it('预算 500（带空格）', () => {
    expect(priceFacetFromText('预算 500')).toBe('bkt:price=100_500')
  })

  it('500块', () => {
    expect(priceFacetFromText('500块')).toBe('bkt:price=100_500')
  })

  it('500元', () => {
    expect(priceFacetFromText('500元')).toBe('bkt:price=100_500')
  })

  it('价格1000以内 → 500_1000', () => {
    expect(priceFacetFromText('价格1000以内')).toBe('bkt:price=500_1000')
  })

  it('1000以内', () => {
    expect(priceFacetFromText('1000以内')).toBe('bkt:price=500_1000')
  })

  it('一千以内（中文数字）→ 500_1000', () => {
    expect(priceFacetFromText('一千以内')).toBe('bkt:price=500_1000')
  })

  it('budget 500（英文）', () => {
    expect(priceFacetFromText('budget 500')).toBe('bkt:price=100_500')
  })

  it('Budget500（大小写混合）', () => {
    expect(priceFacetFromText('Budget500')).toBe('bkt:price=100_500')
  })
})

describe('priceFacetFromText · 边界', () => {
  it('无价格信号的普通词返回 null', () => {
    expect(priceFacetFromText('家政')).toBeNull()
    expect(priceFacetFromText('北京')).toBeNull()
    expect(priceFacetFromText('打车')).toBeNull()
  })

  it('裸数字（无单位/信号）返回 null，避免误挂筛选', () => {
    expect(priceFacetFromText('500')).toBeNull()
    expect(priceFacetFromText('1000')).toBeNull()
  })

  it('金额越界返回 null', () => {
    expect(priceFacetFromText('0元')).toBeNull()
    expect(priceFacetFromText('5000000')).toBeNull()
  })

  it('空串返回 null', () => {
    expect(priceFacetFromText('')).toBeNull()
    expect(priceFacetFromText('   ')).toBeNull()
  })

  it('全角数字归一', () => {
    expect(priceFacetFromText('预算５００')).toBe('bkt:price=100_500')
  })

  it('八千 → 5000_20000', () => {
    expect(priceFacetFromText('八千以内')).toBe('bkt:price=5000_20000')
  })
})
