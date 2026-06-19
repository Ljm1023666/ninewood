import { ComboboxDemo } from "@/components/ui/filters-demo";

export default function FiltersPreview() {
  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-background">
      <div className="w-full max-w-4xl px-8">
        <h1 className="text-2xl font-bold mb-6">Filters 组件预览</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          点击 Filter 按钮选择过滤条件。支持状态、指派人、标签、优先级、日期等过滤维度。
        </p>
        <ComboboxDemo />
      </div>
    </div>
  );
}
