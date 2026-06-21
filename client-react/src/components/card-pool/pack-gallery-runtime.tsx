import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react'

import InfiniteGallery, {
  type GallerySceneControl,
  type PackCardImageItem,
} from '@/components/ui/3d-gallery-photography'
import {
  getPackGallerySnapshot,
  subscribePackGallery,
} from '@/utils/pack-gallery-cache'
import { bindPackGalleryImagesBridge } from '@/utils/pack-gallery-bridge'
import {
  preloadPackGalleryGpuTexturesDelta,
} from '@/utils/preload-pack-gallery-gpu'
import { cn } from '@/lib/utils'

const PLACEHOLDER_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

const PLACEHOLDER_IMAGES: PackCardImageItem[] = [
  { src: PLACEHOLDER_PIXEL, backSrc: PLACEHOLDER_PIXEL, alt: '' },
]

type FrameLoopMode = 'always' | 'never'

type DisplayFlags = {
  onTop: boolean
  showTitle: boolean
}

function sameImageList(a: PackCardImageItem[], b: PackCardImageItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (item, index) =>
      item.src === b[index]?.src &&
      (item.backSrc ?? item.src) === (b[index]?.backSrc ?? b[index]?.src),
  )
}

export function isRealGalleryImages(items: PackCardImageItem[]): boolean {
  return items.length > 0 && items[0]?.src !== PLACEHOLDER_PIXEL
}

export type PackGalleryRuntime = {
  wheelImpulseRef: MutableRefObject<((deltaY: number) => void) | null>
  show: (cacheKey?: string) => void
  hide: () => void
  setLayerOpacity: (opacity: number) => void
  isSceneReady: () => boolean
  subscribeSceneReady: (listener: () => void) => () => void
  setCardNavigateHandler: (handler: ((id: string) => void) | null) => void
}

const PackGalleryRuntimeContext = createContext<PackGalleryRuntime | null>(null)

export function usePackGalleryRuntime(): PackGalleryRuntime {
  const ctx = useContext(PackGalleryRuntimeContext)
  if (!ctx) {
    throw new Error('usePackGalleryRuntime 须在 PackGalleryProvider 内使用')
  }
  return ctx
}

export function PackGalleryProvider({
  children,
  packOpening = false,
}: {
  children: ReactNode
  packOpening?: boolean
}) {
  const wheelImpulseRef = useRef<((deltaY: number) => void) | null>(null)
  const sceneControlRef = useRef<GallerySceneControl | null>(null)
  const blackLayerRef = useRef<HTMLDivElement>(null)
  const imagesByKeyRef = useRef(new Map<string, PackCardImageItem[]>())
  const activeKeyRef = useRef<string | null>(null)
  const visibleRef = useRef(false)
  const imagesReadyRef = useRef(false)
  const layerOpacityRef = useRef(0)
  const hasPackImagesRef = useRef(false)
  const prevImagesRef = useRef<PackCardImageItem[]>(PLACEHOLDER_IMAGES)
  const sceneReadyRef = useRef(false)
  const sceneReadyListenersRef = useRef(new Set<() => void>())
  const cardNavigateHandlerRef = useRef<((id: string) => void) | null>(null)

  const [images, setImagesState] = useState<PackCardImageItem[]>(PLACEHOLDER_IMAGES)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [galleryMountKey, setGalleryMountKey] = useState(0)
  const [visible, setVisible] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [displayFlags, setDisplayFlags] = useState<DisplayFlags>({
    onTop: false,
    showTitle: false,
  })
  const [frameLoop, setFrameLoop] = useState<FrameLoopMode>('never')

  const resetSceneReady = useCallback(() => {
    sceneReadyRef.current = false
    setSceneReady(false)
  }, [])

  const syncDisplayFlags = useCallback(
    (opacity: number) => {
      const onTop = visibleRef.current && opacity > 0.01
      const showTitle =
        sceneReadyRef.current && onTop && imagesReadyRef.current && opacity >= 0.98
      setDisplayFlags((prev) => {
        if (prev.onTop === onTop && prev.showTitle === showTitle) return prev
        return { onTop, showTitle }
      })
    },
    [],
  )

  const markSceneReady = useCallback(() => {
    if (sceneReadyRef.current) return
    sceneReadyRef.current = true
    setSceneReady(true)
    syncDisplayFlags(layerOpacityRef.current)
    for (const listener of sceneReadyListenersRef.current) {
      listener()
    }
  }, [syncDisplayFlags])

  const isSceneReady = useCallback(() => sceneReadyRef.current, [])

  const subscribeSceneReady = useCallback((listener: () => void) => {
    if (sceneReadyRef.current) {
      queueMicrotask(listener)
      return () => {}
    }
    sceneReadyListenersRef.current.add(listener)
    return () => {
      sceneReadyListenersRef.current.delete(listener)
    }
  }, [])

  const setCardNavigateHandler = useCallback(
    (handler: ((id: string) => void) | null) => {
      cardNavigateHandlerRef.current = handler
    },
    [],
  )

  const handleCardNavigate = useCallback((id: string) => {
    cardNavigateHandlerRef.current?.(id)
  }, [])

  const setLayerOpacity = useCallback(
    (opacity: number) => {
      const clamped = Math.max(0, Math.min(1, opacity))
      layerOpacityRef.current = clamped
      if (blackLayerRef.current) {
        blackLayerRef.current.style.opacity = String(clamped)
      }
      syncDisplayFlags(clamped)
    },
    [syncDisplayFlags],
  )

  const applyImages = useCallback((cacheKey: string, items: PackCardImageItem[]) => {
    if (items.length === 0) return false
    const prev = prevImagesRef.current
    imagesByKeyRef.current.set(cacheKey, items)
    activeKeyRef.current = cacheKey
    hasPackImagesRef.current = true

    let changed = true
    setImagesState((prevState) => {
      if (sameImageList(prevState, items)) {
        changed = false
        return prevState
      }
      return items
    })

    if (!changed) {
      prevImagesRef.current = items
      return true
    }

    const wasReady = isRealGalleryImages(prev)
    imagesReadyRef.current = isRealGalleryImages(items)
    setActiveKey(cacheKey)

    if (!wasReady && imagesReadyRef.current) {
      resetSceneReady()
      setGalleryMountKey((k) => k + 1)
      prevImagesRef.current = items
    } else {
      preloadPackGalleryGpuTexturesDelta(prev, items)
      prevImagesRef.current = items
    }

    syncDisplayFlags(layerOpacityRef.current)
    return true
  }, [syncDisplayFlags, resetSceneReady])

  const load = useCallback(
    (cacheKey: string, items: PackCardImageItem[]) => {
      if (items.length === 0) return
      const cached = imagesByKeyRef.current.get(cacheKey)
      if (cached && sameImageList(cached, items)) return
      applyImages(cacheKey, items)
    },
    [applyImages],
  )

  const activate = useCallback(
    (cacheKey: string) => {
      const cached = imagesByKeyRef.current.get(cacheKey)
      if (cached?.length) {
        applyImages(cacheKey, cached)
        return
      }
      const snap = getPackGallerySnapshot(cacheKey)
      if (snap.ready && snap.items.length > 0) {
        applyImages(cacheKey, snap.items)
      }
    },
    [applyImages],
  )

  useLayoutEffect(() => {
    bindPackGalleryImagesBridge({ load, activate })
    return () => {
      bindPackGalleryImagesBridge(null)
    }
  }, [load, activate])

  useEffect(() => {
    if (!activeKey) return
    return subscribePackGallery(activeKey, () => {
      const snap = getPackGallerySnapshot(activeKey)
      if (snap.ready && snap.items.length > 0) {
        applyImages(activeKey, snap.items)
      }
    })
  }, [activeKey, applyImages])

  useEffect(() => {
    if (visible && isRealGalleryImages(images)) {
      setFrameLoop('always')
      return
    }
    if (packOpening) {
      setFrameLoop('never')
      return
    }
    if (hasPackImagesRef.current) {
      setFrameLoop('always')
    }
  }, [packOpening, visible, galleryMountKey, sceneReady, images])

  const syncImagesForKey = useCallback(
    (cacheKey: string) => {
      const cached = imagesByKeyRef.current.get(cacheKey)
      if (cached?.length) {
        applyImages(cacheKey, cached)
        return
      }
      const snap = getPackGallerySnapshot(cacheKey)
      if (snap.ready && snap.items.length > 0) {
        applyImages(cacheKey, snap.items)
      }
    },
    [applyImages],
  )

  const show = useCallback(
    (cacheKey?: string) => {
      const key = cacheKey ?? activeKeyRef.current
      if (key) syncImagesForKey(key)

      if (visibleRef.current && activeKeyRef.current === key) {
        syncDisplayFlags(layerOpacityRef.current)
        return
      }

      visibleRef.current = true
      setVisible(true)
      syncDisplayFlags(layerOpacityRef.current)
      requestAnimationFrame(() => sceneControlRef.current?.resetMotion())
    },
    [syncDisplayFlags, syncImagesForKey],
  )

  const hide = useCallback(() => {
    visibleRef.current = false
    setVisible(false)
    setFrameLoop('never')
    resetSceneReady()
    syncDisplayFlags(layerOpacityRef.current)
    sceneControlRef.current?.resetMotion()
  }, [resetSceneReady, syncDisplayFlags])

  const runtime = useMemo<PackGalleryRuntime>(
    () => ({
      wheelImpulseRef,
      show,
      hide,
      setLayerOpacity,
      isSceneReady,
      subscribeSceneReady,
      setCardNavigateHandler,
    }),
    [show, hide, setLayerOpacity, isSceneReady, subscribeSceneReady, setCardNavigateHandler],
  )

  return (
    <PackGalleryRuntimeContext.Provider value={runtime}>
      {children}
      <PackGalleryHost
        blackLayerRef={blackLayerRef}
        images={images}
        galleryMountKey={galleryMountKey}
        visible={visible}
        displayFlags={displayFlags}
        frameLoop={frameLoop}
        wheelImpulseRef={wheelImpulseRef}
        sceneControlRef={sceneControlRef}
        onSceneReady={markSceneReady}
        onCardNavigate={handleCardNavigate}
      />
    </PackGalleryRuntimeContext.Provider>
  )
}

function PackGalleryHost({
  blackLayerRef,
  images,
  galleryMountKey,
  visible,
  displayFlags,
  frameLoop,
  wheelImpulseRef,
  sceneControlRef,
  onSceneReady,
  onCardNavigate,
}: {
  blackLayerRef: MutableRefObject<HTMLDivElement | null>
  images: PackCardImageItem[]
  galleryMountKey: number
  visible: boolean
  displayFlags: DisplayFlags
  frameLoop: FrameLoopMode
  wheelImpulseRef: MutableRefObject<((deltaY: number) => void) | null>
  sceneControlRef: MutableRefObject<GallerySceneControl | null>
  onSceneReady: () => void
  onCardNavigate: (id: string) => void
}) {
  const imagesReady = isRealGalleryImages(images)
  /** loading 阶段 opacity=0 时也挂载 Canvas，避免 reveal 时冷启动卡顿 */
  const mountGallery = visible && imagesReady

  return (
    <div
      className={cn(
        'fixed inset-0',
        displayFlags.onTop ? 'z-[50]' : 'pointer-events-none z-[-1]',
      )}
      aria-hidden={!displayFlags.onTop}
    >
      <div
        ref={blackLayerRef}
        className="absolute inset-0 bg-black will-change-[opacity]"
        style={{ opacity: 0 }}
      >
        {mountGallery ? (
          <InfiniteGallery
            key={galleryMountKey}
            images={images}
            speed={1.2}
            visibleCount={10}
            interactive={false}
            wheelImpulseRef={wheelImpulseRef}
            sceneControlRef={sceneControlRef}
            enableFlip
            enableHover={false}
            disableClothDeform
            frameLoop={frameLoop}
            className="h-full w-full cursor-default bg-black"
            onSceneReady={onSceneReady}
            onCardNavigate={onCardNavigate}
            sceneReadyFrameCount={6}
            blurSettings={{
              blurIn: { start: 0.0, end: 0.08 },
              blurOut: { start: 0.92, end: 0.98 },
              maxBlur: 0,
            }}
          />
        ) : displayFlags.onTop && !imagesReady ? (
          <div className="flex h-full w-full items-center justify-center text-white/50">
            生成卡面纹理…
          </div>
        ) : null}
      </div>
      {displayFlags.showTitle ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3 mix-blend-exclusion">
          <h1 className="text-center font-serif text-4xl font-bold tracking-tighter text-white md:text-7xl">
            <span className="italic">Ninewood</span>
          </h1>
        </div>
      ) : null}
    </div>
  )
}
