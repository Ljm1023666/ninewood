// 回执行器接口 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §5.3
import type { Prisma } from '@prisma/client';

export type ExecutorStatus = 'SUCCEEDED' | 'FAILED' | 'INCONCLUSIVE';

export interface LoopExecutor {
  definitionCode: string;
  execute(
    input: Record<string, unknown>,
    ctx: { userId?: string; loopRunId?: string },
  ): Promise<{
    status: ExecutorStatus;
    outcome: Prisma.InputJsonValue;
  }>;
}
