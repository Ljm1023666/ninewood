import { createHash } from 'node:crypto';
import { config } from '../../config.js';
import { getKeywordMatchers } from './keywords.js';

/**
 * 内容安全过滤（《生成式 AI 服务管理暂行办法》§14、《网络信息内容生态治理规定》）
 *
 * 策略：
 * - 本地分级词库（keywords.ts，base64 编码存储）
 * - 命中后拒绝用户发布内容 / 替换 AI 输出
 * - 公测前可叠加第三方审核 API（config.contentFilter.provider）
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
  hits: string[] // 命中项指纹（哈希），不暴露原文
  fallbackMessage?: string
}

const DEFAULT_FALLBACK =
  '抱歉，当前内容未能通过平台安全规范检测，无法展示。建议您换个话题。'

function fingerprint(term: string): string {
  return createHash('sha256').update(term).digest('hex').slice(0, 12);
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function isFilterEnabled(): boolean {
  return config.contentFilter?.enabled !== false;
}

/**
 * 对文本做内容安全检测
 */
export function checkContentSafety(text: string): ContentFilterResult {
  if (!text || !isFilterEnabled()) {
    return { safe: true, categories: [], hits: [] };
  }

  const normalized = normalizeForMatch(text);
  const categories = new Set<ContentCategory>();
  const hits: string[] = [];

  for (const { category, term } of getKeywordMatchers()) {
    if (term && normalized.includes(term)) {
      categories.add(category);
      hits.push(fingerprint(term));
    }
  }

  if (hits.length === 0) {
    return { safe: true, categories: [], hits: [] };
  }

  return {
    safe: false,
    categories: [...categories],
    hits,
    fallbackMessage: DEFAULT_FALLBACK,
  };
}

/** 用户发布内容入口：命中则抛 400 */
export function assertUserContentSafe(text: string, field = '内容'): void {
  const result = checkContentSafety(text);
  if (!result.safe) {
    throw Object.assign(new Error(`${field}包含违规信息，请修改后重试`), { status: 400 });
  }
}

/** 批量检测多段文本 */
export function assertUserContentsSafe(
  parts: Array<{ text: string; field: string }>,
): void {
  for (const { text, field } of parts) {
    if (text?.trim()) assertUserContentSafe(text, field);
  }
}

/**
 * 在 AI 输出落地前做兜底替换
 */
export function sanitizeOutput(text: string): { text: string; blocked: boolean } {
  const result = checkContentSafety(text);
  if (result.safe) {
    return { text, blocked: false };
  }
  return {
    text: result.fallbackMessage || DEFAULT_FALLBACK,
    blocked: true,
  };
}

export const contentFilter = {
  check: checkContentSafety,
  sanitize: sanitizeOutput,
  assertSafe: assertUserContentSafe,
};
