/**
 * 本地规则整理：后端 LLM 不可用时的前端兜底。
 * 输出对齐 DemandAnalyzeResult，可直接喂给 applyAnalyzeResult。
 */
import type { DemandAnalyzeResult } from '@/types/demand-analyze'

const CATEGORY_RULES: { cat: string; keys: string[] }[] = [
  {
    cat: '技术开发',
    keys: [
      '开发',
      '前端',
      '后端',
      '小程序',
      'app',
      '接口',
      '系统',
      '网站',
      'vue',
      'react',
      'java',
      'python',
    ],
  },
  {
    cat: 'UI设计',
    keys: ['ui', 'ux', '设计', '视觉', '原型', '界面', 'logo', '海报'],
  },
  {
    cat: '产品需求',
    keys: ['产品', '需求文档', 'prd', '原型评审', '用户调研'],
  },
  {
    cat: '数据分析',
    keys: ['数据', '分析', '报表', 'bi', '统计', 'sql'],
  },
  {
    cat: '测试服务',
    keys: ['测试', 'qa', '自动化测试', '用例'],
  },
  {
    cat: '家政保洁',
    keys: ['保洁', '家政', '打扫', '清洁', '做饭', '做饭阿姨'],
  },
  {
    cat: '跑腿代办',
    keys: ['跑腿', '代买', '代取', '快递', '排队'],
  },
  {
    cat: '教育培训',
    keys: ['家教', '辅导', '培训', '课程', '教学', '英语'],
  },
]

const BUDGET_RE =
  /(?:预算|报价|价格|费用|大概|大约)?\s*[¥￥]?\s*(\d+(?:\.\d+)?)\s*(?:元|块|万)?(?:\s*[-~～到至]\s*[¥￥]?\s*(\d+(?:\.\d+)?))?/i
const DEADLINE_RE =
  /(?:截止|期限|交付|完成)?\s*(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}日?)/
const ONLINE_RE = /远程|线上|线上交付|远程交付/
const OFFLINE_RE = /现场|线下|上门|驻场|线下交付/

function pickCategory(text: string): string {
  const lower = text.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((k) => lower.includes(k.toLowerCase()))) return rule.cat
  }
  return '其他'
}

function pickTitle(text: string): string {
  const firstLine = text
    .split(/\n/)
    .map((s) => s.trim())
    .find(Boolean)
  if (!firstLine) return ''
  const cleaned = firstLine.replace(/^[#*\-\s]+/, '').slice(0, 64)
  if (cleaned.length >= 4) return cleaned
  return cleaned || text.slice(0, 32)
}

function pickBudget(text: string): number | null {
  const m = text.match(BUDGET_RE)
  if (!m) return null
  const a = Number(m[1])
  const b = m[2] ? Number(m[2]) : null
  if (Number.isFinite(b) && b != null && b > a) return b
  if (Number.isFinite(a)) {
    if (/万/.test(m[0])) return a * 10000
    return a
  }
  return null
}

function pickDeadline(text: string): string {
  const m = text.match(DEADLINE_RE)
  if (!m) return ''
  const raw = m[1].replace(/[年月./]/g, '-').replace(/日/g, '')
  const parts = raw.split('-').filter(Boolean)
  if (parts.length !== 3) return ''
  const [y, mo, d] = parts.map((p) => p.padStart(2, '0'))
  return `${y}-${mo.slice(-2)}-${d.slice(-2)}`
}

function pickServiceType(text: string): 'ONLINE' | 'OFFLINE' | null {
  const offline = OFFLINE_RE.test(text)
  const online = ONLINE_RE.test(text)
  if (offline && !online) return 'OFFLINE'
  if (online && !offline) return 'ONLINE'
  return null
}

export interface LocalExtractOptions {
  mode?: 'DEMAND' | 'SERVICE_CARD'
}

/** 从自由文本提取可写入工作区的分析结果 */
export function extractDemandAnalyzeResult(
  text: string,
  opts: LocalExtractOptions = {},
): DemandAnalyzeResult {
  const mode = opts.mode === 'SERVICE_CARD' ? 'SERVICE_CARD' : 'DEMAND'
  const trimmed = (text || '').trim()
  const title = pickTitle(trimmed)
  const category = pickCategory(trimmed)
  const budgetNum = pickBudget(trimmed)
  const schedule = pickDeadline(trimmed)
  const serviceType = pickServiceType(trimmed)
  const summary = trimmed.slice(0, 2000)

  const missingInfo: string[] = []
  if (!title || title.length < 2) missingInfo.push('标题')
  if (!category || category === '其他') {
    /* 「其他」仍可用，不强制缺失 */
  }
  if (mode === 'DEMAND' && (budgetNum == null || !(budgetNum > 0))) {
    missingInfo.push('预算')
  }
  if (!serviceType) missingInfo.push('线上/线下')

  let confidence: 'high' | 'medium' | 'low' = 'high'
  if (missingInfo.length >= 2) confidence = 'low'
  else if (missingInfo.length === 1 || !schedule) confidence = 'medium'

  return {
    title: title || null,
    summary,
    category,
    budget:
      budgetNum != null && budgetNum > 0 ? String(budgetNum) : null,
    schedule: schedule || null,
    serviceType,
    missingInfo,
    confidence,
    readyToPublish: missingInfo.length === 0,
    suggestedKeywords: category && category !== '其他' ? [category] : [],
  }
}
