import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface MessageContextMenuProps {
  x: number
  y: number
  onCopy: () => void
  onClose: () => void
}

export function MessageContextMenu({
  x,
  y,
  onCopy,
  onClose,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      className="msg-context-menu"
      style={{ top: y, left: x }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="msg-context-menu__item"
        onClick={() => {
          onCopy()
          onClose()
        }}
      >
        复制
      </button>
    </div>,
    document.body,
  )
}

interface ImagePreviewProps {
  src: string
  open: boolean
  onClose: () => void
}

export function MessageImagePreview({ src, open, onClose }: ImagePreviewProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="msg-image-preview"
      role="dialog"
      aria-modal
      aria-label="图片预览"
      onClick={onClose}
    >
      <button
        type="button"
        className="msg-image-preview__close"
        onClick={onClose}
        aria-label="关闭"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        className="msg-image-preview__img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  )
}

export function SendStatusIndicator({
  status,
  onRetry,
  className,
}: {
  status: 'sending' | 'failed'
  onRetry?: () => void
  className?: string
}) {
  if (status === 'sending') {
    return (
      <span className={cn('msg-send-status msg-send-status--sending', className)}>
        发送中
      </span>
    )
  }
  return (
    <button
      type="button"
      className={cn('msg-send-status msg-send-status--failed', className)}
      onClick={onRetry}
      title="点击重试"
    >
      失败 · 重试
    </button>
  )
}
