import React, { useRef, useEffect } from 'react'

// ---- Types ----

interface HeroProps {
  trustBadge?: { text: string; icons?: string[] }
  headline: { line1: string; line2?: string }
  subtitle: string
  buttons?: {
    primary?: { text: string; onClick?: () => void }
    secondary?: { text: string; onClick?: () => void }
  }
  className?: string
}

// ---- WebGL Shader Background Hook ----

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a);
    d=a;
    p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`

const VERTEX_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

const VERTICES = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1])

class WebGLRenderer {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  program: WebGLProgram | null = null
  vs: WebGLShader | null = null
  fs: WebGLShader | null = null
  buffer: WebGLBuffer | null = null
  scale: number
  shaderSource: string
  move = [0, 0]
  mouse = [0, 0]
  pointers = [0, 0]
  pointerCount = 0

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas
    this.scale = scale
    this.gl = canvas.getContext('webgl2')!
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale)
    this.shaderSource = defaultShaderSource
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    }
  }

  test(source: string) {
    const gl = this.gl
    const s = gl.createShader(gl.FRAGMENT_SHADER)!
    gl.shaderSource(s, source)
    gl.compileShader(s)
    const ok = gl.getShaderParameter(s, gl.COMPILE_STATUS)
    const log = ok ? null : gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    return log
  }

  reset() {
    const gl = this.gl
    if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) { gl.detachShader(this.program, this.vs); gl.deleteShader(this.vs) }
      if (this.fs) { gl.detachShader(this.program, this.fs); gl.deleteShader(this.fs) }
      gl.deleteProgram(this.program)
    }
  }

  setup() {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)!
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!
    this.compile(this.vs, VERTEX_SRC)
    this.compile(this.fs, this.shaderSource)
    this.program = gl.createProgram()!
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program))
    }
  }

  init() {
    const gl = this.gl
    const p = this.program!
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, VERTICES, gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(p, 'position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)
    ;(p as any).resolution = gl.getUniformLocation(p, 'resolution')
    ;(p as any).time = gl.getUniformLocation(p, 'time')
    ;(p as any).move = gl.getUniformLocation(p, 'move')
    ;(p as any).touch = gl.getUniformLocation(p, 'touch')
    ;(p as any).pointerCount = gl.getUniformLocation(p, 'pointerCount')
    ;(p as any).pointers = gl.getUniformLocation(p, 'pointers')
  }

  updateScale(s: number) { this.scale = s; this.gl.viewport(0, 0, this.canvas.width * s, this.canvas.height * s) }

  render(now = 0) {
    const gl = this.gl
    const p = this.program
    if (!p || gl.getProgramParameter(p, gl.DELETE_STATUS)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(p)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.uniform2f((p as any).resolution, this.canvas.width, this.canvas.height)
    gl.uniform1f((p as any).time, now * 1e-3)
    gl.uniform2f((p as any).move, ...this.move)
    gl.uniform2f((p as any).touch, ...this.mouse)
    gl.uniform1i((p as any).pointerCount, this.pointerCount)
    gl.uniform2fv((p as any).pointers, this.pointers)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

class PointerHandler {
  scale: number
  active = false
  pointers = new Map<number, number[]>()
  lastCoords = [0, 0]
  moves = [0, 0]

  constructor(el: HTMLCanvasElement, scale: number) {
    this.scale = scale
    const map = (x: number, y: number) => [x * scale, el.height - y * scale]

    el.addEventListener('pointerdown', (e) => {
      this.active = true
      this.pointers.set(e.pointerId, map(e.clientX, e.clientY))
    })
    el.addEventListener('pointerup', (e) => {
      if (this.count === 1) this.lastCoords = this.first
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
    })
    el.addEventListener('pointerleave', (e) => {
      if (this.count === 1) this.lastCoords = this.first
      this.pointers.delete(e.pointerId)
      this.active = this.pointers.size > 0
    })
    el.addEventListener('pointermove', (e) => {
      if (!this.active) return
      this.lastCoords = [e.clientX, e.clientY]
      this.pointers.set(e.pointerId, map(e.clientX, e.clientY))
      this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY]
    })
  }

  get count() { return this.pointers.size }
  get coords() { return this.pointers.size > 0 ? Array.from(this.pointers.values()).flat() : [0, 0] }
  get first() { return this.pointers.values().next().value || this.lastCoords }
}

function useShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const pointersRef = useRef<PointerHandler | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)
    const renderer = new WebGLRenderer(canvas, dpr)
    const pointers = new PointerHandler(canvas, dpr)
    rendererRef.current = renderer
    pointersRef.current = pointers

    const resize = () => {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      renderer.updateScale(dpr)
    }

    renderer.setup()
    renderer.init()
    resize()

    if (renderer.test(defaultShaderSource) === null) {
      // shader compiles clean
    }

    const loop = (now: number) => {
      renderer.mouse = pointers.first as [number, number]
      renderer.pointerCount = pointers.count
      renderer.pointers = pointers.coords
      renderer.move = pointers.moves as [number, number]
      renderer.render(now)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
      renderer.reset()
    }
  }, [])

  return canvasRef
}

// ---- Icon color lookup (static to work with Tailwind JIT) ----

const iconColors = ['text-yellow-300', 'text-orange-300', 'text-amber-300']

// ---- Hero Component ----

const Hero: React.FC<HeroProps> = ({ trustBadge, headline, subtitle, buttons, className = '' }) => {
  const canvasRef = useShaderBackground()

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-black ${className}`}>
      {/* Animations — React 19 supports <style> in JSX */}
      <style>{`
        @keyframes hero-fade-in-down {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes hero-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-anim-down {
          animation: hero-fade-in-down 0.8s ease-out forwards;
        }
        .hero-anim-up {
          animation: hero-fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }
        .hero-delay-200 { animation-delay: 0.2s; }
        .hero-delay-400 { animation-delay: 0.4s; }
        .hero-delay-600 { animation-delay: 0.6s; }
        .hero-delay-800 { animation-delay: 0.8s; }
        .hero-gradient-bg {
          background-size: 200% 200%;
          animation: hero-gradient-shift 3s ease infinite;
        }
      `}</style>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-contain touch-none"
        style={{ background: 'black' }}
      />

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white">
        {trustBadge && (
          <div className="mb-8 hero-anim-down">
            <div className="flex items-center gap-2 px-6 py-3 bg-orange-500/10 backdrop-blur-md border border-orange-300/30 rounded-full text-sm">
              {trustBadge.icons && (
                <div className="flex">
                  {trustBadge.icons.map((icon, i) => (
                    <span key={i} className={iconColors[i % 3]}>{icon}</span>
                  ))}
                </div>
              )}
              <span className="text-orange-100">{trustBadge.text}</span>
            </div>
          </div>
        )}

        <div className="text-center space-y-6 max-w-5xl mx-auto px-4">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-orange-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent hero-anim-up hero-delay-200">
              {headline.line1}
            </h1>
            {headline.line2 && (
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-transparent hero-anim-up hero-delay-400">
                {headline.line2}
              </h1>
            )}
          </div>

          <div className="max-w-3xl mx-auto hero-anim-up hero-delay-600">
            <p className="text-lg md:text-xl lg:text-2xl text-orange-100/90 font-light leading-relaxed">
              {subtitle}
            </p>
          </div>

          {buttons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10 hero-anim-up hero-delay-800">
              {buttons.primary && (
                <button
                  onClick={buttons.primary.onClick}
                  className="px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25"
                >
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button
                  onClick={buttons.secondary.onClick}
                  className="px-8 py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-300/30 hover:border-orange-300/50 text-orange-100 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                >
                  {buttons.secondary.text}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Hero
