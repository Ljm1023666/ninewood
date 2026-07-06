/**
 * 税务可视化模块常量
 */

export type TaxType = 'personal-income' | 'vat' | 'corporate-income'

/** 个税场景子模式(控件栏与分析栏须共用) */
export type PersonalIncomeMode = 'comprehensive' | 'salary' | 'business'

/** 预设默认对应的个税子模式 */
export const PRESET_INCOME_MODE: Partial<Record<string, PersonalIncomeMode>> = {
  'salary-15k': 'salary',
  'salary-50k': 'salary',
  'freelance-business-50k': 'business',
}

export const PERSONAL_INCOME_MODE_LABEL: Record<PersonalIncomeMode, string> = {
  comprehensive: '综合所得',
  salary: '工资薪金',
  business: '经营所得',
}

export const TAX_TYPE_LABEL: Record<TaxType, string> = {
  'personal-income': '个人所得税',
  vat: '增值税',
  'corporate-income': '企业所得税',
}

export const TAX_TYPE_DESCRIPTION: Record<TaxType, string> = {
  'personal-income': '工资、劳务报酬、经营所得的累进税额计算',
  vat: '销项减进项,小规模月销 10 万以下免征',
  'corporate-income': '标准 25%,小微可享 5%,高新 15%',
}

/** 输入滑块范围(以元为单位) */
export const SLIDER_RANGES = {
  /** 综合所得年收入 */
  annualIncome: { min: 0, max: 3000000, step: 1000, default: 180000 },
  /** 工资月薪 */
  monthlySalary: { min: 0, max: 200000, step: 500, default: 15000 },
  /** 月社保公积金个人部分 */
  monthlySocialInsurance: { min: 0, max: 10000, step: 100, default: 1500 },
  /** 月专项附加扣除 */
  monthlySpecialDeduction: { min: 0, max: 10000, step: 500, default: 1500 },
  /** 年社保公积金个人部分 */
  annualSocialInsurance: { min: 0, max: 120000, step: 1000, default: 18000 },
  /** 年专项附加扣除 */
  annualSpecialDeduction: { min: 0, max: 120000, step: 1000, default: 18000 },
  /** 经营所得年收入 */
  businessIncome: { min: 0, max: 5000000, step: 10000, default: 600000 },
  /** 经营成本 */
  businessCost: { min: 0, max: 4000000, step: 10000, default: 100000 },
  /** 销售额(不含税) */
  vatSales: { min: 0, max: 2000000, step: 1000, default: 100000 },
  /** 进项税额 */
  vatInput: { min: 0, max: 500000, step: 100, default: 5000 },
  /** 企税应纳税所得额 */
  corporateTaxable: { min: 0, max: 10000000, step: 10000, default: 2000000 },
} as const

/** 四类主体的视觉色(与 TaxSubjectPicker / 对比图例共用) */
export type SubjectVisualColor = 'blue' | 'green' | 'orange' | 'purple'

export const SUBJECT_VISUAL: Record<
  SubjectVisualColor,
  { hex: string; dotClass: string; cardClass: string }
> = {
  blue: {
    hex: '#3b82f6',
    dotClass: 'bg-blue-500',
    cardClass: 'border-blue-500/40 bg-blue-500/10',
  },
  green: {
    hex: '#10b981',
    dotClass: 'bg-emerald-500',
    cardClass: 'border-emerald-500/40 bg-emerald-500/10',
  },
  orange: {
    hex: '#f59e0b',
    dotClass: 'bg-amber-500',
    cardClass: 'border-amber-500/40 bg-amber-500/10',
  },
  purple: {
    hex: '#a855f7',
    dotClass: 'bg-purple-500',
    cardClass: 'border-purple-500/40 bg-purple-500/10',
  },
}

export function subjectVisualHex(color: SubjectVisualColor): string {
  return SUBJECT_VISUAL[color].hex
}
