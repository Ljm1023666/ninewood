import type React from 'react'
import {
  useRef,
  useMemo,
  useCallback,
  useState,
  useEffect,
  forwardRef,
  Suspense,
  type MutableRefObject,
} from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { getFlipCardTitleBarClass } from '@/utils/flip-card-title-bar'
import { getGalleryTitleBarHeightRatio } from '@/utils/pack-card-texture'

export type PackCardImageItem = {
  src: string
  backSrc?: string
  alt?: string
  title?: string
  price?: string
  id?: string
}

export type ImageItem = string | PackCardImageItem

export interface FadeSettings {
  fadeIn: { start: number; end: number }
  fadeOut: { start: number; end: number }
}

export interface BlurSettings {
  blurIn: { start: number; end: number }
  blurOut: { start: number; end: number }
  maxBlur: number
}

/** 镜头过近时淡出，防止贴脸闪光（worldZ = plane.z - depthRange/2） */
export interface ProximityFadeSettings {
  startWorldZ: number
  endWorldZ: number
}

const PACK_CARD_PROXIMITY_FADE: ProximityFadeSettings = {
  startWorldZ: -5,
  endWorldZ: -1,
}

export interface InfiniteGalleryProps {
  images: ImageItem[]
  speed?: number
  visibleCount?: number
  fadeSettings?: FadeSettings
  blurSettings?: BlurSettings
  interactive?: boolean
  wheelImpulseRef?: MutableRefObject<((deltaY: number) => void) | null>
  cardAspect?: number
  fallProgress?: number
  enableFlip?: boolean
  /** 悬停旗子飘动（开包画廊应关闭） */
  enableHover?: boolean
  /** 开包画廊：DOM 色条（与详情页 flip-card-title-bar-shimmer 一致） */
  domTitleBar?: boolean
  /** 开包画廊：禁用布帘 scrollForce 形变，避免色条与封面错位 */
  disableClothDeform?: boolean
  /** 贴脸淡出；enableFlip 时默认启用 PACK_CARD_PROXIMITY_FADE */
  proximityFade?: ProximityFadeSettings | false
  className?: string
  style?: React.CSSProperties
  /** Canvas 帧循环；隐藏宿主时应为 never，避免抢占开包动画 GPU */
  frameLoop?: 'always' | 'demand' | 'never'
  sceneControlRef?: MutableRefObject<GallerySceneControl | null>
  /** 首帧布局稳定后回调（用于开包 loading 结束后再 reveal） */
  onSceneReady?: () => void
  /** 连续渲染帧数达到该值才触发 onSceneReady */
  sceneReadyFrameCount?: number
  /** 点击背面金额时跳转（开包画廊） */
  onCardNavigate?: (id: string) => void
}

interface PlaneData {
  index: number
  z: number
  imageIndex: number
  x: number
  y: number
}

const DEFAULT_DEPTH_RANGE = 50
const CARD_ASPECT_9_16 = 9 / 16

/** 供宿主在换图 / 显示前重置滚动与布帘形变，避免 scrollForce 冷启动抽搐 */
export type GallerySceneControl = {
  resetMotion: () => void
}

function normalizeImage(img: ImageItem): PackCardImageItem {
  return typeof img === 'string' ? { src: img, alt: '' } : img
}

/** 背面 canvas 金额约在高度 82% 处，对应 plane UV 底部区域 */
function isBackPriceUvHit(uv: THREE.Vector2 | undefined): boolean {
  if (!uv) return false
  return uv.x >= 0.12 && uv.x <= 0.88 && uv.y >= 0.06 && uv.y <= 0.3
}

const createClothMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      map: { value: null as THREE.Texture | null },
      opacity: { value: 1.0 },
      blurAmount: { value: 0.0 },
      scrollForce: { value: 0.0 },
      time: { value: 0.0 },
      isHovered: { value: 0.0 },
    },
    vertexShader: `
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float curve = length(pos.xy) * length(pos.xy) * scrollForce * 0.3;
        float ripple = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float flagWave = isHovered > 0.5 ? sin(pos.x * 3.0 + time * 8.0) * 0.08 : 0.0;
        pos.z -= curve + ripple + flagWave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float blurAmount;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        if (blurAmount > 0.0) {
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));
          vec4 blurred = vec4(0.0);
          float total = 0.0;
          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 offset = vec2(x, y) * texelSize * blurAmount;
              float weight = 1.0 / (1.0 + length(vec2(x, y)));
              blurred += texture2D(map, vUv + offset) * weight;
              total += weight;
            }
          }
          color = blurred / total;
        }
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
  })

const PACK_TITLE_BAR_RATIO = getGalleryTitleBarHeightRatio()

const FlippableCardPlane = forwardRef<
  THREE.Group,
  {
    frontTexture: THREE.Texture
    backTexture?: THREE.Texture
    title?: string
    price?: string
    cardId?: string
    domTitleBar?: boolean
    imageIndex: number
    position: [number, number, number]
    scale: [number, number, number]
    material: THREE.ShaderMaterial
    enableFlip?: boolean
    enableHover?: boolean
    disableClothDeform?: boolean
    onBackMaterialRef?: (mat: THREE.ShaderMaterial | null) => void
    onCardNavigate?: (id: string) => void
  }
>(function FlippableCardPlane(
  {
    frontTexture,
    backTexture,
    title,
    price = '',
    cardId,
    domTitleBar = false,
    imageIndex,
    position,
    scale,
    material,
    enableFlip,
    enableHover = false,
    disableClothDeform = false,
    onBackMaterialRef,
    onCardNavigate,
  },
  ref,
) {
  const groupRef = useRef<THREE.Group>(null)
  const titleBarHtmlRef = useRef<HTMLDivElement>(null)
  const [flipped, setFlipped] = useState(false)
  const flipAngle = useRef(0)
  const frontMatRef = useRef<THREE.ShaderMaterial | null>(null)
  const backMatRef = useRef<THREE.ShaderMaterial | null>(null)

  const backMaterial = useMemo(() => {
    if (!enableFlip || !backTexture) return null
    const mat = createClothMaterial()
    mat.uniforms.map.value = backTexture
    backMatRef.current = mat
    return mat
  }, [enableFlip, backTexture])

  useEffect(() => {
    onBackMaterialRef?.(backMaterial)
    return () => {
      onBackMaterialRef?.(null)
    }
  }, [backMaterial, onBackMaterialRef])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    if (typeof ref === 'function') ref(group)
    else if (ref) ref.current = group
  }, [ref])

  useEffect(() => {
    setFlipped(false)
    flipAngle.current = 0
    if (groupRef.current) groupRef.current.rotation.y = 0
    material.uniforms.map.value = frontTexture
  }, [material, frontTexture, imageIndex])

  useEffect(() => {
    if (backMaterial) backMaterial.uniforms.map.value = backTexture ?? frontTexture
  }, [backMaterial, backTexture, frontTexture])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const target = flipped ? Math.PI : 0
    flipAngle.current = THREE.MathUtils.lerp(flipAngle.current, target, delta * 8)
    groupRef.current.rotation.y = flipAngle.current

    if (frontMatRef.current) {
      frontMatRef.current.uniforms.opacity.value = material.uniforms.opacity.value
      frontMatRef.current.uniforms.blurAmount.value = material.uniforms.blurAmount.value
      frontMatRef.current.uniforms.scrollForce.value = material.uniforms.scrollForce.value
      frontMatRef.current.uniforms.time.value = material.uniforms.time.value
      frontMatRef.current.uniforms.isHovered.value = enableHover
        ? material.uniforms.isHovered.value
        : 0
    }
    if (backMatRef.current) {
      backMatRef.current.uniforms.opacity.value = material.uniforms.opacity.value
      backMatRef.current.uniforms.blurAmount.value = material.uniforms.blurAmount.value
      backMatRef.current.uniforms.scrollForce.value = material.uniforms.scrollForce.value
      backMatRef.current.uniforms.time.value = material.uniforms.time.value
      backMatRef.current.uniforms.isHovered.value = enableHover
        ? material.uniforms.isHovered.value
        : 0
    }
    if (titleBarHtmlRef.current) {
      titleBarHtmlRef.current.style.opacity = String(material.uniforms.opacity.value)
    }
  })

  const showBack = enableFlip && backMaterial

  const hoverHandlers = enableHover
    ? {
        onPointerEnter: () => {
          material.uniforms.isHovered.value = 1
        },
        onPointerLeave: () => {
          material.uniforms.isHovered.value = 0
        },
      }
    : {
        onPointerOver: (e: THREE.Event) => {
          e.stopPropagation()
          document.body.style.cursor = 'default'
        },
        onPointerOut: () => {
          document.body.style.cursor = ''
        },
      }

  return (
    <group ref={groupRef} position={position}>
      <group scale={scale}>
        <mesh
          material={material}
          ref={(mesh) => {
            frontMatRef.current = mesh?.material as THREE.ShaderMaterial | null
          }}
          {...hoverHandlers}
          onClick={(e) => {
            e.stopPropagation()
            if (showBack) setFlipped((v) => !v)
          }}
        >
          <planeGeometry
            args={
              disableClothDeform ? [1, 1, 1, 1] : [1, 1, 32, 32]
            }
          />
        </mesh>
        {domTitleBar && title ? (
          <mesh
            position={[0, 0.5 - PACK_TITLE_BAR_RATIO / 2, 0.004]}
            raycast={() => null}
          >
            <planeGeometry args={[1, PACK_TITLE_BAR_RATIO, 1, 1]} />
            <meshBasicMaterial visible={false} />
            <Html transform occlude pointerEvents="none" style={{ pointerEvents: 'none' }}>
              <div
                ref={titleBarHtmlRef}
                className={`w-full overflow-hidden backdrop-blur-sm ${getFlipCardTitleBarClass(price)}`}
                style={{ padding: '14px 10px' }}
              >
                <p className="m-0 line-clamp-2 text-center text-[15px] font-bold leading-tight text-[var(--pack-stage-fg)]">
                  {title}
                </p>
              </div>
            </Html>
          </mesh>
        ) : null}
        {showBack ? (
          <mesh
            material={backMaterial}
            rotation={[0, Math.PI, 0]}
            position={[0, 0, -0.002]}
            {...hoverHandlers}
            onClick={(e) => {
              e.stopPropagation()
              if (
                flipped &&
                cardId &&
                onCardNavigate &&
                isBackPriceUvHit(e.uv)
              ) {
                onCardNavigate(cardId)
                return
              }
              setFlipped((v) => !v)
            }}
          >
            <planeGeometry
              args={
                disableClothDeform ? [1, 1, 1, 1] : [1, 1, 32, 32]
              }
            />
          </mesh>
        ) : null}
      </group>
    </group>
  )
})

function GalleryScene({
  images,
  speed = 1,
  visibleCount = 8,
  interactive = true,
  wheelImpulseRef,
  wheelContainerRef,
  cardAspect,
  fallProgress = 0,
  enableFlip = false,
  enableHover = true,
  domTitleBar = false,
  disableClothDeform = false,
  proximityFade,
  fadeSettings = {
    fadeIn: { start: 0.05, end: 0.15 },
    fadeOut: { start: 0.85, end: 0.95 },
  },
  blurSettings = {
    blurIn: { start: 0.0, end: 0.1 },
    blurOut: { start: 0.9, end: 1.0 },
    maxBlur: 3.0,
  },
  sceneControlRef,
  onSceneReady,
  sceneReadyFrameCount = 5,
  onCardNavigate,
}: Omit<InfiniteGalleryProps, 'className' | 'style'> & {
  wheelContainerRef?: React.RefObject<HTMLDivElement | null>
}) {
  const scrollVelocityRef = useRef(0)
  const sceneReadySentRef = useRef(false)
  const presentedFramesRef = useRef(0)
  const travelDirectionRef = useRef(1)
  const autoPlayRef = useRef(true)
  const lastInteractionRef = useRef(Date.now())
  const fallProgressRef = useRef(fallProgress)
  fallProgressRef.current = fallProgress
  const planeGroupRefs = useRef<(THREE.Group | null)[]>([])
  const planeImageIndices = useRef<number[]>([])
  const planeBackMatRefs = useRef<(THREE.ShaderMaterial | null)[]>([])

  const activeProximityFade =
    proximityFade === false
      ? null
      : proximityFade ?? (enableFlip ? PACK_CARD_PROXIMITY_FADE : null)

  const applyScrollImpulse = useCallback(
    (deltaY: number, fromKeyboard = false) => {
      scrollVelocityRef.current += fromKeyboard ? deltaY * speed : deltaY * 0.01 * speed
      if (deltaY < 0) travelDirectionRef.current = -1
      else if (deltaY > 0) travelDirectionRef.current = 1
      autoPlayRef.current = false
      lastInteractionRef.current = Date.now()
    },
    [speed],
  )

  useEffect(() => {
    if (!wheelImpulseRef) return
    wheelImpulseRef.current = (deltaY) => applyScrollImpulse(deltaY)
    return () => {
      wheelImpulseRef.current = null
    }
  }, [wheelImpulseRef, applyScrollImpulse])

  const normalizedImages = useMemo(() => images.map(normalizeImage), [images])
  const frontTextures = useTexture(normalizedImages.map((img) => img.src))
  const backTextures = useTexture(
    normalizedImages.map((img) => img.backSrc ?? img.src),
  )

  useEffect(() => {
    const configure = (tex: THREE.Texture) => {
      tex.anisotropy = 4
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      tex.needsUpdate = true
    }
    frontTextures.forEach(configure)
    backTextures.forEach(configure)
  }, [frontTextures, backTextures])

  const materials = useMemo(
    () => Array.from({ length: visibleCount }, () => createClothMaterial()),
    [visibleCount],
  )

  const spatialPositions = useMemo(() => {
    return Array.from({ length: visibleCount }, (_, i) => ({
      x: (Math.sin((i * 2.618) % (Math.PI * 2)) * ((i % 3) * 1.2) * 8) / 3,
      y: (Math.cos((i * 1.618 + Math.PI / 3) % (Math.PI * 2)) * (((i + 1) % 4) * 0.8) * 8) / 4,
    }))
  }, [visibleCount])

  const totalImages = normalizedImages.length
  const depthRange = DEFAULT_DEPTH_RANGE

  const planesData = useRef<PlaneData[]>(
    Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: visibleCount > 0 ? ((depthRange / visibleCount) * i) % depthRange : 0,
      imageIndex: totalImages > 0 ? i % totalImages : 0,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    })),
  )

  useEffect(() => {
    planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: visibleCount > 0 ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange : 0,
      imageIndex: totalImages > 0 ? i % totalImages : 0,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    }))
  }, [depthRange, spatialPositions, totalImages, visibleCount])

  const resetMotion = useCallback(() => {
    scrollVelocityRef.current = 0
    travelDirectionRef.current = 1
    autoPlayRef.current = true
    lastInteractionRef.current = Date.now()
    planeImageIndices.current = []
    planesData.current = Array.from({ length: visibleCount }, (_, i) => ({
      index: i,
      z: visibleCount > 0 ? ((depthRange / Math.max(visibleCount, 1)) * i) % depthRange : 0,
      imageIndex: totalImages > 0 ? i % totalImages : 0,
      x: spatialPositions[i]?.x ?? 0,
      y: spatialPositions[i]?.y ?? 0,
    }))
    materials.forEach((material) => {
      material.uniforms.scrollForce.value = 0
    })
  }, [depthRange, materials, spatialPositions, totalImages, visibleCount])

  useEffect(() => {
    if (!sceneControlRef) return
    sceneControlRef.current = { resetMotion }
    return () => {
      sceneControlRef.current = null
    }
  }, [sceneControlRef, resetMotion])

  useEffect(() => {
    resetMotion()
    sceneReadySentRef.current = false
    presentedFramesRef.current = 0
  }, [frontTextures, backTextures, resetMotion])

  useEffect(() => {
    if (!interactive) return
    const root = wheelContainerRef?.current
    if (!root) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      applyScrollImpulse(e.deltaY)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') applyScrollImpulse(-2, true)
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') applyScrollImpulse(2, true)
    }
    root.addEventListener('wheel', onWheel, { passive: false, capture: true })
    document.addEventListener('keydown', onKey)
    return () => {
      root.removeEventListener('wheel', onWheel, { capture: true })
      document.removeEventListener('keydown', onKey)
    }
  }, [interactive, wheelContainerRef, applyScrollImpulse])

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastInteractionRef.current > 3000) {
        autoPlayRef.current = true
        if (!interactive) travelDirectionRef.current = 1
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [interactive])

  useFrame((state, delta) => {
    if (autoPlayRef.current) {
      scrollVelocityRef.current += 0.3 * delta * travelDirectionRef.current
    }
    scrollVelocityRef.current *= 0.95

    const scrollVelocity = scrollVelocityRef.current
    const fallY = fallProgressRef.current * 28
    const time = state.clock.getElapsedTime()

    materials.forEach((material) => {
      material.uniforms.time.value = time
      material.uniforms.scrollForce.value = disableClothDeform ? 0 : scrollVelocity
      if (!enableHover) material.uniforms.isHovered.value = 0
    })

    const imageAdvance =
      totalImages > 0 ? visibleCount % totalImages || totalImages : 0
    const totalRange = depthRange
    const halfRange = totalRange / 2

    planesData.current.forEach((plane, i) => {
      let newZ = plane.z + scrollVelocity * delta * 10
      let wrapsForward = 0
      let wrapsBackward = 0

      if (newZ >= totalRange) {
        wrapsForward = Math.floor(newZ / totalRange)
        newZ -= totalRange * wrapsForward
      } else if (newZ < 0) {
        wrapsBackward = Math.ceil(-newZ / totalRange)
        newZ += totalRange * wrapsBackward
      }

      if (wrapsForward > 0 && imageAdvance > 0 && totalImages > 0) {
        plane.imageIndex =
          (plane.imageIndex + wrapsForward * imageAdvance) % totalImages
      }
      if (wrapsBackward > 0 && imageAdvance > 0 && totalImages > 0) {
        const step = plane.imageIndex - wrapsBackward * imageAdvance
        plane.imageIndex = ((step % totalImages) + totalImages) % totalImages
      }

      plane.z = ((newZ % totalRange) + totalRange) % totalRange
      plane.x = spatialPositions[i]?.x ?? 0
      plane.y = (spatialPositions[i]?.y ?? 0) - fallY

      const worldZ = plane.z - halfRange
      const normalizedPosition = plane.z / totalRange
      let opacity = 1
      if (normalizedPosition >= fadeSettings.fadeIn.start && normalizedPosition <= fadeSettings.fadeIn.end) {
        opacity =
          (normalizedPosition - fadeSettings.fadeIn.start) /
          (fadeSettings.fadeIn.end - fadeSettings.fadeIn.start)
      } else if (normalizedPosition < fadeSettings.fadeIn.start) {
        opacity = 0
      } else if (normalizedPosition >= fadeSettings.fadeOut.start && normalizedPosition <= fadeSettings.fadeOut.end) {
        opacity =
          1 -
          (normalizedPosition - fadeSettings.fadeOut.start) /
            (fadeSettings.fadeOut.end - fadeSettings.fadeOut.start)
      } else if (normalizedPosition > fadeSettings.fadeOut.end) {
        opacity = 0
      }

      if (activeProximityFade) {
        const { startWorldZ, endWorldZ } = activeProximityFade
        if (worldZ > startWorldZ) {
          const nearT = (worldZ - startWorldZ) / (endWorldZ - startWorldZ)
          opacity *= 1 - Math.max(0, Math.min(1, nearT))
        }
        if (worldZ >= endWorldZ) {
          opacity = 0
        }
      }

      opacity = Math.max(0, Math.min(1, opacity * (1 - fallProgressRef.current * 0.85)))

      let blur = 0
      if (normalizedPosition >= blurSettings.blurIn.start && normalizedPosition <= blurSettings.blurIn.end) {
        blur =
          blurSettings.maxBlur *
          (1 -
            (normalizedPosition - blurSettings.blurIn.start) /
              (blurSettings.blurIn.end - blurSettings.blurIn.start))
      } else if (normalizedPosition < blurSettings.blurIn.start) {
        blur = blurSettings.maxBlur
      } else if (normalizedPosition >= blurSettings.blurOut.start && normalizedPosition <= blurSettings.blurOut.end) {
        blur =
          blurSettings.maxBlur *
          ((normalizedPosition - blurSettings.blurOut.start) /
            (blurSettings.blurOut.end - blurSettings.blurOut.start))
      } else if (normalizedPosition > blurSettings.blurOut.end) {
        blur = blurSettings.maxBlur
      }

      const group = planeGroupRefs.current[i]
      if (group) {
        group.position.set(plane.x, plane.y, worldZ)
      }

      const material = materials[i]
      if (material?.uniforms) {
        material.uniforms.opacity.value = opacity
        material.uniforms.blurAmount.value = blur

        if (planeImageIndices.current[i] !== plane.imageIndex) {
          planeImageIndices.current[i] = plane.imageIndex
          const front = frontTextures[plane.imageIndex]
          const back = backTextures[plane.imageIndex]
          if (front) material.uniforms.map.value = front
          const backMat = planeBackMatRefs.current[i]
          if (backMat && back) backMat.uniforms.map.value = back
        }
      }
    })

    if (onSceneReady && !sceneReadySentRef.current) {
      presentedFramesRef.current += 1
      if (presentedFramesRef.current >= sceneReadyFrameCount) {
        sceneReadySentRef.current = true
        onSceneReady()
      }
    }
  })

  if (normalizedImages.length === 0) return null

  const aspect = cardAspect ?? CARD_ASPECT_9_16
  const scale: [number, number, number] =
    aspect >= 1 ? [2 * aspect, 2, 1] : [2, 2 / aspect, 1]

  return (
    <>
      {planesData.current.map((plane, i) => {
        const front = frontTextures[plane.imageIndex]
        const back = backTextures[plane.imageIndex]
        const meta = normalizedImages[plane.imageIndex]
        const material = materials[i]
        if (!front || !material) return null
        const worldZ = plane.z - depthRange / 2
        return (
          <FlippableCardPlane
            key={plane.index}
            ref={(node) => {
              planeGroupRefs.current[i] = node
            }}
            imageIndex={plane.imageIndex}
            frontTexture={front}
            backTexture={enableFlip ? back : undefined}
            title={meta?.title}
            price={meta?.price}
            cardId={meta?.id}
            domTitleBar={domTitleBar}
            position={[plane.x, plane.y, worldZ]}
            scale={scale}
            material={material}
            enableFlip={enableFlip}
            enableHover={enableHover}
            disableClothDeform={disableClothDeform}
            onCardNavigate={onCardNavigate}
            onBackMaterialRef={(mat) => {
              planeBackMatRefs.current[i] = mat
            }}
          />
        )
      })}
    </>
  )
}

function FallbackGallery({ images }: { images: ImageItem[] }) {
  const normalizedImages = useMemo(() => images.map(normalizeImage), [images])
  return (
    <div
      className="flex h-full flex-col items-center justify-center p-4"
      style={{ background: 'var(--pack-stage-bg)' }}
    >
      <p className="mb-4 text-[var(--pack-stage-fg-muted)]">WebGL 不可用</p>
      <div className="grid max-h-96 grid-cols-2 gap-4 overflow-y-auto">
        {normalizedImages.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt={img.alt ?? ''}
            className="h-32 w-full rounded object-cover"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden'
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function InfiniteGallery(props: InfiniteGalleryProps) {
  const {
    images,
    className = 'h-96 w-full',
    style,
    interactive = true,
    wheelImpulseRef,
    cardAspect = CARD_ASPECT_9_16,
    fallProgress = 0,
  enableFlip = false,
  enableHover = true,
  domTitleBar = false,
  disableClothDeform = false,
  frameLoop = 'always',
  sceneControlRef,
  onSceneReady,
  sceneReadyFrameCount,
  onCardNavigate,
  fadeSettings = {
      fadeIn: { start: 0.05, end: 0.15 },
      fadeOut: { start: 0.85, end: 0.95 },
    },
    blurSettings = {
      blurIn: { start: 0.0, end: 0.1 },
      blurOut: { start: 0.9, end: 1.0 },
      maxBlur: 3.0,
    },
    ...sceneProps
  } = props

  const [webglSupported, setWebglSupported] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (!gl) setWebglSupported(false)
    } catch {
      setWebglSupported(false)
    }
  }, [])

  if (!webglSupported) {
    return (
      <div className={className} style={style}>
        <FallbackGallery images={images} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, background: 'var(--pack-stage-bg)' }}
    >
      <Canvas
        camera={{ position: [0, 0, 0], fov: 55 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        frameloop={frameLoop}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <GalleryScene
            images={images}
            interactive={interactive}
            wheelImpulseRef={wheelImpulseRef}
            wheelContainerRef={containerRef}
            cardAspect={cardAspect}
            fallProgress={fallProgress}
            enableFlip={enableFlip}
            enableHover={enableHover}
            domTitleBar={domTitleBar}
            disableClothDeform={disableClothDeform}
            fadeSettings={fadeSettings}
            blurSettings={blurSettings}
            sceneControlRef={sceneControlRef}
            onSceneReady={onSceneReady}
            sceneReadyFrameCount={sceneReadyFrameCount}
            onCardNavigate={onCardNavigate}
            {...sceneProps}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
