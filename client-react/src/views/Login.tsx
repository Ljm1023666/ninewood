import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { authApi } from '@/api/auth'
import {
  AcetInvertButton,
  AcetOutlineButton,
} from '@/components/ui/tailwindcss-buttons-variants'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useUserStore((s) => s.setAuth)

  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isDark = useThemeStore((s) => s.current.dark)
  // 浅色/深色模式适配
  const tPrimary = isDark ? 'text-white' : 'text-text-primary'
  const tSecondary = isDark ? 'text-white/70' : 'text-text-secondary'
  const tMuted = isDark ? 'text-white/50' : 'text-text-muted'
  const tFaint = isDark ? 'text-white/30' : 'text-text-muted'
  const tDim = isDark ? 'text-white/25' : 'text-text-muted'
  const sDefault = isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'
  const sRaised = isDark ? 'bg-white/10' : 'bg-black/[0.06]'
  const sElevated = isDark ? 'bg-white/15' : 'bg-black/[0.08]'
  const sLowest = isDark ? 'bg-white/[0.04]' : 'bg-black/[0.02]'
  const inputCls = isDark
    ? 'border-white/10 bg-white/[0.06] text-white placeholder:text-white/25 focus:border-white/30 focus:bg-white/[0.1] focus:ring-white/10'
    : 'border-black/[0.08] bg-black/[0.04] text-text-primary placeholder:text-text-muted focus:border-black/[0.15] focus:bg-black/[0.06] focus:ring-black/[0.06]'

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  async function sendCode() {
    if (countdown > 0 || phone.length !== 11) return
    setError('')
    try {
      await authApi.sendCode(phone)
      setCountdown(60)
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined
      setError(msg || '发送失败')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      if (isLogin) {
        const res = await authApi.login(phone, password)
        setAuth({ user: res.data.data.user, token: res.data.data.token })
      } else {
        const res = await authApi.register(phone, code)
        setAuth({ user: res.data.data.user, token: res.data.data.token })
      }
      navigate('/')
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined
      setError(msg || '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = isLogin
    ? phone.length === 11 && password.length >= 1 && !isLoading
    : phone.length === 11 && code.length >= 4 && !isLoading

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary p-4">
      {/* 背景光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-fuchsia-500/8 blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? 'login' : 'register'}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          className="w-full max-w-[420px]"
        >
          <LiquidGlassCard
            draggable={true}
            shadowIntensity="sm"
            glowIntensity="sm"
            borderRadius="24px"
            className="p-8"
          >
            {/* Logo */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${sRaised} backdrop-blur-sm`}
              >
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <span className={`text-xl font-bold ${tPrimary} cyber-glow`}>
                九木
              </span>
            </div>

            {/* Tab 切换 */}
            <div
              className={`mb-8 flex gap-1 rounded-xl ${sDefault} p-1 backdrop-blur-sm`}
            >
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={cn(
                  'flex-1 rounded-lg py-3 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-300',
                  isLogin
                    ? cn(
                        sElevated,
                        tPrimary,
                        isDark &&
                          'shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]',
                      )
                    : cn(tMuted, `hover:${tPrimary}`),
                )}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className={cn(
                  'flex-1 rounded-lg py-3 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-300',
                  !isLogin
                    ? cn(
                        sElevated,
                        tPrimary,
                        isDark &&
                          'shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]',
                      )
                    : cn(tMuted, `hover:${tPrimary}`),
                )}
              >
                注册
              </button>
            </div>

            {/* 标题 */}
            <div className="mb-8 text-center">
              <h1
                className={`mb-2 text-2xl font-bold tracking-tight ${tPrimary}`}
              >
                {isLogin ? '欢迎回来' : '创建账号'}
              </h1>
              <p className={`text-sm ${tMuted}`}>
                {isLogin ? '请输入手机号与密码' : '验证手机号完成注册'}
              </p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className={`mb-2 block text-sm font-medium ${tSecondary}`}
                >
                  手机号
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  maxLength={11}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="请输入手机号"
                  className={`h-12 w-full rounded-xl border ${inputCls} px-4 outline-none backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-300 focus:ring-2`}
                />
              </div>

              {!isLogin && (
                <div>
                  <label
                    htmlFor="code"
                    className={`mb-2 block text-sm font-medium ${tSecondary}`}
                  >
                    验证码
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      maxLength={6}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="6位验证码"
                      className={`h-12 flex-1 rounded-xl border ${inputCls} px-4 outline-none backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-300 focus:ring-2`}
                    />
                    <AcetOutlineButton
                      type="button"
                      disabled={countdown > 0 || phone.length !== 11}
                      onClick={sendCode}
                      className={cn(
                        'h-12 shrink-0 px-4 text-sm font-medium',
                        countdown > 0 || phone.length !== 11
                          ? cn(sLowest, tDim, 'cursor-not-allowed opacity-50')
                          : cn(sRaised, tPrimary),
                      )}
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </AcetOutlineButton>
                  </div>
                </div>
              )}

              {isLogin && (
                <div>
                  <label
                    htmlFor="password"
                    className={`mb-2 block text-sm font-medium ${tSecondary}`}
                  >
                    密码
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="请输入密码"
                      className={`h-12 w-full rounded-xl border ${inputCls} pr-12 pl-4 outline-none backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-300 focus:ring-2`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
                        tFaint,
                        `hover:${tSecondary}`,
                      )}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-3 text-sm font-medium"
                  style={{
                    color: 'var(--error-color)',
                    background:
                      'color-mix(in srgb, var(--error-color) 10%, transparent)',
                    border:
                      '1px solid color-mix(in srgb, var(--error-color) 20%, transparent)',
                  }}
                >
                  {error}
                </motion.div>
              )}

              <AcetInvertButton
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'h-12 w-full rounded-xl text-base font-semibold',
                  !canSubmit &&
                    cn(sDefault, tDim, 'cursor-not-allowed opacity-60'),
                )}
              >
                {isLoading ? '请稍候…' : isLogin ? '登录' : '注册并登录'}
              </AcetInvertButton>
            </form>

            {/* 底部提示 */}
            <p className={`mt-6 text-center text-xs ${tFaint}`}>
              测试账号：13800000001～13800000020，密码均为 1
            </p>
          </LiquidGlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
