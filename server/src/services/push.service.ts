import { prisma } from '../lib/prisma.js';
import type { Server as SocketIOServer } from 'socket.io';
import { matchAndPush, shouldReceivePush } from './push-engine.js';
import { canTakeOverNotificationTraffic } from '../config/notification-sovereignty.js';

export const pushService = {
  /**
   * 执行推送：匹配服务者并发送通知
   * 主权开启时委托 matchAndPush（DEMAND_MATCHED 决策链）
   */
  async executePush(demandId: string, io: SocketIOServer) {
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) {
      throw Object.assign(new Error('需求不存在'), { status: 404 });
    }
    if (!demand.pushConfig) {
      throw Object.assign(new Error('请先配置推送条件'), { status: 400 });
    }

    const config = demand.pushConfig as {
      tagName?: string;
      keywords?: string[];
      ageRanges?: string[];
      tags?: string[];
    };

    if (canTakeOverNotificationTraffic('DEMAND_MATCHED')) {
      const tags =
        config.tags?.length
          ? config.tags
          : config.tagName
            ? [config.tagName]
            : demand.tagName
              ? [demand.tagName]
              : demand.tags || [];
      const result = await matchAndPush(
        demandId,
        {
          tags,
          regions: demand.regionId ? [demand.regionId] : undefined,
          excludeKeywords: config.keywords || [],
        },
        io,
      );
      return {
        matched: result.totalMatched,
        unblocked: result.totalMatched,
        sent: result.totalSent,
        rejected: result.rejectReasons,
        sovereignty: true,
      };
    }

    // ── Legacy ──
    const matchTag = config.tagName || demand.tagName;
    const where = pushService.buildMatchConditions(config);
    if (!where.serviceTags && matchTag) {
      where.serviceTags = { hasSome: [matchTag] };
    }

    const candidates = await prisma.user.findMany({
      where,
      select: { id: true, serviceTags: true, pushBlocklist: true },
      take: 500,
    });

    const unblocked = candidates.filter((u) => {
      const blocklist = (u.pushBlocklist || {}) as { keywords?: string[]; ageRanges?: string[] };
      return !pushService.isBlocked(blocklist, {
        title: demand.title,
        description: demand.description,
      });
    });

    const rejectReasons: Record<string, number> = {};
    const accepted: typeof unblocked = [];
    for (const user of unblocked) {
      const { accept, reason } = await shouldReceivePush(user.id, {
        tags: demand.tags || [],
        regions: demand.regionId ? [demand.regionId] : [],
        excludeKeywords: config.keywords || [],
      });
      if (accept) {
        accepted.push(user);
      } else {
        rejectReasons[reason || 'UNKNOWN'] = (rejectReasons[reason || 'UNKNOWN'] || 0) + 1;
      }
    }

    for (const user of accepted) {
      try {
        io.to(`user:${user.id}`).emit('push:new_demand', {
          demandId: demand.id,
          title: demand.title,
          tagName: demand.tagName,
          regionId: demand.regionId,
          pushedAt: new Date().toISOString(),
        });
      } catch {
        // 单个用户推送失败不阻塞整体流程
      }
    }

    return {
      matched: candidates.length,
      unblocked: unblocked.length,
      sent: accepted.length,
      rejected: rejectReasons,
      sovereignty: false,
    };
  },

  buildMatchConditions(pushConfig: { tags?: string[]; keywords?: string[]; ageRanges?: string[] }) {
    const where: any = { isBusy: false };
    if (pushConfig.tags?.length) {
      where.serviceTags = { hasSome: pushConfig.tags };
    }
    return where;
  },

  isBlocked(
    blocklist: { tags?: string[]; keywords?: string[]; ageRanges?: string[] },
    demand: { tags?: string[]; title?: string; description?: string },
  ) {
    if (blocklist.tags?.length && demand.tags?.length) {
      const isTagBlocked = blocklist.tags.some((t) => demand.tags!.includes(t));
      if (isTagBlocked) return true;
    }

    if (blocklist.keywords?.length) {
      const text = `${demand.title || ''} ${demand.description || ''}`.toLowerCase();
      const isKeywordBlocked = blocklist.keywords.some((kw) =>
        text.includes(kw.toLowerCase()),
      );
      if (isKeywordBlocked) return true;
    }

    return false;
  },
};
