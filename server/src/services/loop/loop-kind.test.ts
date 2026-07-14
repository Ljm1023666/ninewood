import { describe, it, expect } from 'vitest';
import { deriveLoopKind } from './loop-kind.js';
import { LoopKind, ParticipantKind } from '@prisma/client';

describe('deriveLoopKind', () => {
  it('人 + 人 → 人回 (HUMAN)', () => {
    expect(deriveLoopKind(ParticipantKind.HUMAN, ParticipantKind.HUMAN)).toBe(LoopKind.HUMAN);
  });

  it('接口 + 接口 → 天回 (HEAVEN)', () => {
    expect(deriveLoopKind(ParticipantKind.INTERFACE, ParticipantKind.INTERFACE)).toBe(LoopKind.HEAVEN);
  });

  it('人 + 接口 → 地回 (EARTH)', () => {
    expect(deriveLoopKind(ParticipantKind.HUMAN, ParticipantKind.INTERFACE)).toBe(LoopKind.EARTH);
  });

  it('接口 + 人 → 地回 (EARTH)', () => {
    expect(deriveLoopKind(ParticipantKind.INTERFACE, ParticipantKind.HUMAN)).toBe(LoopKind.EARTH);
  });

  it('对称性：参数顺序不影响地回判定', () => {
    expect(deriveLoopKind(ParticipantKind.HUMAN, ParticipantKind.INTERFACE)).toBe(
      deriveLoopKind(ParticipantKind.INTERFACE, ParticipantKind.HUMAN),
    );
  });
});
