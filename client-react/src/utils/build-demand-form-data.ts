import type { DemandFields } from '@/stores/demand-workspace'

/** 从预算字符串中提取最小价格数字 */
export function extractMinPrice(budget: string): number {
  const nums = budget.match(/\d+/g)
  if (!nums || nums.length === 0) return 1
  return Math.min(...nums.map(Number))
}

/** 将工作区字段组装为发布 API 的 FormData */
export function buildDemandFormData(
  f: DemandFields,
  options?: { paths?: string[]; force?: boolean },
): FormData {
  const force = options?.force ?? false
  const fd = new FormData()
  fd.append('title', f.title.trim() || '未命名需求')
  fd.append('description', f.description.trim() || f.title.trim())
  fd.append('minPrice', f.budget ? String(extractMinPrice(f.budget)) : '1')
  fd.append(
    'category',
    f.category ||
      (force ? '__force__' : f.serviceType === 'OFFLINE' ? 'of-move' : 'ol-game'),
  )
  if (f.taxonomyLeafId) fd.append('taxonomyLeafId', f.taxonomyLeafId)
  fd.append('serviceType', f.serviceType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')
  fd.append('expireAt', new Date(Date.now() + 7 * 86400000).toISOString())
  if (f.regionId) fd.append('regionId', String(f.regionId))
  if (f.tagName) fd.append('tagName', f.tagName)
  if (f.isCertifiedOnly) fd.append('isCertifiedOnly', 'true')
  if (f.amountEstimate) fd.append('amountEstimate', String(f.amountEstimate))
  if (f.pushConfig) fd.append('pushConfig', JSON.stringify(f.pushConfig))
  if (f.coverImage) fd.append('coverImage', f.coverImage)
  if (f.expectedOutcome) fd.append('expectedOutcome', f.expectedOutcome)
  if (f.visibilityWindow !== 15)
    fd.append('visibilityWindow', String(f.visibilityWindow))
  if (f.maxApplicants !== 10) fd.append('maxApplicants', String(f.maxApplicants))
  if (f.timeLimitMinutes != null) {
    fd.append('timeLimitMinutes', String(f.timeLimitMinutes))
  }
  if (f.tags.length > 0) fd.append('tags', f.tags.join(','))
  if (f.tagsConfirmed) fd.append('tagsConfirmed', 'true')
  const paths = options?.paths
  if (paths && paths.length > 0) {
    fd.append('paths', paths.join(','))
  }
  return fd
}
