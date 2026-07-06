import { describe, it, expect } from 'vitest'
import {
  calcVat,
  calcVatSurcharges,
  GENERAL_VAT_RATES,
  SMALL_VAT_RATES,
  SMALL_MONTHLY_EXEMPTION,
} from '../vat'

describe('calcVat - 小规模纳税人', () => {
  it('月销 5 万 < 10 万免税线,应纳 0', () => {
    const r = calcVat(50000, 0, 'small', '3')
    expect(r.isExempt).toBe(true)
    expect(r.payable).toBe(0)
    expect(r.exemptReason).toContain('免征')
  })

  it('月销正好 10 万,临界:应纳 0', () => {
    const r = calcVat(SMALL_MONTHLY_EXEMPTION, 0, 'small', '3')
    expect(r.isExempt).toBe(true)
    expect(r.payable).toBe(0)
  })

  it('月销 20 万,超过免税线,按 3% 计', () => {
    const r = calcVat(200000, 0, 'small', '3')
    expect(r.isExempt).toBe(false)
    expect(r.payable).toBe(200000 * 0.03) // 6000
  })

  it('月销 50 万,按 1% 优惠(假设政策延续)', () => {
    const r = calcVat(500000, 0, 'small', '1')
    expect(r.isExempt).toBe(false)
    expect(r.payable).toBe(500000 * 0.01) // 5000
  })

  it('小规模不抵扣进项,即使有进项税额', () => {
    const r = calcVat(200000, 50000, 'small', '3')
    expect(r.inputTax).toBe(0) // 进项被忽略
    expect(r.payable).toBe(200000 * 0.03)
  })
})

describe('calcVat - 一般纳税人', () => {
  it('销项 - 进项 = 应纳', () => {
    // 销售额 100 万,适用 13%
    const r = calcVat(1000000, 80000, 'general', '13')
    expect(r.outputTax).toBe(1000000 * 0.13) // 130000
    expect(r.inputTax).toBe(80000)
    expect(r.payable).toBe(50000)
  })

  it('进项超过销项,应付 0(留抵,本函数不展示留抵余额)', () => {
    const r = calcVat(100000, 150000, 'general', '13')
    expect(r.payable).toBe(0)
  })

  it('现代服务业 6% 税率', () => {
    const r = calcVat(500000, 10000, 'general', '6')
    expect(r.rate).toBe(0.06)
    expect(r.outputTax).toBe(500000 * 0.06) // 30000
    expect(r.payable).toBe(20000)
  })

  it('9% 税率(运输/建筑)', () => {
    const r = calcVat(1000000, 0, 'general', '9')
    expect(r.outputTax).toBe(90000)
    expect(r.payable).toBe(90000)
  })

  it('负进项被规整为 0', () => {
    const r = calcVat(100000, -1000, 'general', '13')
    expect(r.inputTax).toBe(0)
  })
})

describe('calcVatSurcharges', () => {
  it('附加税总额 = 增值税 × 12%', () => {
    const s = calcVatSurcharges(100000)
    expect(s.cityConstruction).toBeCloseTo(7000, 6)
    expect(s.educationSurcharge).toBeCloseTo(3000, 6)
    expect(s.localEducation).toBeCloseTo(2000, 6)
    expect(s.total).toBeCloseTo(12000, 6)
  })

  it('增值税为 0 时附加税为 0', () => {
    const s = calcVatSurcharges(0)
    expect(s.total).toBe(0)
  })
})

describe('档位数据完整性', () => {
  it('一般纳税人至少 4 个常见税率', () => {
    expect(GENERAL_VAT_RATES.length).toBeGreaterThanOrEqual(4)
  })

  it('小规模至少 1 个征收率', () => {
    expect(SMALL_VAT_RATES.length).toBeGreaterThanOrEqual(1)
  })
})
