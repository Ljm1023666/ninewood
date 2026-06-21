/** 在纹理合成批次之间让出主线程，减轻 UI 卡顿 */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 48 })
      return
    }
    setTimeout(resolve, 0)
  })
}
