import { ComboboxDemo } from '@/components/ui/filters-demo'
import { PageHeader } from '@/components/layout/PageHeader'
import { InternalPageShell } from '@/components/layout/internal-ui'

export default function FiltersPreview() {
  return (
    <InternalPageShell width="full">
      <PageHeader title="Filters 组件预览" onBack="back" />
      <p className="text-muted-foreground mb-8 text-sm">
        点击 Filter 按钮选择过滤条件。支持状态、指派人、标签、优先级、日期等过滤维度。
      </p>
      <ComboboxDemo />
    </InternalPageShell>
  )
}
