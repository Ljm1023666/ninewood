/**
 * 单主体模式 · 方案 B 分面渲染
 */
import PersonalIncomeTax from '../scenarios/PersonalIncomeTax'
import VatTax from '../scenarios/VatTax'
import CorporateIncomeTax from '../scenarios/CorporateIncomeTax'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import { SUBJECT_BY_ID } from '@/data/tax-rules/subjects'
import { TAX_TYPE_LABEL } from '@/constants/tax-visualizer'

interface SingleModeProps {
  surface?: 'controls' | 'analysis' | 'all'
}

export default function SingleMode({ surface = 'all' }: SingleModeProps) {
  const taxType = useTaxVisualizerStore((s) => s.taxType)
  const currentSubject = useTaxVisualizerStore((s) => s.currentSubject)

  const subject = SUBJECT_BY_ID[currentSubject]
  const subjectSupports = subject?.applicableTaxes.includes(taxType)

  if (!subjectSupports) {
    const msg = (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        「{subject?.name}」不适用 {TAX_TYPE_LABEL[taxType]},请切换主体或税种
      </div>
    )
    if (surface === 'controls') return null
    return msg
  }

  if (taxType === 'personal-income') {
    return <PersonalIncomeTax surface={surface} />
  }
  if (taxType === 'vat') return <VatTax surface={surface} />
  return <CorporateIncomeTax surface={surface} />
}
