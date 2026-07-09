import { describe, it, expect } from 'vitest'
import { groupPathsForDisplay } from '../path-display'

describe('groupPathsForDisplay', () => {
  it('同值 kw+tag 合并为一条', () => {
    const groups = groupPathsForDisplay(['tag:王者荣耀', 'kw:王者荣耀', 'cat:游戏'])
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({
      kind: 'merged',
      value: '王者荣耀',
      dualKwTag: true,
    })
    expect(groups[0].paths.sort()).toEqual(['kw:王者荣耀', 'tag:王者荣耀'])
    expect(groups[1]).toMatchObject({ kind: 'single', value: '游戏' })
  })

  it('仅 tag 不合并', () => {
    const groups = groupPathsForDisplay(['tag:react'])
    expect(groups).toHaveLength(1)
    expect(groups[0].dualKwTag).toBe(false)
  })
})
