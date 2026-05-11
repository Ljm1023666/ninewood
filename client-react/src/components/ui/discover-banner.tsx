import { useRef, useEffect, useState, useCallback } from 'react'
import { Search, Sparkles } from 'lucide-react'

// ---- WebGL Shader (compact) ----

const SHADER_SRC = `#version 300 es
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
  float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) { float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p); t=mix(t,d,a); d=a; p*=2./(i+1.); }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN, st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.25,bg*.137,bg*.05),d);
  }
  O=vec4(col,1);
}`

const VERT_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

const VERTS = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1])

function useShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2')
    if (!gl) return

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio)

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }

    // compile shaders
    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      return s
    }

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, SHADER_SRC)
    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, VERTS, gl.STATIC_DRAW)
    const pos = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(pos)
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'resolution')
    const uTime = gl.getUniformLocation(program, 'time')

    resize()
    window.addEventListener('resize', resize)

    function loop(now: number) {
      gl!.clearColor(0, 0, 0, 1)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.useProgram(program)
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer)
      gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.uniform1f(uTime, now * 1e-3)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return canvasRef
}

// ---- Discover Banner ----

export default function DiscoverBanner({ onSearch, className = '' }: { onSearch?: (keyword: string) => void; className?: string }) {
  const canvasRef = useShaderCanvas()
  const [searchText, setSearchText] = useState('')

  const handleSubmit = useCallback(() => {
    const kw = searchText.trim()
    if (!kw) return
    onSearch?.(kw)
  }, [searchText, onSearch])

  return (
    <div className={`relative w-full h-[320px] md:h-[460px] overflow-hidden rounded-2xl bg-black ${className}`}>
      {/* Animations */}
      <style>{`
        @keyframes db-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes db-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(251,146,60,0.15); }
          50%      { box-shadow: 0 0 40px rgba(251,146,60,0.35); }
        }
        .db-fade-up { animation: db-fade-up 0.7s ease-out forwards; opacity: 0; }
        .db-delay-1 { animation-delay: 0.15s; }
        .db-delay-2 { animation-delay: 0.35s; }
        .db-delay-3 { animation-delay: 0.55s; }
      `}</style>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-4">
        {/* Brand tag */}
        <div className="db-fade-up db-delay-1 mb-4">
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500/10 backdrop-blur-md border border-orange-300/25 rounded-full">
            <Sparkles size={13} className="text-orange-300" />
            <span className="text-xs font-medium text-orange-100 tracking-wide">连接身边的高手 · 解决你的需求</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="db-fade-up db-delay-2 text-4xl md:text-5xl lg:text-6xl font-black tracking-tight mb-3"
          style={{ background: 'linear-gradient(135deg, #fb923c 0%, #facc15 40%, #fdba74 70%, #fbbf24 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          发现好服务
        </h1>

        <p className="db-fade-up db-delay-3 text-sm md:text-base text-orange-50/70 max-w-md text-center leading-relaxed mb-6">
          技术开发 · 设计 · 维修 · 家政 · 教育 · 咨询
        </p>

        {/* Search input */}
        <div className="db-fade-up db-delay-3 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 focus-within:border-orange-300/40 focus-within:bg-white/15 rounded-xl px-4 py-2.5 transition-colors w-full max-w-sm">
          <Search size={16} className="text-orange-200/60 flex-shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="搜索你需要的服务..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-white/40 min-w-0"
          />
        </div>
      </div>
    </div>
  )
}
