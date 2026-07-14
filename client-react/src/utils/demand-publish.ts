import type { DemandFields } from '@/stores/demand-workspace'

export type PublishValidationIssue = { field: string; message: string }

/** 后端 expectedOutcome 必填时的兜底文案 */
export function resolveExpectedOutcome(f: DemandFields): string {
  const trimmed = f.expectedOutcome.trim()
  if (trimmed.length >= 1) return trimmed.slice(0, 500)
  const desc = f.description.trim() || f.title.trim()
  if (desc.length >= 1) return desc.slice(0, 500)
  return '按约定交付'
}

/** 发布前前端校验（与 server createSchema 对齐） */
export function validateDemandForPublish(f: DemandFields): PublishValidationIssue[] {
  const issues: PublishValidationIssue[] = []
  const title = f.title.trim()
  if (title.length < 2) {
    issues.push({ field: 'title', message: '标题至少 2 个字' })
  }
  if (!f.serviceType) {
    issues.push({ field: 'serviceType', message: '请选择线上或线下' })
  }
  const desc = f.description.trim() || title
  if (desc.length < 2) {
    issues.push({ field: 'description', message: '描述至少 2 个字' })
  }
  if (!f.budget.trim()) {
    issues.push({ field: 'budget', message: '请填写预算' })
  }
  if (!f.category.trim()) {
    issues.push({ field: 'category', message: '请填写分类' })
  }
  if (f.serviceType === 'OFFLINE' && !f.regionId) {
    issues.push({ field: 'regionId', message: '线下服务请选择地区' })
  }
  return issues
}

export function isDemandReadyToPublish(f: DemandFields): boolean {
  return validateDemandForPublish(f).length === 0
}

/** 解析后端 zod 校验错误 */
export function formatDemandApiError(e: unknown): string {
  const err = e as {
    response?: {
      data?: {
        message?: string
        details?: Array<{ path: (string | number)[]; message: string }>
      }
    }
  }
  const details = err.response?.data?.details
  if (Array.isArray(details) && details.length > 0) {
    return details
      .map((item) => {
        const path = item.path?.length ? item.path.join('.') : '字段'
        return `${path}: ${item.message}`
      })
      .join('；')
  }
  return err.response?.data?.message || '发布失败'
}
