'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  X,
  Compass,
  PenSquare,
  Users,
  MessageCircle,
  Layers,
  Search,
  HelpCircle,
  User,
  LogOut,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'

interface MenuItem {
  id: number
  title: string
  url?: string
  icon: React.ReactNode
  onClick?: () => void
}

interface ScrollNavbarProps {
  menuItems?: MenuItem[]
  className?: string
}

const defaultMenuItems: MenuItem[] = [
  {
    id: 0,
    title: '发现',
    url: '/discover',
    icon: <Compass className="size-5" />,
  },
  {
    id: 1,
    title: '发布',
    url: '/demands/create',
    icon: <PenSquare className="size-5" />,
  },
  { id: 2, title: '圈子', url: '/circles', icon: <Users className="size-5" /> },
  {
    id: 3,
    title: '消息',
    url: '/messages',
    icon: <MessageCircle className="size-5" />,
  },
  {
    id: 4,
    title: '卡池',
    url: '/card-pool',
    icon: <Layers className="size-5" />,
  },
  { id: 5, title: '找人', url: '/search', icon: <Search className="size-5" /> },
  {
    id: 6,
    title: '帮助',
    url: '/help',
    icon: <HelpCircle className="size-5" />,
  },
  { id: 7, title: '我的', url: '/profile', icon: <User className="size-5" /> },
]

export const ScrollNavbar: React.FC<ScrollNavbarProps> = ({
  menuItems = defaultMenuItems,
  className = '',
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const accumulatedRef = React.useRef(0)
  const logout = useUserStore((s) => s.logout)
  const navigate = useNavigate()

  const allItems: MenuItem[] = [
    ...menuItems,
    {
      id: 99,
      title: '注销',
      icon: <LogOut className="size-5" />,
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      accumulatedRef.current += e.deltaY
      accumulatedRef.current = Math.max(
        0,
        Math.min(accumulatedRef.current, 200),
      )
      setIsScrolled(accumulatedRef.current > 40)
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [])

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const menuVariants = {
    closed: {
      opacity: 0,
      scale: 0.8,
      y: -50,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
        when: 'afterChildren' as const,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    open: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
        when: 'beforeChildren' as const,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    closed: { y: 20, opacity: 0, scale: 0.8 },
    open: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
    },
  }

  const hamburgerVariants = {
    normal: { rotate: 0, scale: 1 },
    scrolled: { rotate: 360, scale: 1.1 },
  }

  return (
    <>
      {/* 顶部导航栏 — 滚动后隐藏 */}
      <motion.nav
        initial={{ y: 0, opacity: 1 }}
        animate={{
          y: isScrolled ? -100 : 0,
          opacity: isScrolled ? 0 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 left-0 right-0 z-50 bg-black/99 backdrop-blur-xl border-b border-white/10 ${className}`}
      >
        <div className="max-w-7xl mx-auto pl-2 pr-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 w-full max-w-3xl">
            {/* Logo */}
            <motion.div
              className="flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="text-2xl font-bold text-white">
                Ninewood
              </Link>
            </motion.div>

            {/* 桌面导航 */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-baseline gap-3">
                {allItems.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {item.url ? (
                      <Link
                        to={item.url}
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white transition-colors"
                      >
                        <span>{item.title}</span>
                      </Link>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-white transition-colors cursor-pointer"
                      >
                        <span>{item.title}</span>
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 菜单按钮 */}
            <div className="md:hidden">
              <motion.button
                onClick={toggleMenu}
                className="p-2 rounded-md text-white  focus:outline-none"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Menu className="size-6" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* 滚动后浮现的快捷按钮 */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isScrolled ? 1 : 0,
          opacity: isScrolled ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-6 right-6 z-50"
      >
        <motion.button
          onClick={toggleMenu}
          className="w-14 h-14 bg-foreground text-background rounded-full shadow-lg flex items-center justify-center"
          variants={hamburgerVariants}
          animate={isScrolled ? 'scrolled' : 'normal'}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
        >
          <Menu className="size-6" />
        </motion.button>
      </motion.div>

      {/* 弹出菜单 */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={toggleMenu}
            />

            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-20 right-6 z-50"
            >
              <div className="relative bg-neutral-900 border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/50 ring-1 ring-white/5 w-[240px]">
                <motion.button
                  onClick={toggleMenu}
                  className="absolute top-4 right-4 p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="size-5" />
                </motion.button>

                <div className="space-y-4 mt-8">
                  {allItems.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      whileHover={{ scale: 1.05, x: 10 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {item.url ? (
                        <Link
                          to={item.url}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center space-x-4 p-4 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <motion.div
                            className="text-white"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.3 }}
                          >
                            {item.icon}
                          </motion.div>
                          <span className="text-lg font-medium text-white">
                            {item.title}
                          </span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => {
                            item.onClick?.()
                            setIsMenuOpen(false)
                          }}
                          className="flex items-center space-x-4 p-4 rounded-xl hover:bg-white/5 transition-colors group w-full text-left"
                        >
                          <motion.div
                            className="text-white"
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.3 }}
                          >
                            {item.icon}
                          </motion.div>
                          <span className="text-lg font-medium text-white">
                            {item.title}
                          </span>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* 装饰元素 */}
                <motion.div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-foreground rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute -bottom-2 -right-2 w-3 h-3 bg-muted rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.8, 0.3],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
