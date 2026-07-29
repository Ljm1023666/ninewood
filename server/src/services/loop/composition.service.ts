// 回组合编排 · 自然回 V3
// 详见 docs/specs/NATURAL-LOOP-V3-ADR.md
import { prisma } from '../../lib/prisma.js'
import {
  LoopEventVisibility,
  LoopKind,
  LoopLinkRelation,
  LoopRunStatus,
  Prisma,
} from '@prisma/client'
import { getLoopExecutor } from './executors/index.js'
import { loopRunService } from './loop-run.service.js'
import { runForLoopRun } from './verification.service.js'
import { assertLoopSchema } from './schema-validator.js'
import {
  recordSettlementEligibility,
  prepayLoopRun,
  finalizeLoopSettlement,
} from './loop-economy.service.js'

export type RecipeFieldMap = Record<string, string>

export interface RecipeStep {
  /** 步骤键，事件与链路用 */
  key: string
  /** 执行的 LoopDefinition.code */
  definitionCode: string
  /** 与父运行的关系：主链 DELEGATE；旁路 TRIGGER */
  relation: 'DELEGATE' | 'TRIGGER'
  /** 是否必选（默认 true） */
  required?: boolean
  /** 从累计上下文映射到本步 input.fields */
  fieldMap?: RecipeFieldMap
}

export interface LoopRecipe {
  code: string
  title: string
  summary: string
  paths: string[]
  ioDoc: string
  steps: RecipeStep[]
}

/** 语义别名：本地模型接入前的确定性回退 */
const SEMANTIC_ALIASES: Record<string, string[]> = {
  text: ['text', 'description', 'content', 'body', 'title'],
  description: ['description', 'text', 'content', 'body'],
  title: ['title', 'name', 'headline'],
  paths: ['paths', 'tags', 'facets'],
  minPrice: ['minPrice', 'budget', 'price'],
  condensedText: ['condensedText', 'text', 'description', 'output'],
}

/** 内置组合路径（代码种子，不新增表） */
export const BUILTIN_RECIPES: LoopRecipe[] = [
  {
    code: 'builtin.compose.demand_ready',
    title: '需求就绪大回',
    summary: '口语 → 结构化字段 → 检索路径，两步地回串联并由天回核验。',
    paths: ['intent:需求整理', 'tag:需求结构化', 'tag:路径', 'cat:平台工具'],
    ioDoc:
      '输入：自然语言需求（title 或 description，可选预算）。\n' +
      '输出：标准字段 + 可检索 paths。\n' +
      '中间：structure 产出写入 paths 步；每步均有 required 天回验证。\n' +
      '用户视角：一条「把想法变成可发布需求」的开箱路径。',
    steps: [
      {
        key: 'structure',
        definitionCode: 'builtin.earth.demand.structure',
        relation: 'DELEGATE',
        fieldMap: {
          title: 'title',
          description: 'description',
          minPrice: 'minPrice',
        },
      },
      {
        key: 'paths',
        definitionCode: 'builtin.earth.demand.paths',
        relation: 'DELEGATE',
        fieldMap: {
          title: 'title',
          description: 'description',
          minPrice: 'minPrice',
          paths: 'paths',
          category: 'category',
          tags: 'tags',
        },
      },
    ],
  },
  {
    code: 'builtin.compose.text_ready',
    title: '文本精简并核验',
    summary: '精简长文本并按宣称压缩比接受天回核验——「双重剥夺判断权」样板。',
    paths: ['intent:文本精简', 'tag:写作', 'tag:降重预备', 'cat:内容工具'],
    ioDoc:
      '输入：text（必填）、claimedCompressionRatio（0–1，宣称至少压掉的比例）。\n' +
      '输出：condensedText、actualCompressionRatio、charCounts。\n' +
      '验证：天回比对实际压缩比是否 ≥ 宣称；不合格则整回 FAILED，不可自证成功。',
    steps: [
      {
        key: 'condense',
        definitionCode: 'builtin.earth.text.condense',
        relation: 'DELEGATE',
        fieldMap: {
          text: 'text',
          claimedCompressionRatio: 'claimedCompressionRatio',
        },
      },
    ],
  },
]

export function getRecipe(code: string): LoopRecipe | undefined {
  return BUILTIN_RECIPES.find((r) => r.code === code)
}

export function listRecipes(): LoopRecipe[] {
  return BUILTIN_RECIPES
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined
  if (!path.includes('.')) return obj[path]
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function resolveField(
  targetKey: string,
  sourcePath: string | undefined,
  ctx: Record<string, unknown>,
): unknown {
  if (sourcePath) {
    const direct = getByPath(ctx, sourcePath)
    if (direct !== undefined && direct !== null && direct !== '') return direct
  }
  const aliases = SEMANTIC_ALIASES[targetKey] ?? [targetKey]
  for (const alias of aliases) {
    const v = getByPath(ctx, alias)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

function buildStepFields(
  step: RecipeStep,
  ctx: Record<string, unknown>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  const map = step.fieldMap ?? {}
  const keys = Object.keys(map).length
    ? Object.keys(map)
    : Object.keys(ctx)
  for (const key of keys) {
    const value = resolveField(key, map[key], ctx)
    if (value !== undefined) fields[key] = value
  }
  return fields
}

function mergeOutcome(ctx: Record<string, unknown>, outcome: unknown): Record<string, unknown> {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) return ctx
  return { ...ctx, ...(outcome as Record<string, unknown>) }
}

/**
 * 运行组合路径：父 EARTH run + 子步 DELEGATE/TRIGGER 链路。
 */
export async function runRecipe(params: {
  recipeCode: string
  userId: string
  demandId?: string
  input?: Record<string, unknown>
  offeringId?: string
  billable?: boolean
  serviceAmount?: number
}): Promise<{
  runId: string
  status: LoopRunStatus
  outcome: Record<string, unknown>
  settlement?: { action: string }
  steps: Array<{ key: string; runId: string; status: string; code: string }>
}> {
  const recipe = getRecipe(params.recipeCode)
  if (!recipe) {
    throw Object.assign(new Error(`组合路径不存在: ${params.recipeCode}`), { status: 404 })
  }

  if (params.demandId) {
    const demand = await prisma.demand.findUnique({
      where: { id: params.demandId },
      select: { userId: true },
    })
    if (!demand) throw Object.assign(new Error('需求不存在'), { status: 404 })
    if (demand.userId !== params.userId) {
      throw Object.assign(new Error('无权对该需求运行此组合'), { status: 403 })
    }
  } else if (!params.input || Object.keys(params.input).length === 0) {
    throw Object.assign(new Error('需要提供 demandId 或 input'), { status: 400 })
  }

  let ctx: Record<string, unknown> = { ...(params.input ?? {}) }
  if (params.demandId) {
    const d = await prisma.demand.findUnique({ where: { id: params.demandId } })
    if (d) {
      ctx = {
        ...ctx,
        title: d.title,
        description: d.description,
        minPrice: d.minPrice != null ? Number(d.minPrice) : undefined,
        paths: d.paths,
        category: d.category,
        tags: d.tags,
        regionId: d.regionId,
        mediaUrls: d.mediaUrls,
      }
    }
  }

  const parentRunId = await loopRunService.create({
    definitionCode: recipe.code,
    loopKind: LoopKind.EARTH,
    initiatorRef: `user:${params.userId}`,
    offeringId: params.offeringId,
    demandId: params.demandId,
    inputJson: ctx as Prisma.InputJsonValue,
    expectedOutcome: { recipe: recipe.code, steps: recipe.steps.map((s) => s.key) },
    correlationId: undefined,
  })
  // correlationId 默认用父 run id
  await prisma.loopRun.update({
    where: { id: parentRunId },
    data: { correlationId: parentRunId },
  })

  await loopRunService.appendEvent(parentRunId, {
    type: 'COMPOSE_STARTED',
    actorRef: `user:${params.userId}`,
    visibility: LoopEventVisibility.ACTOR,
    payload: {
      recipe: recipe.code,
      stepCount: recipe.steps.length,
      billable: Boolean(params.billable),
    },
  })

  if (params.billable && params.offeringId && (params.serviceAmount ?? 0) > 0) {
    await prepayLoopRun({
      loopRunId: parentRunId,
      offeringId: params.offeringId,
      payerUserId: params.userId,
      serviceAmount: params.serviceAmount!,
    })
  }

  await loopRunService.transition(parentRunId, LoopRunStatus.EXECUTING)

  const stepResults: Array<{ key: string; runId: string; status: string; code: string }> = []
  let hardFail = false
  let inconclusive = false

  for (const step of recipe.steps) {
    const required = step.required !== false
    const exec = getLoopExecutor(step.definitionCode)
    const offering = await prisma.loopOffering.findFirst({
      where: {
        status: 'ACTIVE',
        definition: { code: step.definitionCode },
      },
      include: {
        definition: { select: { code: true, loopKind: true, inputSchema: true, outcomeSchema: true } },
        verificationContracts: { where: { isRequired: true }, select: { id: true } },
      },
    })

    const fields = buildStepFields(step, ctx)
    const childRunId = await loopRunService.create({
      definitionCode: step.definitionCode,
      loopKind: offering?.definition.loopKind ?? LoopKind.EARTH,
      initiatorRef: `user:${params.userId}`,
      offeringId: offering?.id,
      demandId: params.demandId,
      parentRunId,
      correlationId: parentRunId,
      inputJson: fields as Prisma.InputJsonValue,
      expectedOutcome: (offering?.definition.outcomeSchema as Prisma.InputJsonValue) ?? {},
    })

    const relation =
      step.relation === 'TRIGGER' ? LoopLinkRelation.TRIGGER : LoopLinkRelation.DELEGATE
    await prisma.loopLink.create({
      data: {
        sourceRunId: parentRunId,
        targetRunId: childRunId,
        relation,
        meta: { stepKey: step.key, fieldMap: step.fieldMap ?? {} },
      },
    })

    await loopRunService.appendEvent(parentRunId, {
      type: 'COMPOSE_STEP_STARTED',
      actorRef: `user:${params.userId}`,
      visibility: LoopEventVisibility.ACTOR,
      payload: { step: step.key, childRunId, code: step.definitionCode },
    })

    if (!exec) {
      await loopRunService.transition(childRunId, LoopRunStatus.FAILED, {
        actualOutcome: { error: '执行器未注册' },
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: LoopRunStatus.FAILED,
        code: step.definitionCode,
      })
      if (required) hardFail = true
      continue
    }

    if (
      offering?.definition.loopKind === LoopKind.EARTH &&
      (offering.verificationContracts?.length ?? 0) === 0
    ) {
      await loopRunService.transition(childRunId, LoopRunStatus.FAILED, {
        actualOutcome: { error: '地回尚未绑定必要的天回验证' },
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: LoopRunStatus.FAILED,
        code: step.definitionCode,
      })
      if (required) hardFail = true
      continue
    }

    try {
      assertLoopSchema(offering?.definition.inputSchema ?? {}, fields, '输入')
    } catch (err) {
      await loopRunService.transition(childRunId, LoopRunStatus.FAILED, {
        actualOutcome: { error: err instanceof Error ? err.message : '输入校验失败' },
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: LoopRunStatus.FAILED,
        code: step.definitionCode,
      })
      if (required) hardFail = true
      continue
    }

    await loopRunService.transition(childRunId, LoopRunStatus.EXECUTING)
    let execResult
    try {
      execResult = await exec.execute(
        {
          demandId: params.demandId,
          fields,
          endpointId: offering?.endpointId ?? undefined,
          claimSchema: (
            await prisma.verificationContract.findFirst({
              where: { offeringId: offering?.id, isRequired: true },
              select: { claimSchema: true },
            })
          )?.claimSchema,
        },
        { userId: params.userId, loopRunId: childRunId },
      )
    } catch (err) {
      await loopRunService.transition(childRunId, LoopRunStatus.FAILED, {
        actualOutcome: { error: err instanceof Error ? err.message : '执行失败' },
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: LoopRunStatus.FAILED,
        code: step.definitionCode,
      })
      if (required) hardFail = true
      continue
    }

    if (execResult.status !== 'SUCCEEDED') {
      const st =
        execResult.status === 'INCONCLUSIVE'
          ? LoopRunStatus.INCONCLUSIVE
          : LoopRunStatus.FAILED
      await loopRunService.transition(childRunId, st, {
        actualOutcome: execResult.outcome as Prisma.InputJsonValue,
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: st,
        code: step.definitionCode,
      })
      if (st === LoopRunStatus.FAILED && required) hardFail = true
      if (st === LoopRunStatus.INCONCLUSIVE && required) inconclusive = true
      continue
    }

    try {
      assertLoopSchema(
        offering?.definition.outcomeSchema ?? {},
        execResult.outcome,
        '输出',
      )
    } catch (err) {
      await loopRunService.transition(childRunId, LoopRunStatus.FAILED, {
        actualOutcome: execResult.outcome as Prisma.InputJsonValue,
      })
      stepResults.push({
        key: step.key,
        runId: childRunId,
        status: LoopRunStatus.FAILED,
        code: step.definitionCode,
      })
      if (required) hardFail = true
      continue
    }

    let finalStatus: LoopRunStatus = LoopRunStatus.SUCCEEDED
    await loopRunService.transition(childRunId, LoopRunStatus.VERIFYING, {
      actualOutcome: execResult.outcome as Prisma.InputJsonValue,
    })
    if (offering?.definition.loopKind === LoopKind.EARTH) {
      const verification = await runForLoopRun(childRunId)
      finalStatus =
        verification === 'PASSED'
          ? LoopRunStatus.SUCCEEDED
          : verification === 'FAILED'
            ? LoopRunStatus.FAILED
            : LoopRunStatus.INCONCLUSIVE
      await recordSettlementEligibility(childRunId, offering.id, verification === 'PASSED')
    }
    await loopRunService.transition(childRunId, finalStatus, {
      actualOutcome: execResult.outcome as Prisma.InputJsonValue,
    })

    ctx = mergeOutcome(ctx, execResult.outcome)
    stepResults.push({
      key: step.key,
      runId: childRunId,
      status: finalStatus,
      code: step.definitionCode,
    })
    if (finalStatus === LoopRunStatus.FAILED && required) hardFail = true
    if (finalStatus === LoopRunStatus.INCONCLUSIVE && required) inconclusive = true

    await loopRunService.appendEvent(parentRunId, {
      type: 'COMPOSE_STEP_FINISHED',
      actorRef: `user:${params.userId}`,
      visibility: LoopEventVisibility.ACTOR,
      payload: { step: step.key, childRunId, status: finalStatus },
    })

    if (hardFail) break
  }

  const parentStatus = hardFail
    ? LoopRunStatus.FAILED
    : inconclusive
      ? LoopRunStatus.INCONCLUSIVE
      : LoopRunStatus.SUCCEEDED

  const outcome = {
    recipe: recipe.code,
    steps: stepResults,
    result: ctx,
  }
  await loopRunService.transition(parentRunId, parentStatus, {
    actualOutcome: outcome as Prisma.InputJsonValue,
  })
  await loopRunService.appendEvent(parentRunId, {
    type: 'COMPOSE_FINISHED',
    actorRef: `user:${params.userId}`,
    visibility: LoopEventVisibility.ACTOR,
    payload: { status: parentStatus, steps: stepResults.map((s) => s.key) },
  })

  if (params.offeringId) {
    await recordSettlementEligibility(
      parentRunId,
      params.offeringId,
      parentStatus === LoopRunStatus.SUCCEEDED,
    )
  }

  // 父跑已写 ELIGIBLE/BLOCKED：capture 或退服务额+佣金；无预付则 noop
  const settled = await finalizeLoopSettlement(parentRunId)

  return {
    runId: parentRunId,
    status: parentStatus,
    outcome,
    settlement: { action: settled.action },
    steps: stepResults,
  }
}
