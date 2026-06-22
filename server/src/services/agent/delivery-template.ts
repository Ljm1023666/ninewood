import { getCapabilityByTool, type Capability, type DeliverySpec } from './capability-matcher.js';

/** 模板占位符替换：将 {key} 替换为 params[key] 或 ctx[key] */
function render(template: string, params: Record<string, unknown>): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = params[key]
    if (v == null) return `{${key}}`
    return String(v)
  })
}

function renderVerification(
  v: DeliverySpec['verification'] | undefined,
  params: Record<string, unknown>,
): { path: string; label?: string } | null {
  if (!v?.path) return null
  return {
    path: render(v.path, params),
    label: v.label ? render(v.label, params) : undefined,
  }
}

function renderRollback(
  r: DeliverySpec['rollback'] | undefined,
  params: Record<string, unknown>,
): { hint?: string; utterance?: string; tool?: string } | null {
  if (!r) return null
  return {
    hint: r.hint ? render(r.hint, params) : undefined,
    utterance: r.utterance ? render(r.utterance, params) : undefined,
    tool: r.tool,
  }
}

/** 单个 capability 的渲染结果 */
export interface RenderedDelivery {
  summary: string
  verification: { path: string; label?: string } | null
  rollback: { hint?: string; utterance?: string; tool?: string } | null
  autoNavigate: boolean
}

/** 给定 capability 与参数，渲染 summary / verification / rollback */
export function renderDelivery(
  capability: Capability,
  params: Record<string, unknown>,
): RenderedDelivery {
  const tpl = capability.delivery.summary_template ?? ''
  return {
    summary: render(tpl, params),
    verification: renderVerification(capability.delivery.verification, params),
    rollback: renderRollback(capability.delivery.rollback, params),
    autoNavigate: Boolean(capability.delivery.auto_navigate),
  }
}

/** 按 tool 名称快速渲染（找不到 capability 返回兜底空对象） */
export function renderDeliveryForTool(
  toolName: string,
  params: Record<string, unknown>,
): RenderedDelivery | null {
  const cap = getCapabilityByTool(toolName)
  if (!cap) return null
  return renderDelivery(cap, params)
}