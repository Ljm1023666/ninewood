/**
 * jieba 中文分词封装：发布挂路径 + 检索召回共用
 */
import { Jieba, TfIdf } from '@node-rs/jieba'
import { dict, idf } from '@node-rs/jieba/dict'

/** 业务高频词，追加到默认词典，避免「王者荣耀」等被切碎 */
const CUSTOM_WORDS = [
  '王者荣耀',
  '英雄联盟',
  '和平精英',
  '游戏代练',
  '游戏陪玩',
  '家政服务',
  '技术开发',
  '深度清洗',
  '空调清洗',
  '打野',
  '游走',
  '中路',
  '对抗路',
  '发育路',
  '代练',
  '陪玩',
  '上分',
  '排位',
  '巅峰赛',
  '成就标',
  '租车',
  '出租车',
]

/** 关键词抽取允许的词性：名词、专名、动名词、英文 */
const KEYWORD_POS = ['n', 'nr', 'ns', 'nt', 'nz', 'vn', 'eng'] as const

let jieba: Jieba | null = null
let tfIdf: TfIdf | null = null

function getJieba(): Jieba {
  if (!jieba) {
    jieba = Jieba.withDict(dict)
    const lines = CUSTOM_WORDS.map((word, i) => `${word} ${1000 + i}`)
    jieba.loadDict(Buffer.from(lines.join('\n'), 'utf-8'))
  }
  return jieba
}

function getTfIdf(): TfIdf {
  if (!tfIdf) {
    tfIdf = TfIdf.withDict(idf)
  }
  return tfIdf
}

/** 搜索模式分词（细粒度，用于检索召回） */
export function cutForSearch(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return getJieba()
    .cutForSearch(trimmed, true)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
}

/** 精确模式分词 */
export function cut(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  return getJieba().cut(trimmed, true)
}

/** TF-IDF 关键词抽取（用于发布时挂 kw 路径） */
export function extractKeywords(text: string, topK: number): string[] {
  const trimmed = text.trim()
  if (!trimmed || topK <= 0) return []
  const ranked = getTfIdf().extractKeywords(getJieba(), trimmed, topK * 3, [...KEYWORD_POS])
  return ranked.map((r) => r.keyword)
}

/** 测试用：重置单例 */
export function resetJiebaForTests(): void {
  jieba = null
  tfIdf = null
}
