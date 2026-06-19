import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { JumpCard } from '../views/Help'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const baseMatch = {
  page: {
    id: 'test',
    path: '/test',
    icon: STITCH_PAGE_ICONS['help-docs'],
    title: '测试页面',
    desc: '这是一个测试页面',
    accepts: [],
    acceptsEntities: [],
    keywords: ['测试'],
  },
  score: 10,
  reason: '测试匹配',
  params: null,
  customLabel: null,
}

describe('JumpCard', () => {
  it('renders page title and description', () => {
    render(
      <BrowserRouter>
        <JumpCard match={baseMatch} onNavigate={() => {}} />
      </BrowserRouter>,
    )
    expect(screen.getByText('测试页面')).toBeDefined()
    expect(screen.getByText('这是一个测试页面')).toBeDefined()
  })

  it('renders custom label when provided', () => {
    const customMatch = {
      ...baseMatch,
      customLabel: { title: '定制标题', desc: '定制描述内容' },
    }
    render(
      <BrowserRouter>
        <JumpCard match={customMatch} onNavigate={() => {}} />
      </BrowserRouter>,
    )
    expect(screen.getByText('定制标题')).toBeDefined()
    expect(screen.getByText('定制描述内容')).toBeDefined()
  })

  it('shows params tags when params exist', () => {
    const paramMatch = {
      ...baseMatch,
      params: { keyword: '王者荣耀', category: '游戏' },
    }
    render(
      <BrowserRouter>
        <JumpCard match={paramMatch} onNavigate={() => {}} />
      </BrowserRouter>,
    )
    expect(screen.getByText(/keyword/)).toBeDefined()
    expect(screen.getByText(/category/)).toBeDefined()
  })
})
