import type { ContentCategory } from './index.js';

/** 词条以 base64(utf8) 存储，避免明文进仓库；运行时解码匹配 */
type EncodedKeyword = { category: ContentCategory; b64: string };

const ENCODED_KEYWORDS: EncodedKeyword[] = [
  // 赌博
  { category: 'ad_law', b64: '5Y2a5b2p' },
  { category: 'ad_law', b64: '6LWM5Y2a' },
  { category: 'ad_law', b64: '6LWM5Zy6' },
  { category: 'ad_law', b64: '6LWM55CD' },
  { category: 'ad_law', b64: '5YWt5ZCI5b2p' },
  { category: 'ad_law', b64: '572R6LWM' },
  // 诈骗 / 违法交易
  { category: 'ad_law', b64: '5Yi35Y2V' },
  { category: 'ad_law', b64: '5Lyg6ZSA' },
  { category: 'ad_law', b64: '5aWX546w' },
  { category: 'ad_law', b64: '5YGH6K+B' },
  { category: 'ad_law', b64: '5Luj5byA5Y+R56Wo' },
  // 毒品 / 枪支
  { category: 'drugs_weapons', b64: '5q+S5ZOB' },
  { category: 'drugs_weapons', b64: '5aSn6bq7' },
  { category: 'drugs_weapons', b64: '5Yaw5q+S' },
  { category: 'drugs_weapons', b64: '5rW35rSb5Zug' },
  { category: 'drugs_weapons', b64: '5p6q5pSv' },
  { category: 'drugs_weapons', b64: '5by56I2v' },
  // 色情 / 招嫖
  { category: 'adult', b64: '6KO46IGK' },
  { category: 'adult', b64: '6Imy5oOF' },
  { category: 'adult', b64: '5auW5ai8' },
  { category: 'adult', b64: '5Y2W5rer' },
  { category: 'adult', b64: '5o+05Lqk' },
  // 未成年人保护
  { category: 'minor_protection', b64: '5bm85aWz' },
  { category: 'minor_protection', b64: '5pyq5oiQ5bm06KO4' },
  // 暴力
  { category: 'violence', b64: '5p2A5Lq6' },
  { category: 'violence', b64: '54iG54K454mp' },
];

export type KeywordMatcher = { category: ContentCategory; term: string };

let cachedMatchers: KeywordMatcher[] | null = null;

/** 加载并缓存解码后的词条 */
export function getKeywordMatchers(): KeywordMatcher[] {
  if (cachedMatchers) return cachedMatchers;
  cachedMatchers = ENCODED_KEYWORDS.map(({ category, b64 }) => ({
    category,
    term: Buffer.from(b64, 'base64').toString('utf8').toLowerCase(),
  }));
  return cachedMatchers;
}
