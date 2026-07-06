/**
 * 常见场景预设
 * 一键加载示例,演示典型用户画像下的税负情况
 */

import type { SubjectId } from './subjects'

export interface Preset {
  /** 预设 id */
  id: string
  /** 显示名称 */
  name: string
  /** 描述(场景画像) */
  description: string
  /** 适用主体(多个表示该预设适合多主体) */
  subjects: SubjectId[]
  /** 税种 */
  tax: 'personal-income' | 'vat' | 'corporate-income'
  /** 输入参数(根据税种不同字段不同) */
  inputs: Record<string, number | string>
}

export const PRESETS: Preset[] = [
  // 个税
  {
    id: 'salary-15k',
    name: '上班族 · 月薪 1.5 万',
    description: '城市白领,标准工资薪金,年度收入约 18 万',
    subjects: ['individual-salary'],
    tax: 'personal-income',
    inputs: { monthlySalary: 15000, monthlySocialInsurance: 1500, monthlySpecialDeduction: 1500 },
  },
  {
    id: 'salary-50k',
    name: '高级白领 · 月薪 5 万',
    description: '高收入白领,触及 25% 边际税率档',
    subjects: ['individual-salary'],
    tax: 'personal-income',
    inputs: { monthlySalary: 50000, monthlySocialInsurance: 3000, monthlySpecialDeduction: 2000 },
  },
  {
    id: 'freelance-15k',
    name: '自由职业者 · 月入 1.5 万',
    description: '九木典型用户,劳务报酬,年度收入约 18 万',
    subjects: ['individual-labor'],
    tax: 'personal-income',
    inputs: {
      totalIncome: 180000,
      socialInsurance: 18000,
      specialDeduction: 18000,
      otherDeduction: 0,
    },
  },
  {
    id: 'freelance-50k',
    name: '自由职业者 · 月入 5 万',
    description: '九木资深接单方,综合所得已接近 25% 档',
    subjects: ['individual-labor'],
    tax: 'personal-income',
    inputs: {
      totalIncome: 600000,
      socialInsurance: 30000,
      specialDeduction: 24000,
      otherDeduction: 0,
    },
  },
  {
    id: 'freelance-business-50k',
    name: '自由职业者 · 注册个体户经营所得',
    description: '已注册个体户,适用经营所得五级累进',
    subjects: ['individual-labor'],
    tax: 'personal-income',
    inputs: { businessIncome: 600000, businessCost: 100000, businessLossLoss: 0 },
  },

  // 增值税
  {
    id: 'small-shop-50k',
    name: '小店 · 月销 5 万',
    description: '小规模纳税人,销售额未超 10 万免税线',
    subjects: ['small-business'],
    tax: 'vat',
    inputs: { vatSales: 50000, vatInput: 0, vatTaxpayer: 'small', vatRateId: '3' },
  },
  {
    id: 'small-shop-200k',
    name: '小店 · 月销 20 万',
    description: '小规模纳税人,超免税线,按 3% 征收',
    subjects: ['small-business'],
    tax: 'vat',
    inputs: { vatSales: 200000, vatInput: 0, vatTaxpayer: 'small', vatRateId: '3' },
  },
  {
    id: 'company-2m-profit',
    name: '一般企业 · 年营收 800 万',
    description: '一般纳税人,年利润约 200 万',
    subjects: ['general-company'],
    tax: 'vat',
    inputs: { vatSales: 8000000, vatInput: 700000, vatTaxpayer: 'general', vatRateId: '13' },
  },

  // 企税
  {
    id: 'company-profit-80w',
    name: '小微企业 · 利润 80 万',
    description: '符合小微条件,实际税负 5%',
    subjects: ['small-business'],
    tax: 'corporate-income',
    inputs: { corporateTaxable: 800000, corporateRegime: 'smallMicro' },
  },
  {
    id: 'company-profit-200w',
    name: '小微企业 · 利润 200 万',
    description: '应纳税所得额 200 万,仍享 5% 优惠',
    subjects: ['small-business'],
    tax: 'corporate-income',
    inputs: { corporateTaxable: 2000000, corporateRegime: 'smallMicro' },
  },
  {
    id: 'company-profit-500w',
    name: '一般企业 · 利润 500 万',
    description: '超出小微优惠区间,回到 25% 标准税率',
    subjects: ['general-company'],
    tax: 'corporate-income',
    inputs: { corporateTaxable: 5000000, corporateRegime: 'standard' },
  },
  {
    id: 'hitech-profit-1000w',
    name: '高新技术企业 · 利润 1000 万',
    description: '高新企业适用 15% 优惠税率',
    subjects: ['general-company'],
    tax: 'corporate-income',
    inputs: { corporateTaxable: 10000000, corporateRegime: 'highTech' },
  },
]

export const PRESET_BY_ID: Record<string, Preset> = PRESETS.reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<string, Preset>,
)
