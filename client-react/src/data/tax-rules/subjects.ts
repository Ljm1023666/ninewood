/**
 * 纳税主体定义
 * 覆盖 MVP 四类典型主体,可单独或对比查看
 */

export type SubjectId = 'individual-salary' | 'individual-labor' | 'small-business' | 'general-company'

export interface Subject {
  /** 主体 id */
  id: SubjectId
  /** 显示名称 */
  name: string
  /** 简短描述(用于 UI 副标题) */
  description: string
  /** 关键特点(用于 FAQ 引导) */
  highlights: string[]
  /** 适用税种(用于过滤) */
  applicableTaxes: Array<'personal-income' | 'vat' | 'corporate-income'>
  /** 默认场景预设 id(用于一键加载) */
  defaultPreset: string
  /** 视觉标识色(在对比模式区分) */
  color: 'blue' | 'green' | 'orange' | 'purple'
}

export const SUBJECTS: Subject[] = [
  {
    id: 'individual-salary',
    name: '个人 · 工资薪金',
    description: '受雇于公司,稳定月薪,公司代扣代缴个税',
    highlights: [
      '适用综合所得七级累进',
      '按月预扣预缴,年度汇算清缴',
      '起征点 5000 元/月',
    ],
    applicableTaxes: ['personal-income'],
    defaultPreset: 'salary-15k',
    color: 'blue',
  },
  {
    id: 'individual-labor',
    name: '个人 · 自由职业者(劳务 / 经营)',
    description: '九木平台典型用户,接单收入,自主申报',
    highlights: [
      '可选择综合所得或经营所得(成立个体户)',
      '综合所得合并到工资按七级累进',
      '经营所得五级累进,无起征点但有成本扣除',
    ],
    applicableTaxes: ['personal-income', 'vat'],
    defaultPreset: 'freelance-15k',
    color: 'green',
  },
  {
    id: 'small-business',
    name: '小规模纳税人 / 个体工商户',
    description: '月销 ≤10 万免增值税;企税 / 个税有优惠',
    highlights: [
      '增值税:月销 ≤10 万免征,超 10 万按 3%(或 1%)',
      '个税:可核定征收,综合税负较低',
      '企业所得税:符合小微条件可享 5% 实际税负',
    ],
    applicableTaxes: ['personal-income', 'vat', 'corporate-income'],
    defaultPreset: 'small-shop-50k',
    color: 'orange',
  },
  {
    id: 'general-company',
    name: '一般企业 / 一般纳税人',
    description: '公司主体,增值税链条完整,企税 25%',
    highlights: [
      '增值税:销项 - 进项,可抵扣',
      '企业所得税:标准 25%(高新 15%)',
      '需要建账,汇算清缴',
    ],
    applicableTaxes: ['vat', 'corporate-income'],
    defaultPreset: 'company-2m-profit',
    color: 'purple',
  },
]

export const SUBJECT_BY_ID: Record<SubjectId, Subject> = SUBJECTS.reduce(
  (acc, s) => {
    acc[s.id] = s
    return acc
  },
  {} as Record<SubjectId, Subject>,
)
