import { prisma } from '../lib/prisma.js';
import type { Server as SocketIOServer } from 'socket.io';
import { shouldReceivePush } from './push-engine.js';

export const pushService = {
  /**
   * 执行推送：匹配服务者并发送通知
   * @returns 匹配到的用户数量
   */
  async executePush(demandId: string, io: SocketIOServer) {
    // 1. 读取需求（含 pushConfig）
    const demand = await prisma.demand.findUnique({ where: { id: demandId } });
    if (!demand) {
      throw Object.assign(new Error('需求不存在'), { status: 404 });
    }
    // 2. 如果没有 pushConfig，抛错
    if (!demand.pushConfig) {
      throw Object.assign(new Error('请先配置推送条件'), { status: 400 });
    }

    const config = demand.pushConfig as { tagName?: string; keywords?: string[]; ageRanges?: string[] };

    // 3. 构建匹配条件：使用 pushConfig 或 demand 的 tagName
    const matchTag = config.tagName || demand.tagName;
    const where = pushService.buildMatchConditions(config);
    if (!where.serviceTags && matchTag) {
      where.serviceTags = { hasSome: [matchTag] };
    }

    // 4. 查找匹配的用户（服务者）
    const candidates = await prisma.user.findMany({
      where,
      select: { id: true, serviceTags: true, pushBlocklist: true },
    });

    // 5. 过滤：排除被屏蔽的用户
    const unblocked = candidates.filter((u) => {
      const blocklist = (u.pushBlocklist || {}) as { keywords?: string[]; ageRanges?: string[] };
      return !pushService.isBlocked(blocklist, {
        title: demand.title,
        description: demand.description,
      });
    });

    // 6. 过滤：检查推送偏好（排除关键词/标签/区域 + 全局开关）
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

    // 7. 通过 Socket.IO 发送通知给通过所有规则的用户
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

    // 8. 返回匹配统计
    return {
      matched: candidates.length,
      unblocked: unblocked.length,
      sent: accepted.length,
      rejected: rejectReasons,
    };
  },

  /**
   * 构建服务者搜索条件
   * 纯函数，不访问数据库
   */
  buildMatchConditions(pushConfig: { tags?: string[]; keywords?: string[]; ageRanges?: string[] }) {
    const where: any = { isBusy: false };
    if (pushConfig.tags?.length) {
      where.serviceTags = { hasSome: pushConfig.tags };
    }
    return where;
  },

  /**
   * 检查用户是否屏蔽了此推送
   * 纯函数
   */
  isBlocked(
    blocklist: { tags?: string[]; keywords?: string[]; ageRanges?: string[] },
    demand: { tags?: string[]; title?: string; description?: string },
  ) {
    // 检查 demand 的 tags 是否匹配 blocklist 中的任何 tag
    if (blocklist.tags?.length && demand.tags?.length) {
      const isTagBlocked = blocklist.tags.some((t) => demand.tags!.includes(t));
      if (isTagBlocked) return true;
    }

    // 检查 demand 的 title/description 是否包含 blocklist 中的任何关键词
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
