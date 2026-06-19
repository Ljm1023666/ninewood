import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const phone = process.argv[2] || '13901001001'
const password = process.argv[3] || '1'

const prisma = new PrismaClient()
try {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { phone: true, nickname: true, passwordHash: true, role: true },
  })
  if (!user) {
    const count = await prisma.user.count()
    console.log(`用户 ${phone} 不存在。数据库共 ${count} 个用户。`)
    const sample = await prisma.user.findMany({
      take: 3,
      select: { phone: true, nickname: true },
    })
    if (sample.length) console.log('示例用户:', sample)
  } else {
    const ok = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false
    console.log('用户:', user.phone, user.nickname, 'role:', user.role)
    console.log('有密码哈希:', Boolean(user.passwordHash))
    console.log(`密码 "${password}" 校验:`, ok)
  }
} catch (e) {
  console.error('数据库错误:', e.message)
} finally {
  await prisma.$disconnect()
}
