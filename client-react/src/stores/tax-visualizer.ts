/**
 * 税务可视化 Zustand Store
 * 集中管理:当前税种、选中主体(最多 2 个用于对比)、各税种输入参数、预设选择
 */
import { create } from 'zustand'
import { SUBJECT_BY_ID, PRESET_BY_ID, type SubjectId } from '@/data/tax-rules'
import { GENERAL_VAT_RATES, SMALL_VAT_RATES } from '@/data/tax-rules/vat'
import type { TaxType, PersonalIncomeMode } from '@/constants/tax-visualizer'
import { PRESET_INCOME_MODE, SLIDER_RANGES } from '@/constants/tax-visualizer'

interface TaxInputs {
  // 个税 - 综合所得
  totalIncome: number
  socialInsurance: number
  specialDeduction: number
  otherDeduction: number
  // 个税 - 工资薪金(单月)
  monthlySalary: number
  monthlySocialInsurance: number
  monthlySpecialDeduction: number
  // 个税 - 经营所得
  businessIncome: number
  businessCost: number
  businessLossLoss: number
  // 增值税
  vatSales: number
  vatInput: number
  vatTaxpayer: 'general' | 'small'
  vatRateId: string
  // 企税
  corporateTaxable: number
  corporateRegime: 'standard' | 'smallMicro' | 'highTech'
}

/** 预设 inputs 旧字段名 → store 字段名(兼容历史数据) */
const PRESET_INPUT_ALIASES: Record<string, keyof TaxInputs> = {
  sales: 'vatSales',
  inputTax: 'vatInput',
  taxpayer: 'vatTaxpayer',
  rateId: 'vatRateId',
  taxableIncome: 'corporateTaxable',
  regime: 'corporateRegime',
  cost: 'businessCost',
  lossLoss: 'businessLossLoss',
}

const TAX_INPUT_KEYS = new Set<string>([
  'totalIncome',
  'socialInsurance',
  'specialDeduction',
  'otherDeduction',
  'monthlySalary',
  'monthlySocialInsurance',
  'monthlySpecialDeduction',
  'businessIncome',
  'businessCost',
  'businessLossLoss',
  'vatSales',
  'vatInput',
  'vatTaxpayer',
  'vatRateId',
  'corporateTaxable',
  'corporateRegime',
])

/** 确保 vatRateId 与 vatTaxpayer 匹配,避免 Radix Tabs 受控值失效 */
function normalizeVatInputs(inputs: TaxInputs): TaxInputs {
  const rates =
    inputs.vatTaxpayer === 'general' ? GENERAL_VAT_RATES : SMALL_VAT_RATES
  const validRate = rates.some((r) => r.id === inputs.vatRateId)
    ? inputs.vatRateId
    : rates[0]!.id
  if (validRate === inputs.vatRateId) return inputs
  return { ...inputs, vatRateId: validRate }
}

function applyPresetInputs(
  base: TaxInputs,
  presetInputs: Record<string, number | string>,
): TaxInputs {
  const next = { ...base }
  for (const [rawKey, value] of Object.entries(presetInputs)) {
    const key =
      (rawKey in next ? rawKey : PRESET_INPUT_ALIASES[rawKey]) as
        | keyof TaxInputs
        | undefined
    if (key && TAX_INPUT_KEYS.has(key)) {
      ;(next as Record<string, unknown>)[key] = value
    }
  }
  return normalizeVatInputs(next)
}

interface TaxVisualizerState {
  /** 当前选中税种 */
  taxType: TaxType
  /** 当前选中主体(单主体模式) */
  currentSubject: SubjectId
  /** 对比模式:第二主体(可选) */
  compareSubject: SubjectId | null
  /** 各种税的输入 */
  inputs: TaxInputs
  /** 当前激活的预设 id */
  activePreset: string | null
  /** 个税子模式(综合/工资/经营) */
  personalIncomeMode: PersonalIncomeMode

  setTaxType: (t: TaxType) => void
  setCurrentSubject: (s: SubjectId) => void
  setCompareSubject: (s: SubjectId | null) => void
  /** 加载预设(覆盖对应税种的输入) */
  loadPreset: (presetId: string) => void
  /** 通用 input 更新 */
  setInput: <K extends keyof TaxInputs>(key: K, value: TaxInputs[K]) => void
  /** 重置当前税种输入到默认值 */
  resetTaxInputs: () => void
  setPersonalIncomeMode: (mode: PersonalIncomeMode) => void
}

const defaultInputs: TaxInputs = normalizeVatInputs({
  totalIncome: SLIDER_RANGES.annualIncome.default,
  socialInsurance: SLIDER_RANGES.annualSocialInsurance.default,
  specialDeduction: SLIDER_RANGES.annualSpecialDeduction.default,
  otherDeduction: 0,
  monthlySalary: SLIDER_RANGES.monthlySalary.default,
  monthlySocialInsurance: SLIDER_RANGES.monthlySocialInsurance.default,
  monthlySpecialDeduction: SLIDER_RANGES.monthlySpecialDeduction.default,
  businessIncome: SLIDER_RANGES.businessIncome.default,
  businessCost: SLIDER_RANGES.businessCost.default,
  businessLossLoss: 0,
  vatSales: SLIDER_RANGES.vatSales.default,
  vatInput: SLIDER_RANGES.vatInput.default,
  vatTaxpayer: 'small',
  vatRateId: '3',
  corporateTaxable: SLIDER_RANGES.corporateTaxable.default,
  corporateRegime: 'smallMicro',
})

export const useTaxVisualizerStore = create<TaxVisualizerState>((set) => ({
  taxType: 'personal-income',
  currentSubject: 'individual-labor',
  compareSubject: null,
  inputs: { ...defaultInputs },
  activePreset: 'freelance-15k',
  personalIncomeMode: 'comprehensive',

  setTaxType: (t) => set({ taxType: t }),

  setCurrentSubject: (s) => {
    set((state) => {
      const subject = SUBJECT_BY_ID[s]
      if (!subject) return { currentSubject: s }

      const alreadySupported = subject.applicableTaxes.includes(state.taxType)
      if (alreadySupported) {
        return { currentSubject: s }
      }

      const nextTax = subject.applicableTaxes[0]
      const preset = PRESET_BY_ID[subject.defaultPreset]
      return {
        currentSubject: s,
        taxType: nextTax,
        inputs: preset
          ? applyPresetInputs(state.inputs, preset.inputs)
          : state.inputs,
        activePreset: preset?.id ?? state.activePreset,
        personalIncomeMode: preset
          ? (PRESET_INCOME_MODE[preset.id] ?? 'comprehensive')
          : state.personalIncomeMode,
      }
    })
  },

  setCompareSubject: (s) => set({ compareSubject: s }),

  loadPreset: (presetId) => {
    set((state) => {
      const preset = PRESET_BY_ID[presetId]
      if (!preset) return state
      return {
        inputs: applyPresetInputs(state.inputs, preset.inputs),
        activePreset: presetId,
        taxType: preset.tax,
        personalIncomeMode: PRESET_INCOME_MODE[presetId] ?? 'comprehensive',
      }
    })
  },

  setPersonalIncomeMode: (mode) => set({ personalIncomeMode: mode }),

  setInput: (key, value) =>
    set((state) => {
      let inputs = { ...state.inputs, [key]: value }
      if (key === 'vatTaxpayer' || key === 'vatRateId') {
        inputs = normalizeVatInputs(inputs)
      }
      return { inputs }
    }),

  resetTaxInputs: () => set({ inputs: { ...defaultInputs } }),
}))

export type { TaxInputs }
