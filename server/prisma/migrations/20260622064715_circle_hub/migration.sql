-- Wave A / Task 8 圈 Hub backend
-- 新增:Circle.description / CircleMember.lastSeenAt / 3 enums / 4 张新表
-- 1) enums
CREATE TYPE "CircleResourceCategory" AS ENUM ('DOC', 'DESIGN', 'CODE', 'VIDEO', 'OTHER');
CREATE TYPE "CircleActivityType" AS ENUM ('DISCUSSION', 'DEMAND', 'MEMBER_JOIN', 'RESOURCE', 'ANNOUNCEMENT');
CREATE TYPE "CircleInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- 2) 列扩展
ALTER TABLE "Circle" ADD COLUMN "description" TEXT;
ALTER TABLE "CircleMember" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
CREATE INDEX "CircleMember_circleId_lastSeenAt_idx" ON "CircleMember"("circleId", "lastSeenAt");

-- 3) 公告
CREATE TABLE "CircleAnnouncement" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CircleAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CircleAnnouncement_circleId_pinned_idx" ON "CircleAnnouncement"("circleId", "pinned");
CREATE INDEX "CircleAnnouncement_circleId_createdAt_idx" ON "CircleAnnouncement"("circleId", "createdAt");

-- 4) 活动流
CREATE TABLE "CircleActivity" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "CircleActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CircleActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CircleActivity_circleId_createdAt_idx" ON "CircleActivity"("circleId", "createdAt");
CREATE INDEX "CircleActivity_circleId_type_idx" ON "CircleActivity"("circleId", "type");

-- 5) 资源文件
CREATE TABLE "CircleResource" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "category" "CircleResourceCategory" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CircleResource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CircleResource_circleId_createdAt_idx" ON "CircleResource"("circleId", "createdAt");
CREATE INDEX "CircleResource_circleId_category_idx" ON "CircleResource"("circleId", "category");

-- 6) 邀请记录
CREATE TABLE "CircleInvite" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "status" "CircleInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "CircleInvite_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CircleInvite_circleId_status_idx" ON "CircleInvite"("circleId", "status");
CREATE INDEX "CircleInvite_circleId_createdAt_idx" ON "CircleInvite"("circleId", "createdAt");
CREATE UNIQUE INDEX "CircleInvite_circleId_email_status_key" ON "CircleInvite"("circleId", "email", "status");

-- 7) 外键
ALTER TABLE "CircleAnnouncement" ADD CONSTRAINT "CircleAnnouncement_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleAnnouncement" ADD CONSTRAINT "CircleAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleActivity" ADD CONSTRAINT "CircleActivity_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleActivity" ADD CONSTRAINT "CircleActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CircleResource" ADD CONSTRAINT "CircleResource_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleResource" ADD CONSTRAINT "CircleResource_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleInvite" ADD CONSTRAINT "CircleInvite_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleInvite" ADD CONSTRAINT "CircleInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;