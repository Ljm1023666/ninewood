import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { TimelineItem } from '@/components/ui/modern-timeline'

const mocks = vi.hoisted(() => ({ recommend: vi.fn() }))

vi.mock('@/api/loop', () => ({
  loopApi: { recommend: mocks.recommend },
}))

vi.mock('@/components/ui/horizon-hero-section', () => ({
  HorizonHeroSection: ({
    sections,
    children,
  }: {
    sections?: Array<{ render?: () => React.ReactNode }>
    children?: React.ReactNode
  }) => (
    <div data-testid="horizon-stub">
      {sections?.map((section, index) => (
        <div key={index}>{section.render?.()}</div>
      ))}
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/scroll-navigation-menu', () => ({
  ScrollNavbar: () => <nav data-testid="nav-stub" />,
}))

vi.mock('@/components/ui/footer-section', () => ({
  Footer: () => <footer data-testid="footer-stub" />,
}))

vi.mock('@/components/ui/confirm-dialog', () => ({
  toast: vi.fn(),
}))

/** 单元测试跳过 framer-motion whileInView / IntersectionObserver */
vi.mock('@/components/ui/modern-timeline', () => ({
  Timeline: ({ items }: { items: TimelineItem[] }) => (
    <ul data-testid="timeline-stub">
      {items.map((item) => (
        <li key={item.title}>
          <button type="button" onClick={item.onClick}>
            <span>{item.title}</span>
            {item.tagName ? <span>{item.tagName}</span> : null}
            <span>{item.description}</span>
          </button>
        </li>
      ))}
    </ul>
  ),
}))

import Discover from './Discover'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Discover />} />
        <Route path="/loops/offerings/:id" element={<div>方案详情页</div>} />
        <Route path="/demands/create" element={<div>需求草稿确认页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.recommend.mockReset()
  localStorage.clear()
})

describe('Discover', () => {
  it('页内推荐可用方案并保留结果，点击卡片才进入详情', async () => {
    mocks.recommend.mockResolvedValue({
      query: '整理需求',
      resolved: {
        paths: ['tag:需求结构化'],
        facets: [],
        suggestions: [],
        status: 'hit',
      },
      humanFallback: null,
      items: [
        {
          id: 'off-1',
          title: '需求智能结构化',
          summary: '整理字段',
          loopKind: 'EARTH',
          definitionCode: 'builtin.earth.demand.structure',
          definitionName: '需求结构化',
          definitionDescription: null,
          executionMode: 'HYBRID',
          paths: ['tag:需求结构化'],
          inputSchema: {},
          outcomeSchema: {},
          metrics: {
            dealRate: null,
            avgDurationMs: 1200,
            publicSuccessRate: null,
            sampleSize: null,
            successRateStatus: 'ADAPTING',
          },
          requiresVerification: true,
          verification: {
            status: 'VERIFIED',
            verifierCount: 1,
            verifiers: [],
          },
          endpoint: { healthStatus: 'ONLINE', hostMode: 'PLATFORM_HOSTED' },
          match: {
            matchedPaths: ['tag:需求结构化'],
            textMatched: true,
            reasons: ['匹配路径 tag:需求结构化'],
          },
        },
      ],
    })

    const user = userEvent.setup()
    renderPage()

    const input = screen.getByRole('textbox', { name: '搜索方案' })
    await user.type(input, '整理需求')
    await user.keyboard('{Enter}')

    expect(mocks.recommend).toHaveBeenCalledWith({ q: '整理需求' })
    expect(await screen.findByText('找到 1 个可用方案')).toBeInTheDocument()
    expect(screen.getByText('需求智能结构化')).toBeInTheDocument()
    expect(screen.getByText('可用方案')).toBeInTheDocument()
    expect(screen.queryByText('方案详情页')).not.toBeInTheDocument()

    await user.click(screen.getByText('需求智能结构化'))
    expect(await screen.findByText('方案详情页')).toBeInTheDocument()
  })

  it('无方案时展示人工草稿入口，点击后才进入确认页', async () => {
    mocks.recommend.mockResolvedValue({
      query: '修木桌',
      items: [],
      resolved: { paths: [], facets: [], suggestions: [], status: 'miss' },
      humanFallback: {
        kind: 'HUMAN',
        title: '发布人回：修木桌',
        description: '修木桌',
        paths: [],
        facets: [],
        requiresConfirmation: true,
      },
    })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('textbox', { name: '搜索方案' }), '修木桌')
    await user.keyboard('{Enter}')

    expect(
      await screen.findByText('暂无直接可用方案，可转为人工程序草稿'),
    ).toBeInTheDocument()
    expect(screen.queryByText('需求草稿确认页')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /检查人工草稿后再发布/ }))
    expect(await screen.findByText('需求草稿确认页')).toBeInTheDocument()
    expect(localStorage.getItem('ninewood_demand_sessions_v1')).toContain('修木桌')
  })
})
