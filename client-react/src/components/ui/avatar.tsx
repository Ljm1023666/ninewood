'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// 去掉 @radix-ui/react-avatar 依赖，避免其 use-sync-external-store CJS shim
// 在 Vite 8 Rolldown 预构建下导致 React 双实例、resolveDispatcher 返回 null

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
        className,
      )}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  onLoadingStatusChange?: (status: 'idle' | 'loading' | 'loaded' | 'error') => void
}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onLoadingStatusChange, onLoad, onError, ...props }, ref) => {
    const [status, setStatus] = React.useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

    const handleLoad = React.useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        setStatus('loaded')
        onLoadingStatusChange?.('loaded')
        onLoad?.(e)
      },
      [onLoad, onLoadingStatusChange],
    )

    const handleError = React.useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        setStatus('error')
        onLoadingStatusChange?.('error')
        onError?.(e)
      },
      [onError, onLoadingStatusChange],
    )

    React.useEffect(() => {
      if (status === 'idle') {
        setStatus('loading')
        onLoadingStatusChange?.('loading')
      }
    }, [status, onLoadingStatusChange])

    return (
      <img
        ref={ref}
        className={cn('aspect-square h-full w-full', className)}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    )
  },
)
AvatarImage.displayName = 'AvatarImage'

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string
}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className,
      )}
      {...props}
    />
  ),
)
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
