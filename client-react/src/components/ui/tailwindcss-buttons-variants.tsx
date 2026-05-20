import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>

// ═══ 标准按钮层级（项目使用这 4 种） ═══

/** 主要操作 — 渐变填充 */
export const AcetPrimaryButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'h-11 rounded-xl bg-[var(--primary-gradient)] px-6 text-sm font-semibold text-white',
        'transition-all duration-200 hover:opacity-90 hover:shadow-lg',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
)
AcetPrimaryButton.displayName = 'AcetPrimaryButton'

/** 次要操作 — 线框 + hover 填充 */
export const AcetSecondaryButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'h-11 rounded-xl border border-border bg-transparent px-6 text-sm font-semibold text-text-secondary',
        'transition-all duration-200 hover:border-accent/40 hover:bg-accent/8 hover:text-text-primary',
        'active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
)
AcetSecondaryButton.displayName = 'AcetSecondaryButton'

// ═══ 保留：向后兼容（已使用的地方不强制替换） ═══

export const AcetSketchButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md border border-black bg-white px-4 py-2 text-sm text-black transition duration-200 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0)]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Sketch'}
    </button>
  ),
)
AcetSketchButton.displayName = 'AcetSketchButton'

export const AcetSimpleButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'transform rounded-md border border-neutral-300 bg-neutral-100 px-4 py-2 text-sm text-neutral-500 transition duration-200 hover:-translate-y-1 hover:shadow-md',
        className,
      )}
      {...rest}
    >
      {children ?? 'Simple'}
    </button>
  ),
)
AcetSimpleButton.displayName = 'AcetSimpleButton'

export const AcetInvertButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md border-2 border-transparent bg-teal-500 px-8 py-2 font-bold text-white transition duration-200 hover:border-teal-500 hover:bg-white hover:text-black',
        className,
      )}
      {...rest}
    >
      {children ?? 'Invert'}
    </button>
  ),
)
AcetInvertButton.displayName = 'AcetInvertButton'

export const AcetTailwindConnectButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'group relative inline-block cursor-pointer rounded-full bg-slate-800 p-px text-xs font-semibold leading-6 text-white no-underline shadow-2xl shadow-zinc-900',
        className,
      )}
      {...rest}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </span>
      <div className="relative z-10 flex items-center space-x-2 rounded-full bg-zinc-950 px-4 py-0.5 ring-1 ring-white/10">
        <span>{children ?? 'Tailwind Connect'}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M10.75 8.75L14.25 12L10.75 15.25"
          />
        </svg>
      </div>
      <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
    </button>
  ),
)
AcetTailwindConnectButton.displayName = 'AcetTailwindConnectButton'

export const AcetGradientButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-8 py-2 text-white transition duration-200 hover:shadow-xl focus:ring-2 focus:ring-blue-400',
        className,
      )}
      {...rest}
    >
      {children ?? 'Gradient'}
    </button>
  ),
)
AcetGradientButton.displayName = 'AcetGradientButton'

export const AcetUnapologeticButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'group relative border border-black bg-transparent px-8 py-2 text-black transition duration-200 dark:border-white',
        className,
      )}
      {...rest}
    >
      <div className="absolute -bottom-2 -right-2 -z-10 h-full w-full bg-yellow-300 transition-all duration-200 group-hover:bottom-0 group-hover:right-0" />
      <span className="relative">{children ?? 'Unapologetic'}</span>
    </button>
  ),
)
AcetUnapologeticButton.displayName = 'AcetUnapologeticButton'

export const AcetLitUpBordersButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn('group relative p-[3px]', className)}
      {...rest}
    >
      <div className="absolute inset-0 rounded-lg bg-[var(--accent-gradient)]" />
      <div className="relative rounded-[6px] bg-bg-primary px-8 py-2 text-white transition duration-200 group-hover:bg-transparent">
        {children ?? 'Lit up borders'}
      </div>
    </button>
  ),
)
AcetLitUpBordersButton.displayName = 'AcetLitUpBordersButton'

export const AcetBorderMagicButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative inline-flex h-12 overflow-hidden rounded-full p-px focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50',
        className,
      )}
      {...rest}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
        {children ?? 'Border Magic'}
      </span>
    </button>
  ),
)
AcetBorderMagicButton.displayName = 'AcetBorderMagicButton'

export const AcetBrutalButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'border-2 border-black bg-white px-8 py-0.5 text-sm uppercase text-black shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)] transition duration-200 dark:border-white dark:shadow-[1px_1px_rgba(255,255,255),2px_2px_rgba(255,255,255),3px_3px_rgba(255,255,255),4px_4px_rgba(255,255,255),5px_5px_0px_0px_rgba(255,255,255)]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Brutal'}
    </button>
  ),
)
AcetBrutalButton.displayName = 'AcetBrutalButton'

export const AcetFavouriteButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md bg-bg-primary px-8 py-2 text-sm font-semibold text-white hover:bg-bg-secondary hover:shadow-lg',
        className,
      )}
      {...rest}
    >
      {children ?? 'Favourite'}
    </button>
  ),
)
AcetFavouriteButton.displayName = 'AcetFavouriteButton'

export const AcetOutlineButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-xl border border-neutral-600 bg-white px-4 py-2 text-black transition duration-200 hover:bg-gray-100',
        className,
      )}
      {...rest}
    >
      {children ?? 'Outline'}
    </button>
  ),
)
AcetOutlineButton.displayName = 'AcetOutlineButton'

export const AcetShimmerButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50',
        className,
      )}
      {...rest}
    >
      {children ?? 'Shimmer'}
    </button>
  ),
)
AcetShimmerButton.displayName = 'AcetShimmerButton'

export const AcetNextBlueButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md bg-[#0070f3] px-8 py-2 font-light text-white shadow-[0_4px_14px_0_rgb(0,118,255,39%)] transition duration-200 ease-linear hover:bg-[rgba(0,118,255,0.9)] hover:shadow-[0_6px_20px_rgba(0,118,255,23%)]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Next.js Blue'}
    </button>
  ),
)
AcetNextBlueButton.displayName = 'AcetNextBlueButton'

export const AcetNextWhiteButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md bg-[#fff] px-8 py-2 font-light text-[#696969] shadow-[0_4px_14px_0_rgb(0,0,0,10%)] transition duration-200 ease-linear hover:shadow-[0_6px_20px_rgba(93,93,93,23%)]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Next White'}
    </button>
  ),
)
AcetNextWhiteButton.displayName = 'AcetNextWhiteButton'

export const AcetSpotifyButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'transform rounded-full bg-[#1ED760] px-12 py-4 font-bold uppercase tracking-widest text-white transition-colors duration-200 hover:scale-105 hover:bg-[#21e065]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Spotify'}
    </button>
  ),
)
AcetSpotifyButton.displayName = 'AcetSpotifyButton'

export const AcetBackdropBlurButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-md border border-black bg-white/[0.2] px-4 py-2 text-sm text-black backdrop-blur-sm transition duration-200 hover:shadow-[0px_0px_4px_4px_rgba(0,0,0,0.1)]',
        className,
      )}
      {...rest}
    >
      {children ?? 'Backdrop blur'}
    </button>
  ),
)
AcetBackdropBlurButton.displayName = 'AcetBackdropBlurButton'

export const AcetPlaylistButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'rounded-full border border-transparent bg-transparent px-12 py-4 font-bold uppercase tracking-widest text-black shadow-[inset_0_0_0_2px_#616467] transition duration-200 hover:bg-[#616467] hover:text-white dark:text-neutral-200',
        className,
      )}
      {...rest}
    >
      {children ?? 'Playlist'}
    </button>
  ),
)
AcetPlaylistButton.displayName = 'AcetPlaylistButton'

export const AcetFigmaButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'transform rounded-lg bg-bg-primary px-6 py-2 font-bold text-white transition duration-300 hover:-translate-y-1',
        className,
      )}
      {...rest}
    >
      {children ?? 'Figma'}
    </button>
  ),
)
AcetFigmaButton.displayName = 'AcetFigmaButton'

export const AcetFigmaOutlineButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'transform rounded-lg border border-black bg-transparent px-6 py-2 font-bold text-black shadow-[0_0_0_3px_#000000_inset] transition duration-300 hover:-translate-y-1 dark:border-white dark:text-white',
        className,
      )}
      {...rest}
    >
      {children ?? 'Figma Outline'}
    </button>
  ),
)
AcetFigmaOutlineButton.displayName = 'AcetFigmaOutlineButton'

export const AcetTopGradientButton = forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'relative rounded-full border border-slate-600 bg-slate-700 px-8 py-2 text-sm text-white transition duration-200 hover:shadow-2xl hover:shadow-white/[0.1]',
        className,
      )}
      {...rest}
    >
      <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-teal-500 to-transparent shadow-2xl" />
      <span className="relative z-20">{children ?? 'Top gradient'}</span>
    </button>
  ),
)
AcetTopGradientButton.displayName = 'AcetTopGradientButton'
