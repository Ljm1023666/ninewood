/**
 * 个人所得税规则数据
 * 数据基准日:2026-06
 * 法规来源:中华人民共和国个人所得税法及实施条例
 *
 * 关键概念:
 * - 综合所得:工资薪金 + 劳务报酬 + 稿酬 + 特许权使用费,合并按年计税,适用七级累进
 * - 经营所得:个体工商户、个人独资、合伙企业等,适用五级累进
 * - 应纳税所得额 = 收入总额 - 费用 - 免税额 - 专项扣除 - 专项附加扣除 - 依法确定的其他扣除
 * - 工资薪金费用扣除 0;劳务报酬超 4000 扣 20%,≤4000 扣 800
 *
 * 注:本数据为科普参考,实际申报以官方公告为准。
 */

export interface Bracket {
  /** 该档起点(应纳税所得额,元) */
  threshold: number
  /** 税率,如 0.03 表示 3% */
  rate: number
  /** 速算扣除数(元) */
  quickDeduction: number
  /** 档位标签,用于 UI 展示 */
  label: string
}

export interface TaxResult {
  /** 应纳税额(元) */
  tax: number
  /** 边际税率(命中档位) */
  marginalRate: number
  /** 有效税率 = 税额 / 应纳税所得额 */
  effectiveRate: number
  /** 命中的档位 */
  bracketHit: Bracket
  /** 命中的档位索引(0-based) */
  bracketIndex: number
}

/**
 * 综合所得(年度)七级累进档位
 * 适用于:工资薪金、劳务报酬、稿酬、特许权使用费合并计税
 */
export const COMPREHENSIVE_BRACKETS_2026: Bracket[] = [
  { threshold: 0,       rate: 0.03, quickDeduction: 0,      label: '不超过 36000 元' },
  { threshold: 36000,   rate: 0.10, quickDeduction: 2520,   label: '超过 36000 至 144000 元' },
  { threshold: 144000,  rate: 0.20, quickDeduction: 16920,  label: '超过 144000 至 300000 元' },
  { threshold: 300000,  rate: 0.25, quickDeduction: 31920,  label: '超过 300000 至 420000 元' },
  { threshold: 420000,  rate: 0.30, quickDeduction: 52920,  label: '超过 420000 至 660000 元' },
  { threshold: 660000,  rate: 0.35, quickDeduction: 85920,  label: '超过 660000 至 960000 元' },
  { threshold: 960000,  rate: 0.45, quickDeduction: 181920, label: '超过 960000 元' },
]

/**
 * 经营所得(年度)五级累进档位
 * 适用于:个体工商户、个人独资企业、合伙企业自然人合伙人
 */
export const BUSINESS_BRACKETS_2026: Bracket[] = [
  { threshold: 0,       rate: 0.05, quickDeduction: 0,     label: '不超过 30000 元' },
  { threshold: 30000,   rate: 0.10, quickDeduction: 1500,  label: '超过 30000 至 90000 元' },
  { threshold: 90000,   rate: 0.20, quickDeduction: 10500, label: '超过 90000 至 300000 元' },
  { threshold: 300000,  rate: 0.30, quickDeduction: 40500, label: '超过 300000 至 500000 元' },
  { threshold: 500000,  rate: 0.35, quickDeduction: 65500, label: '超过 500000 元' },
]

/** 工资薪金费用扣除标准:0(全部计入应税) */
export const SALARY_EXPENSE_DEDUCTION = 0

/** 劳务报酬费用扣除:收入 ≤ 4000 减 800;收入 > 4000 减 20% */
export const LABOR_COMPENSATION_EXPENSE = (income: number): number =>
  income <= 4000 ? 800 : income * 0.2

/** 综合所得起征点(年):60000 元(5000 元/月 × 12) */
export const COMPREHENSIVE_BASIC_DEDUCTION_YEAR = 60000

/** 综合所得起征点(月):5000 元 */
export const COMPREHENSIVE_BASIC_DEDUCTION_MONTH = 5000

/**
 * 通用累进税额计算(纯函数)
 * @param taxable 应纳税所得额(元)
 * @param brackets 累进档位
 * @returns 税额及档位信息
 */
export function calcProgressiveTax(
  taxable: number,
  brackets: Bracket[],
): TaxResult {
  if (taxable <= 0) {
    return {
      tax: 0,
      marginalRate: 0,
      effectiveRate: 0,
      bracketHit: brackets[0],
      bracketIndex: 0,
    }
  }

  // 找到命中的档位
  let idx = 0
  for (let i = 0; i < brackets.length; i++) {
    if (taxable > brackets[i].threshold) {
      idx = i
    } else {
      break
    }
  }

  const bracket = brackets[idx]
  const tax = taxable * bracket.rate - bracket.quickDeduction

  return {
    tax: Math.max(0, tax),
    marginalRate: bracket.rate,
    effectiveRate: tax / taxable,
    bracketHit: bracket,
    bracketIndex: idx,
  }
}

/**
 * 综合所得(年度)应纳税额计算
 * @param totalIncome 综合所得年收入总额(元)
 * @param socialInsurance 年社保公积金个人部分(元)
 * @param specialDeduction 年专项附加扣除(元)
 * @param otherDeduction 其他依法扣除(元)
 * @returns TaxResult
 */
export function calcComprehensiveAnnualTax(
  totalIncome: number,
  socialInsurance: number = 0,
  specialDeduction: number = 0,
  otherDeduction: number = 0,
): TaxResult & { taxable: number; deductions: number } {
  const deductions =
    COMPREHENSIVE_BASIC_DEDUCTION_YEAR +
    socialInsurance +
    specialDeduction +
    otherDeduction
  const taxable = Math.max(0, totalIncome - deductions)
  const result = calcProgressiveTax(taxable, COMPREHENSIVE_BRACKETS_2026)
  return { ...result, taxable, deductions }
}

/**
 * 经营所得(年度)应纳税额计算
 * @param totalIncome 经营收入总额(元)
 * @param cost 经营成本(元)
 * @param lossLoss 当年可弥补的以前年度亏损(元)
 */
export function calcBusinessAnnualTax(
  totalIncome: number,
  cost: number = 0,
  lossLoss: number = 0,
): TaxResult & { taxable: number } {
  const taxable = Math.max(0, totalIncome - cost - lossLoss)
  const result = calcProgressiveTax(taxable, BUSINESS_BRACKETS_2026)
  return { ...result, taxable }
}

/**
 * 工资薪金单月预扣预缴估算(简化)
 * 注意:实际为累计预扣法,本函数为科普级估算
 */
export function calcMonthlySalaryWithholding(
  monthlySalary: number,
  monthlySocialInsurance: number = 0,
  monthlySpecialDeduction: number = 0,
): TaxResult & { monthlyTakeHome: number; monthlyTaxable: number } {
  // 简化:按月计算的应纳税所得额 = 月薪 - 5000 - 月社保 - 月专项附加
  const monthlyTaxable = Math.max(
    0,
    monthlySalary - COMPREHENSIVE_BASIC_DEDUCTION_MONTH - monthlySocialInsurance - monthlySpecialDeduction,
  )
  // 年度化后查档位,再除以 12 估算本月
  const annualTaxable = monthlyTaxable * 12
  const annualResult = calcProgressiveTax(annualTaxable, COMPREHENSIVE_BRACKETS_2026)
  const monthlyTax = annualResult.tax / 12
  const monthlyTakeHome = monthlySalary - monthlySocialInsurance - monthlyTax

  return {
    tax: monthlyTax,
    marginalRate: annualResult.marginalRate,
    effectiveRate: monthlyTaxable > 0 ? monthlyTax / monthlyTaxable : 0,
    bracketHit: annualResult.bracketHit,
    bracketIndex: annualResult.bracketIndex,
    monthlyTakeHome,
    monthlyTaxable,
  }
}
