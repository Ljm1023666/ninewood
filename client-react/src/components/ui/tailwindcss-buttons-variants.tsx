import { forwardRef } from 'react'
import {
  LiquidMetalButton,
  type LiquidMetalButtonProps,
  type LiquidMetalButtonVariant,
} from '@/components/ui/liquid-metal-button'

type BtnProps = LiquidMetalButtonProps

/**
 * 旧 Aceternity 按钮名称仍供业务代码调用，但不再维护独立视觉实现。
 * 所有别名最终都渲染同一个 LiquidMetalButton。
 */
function createMetalButton(
  displayName: string,
  variant: LiquidMetalButtonVariant,
  fallbackLabel: string,
) {
  const Component = forwardRef<HTMLButtonElement, BtnProps>(
    ({ children, type = 'button', ...props }, ref) => (
      <LiquidMetalButton ref={ref} type={type} variant={variant} {...props}>
        {children ?? fallbackLabel}
      </LiquidMetalButton>
    ),
  )
  Component.displayName = displayName
  return Component
}

export const AcetPrimaryButton = createMetalButton('AcetPrimaryButton', 'primary', '确定')
export const AcetSecondaryButton = createMetalButton('AcetSecondaryButton', 'secondary', '取消')
export const AcetSketchButton = createMetalButton('AcetSketchButton', 'secondary', 'Sketch')
export const AcetSimpleButton = createMetalButton('AcetSimpleButton', 'secondary', 'Simple')
export const AcetInvertButton = createMetalButton('AcetInvertButton', 'primary', 'Invert')
export const AcetTailwindConnectButton = createMetalButton('AcetTailwindConnectButton', 'primary', 'Tailwind Connect')
export const AcetGradientButton = createMetalButton('AcetGradientButton', 'primary', 'Gradient')
export const AcetUnapologeticButton = createMetalButton('AcetUnapologeticButton', 'primary', 'Unapologetic')
export const AcetLitUpBordersButton = createMetalButton('AcetLitUpBordersButton', 'primary', 'Lit up borders')
export const AcetBorderMagicButton = createMetalButton('AcetBorderMagicButton', 'primary', 'Border Magic')
export const AcetBrutalButton = createMetalButton('AcetBrutalButton', 'primary', 'Brutal')
export const AcetFavouriteButton = createMetalButton('AcetFavouriteButton', 'primary', 'Favourite')
export const AcetOutlineButton = createMetalButton('AcetOutlineButton', 'outline', 'Outline')
export const AcetShimmerButton = createMetalButton('AcetShimmerButton', 'primary', 'Shimmer')
export const AcetNextBlueButton = createMetalButton('AcetNextBlueButton', 'primary', 'Next.js Blue')
export const AcetNextWhiteButton = createMetalButton('AcetNextWhiteButton', 'secondary', 'Next White')
export const AcetSpotifyButton = createMetalButton('AcetSpotifyButton', 'primary', 'Spotify')
export const AcetBackdropBlurButton = createMetalButton('AcetBackdropBlurButton', 'secondary', 'Backdrop blur')
export const AcetPlaylistButton = createMetalButton('AcetPlaylistButton', 'secondary', 'Playlist')
export const AcetFigmaButton = createMetalButton('AcetFigmaButton', 'primary', 'Figma')
export const AcetFigmaOutlineButton = createMetalButton('AcetFigmaOutlineButton', 'outline', 'Figma Outline')
export const AcetTopGradientButton = createMetalButton('AcetTopGradientButton', 'primary', 'Top gradient')
