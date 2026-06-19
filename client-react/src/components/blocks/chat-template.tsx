/**
 * 与官方示例路径对齐：`import { Home } from "@/components/blocks/chat-template"`
 * 实现仍集中在 `src/components/ui/chat-template.tsx`
 */
import { SidebarProvider } from '@/components/blocks/sidebar'
import { Home } from '@/components/ui/chat-template'

export {
  Home,
  DEFAULT_CONTACT_LIST,
  ChatTemplateDemoPage,
  TemplateChatRightShell,
  TemplateChatInputRow,
  type TemplateContact,
  type HomeProps,
} from '@/components/ui/chat-template'
export { SidebarProvider, useSidebar } from '@/components/blocks/sidebar'

/** 与所给 demo.tsx 一致 */
export function Demo() {
  return (
    <SidebarProvider>
      <Home />
    </SidebarProvider>
  )
}
