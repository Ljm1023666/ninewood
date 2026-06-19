'use client'

import React, { useEffect, useRef } from 'react'
import { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
const Spline = lazy(() => import('@splinetool/react-spline'))

function HeroSplineBackground() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <Spline
        style={{
          width: '100%',
          height: '100vh',
          pointerEvents: 'auto',
        }}
        scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: `
            linear-gradient(to right, rgba(0,0,0,0.85), transparent 40%, transparent 60%, rgba(0,0,0,0.85)),
            linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.95))
          `,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function HeroContent() {
  const navigate = useNavigate()

  return (
    <div className="text-left text-white pt-16 sm:pt-24 md:pt-32 px-4 max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/40 mb-4">
        Ninewood Platform
      </p>
      <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-wide">
        匿名发布，
        <br />
        精准匹配，
        <br />
        安全交付
      </h1>
      <p className="text-base sm:text-lg md:text-xl mb-8 opacity-70 max-w-xl leading-relaxed">
        AI
        语义分类器自动解析需求，卡池拖拽筛选匹配服务者，圈子内定向协作——从创意到交付，一站式闭环。
      </p>
      <div className="flex pointer-events-auto flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() => navigate('/discover')}
          className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-full transition duration-300 border border-white/10"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          进入平台
        </button>
        <button
          onClick={() => navigate('/help')}
          className="pointer-events-auto bg-transparent border border-white/20 hover:border-white/40 text-white/70 hover:text-white font-medium py-3 px-8 rounded-full transition duration-300"
        >
          了解更多
        </button>
      </div>
    </div>
  )
}

export const GalaxyHero = () => {
  const heroContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (heroContentRef.current) {
        requestAnimationFrame(() => {
          const maxScroll = 500
          const opacity = 1 - Math.min(window.scrollY / maxScroll, 1)
          if (heroContentRef.current) {
            heroContentRef.current.style.opacity = opacity.toString()
          }
        })
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Suspense
            fallback={
              <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              </div>
            }
          >
            <HeroSplineBackground />
          </Suspense>
        </div>

        <div
          ref={heroContentRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div className="container mx-auto">
            <HeroContent />
          </div>
        </div>
      </div>
    </div>
  )
}
