import { useEffect, useState } from 'react'

const SECTION_IDS = ['cert-benefits', 'cert-tiers', 'cert-path', 'cert-ecosystem'] as const
export type CertIntroSection = (typeof SECTION_IDS)[number]

export function useCertIntroScrollSpy() {
  const [active, setActive] = useState<CertIntroSection>('cert-path')

  useEffect(() => {
    const onScroll = () => {
      const offset = 140
      let current: CertIntroSection = 'cert-path'
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top <= offset) current = id
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return active
}
