/**
 * TASK-11 · 预算短语 → bkt 筛选条件（纯函数，无 IO）
 *
 * 识别「预算500 / 预算500元 / 预算 500 / 500块 / 500元 / 价格1000以内 /
 * 1000以内 / 一千以内 / budget 500 / Budget500」等 → bkt:price=${priceToBucket}
 *
 * 与 derivePaths 一致：金额经 priceToBucket 确定性分桶，不做 vocab 池校验。
 */
import { priceToBucket } from './path-codec.js'

/** 全角数字归一为半角（如 ５００ → 500） */
function normalizeDigits(text: string): string {
  return text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

const CN_DIGITS: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  壹: 1,
  二: 2,
  贰: 2,
  两: 2,
  三: 3,
  叁: 3,
  四: 4,
  肆: 4,
  五: 5,
  伍: 5,
  六: 6,
  陆: 6,
  七: 7,
  柒: 7,
  八: 8,
  捌: 8,
  九: 9,
  玖: 9,
}

const CN_UNITS: Record<string, number> = {
  十: 10,
  拾: 10,
  百: 100,
  佰: 100,
  千: 1000,
  仟: 1000,
  万: 10000,
  萬: 10000,
}

/** 解析简单中文数字（十/百/千/万 以内，如 一千 / 五百 / 两千 / 一万） */
function parseCnNumber(text: string): number | null {
  const s = normalizeDigits(text).trim()
  if (!s) return null
  if (/^[0-9]+$/.test(s)) return Number(s)
  if (!/[一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬〇零]/.test(s)) return null

  let total = 0
  let section = 0
  let current = 0
  for (const ch of s) {
    if (CN_DIGITS[ch] !== undefined) {
      current = CN_DIGITS[ch]
    } else if (CN_UNITS[ch] !== undefined) {
      const u = CN_UNITS[ch]
      if (current === 0) current = 1
      section += current * u
      current = 0
      if (u === 10000) {
        total += section
        section = 0
      }
    } else {
      return null
    }
  }
  total += section + current
  return total > 0 ? total : null
}

const CN_RE = /[一二两三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟萬〇零]/

/** 从文本提取金额（须带价格信号词，避免裸数字误判）；无匹配返回 null */
function extractAmount(text: string): number | null {
  const t = normalizeDigits(text)
  // 前置信号：预算 / budget / 价格 / 价钱
  const lead = t.match(/(?:预算|budget|价格|价钱)\s*[:：]?\s*([0-9]+)/i)
  if (lead) return Number(lead[1])
  // 后置信号：元 / 块 / 块钱 / 以内 / 以下
  const trail = t.match(/([0-9]+)\s*(?:元|块|块钱|以内|以下)/i)
  if (trail) return Number(trail[1])
  // 中文数字 + 以内 / 以下（如 一千以内）
  const cn = t.match(new RegExp(`(${CN_RE.source}+)\\s*(?:以内|以下)`))
  if (cn) {
    const n = parseCnNumber(cn[1])
    if (n != null) return n
  }
  return null
}

/** 金额范围与需求 minPrice 一致 */
const MIN_AMOUNT = 1
const MAX_AMOUNT = 999999

/**
 * 从 token/segment 提取金额并映射为 bkt facet；无匹配返回 null。
 * 须带价格信号（预算/价格/元/块/以内…），避免把普通数字误当筛选条件。
 */
export function priceFacetFromText(text: string): string | null {
  if (!text?.trim()) return null
  const amount = extractAmount(text)
  if (amount == null) return null
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) return null
  return priceFacetRaw(amount)
}

/** 生成标准 facet raw：bkt:price=100_500 */
export function priceFacetRaw(amount: number): string {
  return `bkt:price=${priceToBucket(amount)}`
}
