export interface AnimatedSearchBarProps {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  placeholder?: string
  className?: string
}

export function AnimatedSearchBar({
  value,
  onChange,
  onEnter,
  placeholder = '搜索...',
  className,
}: AnimatedSearchBarProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onEnter) onEnter()
      }}
      placeholder={placeholder}
      className={`w-[56%] rounded-xl border border-border bg-muted px-5 text-sm font-medium text-foreground text-center outline-none placeholder:text-foreground/40 mx-auto block ${className}`}
      style={{ height: 36 }}
    />
  )
}
