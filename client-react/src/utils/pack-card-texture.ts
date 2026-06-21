/** 3D 画廊卡面纹理：原图合成，canvas 宽 800–1080px WebP（不支持时回退 PNG） */

const DESIGN_W = 380

/** 不低于详情页 detail 档 */
export const GALLERY_TEXTURE_MIN_W = 800

/** 画廊纹理宽度上限 */
export const GALLERY_TEXTURE_MAX_W = 1080

export type PackCardTextureInput = {

  src: string

  title: string

  price: string

  /** 原图加载失败时回退（如 detail 800px） */

  fallbackSrc?: string

}



type CanvasMetrics = {

  cardW: number

  cardH: number

  scale: number

  radius: number

}



function parsePriceNumber(price: string): number {

  const n = Number(price.replace(/[^\d.]/g, ''))

  return Number.isFinite(n) ? n : 0

}



function resolveGalleryCanvasWidth(sourceWidth: number): number {

  const w = Number.isFinite(sourceWidth) && sourceWidth > 0 ? sourceWidth : GALLERY_TEXTURE_MIN_W

  return Math.min(GALLERY_TEXTURE_MAX_W, Math.max(GALLERY_TEXTURE_MIN_W, w))

}



function metricsForWidth(cardW: number): CanvasMetrics {

  const scale = cardW / DESIGN_W

  return {

    cardW,

    cardH: Math.round(cardW * (16 / 9)),

    scale,

    radius: Math.round(24 * scale),

  }

}



function getShimmerBgColor(price: string): string {

  const n = parsePriceNumber(price)

  if (n > 10000) return 'hsl(250, 30%, 12%)'

  if (n > 3000) return 'hsl(35, 30%, 12%)'

  if (n > 1000) return 'hsl(0, 30%, 12%)'

  if (n > 500) return 'hsl(18, 30%, 12%)'

  if (n > 100) return 'hsl(265, 30%, 12%)'

  if (n > 10) return 'hsl(220, 30%, 12%)'

  return 'hsl(150, 30%, 12%)'

}



function loadImage(src: string): Promise<HTMLImageElement> {

  return new Promise((resolve, reject) => {

    const img = new Image()

    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)

    img.onerror = reject

    img.src = src

  })

}



async function loadCoverImage(

  src: string,

  fallbackSrc?: string,

): Promise<HTMLImageElement | null> {

  try {

    return await loadImage(src)

  } catch {

    if (!fallbackSrc || fallbackSrc === src) return null

    try {

      return await loadImage(fallbackSrc)

    } catch {

      return null

    }

  }

}



function getTitleBarGradientStops(price: string): readonly [string, string, string, string, string] {
  const n = parsePriceNumber(price)
  if (n > 10000) {
    return ['#7f1d1d', '#ea580c', '#eab308', '#22c55e', '#3b82f6'] as const
  }
  if (n > 3000) return ['#78350f', '#92400e', '#b45309', '#92400e', '#78350f'] as const
  if (n > 1000) return ['#7f1d1d', '#b91c1c', '#dc2626', '#b91c1c', '#7f1d1d'] as const
  if (n > 500) return ['#7c2d12', '#c2410c', '#ea580c', '#c2410c', '#7c2d12'] as const
  if (n > 100) return ['#4c1d95', '#6d28d9', '#7c3aed', '#6d28d9', '#4c1d95'] as const
  if (n > 10) return ['#1e3a8a', '#1d4ed8', '#2563eb', '#1d4ed8', '#1e3a8a'] as const
  return ['#14532d', '#166534', '#15803d', '#166534', '#14532d'] as const
}

function drawFrontTitleBar(
  ctx: CanvasRenderingContext2D,
  title: string,
  price: string,
  m: CanvasMetrics,
) {
  const padY = Math.round(16 * m.scale)
  const fontSize = Math.round(22 * m.scale)
  const barH = padY * 2 + Math.round(fontSize * 1.45)
  const stops = getTitleBarGradientStops(price)
  const grad = ctx.createLinearGradient(0, 0, m.cardW, 0)
  grad.addColorStop(0, stops[0])
  grad.addColorStop(0.22, stops[1])
  grad.addColorStop(0.5, stops[2])
  grad.addColorStop(0.78, stops[3])
  grad.addColorStop(1, stops[4])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, m.cardW, barH)

  const display = title.length > 14 ? `${title.slice(0, 14)}…` : title
  ctx.fillStyle = '#000000'
  ctx.font = `700 ${fontSize}px "Segoe UI", "PingFang SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(display, m.cardW / 2, barH / 2)
}

function roundRectPath(

  ctx: CanvasRenderingContext2D,

  x: number,

  y: number,

  w: number,

  h: number,

  r: number,

) {

  const radius = Math.min(r, w / 2, h / 2)

  ctx.beginPath()

  ctx.moveTo(x + radius, y)

  ctx.lineTo(x + w - radius, y)

  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)

  ctx.lineTo(x + w, y + h - radius)

  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)

  ctx.lineTo(x + radius, y + h)

  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)

  ctx.lineTo(x, y + radius)

  ctx.quadraticCurveTo(x, y, x + radius, y)

  ctx.closePath()

}



function drawCoverFallback(

  ctx: CanvasRenderingContext2D,

  title: string,

  price: string,

  m: CanvasMetrics,

) {

  ctx.fillStyle = getShimmerBgColor(price)

  ctx.fillRect(0, 0, m.cardW, m.cardH)

  ctx.fillStyle = '#888'

  ctx.font = `600 ${Math.round(18 * m.scale)}px sans-serif`

  ctx.textAlign = 'center'

  ctx.textBaseline = 'middle'

  ctx.fillText(title.slice(0, 20), m.cardW / 2, m.cardH / 2)

}



const WEBP_TEXTURE_QUALITY = 0.92

function canvasToObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob))
          return
        }
        canvas.toBlob(
          (pngBlob) =>
            pngBlob
              ? resolve(URL.createObjectURL(pngBlob))
              : reject(new Error('toBlob failed')),
          'image/png',
        )
      },
      'image/webp',
      WEBP_TEXTURE_QUALITY,
    )
  })
}



function createCanvas(m: CanvasMetrics): {

  canvas: HTMLCanvasElement

  ctx: CanvasRenderingContext2D

} {

  const canvas = document.createElement('canvas')

  canvas.width = m.cardW

  canvas.height = m.cardH

  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('Canvas 不可用')

  ctx.imageSmoothingEnabled = true

  ctx.imageSmoothingQuality = 'high'

  return { canvas, ctx }

}



async function buildPackCardFrontTextureUrl(

  input: PackCardTextureInput,

  coverImage: HTMLImageElement | null,

  cardW: number,

): Promise<string> {

  const m = metricsForWidth(cardW)

  const { canvas, ctx } = createCanvas(m)



  ctx.save()

  roundRectPath(ctx, 0, 0, m.cardW, m.cardH, m.radius)

  ctx.clip()



  if (coverImage) {

    const scale = Math.max(m.cardW / coverImage.width, m.cardH / coverImage.height)

    const w = coverImage.width * scale

    const h = coverImage.height * scale

    ctx.drawImage(coverImage, (m.cardW - w) / 2, (m.cardH - h) / 2, w, h)

  } else {

    drawCoverFallback(ctx, input.title, input.price, m)

  }

  if (input.title.trim()) {
    drawFrontTitleBar(ctx, input.title, input.price, m)
  }

  ctx.restore()



  return canvasToObjectUrl(canvas)

}



async function buildPackCardBackTextureUrl(

  input: PackCardTextureInput,

  cardW: number,

): Promise<string> {

  const m = metricsForWidth(cardW)

  const { canvas, ctx } = createCanvas(m)



  ctx.save()

  roundRectPath(ctx, 0, 0, m.cardW, m.cardH, m.radius)

  ctx.clip()



  ctx.fillStyle = getShimmerBgColor(input.price)

  ctx.fillRect(0, 0, m.cardW, m.cardH)



  const priceText = input.price?.trim() || '—'

  ctx.fillStyle = '#ffffff'

  ctx.font = `800 ${Math.round(48 * m.scale)}px "Segoe UI", "PingFang SC", sans-serif`

  ctx.textAlign = 'center'

  ctx.textBaseline = 'middle'

  ctx.fillText(priceText, m.cardW / 2, m.cardH * 0.82)



  ctx.restore()



  return canvasToObjectUrl(canvas)

}



/** 画廊卡面标题色条高度占比（与 drawFrontTitleBar 一致） */
export function getGalleryTitleBarHeightRatio(cardW = GALLERY_TEXTURE_MIN_W): number {
  const m = metricsForWidth(cardW)
  const padY = Math.round(16 * m.scale)
  const fontSize = Math.round(22 * m.scale)
  const barH = padY * 2 + Math.round(fontSize * 1.45)
  return barH / m.cardH
}

export async function buildPackCardTitleBarTextureUrl(
  title: string,
  price: string,
  cardW = GALLERY_TEXTURE_MIN_W,
): Promise<string> {
  const m = metricsForWidth(cardW)
  const padY = Math.round(16 * m.scale)
  const fontSize = Math.round(22 * m.scale)
  const barH = padY * 2 + Math.round(fontSize * 1.45)
  const canvas = document.createElement('canvas')
  canvas.width = m.cardW
  canvas.height = barH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  drawFrontTitleBar(ctx, title, price, m)
  return canvasToObjectUrl(canvas)
}

export async function buildPackCardGalleryItem(input: {
  detailImageUrl: string
  title: string
  price: string
}) {
  const back = await buildPackCardBackTextureUrl(
    {
      src: input.detailImageUrl,
      title: input.title,
      price: input.price,
    },
    GALLERY_TEXTURE_MIN_W,
  )
  return { front: input.detailImageUrl, back }
}

/** 快速路径：正面 detail 直链，仅背面 canvas（预取首屏，后台再升级 HD 正面） */
export async function buildPackCardFastGalleryItem(input: {
  detailImageUrl: string
  title: string
  price: string
}) {
  return buildPackCardGalleryItem(input)
}

export async function buildPackCardTexturePair(input: PackCardTextureInput) {
  const coverImage = await loadCoverImage(input.src, input.fallbackSrc)
  const cardW = coverImage
    ? resolveGalleryCanvasWidth(coverImage.naturalWidth)
    : GALLERY_TEXTURE_MIN_W

  const [front, back] = await Promise.all([
    buildPackCardFrontTextureUrl(input, coverImage, cardW),
    buildPackCardBackTextureUrl(input, cardW),
  ])
  return { front, back }
}


