'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedInput } from '@/components/ui/animated-input'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const navigate = useNavigate()
  const setAuth = useUserStore((s) => s.setAuth)

  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    } catch (e: any) {
      setError(e.response?.data?.message || '发送失败')
    }
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        const res = await authApi.login(phone, password)
        setAuth({ user: res.data.data.user, token: res.data.data.token })
      } else {
        const res = await authApi.register(phone, code)
        setAuth({ user: res.data.data.user, token: res.data.data.token })
      }
      navigate('/')
    } catch (e: any) {
      setError(e.response?.data?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = phone.length === 11 && password.length >= 1 && !loading

  return (
    /* 桌面优先：版心固定宽度并水平居中，避免大屏下输入框被拉成「横条」 */
    <div className="flex min-h-screen w-full min-w-0 flex-col items-center justify-center bg-[#08080f] px-6 py-10">
      <div className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[min(100%,600px)] max-w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse,var(--bg-tertiary),transparent_70%)]" />

      <div className="relative w-[min(100%,420px)] shrink-0">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-black tracking-[0.15em] bg-gradient-to-b from-neutral-300 via-neutral-400 to-neutral-500 bg-clip-text text-transparent">
            九木
          </h1>
          <p className="mt-2 text-[13px] text-neutral-500 tracking-wide">
            {isLogin ? '登录你的账号' : '创建新账号'}
          </p>
        </div>

        <div className="flex mb-8 bg-white/[0.03] rounded-xl p-1">
          <button
            onClick={() => {
              setIsLogin(true)
              setError('')
            }}
            className={cn(
              'flex-1 py-3 rounded-lg text-sm font-medium transition-[color,background-color,box-shadow] duration-300',
              isLogin
                ? 'bg-white/[0.06] text-white ring-1 ring-white/8'
                : 'text-neutral-500 hover:text-neutral-400',
            )}
          >
            登录
          </button>
          <button
            onClick={() => {
              setIsLogin(false)
              setError('')
            }}
            className={cn(
              'flex-1 py-3 rounded-lg text-sm font-medium transition-[color,background-color,box-shadow] duration-300',
              !isLogin
                ? 'bg-white/[0.06] text-white ring-1 ring-white/8'
                : 'text-neutral-500 hover:text-neutral-400',
            )}
          >
            注册
          </button>
        </div>

        <div className="space-y-5">
          <AnimatedInput
            type="tel"
            aria-label="手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={11}
          />

          {!isLogin && (
            <div className="flex gap-3">
              <div className="flex-1">
                <AnimatedInput
                  type="text"
                  aria-label="验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                />
              </div>
              <button
                onClick={sendCode}
                disabled={countdown > 0}
                className={cn(
                  'px-5 h-[52px] rounded-xl text-sm font-medium transition-[color,background-color,border-color] duration-300 flex-shrink-0',
                  countdown > 0
                    ? 'bg-white/[0.03] text-neutral-500 cursor-not-allowed border border-white/5'
                    : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.10] border border-white/8',
                )}
              >
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          )}

          <AnimatedInput
            type="password"
            aria-label="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            showToggle
            showPassword={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="mt-4 text-center text-sm text-red-400/80">{error}</p>
        )}

        {/* 提示 */}
        <p className="mt-3 text-center text-xs text-neutral-600">
          本地种子用户：13800000001～13800000020，密码均为 1
        </p>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'w-full h-[52px] rounded-xl font-medium text-sm transition-[color,background-color,border-color,box-shadow] duration-300 mt-8 relative overflow-hidden group',
            'bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 text-neutral-200 border border-white/[0.06]',
            'hover:from-neutral-600 hover:via-neutral-700 hover:to-neutral-800 hover:text-white hover:shadow-[0_0_40px_rgba(255,255,255,0.04)]',
            'active:scale-[0.98]',
            (!canSubmit || loading) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative z-10 tracking-[0.2em]">
            {loading ? '处理中...' : isLogin ? '登 录' : '注 册'}
          </span>
        </button>

        <p className="mt-6 text-center text-xs text-neutral-600">
          登录即表示同意{' '}
          <a href="#" className="hover:text-neutral-400 transition-colors">
            服务条款
          </a>{' '}
          和{' '}
          <a href="#" className="hover:text-neutral-400 transition-colors">
            隐私政策
          </a>
        </p>
      </div>
    </div>
  )
}
