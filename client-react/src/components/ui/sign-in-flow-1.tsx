import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import './sign-in-flow.css'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

const MotionLiquidMetalButton = motion.create(LiquidMetalButton)

interface SignInPageProps {
  className?: string
}

export function SignInFlowNavbar({
  isLogin,
  onToggleMode,
}: {
  isLogin: boolean
  onToggleMode: (login: boolean) => void
}) {
  return (
    <header className="sign-in-flow-appbar">
      <Link to="/" className="sign-in-flow-brand" aria-label="返回九木首页">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M8 9v22h6V9H8Zm10 0v22h6V9h-6Zm10 0-5 11 5 11h6l-5-11L34 9h-6Z" />
        </svg>
        <span>九木</span>
      </Link>
      <div className="sign-in-flow-mode-switch" role="group" aria-label="认证方式">
        <LiquidMetalButton
          type="button"
          onClick={() => onToggleMode(true)}
          className={cn(isLogin && 'is-active')}
          aria-pressed={isLogin}
        >
          登录
        </LiquidMetalButton>
        <LiquidMetalButton
          type="button"
          onClick={() => onToggleMode(false)}
          className={cn(!isLogin && 'is-active')}
          aria-pressed={!isLogin}
        >
          注册
        </LiquidMetalButton>
      </div>
    </header>
  )
}

export function SignInFlowBackground(props: {
  initialVisible: boolean
  reverseVisible: boolean
}) {
  void props

  return (
    <div className="sign-in-flow-background" aria-hidden="true">
      <div className="sign-in-flow-background__glow" />
    </div>
  )
}

export const SignInPage = ({ className }: SignInPageProps) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'code' | 'success'>('email')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [initialCanvasVisible, setInitialCanvasVisible] = useState(true)
  const [reverseCanvasVisible, setReverseCanvasVisible] = useState(false)

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      setStep('code')
    }
  }

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus()
      }, 500)
    }
  }, [step])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...code]
      newCode[index] = value
      setCode(newCode)

      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus()
      }

      if (index === 5 && value) {
        const isComplete = newCode.every((digit) => digit.length === 1)
        if (isComplete) {
          setReverseCanvasVisible(true)
          setTimeout(() => {
            setInitialCanvasVisible(false)
          }, 50)
          setTimeout(() => {
            setStep('success')
          }, 2000)
        }
      }
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleBackClick = () => {
    setStep('email')
    setCode(['', '', '', '', '', ''])
    setReverseCanvasVisible(false)
    setInitialCanvasVisible(true)
  }

  return (
    <div
      className={cn(
        'sign-in-flow-root relative flex min-h-screen w-full flex-col bg-black',
        className,
      )}
    >
      <SignInFlowBackground
        initialVisible={initialCanvasVisible}
        reverseVisible={reverseCanvasVisible}
      />

      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <SignInFlowNavbar isLogin={isLogin} onToggleMode={setIsLogin} />

        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm">
              <AnimatePresence mode="wait">
                {step === 'email' ? (
                  <motion.div
                    key="email-step"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-tight text-white">
                        Welcome Developer
                      </h1>
                      <p className="text-[1.8rem] font-light text-white/70">
                        Your sign in component
                      </p>
                    </div>

                    <div className="sign-in-flow-stack-sm">
                      <LiquidMetalButton
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-white backdrop-blur-[2px] transition-colors hover:bg-white/10"
                      >
                        <span className="text-lg font-mono">#</span>
                        <span>Sign in with ID</span>
                      </LiquidMetalButton>

                      <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-sm text-white/40">or</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>

                      <form onSubmit={handleEmailSubmit}>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="name@qq.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-full border border-white/10 bg-transparent py-3 pr-12 pl-4 text-center text-white backdrop-blur-[1px] focus:border-white/30 focus:outline-none"
                            required
                          />
                          <LiquidMetalButton
                            type="submit"
                            className="group absolute top-1.5 right-1.5 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                          >
                            <span className="relative block h-full w-full overflow-hidden">
                              <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-full">
                                →
                              </span>
                              <span className="absolute inset-0 flex -translate-x-full items-center justify-center transition-transform duration-300 group-hover:translate-x-0">
                                →
                              </span>
                            </span>
                          </LiquidMetalButton>
                        </div>
                      </form>
                    </div>

                    <p className="pt-4 text-xs text-white/40">
                      By signing up, you agree to the{' '}
                      <Link
                        to="#"
                        className="text-white/40 underline transition-colors hover:text-white/60"
                      >
                        MSA
                      </Link>
                      ,{' '}
                      <Link
                        to="#"
                        className="text-white/40 underline transition-colors hover:text-white/60"
                      >
                        Product Terms
                      </Link>
                      ,{' '}
                      <Link
                        to="#"
                        className="text-white/40 underline transition-colors hover:text-white/60"
                      >
                        Policies
                      </Link>
                      ,{' '}
                      <Link
                        to="#"
                        className="text-white/40 underline transition-colors hover:text-white/60"
                      >
                        Privacy Notice
                      </Link>
                      , and{' '}
                      <Link
                        to="#"
                        className="text-white/40 underline transition-colors hover:text-white/60"
                      >
                        Cookie Notice
                      </Link>
                      .
                    </p>
                  </motion.div>
                ) : step === 'code' ? (
                  <motion.div
                    key="code-step"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-tight text-white">
                        We sent you a code
                      </h1>
                      <p className="text-[1.25rem] font-light text-white/50">
                        Please enter it
                      </p>
                    </div>

                    <div className="w-full">
                      <div className="relative rounded-full border border-white/10 bg-transparent px-5 py-4">
                        <div className="flex items-center justify-center">
                          {code.map((digit, i) => (
                            <div key={i} className="flex items-center">
                              <div className="relative">
                                <input
                                  ref={(el) => {
                                    codeInputRefs.current[i] = el
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) =>
                                    handleCodeChange(i, e.target.value)
                                  }
                                  onKeyDown={(e) => handleKeyDown(i, e)}
                                  className="w-8 appearance-none border-none bg-transparent text-center text-xl text-white focus:ring-0 focus:outline-none"
                                  style={{ caretColor: 'transparent' }}
                                />
                                {!digit && (
                                  <div className="pointer-events-none absolute top-0 left-0 flex h-full w-full items-center justify-center">
                                    <span className="text-xl text-white">0</span>
                                  </div>
                                )}
                              </div>
                              {i < 5 && (
                                <span className="text-xl text-white/20">|</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <motion.p
                        className="cursor-pointer text-sm text-white/50 transition-colors hover:text-white/70"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        Resend code
                      </motion.p>
                    </div>

                    <div className="flex w-full gap-3">
                      <MotionLiquidMetalButton
                        type="button"
                        onClick={handleBackClick}
                        className="w-[30%] rounded-full bg-white px-8 py-3 font-medium text-black transition-colors hover:bg-white/90"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                      >
                        Back
                      </MotionLiquidMetalButton>
                      <MotionLiquidMetalButton
                        type="button"
                        className={`flex-1 rounded-full border py-3 font-medium transition-all duration-300 ${
                          code.every((d) => d !== '')
                            ? 'cursor-pointer border-transparent bg-white text-black hover:bg-white/90'
                            : 'cursor-not-allowed border-white/10 bg-[#111] text-white/50'
                        }`}
                        disabled={!code.every((d) => d !== '')}
                      >
                        Continue
                      </MotionLiquidMetalButton>
                    </div>

                    <div className="pt-16">
                      <p className="text-xs text-white/40">
                        By signing up, you agree to the{' '}
                        <Link
                          to="#"
                          className="text-white/40 underline transition-colors hover:text-white/60"
                        >
                          MSA
                        </Link>
                        ,{' '}
                        <Link
                          to="#"
                          className="text-white/40 underline transition-colors hover:text-white/60"
                        >
                          Product Terms
                        </Link>
                        ,{' '}
                        <Link
                          to="#"
                          className="text-white/40 underline transition-colors hover:text-white/60"
                        >
                          Policies
                        </Link>
                        ,{' '}
                        <Link
                          to="#"
                          className="text-white/40 underline transition-colors hover:text-white/60"
                        >
                          Privacy Notice
                        </Link>
                        , and{' '}
                        <Link
                          to="#"
                          className="text-white/40 underline transition-colors hover:text-white/60"
                        >
                          Cookie Notice
                        </Link>
                        .
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success-step"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
                    className="sign-in-flow-stack text-center"
                  >
                    <div className="sign-in-flow-stack-xs">
                      <h1 className="text-[2.5rem] leading-[1.1] font-bold tracking-tight text-white">
                        You&apos;re in!
                      </h1>
                      <p className="text-[1.25rem] font-light text-white/50">
                        Welcome
                      </p>
                    </div>

                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="py-10"
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-white to-white/70">
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

                    <MotionLiquidMetalButton
                      type="button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="w-full rounded-full bg-white py-3 font-medium text-black transition-colors hover:bg-white/90"
                    >
                      Continue to Dashboard
                    </MotionLiquidMetalButton>
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
