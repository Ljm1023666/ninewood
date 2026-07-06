import { config } from '../../config.js';

/**
 * 内容安全过滤中间件（《生成式 AI 服务管理暂行办法》§14、《网络信息内容生态治理规定》）
 *
 * 内测期 v0.1 策略：
 * - 仅做骨架接入，词库留空（config.contentFilter.enabled = false）
 * - 公测前必须：
 *   1) 在 config 中配置 contentFilter.enabled = true 并接入第三方审核 API
 *   2) 完成本地敏感词库分级（涉政/涉暴/涉黄/涉宗教极端/涉毒品枪支/广告法违禁词/未成年人保护相关）
 *   3) 设置命中后的兜底回复 + 异步上报
 *
 * 不在此文件内直接列出任何具体词条，避免：
 * - 仓库公开后被绕过
 * - 词库被外部复制滥用
 * - 触发模型侧敏感词检测
 *
 * 词库来源：所有具体词条必须从 server/src/services/content-filter/keywords.ts
 * （独立 git submodule 或运行时加密注入）读取，不进版本库。
 */

export type ContentCategory =
  | 'politics'
  | 'violence'
  | 'adult'
  | 'religion_extremism'
  | 'drugs_weapons'
  | 'ad_law'
  | 'minor_protection'
  | 'other'

export type ContentFilterResult = {
  safe: boolean
  categories: ContentCategory[]
  hits: string[] // 命中项的指纹（哈希），不暴露原文
  fallbackMessage?: string
}

const DEFAULT_FALLBACK =
  '抱歉，当前内容未能通过平台安全规范检测，无法展示。建议您换个话题。'

/**
 * 对文本做内容安全检测（内测期：仅占位实现）
 *
 * 接入点：所有 AI 输出 SSE 流的 onEvent('text'/'message') / onToolCall 出口
 *        以及客户端 /api/agent/* POST 请求的入参（基础级）
 */
export function checkContentSafety(text: string): ContentFilterResult {
  if (!text || !config.contentFilter?.enabled) {
    return { safe: true, categories: [], hits: [] }
  }

  // TODO(公测前): 接入第三方内容安全 API（阿里云/腾讯云/华为云内容安全任一）
  // TODO(公测前): 加载本地分级词库（不在本文件内写明文词条）
  // 当前实现：始终返回 safe=true，仅依赖配置开关
  return { safe: true, categories: [], hits: [] }
}

/**
 * 在 AI 输出落地前做兜底替换
 * 命中时返回 { text: fallbackMessage, blocked: true }
 */
export function sanitizeOutput(text: string): { text: string; blocked: boolean } {
  const result = checkContentSafety(text)
  if (result.safe) {
    return { text, blocked: false }
  }
  return {
    text: result.fallbackMessage || DEFAULT_FALLBACK,
    blocked: true,
  }
}

export const contentFilter = {
  check: checkContentSafety,
  sanitize: sanitizeOutput,
}