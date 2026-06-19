import { useNavigate } from 'react-router-dom'

interface ChatNavBarProps {
  nickname: string
  className?: string
}

export function ChatNavBar({ nickname, className }: ChatNavBarProps) {
  const navigate = useNavigate()
  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-between h-12 px-1 border-b border-border bg-card/80 backdrop-blur-md ${className || ''}`}
    >
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 flex items-center justify-center bg-transparent border-none text-text-primary cursor-pointer rounded-full hover:bg-bg-tertiary"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="text-base font-semibold text-text-primary max-w-[50%] overflow-hidden text-ellipsis whitespace-nowrap">
        {nickname}
      </span>
      <button className="w-10 h-10 flex items-center justify-center bg-transparent border-none text-text-primary cursor-pointer rounded-full hover:bg-bg-tertiary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    </div>
  )
}
