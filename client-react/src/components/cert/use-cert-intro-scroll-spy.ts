import { type RefObject, useEffect, useState } from 'react'

const SECTION_IDS = ['cert-benefits', 'cert-tiers', 'cert-path', 'cert-ecosystem'] as const
export type CertIntroSection = (typeof SECTION_IDS)[number]

/** 监听认证介绍章节滚动；支持 Layout 主栏内嵌滚动容器 */
export function useCertIntroScrollSpy(rootRef?: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<CertIntroSection>('cert-path')

  useEffect(() => {
    const root = rootRef?.current ?? null

    const onScroll = () => {
      const offset = root ? 120 : 140
      let current: CertIntroSection = 'cert-path'
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (!el) continue
        const top = root
          ? el.getBoundingClientRect().top - root.getBoundingClientRect().top
          : el.getBoundingClientRect().top
        if (top <= offset) current = id
      }
      setActive(current)
    }

    onScroll()
    const target: HTMLElement | Window = root ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [rootRef])

  return active
}
