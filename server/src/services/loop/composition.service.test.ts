import { describe, expect, it } from 'vitest'
import { BUILTIN_RECIPES, getRecipe } from './composition.service.js'
import { LOOP_MONITOR_FEE_CAP_RATE, LOOP_PLATFORM_FEE_RATE } from './loop-economy.service.js'
import { getLoopExecutor } from './executors/index.js'
import './executors/index.js'

describe('natural loop V3 · recipes', () => {
  it('内置组合路径齐全且步骤引用真实定义', () => {
    expect(BUILTIN_RECIPES.length).toBeGreaterThanOrEqual(2)
    const ready = getRecipe('builtin.compose.demand_ready')
    expect(ready?.steps.map((s) => s.definitionCode)).toEqual([
      'builtin.earth.demand.structure',
      'builtin.earth.demand.paths',
    ])
    expect(ready?.steps.every((s) => s.relation === 'DELEGATE')).toBe(true)
  })

  it('文本精简执行器产出可被天回核验的字段', async () => {
    const earth = getLoopExecutor('builtin.earth.text.condense')
    const heaven = getLoopExecutor('builtin.heaven.validate.text_claim')
    expect(earth).toBeTruthy()
    expect(heaven).toBeTruthy()

    const text =
      '这是一段很长的测试文本。这是一段很长的测试文本。我们希望压缩掉重复内容。最终只保留关键信息。'
    const ran = await earth!.execute(
      {
        fields: { text, claimedCompressionRatio: 0.1 },
        claimSchema: { minCompressionRatio: 0.1 },
      },
      { loopRunId: 'test' },
    )
    expect(ran.status).toBe('SUCCEEDED')
    const outcome = ran.outcome as Record<string, unknown>
    expect(String(outcome.condensedText).length).toBeLessThan(text.length)
    expect(Number(outcome.actualCompressionRatio)).toBeGreaterThan(0)

    const passed = await heaven!.execute(
      {
        parentOutcome: outcome,
        claimSchema: { minCompressionRatio: 0.1 },
      },
      { loopRunId: 'verify' },
    )
    expect(passed.status).toBe('SUCCEEDED')

    const failed = await heaven!.execute(
      {
        parentOutcome: { ...outcome, claimedCompressionRatio: 0.99 },
        claimSchema: { minCompressionRatio: 0.15 },
      },
      { loopRunId: 'verify-fail' },
    )
    expect(failed.status).toBe('FAILED')
  })

  it('经济骨架默认费率符合理念 5% / 1%', () => {
    expect(LOOP_PLATFORM_FEE_RATE).toBe(0.05)
    expect(LOOP_MONITOR_FEE_CAP_RATE).toBe(0.01)
  })
})
