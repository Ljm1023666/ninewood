// 能力接口服务 · 自然回
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §3 / §5.3
import { prisma } from '../../lib/prisma.js';
import { CapabilityHostMode, CapabilityHealth } from '@prisma/client';

/**
 * 为每个 UserTag 投影为 CapabilityEndpoint（读模型升级，影子优先）。
 *
 * - paths 含 `tag:<tagName>` + 可选 `rgn:<regionId>`
 * - 幂等：按 `usertag:<userId>:<tagName>` code 去重（upsert）
 *
 * 不改 UserTag 主表，也不动 Demand/Order 主路径（宪法 #5）。
 */
export async function projectFromUserTag(
  userId: string,
): Promise<{ created: number; updated: number; total: number }> {
  const tags = await prisma.userTag.findMany({ where: { userId } });
  let created = 0;
  let updated = 0;

  for (const tag of tags) {
    const code = `usertag:${userId}:${tag.tagName}`;
    const paths = ['tag:' + tag.tagName, ...(tag.regionId != null ? [`rgn:${tag.regionId}`] : [])];

    const existing = await prisma.capabilityEndpoint.findUnique({ where: { code } });
    if (!existing) {
      await prisma.capabilityEndpoint.create({
        data: {
          code,
          name: tag.tagName,
          ownerType: 'USER',
          ownerId: userId,
          hostMode: CapabilityHostMode.EXTERNAL_API,
          executionMode: 'HYBRID',
          paths,
          healthStatus: CapabilityHealth.UNKNOWN,
          sourceUserTagId: tag.id,
        },
      });
      created++;
    } else {
      await prisma.capabilityEndpoint.update({
        where: { code },
        data: { name: tag.tagName, paths, sourceUserTagId: tag.id },
      });
      updated++;
    }
  }

  return { created, updated, total: tags.length };
}

/** 列出某用户的投影能力接口（我的接口） */
export async function listUserEndpoints(userId: string) {
  return prisma.capabilityEndpoint.findMany({
    where: { ownerType: 'USER', ownerId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      paths: true,
      hostMode: true,
      healthStatus: true,
      sourceUserTagId: true,
      createdAt: true,
    },
  });
}
