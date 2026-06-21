import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const CATEGORIES = ['DOC', 'DESIGN', 'CODE', 'VIDEO', 'OTHER'];
const FILE_NAMES = {
  DOC: ['Q4_开发进度报告.pdf', '项目需求文档_最终版.docx', '会议纪要_0612.md'],
  DESIGN: ['UI_Kit_v2.0.fig', '品牌Logo_资产包.zip', '设计走查清单.xlsx'],
  CODE: ['Auth_Module_Setup.zip', '后端服务_部署脚本.tar.gz', '前端组件库参考.md'],
  VIDEO: ['Onboarding_Demo.mp4', '功能演示_v1.2.mp4'],
  OTHER: ['README.md', '会议录音_0608.m4a'],
};

const ACTIVITY_TEMPLATES = [
  { type: 'DISCUSSION', title: '发起新讨论', summary: '关于 Next.js 14 App Router 在国内服务器的部署问题' },
  { type: 'DEMAND', title: '发布新需求', summary: '寻一位熟悉 Swift 的 iOS 开发者合作工具类产品' },
  { type: 'MEMBER_JOIN', title: '新成员加入', summary: '欢迎新圈友加入' },
  { type: 'RESOURCE', title: '上传资源', summary: '独立开发者常用设计素材包.zip' },
  { type: 'ANNOUNCEMENT', title: '发布公告', summary: '本周三晚 8 点圈主直播答疑' },
  { type: 'DISCUSSION', title: '回复了讨论', summary: '解决方案已附在评论区' },
  { type: 'DEMAND', title: '更新需求', summary: '需求标题、预算区间已更新' },
  { type: 'RESOURCE', title: '更新资源', summary: '替换为最新版附件' },
  { type: 'MEMBER_JOIN', title: '新成员加入', summary: '' },
  { type: 'DISCUSSION', title: '发起新讨论', summary: '推荐一个跨平台调试工具' },
];

const ANNOUNCEMENT_SAMPLES = [
  { title: '本周三晚 8 点圈主直播答疑', body: '本周三晚 8 点在 B 站直播答疑,聚焦独立开发者的产品上线节奏。请提前在本圈讨论区留言想聊的话题。' },
  { title: '圈内需求优先匹配公告', body: '所有圈内需求发布后 24 小时内,圈主会优先匹配认证服务者。' },
  { title: '资源区开放通知', body: '资源板块正式开放,欢迎上传开发规范、组件库、设计素材等共享文件。' },
];

function fileUrlStub(name) {
  const safe = name.replace(/[^\w.\-]/g, '_');
  return '/uploads/circle-resources/seed-' + randomUUID().slice(0, 8) + '-' + safe;
}

function mimeFor(name) {
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.zip')) return 'application/zip';
  if (name.endsWith('.fig')) return 'application/octet-stream';
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

async function seedForCircle(circleId, ownerId) {
  const ann = ANNOUNCEMENT_SAMPLES[Math.floor(Math.random() * ANNOUNCEMENT_SAMPLES.length)];
  await prisma.circleAnnouncement.create({
    data: { circleId, authorId: ownerId, title: ann.title, body: ann.body, pinned: true },
  });

  const members = await prisma.circleMember.findMany({ where: { circleId }, select: { userId: true } });
  const uploaderIds = members.length > 0 ? members.map((m) => m.userId) : [ownerId];
  const resourceCount = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < resourceCount; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const names = FILE_NAMES[cat];
    const name = names[i % names.length];
    const uploaderId = uploaderIds[i % uploaderIds.length];
    const sizeBytes = 100 * 1024 + Math.floor(Math.random() * 5 * 1024 * 1024);
    await prisma.circleResource.create({
      data: {
        circleId, uploaderId, name, fileUrl: fileUrlStub(name), mimeType: mimeFor(name),
        sizeBytes, category: cat,
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    const tpl = ACTIVITY_TEMPLATES[i];
    const actor = uploaderIds[i % uploaderIds.length];
    const ageMin = i * 18;
    await prisma.circleActivity.create({
      data: {
        circleId, actorId: actor, type: tpl.type, title: tpl.title,
        summary: tpl.summary || null, createdAt: new Date(Date.now() - ageMin * 60 * 1000),
      },
    });
  }

  await prisma.circleInvite.create({
    data: {
      circleId,
      email: 'dev_new_' + randomUUID().slice(0, 6) + '@example.com',
      invitedById: ownerId,
      status: 'PENDING',
    },
  });
}

async function main() {
  console.log('[seed-circle-hub] starting...');
  const publicCircle = await prisma.circle.findFirst({ where: { type: 'PUBLIC' }, orderBy: { memberCount: 'desc' } });
  const privateCircle = await prisma.circle.findFirst({ where: { type: 'PRIVATE' } });

  if (publicCircle) {
    console.log('[seed-circle-hub] PUBLIC circle:', publicCircle.id, publicCircle.name);
    await seedForCircle(publicCircle.id, publicCircle.ownerId);
    if (!publicCircle.description) {
      await prisma.circle.update({
        where: { id: publicCircle.id },
        data: { description: '欢迎来到本圈。这里汇聚本城的独立开发者与产品人,日常分享开发经验、需求对接与资源协作。' },
      });
    }
  } else {
    console.warn('[seed-circle-hub] no PUBLIC circle found, skipping');
  }

  if (privateCircle) {
    console.log('[seed-circle-hub] PRIVATE circle:', privateCircle.id, privateCircle.name);
    await seedForCircle(privateCircle.id, privateCircle.ownerId);
    if (!privateCircle.description) {
      await prisma.circle.update({
        where: { id: privateCircle.id },
        data: { description: '私人协作圈,仅限受邀成员加入。' },
      });
    }
  } else {
    console.warn('[seed-circle-hub] no PRIVATE circle found, skipping');
  }
  console.log('[seed-circle-hub] done.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());