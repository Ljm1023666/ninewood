import { describe, it, expect } from 'vitest'
import {
  COMPREHENSIVE_BRACKETS_2026,
  BUSINESS_BRACKETS_2026,
  calcProgressiveTax,
  calcComprehensiveAnnualTax,
  calcBusinessAnnualTax,
  calcMonthlySalaryWithholding,
  COMPREHENSIVE_BASIC_DEDUCTION_YEAR,
  COMPREHENSIVE_BASIC_DEDUCTION_MONTH,
} from '../personal-income'

describe('calcProgressiveTax', () => {
  it('应纳税所得额为 0 时税额为 0', () => {
    const r = calcProgressiveTax(0, COMPREHENSIVE_BRACKETS_2026)
    expect(r.tax).toBe(0)
    expect(r.marginalRate).toBe(0)
  })

  it('负数应纳税所得额返回 0', () => {
    const r = calcProgressiveTax(-1000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.tax).toBe(0)
  })

  it('应纳税所得额 30000:3% 档(36000 - 1 边界)', () => {
    const r = calcProgressiveTax(30000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.03)
    expect(r.tax).toBe(30000 * 0.03) // 900
    expect(r.bracketIndex).toBe(0)
  })

  it('应纳税所得额 36000 整:3% 档上边界', () => {
    const r = calcProgressiveTax(36000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.03)
    expect(r.tax).toBe(36000 * 0.03) // 1080
  })

  it('应纳税所得额 50000:10% 档', () => {
    const r = calcProgressiveTax(50000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBe(50000 * 0.10 - 2520) // 2480
  })

  it('应纳税所得额 100000:10% 档', () => {
    const r = calcProgressiveTax(100000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBe(100000 * 0.10 - 2520) // 7480
  })

  it('应纳税所得额 200000:20% 档', () => {
    const r = calcProgressiveTax(200000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.20)
    expect(r.tax).toBe(200000 * 0.20 - 16920) // 23080
  })

  it('应纳税所得额 500000:30% 档', () => {
    const r = calcProgressiveTax(500000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.30)
    expect(r.tax).toBe(500000 * 0.30 - 52920) // 97080
  })

  it('应纳税所得额 1000000:45% 档', () => {
    const r = calcProgressiveTax(1000000, COMPREHENSIVE_BRACKETS_2026)
    expect(r.marginalRate).toBe(0.45)
    expect(r.tax).toBe(1000000 * 0.45 - 181920) // 268080
  })

  it('档位连续性:36000 处的税额等于 50000 处的边界计算', () => {
    const r36 = calcProgressiveTax(36000, COMPREHENSIVE_BRACKETS_2026)
    const r36_1 = calcProgressiveTax(36001, COMPREHENSIVE_BRACKETS_2026)
    // 跨越 36000 后,边际税率跳到 10%
    expect(r36.marginalRate).toBe(0.03)
    expect(r36_1.marginalRate).toBe(0.10)
  })
})

describe('calcComprehensiveAnnualTax', () => {
  it('收入 18 万,无扣除:应纳税所得额 = 18 万 - 6 万 = 12 万', () => {
    const r = calcComprehensiveAnnualTax(180000)
    expect(r.taxable).toBe(120000)
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBe(120000 * 0.10 - 2520) // 9480
  })

  it('收入 18 万,社保 1.8 万,专项附加 1.8 万', () => {
    const r = calcComprehensiveAnnualTax(180000, 18000, 18000)
    expect(r.taxable).toBe(180000 - 60000 - 18000 - 18000) // 84000
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBe(84000 * 0.10 - 2520) // 5880
  })

  it('收入 6 万整(等于起征点):应纳税所得额 0', () => {
    const r = calcComprehensiveAnnualTax(COMPREHENSIVE_BASIC_DEDUCTION_YEAR)
    expect(r.taxable).toBe(0)
    expect(r.tax).toBe(0)
  })

  it('起征点常量正确', () => {
    expect(COMPREHENSIVE_BASIC_DEDUCTION_YEAR).toBe(60000)
    expect(COMPREHENSIVE_BASIC_DEDUCTION_MONTH).toBe(5000)
  })
})

describe('calcBusinessAnnualTax', () => {
  it('应税所得 10000 元:5% 档', () => {
    const r = calcBusinessAnnualTax(100000, 90000) // 利润 1 万
    expect(r.taxable).toBe(10000)
    expect(r.marginalRate).toBe(0.05)
    expect(r.tax).toBe(10000 * 0.05) // 500
  })

  it('应税所得 50000 元:10% 档(超过 30000)', () => {
    const r = calcBusinessAnnualTax(200000, 150000) // 利润 5 万
    expect(r.taxable).toBe(50000)
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBe(50000 * 0.10 - 1500) // 3500
  })

  it('应税所得 600000 元:35% 档', () => {
    const r = calcBusinessAnnualTax(800000, 200000) // 利润 60 万
    expect(r.taxable).toBe(600000)
    expect(r.marginalRate).toBe(0.35)
    expect(r.tax).toBe(600000 * 0.35 - 65500) // 144500
  })
})

describe('calcMonthlySalaryWithholding', () => {
  it('月薪 15000,社保 1500,专项附加 1500:月到手应为 15000 - 1500 - 税', () => {
    const r = calcMonthlySalaryWithholding(15000, 1500, 1500)
    // 月应税 = 15000 - 5000 - 1500 - 1500 = 7000
    // 年度化 84000,10% 档,年度税 = 84000 * 10% - 2520 = 5880,月税 = 490
    expect(r.monthlyTaxable).toBe(7000)
    expect(r.marginalRate).toBe(0.10)
    expect(r.tax).toBeCloseTo(5880 / 12, 2)
    expect(r.monthlyTakeHome).toBeCloseTo(15000 - 1500 - 5880 / 12, 2)
  })
})

describe('档位数据完整性', () => {
  it('综合所得 7 档', () => {
    expect(COMPREHENSIVE_BRACKETS_2026.length).toBe(7)
  })

  it('经营所得 5 档', () => {
    expect(BUSINESS_BRACKETS_2026.length).toBe(5)
  })

  it('每档 threshold 严格递增', () => {
    for (let i = 1; i < COMPREHENSIVE_BRACKETS_2026.length; i++) {
      expect(COMPREHENSIVE_BRACKETS_2026[i].threshold)
        .toBeGreaterThan(COMPREHENSIVE_BRACKETS_2026[i - 1].threshold)
    }
    for (let i = 1; i < BUSINESS_BRACKETS_2026.length; i++) {
      expect(BUSINESS_BRACKETS_2026[i].threshold)
        .toBeGreaterThan(BUSINESS_BRACKETS_2026[i - 1].threshold)
    }
  })
})
