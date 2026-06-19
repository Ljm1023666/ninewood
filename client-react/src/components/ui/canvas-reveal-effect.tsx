import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { cn } from '@/lib/utils'

// ---- DotMatrix (pure Three.js) ----

interface DotMatrixProps {
  colors?: number[][]
  opacities?: number[]
  totalSize?: number
  dotSize?: number
  reverse?: boolean
  animationSpeed?: number
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[255, 255, 255]],
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  totalSize = 20,
  dotSize = 6,
  reverse = false,
  animationSpeed = 3,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 准备颜色数组
    let colorsArray: number[][] = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]]
    if (colors.length >= 2) {
      colorsArray = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]]
    }

    const colorVec3s = colorsArray.map((c) => new THREE.Vector3(c[0] / 255, c[1] / 255, c[2] / 255))

    const width = container.clientWidth
    const height = container.clientHeight

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // 场景 + 相机
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1

    // Shader 材质
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        attribute vec2 coordinates;
        uniform vec2 u_resolution;
        varying vec2 fragCoord;
        void main(){
          gl_Position = vec4(position.x, position.y, 0.0, 1.0);
          fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
      `,
      fragmentShader: `
        precision mediump float;
        varying vec2 fragCoord;

        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        uniform bool u_reverse;

        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
            return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }

        void main() {
            vec2 st = fragCoord.xy;
            st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));
            st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));

            float opacity = step(0.0, st.x);
            opacity *= step(0.0, st.y);

            vec2 st2 = vec2(floor(st.x / u_total_size), floor(st.y / u_total_size));

            float frequency = 5.0;
            float show_offset = random(st2);
            float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency));
            opacity *= u_opacities[int(rand * 10.0)];
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
            opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));

            vec3 color = u_colors[int(show_offset * 6.0)];

            float animation_speed_factor = ${animationSpeed.toFixed(1)};
            vec2 center_grid = u_resolution / 2.0 / u_total_size;
            float dist_from_center = distance(center_grid, st2);

            float timing_offset_intro = dist_from_center * 0.01 + (random(st2) * 0.15);
            float max_grid_dist = distance(center_grid, vec2(0.0, 0.0));
            float timing_offset_outro = (max_grid_dist - dist_from_center) * 0.02 + (random(st2 + 42.0) * 0.2);

            if (u_reverse) {
                float current_timing_offset = timing_offset_outro;
                opacity *= 1.0 - step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            } else {
                float current_timing_offset = timing_offset_intro;
                opacity *= step(current_timing_offset, u_time * animation_speed_factor);
                opacity *= clamp((1.0 - step(current_timing_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
            }

            gl_FragColor = vec4(color, opacity);
            gl_FragColor.rgb *= gl_FragColor.a;
        }
      `,
      uniforms: {
        u_time: { value: 0 },
        u_opacities: { value: opacities },
        u_colors: { value: colorVec3s },
        u_total_size: { value: totalSize },
        u_dot_size: { value: dotSize },
        u_resolution: { value: new THREE.Vector2(width * 2, height * 2) },
        u_reverse: { value: reverse },
      },
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneFactor,
    })

    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // 动画循环
    let animationId: number
    const timer = new THREE.Timer()

    function animate() {
      animationId = requestAnimationFrame(animate)
      material.uniforms.u_time.value = timer.getElapsed()
      renderer.render(scene, camera)
    }
    animate()

    // resize
    function onResize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      renderer.setSize(w, h)
      material.uniforms.u_resolution.value.set(w * 2, h * 2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [colors, opacities, totalSize, dotSize, reverse, animationSpeed])

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />
}

// ---- CanvasRevealEffect (public API) ----

export const CanvasRevealEffect = ({
  animationSpeed = 10,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
  reverse = false,
}: {
  animationSpeed?: number
  opacities?: number[]
  colors?: number[][]
  containerClassName?: string
  dotSize?: number
  showGradient?: boolean
  reverse?: boolean
}) => {
  return (
    <div className={cn('h-full relative w-full', containerClassName)}>
      <div className="h-full w-full">
        <DotMatrix
          colors={colors ?? [[0, 255, 255]]}
          dotSize={dotSize ?? 3}
          opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
          reverse={reverse}
          animationSpeed={animationSpeed}
        />
      </div>
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      )}
    </div>
  )
}
