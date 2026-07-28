// 开放地回供给 · 自然回 V3
// 详见 docs/specs/NATURAL-LOOP-V3-ADR.md §3
import { prisma } from '../../lib/prisma.js'
import {
  CapabilityHealth,
  CapabilityHostMode,
  LoopExecutionMode,
  LoopKind,
  ParticipantKind,
  Prisma,
} from '@prisma/client'
import { getLoopExecutor } from './executors/index.js'
import { toPublicOffering } from './offering.service.js'
import {
  LOOP_MONITOR_FEE_CAP_RATE,
  LOOP_PLATFORM_FEE_RATE,
} from './loop-economy.service.js'

export type CreateUserOfferingInput = {
  title: string
  summary?: string
  paths?: string[]
  /** 外部调用基址；健康检查用 */
  endpointUrl?: string
  inputSchema?: Record<string, unknown>
  outcomeSchema?: Record<string, unknown>
  ioDoc?: string
  /** required 天回 verifier 的 CapabilityEndpoint.code */
  verifierCodes?: string[]
  claimedServiceAmount?: number
  verificationFee?: number
}

function slugify(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'offering'
}

/**
 * 用户上架 EXTERNAL_API 地回。
 * - 必须至少绑定一个 required 天回
 * - 初始 health=UNKNOWN，不进推荐池，直到 health-check 成功
 */
export async function createUserOffering(userId: string, input: CreateUserOfferingInput) {
  const title = input.title?.trim()
  if (!title || title.length < 2) {
    throw Object.assign(new Error('标题至少 2 个字'), { status: 400 })
  }

  const verifierCodes = (input.verifierCodes?.length
    ? input.verifierCodes
    : ['builtin.heaven.validate.demand_fields']
  ).filter(Boolean)

  const verifiers = await prisma.capabilityEndpoint.findMany({
    where: { code: { in: verifierCodes } },
  })
  if (verifiers.length === 0) {
    throw Object.assign(new Error('至少需要一个有效的天回验证器'), { status: 400 })
  }

  const code = `user.${userId.slice(0, 8)}.${slugify(title)}.${Date.now().toString(36)}`
  const paths = input.paths?.length ? input.paths : [`intent:${title.slice(0, 12)}`]
  const inputSchema = (input.inputSchema ?? {
    type: 'object',
    properties: {
      text: { type: 'string', minLength: 1, description: '需求或待处理文本' },
    },
    required: ['text'],
    additionalProperties: true,
  }) as Prisma.InputJsonValue
  const outcomeSchema = (input.outcomeSchema ?? {
    type: 'object',
    additionalProperties: true,
  }) as Prisma.InputJsonValue

  const description = [
    input.summary?.trim() || title,
    '',
    '—— IO 文档 ——',
    input.ioDoc?.trim() ||
      '输入：见 inputSchema。输出：见 outcomeSchema。未写文档的回会变成孤岛。',
  ].join('\n')

  const result = await prisma.$transaction(async (tx) => {
    const def = await tx.loopDefinition.create({
      data: {
        code,
        name: title,
        description,
        loopKind: LoopKind.EARTH,
        initiatorKind: ParticipantKind.HUMAN,
        receiverKind: ParticipantKind.INTERFACE,
        executionMode: LoopExecutionMode.HYBRID,
        inputSchema,
        outcomeSchema,
        isBuiltin: false,
        isPublic: true,
      },
    })

    const endpoint = await tx.capabilityEndpoint.create({
      data: {
        code,
        name: title,
        ownerType: 'USER',
        ownerId: userId,
        hostMode: CapabilityHostMode.EXTERNAL_API,
        executionMode: LoopExecutionMode.HYBRID,
        paths,
        inputSchema,
        outputSchema: outcomeSchema,
        healthStatus: CapabilityHealth.UNKNOWN,
        capacityJson: input.endpointUrl
          ? ({ url: input.endpointUrl } as Prisma.InputJsonValue)
          : undefined,
        pricePolicyJson: {
          platformFeeRate: LOOP_PLATFORM_FEE_RATE,
          monitorFeeCapRate: LOOP_MONITOR_FEE_CAP_RATE,
          verificationFee: input.verificationFee ?? 0,
          claimedServiceAmount: input.claimedServiceAmount ?? null,
          currency: 'POINT',
        } as Prisma.InputJsonValue,
        successRatePublic: false,
      },
    })

    const offering = await tx.loopOffering.create({
      data: {
        definitionId: def.id,
        endpointId: endpoint.id,
        title,
        summary: input.summary?.trim() || null,
        paths,
        status: 'ACTIVE',
        requiresVerification: true,
      },
    })

    for (const v of verifiers) {
      await tx.verificationContract.create({
        data: {
          offeringId: offering.id,
          verifierEndpointId: v.id,
          claimSchema: {},
          isRequired: true,
        },
      })
    }

    return { def, endpoint, offering }
  })

  return retrieveOwnedOffering(result.offering.id, userId)
}

export async function listUserOfferings(userId: string) {
  const rows = await prisma.loopOffering.findMany({
    where: {
      endpoint: { ownerType: 'USER', ownerId: userId },
    },
    include: {
      endpoint: {
        select: {
          healthStatus: true,
          hostMode: true,
          successRatePublic: true,
          ownerType: true,
          ownerId: true,
          capacityJson: true,
          pricePolicyJson: true,
        },
      },
      definition: {
        select: {
          loopKind: true,
          code: true,
          name: true,
          description: true,
          inputSchema: true,
          outcomeSchema: true,
        },
      },
      verificationContracts: {
        include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return rows.map((o) => toPublicOffering(o))
}

async function retrieveOwnedOffering(id: string, userId: string) {
  const o = await prisma.loopOffering.findUnique({
    where: { id },
    include: {
      endpoint: {
        select: {
          healthStatus: true,
          hostMode: true,
          successRatePublic: true,
          ownerType: true,
          ownerId: true,
          capacityJson: true,
          pricePolicyJson: true,
        },
      },
      definition: {
        select: {
          loopKind: true,
          code: true,
          name: true,
          description: true,
          inputSchema: true,
          outcomeSchema: true,
        },
      },
      verificationContracts: {
        include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
      },
    },
  })
  if (!o) throw Object.assign(new Error('方案不存在'), { status: 404 })
  if (o.endpoint?.ownerType !== 'USER' || o.endpoint.ownerId !== userId) {
    throw Object.assign(new Error('无权操作该方案'), { status: 403 })
  }
  return toPublicOffering(o)
}

export async function setUserOfferingStatus(
  userId: string,
  offeringId: string,
  status: 'ACTIVE' | 'PAUSED' | 'DELISTED',
) {
  await retrieveOwnedOffering(offeringId, userId)
  await prisma.loopOffering.update({ where: { id: offeringId }, data: { status } })
  return retrieveOwnedOffering(offeringId, userId)
}

/**
 * 对用户 EXTERNAL_API 做健康探测；成功则 ONLINE 并进入推荐资格。
 * 无 URL 时标记 DEGRADED（需补地址），不伪造 ONLINE。
 */
export async function healthCheckUserOffering(userId: string, offeringId: string) {
  const offering = await prisma.loopOffering.findUnique({
    where: { id: offeringId },
    include: {
      endpoint: true,
      definition: { select: { code: true } },
    },
  })
  if (!offering) throw Object.assign(new Error('方案不存在'), { status: 404 })
  if (offering.endpoint?.ownerType !== 'USER' || offering.endpoint.ownerId !== userId) {
    throw Object.assign(new Error('无权操作该方案'), { status: 403 })
  }

  const capacity = (offering.endpoint.capacityJson as { url?: string } | null) ?? {}
  const url = capacity.url
  const ping = getLoopExecutor('builtin.heaven.health.endpoint_ping')
  if (!ping) {
    throw Object.assign(new Error('健康检查执行器未注册'), { status: 500 })
  }

  const r = await ping.execute(
    {
      endpointId: offering.endpoint.id,
      hostMode: offering.endpoint.hostMode,
      url,
    },
    { loopRunId: '' },
  )

  const health =
    (r.outcome as { healthStatus?: string } | undefined)?.healthStatus ??
    (url ? 'DEGRADED' : 'UNKNOWN')

  await prisma.capabilityEndpoint.update({
    where: { id: offering.endpoint.id },
    data: {
      healthStatus: health as CapabilityHealth,
      healthCheckedAt: new Date(),
    },
  })

  return {
    offeringId,
    healthStatus: health,
    outcome: r.outcome,
    recommendable: health === 'ONLINE',
  }
}
