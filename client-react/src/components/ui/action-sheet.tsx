import { Image, Video } from 'lucide-react'

interface ActionSheetProps {
  visible: boolean
  onClose: () => void
  onSelect: (action: string) => void
}

const actions = [
  { key: 'image', label: '图片', icon: Image },
  { key: 'video', label: '视频', icon: Video },
]

export function ActionSheet({ visible, onClose, onSelect }: ActionSheetProps) {
  if (!visible) return null
  return (
    <div
      className="fixed inset-0 z-[var(--z-sticky)] bg-background/55 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl pt-5 px-4 pb-8 border-t border-border animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-2 gap-4">
          {actions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className="flex flex-col items-center gap-2 bg-transparent border-none text-text-primary cursor-pointer py-3 px-2 rounded-xl hover:bg-bg-tertiary"
            >
              <Icon className="size-8" />
              <span className="text-sm text-text-secondary">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
