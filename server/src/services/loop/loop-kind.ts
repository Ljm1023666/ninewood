// 回类型推导 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3.1
import { LoopKind, ParticipantKind } from '@prisma/client';

/**
 * 推导回类型（平台宪法：四类对接压缩为三类）。
 *
 * - 人 + 人        → 人回 (HUMAN)
 * - 接口 + 接口    → 天回 (HEAVEN)
 * - 人 ↔ 接口      → 地回 (EARTH)
 */
export function deriveLoopKind(a: ParticipantKind, b: ParticipantKind): LoopKind {
  if (a === ParticipantKind.HUMAN && b === ParticipantKind.HUMAN) return LoopKind.HUMAN;
  if (a === ParticipantKind.INTERFACE && b === ParticipantKind.INTERFACE) return LoopKind.HEAVEN;
  return LoopKind.EARTH;
}
