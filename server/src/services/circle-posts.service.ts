import { prisma } from '../lib/prisma.js';
import { assertHubAccess, assertMember } from './circle-hub.service.js';

function mapPost(
  post: {
    id: string;
    circleId: string;
    userId: string;
    content: string;
    likeCount: number;
    replyCount: number;
    createdAt: Date;
    updatedAt: Date;
    user: { id: string; nickname: string; avatarUrl: string | null };
    likes?: { userId: string }[];
  },
  viewerId: string | null,
) {
  return {
    id: post.id,
    circleId: post.circleId,
    userId: post.userId,
    content: post.content,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    userNickname: post.user.nickname,
    userAvatar: post.user.avatarUrl,
    liked: viewerId ? (post.likes?.some((l) => l.userId === viewerId) ?? false) : false,
  };
}

export const circlePostsService = {
  async list(circleId: string, viewerId: string | null, page = 1, limit = 20) {
    await assertHubAccess(circleId, viewerId);
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (Math.max(page, 1) - 1) * take;

    const [total, rows] = await Promise.all([
      prisma.circlePost.count({ where: { circleId } }),
      prisma.circlePost.findMany({
        where: { circleId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
          likes: viewerId
            ? { where: { userId: viewerId }, select: { userId: true } }
            : false,
        },
      }),
    ]);

    return {
      list: rows.map((p) => mapPost(p as any, viewerId)),
      total,
      page: Math.max(page, 1),
      limit: take,
    };
  },

  async create(circleId: string, userId: string, contentRaw: string) {
    await assertHubAccess(circleId, userId);
    await assertMember(circleId, userId);

    const content = (contentRaw || '').trim();
    if (!content) throw { status: 400, message: '请输入内容' };
    if (content.length > 2000) throw { status: 400, message: '内容不能超过2000字' };

    const post = await prisma.circlePost.create({
      data: { circleId, userId, content },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return mapPost({ ...post, likes: [] }, userId);
  },

  async remove(circleId: string, postId: string, userId: string) {
    await assertHubAccess(circleId, userId);
    const post = await prisma.circlePost.findFirst({
      where: { id: postId, circleId },
      select: { id: true, userId: true },
    });
    if (!post) throw { status: 404, message: '帖子不存在' };

    if (post.userId !== userId) {
      const member = await prisma.circleMember.findUnique({
        where: { circleId_userId: { circleId, userId } },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        throw { status: 403, message: '无权删除该帖子' };
      }
    }

    await prisma.circlePost.delete({ where: { id: postId } });
    return { success: true };
  },

  async like(circleId: string, postId: string, userId: string) {
    await assertHubAccess(circleId, userId);
    await assertMember(circleId, userId);

    const post = await prisma.circlePost.findFirst({
      where: { id: postId, circleId },
      select: { id: true },
    });
    if (!post) throw { status: 404, message: '帖子不存在' };

    const existing = await prisma.circlePostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) throw { status: 409, message: '已点赞' };

    await prisma.$transaction([
      prisma.circlePostLike.create({ data: { postId, userId } }),
      prisma.circlePost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return { success: true };
  },

  async unlike(circleId: string, postId: string, userId: string) {
    await assertHubAccess(circleId, userId);
    await assertMember(circleId, userId);

    const deleted = await prisma.circlePostLike.deleteMany({
      where: { postId, userId, post: { circleId } },
    });
    if (deleted.count > 0) {
      await prisma.circlePost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    }
    return { success: true };
  },

  async listReplies(circleId: string, postId: string, viewerId: string | null) {
    await assertHubAccess(circleId, viewerId);
    const post = await prisma.circlePost.findFirst({
      where: { id: postId, circleId },
      select: { id: true },
    });
    if (!post) throw { status: 404, message: '帖子不存在' };

    const replies = await prisma.circlePostReply.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    });

    return replies.map((r) => ({
      id: r.id,
      postId: r.postId,
      userId: r.userId,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
      userNickname: r.user.nickname,
      userAvatar: r.user.avatarUrl,
    }));
  },

  async createReply(circleId: string, postId: string, userId: string, contentRaw: string) {
    await assertHubAccess(circleId, userId);
    await assertMember(circleId, userId);

    const post = await prisma.circlePost.findFirst({
      where: { id: postId, circleId },
      select: { id: true },
    });
    if (!post) throw { status: 404, message: '帖子不存在' };

    const content = (contentRaw || '').trim();
    if (!content) throw { status: 400, message: '请输入回复内容' };
    if (content.length > 1000) throw { status: 400, message: '回复不能超过1000字' };

    const reply = await prisma.$transaction(async (tx) => {
      const created = await tx.circlePostReply.create({
        data: { postId, userId, content },
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } },
        },
      });
      await tx.circlePost.update({
        where: { id: postId },
        data: { replyCount: { increment: 1 } },
      });
      return created;
    });

    return {
      id: reply.id,
      postId: reply.postId,
      userId: reply.userId,
      content: reply.content,
      createdAt: reply.createdAt.toISOString(),
      userNickname: reply.user.nickname,
      userAvatar: reply.user.avatarUrl,
    };
  },
};
