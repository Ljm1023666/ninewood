import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'
import { LegalDialog } from '@/components/ui/terms-conditions'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { captchaApi } from '@/api/captcha'
import {
  SignInFlowBackground,
  SignInFlowNavbar,
} from '@/components/ui/sign-in-flow-1'
import '@/components/ui/sign-in-flow.css'
import '@/components/ui/sign-in-flow-macos.css'

const SMS_LENGTH = 6

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

const personalInfoCollectSections = [
  {
    title: '敏感个人信息单独同意',
    content: [
      '手机号码：用于账号标识与登录验证',
      '出生年份：用于年龄合规校验（未满 14 周岁无法注册）',
      '网络 IP 与大致属地：用于安全风控，不含精确定位',
      '在使用位置相关功能时另行采集的地理位置',
      '您可随时在设置中撤回同意；撤回将影响相关功能使用。',
    ],
  },
  ...aiServiceSections,
  ...betaSections,
]

const BIRTH_YEAR_MIN = new Date().getFullYear() - 100
const BIRTH_YEAR_MAX = new Date().getFullYear() - 14

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
            theme: 'light',
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
    <div
      className="sign-in-flow-sms-code relative px-4 py-3.5"
      role="group"
      aria-labelledby="verification-code-label"
    >
      <span id="verification-code-label" className="sr-only">
        验证码
      </span>
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
                name={`verification-code-${i + 1}`}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={`验证码第 ${i + 1} 位`}
                spellCheck={false}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={disabled}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className="sign-in-flow-sms-digit w-9 text-center bg-transparent border-none appearance-none disabled:opacity-50"
                style={{ caretColor: 'transparent' }}
              />
              {!digit && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                  <span className="sign-in-flow-sms-digit opacity-20">0</span>
                </div>
              )}
            </div>
            {i < length - 1 && <span className="sign-in-flow-sms-digit opacity-20">|</span>}
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
  const [accountId, setAccountId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [loginChannel, setLoginChannel] = useState<'id' | 'phone' | 'email'>(
    'phone',
  )
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
  const [birthYear, setBirthYear] = useState('')
  const [guardianConsent, setGuardianConsent] = useState(false)
  // 合规：敏感信息（手机号/位置/IP）单独同意（PIPL §29）
  const [sensitiveConsent, setSensitiveConsent] = useState(false)
  const [codeDelivery, setCodeDelivery] = useState<
    'phone-register' | 'email-login'
  >('phone-register')
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true)
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false)

  // 表单提交按钮已换成 LiquidMetalButton（非 type="submit"），
  // 用 ref + requestSubmit() 触发原有 onSubmit 校验流程，保留回车提交行为。
  const idLoginFormRef = useRef<HTMLFormElement>(null)
  const passwordLoginFormRef = useRef<HTMLFormElement>(null)
  const emailLoginFormRef = useRef<HTMLFormElement>(null)
  const registerPhoneFormRef = useRef<HTMLFormElement>(null)

  const playSuccessAnimation = useCallback(() => {
    setReverseCanvasVisible(true)
    setTimeout(() => setInitialCanvasVisible(false), 50)
    setTimeout(() => setStep('success'), 2000)
  }, [])

  const setAllLegalAccepted = (accepted: boolean) => {
    setPrivacyAccepted(accepted)
    setAiServiceAccepted(accepted)
    setBetaAccepted(accepted)
    setSensitiveConsent(accepted)
  }

  const allLegalAccepted =
    privacyAccepted &&
    aiServiceAccepted &&
    betaAccepted &&
    sensitiveConsent

  const registerAge = birthYear ? birthdayAge(`${birthYear}-01-01`) : 0
  const needsGuardianConsent =
    birthYear !== '' && registerAge >= 14 && registerAge < 18
  const canSubmitRegister =
    phone.length === 11 &&
    registerPassword.length >= 6 &&
    allLegalAccepted &&
    birthYear !== '' &&
    registerAge >= 14 &&
    (!needsGuardianConsent || guardianConsent) &&
    !isLoading

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

  // hCaptcha 验证回调 → 发送短信/邮箱验证码
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
        if (codeDelivery === 'email-login') {
          await authApi.sendEmailCode(email.trim().toLowerCase(), token)
        } else {
          await authApi.sendCode(phone, token)
        }
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
    [phone, email, codeDelivery],
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
    setCodeDelivery('phone-register')
    await handleFetchCaptcha()
  }

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setEmail(normalized)
    setError('')
    setCodeDelivery('email-login')
    await handleFetchCaptcha()
  }

  // ── 重新发送短信 ──
  const handleResendSms = async () => {
    if (countdown > 0) return
    await handleFetchCaptcha()
  }

  // ── ID 登录 ──
  const handleIdLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId.trim() || !password) return
    setError('')
    setIsLoading(true)
    try {
      const res = await authApi.loginById(accountId.trim(), password)
      setAuth({ user: res.data.data.user, token: res.data.data.token })
      playSuccessAnimation()
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

  // ── 密码登录 → API ──
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 11 || !password) return
    setError('')
    setIsLoading(true)
    try {
      const res = await authApi.login(phone, password)
      setAuth({ user: res.data.data.user, token: res.data.data.token })
      playSuccessAnimation()
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
          if (codeDelivery === 'email-login') {
            const res = await authApi.loginEmail(
              email.trim().toLowerCase(),
              fullCode,
              birthYear
                ? {
                    birthday: `${birthYear}-01-01`,
                    guardianConsent,
                  }
                : undefined,
            )
            setAuth({ user: res.data.data.user, token: res.data.data.token })
            playSuccessAnimation()
          } else {
            const res = await authApi.register(phone, fullCode, registerPassword, {
              birthday,
              guardianConsent,
            })
            setAuth({ user: res.data.data.user, token: res.data.data.token })
            playSuccessAnimation()
          }
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
    setPrivacyAccepted(false)
    setBirthYear('')
    setBirthday('')
    setCodeDelivery('phone-register')
  }

  return (
    <div
      className={cn(
        'sign-in-flow-root relative flex min-h-screen w-full flex-col',
      )}
    >
      <SignInFlowBackground
        initialVisible={initialCanvasVisible}
        reverseVisible={reverseCanvasVisible}
      />

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <SignInFlowNavbar
          isLogin={isLogin}
          onToggleMode={(v) => {
            setIsLogin(v)
            setError('')
            setPrivacyAccepted(false)
            setLoginChannel('phone')
            setBirthYear('')
            setBirthday('')
            if (step !== 'phone') {
              setStep('phone')
              setSmsDigits(Array(SMS_LENGTH).fill(''))
            }
          }}
        />

        <div className="flex flex-1 items-center">
          <div className="sign-in-flow-auth-layout">
            <aside className="sign-in-flow-brand-panel">
              <h1>让合作，自然发生。</h1>
              <p>
                九木帮助需求方与服务者在清晰、可靠的流程中建立连接。
              </p>
              <ul className="sign-in-flow-trust-list">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M7 3h8l3 3v15H7V3Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 10h5M10 14h5" strokeLinecap="round" />
                  </svg>
                  <div>
                    <strong>发布需求，明确合作目标</strong>
                    <span>用清晰的信息开始每一次委托。</span>
                  </div>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="8.5" />
                  </svg>
                  <div>
                    <strong>匹配服务，连接合适的人</strong>
                    <span>从需求到履约，所有进度都有迹可循。</span>
                  </div>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 3 5.5 6v5.2c0 4.2 2.7 7.8 6.5 9.1 3.8-1.3 6.5-4.9 6.5-9.1V6L12 3Z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m9.5 12 1.6 1.6 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <strong>担保履约，让交易过程可追溯</strong>
                    <span>关键状态、资金与沟通信息始终透明。</span>
                  </div>
                </li>
              </ul>
            </aside>
            <div className="sign-in-flow-auth-panel">
              <AnimatePresence mode="wait">
                {/* ── Step 1: 手机号 ── */}
                {step === 'phone' && (
                  <motion.div
                    key="phone-step"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={cn(isLogin ? '' : 'sign-in-flow-stack text-center')}
                  >
                    {isLogin ? (
                      <div className="sign-in-flow-register-card">
                        <div>
                          <h1 className="sign-in-flow-register-title">
                            欢迎回来
                          </h1>
                          <p className="sign-in-flow-register-subtitle">
                            {loginChannel === 'id'
                              ? '使用账号 ID 登录'
                              : loginChannel === 'email'
                                ? '使用 QQ 邮箱登录'
                                : '使用手机号登录'}
                          </p>
                        </div>

                        <div className="sign-in-flow-register-stack">
                          <div
                            className={cn(
                              'sign-in-flow-login-methods',
                              `is-${loginChannel}`,
                            )}
                            role="group"
                            aria-label="登录方式"
                          >
                            {[
                              ['id', '账号 ID'],
                              ['phone', '手机号'],
                              ['email', 'QQ 邮箱'],
                            ].map(([channel, label]) => (
                              <button
                                key={channel}
                                type="button"
                                onClick={() => {
                                  setLoginChannel(channel as typeof loginChannel)
                                  setError('')
                                }}
                                className={cn(
                                  'sign-in-flow-method-button',
                                  loginChannel === channel && 'is-active',
                                )}
                                aria-pressed={loginChannel === channel}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          {loginChannel === 'id' && (
                            <form
                              ref={idLoginFormRef}
                              onSubmit={handleIdLogin}
                              className="sign-in-flow-register-stack"
                            >
                              <label className="sr-only" htmlFor="login-account-id">
                                账号 ID
                              </label>
                              <div className="sign-in-flow-phone-input sign-in-flow-phone-input--solo">
                                <input
                                  id="login-account-id"
                                  name="username"
                                  type="text"
                                  autoComplete="username"
                                  spellCheck={false}
                                  placeholder="账号 ID（如 0、1、2）"
                                  value={accountId}
                                  onChange={(e) => setAccountId(e.target.value)}
                                  required
                                />
                              </div>
                              <label className="sr-only" htmlFor="login-account-password">
                                密码
                              </label>
                              <div className="sign-in-flow-auth-field-wrap">
                                <div className="sign-in-flow-phone-input sign-in-flow-phone-input--solo">
                                  <input
                                    id="login-account-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="sign-in-flow-icon-btn flex cursor-pointer items-center justify-center transition-colors"
                                >
                                  {showPassword ? '隐藏' : '显示'}
                                </button>
                              </div>
                              {error ? (
                                <p
                                  className="sign-in-flow-register-error"
                                  role="alert"
                                >
                                  {error}
                                </p>
                              ) : null}
                              <LiquidMetalButton
                                label={isLoading ? '登录中...' : '登录'}
                                fullWidth
                                height={52}
                                disabled={
                                  !accountId.trim() || !password || isLoading
                                }
                                onClick={() =>
                                  idLoginFormRef.current?.requestSubmit()
                                }
                              />
                              {/* 隐藏兜底 submit，保留输入框回车提交行为 */}
                              <button
                                type="submit"
                                className="sr-only"
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                            </form>
                          )}

                          {loginChannel === 'phone' && (
                            <form
                              ref={passwordLoginFormRef}
                              onSubmit={handlePasswordLogin}
                              className="sign-in-flow-register-stack"
                            >
                              <label className="sr-only" htmlFor="login-phone">
                                手机号
                              </label>
                              <div className="sign-in-flow-phone-input">
                                <span className="sign-in-flow-phone-prefix">
                                  +86
                                </span>
                                <input
                                  id="login-phone"
                                  name="tel"
                                  type="tel"
                                  autoComplete="tel"
                                  inputMode="numeric"
                                  placeholder="输入手机号"
                                  value={phone}
                                  maxLength={11}
                                  onChange={(e) =>
                                    setPhone(e.target.value.replace(/\D/g, ''))
                                  }
                                  required
                                />
                              </div>
                              <label className="sr-only" htmlFor="login-phone-password">
                                密码
                              </label>
                              <div className="sign-in-flow-auth-field-wrap">
                                <div className="sign-in-flow-phone-input sign-in-flow-phone-input--solo">
                                  <input
                                    id="login-phone-password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="sign-in-flow-icon-btn flex cursor-pointer items-center justify-center transition-colors"
                                >
                                  {showPassword ? '隐藏' : '显示'}
                                </button>
                              </div>
                              {error ? (
                                <p
                                  className="sign-in-flow-register-error"
                                  role="alert"
                                >
                                  {error}
                                </p>
                              ) : null}
                              <LiquidMetalButton
                                label={isLoading ? '登录中...' : '登录'}
                                fullWidth
                                height={52}
                                disabled={
                                  !phone ||
                                  phone.length < 11 ||
                                  !password ||
                                  isLoading
                                }
                                onClick={() =>
                                  passwordLoginFormRef.current?.requestSubmit()
                                }
                              />
                              <button
                                type="submit"
                                className="sr-only"
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                            </form>
                          )}

                          {loginChannel === 'email' && (
                            <form
                              ref={emailLoginFormRef}
                              onSubmit={handleEmailLoginSubmit}
                              className="sign-in-flow-register-stack"
                            >
                              <label className="sr-only" htmlFor="login-email">
                                QQ 邮箱
                              </label>
                              <div className="sign-in-flow-phone-input sign-in-flow-phone-input--solo">
                                <input
                                  id="login-email"
                                  name="email"
                                  type="email"
                                  autoComplete="email"
                                  spellCheck={false}
                                  placeholder="name@qq.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  required
                                />
                              </div>
                              {error ? (
                                <p
                                  className="sign-in-flow-register-error"
                                  role="alert"
                                >
                                  {error}
                                </p>
                              ) : null}
                              <LiquidMetalButton
                                label={isLoading ? '发送中...' : '获取验证码'}
                                fullWidth
                                height={52}
                                disabled={!email.trim() || isLoading}
                                onClick={() =>
                                  emailLoginFormRef.current?.requestSubmit()
                                }
                              />
                              <button
                                type="submit"
                                className="sr-only"
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                              <p className="sign-in-flow-login-soon">
                                验证码将发送至邮箱。登录后可在设置中绑定手机号。
                              </p>
                            </form>
                          )}

                          <p className="sign-in-flow-register-footer">
                            没有账号？
                            <button
                              type="button"
                              onClick={() => {
                                setIsLogin(false)
                                setError('')
                                setLoginChannel('phone')
                              }}
                            >
                              手机号注册
                            </button>
                          </p>
                        </div>
                      </div>
                    ) : (
                        <div className="sign-in-flow-register-card">
                          <div>
                            <h1 className="sign-in-flow-register-title">
                              加入九木
                            </h1>
                            <p className="sign-in-flow-register-subtitle">
                              使用手机号快速创建账号
                            </p>
                          </div>

                          <form
                            ref={registerPhoneFormRef}
                            onSubmit={handlePhoneSubmit}
                            className="sign-in-flow-register-stack"
                          >
                            <label className="sr-only" htmlFor="register-phone">
                              手机号
                            </label>
                            <div className="sign-in-flow-phone-input">
                              <span className="sign-in-flow-phone-prefix">
                                +86
                              </span>
                              <input
                                id="register-phone"
                                name="tel"
                                type="tel"
                                autoComplete="tel"
                                inputMode="numeric"
                                placeholder="输入手机号"
                                value={phone}
                                maxLength={11}
                                onChange={(e) =>
                                  setPhone(e.target.value.replace(/\D/g, ''))
                                }
                                required
                              />
                            </div>

                            <label className="sr-only" htmlFor="register-password">
                              设置登录密码
                            </label>
                            <div className="sign-in-flow-phone-input">
                              <input
                                id="register-password"
                                name="new-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="设置登录密码（至少 6 位）"
                                value={registerPassword}
                                onChange={(e) => setRegisterPassword(e.target.value)}
                                minLength={6}
                                required
                                className="sign-in-flow-password-input w-full bg-transparent px-3 py-2.5 outline-none"
                              />
                            </div>

                            <label className="sign-in-flow-register-legal">
                              <input
                                name="legalAccepted"
                                type="checkbox"
                                checked={allLegalAccepted}
                                onChange={(e) =>
                                  setAllLegalAccepted(e.target.checked)
                                }
                              />
                              <span className="sign-in-flow-register-legal-text">
                                我已阅读并同意
                                <LegalDialog
                                  trigger={
                                    <span className="underline">
                                      《用户协议》
                                    </span>
                                  }
                                  title="用户协议"
                                  sections={termsSections}
                                />
                                和
                                <LegalDialog
                                  trigger={
                                    <span className="underline">
                                      《隐私政策》
                                    </span>
                                  }
                                  title="隐私政策"
                                  sections={privacySections}
                                />
                              </span>
                            </label>

                            <LegalDialog
                              trigger={
                                <button
                                  type="button"
                                  className="sign-in-flow-register-info-link"
                                >
                                  个人信息收集说明 &gt;
                                </button>
                              }
                              title="个人信息收集说明"
                              sections={personalInfoCollectSections}
                            />

                            <div className="sign-in-flow-register-birth">
                              <label htmlFor="register-birth-year">
                                出生年份
                              </label>
                              <select
                                id="register-birth-year"
                                name="birthYear"
                                autoComplete="bday-year"
                                value={birthYear}
                                onChange={(e) => {
                                  const year = e.target.value
                                  setBirthYear(year)
                                  setBirthday(year ? `${year}-01-01` : '')
                                  if (
                                    year &&
                                    birthdayAge(`${year}-01-01`) >= 14 &&
                                    birthdayAge(`${year}-01-01`) < 18
                                  ) {
                                    setGuardianConsent(false)
                                  }
                                }}
                                required
                              >
                                <option value="" disabled>
                                  选择年份
                                </option>
                                {Array.from(
                                  {
                                    length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1,
                                  },
                                  (_, i) => BIRTH_YEAR_MAX - i,
                                ).map((year) => (
                                  <option key={year} value={String(year)}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {needsGuardianConsent ? (
                              <label className="sign-in-flow-register-guardian">
                                <input
                                  name="guardianConsent"
                                  type="checkbox"
                                  checked={guardianConsent}
                                  onChange={(e) =>
                                    setGuardianConsent(e.target.checked)
                                  }
                                  className="mt-0.5 shrink-0 accent-white"
                                />
                                <span>本人已征得监护人同意使用本平台</span>
                              </label>
                            ) : null}

                            {error ? (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="sign-in-flow-register-error"
                                role="alert"
                              >
                                {error}
                              </motion.p>
                            ) : null}

                            <LiquidMetalButton
                              label={isLoading ? '发送中...' : '下一步'}
                              fullWidth
                              height={52}
                              disabled={!canSubmitRegister}
                              onClick={() =>
                                registerPhoneFormRef.current?.requestSubmit()
                              }
                            />
                            <button
                              type="submit"
                              className="sr-only"
                              tabIndex={-1}
                              aria-hidden="true"
                            />
                          </form>

                          <p className="sign-in-flow-register-footer">
                            已有账号？
                            <button
                              type="button"
                              onClick={() => {
                                setIsLogin(true)
                                setError('')
                              }}
                            >
                              密码登录
                            </button>
                          </p>
                        </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 2: 人机验证 ── */}
                {step === 'captcha' && (
                  <motion.div
                    key="captcha-step"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="sign-in-flow-stage sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="font-bold tracking-tight">
                        人机验证
                      </h1>
                      <p className="sign-in-flow-subtitle-sm font-light">
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
                      <p className="text-base text-[#86868B]" role="status">
                        验证中，请稍候…
                      </p>
                    )}

                    {captchaError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-base text-red-400/80"
                        role="alert"
                      >
                        {captchaError}
                      </motion.p>
                    )}

                    <div className="flex justify-center">
                      <motion.button
                        onClick={handleBackToPhone}
                        className="sign-in-flow-secondary-button font-medium px-8 py-3 transition-colors cursor-pointer"
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="sign-in-flow-stage sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="font-bold tracking-tight">
                        输入验证码
                      </h1>
                      <p className="sign-in-flow-subtitle-sm font-light">
                        已发送至{' '}
                        {codeDelivery === 'email-login' ? email : phone}
                      </p>
                    </div>

                    {codeDelivery === 'email-login' && (
                      <div className="sign-in-flow-register-birth text-left">
                        <label htmlFor="email-login-birth-year">出生年份（首次登录必填）</label>
                        <select
                          id="email-login-birth-year"
                          name="birthYear"
                          autoComplete="bday-year"
                          value={birthYear}
                          onChange={(e) => {
                            const year = e.target.value
                            setBirthYear(year)
                            setBirthday(year ? `${year}-01-01` : '')
                          }}
                          required
                        >
                          <option value="" disabled>
                            选择年份
                          </option>
                          {Array.from(
                            { length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 },
                            (_, i) => BIRTH_YEAR_MAX - i,
                          ).map((year) => (
                            <option key={year} value={String(year)}>
                              {year}
                            </option>
                          ))}
                        </select>
                        {needsGuardianConsent ? (
                          <label className="sign-in-flow-register-guardian mt-3 block">
                            <input
                              name="guardianConsent"
                              type="checkbox"
                              checked={guardianConsent}
                              onChange={(e) =>
                                setGuardianConsent(e.target.checked)
                              }
                                className="mt-0.5 shrink-0 accent-[#007AFF]"
                            />
                            <span className="text-sm text-[#515154]">
                              本人已满 14 周岁，且已征得监护人同意
                            </span>
                          </label>
                        ) : null}
                      </div>
                    )}

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
                        className="sign-in-flow-error text-base"
                        role="alert"
                      >
                        {error}
                      </motion.p>
                    )}

                    <div>
                      <motion.button
                        type="button"
                        className="text-[#007AFF] hover:text-[#0A84FF] transition-colors cursor-pointer text-base"
                        transition={{ duration: 0.2 }}
                        onClick={handleResendSms}
                        disabled={isLoading || countdown > 0}
                      >
                        {countdown > 0
                          ? `${countdown}秒后重发`
                          : codeDelivery === 'email-login'
                            ? '重新发送邮件'
                            : '重新发送'}
                      </motion.button>
                    </div>

                    <div className="flex w-full gap-3">
                      <motion.button
                        onClick={handleBackToPhone}
                        className="sign-in-flow-secondary-button font-medium px-8 py-3 transition-colors w-[30%] cursor-pointer"
                        transition={{ duration: 0.2 }}
                      >
                        返回
                      </motion.button>
                      <div className="flex-1" />
                    </div>

                    {codeDelivery === 'phone-register' ? (
                      <div className="pt-10">
                        <div className="text-base text-[#515154]">
                          注册即表示同意{' '}
                          <LegalDialog
                            trigger={
                              <span className="text-[#007AFF] hover:text-[#0A84FF] cursor-pointer transition-colors text-base">
                                服务条款
                              </span>
                            }
                            title="服务条款"
                            sections={termsSections}
                          />{' '}
                          和{' '}
                          <LegalDialog
                            trigger={
                              <span className="text-[#007AFF] hover:text-[#0A84FF] cursor-pointer transition-colors text-base">
                                隐私政策
                              </span>
                            }
                            title="隐私政策"
                            sections={privacySections}
                          />
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}

                {/* ── Step 4: 成功 ── */}
                {step === 'success' && (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut', delay: 0.1 }}
                    className="sign-in-flow-stage sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="font-bold tracking-tight">
                        欢迎你！
                      </h1>
                      <p className="sign-in-flow-subtitle-sm font-light">
                        加入九木社区
                      </p>
                    </div>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="py-10"
                    >
                      <div className="mx-auto w-16 h-16 rounded-full bg-[rgba(0,122,255,0.12)] flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-[#007AFF]"
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
                      className="sign-in-flow-primary-button w-full font-medium py-3 transition-colors cursor-pointer"
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
