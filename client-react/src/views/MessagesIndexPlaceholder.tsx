import {
  TemplateChatInputRow,
  TemplateChatRightShell,
} from '@/components/ui/chat-template'

/** 桌面端 /messages 索引：与模板右侧栏结构一致 */
export default function MessagesIndexPlaceholder() {
  return (
    <TemplateChatRightShell
      embedInLayout
      variant="internal"
      currentChat={null}
      middle={
        <div className="flex h-full min-h-0 flex-col items-center justify-center bg-bg-primary/50 px-6 text-center">
          <p className="text-sm text-text-muted">选择左侧会话开始聊天</p>
        </div>
      }
      inputRow={<TemplateChatInputRow inputProps={{ disabled: true }} />}
    />
  )
}
