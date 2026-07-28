/** 登录页 Stitch 组件共享样式（静态 #0A0A0A 背景，无背景动画） */

export const LOGIN_PAGE_BG = 'bg-[#0A0A0A]'

export const glassCardClass =
  'w-full bg-white/[0.03] backdrop-blur-[12px] border border-white/[0.08] rounded-xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border-t-white/[0.15]'

export const pillInputClass =
  'w-full bg-white/[0.05] border border-white/[0.08] focus:border-[#3388FF] focus:bg-white/[0.02] rounded-full py-3 text-sm text-white placeholder:text-white/25 outline-none transition-[border-color,background-color] duration-300'

export const primaryButtonClass =
  // 兜底：未走 AuthPrimaryButton 时也勿用实心蓝胶囊
  'w-full rounded-full border border-[var(--liquid-glass-border,rgba(255,255,255,0.16))] bg-[var(--liquid-glass-bg,rgba(255,255,255,0.1))] py-3.5 text-sm font-medium text-[var(--text-primary,#e8e8e8)] shadow-[var(--liquid-glass-shadow)] backdrop-blur-[18px] transition-[background-color,transform,border-color] duration-200 hover:border-[color-mix(in_srgb,var(--color-primary,#2fbbe0)_35%,transparent)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40'

export const authCheckboxClass =
  'mt-0.5 w-4 h-4 shrink-0 rounded accent-[#3388FF] cursor-pointer border border-white/20 bg-white/10'
