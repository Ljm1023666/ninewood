import type { DemandFields } from '@/stores/demand-workspace'

import { resolveExpectedOutcome } from '@/utils/demand-publish'



/** 从预算字符串中提取最小价格数字 */

export function extractMinPrice(budget: string): number {

  const nums = budget.match(/\d+/g)

  if (!nums || nums.length === 0) return 1

  return Math.min(...nums.map(Number))

}



/** 将工作区字段组装为发布 API 的 FormData（调用前应先通过 validateDemandForPublish） */

export function buildDemandFormData(

  f: DemandFields,

  options?: { paths?: string[] },

): FormData {

  const fd = new FormData()

  const title = f.title.trim()

  const description = f.description.trim() || title

  fd.append('title', title)

  fd.append('description', description)

  fd.append('minPrice', String(extractMinPrice(f.budget)))

  fd.append('category', f.category.trim())

  if (f.taxonomyLeafId) fd.append('taxonomyLeafId', f.taxonomyLeafId)

  fd.append('serviceType', f.serviceType === 'OFFLINE' ? 'OFFLINE' : 'ONLINE')

  fd.append('expireAt', new Date(Date.now() + 7 * 86400000).toISOString())

  if (f.regionId) fd.append('regionId', String(f.regionId))

  if (f.tagName) fd.append('tagName', f.tagName)

  if (f.isCertifiedOnly) fd.append('isCertifiedOnly', 'true')

  if (f.amountEstimate) fd.append('amountEstimate', String(f.amountEstimate))

  if (f.pushConfig) fd.append('pushConfig', JSON.stringify(f.pushConfig))

  if (f.coverImage) fd.append('coverImage', f.coverImage)

  fd.append('expectedOutcome', resolveExpectedOutcome(f))

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

