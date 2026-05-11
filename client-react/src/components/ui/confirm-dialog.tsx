interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = '确认', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 animate-fadeIn" onClick={onCancel}>
      <div className="bg-bg-secondary rounded-2xl p-6 w-[90%] max-w-sm border border-border" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border bg-transparent text-text-secondary text-sm font-semibold hover:bg-bg-tertiary">取消</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg bg-[var(--primary-gradient)] text-white text-sm font-semibold">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

type Toast = { id: number; message: string; type: 'success' | 'error' }

let toastId = 0
let setToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null

export function toast(msg: string, type: 'success' | 'error' = 'success') {
  const t: Toast = { id: toastId++, message: msg, type }
  setToasts?.((prev) => [...prev, t])
  setTimeout(() => setToasts?.((prev) => prev.filter((x) => x.id !== t.id)), 2500)
}

export function ToastContainer() {
  const [toasts, setThis] = useState<Toast[]>([])
  setToasts = setThis
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg animate-fadeIn ${t.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
