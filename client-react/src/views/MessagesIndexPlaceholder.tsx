import { TemplateChatInputRow, TemplateChatRightShell } from '@/components/ui/chat-template'

/** 桌面端 /messages 索引：与模板右侧栏结构一致 */
export default function MessagesIndexPlaceholder() {
  return (
    <TemplateChatRightShell
      embedInLayout
      currentChat={{
        name: ' ',
        message: '',
        image: '',
      }}
      middle={
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
          选择左侧会话开始聊天
        </div>
      }
      inputRow={<TemplateChatInputRow inputProps={{ disabled: true }} />}
    />
  )
}
