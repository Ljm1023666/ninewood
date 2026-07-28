import { prisma } from '../lib/prisma.js'

export type DiscussionTopic = {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  circleId: string
  circleName: string
  publisherId: string
  publisherNickname: string
  publisherAvatar: string | null
  tags: string
}

export const discussionsService = {
  /**
   * 聚合公开圈 + 我加入圈的公告，作为「热门讨论」流。
   * 九木暂无独立 Topic 表，对齐对接系统讨论页用公告承载。
   */
  async listTopics(userId: string | undefined, page = 1, pageSize = 20) {
    const limit = Math.min(Math.max(pageSize, 1), 50)
    const skip = (Math.max(page, 1) - 1) * limit

    let memberCircleIds: string[] = []
    if (userId) {
      const memberships = await prisma.circleMember.findMany({
        where: { userId },
        select: { circleId: true },
      })
      memberCircleIds = memberships.map((m) => m.circleId)
    }

    const where = {
      circle: {
        status: 'ACTIVE' as const,
        OR: [
          { type: 'PUBLIC' as const },
          ...(memberCircleIds.length ? [{ id: { in: memberCircleIds } }] : []),
        ],
      },
    }

    const [rows, total] = await Promise.all([
      prisma.circleAnnouncement.findMany({
        where,
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: { select: { id: true, nickname: true, avatarUrl: true } },
          circle: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.circleAnnouncement.count({ where }),
    ])

    const items: DiscussionTopic[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.body,
      isPinned: r.pinned,
      createdAt: r.createdAt.toISOString(),
      circleId: r.circle.id,
      circleName: r.circle.name,
      publisherId: r.author.id,
      publisherNickname: r.author.nickname || '匿名',
      publisherAvatar: r.author.avatarUrl,
      tags: r.circle.type === 'PUBLIC' ? '公开圈' : '我的圈',
    }))

    return {
      list: items,
      total,
      page: Math.max(page, 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    }
  },

  async listPublishTargets(userId: string) {
    const memberships = await prisma.circleMember.findMany({
      where: {
        userId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      include: {
        circle: { select: { id: true, name: true, status: true } },
      },
      orderBy: { joinedAt: 'desc' },
    })
    return memberships
      .filter((m) => m.circle.status === 'ACTIVE')
      .map((m) => ({
        id: m.circle.id,
        name: m.circle.name,
        role: m.role,
      }))
  },
}
