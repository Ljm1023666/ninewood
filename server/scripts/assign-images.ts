import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({ select: { id: true, nickname: true } })
  for (let i = 0; i < users.length; i++) {
    const ai = (i % 20) + 1
    const ci = (i % 14) + 1
    await p.user.update({
      where: { id: users[i].id },
      data: {
        avatarUrl: `/uploads/avatars/avatar_${String(ai).padStart(2, '0')}.png`,
        coverUrl: `/uploads/covers/cover_${String(ci).padStart(2, '0')}.png`,
      },
    })
    console.log(`${users[i].nickname} -> avatar:${ai} cover:${ci}`)
  }

  const demands = await p.demand.findMany({ select: { id: true, title: true }, take: 30 })
  for (let i = 0; i < demands.length; i++) {
    const ci = (i % 14) + 1
    const ext = ci <= 11 ? '.jpg' : '.png'
    const name = ci <= 9
      ? `1000${ci}${ext}`
      : `100${ci}${ext}`
    await p.demand.update({
      where: { id: demands[i].id },
      data: { coverImage: `/uploads/card-covers/${name}` },
    })
    console.log(`${demands[i].title} -> card:${name}`)
  }

  console.log(`Done: ${users.length} users, ${Math.min(30, demands.length)} demands`)
  await p.$disconnect()
}

main()
