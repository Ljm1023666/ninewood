import { describe, expect, it, vi, afterEach } from 'vitest'

const originalLocation = window.location

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  })
})

function stubProtocol(protocol: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, protocol },
  })
}

describe('runtime-origin', () => {
  it('same-origin web uses relative /api', async () => {
    stubProtocol('https:')
    const m = await import('@/config/runtime-origin')
    expect(m.getApiOrigin()).toBe('')
    expect(m.getApiBaseURL()).toBe('/api')
    expect(m.getSocketURL()).toBe('/')
    expect(m.resolvePublicUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg')
  })

  it('file: protocol points to production domain (not localhost/IP)', async () => {
    stubProtocol('file:')
    const m = await import('@/config/runtime-origin')
    expect(m.getApiOrigin()).toBe(m.PRODUCTION_ORIGIN)
    expect(m.getApiBaseURL()).toBe(`${m.PRODUCTION_ORIGIN}/api`)
    expect(m.getSocketURL()).toBe(m.PRODUCTION_ORIGIN)
    expect(m.resolvePublicUrl('/uploads/a.jpg')).toBe(
      `${m.PRODUCTION_ORIGIN}/uploads/a.jpg`,
    )
  })

  it('VITE_API_ORIGIN overrides protocol detection', async () => {
    stubProtocol('https:')
    vi.stubEnv('VITE_API_ORIGIN', 'https://tothetomorrow.com/')
    const m = await import('@/config/runtime-origin')
    expect(m.getApiOrigin()).toBe('https://tothetomorrow.com')
    expect(m.getApiBaseURL()).toBe('https://tothetomorrow.com/api')
  })
})
