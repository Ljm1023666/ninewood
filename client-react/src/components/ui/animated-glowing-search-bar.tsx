import { type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AnimatedGlowingSearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** 按 Enter 时触发（例如提交搜索） */
  onSubmit?: () => void
}

/** 发光渐变描边搜索框：固定约 301×56，无左侧放大镜，右侧保留筛选装饰块。 */
export function AnimatedGlowingSearchBar({
  value,
  onChange,
  placeholder = '搜索…',
  className,
  onSubmit,
}: AnimatedGlowingSearchBarProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSubmit?.()
  }

  return (
    <div className={cn('relative flex w-full justify-center', className)}>
      <div className="group relative box-border w-full max-w-[301px] shrink-0">
        {/* 光晕层：与案例同尺寸基准 */}
        <div
          className="absolute z-[-1] h-full w-full max-h-[70px] max-w-[314px] overflow-hidden rounded-xl blur-[3px]
            before:absolute before:top-1/2 before:left-1/2 before:z-[-2] before:h-[999px] before:w-[999px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg] before:bg-[conic-gradient(#000,#402fb5_5%,#000_38%,#000_50%,#cf30aa_60%,#000_87%)] before:bg-no-repeat before:transition-all before:duration-[2000ms] before:content-['']
            group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]"
        />
        <div
          className="absolute z-[-1] h-full w-full max-h-[65px] max-w-[312px] overflow-hidden rounded-xl blur-[3px]
            before:absolute before:top-1/2 before:left-1/2 before:z-[-2] before:h-[600px] before:w-[600px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg] before:bg-[conic-gradient(rgba(0,0,0,0),#18116a,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#6e1b60,rgba(0,0,0,0)_60%)] before:bg-no-repeat before:transition-all before:duration-[2000ms] before:content-['']
            group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]"
        />
        <div
          className="absolute z-[-1] h-full w-full max-h-[63px] max-w-[307px] overflow-hidden rounded-lg blur-[2px]
            before:absolute before:top-1/2 before:left-1/2 before:z-[-2] before:h-[600px] before:w-[600px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg] before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#a099d8,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#dfa2da,rgba(0,0,0,0)_58%)] before:bg-no-repeat before:brightness-[1.4] before:transition-all before:duration-[2000ms] before:content-['']
            group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]"
        />
        <div
          className="absolute z-[-1] h-full w-full max-h-[59px] max-w-[303px] overflow-hidden rounded-xl blur-[0.5px]
            before:absolute before:top-1/2 before:left-1/2 before:z-[-2] before:h-[600px] before:w-[600px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg] before:bg-[conic-gradient(#1c191c,#402fb5_5%,#1c191c_14%,#1c191c_50%,#cf30aa_60%,#1c191c_64%)] before:bg-no-repeat before:brightness-[1.3] before:transition-all before:duration-[2000ms] before:content-['']
            group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]"
        />

        <div className="relative isolate h-[56px] w-full">
          <input
            type="text"
            name="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoComplete="off"
            className={cn(
              'box-border h-[56px] w-full rounded-lg border-none bg-[#010201] pl-4 text-lg text-white placeholder:text-gray-400 focus:outline-none',
              value ? 'pr-[92px]' : 'pr-[59px]',
            )}
            aria-label={placeholder}
          />

          <div
            className={cn(
              'glowing-search-conic-spin pointer-events-none absolute top-[7px] right-[7px] z-[2] h-[42px] w-10 overflow-hidden rounded-lg',
              "before:absolute before:top-1/2 before:left-1/2 before:h-[600px] before:w-[600px] before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-90 before:bg-[conic-gradient(rgba(0,0,0,0),#3d3a4f,rgba(0,0,0,0)_50%,rgba(0,0,0,0)_50%,#3d3a4f,rgba(0,0,0,0)_100%)] before:bg-no-repeat before:brightness-[1.35] before:content-['']",
            )}
          />

          {/* 固定 38×40，禁止 w-full 拉满整条（否则会乱版） */}
          <div className="absolute top-2 right-2 z-[3] flex h-10 w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-transparent bg-gradient-to-b from-[#161329] via-black to-[#1d1b4b] [isolation:isolate]">
            <svg
              preserveAspectRatio="none"
              height="27"
              width="27"
              viewBox="4.8 4.56 14.832 15.408"
              fill="none"
              aria-hidden
            >
              <path
                d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                stroke="#d6d6e6"
                strokeWidth="1"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1/2 right-[48px] z-[4] flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="清除"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AnimatedGlowingSearchBar
