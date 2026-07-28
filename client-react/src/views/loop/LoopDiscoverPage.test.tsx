import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mocks = vi.hoisted(() => ({ recommend: vi.fn() }))
vi.mock('@/api/loop', () => ({ loopApi: { recommend: mocks.recommend } }))

import LoopDiscoverPage from './LoopDiscoverPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/loops/discover']}>
      <Routes>
        <Route path="/loops/discover" element={<LoopDiscoverPage />} />
        <Route path="/demands/create" element={<div>需求草稿确认页</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.recommend.mockReset()
  localStorage.clear()
  if (!(globalThis as any).ResizeObserver) {
    ;(globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  if (!(globalThis as any).IntersectionObserver) {
    ;(globalThis as any).IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

describe('LoopDiscoverPage', () => {
  it('从自然语言需求展示地回与天回验证摘要', async () => {
    mocks.recommend.mockResolvedValue({
      query: '整理需求',
      resolved: { paths: ['tag:需求结构化'], facets: [], suggestions: [], status: 'hit' },
      humanFallback: null,
      items: [{
        id: 'off-1', title: '需求智能结构化', summary: '整理字段', loopKind: 'EARTH',
        definitionCode: 'builtin.earth.demand.structure', definitionName: '需求结构化', definitionDescription: null,
        executionMode: 'HYBRID', paths: ['tag:需求结构化'], inputSchema: {}, outcomeSchema: {},
        metrics: { dealRate: null, avgDurationMs: 1200, publicSuccessRate: null, sampleSize: null, successRateStatus: 'ADAPTING' },
        requiresVerification: true, verification: { status: 'VERIFIED', verifierCount: 1, verifiers: [] },
        endpoint: { healthStatus: 'ONLINE', hostMode: 'PLATFORM_HOSTED' },
        match: { matchedPaths: ['tag:需求结构化'], textMatched: true, reasons: ['匹配路径 tag:需求结构化'] },
      }],
    })
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('你的需求'), '整理需求')
    await user.click(screen.getByRole('button', { name: /寻找合适的回/ }))
    expect(await screen.findByText('需求智能结构化')).toBeInTheDocument()
    expect(screen.getByText(/1 个必要验证/)).toBeInTheDocument()
    expect(screen.getByText(/公开成功率/)).toHaveTextContent('验证适配中')
  })

  it('无地回时创建本地草稿并进入确认页，不静默发布', async () => {
    mocks.recommend.mockResolvedValue({
      query: '修木桌', items: [],
      resolved: { paths: [], facets: [], suggestions: [], status: 'miss' },
      humanFallback: { kind: 'HUMAN', title: '发布人回：修木桌', description: '修木桌', paths: [], facets: [], requiresConfirmation: true },
    })
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('你的需求'), '修木桌')
    await user.click(screen.getByRole('button', { name: /寻找合适的回/ }))
    await user.click(await screen.findByRole('button', { name: /检查人回草稿/ }))
    expect(await screen.findByText('需求草稿确认页')).toBeInTheDocument()
    expect(localStorage.getItem('ninewood_demand_sessions_v1')).toContain('修木桌')
  })

  it('组合路径展示步骤徽标', async () => {
    mocks.recommend.mockResolvedValue({
      query: '需求就绪',
      resolved: { paths: ['tag:需求结构化'], facets: [], suggestions: [], status: 'hit' },
      humanFallback: null,
      items: [{
        id: 'compose-1', title: '需求就绪大回', summary: '结构化再生成路径', loopKind: 'EARTH',
        definitionCode: 'builtin.compose.demand_ready', definitionName: '需求就绪大回', definitionDescription: null,
        executionMode: 'HYBRID', paths: ['tag:需求结构化'], inputSchema: {}, outcomeSchema: {},
        composition: {
          code: 'builtin.compose.demand_ready',
          stepCount: 2,
          steps: [
            { key: 'structure', definitionCode: 'builtin.earth.demand.structure', relation: 'DELEGATE' },
            { key: 'paths', definitionCode: 'builtin.earth.demand.paths', relation: 'DELEGATE' },
          ],
        },
        metrics: { dealRate: null, avgDurationMs: null, publicSuccessRate: null, sampleSize: null, successRateStatus: 'ADAPTING' },
        requiresVerification: true, verification: { status: 'VERIFIED', verifierCount: 1, verifiers: [] },
        endpoint: { healthStatus: 'ONLINE', hostMode: 'PLATFORM_HOSTED' },
        match: { matchedPaths: ['tag:需求结构化'], textMatched: true, reasons: ['匹配路径 tag:需求结构化'] },
      }],
    })
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText('你的需求'), '需求就绪')
    await user.click(screen.getByRole('button', { name: /寻找合适的回/ }))
    expect(await screen.findByText('需求就绪大回')).toBeInTheDocument()
    expect(screen.getByText(/组合 · 2 步/)).toBeInTheDocument()
    expect(screen.getByText(/structure · DELEGATE/)).toBeInTheDocument()
  })
})
