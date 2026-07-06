import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'
import { LegalDialog } from '@/components/ui/terms-conditions'
import { captchaApi } from '@/api/captcha'
import { BackgroundBeams } from '@/components/ui/background-beams'

const SMS_LENGTH = 6

// ---- AnimatedNavLink ----

function AnimatedNavLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="group relative inline-block overflow-hidden h-5 flex items-center text-sm"
    >
      <div className="flex flex-col transition-transform duration-400 ease-out transform group-hover:-translate-y-1/2">
        <span className="text-gray-300">{children}</span>
        <span className="text-white">{children}</span>
      </div>
    </Link>
  )
}

// ---- MiniNavbar ----

function MiniNavbar({
  isLogin,
  onToggleMode,
}: {
  isLogin: boolean
  onToggleMode: (v: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full')
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleMenu = () => setIsOpen(!isOpen)

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current)
    if (isOpen) {
      setHeaderShapeClass('rounded-xl')
    } else {
      shapeTimeoutRef.current = setTimeout(
        () => setHeaderShapeClass('rounded-full'),
        300,
      )
    }
    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current)
    }
  }, [isOpen])

  const logoElement = (
    <div className="relative w-5 h-5 flex items-center justify-center">
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 top-0 left-1/2 transform -translate-x-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 left-0 top-1/2 transform -translate-y-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 right-0 top-1/2 transform -translate-y-1/2 opacity-80" />
      <span className="absolute w-1.5 h-1.5 rounded-full bg-gray-200 bottom-0 left-1/2 transform -translate-x-1/2 opacity-80" />
    </div>
  )

  const navLinksData = [
    { label: '首页', to: '/' },
    { label: '发现', to: '/' },
    { label: '圈子', to: '/circles' },
  ]

  const loginButtonElement = (
    <button
      onClick={() => onToggleMode(true)}
      className={cn(
        'px-4 py-2 sm:px-3 text-sm sm:text-sm rounded-md transition-all duration-200 w-full sm:w-auto',
        isLogin
          ? 'font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300'
          : 'border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white',
      )}
    >
      登录
    </button>
  )

  const signupButtonElement = (
    <button
      onClick={() => onToggleMode(false)}
      className={cn(
        'px-4 py-2 sm:px-3 text-sm sm:text-sm rounded-md transition-all duration-200 w-full sm:w-auto',
        !isLogin
          ? 'font-semibold text-black bg-gradient-to-br from-gray-100 to-gray-300'
          : 'border border-[#333] bg-[rgba(31,31,31,0.62)] text-gray-300 hover:border-white/50 hover:text-white',
      )}
    >
      注册
    </button>
  )

  return (
    <header
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center pl-6 pr-6 py-3 backdrop-blur-sm ${headerShapeClass} border border-[#333] bg-[#1f1f1f57] w-[calc(100%-2rem)] sm:w-auto transition-[border-radius] duration-0 ease-in-out`}
    >
      <div className="flex items-center justify-between w-full gap-x-6 sm:gap-x-8">
        <div className="flex items-center">{logoElement}</div>

        <nav className="hidden sm:flex items-center space-x-4 sm:space-x-6 text-sm">
          {navLinksData.map((link) => (
            <AnimatedNavLink key={link.to} to={link.to}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {isLogin ? (
            <>
              {loginButtonElement}
              <div className="relative group">
                <div className="absolute inset-0 -m-2 rounded-md hidden sm:block bg-gray-100 opacity-40 filter blur-lg pointer-events-none transition-all duration-300 ease-out group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3" />
                {signupButtonElement}
              </div>
            </>
          ) : (
            <>
              <div className="relative group">
                <div className="absolute inset-0 -m-2 rounded-md hidden sm:block bg-gray-100 opacity-40 filter blur-lg pointer-events-none transition-all duration-300 ease-out group-hover:opacity-60 group-hover:blur-xl group-hover:-m-3" />
                {loginButtonElement}
              </div>
              {signupButtonElement}
            </>
          )}
        </div>

        <button
          className="sm:hidden flex items-center justify-center w-8 h-8 text-gray-300 focus:outline-none"
          onClick={toggleMenu}
          aria-label={isOpen ? '关闭菜单' : '打开菜单'}
        >
          {isOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`sm:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden ${isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none'}`}
      >
        <nav className="flex flex-col items-center space-y-4 text-base w-full">
          {navLinksData.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-gray-300 hover:text-white transition-colors w-full text-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center space-y-4 mt-4 w-full">
          {loginButtonElement}
          {signupButtonElement}
        </div>
      </div>
    </header>
  )
}

// ---- 法律条文 ----

const termsSections = [
  {
    title: '服务说明',
    content:
      '九木平台（以下简称"本平台"）是一个连接服务需求方与服务提供方的中介平台。用户可在本平台发布需求、接单、完成交易。',
  },
  {
    title: '用户账户',
    content:
      '用户注册时需提供真实有效的手机号码。每个手机号码仅限注册一个账户。用户应妥善保管账户密码，因账户密码泄露导致的损失由用户自行承担。',
  },
  {
    title: '平台规则',
    content: [
      '禁止发布违法违规内容',
      '禁止恶意刷单、虚假交易',
      '禁止在平台外私下交易',
      '禁止骚扰、辱骂其他用户',
      '禁止使用外挂、自动化脚本操作平台',
    ],
  },
  {
    title: '交易规则',
    content:
      '本平台采用担保交易模式。需求方发布需求后，服务方申请接单。双方确认后进入执行阶段。完成验收后资金解冻给服务方。如发生争议，平台有权介入协调。',
  },
  {
    title: '费用与税收',
    content:
      '平台可能对成功交易收取服务费，具体费率以平台公示为准。用户应自行承担因使用平台服务产生的税费。',
  },
  {
    title: '免责声明',
    content:
      '本平台仅作为信息中介，不对用户之间的交易结果承担责任。用户应自行判断交易风险。',
  },
  {
    title: '条款变更',
    content: '本平台有权随时修改服务条款，修改后的条款一经发布即生效。',
  },
  { title: '法律适用', content: '本条款适用中华人民共和国法律。' },
]

/**
 * 计算周岁
 */
function birthdayAge(birthday: string): number {
  if (!birthday) return 0
  const d = new Date(birthday)
  if (isNaN(d.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age
}

/**
 * AI 服务协议（内测版 v0.1）
 * 依据：《生成式 AI 服务管理暂行办法》§9-§15
 */
const aiServiceSections = [
  {
    title: '服务说明',
    content:
      '本平台提供由人工智能生成的文本回复与建议服务（以下称"AI 服务"），AI 服务处于内测阶段，可能产生错误、遗漏或不准确的内容，回复内容仅供参考，不构成任何专业建议。',
  },
  {
    title: 'AI 生成内容标识',
    content:
      '依据《生成式人工智能服务管理暂行办法》第十二条，本平台对所有 AI 生成的文本内容在显著位置进行标识。请勿移除、遮挡或以其他方式妨碍该标识。',
  },
  {
    title: '未成年人使用',
    content:
      '本平台不面向未满 14 周岁的未成年人。14 至 18 周岁用户须在监护人同意下使用。',
  },
  {
    title: '禁止行为',
    content:
      '严禁将 AI 服务用于违法违规用途，包括但不限于生成违反法律法规、危害国家安全、破坏民族团结、宣扬恐怖主义、传播淫秽色情的内容。',
  },
  {
    title: '内容审核',
    content:
      '本平台已部署内容安全过滤措施，对 AI 输出内容进行自动审核。如发现违规内容，请通过"举报"入口或客服邮箱反馈。',
  },
  {
    title: '投诉举报',
    content:
      '您可通过设置页-举报中心、12377 网络违法举报平台（https://www.12377.cn）、12321 网络不良信息举报平台（https://www.12321.cn）进行投诉举报。',
  },
  {
    title: '数据使用',
    content:
      '内测期间，您的对话内容仅用于提供 AI 回复与平台功能改进，不会用于训练任何对外发布的模型。您可在设置中随时清除对话历史。',
  },
  {
    title: '免责声明',
    content:
      'AI 服务按"现状"提供，平台不对 AI 回复的准确性、完整性、可用性作出任何明示或暗示的保证。',
  },
]

/**
 * 内测知情同意书（v0.1）
 */
const betaSections = [
  {
    title: '内测性质',
    content:
      '本平台当前为内测版本（Beta），仅向受邀用户提供功能预览与体验。所有功能、数据、点数均为模拟，不构成真实交易、捐赠、奖励或有价承诺。',
  },
  {
    title: '数据保留与清空',
    content:
      '内测期间的个人数据将在公测/商业化前按合规要求清理或迁移。您可通过设置页随时导出或删除个人数据。',
  },
  {
    title: '功能变更',
    content:
      '内测期间平台可能随时调整、新增或下线功能，不另行单独通知。',
  },
  {
    title: '免责',
    content:
      '本平台在内测期间不对功能可用性、数据持久性、服务连续性作出任何承诺。因内测造成的任何不便，敬请理解。',
  },
  {
    title: '反馈',
    content:
      '欢迎通过设置页"意见反馈"入口提交 Bug 与建议。',
  },
]

const privacySections = [
  {
    title: '信息收集',
    content:
      '我们收集您在使用九木平台时主动提供的个人信息，包括但不限于：手机号码、昵称、头像、个人简介。',
  },
  {
    title: '信息使用',
    content:
      '您的个人信息用于创建和维护账户、处理和完成交易、改善平台服务、发送服务相关通知。',
  },
  {
    title: '信息保护',
    content:
      '我们采取行业标准的安全措施保护您的个人信息，包括加密传输、访问控制、定期安全审计等。',
  },
  {
    title: '信息共享',
    content:
      '我们不会将您的个人信息出售给第三方。法律要求或获得明确同意时除外。',
  },
  {
    title: '用户权利',
    content:
      '您有权查看、修改、删除您的个人信息；注销您的账户；撤回同意。您可以在设置页面中进行上述操作。',
  },
  {
    title: '联系我们',
    content: '如有隐私相关的疑问或投诉，请通过平台内消息系统联系客服。',
  },
]

// ---- hCaptcha 组件 ----

function HCaptchaWidget({
  siteKey,
  onVerify,
  onError,
}: {
  siteKey: string
  onVerify: (token: string) => void
  onError: (err: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    // 动态加载 hCaptcha 脚本
    const existing = document.querySelector('script[src*="hcaptcha"]')
    const loadWidget = () => {
      if (!containerRef.current || !(window as any).hcaptcha) return
      try {
        widgetIdRef.current = (window as any).hcaptcha.render(
          containerRef.current,
          {
            sitekey: siteKey,
            size: 'normal',
            theme: 'dark',
            callback: onVerify,
            'error-callback': () => onError('验证失败，请重试'),
          },
        )
      } catch {
        onError('验证组件加载失败')
      }
    }

    if (existing) {
      if ((window as any).hcaptcha) {
        loadWidget()
      } else {
        existing.addEventListener('load', loadWidget)
      }
      return () => {
        if (widgetIdRef.current) {
          try {
            ;(window as any).hcaptcha?.remove(widgetIdRef.current)
          } catch {
            /* ignore */
          }
        }
      }
    }

    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = true
    script.onload = loadWidget
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current) {
        try {
          ;(window as any).hcaptcha?.remove(widgetIdRef.current)
        } catch {
          /* ignore */
        }
      }
    }
  }, [siteKey, onVerify, onError])

  return (
    <div ref={containerRef} className="flex justify-center min-h-[120px]" />
  )
}

// ---- 验证码输入组件 ----

function CodeInput({
  length,
  code,
  onChange,
  onKeyDown,
  disabled,
}: {
  length: number
  code: string[]
  onChange: (index: number, value: string) => void
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void
  disabled: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setTimeout(() => refs.current[0]?.focus(), 400)
  }, [])

  return (
    <div className="relative rounded-full py-4 px-5 border border-white/10 bg-transparent">
      <div className="flex items-center justify-center">
        {code.map((digit, i) => (
          <div key={i} className="flex items-center">
            <div className="relative">
              <input
                ref={(el) => {
                  refs.current[i] = el
                }}
                data-sms-index={i}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={disabled}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="w-8 text-center text-xl bg-transparent text-white border-none focus:outline-none focus:ring-0 appearance-none disabled:opacity-50"
                style={{ caretColor: 'transparent' }}
              />
              {!digit && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                  <span className="text-xl text-white/20">0</span>
                </div>
              )}
            </div>
            {i < length - 1 && <span className="text-white/20 text-xl">|</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- SignInPage ----

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useUserStore((s) => s.setAuth)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState<'phone' | 'captcha' | 'sms' | 'success'>(
    'phone',
  )
  const [smsDigits, setSmsDigits] = useState(
    Array(SMS_LENGTH).fill('') as string[],
  )
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 人机验证 (hCaptcha)
  const [captchaSiteKey, setCaptchaSiteKey] = useState('')
  const [captchaError, setCaptchaError] = useState('')

  // 隐私政策
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  // 合规：AI 服务协议 + 内测知情同意 + 出生日期 + 监护人同意
  const [aiServiceAccepted, setAiServiceAccepted] = useState(false)
  const [betaAccepted, setBetaAccepted] = useState(false)
  const [birthday, setBirthday] = useState('')
  const [guardianConsent, setGuardianConsent] = useState(false)
  // 合规：敏感信息（手机号/位置/IP）单独同意（PIPL §29）
  const [sensitiveConsent, setSensitiveConsent] = useState(false)

  // 预加载 hCaptcha 脚本（避免到验证步骤才加载）
  useEffect(() => {
    if (document.querySelector('script[src*="hcaptcha"]')) return
    const script = document.createElement('script')
    script.src = 'https://js.hcaptcha.com/1/api.js'
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  // hCaptcha 验证回调 → 发送短信
  const handleHCaptchaVerify = useCallback(
    async (token: string) => {
      setCaptchaError('')
      setIsLoading(true)
      try {
        const result = await captchaApi.verify(token)
        if (!result.success) {
          setCaptchaError(result.message || '验证失败')
          return
        }
        await authApi.sendCode(phone, token)
        setStep('sms')
        setCountdown(60)
      } catch (e: any) {
        const msg =
          e?.response?.data?.message || e?.message || '操作失败，请重试'
        setCaptchaError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [phone],
  )

  // ── 进入人机验证步骤 ──
  const handleFetchCaptcha = useCallback(async () => {
    setError('')
    setCaptchaError('')
    setIsLoading(true)
    try {
      // 开发环境：跳过 hCaptcha 人机验证界面
      if (import.meta.env.DEV) {
        await handleHCaptchaVerify(`dev-bypass-${Date.now()}`)
        return
      }
      const siteKey = await captchaApi.getSiteKey()
      if (!siteKey) throw new Error('hCaptcha 未配置')
      setCaptchaSiteKey(siteKey)
      setStep('captcha')
    } catch {
      setError('人机验证未配置，请联系管理员')
    } finally {
      setIsLoading(false)
    }
  }, [handleHCaptchaVerify])

  // ── 手机号提交 → 获取人机验证 ──
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 11) return
    await handleFetchCaptcha()
  }

  // ── 重新发送短信 ──
  const handleResendSms = async () => {
    if (countdown > 0) return
    await handleFetchCaptcha()
  }

  // ── 密码登录 → 人机验证 → API ──
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 11 || !password) return
    setError('')
    setIsLoading(true)
    try {
      const res = await authApi.login(phone, password)
      setAuth({ user: res.data.data.user, token: res.data.data.token })
      setTimeout(() => setStep('success'), 2000)
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined
      setError(msg || '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  // ── 短信验证码输入处理 ──
  const handleSmsChange = async (index: number, value: string) => {
    if (value.length > 1) return
    const newDigits = [...smsDigits]
    newDigits[index] = value
    setSmsDigits(newDigits)

    if (value && index < SMS_LENGTH - 1) {
      // focus next
      const nextEl = document.querySelector<HTMLInputElement>(
        `[data-sms-index="${index + 1}"]`,
      )
      nextEl?.focus()
    }

    if (index === SMS_LENGTH - 1 && value) {
      const fullCode = newDigits.join('')
      if (newDigits.every((d) => d !== '')) {
        setError('')
        setIsLoading(true)
        try {
          const res = await authApi.register(phone, fullCode, {
            birthday,
            guardianConsent,
          })
          setAuth({ user: res.data.data.user, token: res.data.data.token })
          setTimeout(() => setStep('success'), 2000)
        } catch (e: unknown) {
          const msg =
            e && typeof e === 'object' && 'response' in e
              ? (e as { response?: { data?: { message?: string } } }).response
                  ?.data?.message
              : undefined
          setError(msg || '验证失败')
          setSmsDigits(Array(SMS_LENGTH).fill(''))
        } finally {
          setIsLoading(false)
        }
      }
    }
  }

  const handleSmsKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !smsDigits[index] && index > 0) {
      const prevEl = document.querySelector<HTMLInputElement>(
        `[data-sms-index="${index - 1}"]`,
      )
      prevEl?.focus()
    }
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setSmsDigits(Array(SMS_LENGTH).fill(''))
    setError('')
    setCaptchaError('')
    setCaptchaMode('register')
    setPrivacyAccepted(false)
  }

  const isDev = (import.meta as any).env?.DEV

  return (
    <div
      className={cn('flex w-[100%] flex-col min-h-screen bg-black relative')}
    >
      {isDev && (
        <div className="relative z-30 w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-1 text-center text-[10px] font-mono uppercase tracking-widest text-amber-300">
          dev · 验证码跳过 hCaptcha，请查看后端控制台
        </div>
      )}
      {/* 背景层 */}
      <div className="absolute inset-0 z-0">
        <BackgroundBeams className="[mask-image:radial-gradient(ellipse_at_center,white_50%,transparent_85%)]!" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.4)_0%,_transparent_80%)]" />
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-gradient-to-b from-black/80 to-transparent" />
      </div>

      {/* 内容层 */}
      <div className="relative z-10 flex flex-col flex-1">
        <MiniNavbar
          isLogin={isLogin}
          onToggleMode={(v) => {
            setIsLogin(v)
            setError('')
            setPrivacyAccepted(false)
            if (step !== 'phone') {
              setStep('phone')
              setSmsDigits(Array(SMS_LENGTH).fill(''))
              setCaptchaSelected([])
            }
          }}
        />

        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full mt-[120px] max-w-sm">
              <AnimatePresence mode="wait">
                {/* ── Step 1: 手机号 ── */}
                {step === 'phone' && (
                  <motion.div
                    key="phone-step"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                        {isLogin ? '欢迎回来' : '加入九木'}
                      </h1>
                      <p className="text-[1.8rem] text-white/70 font-light">
                        {isLogin ? '使用密码登录' : '验证手机号以注册'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <button
                        type="button"
                        disabled
                        title="Google 登录即将推出\uff0c请使用手机号登录"
                        className="backdrop-blur-[2px] w-full flex items-center justify-center gap-2 bg-white/[0.02] text-white/30 border border-white/5 rounded-full py-3 px-4 cursor-not-allowed"
                      >
                        <span className="text-lg">G</span>
                        <span>Google 登录\uff08即将推出\uff09</span>
                      </button>

                      <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-white/40 text-sm">or</span>
                        <div className="h-px bg-white/10 flex-1" />
                      </div>

                      {isLogin ? (
                        /* 登录表单 */
                        <form
                          onSubmit={handlePasswordLogin}
                          className="space-y-3"
                        >
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="手机号"
                            value={phone}
                            maxLength={11}
                            onChange={(e) =>
                              setPhone(e.target.value.replace(/\D/g, ''))
                            }
                            className="w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border focus:border-white/30 text-center"
                            required
                          />
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="密码"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border focus:border-white/30 text-center"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors w-9 h-9 flex items-center justify-center cursor-pointer"
                            >
                              {showPassword ? (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>

                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400/80"
                            >
                              {error}
                            </motion.p>
                          )}

                          <button
                            type="submit"
                            disabled={
                              !phone ||
                              phone.length < 11 ||
                              !password ||
                              isLoading
                            }
                            className={cn(
                              'w-full rounded-full text-sm font-semibold py-3 transition-all duration-300',
                              phone.length === 11 && password && !isLoading
                                ? 'bg-white text-black hover:bg-white/90 cursor-pointer'
                                : 'bg-white/5 text-white/30 cursor-not-allowed',
                            )}
                          >
                            {isLoading ? '登录中...' : '登录'}
                          </button>

                          <p className="text-sm text-white/30 pt-2">
                            没有账号？
                            <button
                              type="button"
                              onClick={() => {
                                setIsLogin(false)
                                setError('')
                              }}
                              className="text-white/50 hover:text-white/70 underline ml-1 transition-colors cursor-pointer"
                            >
                              手机号注册
                            </button>
                          </p>
                        </form>
                      ) : (
                        /* 注册 → 手机号输入 */
                        <>
                          <form
                            onSubmit={handlePhoneSubmit}
                            className="space-y-3"
                          >
                            <div className="relative">
                              <input
                                type="tel"
                                inputMode="numeric"
                                placeholder="手机号"
                                value={phone}
                                maxLength={11}
                                onChange={(e) =>
                                  setPhone(e.target.value.replace(/\D/g, ''))
                                }
                                className="w-full backdrop-blur-[1px] text-white border border-white/10 rounded-full py-3 px-4 focus:outline-none focus:border focus:border-white/30 text-center"
                                required
                              />
                              <button
                                type="submit"
                                disabled={
                                  phone.length < 11 ||
                                  isLoading ||
                                  !privacyAccepted ||
                                  !aiServiceAccepted ||
                                  !betaAccepted ||
                                  !sensitiveConsent ||
                                  !birthday
                                }
                                className={cn(
                                  'absolute right-1.5 top-1/2 -translate-y-1/2 text-white w-9 h-9 flex items-center justify-center rounded-full transition-colors group overflow-hidden',
                                  phone.length === 11 && privacyAccepted
                                    ? 'bg-white/10 hover:bg-white/20 cursor-pointer'
                                    : 'bg-white/5 cursor-not-allowed',
                                )}
                              >
                                <span className="relative w-full h-full block overflow-hidden">
                                  <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">
                                    →
                                  </span>
                                  <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 -translate-x-full group-hover:translate-x-0">
                                    →
                                  </span>
                                </span>
                              </button>
                            </div>

                            {/* 合规 PIPL §29：敏感信息（手机号/位置/IP）单独同意 — 独立于主协议 */}
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                              <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={sensitiveConsent}
                                  onChange={(e) =>
                                    setSensitiveConsent(e.target.checked)
                                  }
                                  className="mt-0.5 w-4 h-4 rounded accent-amber-400 cursor-pointer shrink-0"
                                />
                                <span className="text-[11px] leading-relaxed text-amber-100/80">
                                  <span className="font-semibold text-amber-200">敏感个人信息单独同意（必填）</span>
                                  ：我同意平台为完成注册与基础服务目的，单独收集并处理我的：
                                  <br />
                                  · 手机号码（用于账号标识与登录验证）
                                  <br />
                                  · 出生日期（用于年龄合规校验）
                                  <br />
                                  · 网络 IP 与大致属地（用于安全风控，不含精确定位）
                                  <br />
                                  · 在使用位置相关功能时另行采集的地理位置
                                  <br />
                                  <span className="text-amber-200/60">
                                    此项独立于上方"服务条款/隐私政策"勾选；可随时在设置中撤回，撤回将影响相关功能使用。
                                  </span>
                                </span>
                              </label>
                            </div>

                            {/* 隐私政策接受 */}
                            <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={privacyAccepted}
                                onChange={(e) =>
                                  setPrivacyAccepted(e.target.checked)
                                }
                                className="w-4 h-4 rounded accent-white cursor-pointer"
                              />
                              <span className="text-xs text-white/40">
                                我已阅读并同意{' '}
                                <LegalDialog
                                  trigger={
                                    <span className="underline hover:text-white/60 cursor-pointer">
                                      服务条款
                                    </span>
                                  }
                                  title="服务条款"
                                  sections={termsSections}
                                />{' '}
                                和{' '}
                                <LegalDialog
                                  trigger={
                                    <span className="underline hover:text-white/60 cursor-pointer">
                                      隐私政策
                                    </span>
                                  }
                                  title="隐私政策"
                                  sections={privacySections}
                                />
                              </span>
                            </label>

                            {/* 合规：AI 服务协议 */}
                            <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={aiServiceAccepted}
                                onChange={(e) =>
                                  setAiServiceAccepted(e.target.checked)
                                }
                                className="w-4 h-4 rounded accent-white cursor-pointer"
                              />
                              <span className="text-xs text-white/40">
                                我已阅读并同意{' '}
                                <LegalDialog
                                  trigger={
                                    <span className="underline hover:text-white/60 cursor-pointer">
                                      AI 服务协议
                                    </span>
                                  }
                                  title="AI 服务协议（内测版 v0.1）"
                                  sections={aiServiceSections}
                                />
                              </span>
                            </label>

                            {/* 合规：内测知情同意 */}
                            <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={betaAccepted}
                                onChange={(e) =>
                                  setBetaAccepted(e.target.checked)
                                }
                                className="w-4 h-4 rounded accent-white cursor-pointer"
                              />
                              <span className="text-xs text-white/40">
                                我已阅读并同意{' '}
                                <LegalDialog
                                  trigger={
                                    <span className="underline hover:text-white/60 cursor-pointer">
                                      内测知情同意书
                                    </span>
                                  }
                                  title="内测知情同意书（v0.1）"
                                  sections={betaSections}
                                />
                              </span>
                            </label>

                            {/* 合规：出生日期采集（< 14 岁禁止注册） */}
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-xs text-white/40">
                                出生日期（必填，14 周岁以下无法注册）
                              </label>
                              <input
                                type="date"
                                value={birthday}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => {
                                  setBirthday(e.target.value)
                                  const age = birthdayAge(e.target.value)
                                  if (age >= 14 && age < 18) {
                                    setGuardianConsent(false)
                                  }
                                }}
                                className="w-full max-w-[220px] backdrop-blur-[1px] text-white border border-white/10 rounded-full py-2 px-4 focus:outline-none focus:border focus:border-white/30 text-center text-sm"
                                required
                              />
                            </div>

                            {/* 合规：14-18 岁监护人同意 */}
                            {birthdayAge(birthday) >= 14 && birthdayAge(birthday) < 18 ? (
                              <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={guardianConsent}
                                  onChange={(e) =>
                                    setGuardianConsent(e.target.checked)
                                  }
                                  className="w-4 h-4 rounded accent-white cursor-pointer"
                                />
                                <span className="text-xs text-white/40">
                                  本人已征得监护人同意使用本平台（必填）
                                </span>
                              </label>
                            ) : null}
                          </form>

                          {error && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-sm text-red-400/80"
                            >
                              {error}
                            </motion.p>
                          )}

                          <p className="text-sm text-white/30">
                            已有账号？
                            <button
                              type="button"
                              onClick={() => {
                                setIsLogin(true)
                                setError('')
                              }}
                              className="text-white/50 hover:text-white/70 underline ml-1 transition-colors cursor-pointer"
                            >
                              密码登录
                            </button>
                          </p>

                          <div className="text-sm text-white/40 pt-10">
                            注册即表示同意{' '}
                            <LegalDialog
                              trigger={
                                <span className="underline text-white/40 hover:text-white/60 cursor-pointer transition-colors text-sm">
                                  服务条款
                                </span>
                              }
                              title="服务条款"
                              sections={termsSections}
                            />{' '}
                            和{' '}
                            <LegalDialog
                              trigger={
                                <span className="underline text-white/40 hover:text-white/60 cursor-pointer transition-colors text-sm">
                                  隐私政策
                                </span>
                              }
                              title="隐私政策"
                              sections={privacySections}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: 人机验证 ── */}
                {step === 'captcha' && (
                  <motion.div
                    key="captcha-step"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                        人机验证
                      </h1>
                      <p className="text-[1.25rem] text-white/50 font-light">
                        完成下方验证
                      </p>
                    </div>

                    {captchaSiteKey && (
                      <HCaptchaWidget
                        siteKey={captchaSiteKey}
                        onVerify={handleHCaptchaVerify}
                        onError={(msg) => setCaptchaError(msg)}
                      />
                    )}

                    {isLoading && (
                      <p className="text-sm text-white/40">验证中，请稍候...</p>
                    )}

                    {captchaError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400/80"
                      >
                        {captchaError}
                      </motion.p>
                    )}

                    <div className="flex justify-center">
                      <motion.button
                        onClick={handleBackToPhone}
                        className="rounded-full bg-white text-black font-medium px-8 py-3 hover:bg-white/90 transition-colors cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        返回
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: 短信验证码 ── */}
                {step === 'sms' && (
                  <motion.div
                    key="sms-step"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                        输入验证码
                      </h1>
                      <p className="text-[1.25rem] text-white/50 font-light">
                        已发送至 {phone}
                      </p>
                    </div>

                    <CodeInput
                      length={SMS_LENGTH}
                      code={smsDigits}
                      onChange={handleSmsChange}
                      onKeyDown={handleSmsKeyDown}
                      disabled={isLoading}
                    />

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-400/80"
                      >
                        {error}
                      </motion.p>
                    )}

                    <div>
                      <motion.button
                        type="button"
                        className="text-white/50 hover:text-white/70 transition-colors cursor-pointer text-sm"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleResendSms}
                        disabled={isLoading || countdown > 0}
                      >
                        {countdown > 0 ? `${countdown}秒后重发` : '重新发送'}
                      </motion.button>
                    </div>

                    <div className="flex w-full gap-3">
                      <motion.button
                        onClick={handleBackToPhone}
                        className="rounded-full bg-white text-black font-medium px-8 py-3 hover:bg-white/90 transition-colors w-[30%] cursor-pointer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        返回
                      </motion.button>
                      <div className="flex-1" />
                    </div>

                    <div className="pt-10">
                      <div className="text-sm text-white/40">
                        注册即表示同意{' '}
                        <LegalDialog
                          trigger={
                            <span className="underline text-white/40 hover:text-white/60 cursor-pointer transition-colors text-sm">
                              服务条款
                            </span>
                          }
                          title="服务条款"
                          sections={termsSections}
                        />{' '}
                        和{' '}
                        <LegalDialog
                          trigger={
                            <span className="underline text-white/40 hover:text-white/60 cursor-pointer transition-colors text-sm">
                              隐私政策
                            </span>
                          }
                          title="隐私政策"
                          sections={privacySections}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 4: 成功 ── */}
                {step === 'success' && (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-white">
                        欢迎你！
                      </h1>
                      <p className="text-[1.25rem] text-white/50 font-light">
                        加入九木社区
                      </p>
                    </div>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="py-10"
                    >
                      <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/70 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-black"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </motion.div>
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      onClick={() => navigate('/', { replace: true })}
                      className="w-full rounded-full bg-white text-black font-medium py-3 hover:bg-white/90 transition-colors cursor-pointer"
                    >
                      进入首页
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
