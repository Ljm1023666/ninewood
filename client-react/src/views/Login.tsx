import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff } from 'lucide-react'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)]">
      {/* Directional light: desk lamp from top-right + left edge ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-1/3 -right-1/4 h-[800px] w-[600px]"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 70% 30%, oklch(58% 0.16 45 / 0.18) 0%, oklch(52% 0.18 35 / 0.06) 40%, transparent 65%)',
          }}
        />
        <div
          className="absolute left-0 top-1/4 h-[300px] w-[80px]"
          style={{
            background:
              'linear-gradient(180deg, oklch(58% 0.16 45 / 0.06) 0%, transparent 100%)',
          }}
        />
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
          <motion.div className="relative overflow-hidden rounded-[20px] border border-border/80 bg-[var(--bg-secondary)] px-8 pb-6 pt-2 shadow-[var(--shadow-lg)]">
            {/* Logo region */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4">
              <div className="relative mb-3">
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 70% at 60% 40%, oklch(58% 0.16 45 / 0.25) 0%, oklch(52% 0.18 35 / 0.08) 50%, transparent 70%)',
                    filter: 'blur(14px)',
                  }}
                />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-[var(--accent-ghost)] text-2xl font-bold text-[var(--accent-color)]">
                  N
                </div>
              </div>
              {/* Solid amber text — no gradient text (absolute ban) */}
              <span className="text-2xl font-bold tracking-tight text-[var(--accent-color)]">
                九木
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {isLogin ? '欢迎回来' : '创建账号'}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {isLogin ? '登录以继续' : '验证手机号以完成注册'}
              </p>
            </div>

            {/* Pill-shaped tab switcher */}
            <div className="relative mb-8 flex rounded-xl border border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)]/30 p-1">
                <motion.div
                className="absolute top-1 bottom-1 rounded-[10px] bg-[var(--accent-color)]"
                style={{
                  width: 'calc(50% - 4px)',
                }}
                animate={{ left: isLogin ? '4px' : 'calc(50% + 4px)' }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={cn(
                  'relative z-content flex-1 py-3 text-sm font-medium transition-colors duration-300',
                  isLogin
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]',
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
                  'relative z-content flex-1 py-3 text-sm font-medium transition-colors duration-300',
                  !isLogin
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)]',
                )}
              >
                注册
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
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
                  placeholder="输入手机号"
                  className="h-12 w-full rounded-xl border border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)]/40 px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 outline-none transition-all duration-300 focus:border-[var(--accent-color)]/50 focus:shadow-[0_0_0_3px_var(--accent-muted),0_0_20px_var(--accent-ghost)]"
                />
              </div>

              {!isLogin && (
                <div>
                  <label
                    htmlFor="code"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
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
                      className="h-12 flex-1 rounded-xl border border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)]/40 px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 outline-none transition-all duration-300 focus:border-[var(--accent-color)]/50 focus:shadow-[0_0_0_3px_var(--accent-muted),0_0_20px_var(--accent-ghost)]"
                    />
                    <button
                      type="button"
                      disabled={countdown > 0 || phone.length !== 11}
                      onClick={sendCode}
                      className={cn(
                        'h-12 shrink-0 rounded-lg border px-4 text-sm font-medium transition-all duration-200',
                        countdown > 0 || phone.length !== 11
                          ? 'cursor-not-allowed border-[var(--bg-tertiary)] text-[var(--text-muted)]/30'
                          : 'cursor-pointer border-[var(--accent-color)]/50 text-[var(--accent-color)] hover:border-[var(--accent-color)] hover:bg-[var(--accent-ghost)]',
                      )}
                    >
                      {countdown > 0 ? `${countdown}秒` : '发送验证码'}
                    </button>
                  </div>
                </div>
              )}

              {isLogin && (
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-[var(--text-secondary)]"
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
                      placeholder="输入密码"
                      className="h-12 w-full rounded-xl border border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)]/40 pr-12 pl-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/30 outline-none transition-all duration-300 focus:border-[var(--accent-color)]/50 focus:shadow-[0_0_0_3px_var(--accent-muted),0_0_20px_var(--accent-ghost)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]/40 transition-colors hover:text-[var(--text-secondary)]"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
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
                  className="rounded-xl border border-[var(--error-color)]/20 bg-[var(--error-color)]/10 p-3 text-sm font-medium text-[var(--error-color)]"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'h-12 w-full rounded-xl text-base font-semibold text-white transition-all duration-200',
                  canSubmit
                    ? 'cursor-pointer bg-[var(--accent-color)] shadow-[0_4px_20px_rgba(0,0,0,0.45)] hover:opacity-90'
                    : 'cursor-not-allowed bg-[var(--bg-tertiary)]/30',
                )}
              >
                {isLoading
                  ? '请稍候...'
                  : isLogin
                    ? '登录'
                    : '注册并登录'}
              </button>
            </form>

            {/* Dev note — shown only when localStorage.debug is set */}
            {typeof window !== 'undefined' && window.localStorage?.getItem('ninewood-debug') && (
              <p className="mt-4 text-center text-xs text-[var(--text-muted)]/35">
                Test accounts: 13800000001~13800000020 / password: 1
              </p>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
