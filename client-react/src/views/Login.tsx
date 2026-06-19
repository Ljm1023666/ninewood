import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LiquidGlassCard } from '@/components/ui/liquid-weather-glass'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'

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
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
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
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-xl font-bold text-white cyber-glow">九木</span>
            </div>

            {/* Tab 切换 */}
            <div className="mb-8 flex gap-1 rounded-xl bg-white/[0.06] p-1 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError('') }}
                className={cn(
                  'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300',
                  isLogin
                    ? 'bg-white/15 text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-white/50 hover:text-white/70',
                )}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError('') }}
                className={cn(
                  'flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-300',
                  !isLogin
                    ? 'bg-white/15 text-white shadow-[inset_1px_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-white/50 hover:text-white/70',
                )}
              >
                注册
              </button>
            </div>

            {/* 标题 */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
                {isLogin ? '欢迎回来' : '创建账号'}
              </h1>
              <p className="text-sm text-white/50">
                {isLogin ? '请输入手机号与密码' : '验证手机号完成注册'}
              </p>
            </div>

            {/* 表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-white/70">
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
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 text-white placeholder:text-white/25 outline-none backdrop-blur-sm transition-all duration-300 focus:border-white/30 focus:bg-white/[0.1] focus:ring-2 focus:ring-white/10"
                />
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-white/70">
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
                      className="h-12 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-white placeholder:text-white/25 outline-none backdrop-blur-sm transition-all duration-300 focus:border-white/30 focus:bg-white/[0.1] focus:ring-2 focus:ring-white/10"
                    />
                    <button
                      type="button"
                      disabled={countdown > 0 || phone.length !== 11}
                      onClick={sendCode}
                      className={cn(
                        'h-12 shrink-0 rounded-xl px-4 text-sm font-medium transition-all duration-300',
                        countdown > 0 || phone.length !== 11
                          ? 'bg-white/[0.04] text-white/25 cursor-not-allowed'
                          : 'bg-white/10 text-white hover:bg-white/15 active:scale-95',
                      )}
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>
              )}

              {isLogin && (
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/70">
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
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pr-12 pl-4 text-white placeholder:text-white/25 outline-none backdrop-blur-sm transition-all duration-300 focus:border-white/30 focus:bg-white/[0.1] focus:ring-2 focus:ring-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={!canSubmit}
                whileHover={canSubmit ? { scale: 1.02 } : undefined}
                whileTap={canSubmit ? { scale: 0.98 } : undefined}
                className={cn(
                  'h-12 w-full rounded-xl text-base font-semibold transition-all duration-300',
                  canSubmit
                    ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40'
                    : 'bg-white/[0.06] text-white/25 cursor-not-allowed',
                )}
              >
                {isLoading ? '请稍候…' : isLogin ? '登录' : '注册并登录'}
              </motion.button>
            </form>

            {/* 底部提示 */}
            <p className="mt-6 text-center text-xs text-white/30">
              测试账号：13800000001～13800000020，密码均为 1
            </p>
          </LiquidGlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
