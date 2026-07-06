/**
 * 增值税规则数据
 * 数据基准日:2026-06
 * 法规来源:中华人民共和国增值税暂行条例、营改增试点办法、小规模纳税人管理办法
 *
 * 关键概念:
 * - 一般纳税人:可抵扣进项税额,适用 13%/9%/6% 等税率
 * - 小规模纳税人:简易计税,征收率 3%(疫情期间 1% 优惠)
 * - 月销售额 ≤ 10 万元(季度 ≤ 30 万):免征增值税
 * - 应纳税额 = 销项税额 - 进项税额
 *   销项税额 = 销售额(不含税) × 适用税率
 *   进项税额 = 取得发票上的可抵扣金额
 */

export type VatTaxpayerType = 'general' | 'small'

export interface VatRate {
  /** 税率标识 */
  id: string
  /** 标签 */
  label: string
  /** 税率,如 0.13 */
  rate: number
  /** 适用情形描述 */
  applicableTo: string
}

/** 一般纳税人常见税率(2026 现行) */
export const GENERAL_VAT_RATES: VatRate[] = [
  { id: '13', label: '13%', rate: 0.13, applicableTo: '销售或进口一般货物、劳务等' },
  { id: '9',  label: '9%',  rate: 0.09, applicableTo: '销售或进口交通运输、邮政、基础电信、建筑、不动产租赁等' },
  { id: '6',  label: '6%',  rate: 0.06, applicableTo: '现代服务业、金融业、生活服务业等' },
  { id: '3',  label: '3%(简易)', rate: 0.03, applicableTo: '一般纳税人选择简易计税(特定行业)' },
]

/** 小规模纳税人征收率 */
export const SMALL_VAT_RATES: VatRate[] = [
  { id: '3', label: '3%', rate: 0.03, applicableTo: '标准征收率' },
  { id: '1', label: '1%', rate: 0.01, applicableTo: '小规模纳税人阶段性优惠(具体看当年公告)' },
]

/** 月销售额免税额度(小规模纳税人) */
export const SMALL_MONTHLY_EXEMPTION = 100000

/** 季度销售额免税额度(小规模纳税人) */
export const SMALL_QUARTERLY_EXEMPTION = 300000

export interface VatResult {
  /** 销项税额 */
  outputTax: number
  /** 进项税额 */
  inputTax: number
  /** 应纳增值税额 */
  payable: number
  /** 实际税负率 = 应付 / 销售额(含税) */
  effectiveBurdenRate: number
  /** 命中的税率 */
  rate: number
  /** 命中的主体类型 */
  taxpayer: VatTaxpayerType
  /** 是否命中免税额 */
  isExempt: boolean
  /** 免税原因标签 */
  exemptReason?: string
}

/**
 * 增值税应纳税额计算
 * @param sales 销售额(不含税,元)
 * @param inputTax 进项税额(元)
 * @param taxpayer 主体类型
 * @param rateId 税率 id
 */
export function calcVat(
  sales: number,
  inputTax: number,
  taxpayer: VatTaxpayerType,
  rateId: string,
): VatResult {
  const rates = taxpayer === 'general' ? GENERAL_VAT_RATES : SMALL_VAT_RATES
  const rate = rates.find((r) => r.id === rateId) ?? rates[0]
  const r = rate.rate

  if (taxpayer === 'small') {
    // 小规模:简易计税,不可抵扣进项;月销 ≤ 10 万免税
    if (sales <= SMALL_MONTHLY_EXEMPTION) {
      return {
        outputTax: sales * r,
        inputTax: 0,
        payable: 0,
        effectiveBurdenRate: 0,
        rate: r,
        taxpayer,
        isExempt: true,
        exemptReason: `小规模纳税人月销售额不超过 ${SMALL_MONTHLY_EXEMPTION / 10000} 万元,免征增值税`,
      }
    }
    const payable = sales * r
    return {
      outputTax: payable,
      inputTax: 0,
      payable,
      effectiveBurdenRate: payable / (sales * (1 + r)),
      rate: r,
      taxpayer,
      isExempt: false,
    }
  }

  // 一般纳税人:销项 - 进项
  const safeInput = Math.max(0, inputTax)
  const outputTax = sales * r
  const payable = Math.max(0, outputTax - safeInput)
  const totalRevenueWithTax = sales * (1 + r)
  return {
    outputTax,
    inputTax: safeInput,
    payable,
    effectiveBurdenRate: outputTax > 0 ? payable / totalRevenueWithTax : 0,
    rate: r,
    taxpayer,
    isExempt: false,
  }
}

/**
 * 增值税附加税(城建税、教育费附加、地方教育附加)估算
 * 实际为增值税 × (7% + 3% + 2%) = 12%
 */
export function calcVatSurcharges(vatPayable: number): {
  cityConstruction: number
  educationSurcharge: number
  localEducation: number
  total: number
} {
  const cityConstruction = vatPayable * 0.07
  const educationSurcharge = vatPayable * 0.03
  const localEducation = vatPayable * 0.02
  return {
    cityConstruction,
    educationSurcharge,
    localEducation,
    total: cityConstruction + educationSurcharge + localEducation,
  }
}
