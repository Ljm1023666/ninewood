import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '@/styles/agent-codex.css'
import { cn } from '@/lib/utils'

interface AgentMarkdownProps {
  content: string
  className?: string
}

/** Agent 助手消息 Markdown 渲染（ChatGPT 风格排版） */
export function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  if (!content.trim()) return null

  return (
    <div className={cn('agent-codex-md', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
