import { describe, it, expect, beforeEach } from 'vitest'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import { PRESETS } from '@/data/tax-rules/presets'

const VALID_INPUT_KEYS = new Set([
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

describe('tax-visualizer store', () => {
  beforeEach(() => {
    useTaxVisualizerStore.getState().resetTaxInputs()
    useTaxVisualizerStore.setState({
      taxType: 'personal-income',
      currentSubject: 'individual-labor',
      compareSubject: null,
      activePreset: 'freelance-15k',
    })
  })

  it('loadPreset 应写入 store 字段并切换税种', () => {
    useTaxVisualizerStore.getState().loadPreset('small-shop-50k')
    const state = useTaxVisualizerStore.getState()
    expect(state.taxType).toBe('vat')
    expect(state.activePreset).toBe('small-shop-50k')
    expect(state.inputs.vatSales).toBe(50000)
    expect(state.inputs.vatTaxpayer).toBe('small')
    expect(state.inputs.vatRateId).toBe('3')
  })

  it('loadPreset 企税预设应更新 corporateTaxable', () => {
    useTaxVisualizerStore.getState().loadPreset('company-profit-80w')
    const state = useTaxVisualizerStore.getState()
    expect(state.taxType).toBe('corporate-income')
    expect(state.inputs.corporateTaxable).toBe(800000)
    expect(state.inputs.corporateRegime).toBe('smallMicro')
  })

  it('切换 vatTaxpayer 时应校正 vatRateId', () => {
    useTaxVisualizerStore.getState().loadPreset('company-2m-profit')
    expect(useTaxVisualizerStore.getState().inputs.vatRateId).toBe('13')

    useTaxVisualizerStore.getState().setInput('vatTaxpayer', 'small')
    expect(useTaxVisualizerStore.getState().inputs.vatRateId).toBe('3')
  })
})

describe('场景预设字段名', () => {
  it('所有 preset inputs 键名应对齐 store', () => {
    for (const preset of PRESETS) {
      for (const key of Object.keys(preset.inputs)) {
        expect(
          VALID_INPUT_KEYS.has(key),
          `预设 ${preset.id} 使用了未知字段 ${key}`,
        ).toBe(true)
      }
    }
  })
})
