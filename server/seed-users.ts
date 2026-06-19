import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const NICKNAMES = [
  '夜雨声烦', '清风明月', '落花有意', '流水无情',
  '一剑霜寒', '独钓寒江', '星河万里', '云深不知处',
  '长风破浪', '孤舟蓑笠', '大漠孤烟', '江南烟雨',
  '醉卧沙场', '归去来兮',
]

const PHONES = [
  '13800000001', '13800000002', '13800000003', '13800000004',
  '13800000005', '13800000006', '13800000007', '13800000008',
  '13800000009', '13800000010', '13800000011', '13800000012',
  '13800000013', '13800000014',
]

async function main() {
  const hash = await bcrypt.hash('123456', 10)

  for (let i = 0; i < 14; i++) {
    const n = i + 1
    const pad = (n: number) => String(n).padStart(2, '0')

    await prisma.user.create({
      data: {
        phone: PHONES[i]!,
        passwordHash: hash,
        nickname: NICKNAMES[i]!,
        avatarUrl: `/uploads/avatars/avatar_${pad(n)}.png`,
        coverUrl: `/uploads/covers/cover_${pad(n)}.png`,
        demandCardCoverUrl: `/uploads/card-covers/${String(10000 + n)}.${n <= 10 ? 'jpg' : n === 11 ? 'jpeg' : 'png'}`,
        creditScore: 100,
        certificationLevel: 'BASIC',
        bio: `我是${NICKNAMES[i]}，九木平台用户。`,
      },
    })
    console.log(`Created: ${NICKNAMES[i]} (${PHONES[i]})`)
  }

  console.log('\nDone. 14 users with avatars, covers, card covers.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
