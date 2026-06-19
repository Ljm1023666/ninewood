import type { ReactNode } from 'react'
import reactElementToJSXString from 'react-element-to-jsx-string'
import { toast } from 'sonner'
import { ButtonsCard } from '@/components/ui/tailwindcss-buttons'
import {
  AcetBackdropBlurButton,
  AcetBorderMagicButton,
  AcetBrutalButton,
  AcetFavouriteButton,
  AcetFigmaButton,
  AcetFigmaOutlineButton,
  AcetGradientButton,
  AcetInvertButton,
  AcetLitUpBordersButton,
  AcetNextBlueButton,
  AcetNextWhiteButton,
  AcetOutlineButton,
  AcetPlaylistButton,
  AcetShimmerButton,
  AcetSimpleButton,
  AcetSketchButton,
  AcetSpotifyButton,
  AcetTailwindConnectButton,
  AcetTopGradientButton,
  AcetUnapologeticButton,
} from '@/components/ui/tailwindcss-buttons-variants'

export type AceternityShowcaseButton = {
  name: string
  description: string
  showDot?: boolean
  component: ReactNode
  code?: string
}

const SHIMMER_COPY = `
// Button code
<button className="inline-flex h-12 animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-6 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50">
  Shimmer
</button>

// tailwind.config.js code
{
  "animation": {
    shimmer: "shimmer 2s linear infinite"
  },
  "keyframes": {
    shimmer: {
      from: {
        "backgroundPosition": "0 0"
      },
      to: {
        "backgroundPosition": "-200% 0"
      }
    }
  }
}
`

export const aceternityShowcaseButtons: AceternityShowcaseButton[] = [
  {
    name: 'Sketch',
    description: 'Sketch button for your website',
    component: <AcetSketchButton />,
  },
  {
    name: 'Simple',
    description: 'Elegant button for your website',
    component: <AcetSimpleButton />,
  },
  {
    name: 'Invert',
    description: 'Simple button that inverts on hover',
    component: <AcetInvertButton>Invert it</AcetInvertButton>,
  },
  {
    name: 'Tailwindcss Connect',
    description: 'Button featured on Tailwindcss Connect website',
    showDot: false,
    component: <AcetTailwindConnectButton />,
  },
  {
    name: 'Gradient',
    description: 'Simple Gradient button with rounded corners',
    component: <AcetGradientButton />,
  },
  {
    name: 'Unapologetic',
    description: 'Unapologetic button with perfect corners',
    component: <AcetUnapologeticButton />,
  },
  {
    name: 'Lit up borders',
    description: 'Gradient button with perfect corners',
    component: <AcetLitUpBordersButton />,
  },
  {
    name: 'Border Magic',
    description: 'Border Magic button for your website',
    showDot: false,
    component: <AcetBorderMagicButton />,
  },
  {
    name: 'Brutal',
    description: 'Brutal button for your website',
    component: <AcetBrutalButton />,
  },
  {
    name: 'Favourite',
    description: 'Favourite button for your website',
    component: <AcetFavouriteButton />,
  },
  {
    name: 'Outline',
    description: 'Outline button for your website',
    component: <AcetOutlineButton />,
  },
  {
    name: 'Shimmer',
    description: 'Shimmer button for your website',
    showDot: false,
    component: <AcetShimmerButton />,
    code: SHIMMER_COPY,
  },
  {
    name: 'Next.js Blue',
    description: 'Next.js Blue button for your website',
    component: <AcetNextBlueButton />,
  },
  {
    name: 'Next.js White',
    description: 'Next.js White button for your website',
    component: <AcetNextWhiteButton />,
  },
  {
    name: 'Spotify',
    description: 'Spotify button for your website',
    component: <AcetSpotifyButton />,
  },
  {
    name: 'Backdrop Blur',
    description: 'Outline button for your website',
    showDot: false,
    component: <AcetBackdropBlurButton />,
  },
  {
    name: 'Playlist',
    description: 'Playlist button for your website',
    component: <AcetPlaylistButton />,
  },
  {
    name: 'Figma',
    description: 'Figma button for your website',
    component: <AcetFigmaButton />,
  },
  {
    name: 'Figma Outline',
    description: 'Figma Outline button for your website',
    component: <AcetFigmaOutlineButton />,
  },
  {
    name: 'Top Gradient',
    description: 'Top Gradient button for your website',
    showDot: false,
    component: <AcetTopGradientButton />,
  },
]

function copyToClipboard(text: string) {
  void navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success('已复制到剪贴板')
    })
    .catch(() => {
      toast.error('复制失败')
    })
}

/** Aceternity / Tailwind 按钮集展示（点击卡片复制 JSX 或预设代码） */
export default function TailwindcssButtonsDemo() {
  function copy(button: AceternityShowcaseButton) {
    if (button.code) {
      copyToClipboard(button.code.trim())
      return
    }
    try {
      const s = reactElementToJSXString(button.component as Parameters<typeof reactElementToJSXString>[0])
      if (s) copyToClipboard(s)
    } catch {
      toast.error('无法序列化该按钮')
    }
  }

  return (
    <div className="w-full px-4 pb-40">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
        {aceternityShowcaseButtons.map((button, idx) => (
          <ButtonsCard key={idx} onClick={() => copy(button)}>
            <p className="mb-1 text-center text-xs font-semibold text-text-primary">
              {button.name}
            </p>
            <p className="mb-4 line-clamp-2 text-center text-[11px] text-text-muted">
              {button.description}
            </p>
            <div className="flex flex-1 items-center justify-center">{button.component}</div>
          </ButtonsCard>
        ))}
      </div>
    </div>
  )
}
