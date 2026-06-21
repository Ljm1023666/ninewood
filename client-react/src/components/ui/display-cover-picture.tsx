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

export interface DisplayCoverPictureProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** JPEG 档 URL，或已解析的三格式 sources */
  sources: string | DisplayCoverSources
  /** 传给 <picture> 的布局类（默认与 img 相同） */
  pictureClassName?: string
}

/** display 档封面：<picture> 优先 AVIF/WebP，<img> 回退 JPEG */
export function DisplayCoverPicture({
  sources: sourcesInput,
  alt = '',
  className,
  pictureClassName,
  style,
  onError,
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

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const fb = fallbackDisplayCoverSrc(e.currentTarget.src)
      if (fb && fb !== e.currentTarget.src) {
        setJpegSrc(fb)
        e.currentTarget.src = fb
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
          <source srcSet={activeSources.avif} type="image/avif" />
          <source srcSet={activeSources.webp} type="image/webp" />
        </>
      ) : null}
      <img
        {...imgProps}
        src={activeSources.jpeg}
        alt={alt}
        className={className}
        style={style}
        onError={handleError}
      />
    </picture>
  )
}
