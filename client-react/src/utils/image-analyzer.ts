/** 分析图片平均亮度（0-255），返回 > 160 则为浅色图 */
export async function getImageAvgLuminance(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const sampleSize = 32
        canvas.width = sampleSize
        canvas.height = sampleSize
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(128)

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize)
        const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data
        let totalLum = 0
        const pixelCount = sampleSize * sampleSize
        for (let i = 0; i < data.length; i += 4) {
          totalLum +=
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        }
        resolve(totalLum / pixelCount)
      } catch {
        resolve(128)
      }
    }
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = url
  })
}

/** 浅色阈值：平均亮度超过此值使用低调白光 */
export const LIGHT_IMAGE_LUMINANCE_THRESHOLD = 160

/** 生成缩略图 dataURL — 降低 3D 渲染的 GPU 压力 */
export async function getThumbnailUrl(
  url: string,
  maxWidth = 200,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ratio = img.height / img.width
        canvas.width = Math.min(img.width, maxWidth)
        canvas.height = Math.round(canvas.width * ratio)
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(url)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      } catch {
        resolve(url)
      }
    }
    img.onerror = () => resolve(url) // 失败回退原图
    img.src = url
  })
}
