// 回运行服务 · 自然回（影子）
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3 / §4
import { prisma } from '../../lib/prisma.js';
import { LoopKind, LoopRunStatus, LoopEventVisibility, Prisma } from '@prisma/client';
import type { LoopEventInput } from './types.js';

const TERMINAL: LoopRunStatus[] = [
  LoopRunStatus.SUCCEEDED,
  LoopRunStatus.CLOSED,
  LoopRunStatus.FAILED,
  LoopRunStatus.INCONCLUSIVE,
];

function completedAtFor(status: LoopRunStatus): Date | undefined {
  return TERMINAL.includes(status) ? new Date() : undefined;
}

export const loopRunService = {
  /** 创建一次回运行（默认 TRIGGERED） */
  async create(params: {
    definitionCode: string;
    loopKind: LoopKind;
    initiatorRef: string;
    receiverRef?: string;
    inputJson?: Prisma.InputJsonValue;
    expectedOutcome?: Prisma.InputJsonValue;
    demandId?: string;
    orderId?: string;
    offeringId?: string;
    parentRunId?: string;
    correlationId?: string;
  }): Promise<string> {
    const def = await prisma.loopDefinition.findUnique({ where: { code: params.definitionCode } });
    if (!def) throw Object.assign(new Error(`回定义不存在: ${params.definitionCode}`), { status: 400 });

    const run = await prisma.loopRun.create({
      data: {
        definitionId: def.id,
        loopKind: params.loopKind,
        status: LoopRunStatus.TRIGGERED,
        initiatorRef: params.initiatorRef,
        receiverRef: params.receiverRef ?? null,
        inputJson: params.inputJson ?? {},
        expectedOutcome: params.expectedOutcome ?? {},
        demandId: params.demandId ?? null,
        orderId: params.orderId ?? null,
        offeringId: params.offeringId ?? null,
        parentRunId: params.parentRunId ?? null,
        correlationId: params.correlationId ?? null,
      },
    });
    return run.id;
  },

  /** 写入一条回事件（幂等键去重由唯一约束保证） */
  async appendEvent(loopRunId: string, input: LoopEventInput): Promise<void> {
    await prisma.loopEvent.create({
      data: {
        loopRunId,
        type: input.type,
        actorRef: input.actorRef,
        visibility: input.visibility ?? LoopEventVisibility.SYSTEM_ONLY,
        payload: input.payload ?? {},
        idempotencyKey: input.idempotencyKey ?? null,
      },
    });
  },

  /** 状态迁移；可附带 receiverRef / orderId / actualOutcome 补写 */
  async transition(
    loopRunId: string,
    status: LoopRunStatus,
    patch?: { receiverRef?: string; orderId?: string; actualOutcome?: Prisma.InputJsonValue },
  ): Promise<void> {
    await prisma.loopRun.update({
      where: { id: loopRunId },
      data: {
        status,
        completedAt: completedAtFor(status),
        ...(patch?.receiverRef !== undefined ? { receiverRef: patch.receiverRef } : {}),
        ...(patch?.orderId !== undefined ? { orderId: patch.orderId } : {}),
        ...(patch?.actualOutcome !== undefined ? { actualOutcome: patch.actualOutcome } : {}),
      },
    });
  },

  /** 找到某需求下未关闭的回运行（补建/推进用） */
  async findOpenByDemand(demandId: string): Promise<{ id: string } | null> {
    return prisma.loopRun.findFirst({
      where: { demandId, status: { notIn: TERMINAL } },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  },

  /** 列出某需求的回运行（公开视图，不含事件明细） */
  async listByDemand(demandId: string) {
    return prisma.loopRun.findMany({
      where: { demandId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        loopKind: true,
        status: true,
        initiatorRef: true,
        receiverRef: true,
        demandId: true,
        orderId: true,
        startedAt: true,
        completedAt: true,
        definition: { select: { code: true, name: true, loopKind: true } },
      },
    });
  },

  /** 列出当前用户参与的全部回运行：需求方、接单方或主动发起方。 */
  async listMine(
    userId: string,
    filters: {
    loopKinds?: LoopKind[];
    status?: LoopRunStatus;
      sort?: 'recent' | 'completion' | 'success';
      limit?: number;
    } = {},
  ) {
    const [demands, orders] = await Promise.all([
      prisma.demand.findMany({ where: { userId }, select: { id: true } }),
      prisma.order.findMany({
        where: { OR: [{ providerId: userId }, { requesterId: userId }] },
        select: { demandId: true, id: true },
      }),
    ]);
    const demandIds = Array.from(
      new Set([...demands.map((row) => row.id), ...orders.map((row) => row.demandId)]),
    );
    const orderIds = orders.map((row) => row.id);
    const relationFilters = [
      { initiatorRef: `user:${userId}` },
      ...(demandIds.length ? [{ demandId: { in: demandIds } }] : []),
      ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
    ];
    if (relationFilters.length === 0) return { items: [], summary: emptyMineSummary() };

    const rows = await prisma.loopRun.findMany({
      where: {
        OR: relationFilters,
        ...(filters.loopKinds?.length ? { loopKind: { in: filters.loopKinds } } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        definition: { select: { code: true, name: true, loopKind: true, executionMode: true } },
        offering: { select: { id: true, title: true } },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { type: true, payload: true, createdAt: true },
        },
        _count: { select: { events: true } },
      },
      take: Math.min(Math.max(filters.limit ?? 100, 1), 200),
      orderBy: { createdAt: 'desc' },
    });

    const items = rows.map((row) => ({
      id: row.id,
      kind: row.loopKind,
      status: row.status,
      progress: progressForStatus(row.status),
      definition: row.definition,
      offering: row.offering,
      demandId: row.demandId,
      orderId: row.orderId,
      initiatorRef: row.initiatorRef,
      receiverRef: row.receiverRef,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      eventCount: row._count.events,
      latestEvent: row.events[0] ?? null,
    }));

    if (filters.sort === 'completion') {
      items.sort((a, b) => b.progress - a.progress || b.createdAt.getTime() - a.createdAt.getTime());
    } else if (filters.sort === 'success') {
      items.sort(
        (a, b) =>
          Number(isSuccessfulStatus(b.status)) - Number(isSuccessfulStatus(a.status)) ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
    }

    return {
      items,
      summary: summarizeMine(items),
    };
  },

  async getById(id: string) {
    return prisma.loopRun.findUnique({
      where: { id },
      include: {
        definition: {
          select: {
            code: true,
            name: true,
            description: true,
            loopKind: true,
            executionMode: true,
            inputSchema: true,
            outcomeSchema: true,
          },
        },
        offering: { select: { id: true, title: true, summary: true } },
        events: { orderBy: { createdAt: 'asc' } },
        verificationRuns: {
          orderBy: { createdAt: 'asc' },
          include: {
            contract: {
              include: { verifierEndpoint: { select: { id: true, code: true, name: true } } },
            },
          },
        },
        linksOut: {
          orderBy: { createdAt: 'asc' },
          include: {
            targetRun: {
              include: {
                definition: { select: { code: true, name: true, loopKind: true } },
              },
            },
          },
        },
        linksIn: {
          orderBy: { createdAt: 'asc' },
          include: {
            sourceRun: {
              include: {
                definition: { select: { code: true, name: true, loopKind: true } },
              },
            },
          },
        },
      },
    });
  },

  /** 回事件列表；非 admin 默认不含 SYSTEM_ONLY */
  async getEvents(id: string, includeSystemOnly: boolean) {
    return prisma.loopEvent.findMany({
      where: includeSystemOnly
        ? { loopRunId: id }
        : { loopRunId: id, visibility: { not: LoopEventVisibility.SYSTEM_ONLY } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        actorRef: true,
        visibility: true,
        payload: true,
        createdAt: true,
      },
    });
  },
};

function progressForStatus(status: LoopRunStatus): number {
  return {
    TRIGGERED: 8,
    MATCHING: 24,
    EXECUTING: 48,
    WAITING_HUMAN: 56,
    VERIFYING: 78,
    SUCCEEDED: 100,
    FAILED: 100,
    INCONCLUSIVE: 100,
    COMPENSATING: 86,
    CLOSED: 100,
  }[status];
}

function isSuccessfulStatus(status: LoopRunStatus): boolean {
  return status === LoopRunStatus.SUCCEEDED || status === LoopRunStatus.CLOSED;
}

function emptyMineSummary() {
  const byKind: Record<
    LoopKind,
    { total: number; active: number; succeeded: number; successRate: number | null }
  > = {
    HUMAN: { total: 0, active: 0, succeeded: 0, successRate: null },
    EARTH: { total: 0, active: 0, succeeded: 0, successRate: null },
    HEAVEN: { total: 0, active: 0, succeeded: 0, successRate: null },
  };
  return {
    total: 0,
    active: 0,
    succeeded: 0,
    failed: 0,
    successRate: null as number | null,
    byKind,
  };
}

function summarizeMine(
  items: Array<{ kind: LoopKind; status: LoopRunStatus }>,
) {
  const result = emptyMineSummary();
  result.total = items.length;
  result.active = items.filter((item) => !TERMINAL.includes(item.status)).length;
  result.succeeded = items.filter((item) => isSuccessfulStatus(item.status)).length;
  result.failed = items.filter(
    (item) => item.status === LoopRunStatus.FAILED || item.status === LoopRunStatus.INCONCLUSIVE,
  ).length;
  result.successRate = result.total ? result.succeeded / result.total : null;
  for (const kind of [LoopKind.HUMAN, LoopKind.EARTH, LoopKind.HEAVEN]) {
    const bucket = items.filter((item) => item.kind === kind);
    const succeeded = bucket.filter((item) => isSuccessfulStatus(item.status)).length;
    result.byKind[kind] = {
      total: bucket.length,
      active: bucket.filter((item) => !TERMINAL.includes(item.status)).length,
      succeeded,
      successRate: bucket.length ? succeeded / bucket.length : null,
    };
  }
  return result;
}
