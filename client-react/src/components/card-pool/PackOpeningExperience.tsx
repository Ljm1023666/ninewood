import type { PackCardData } from '@/components/card-pool/search-params'
import type { BlackScope } from '@/components/card-pool/types'
import { PackOpeningAnimation } from '@/components/card-pool/PackOpeningAnimation'
import { PackGalleryProvider } from '@/components/card-pool/pack-gallery-runtime'

interface PackOpeningExperienceProps {
  cards: PackCardData[]
  galleryCacheKey: string
  galleryScope: BlackScope
  onClose: () => void
}

export default function PackOpeningExperience({
  cards,
  galleryCacheKey,
  galleryScope,
  onClose,
}: PackOpeningExperienceProps) {
  return (
    <PackGalleryProvider packOpening>
      <PackOpeningAnimation
        cards={cards}
        galleryCacheKey={galleryCacheKey}
        galleryScope={galleryScope}
        onClose={onClose}
      />
    </PackGalleryProvider>
  )
}
