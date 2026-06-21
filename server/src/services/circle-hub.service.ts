import { prisma } from '../lib/prisma.js';

export type CircleActivityItem = {
  id: string;
  type: string;
  actor: { id: string; nickname: string } | null;
  title: string;
  summary: string | null;
  refId: string | null;
  createdAt: string;
};

export type CircleHubHomeDto = {
  stats: {
    todayActive: number;
    todayActiveDelta: number;
    newDemands: number;
    weekDemands: number;
    resourceUpdates: number;
    resourceUpdatesDelta: number;
    memberCount: number;
    pendingInvites: number;
  };
  announcement: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    author: { id: string; nickname: string };
    createdAt: string;
  } | null;
  hotTags: string[];
  activities: CircleActivityItem[];
};

export async function assertHubAccess(circleId: string, userId: string | null) {
  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { id: true, type: true, status: true },
  });
  if (!circle) throw { status: 404, message: '圈子不存在' };
  if (circle.status === 'DEFUNCT') throw { status: 410, message: '圈子已停用' };
  if (circle.type === 'PRIVATE') {
    if (!userId) throw { status: 401, message: '请先登录' };
    const member = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw { status: 403, message: '私密圈仅对成员开放' };
  }
  return circle;
}

export async function assertMember(circleId: string, userId: string) {
  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (!member) throw { status: 403, message: '请先加入圈子' };
  return member;
}

export async function assertAdmin(circleId: string, userId: string) {
  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId } },
  });
  if (!member) throw { status: 403, message: '请先加入圈子' };
  if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
    throw { status: 403, message: '仅圈主/管理员可操作' };
  }
  return member;
}

function formatActivity(act: any): CircleActivityItem {
  return {
    id: act.id,
    type: act.type,
    actor: act.actor ? { id: act.actor.id, nickname: act.actor.nickname } : null,
    title: act.title,
    summary: act.summary,
    refId: act.refId,
    createdAt: act.createdAt.toISOString(),
  };
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

function weekStartOf(d: Date): Date {
  const t = startOfDay(d);
  const wd = t.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  t.setDate(t.getDate() + diff);
  return t;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

async function countDistinctActive(circleId: string, from: Date, to?: Date): Promise<number> {
  const seenWhere: any = { circleId, lastSeenAt: { gte: from } };
  if (to) seenWhere.lastSeenAt.lt = to;
  const seenRows = await prisma.circleMember.findMany({ where: seenWhere, select: { userId: true } });
  const actWhere: any = { circleId, actorId: { not: null }, createdAt: { gte: from } };
  if (to) actWhere.createdAt.lt = to;
  const actRows = await prisma.circleActivity.findMany({
    where: actWhere,
    select: { actorId: true },
    distinct: ['actorId'],
  });
  const set = new Set<string>();
  for (const r of seenRows) set.add(r.userId);
  for (const r of actRows) if (r.actorId) set.add(r.actorId);
  return set.size;
}

export const circleHubService = {
  async getHome(circleId: string): Promise<CircleHubHomeDto> {
    const startOfToday = startOfDay(new Date());
    const yesterdayStart = new Date(startOfToday);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const todayActive = await countDistinctActive(circleId, startOfToday);
    const yesterdayActive = await countDistinctActive(circleId, yesterdayStart, startOfToday);

    const [
      memberCount,
      pendingInvites,
      newDemandsThisWeek,
      resourceUpdates7d,
      resourceUpdatesPrev7d,
      pinnedAnnouncement,
      recentActivities,
      hotTagRows,
    ] = await Promise.all([
      prisma.circleMember.count({ where: { circleId } }),
      prisma.circleInvite.count({ where: { circleId, status: 'PENDING' } }),
      prisma.demand.count({ where: { circleId, createdAt: { gte: weekStart } } }),
      prisma.circleResource.count({ where: { circleId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.circleResource.count({
        where: { circleId, createdAt: { gte: new Date(sevenDaysAgo.getTime() - 7 * 86400_000), lt: sevenDaysAgo } },
      }),
      prisma.circleAnnouncement.findFirst({
        where: { circleId, pinned: true },
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, nickname: true } } },
      }),
      prisma.circleActivity.findMany({
        where: { circleId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { id: true, nickname: true } } },
      }),
      prisma.demand.findMany({
        where: { circleId, tags: { isEmpty: false } },
        select: { tags: true },
        take: 200,
      }),
    ]);

    const tagCounter: Record<string, number> = {};
    for (const row of hotTagRows) {
      for (const t of row.tags) tagCounter[t] = (tagCounter[t] || 0) + 1;
    }
    const hotTags = Object.entries(tagCounter)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    return {
      stats: {
        todayActive,
        todayActiveDelta: todayActive - yesterdayActive,
        newDemands: newDemandsThisWeek,
        weekDemands: newDemandsThisWeek,
        resourceUpdates: resourceUpdates7d,
        resourceUpdatesDelta: resourceUpdates7d - resourceUpdatesPrev7d,
        memberCount,
        pendingInvites,
      },
      announcement: pinnedAnnouncement
        ? {
            id: pinnedAnnouncement.id,
            title: pinnedAnnouncement.title,
            body: pinnedAnnouncement.body,
            pinned: pinnedAnnouncement.pinned,
            author: { id: pinnedAnnouncement.author.id, nickname: pinnedAnnouncement.author.nickname },
            createdAt: pinnedAnnouncement.createdAt.toISOString(),
          }
        : null,
      hotTags,
      activities: recentActivities.map(formatActivity),
    };
  },

  async listActivities(circleId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * safeLimit;
    const [items, total] = await Promise.all([
      prisma.circleActivity.findMany({
        where: { circleId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: { actor: { select: { id: true, nickname: true } } },
      }),
      prisma.circleActivity.count({ where: { circleId } }),
    ]);
    return {
      items: items.map(formatActivity),
      page: Math.max(page, 1),
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  },

  async postAnnouncement(
    circleId: string,
    authorId: string,
    input: { title: string; body: string; pinned?: boolean },
  ) {
    const title = (input.title || '').trim();
    const body = (input.body || '').trim();
    if (title.length < 2 || title.length > 100) throw { status: 400, message: '标题需 2-100 字符' };
    if (body.length < 1 || body.length > 1000) throw { status: 400, message: '正文需 1-1000 字符' };

    const ann = await prisma.circleAnnouncement.create({
      data: { circleId, authorId, title, body, pinned: input.pinned ?? true },
      include: { author: { select: { id: true, nickname: true } } },
    });
    await prisma.circleActivity.create({
      data: {
        circleId,
        actorId: authorId,
        type: 'ANNOUNCEMENT',
        title: '发布公告',
        summary: title,
        refId: ann.id,
      },
    });
    return {
      id: ann.id,
      title: ann.title,
      body: ann.body,
      pinned: ann.pinned,
      author: { id: ann.author.id, nickname: ann.author.nickname },
      createdAt: ann.createdAt.toISOString(),
    };
  },

  async getAnalytics(circleId: string, range: '7d' | '30d' = '30d') {
    const days = range === '7d' ? 7 : 30;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(-1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (days - 1));
    prevStart.setHours(0, 0, 0, 0);

    const weekMonday = weekStartOf(start);
    const [memberCount, memberCountPrev, weekDemands, weekDemandsPrev, activeCount, activeCountPrev, interactions, interactionsPrev] =
      await Promise.all([
        prisma.circleMember.count({ where: { circleId } }),
        prisma.circleMember.count({ where: { circleId, joinedAt: { lte: prevEnd } } }),
        prisma.demand.count({ where: { circleId, createdAt: { gte: weekMonday, lte: end } } }),
        prisma.demand.count({ where: { circleId, createdAt: { gte: new Date(weekMonday.getTime() - 7 * 86400_000), lt: weekMonday } } }),
        prisma.circleMember.count({ where: { circleId, lastSeenAt: { gte: start, lte: end } } }),
        prisma.circleMember.count({ where: { circleId, lastSeenAt: { gte: prevStart, lte: prevEnd } } }),
        prisma.circleActivity.count({ where: { circleId, createdAt: { gte: weekMonday, lte: end } } }),
        prisma.circleActivity.count({ where: { circleId, createdAt: { gte: new Date(weekMonday.getTime() - 7 * 86400_000), lt: weekMonday } } }),
      ]);

    const memberGrowthPct = memberCountPrev > 0 ? +(((memberCount - memberCountPrev) / memberCountPrev) * 100).toFixed(1) : null;
    const activeRate = memberCount > 0 ? +((activeCount / memberCount) * 100).toFixed(1) : 0;
    const activeRatePrev = memberCountPrev > 0 ? +((activeCountPrev / memberCountPrev) * 100).toFixed(1) : 0;

    const joinedSeries = await prisma.circleMember.findMany({
      where: { circleId, joinedAt: { gte: start, lte: end } },
      select: { joinedAt: true },
    });
    const offsets = days === 30 ? [1, 5, 10, 15, 20, 25, 30] : [1, 3, 5, 7];
    const memberGrowthData = offsets.map((offset) => {
      const pointDate = new Date(start);
      pointDate.setDate(start.getDate() + offset - 1);
      const count = joinedSeries.filter((r) => isSameDay(r.joinedAt, pointDate)).length;
      return { offsetDay: offset, label: offset + '日', date: formatDate(pointDate), value: count };
    });

    const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekDemandsRaw = await prisma.demand.findMany({
      where: { circleId, createdAt: { gte: weekMonday, lte: end } },
      select: { createdAt: true },
    });
    const weeklyDemandSeries = weekdayLabels.map((wd, i) => {
      const day = new Date(weekMonday);
      day.setDate(weekMonday.getDate() + i);
      const count = weekDemandsRaw.filter((r) => isSameDay(r.createdAt, day)).length;
      return { weekday: wd, count };
    });

    const engRaw = await prisma.circleActivity.groupBy({
      by: ['type'],
      where: { circleId, createdAt: { gte: weekMonday, lte: end } },
      _count: { _all: true },
    });
    let demandShare = 0, resourceShare = 0, otherShare = 0;
    for (const row of engRaw) {
      if (row.type === 'DEMAND') demandShare += row._count._all;
      else if (row.type === 'RESOURCE' || row.type === 'MEMBER_JOIN') resourceShare += row._count._all;
      else otherShare += row._count._all;
    }
    const engagement = [
      { name: '发布需求', value: demandShare || 1, color: '#abc7ff' },
      { name: '资源/成员', value: resourceShare || 1, color: '#458fff' },
      { name: '互动/公告', value: otherShare || 1, color: '#32353c' },
    ];

    return {
      range: { start: formatDate(start), end: formatDate(end) },
      kpis: {
        memberCount,
        memberGrowthPct,
        activeRate,
        activeRateDelta: activeRatePrev > 0 ? +(activeRate - activeRatePrev).toFixed(1) : null,
        weekDemands,
        weekDemandsDelta: weekDemands - weekDemandsPrev,
        interactions,
        interactionsDelta: interactions - interactionsPrev,
      },
      memberGrowthSeries: memberGrowthData,
      weeklyDemandSeries,
      engagement,
    };
  },

  async recordActivity(input: {
    circleId: string;
    actorId?: string | null;
    type: 'DISCUSSION' | 'DEMAND' | 'MEMBER_JOIN' | 'RESOURCE' | 'ANNOUNCEMENT';
    title: string;
    summary?: string | null;
    refId?: string | null;
  }) {
    try {
      await prisma.circleActivity.create({
        data: {
          circleId: input.circleId,
          actorId: input.actorId ?? null,
          type: input.type,
          title: input.title,
          summary: input.summary ?? null,
          refId: input.refId ?? null,
        },
      });
    } catch (e) {
      console.warn('[circle-hub] recordActivity failed:', (e as Error).message);
    }
  },
};
