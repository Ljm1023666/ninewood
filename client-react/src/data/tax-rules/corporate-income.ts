/**
 * 企业所得税规则数据
 * 数据基准日:2026-06
 * 法规来源:中华人民共和国企业所得税法、小型微利企业优惠政策、高新技术企业认定办法
 *
 * 关键概念:
 * - 标准税率:25%(一般企业)
 * - 高新技术企业:15%
 * - 小型微利企业:分段优惠(按最新政策)
 * - 应纳税所得额 = 收入总额 - 不征税收入 - 免税收入 - 各项扣除 - 弥补亏损
 * - 跨月按年度汇算清缴,本文件按年度计算
 */

export type CorporateRegime = 'standard' | 'smallMicro' | 'highTech'

export interface CorporateBracket {
  /** 应纳税所得额上限(含),元;Infinity 表示无上限 */
  upper: number
  /** 实际有效税率(基于分段优惠),如 0.05 */
  effectiveRate: number
  /** 档位标签 */
  label: string
}

/**
 * 小型微利企业优惠(2026 现行,以最新公告为准)
 * 假设延续分段优惠(具体以官方公告为准)
 */
export const SMALL_MICRO_BRACKETS_2026: CorporateBracket[] = [
  { upper: 1000000,   effectiveRate: 0.05,  label: '应纳税所得额 ≤ 100 万元(实际税负 5%)' },
  { upper: 3000000,   effectiveRate: 0.05,  label: '100 万 < 应纳税所得额 ≤ 300 万元(实际税负 5%)' },
  { upper: Infinity,  effectiveRate: 0.25,  label: '应纳税所得额 > 300 万元(回到标准 25%)' },
]

/** 标准税率 */
export const STANDARD_RATE = 0.25

/** 高新技术企业税率 */
export const HIGH_TECH_RATE = 0.15

export interface CorporateResult {
  /** 应纳税所得额 */
  taxableIncome: number
  /** 适用主体类型 */
  regime: CorporateRegime
  /** 适用税率/有效税率 */
  rate: number
  /** 应纳所得税额 */
  tax: number
  /** 实际税负率 */
  effectiveRate: number
  /** 命中的档位标签(小微) */
  bracketLabel?: string
  /** 适用条件描述 */
  description: string
}

/**
 * 企业所得税应纳税额计算
 * @param taxableIncome 应纳税所得额(元)
 * @param regime 适用主体类型
 */
export function calcCorporateTax(
  taxableIncome: number,
  regime: CorporateRegime = 'standard',
): CorporateResult {
  if (taxableIncome <= 0) {
    return {
      taxableIncome: 0,
      regime,
      rate: 0,
      tax: 0,
      effectiveRate: 0,
      description: '应纳税所得额为 0,无需缴税',
    }
  }

  if (regime === 'standard') {
    const tax = taxableIncome * STANDARD_RATE
    return {
      taxableIncome,
      regime,
      rate: STANDARD_RATE,
      tax,
      effectiveRate: STANDARD_RATE,
      description: '适用标准税率 25%',
    }
  }

  if (regime === 'highTech') {
    const tax = taxableIncome * HIGH_TECH_RATE
    return {
      taxableIncome,
      regime,
      rate: HIGH_TECH_RATE,
      tax,
      effectiveRate: HIGH_TECH_RATE,
      description: '适用高新技术企业税率 15%(需取得认定证书)',
    }
  }

  // 小型微利企业分段优惠
  for (const bracket of SMALL_MICRO_BRACKETS_2026) {
    if (taxableIncome <= bracket.upper) {
      const tax = taxableIncome * bracket.effectiveRate
      return {
        taxableIncome,
        regime,
        rate: bracket.effectiveRate,
        tax,
        effectiveRate: bracket.effectiveRate,
        bracketLabel: bracket.label,
        description: `小型微利企业优惠,${bracket.label}`,
      }
    }
  }
  // 不会到达这里
  return {
    taxableIncome,
    regime,
    rate: STANDARD_RATE,
    tax: taxableIncome * STANDARD_RATE,
    effectiveRate: STANDARD_RATE,
    description: '适用标准税率 25%',
  }
}

/**
 * 综合税费负担(增值税附加 + 企税)估算
 * 用于概览页展示
 */
export function calcTotalCorporateBurden(
  revenueExclTax: number,
  costExclTax: number,
  inputTax: number,
  vatPayable: number,
  regime: CorporateRegime = 'standard',
): {
  profit: number
  vat: number
  vatSurcharges: number
  corporateTax: number
  totalTax: number
  netProfit: number
  effectiveRate: number
} {
  // 利润(简化:收入 - 成本;不扣除工资等以免重复)
  const profit = Math.max(0, revenueExclTax - costExclTax)
  const corporateResult = calcCorporateTax(profit, regime)

  // 增值税附加(基于 VAT)
  const surchargeRate = 0.12
  const vatSurcharges = vatPayable * surchargeRate

  const totalTax = vatPayable + vatSurcharges + corporateResult.tax
  const netProfit = profit - corporateResult.tax
  const effectiveRate = revenueExclTax > 0 ? totalTax / revenueExclTax : 0

  return {
    profit,
    vat: vatPayable,
    vatSurcharges,
    corporateTax: corporateResult.tax,
    totalTax,
    netProfit,
    effectiveRate,
  }
}
