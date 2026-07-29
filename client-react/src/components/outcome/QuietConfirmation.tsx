/**
 * Quiet 确认区：单一主动作，无「继续探索」类 CTA
 */

import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

type Props = {
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function QuietConfirmation({
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3" data-testid="quiet-confirmation">
      {/* 主 CTA：全局选择按钮标准 */}
      <LiquidMetalButton label={primaryLabel} onClick={onPrimary} />
      {secondaryLabel && onSecondary ? (
        <LiquidMetalButton
          type="button"
          className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-sm text-text-secondary"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </LiquidMetalButton>
      ) : null}
    </div>
  )
}
