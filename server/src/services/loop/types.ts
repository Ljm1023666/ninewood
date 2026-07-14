// 共享类型 · 自然回（Natural Loop）
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3
import type {
  LoopKind,
  LoopRunStatus,
  LoopEventVisibility,
  ParticipantKind,
  CapabilityHostMode,
  CapabilityHealth,
  LoopLinkRelation,
  Prisma,
} from '@prisma/client';

export type {
  LoopKind,
  LoopRunStatus,
  LoopEventVisibility,
  ParticipantKind,
  CapabilityHostMode,
  CapabilityHealth,
  LoopLinkRelation,
};

/** 回事件写入输入 */
export interface LoopEventInput {
  type: string;
  actorRef: string;
  visibility?: LoopEventVisibility;
  payload?: Prisma.InputJsonValue;
  /** 幂等键：同一 (loopRunId, idempotencyKey) 不重复写入 */
  idempotencyKey?: string;
}

/** 回运行的公开视图（不含内部指标与敏感 payload） */
export interface LoopRunPublicView {
  id: string;
  loopKind: LoopKind;
  status: LoopRunStatus;
  initiatorRef: string;
  receiverRef: string | null;
  demandId: string | null;
  orderId: string | null;
  startedAt: Date;
  completedAt: Date | null;
}
