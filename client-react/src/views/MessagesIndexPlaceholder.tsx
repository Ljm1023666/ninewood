import { TemplateChatRightShell } from '@/components/ui/chat-template'
import { MsgChatDepthPane } from '@/components/ui/msg-chat-depth-pane'
import { MessageCircle } from 'lucide-react'

/** 桌面端 /messages 索引：与模板右侧栏结构一致 */
export default function MessagesIndexPlaceholder() {
  return (
    <TemplateChatRightShell
      embedInLayout
      variant="internal"
      currentChat={null}
      middle={
        <MsgChatDepthPane paneKey="messages-index">
          <div className="msg-empty-thread">
            <div className="msg-empty-thread__icon" aria-hidden>
              <MessageCircle className="size-7" strokeWidth={1.7} />
            </div>
            <h2>开始一段对话</h2>
            <p>从左侧选择会话，消息会显示在这里。</p>
          </div>
        </MsgChatDepthPane>
      }
      inputRow={null}
    />
  )
}
