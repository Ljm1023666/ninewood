import { LegalDialog } from '@/components/ui/terms-conditions'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

type LegalSection = { title: string; content: string | string[] }

export function LoginFooter({
  termsSections,
  privacySections,
}: {
  termsSections: LegalSection[]
  privacySections: LegalSection[]
}) {
  return (
    <footer className="fixed bottom-0 z-10 flex w-full flex-col items-center gap-2 bg-transparent pb-8">
      <div className="flex items-center gap-4">
        <LegalDialog
          trigger={
            <LiquidMetalButton
              type="button"
              className="text-xs text-white/40 transition-colors duration-200 hover:text-[#3388FF]"
            >
              服务条款
            </LiquidMetalButton>
          }
          title="服务条款"
          sections={termsSections}
        />
        <span className="select-none text-xs text-white/20">·</span>
        <LegalDialog
          trigger={
            <LiquidMetalButton
              type="button"
              className="text-xs text-white/40 transition-colors duration-200 hover:text-[#3388FF]"
            >
              隐私政策
            </LiquidMetalButton>
          }
          title="隐私政策"
          sections={privacySections}
        />
      </div>
      <p className="text-xs text-white/30">© {new Date().getFullYear()} Ninewood. 保留所有权利。</p>
    </footer>
  )
}
