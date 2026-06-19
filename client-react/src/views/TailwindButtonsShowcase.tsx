import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import TailwindcssButtonsDemo from '@/components/ui/tailwindcss-buttons-demo'

/** 全站 Aceternity 风格按钮一览（不含消息模块） */
export default function TailwindButtonsShowcase() {
  const navigate = useNavigate()
  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col overflow-y-auto thin-scroll bg-background text-foreground">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl shrink-0 flex-col self-center px-4 pb-16 pt-6 sm:px-6">
        <div className="mb-8 flex items-center gap-3 border-b border-border pb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="返回"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Tailwind 按钮样式集</h1>
            <p className="mt-1 text-xs text-text-muted">
              点击卡片复制 JSX 或说明代码；各业务页已分散使用不同变体（消息页除外）。
            </p>
          </div>
        </div>
        <TailwindcssButtonsDemo />
      </div>
    </div>
  )
}
