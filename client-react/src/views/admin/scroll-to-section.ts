/** 在可滚动容器内定位到 admin-section-{id}，Tab 切换后 DOM 可能延迟挂载故带重试 */
export function scrollToAdminSection(
  sectionId: string,
  scrollContainer: HTMLElement | null,
  retries = 8,
): boolean {
  if (!sectionId || !scrollContainer) return false

  const el = document.getElementById(`admin-section-${sectionId}`)
  if (el) {
    const containerTop = scrollContainer.getBoundingClientRect().top
    const targetTop = el.getBoundingClientRect().top
    const offset = targetTop - containerTop + scrollContainer.scrollTop - 20
    scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
    return true
  }

  if (retries > 0) {
    requestAnimationFrame(() => {
      scrollToAdminSection(sectionId, scrollContainer, retries - 1)
    })
  }
  return false
}
