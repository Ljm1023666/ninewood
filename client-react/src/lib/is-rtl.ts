/** 希伯来文 / 阿拉伯文等 RTL 文案 */
export function isRTL(text: string) {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/.test(text)
}
