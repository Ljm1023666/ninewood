import { SplineSceneBasic } from '@/components/ui/spline-demo'
import { AcetTopGradientButton } from '@/components/ui/tailwindcss-buttons-variants'
import { useNavigate } from 'react-router-dom'

export default function SplineDemoPage() {
  const navigate = useNavigate()
  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col items-stretch overflow-y-auto thin-scroll p-6 md:p-12">
      <div className="relative z-10 mx-auto w-full max-w-4xl shrink-0 self-center">
        <h1 className="mb-6 text-2xl font-black tracking-wider">
          Spline 3D 演示
        </h1>
        <SplineSceneBasic />
        <p className="mt-6 text-center text-sm text-text-muted">
          拖拽 3D 场景可交互 &middot; Powered by Spline
        </p>
        <div className="mt-8 flex justify-center">
          <AcetTopGradientButton
            type="button"
            onClick={() => navigate('/ui/tailwind-buttons')}
          >
            浏览 Tailwind 按钮集
          </AcetTopGradientButton>
        </div>
      </div>
    </div>
  )
}
