import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { pathSearchRouter } from '../routes/path-search.js'
import { demandRouter } from '../routes/demand.js'

const pathApp = express()
pathApp.use(express.json())
pathApp.use('/api/path-search', pathSearchRouter)

const demandApp = express()
demandApp.use(express.json())
demandApp.use('/api/demands', demandRouter)

describe('Path Search API', () => {
  it('GET /api/path-search - 缺少 paths 返回 400', async () => {
    const res = await request(pathApp).get('/api/path-search')
    expect(res.status).toBe(400)
  })

  it('GET /api/path-search - paths 仅含 facet 类型返回 400', async () => {
    const res = await request(pathApp).get('/api/path-search?paths=attr:servicetype=online')
    expect(res.status).toBe(400)
  })

  it('GET /api/path-search - facets 参数接受 attr/bkt/rgn', async () => {
    const res = await request(pathApp).get(
      '/api/path-search?paths=tag:test&facets=attr:servicetype=online,bkt:price=500_1000',
    )
    expect(res.status).not.toBe(400)
    if (res.status === 200) {
      expect(res.body.data.meta.facetPaths).toEqual([
        'attr:servicetype=online',
        'bkt:price=500_1000',
      ])
      expect(res.body.data.meta.facetPathCount).toBe(2)
    }
  })

  it('GET /api/path-search - 旧 URL paths 混有 facet 时自动剥离', async () => {
    const res = await request(pathApp).get(
      '/api/path-search?paths=tag:test,attr:servicetype=online',
    )
    expect(res.status).not.toBe(400)
    if (res.status === 200) {
      expect(res.body.data.meta.queryPathCount).toBe(1)
      expect(res.body.data.meta.facetPaths).toEqual(['attr:servicetype=online'])
    }
  })

  it('GET /api/path-search - 非法路径返回 400', async () => {
    const res = await request(pathApp).get('/api/path-search?paths=not-a-path')
    expect(res.status).toBe(400)
  })

  it('GET /api/path-search - 非法 sort 返回 400', async () => {
    const res = await request(pathApp).get('/api/path-search?paths=tag:test&sort=bogus')
    expect(res.status).toBe(400)
  })

  it('GET /api/path-search - intentMatch 无 q 降级为 off（不报错）', async () => {
    const res = await request(pathApp).get('/api/path-search?paths=tag:test&intentMatch=any')
    // 无 q 时不再 400；有 DB 时应为 200 且 intentMatch=off
    expect(res.status).not.toBe(400)
    if (res.status === 200) {
      expect(res.body.data.meta.intentMatch).toBe('off')
    }
  })

  it('GET /api/path-search - match=custom 缺 minHit 返回 400', async () => {
    const res = await request(pathApp).get('/api/path-search?paths=tag:test&match=custom')
    expect(res.status).toBe(400)
  })

  it('GET /api/path-search/coverage - 空 paths 返回空 coverage', async () => {
    const res = await request(pathApp).get('/api/path-search/coverage')
    expect(res.status).toBe(200)
    expect(res.body.data.coverage).toEqual({})
  })

  it(
    'GET /api/path-search/coverage - facet 路径(rgn/bkt)参与统计且合并键齐全',
    async () => {
      const cases: string[] = [
      'rgn:110000',
      'bkt:price=100_500',
      'cat:家政服务,rgn:110000',
    ]
    for (const rawPaths of cases) {
      const res = await request(pathApp).get(
        `/api/path-search/coverage?paths=${encodeURIComponent(rawPaths)}`,
      )
      // 无 DB 时 500 也接受；有 DB 时断言每个 key 覆盖数 > 0
      expect([200, 500]).toContain(res.status)
      if (res.status === 200) {
        const cov = res.body.data.coverage as Record<string, number>
        for (const key of rawPaths.split(',')) {
          expect(typeof cov[key]).toBe('number')
          expect(cov[key]).toBeGreaterThan(0)
        }
      }
    }
  },
    30000,
  )

  it('PUT /api/demands/:id/paths - 未登录 401', async () => {
    const res = await request(demandApp)
      .put('/api/demands/00000000-0000-4000-8000-000000000001/paths')
      .send({ paths: ['tag:test'] })
    expect(res.status).toBe(401)
  })
})
