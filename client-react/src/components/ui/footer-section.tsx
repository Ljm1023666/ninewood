'use client'
import React from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FrameIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

interface FooterLink {
  title: string
  href: string
}

interface FooterSection {
  label: string
  links: FooterLink[]
}

const footerLinks: FooterSection[] = [
  {
    label: '平台',
    links: [
      { title: '发现需求', href: '/' },
      { title: '发布需求', href: '/demands/create' },
      { title: '卡池', href: '/card-pool' },
      { title: '服务者', href: '/providers' },
    ],
  },
  {
    label: '社区',
    links: [
      { title: '圈子', href: '/circles' },
      { title: '消息', href: '/messages' },
      { title: '找人', href: '/search' },
      { title: '个人主页', href: '/profile' },
    ],
  },
  {
    label: '帮助',
    links: [
      { title: '帮助中心', href: '/help' },
      { title: '隐私政策', href: '/privacy' },
      { title: '服务条款', href: '/terms' },
      { title: '开源许可', href: '/licenses' },
    ],
  },
  {
    label: '管理',
    links: [
      { title: '我的需求', href: '/my-demands' },
      { title: '我的应标', href: '/my-bids' },
      { title: '订单', href: '/orders' },
      { title: '设置', href: '/settings' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative w-full flex flex-col items-center rounded-t-4xl border-t border-border/30 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 lg:py-16">
      <div className="bg-foreground/10 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

      <div className="grid w-full max-w-6xl gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4 text-center xl:text-left">
          <FrameIcon className="size-5 text-foreground/60 mx-auto xl:mx-0" />
          <p className="text-muted-foreground mt-8 text-sm md:mt-0">
            {new Date().getFullYear()} Ninewood. 保留所有权利。
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div>
                <h3 className="text-xs font-medium text-foreground/60">
                  {section.label}
                </h3>
                <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <Link
                        to={link.href}
                        className="hover:text-foreground inline-flex items-center transition-all duration-300"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  )
}

type ViewAnimationProps = {
  delay?: number
  className?: ComponentProps<typeof motion.div>['className']
  children: ReactNode
}

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: ViewAnimationProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
