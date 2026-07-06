/**
 * 税务可视化页面
 * 方案 B: 左 1/3 控件 + 右 2/3 数据分析
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'
import { TaxTypeTabs } from './TaxTypeTabs'
import { TaxSubjectPicker } from './TaxSubjectPicker'
import SingleMode from './modes/SingleMode'
import CompareMode from './modes/CompareMode'
import { useTaxVisualizerStore } from '@/stores/tax-visualizer'
import { TAX_TYPE_LABEL } from '@/constants/tax-visualizer'
import { Layers, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TaxVisualizerPage() {
  const compareSubject = useTaxVisualizerStore((s) => s.compareSubject)
  const taxType = useTaxVisualizerStore((s) => s.taxType)
  const [mode, setMode] = useState<'single' | 'compare'>(compareSubject ? 'compare' : 'single')

  useEffect(() => {
    setMode(compareSubject ? 'compare' : 'single')
  }, [compareSubject])

  return (
    <div className="tax-viz-page relative min-h-full w-full">
      <div className="tax-viz-page__ambient" aria-hidden />

      <InternalPageShell width="fluid" flush className="items-stretch">
        <PageHeader
          title="税务可视化"
          subtitle={
            <span className="tax-viz-page__subtitle">
              直观清晰 · {TAX_TYPE_LABEL[taxType]}
            </span>
          }
          variant="centered"
          onBack="back"
          divider={false}
          className="[&_h1]:tax-viz-page__title"
          actions={
            <div
              className={cn(
                'tax-viz-mode-switch flex items-center gap-1 rounded-lg border p-0.5',
                'tax-viz-mode-switch--b',
              )}
            >
              <button
                type="button"
                onClick={() => setMode('single')}
                aria-pressed={mode === 'single'}
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                  'active:scale-[0.97]',
                  mode === 'single'
                    ? 'tax-viz-mode-switch__btn--active'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Square className="size-3" />
                单主体
              </button>
              <button
                type="button"
                onClick={() => compareSubject && setMode('compare')}
                disabled={!compareSubject}
                aria-pressed={mode === 'compare'}
                title={
                  !compareSubject
                    ? '请先在主体选择器勾选第二个主体作为对比对象'
                    : undefined
                }
                className={cn(
                  'flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                  'active:scale-[0.97]',
                  mode === 'compare'
                    ? 'tax-viz-mode-switch__btn--active'
                    : 'text-muted-foreground hover:text-foreground',
                  !compareSubject && 'cursor-not-allowed opacity-50',
                )}
              >
                <Layers className="size-3" />
                对比
              </button>
            </div>
          }
        />

        <div className="flex w-full flex-col gap-6 px-6 pb-6 lg:px-8">
          <AnimatePresence mode="wait">
            {mode === 'compare' && !compareSubject && (
              <motion.div
                key="compare-hint"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22 }}
                role="status"
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200"
              >
                请先在主体选择器中右键点击第二个主体,即可进入 VS 对比模式。
              </motion.div>
            )}

            {mode === 'compare' && compareSubject ? (
              <motion.div
                key="compare"
                className="tax-viz-main tax-viz-main--compare"
                initial={{ opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="mb-4 flex flex-col gap-4">
                  <TaxTypeTabs layout="card" />
                  <TaxSubjectPicker layout="card" />
                </div>
                <CompareMode />
              </motion.div>
            ) : (
              <motion.div
                key={`single-${taxType}`}
                className="tax-viz-main tax-viz-main--single tax-viz-split"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <aside className="tax-viz-split__sidebar">
                  <TaxTypeTabs layout="split" />
                  <TaxSubjectPicker layout="split" />
                  <SingleMode surface="controls" />
                </aside>
                <div className="tax-viz-split__main">
                  {!(mode === 'compare' && !compareSubject) && (
                    <SingleMode surface="analysis" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="border-t border-white/6 pt-4 text-center text-xs text-muted-foreground/80">
            本工具仅供科普参考,不构成税务建议。具体申报请以税务机关公告为准。
          </div>
        </div>
      </InternalPageShell>
    </div>
  )
}
