import { SplineSceneBasic } from '@/components/ui/spline-demo'

export default function SplineDemoPage() {
  return (
    <div className="h-full overflow-y-auto thin-scroll p-6 md:p-12">
      <h1 className="text-2xl font-black mb-6 tracking-wider">Spline 3D 演示</h1>
      <div className="max-w-4xl mx-auto">
        <SplineSceneBasic />
        <p className="mt-6 text-center text-sm text-text-muted">
          拖拽 3D 场景可交互 &middot; Powered by Spline
        </p>
      </div>
    </div>
  )
}
