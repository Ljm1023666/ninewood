import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const exists = await prisma.user.findUnique({ where: { phone: '15167995300' } });
  if (exists) { console.log('already exists:', exists.nickname); return; }

  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: {
      phone: '15167995300',
      nickname: `用户_5300`,
      passwordHash: hash,
      creditScore: 70,
    },
  });
  console.log('created:', user.id, user.nickname, user.phone);
}

main().catch(console.error).finally(() => prisma.$disconnect());
