import {
  useCallback,
  useEffect,
  useState,
  type ImgHTMLAttributes,
} from 'react'
import {
  fallbackDisplayCoverSrc,
  isManagedDisplayJpegUrl,
  toDisplayCoverSources,
  type DisplayCoverSources,
} from '@/utils/user-cover-presets'
import { resolvePublicUrl } from '@/config/runtime-origin'

export interface DisplayCoverPictureProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** JPEG 档 URL，或已解析的三格式 sources */
  sources: string | DisplayCoverSources
  /** 传给 <picture> 的布局类（默认与 img 相同） */
  pictureClassName?: string
}

/** display 档封面：<picture> 优先 AVIF/WebP，<img> 回退 JPEG。默认 lazy；主页开屏传 eager。 */
export function DisplayCoverPicture({
  sources: sourcesInput,
  alt = '',
  className,
  pictureClassName,
  style,
  onError,
  loading = 'lazy',
  fetchPriority,
  ...imgProps
}: DisplayCoverPictureProps) {
  const initialJpeg =
    typeof sourcesInput === 'string' ? sourcesInput : sourcesInput.jpeg
  const [jpegSrc, setJpegSrc] = useState(initialJpeg)

  useEffect(() => {
    setJpegSrc(typeof sourcesInput === 'string' ? sourcesInput : sourcesInput.jpeg)
  }, [sourcesInput])

  const activeSources = toDisplayCoverSources(jpegSrc)
  const managed = isManagedDisplayJpegUrl(activeSources.jpeg)
  const jpeg = resolvePublicUrl(activeSources.jpeg)
  const avif = resolvePublicUrl(activeSources.avif)
  const webp = resolvePublicUrl(activeSources.webp)

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const fb = fallbackDisplayCoverSrc(e.currentTarget.src)
      if (fb && fb !== e.currentTarget.src) {
        const next = resolvePublicUrl(fb)
        setJpegSrc(fb)
        e.currentTarget.src = next
        return
      }
      onError?.(e)
    },
    [onError],
  )

  return (
    <picture className={pictureClassName ?? className}>
      {managed ? (
        <>
          <source srcSet={avif} type="image/avif" />
          <source srcSet={webp} type="image/webp" />
        </>
      ) : null}
      <img
        {...imgProps}
        src={jpeg}
        alt={alt}
        className={className}
        style={style}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={imgProps.decoding ?? 'async'}
        onError={handleError}
      />
    </picture>
  )
}
