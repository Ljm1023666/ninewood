import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

gsap.registerPlugin(ScrollTrigger)

interface SectionContent {
  title: string
  subtitle: { line1: string; line2: string }
  render?: () => React.ReactNode
}

interface HorizonHeroSectionProps {
  sections?: SectionContent[]
  children?: React.ReactNode
}

export const HorizonHeroSection: React.FC<HorizonHeroSectionProps> = ({
  sections: externalSections,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const scrollProgressRef = useRef<HTMLDivElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const heroContentRef = useRef<HTMLDivElement>(null)
  const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 })
  const locationsRef = useRef<number[]>([])

  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentSection, setCurrentSection] = useState(0)
  const [sectionProgress, setSectionProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const defaultSections: SectionContent[] = [
    {
      title: '发现',
      subtitle: {
        line1: '探索创意的边界，',
        line2: '发现无限可能',
      },
    },
    {
      title: '连接',
      subtitle: {
        line1: '在这个空间里，',
        line2: '创意与需求相遇',
      },
    },
  ]

  const sections = externalSections || defaultSections
  const totalSections = sections.length

  const threeRefs = useRef<{
    scene: THREE.Scene | null
    camera: THREE.PerspectiveCamera | null
    renderer: THREE.WebGLRenderer | null
    composer: EffectComposer | null
    stars: THREE.Points[]
    nebula: THREE.Mesh | null
    mountains: THREE.Mesh[]
    animationId: number | null
    targetCameraX: number
    targetCameraY: number
    targetCameraZ: number
    locations: number[]
    diskMat: THREE.ShaderMaterial | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null,
    targetCameraX: 0,
    targetCameraY: 30,
    targetCameraZ: 300,
    locations: [],
    diskMat: null,
  })

  // Initialize Three.js
  useEffect(() => {
    const refs = threeRefs.current

    // Scene setup
    refs.scene = new THREE.Scene()
    refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025)

    // Camera
    refs.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    )
    refs.camera.position.z = 100
    refs.camera.position.y = 20

    // Renderer
    refs.renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      antialias: true,
      alpha: true,
    })
    refs.renderer.setSize(window.innerWidth, window.innerHeight)
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    refs.renderer.toneMapping = THREE.ACESFilmicToneMapping
    refs.renderer.toneMappingExposure = 0.5

    // Post-processing
    refs.composer = new EffectComposer(refs.renderer)
    const renderPass = new RenderPass(refs.scene, refs.camera)
    refs.composer.addPass(renderPass)

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.4,
      0.85,
    )
    refs.composer.addPass(bloomPass)

    // Create scene elements
    createStarField()
    createNebula()

    // Start animation
    animate()

    setIsReady(true)

    function createStarField() {
      const starCount = 5000

      for (let i = 0; i < 3; i++) {
        const geometry = new THREE.BufferGeometry()
        const positions = new Float32Array(starCount * 3)
        const colors = new Float32Array(starCount * 3)
        const sizes = new Float32Array(starCount)

        for (let j = 0; j < starCount; j++) {
          const radius = 200 + Math.random() * 800
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(Math.random() * 2 - 1)

          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta)
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[j * 3 + 2] = radius * Math.cos(phi)

          const color = new THREE.Color()
          const colorChoice = Math.random()
          if (colorChoice < 0.7) {
            color.setHSL(0, 0, 0.8 + Math.random() * 0.2)
          } else if (colorChoice < 0.9) {
            color.setHSL(0.08, 0.5, 0.8)
          } else {
            color.setHSL(0.6, 0.5, 0.8)
          }

          colors[j * 3] = color.r
          colors[j * 3 + 1] = color.g
          colors[j * 3 + 2] = color.b

          sizes[j] = Math.random() * 2 + 0.5
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            depth: { value: i },
          },
          vertexShader: /* glsl */ `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            uniform float depth;

            void main() {
              vColor = color;
              vec3 pos = position;

              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: /* glsl */ `
            varying vec3 vColor;
            uniform float time;

            void main() {
              float dist = length(gl_PointCoord - vec2(0.5));
              if (dist > 0.5) discard;

              float base = 1.0 - smoothstep(0.0, 0.5, dist);
              // 每个星点用 vColor 作伪随机种子，产生不同的闪烁相位
              float seed = fract(vColor.r * 31.7 + vColor.g * 17.3 + vColor.b * 53.9);
              float speed = 3.0 + seed * 7.0;
              float twinkle = 0.5 + 0.5 * sin(time * speed + seed * 6.28);
              float opacity = base * (0.05 + 0.95 * twinkle);

              gl_FragColor = vec4(vColor, opacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })

        const stars = new THREE.Points(geometry, material)
        refs.scene!.add(stars)
        refs.stars.push(stars)
      }
    }

    function createNebula() {
      const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0x001133) },
          color2: { value: new THREE.Color(0x003366) },
          opacity: { value: 0.3 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying float vElevation;
          uniform float time;

          void main() {
            vUv = uv;
            vec3 pos = position;

            float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
            pos.z += elevation;
            vElevation = elevation;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;
          varying float vElevation;

          void main() {
            float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
            vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);

            float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
            alpha *= 1.0 + vElevation * 0.01;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })

      const nebula = new THREE.Mesh(geometry, material)
      nebula.position.z = -1050
      nebula.rotation.x = 0
      refs.scene!.add(nebula)
      refs.nebula = nebula
    }

    function createMountains() {
      const layers = [
        { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
        { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
        { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
        { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 },
      ]

      layers.forEach((layer, index) => {
        const points: THREE.Vector2[] = []
        const segments = 50

        for (let i = 0; i <= segments; i++) {
          const x = (i / segments - 0.5) * 1000
          const y =
            Math.sin(i * 0.1) * layer.height +
            Math.sin(i * 0.05) * layer.height * 0.5 +
            Math.random() * layer.height * 0.2 -
            150
          points.push(new THREE.Vector2(x, y))
        }

        points.push(new THREE.Vector2(5000, -300))
        points.push(new THREE.Vector2(-5000, -300))

        const shape = new THREE.Shape(points)
        const geometry = new THREE.ShapeGeometry(shape)
        const material = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          side: THREE.DoubleSide,
        })

        const mountain = new THREE.Mesh(geometry, material)
        mountain.position.z = layer.distance
        mountain.position.y = layer.distance
        mountain.userData = { baseZ: layer.distance, index }
        refs.scene!.add(mountain)
        refs.mountains.push(mountain)
      })
    }

    function createBlackHole() {
      // 黑洞球体 — 事件视界
      const geo = new THREE.SphereGeometry(600, 48, 48)
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          uniform float time;

          void main() {
            vec3 viewDir = normalize(vViewDir);
            vec3 normal = normalize(vNormal);

            float rim = 1.0 - max(dot(viewDir, -normal), 0.0);
            rim = pow(rim, 3.0);

            vec3 dark = vec3(0.02, 0.03, 0.05);

            vec3 color = dark;
            float alpha = 0.9 + rim * 0.1;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        side: THREE.BackSide,
        transparent: true,
      })

      const mesh = new THREE.Mesh(geo, mat)
      refs.scene!.add(mesh)

      // 吸积盘 (accretion disk)
      const diskGeo = new THREE.RingGeometry(350, 800, 80)
      const posArr = diskGeo.attributes.position.array
      const uvArr = new Float32Array(posArr.length / 3 * 2)
      for (let i = 0; i < posArr.length / 3; i++) {
        const x = posArr[i * 3]
        const z = posArr[i * 3 + 2]
        const radius = Math.sqrt(x * x + z * z)
        uvArr[i * 2] = (radius - 350) / (800 - 350)
        uvArr[i * 2 + 1] = 0.5
      }
      diskGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2))

      const diskMat = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          uniform float time;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float angle = time * 0.08;
            float cosA = cos(angle);
            float sinA = sin(angle);
            float x = pos.x * cosA - pos.z * sinA;
            float z = pos.x * sinA + pos.z * cosA;
            pos.x = x;
            pos.z = z;
            float warp = sin(pos.x * 0.003 + time) * cos(pos.z * 0.003 + time * 0.7) * 4.0;
            pos.y += warp;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float time;

          void main() {
            float r = vUv.x;

            vec3 inner = vec3(0.0, 0.0, 0.0);
            vec3 mid   = vec3(0.0, 0.0, 0.0);
            vec3 outer = vec3(0.0, 0.0, 0.0);

            vec3 color = mix(inner, mid, smoothstep(0.0, 0.3, r));
            color = mix(color, outer, smoothstep(0.3, 1.0, r));

            float alpha = (1.0 - r) * 0.4;

            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
      })

      refs.diskMat = diskMat

      const disk = new THREE.Mesh(diskGeo, diskMat)
      disk.position.z = -1050
      disk.position.y = 0
      disk.rotation.x = -0.3
      refs.scene!.add(disk)
    }

    function saveLocations() {
      refs.locations = refs.mountains.map((m) => m.position.z)
      locationsRef.current = refs.locations
    }

    function animate() {
      refs.animationId = requestAnimationFrame(animate)

      const time = Date.now() * 0.001

      // Update stars
      refs.stars.forEach((starField) => {
        if (starField.material instanceof THREE.ShaderMaterial) {
          starField.material.uniforms.time.value = time
        }
      })

      // Update nebula
      if (refs.nebula && refs.nebula.material instanceof THREE.ShaderMaterial) {
        refs.nebula.material.uniforms.time.value = time * 0.5
      }

      // Update accretion disk
      if (refs.diskMat) {
        refs.diskMat.uniforms.time.value = time * 0.2
      }

      // Smooth camera movement
      if (refs.camera) {
        const smoothingFactor = 0.05
        smoothCameraPos.current.x +=
          (refs.targetCameraX - smoothCameraPos.current.x) * smoothingFactor
        smoothCameraPos.current.y +=
          (refs.targetCameraY - smoothCameraPos.current.y) * smoothingFactor
        smoothCameraPos.current.z +=
          (refs.targetCameraZ - smoothCameraPos.current.z) * smoothingFactor

        const floatX = Math.sin(time * 0.1) * 2
        const floatY = Math.cos(time * 0.15) * 1

        refs.camera.position.x = smoothCameraPos.current.x + floatX
        refs.camera.position.y = smoothCameraPos.current.y + floatY
        refs.camera.position.z = smoothCameraPos.current.z
        refs.camera.lookAt(0, 10, -600)
      }

      // Parallax mountains
      refs.mountains.forEach((mountain, i) => {
        const parallaxFactor = 1 + i * 0.5
        mountain.position.x = Math.sin(time * 0.1) * 2 * parallaxFactor
        mountain.position.y = 50 + Math.cos(time * 0.15) * 1 * parallaxFactor
      })

      if (refs.composer) {
        refs.composer.render()
      }
    }

    // Handle resize
    const handleResize = () => {
      if (refs.camera && refs.renderer && refs.composer) {
        refs.camera.aspect = window.innerWidth / window.innerHeight
        refs.camera.updateProjectionMatrix()
        refs.renderer.setSize(window.innerWidth, window.innerHeight)
        refs.composer.setSize(window.innerWidth, window.innerHeight)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (refs.animationId) {
        cancelAnimationFrame(refs.animationId)
      }

      window.removeEventListener('resize', handleResize)

      refs.stars.forEach((starField) => {
        starField.geometry.dispose()
        if (starField.material instanceof THREE.Material) {
          starField.material.dispose()
        }
      })

      refs.mountains.forEach((mountain) => {
        mountain.geometry.dispose()
        if (mountain.material instanceof THREE.Material) {
          mountain.material.dispose()
        }
      })

      if (refs.diskMat) {
        refs.diskMat.dispose()
      }

      if (refs.nebula) {
        refs.nebula.geometry.dispose()
        if (refs.nebula.material instanceof THREE.Material) {
          refs.nebula.material.dispose()
        }
      }

      if (refs.renderer) {
        refs.renderer.dispose()
      }
    }
  }, [])

  // GSAP entrance animations
  useEffect(() => {
    if (!isReady) return
    gsap.set(
      [titleRef.current, subtitleRef.current, scrollProgressRef.current],
      { visibility: 'visible' },
    )

    const tl = gsap.timeline()

    // 先让 hero content 整体出现，消除闪现
    if (heroContentRef.current) {
      tl.to(heroContentRef.current, { opacity: 1, duration: 0.3 })
    }

    if (titleRef.current) {
      const titleChars = titleRef.current.querySelectorAll('.title-char')
      tl.from(
        titleChars,
        {
          y: 200,
          opacity: 0,
          duration: 1.5,
          stagger: 0.05,
          ease: 'power4.out',
        },
        '-=0.5',
      )
    }

    if (subtitleRef.current) {
      const subtitleLines = subtitleRef.current.querySelectorAll('.subtitle-line')
      tl.from(
        subtitleLines,
        {
          y: 50,
          opacity: 0,
          duration: 1,
          stagger: 0.2,
          ease: 'power3.out',
        },
        '-=0.8',
      )
    }

    if (searchBarRef.current) {
      gsap.set(searchBarRef.current, { opacity: 0, y: 30 })
      tl.to(
        searchBarRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power2.out',
        },
        '-=0.3',
      )
    }

    if (scrollProgressRef.current) {
      tl.from(
        scrollProgressRef.current,
        {
          opacity: 0,
          y: 50,
          duration: 1,
          ease: 'power2.out',
        },
        '-=0.5',
      )
    }

    return () => {
      tl.kill()
    }
  }, [isReady])

  // Scroll handling
  const rafRef = useRef<number | null>(null)

  const handleScroll = useCallback(() => {
    if (rafRef.current) return // throttle to 1 per frame
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const el = containerRef.current
      if (!el) return

      const scrollY = el.scrollTop
      const containerHeight = el.clientHeight
      const contentHeight = el.scrollHeight
      const maxScroll = contentHeight - containerHeight
      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1)

      setScrollProgress(progress)
      const newSection = Math.min(Math.floor(progress * totalSections), totalSections - 1)
      setCurrentSection(newSection)

      const refs = threeRefs.current

      const totalProgress = progress * totalSections
      const sp = progress >= 0.99 && newSection === totalSections - 1 ? 1 : totalProgress % 1

    const cameraPositions = [
      { x: 0, y: 30, z: 300 },
      { x: 0, y: 40, z: -50 },
      { x: 0, y: 50, z: -700 },
      { x: 0, y: 60, z: -1400 },
      { x: 0, y: 70, z: -2100 },
    ]

    const currentPos = cameraPositions[newSection] || cameraPositions[0]
    const nextPos = cameraPositions[newSection + 1] || currentPos

    refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sp
    refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sp
    refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sp

    refs.mountains.forEach((mountain, i) => {
      if (progress > 0.7) {
        mountain.position.z = 600000
      } else {
        mountain.position.z = locationsRef.current[i] ?? mountain.userData.baseZ
      }
    })

    if (refs.nebula && refs.mountains.length > 3) {
      refs.nebula.position.z = refs.mountains[3].position.z
    }
    }) // end rAF
  }, [totalSections])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const splitTitle = (text: string) => {
    return text.split('').map((char, i) => (
      <span key={i} className="title-char">
        {char === ' ' ? ' ' : char}
      </span>
    ))
  }

  return (
    <div ref={containerRef} className="hero-container cosmos-style">
      <style>{`
        /* z-index 令牌系统: canvas(0) < sidebar(10) < scroll(2) < hero(3) < toast(9999) */
        .hero-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          width: 100%;
          background: #000;
          color: #fff;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.15) transparent;
        }
        .hero-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }
        .hero-content {
          position: relative;
          z-index: 3;
          opacity: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 0 24px;
          text-align: center;
        }
        .hero-title {
          font-size: clamp(48px, 10vw, 140px);
          font-weight: 700;
          letter-spacing: 0.05em;
          line-height: 1;
          margin: 0 0 24px;
          overflow: hidden;
        }
        .title-char {
          display: inline-block;
        }
        .hero-subtitle {
          font-size: clamp(14px, 2vw, 20px);
          color: rgba(255,255,255,0.6);
          line-height: 1.6;
        }
        .subtitle-line {
          margin: 0;
        }
        .scroll-progress {
          position: fixed;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .scroll-text {
          font-size: 10px;
          letter-spacing: 4px;
          color: rgba(255,255,255,0.4);
        }
        .progress-track {
          width: 2px;
          height: 120px;
          background: rgba(255,255,255,0.1);
          border-radius: 1px;
          overflow: hidden;
        }
        .progress-fill {
          width: 100%;
          background: rgba(255,255,255,0.5);
          border-radius: 1px;
          transition: height 0.1s linear;
        }
        .section-counter {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-variant-numeric: tabular-nums;
        }
        .scroll-sections {
          position: relative;
          z-index: 2;
        }
        .content-section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          text-align: center;
          position: relative;
        }
        .content-section .hero-title {
          font-size: clamp(36px, 8vw, 100px);
          z-index: 2;
          position: relative;
        }
        .content-section .hero-subtitle {
          z-index: 2;
          position: relative;
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-container *,
          .hero-container *::before,
          .hero-container *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <canvas ref={canvasRef} className="hero-canvas" />

      {/* Hero content */}
      <div ref={heroContentRef} className="hero-content cosmos-content"
        style={{ opacity: Math.max(0, 1 - scrollProgress * totalSections) }}
      >
        <h1 ref={titleRef} className="hero-title">
          {splitTitle(sections[0]?.title || 'DISCOVER')}
        </h1>

        <div ref={subtitleRef} className="hero-subtitle cosmos-subtitle">
          <p className="subtitle-line">{sections[0]?.subtitle.line1}</p>
          <p className="subtitle-line">{sections[0]?.subtitle.line2}</p>
        </div>

        {sections[0]?.render && (
          <div
            ref={searchBarRef}
            className="relative z-20 w-full mx-auto mt-8"
          >
            {React.useMemo(() => sections[0].render?.(), [sections[0]])}
          </div>
        )}
      </div>

      {/* Scroll progress indicator */}
      <div
        ref={scrollProgressRef}
        className="scroll-progress"
        style={{ visibility: 'hidden' as const }}
      >
        <div className="scroll-text">SCROLL</div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        <div className="section-counter">
          {String(currentSection + 1).padStart(2, '0')} /{' '}
          {String(totalSections).padStart(2, '0')}
        </div>
      </div>

      {/* Scroll sections */}
      <div className="scroll-sections">
        {sections.slice(1).map((section, i) => {
          const s = i + 1
          const dist = Math.abs(currentSection - s)
          const secOpacity = dist >= 1 ? 0 : 1 - dist
          return (
            <section key={i} className="content-section">
              <div style={{ opacity: secOpacity, transition: 'opacity 0.3s linear' }}>
              <h1 className="hero-title">{splitTitle(section.title)}</h1>
              <div className="hero-subtitle cosmos-subtitle">
                <p className="subtitle-line">{section.subtitle.line1}</p>
                <p className="subtitle-line">{section.subtitle.line2}</p>
              </div>
              {section.render && (
                <div className="relative z-10 mt-12">
                  {section.render()}
                </div>
              )}
              </div>
            </section>
          )
        }
        )}
        {children && (
          <section className="content-section">
            <div className="relative z-10 w-full max-w-6xl mx-auto">{children}</div>
          </section>
        )}
      </div>
    </div>
  )
}

export default HorizonHeroSection
