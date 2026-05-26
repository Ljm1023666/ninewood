import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 找 ipRegion 为空的用户
  const nullIpRegion = await prisma.user.findMany({
    where: { ipRegion: null },
    select: { id: true, ipRegion: true, cityCode: true }
  });
  console.log('ipRegion为空的总数:', nullIpRegion.length);
  if (nullIpRegion.length > 0) console.log('示例:', JSON.stringify(nullIpRegion.slice(0, 5)));

  // 找 ipRegion 是纯数字的用户（再次确认）
  const allUsers = await prisma.user.findMany({
    where: { ipRegion: { not: null } },
    select: { id: true, ipRegion: true, cityCode: true }
  });
  const numericOnly = allUsers.filter(u => /^\d{4,}$/.test(u.ipRegion || ''));
  console.log('ipRegion是纯数字(4位以上)的用户:', numericOnly.length);

  // 检查用户总量
  const total = await prisma.user.count();
  console.log('用户总数:', total);
}

main().finally(() => prisma.$disconnect());