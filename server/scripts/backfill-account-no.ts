/**
 * 为所有用户分配易记账号 ID（0=管理员，其余按创建时间递增），并将密码重置为 1
 *
 * 用法（在 server 目录）:
 *   npx tsx scripts/backfill-account-no.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = '1';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const users = await prisma.user.findMany({
    select: { id: true, role: true, createdAt: true, accountNo: true, nickname: true, phone: true },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('无用户，跳过');
    return;
  }

  const admins = users.filter((u) => u.role === 'ADMIN');
  const others = users.filter((u) => u.role !== 'ADMIN');
  const ordered = [...admins, ...others];

  console.log(`共 ${users.length} 个用户，管理员 ${admins.length} 个，开始分配 accountNo…`);

  for (let i = 0; i < ordered.length; i++) {
    const u = ordered[i];
    await prisma.user.update({
      where: { id: u.id },
      data: { accountNo: i, passwordHash },
    });
    const label = i === 0 && u.role === 'ADMIN' ? '（管理员）' : '';
    console.log(`  accountNo=${i}${label}  ${u.nickname}  ${u.phone}`);
  }

  console.log(`\n✅ 完成。登录示例：账号 ID=0 密码=${DEFAULT_PASSWORD}（管理员）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
