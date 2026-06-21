import { cn } from '@/lib/utils'

export function parseFlipCardPriceNumber(price: string): number {
  const n = Number(price.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** 翻面卡标题色条 shimmer，与 InteractiveProductCard 一致 */
export function getFlipCardTitleBarClass(price: string): string {
  const n = parseFlipCardPriceNumber(price)
  return cn(
    'flip-card-title-bar-shimmer',
    n > 10000
      ? 'flip-card-title-bar-shimmer--rainbow'
      : n > 3000
        ? 'flip-card-title-bar-shimmer--gold'
        : n > 1000
          ? 'flip-card-title-bar-shimmer--red'
          : n > 500
            ? 'flip-card-title-bar-shimmer--orange'
            : n > 100
              ? 'flip-card-title-bar-shimmer--violet'
              : n > 10
                ? 'flip-card-title-bar-shimmer--blue'
                : 'flip-card-title-bar-shimmer--green',
  )
}
