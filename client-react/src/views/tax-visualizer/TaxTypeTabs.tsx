/**
 * 税种切换 + 预设一键加载
 */
import { Plus, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BorderBeam } from '@/components/ui/border-beam'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import { TAX_TYPE_LABEL, type TaxType } from '@/constants/tax-visualizer'
import { PRESETS } from '@/data/tax-rules/presets'
import { cn } from '@/lib/utils'

const TAX_TYPES: TaxType[] = ['personal-income', 'vat', 'corporate-income']

interface TaxTypeTabsProps {
  layout?: 'card' | 'split'
}

export function TaxTypeTabs({ layout = 'card' }: TaxTypeTabsProps) {
  const taxType = useTaxVisualizerStore((s) => s.taxType)
  const setTaxType = useTaxVisualizerStore((s) => s.setTaxType)
  const loadPreset = useTaxVisualizerStore((s) => s.loadPreset)
  const activePreset = useTaxVisualizerStore((s) => s.activePreset)

  const presetsForCurrent = PRESETS.filter((p) => p.tax === taxType)
  const activeIndex = TAX_TYPES.indexOf(taxType)

  const segment = (
    <div className={cn('tax-viz-segment', layout === 'split' && 'tax-viz-segment--inline')}>
      <div
        className="tax-viz-segment__indicator"
        style={{
          width: `calc((100% - 8px) / ${TAX_TYPES.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {TAX_TYPES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTaxType(t)}
          className={cn(
            'tax-viz-segment__btn',
            taxType === t && 'tax-viz-segment__btn--active',
          )}
        >
          {TAX_TYPE_LABEL[t]}
        </button>
      ))}
    </div>
  )

  const presets = (
    <div className={layout === 'split' ? 'tax-viz-scenarios' : undefined}>
      {layout === 'split' ? (
        <span className="tax-viz-scenarios__label">Scenarios</span>
      ) : (
        <div className="mb-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-amber-400/80" />
          <span>一键加载场景</span>
        </div>
      )}
      <div className={cn('flex flex-wrap gap-2', layout === 'split' && 'contents')}>
        {presetsForCurrent.map((p) => {
          const isActive = p.id === activePreset
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p.id)}
              aria-pressed={isActive}
              className={cn(
                'tax-viz-chip',
                layout === 'split' && 'tax-viz-chip--scenario',
                isActive && 'tax-viz-chip--active',
              )}
              title={p.description}
            >
              {layout === 'split' && !isActive && (
                <Plus className="size-3.5" aria-hidden />
              )}
              {isActive && layout === 'card' && (
                <BorderBeam
                  size={80}
                  duration={8}
                  colorFrom="#3388FF"
                  colorTo="#f2ca50"
                  borderWidth={1}
                />
              )}
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (layout === 'split') {
    return (
      <div className="flex flex-col gap-4">
        {segment}
        {presets}
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        {segment}
        {presets}
      </CardContent>
    </Card>
  )
}
