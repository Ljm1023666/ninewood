import { describe, it, expect } from 'vitest'
import {
  calcCorporateTax,
  calcTotalCorporateBurden,
  STANDARD_RATE,
  HIGH_TECH_RATE,
} from '../corporate-income'

describe('calcCorporateTax - 标准税率', () => {
  it('利润 100 万:25% 税', () => {
    const r = calcCorporateTax(1000000, 'standard')
    expect(r.rate).toBe(0.25)
    expect(r.tax).toBe(250000)
  })

  it('利润 0:不交税', () => {
    const r = calcCorporateTax(0, 'standard')
    expect(r.tax).toBe(0)
  })

  it('利润 -100(亏损):不交税', () => {
    const r = calcCorporateTax(-100, 'standard')
    expect(r.tax).toBe(0)
  })
})

describe('calcCorporateTax - 小型微利企业', () => {
  it('应税 80 万:5% 实际税负', () => {
    const r = calcCorporateTax(800000, 'smallMicro')
    expect(r.rate).toBe(0.05)
    expect(r.tax).toBe(40000)
    expect(r.bracketLabel).toBeDefined()
  })

  it('应税 200 万:仍享 5%', () => {
    const r = calcCorporateTax(2000000, 'smallMicro')
    expect(r.rate).toBe(0.05)
    expect(r.tax).toBe(100000)
  })

  it('应税 500 万:超出小微,回到 25%', () => {
    const r = calcCorporateTax(5000000, 'smallMicro')
    expect(r.rate).toBe(STANDARD_RATE)
    expect(r.tax).toBe(1250000)
  })

  it('应税 300 万:300 万整仍在小微区间(≤ 300 万)', () => {
    const r = calcCorporateTax(3000000, 'smallMicro')
    expect(r.rate).toBe(0.05)
    expect(r.tax).toBe(150000)
  })
})

describe('calcCorporateTax - 高新技术企业', () => {
  it('利润 1000 万:15% 税', () => {
    const r = calcCorporateTax(10000000, 'highTech')
    expect(r.rate).toBe(HIGH_TECH_RATE)
    expect(r.tax).toBe(1500000)
  })
})

describe('calcTotalCorporateBurden', () => {
  it('收入 1000 万,成本 700 万,进项 70 万,利润 300 万,标准税率', () => {
    // 销项 = 1000 万 × 13% = 130 万
    // 应纳 VAT = 130 - 70 = 60 万
    // 附加税 = 60 × 12% = 7.2 万
    // 利润 = 300 万
    // 企税 = 300 × 25% = 75 万
    // 总税 = 60 + 7.2 + 75 = 142.2 万
    const r = calcTotalCorporateBurden(10000000, 7000000, 700000, 600000, 'standard')
    expect(r.profit).toBe(3000000)
    expect(r.vat).toBe(600000)
    expect(r.vatSurcharges).toBe(72000)
    expect(r.corporateTax).toBe(750000)
    expect(r.totalTax).toBe(1422000)
    expect(r.netProfit).toBe(2250000) // 300 - 75
  })

  it('小微优惠时企税下降,综合税负降低', () => {
    const r1 = calcTotalCorporateBurden(10000000, 7000000, 700000, 600000, 'standard')
    const r2 = calcTotalCorporateBurden(10000000, 7000000, 700000, 600000, 'smallMicro')
    expect(r2.corporateTax).toBeLessThan(r1.corporateTax)
    expect(r2.netProfit).toBeGreaterThan(r1.netProfit)
  })
})

describe('常量正确性', () => {
  it('标准税率 25%', () => {
    expect(STANDARD_RATE).toBe(0.25)
  })
  it('高新税率 15%', () => {
    expect(HIGH_TECH_RATE).toBe(0.15)
  })
})
