-- Phase 1A: 用户主权通知（只增；不改/不删 PushPreference）
-- 配对 down.sql 仅用于本地回滚演练

DO $$ BEGIN
  CREATE TYPE "NotificationCategory" AS ENUM ('TRANSACTIONAL_REQUIRED', 'USER_REQUESTED', 'DIGEST', 'RELATIONSHIP');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'WINDOWS', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationDeliveryMode" AS ENUM ('IMMEDIATE', 'DIGEST', 'OFF');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'SUPPRESSED', 'FAILED', 'READ');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "NotificationPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "dailyInterruptCap" INTEGER NOT NULL DEFAULT 3,
    "nonEssentialPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPolicy_userId_key" ON "NotificationPolicy"("userId");

CREATE TABLE IF NOT EXISTS "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "eventType" TEXT NOT NULL,
    "mode" "NotificationDeliveryMode" NOT NULL DEFAULT 'OFF',
    "channels" "NotificationChannel"[],
    "filters" JSONB NOT NULL DEFAULT '{}',
    "sourceRef" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSubscription_userId_eventType_sourceRef_key" ON "NotificationSubscription"("userId", "eventType", "sourceRef");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_userId_category_mode_idx" ON "NotificationSubscription"("userId", "category", "mode");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_expiresAt_idx" ON "NotificationSubscription"("expiresAt");
CREATE INDEX IF NOT EXISTS "NotificationSubscription_userId_createdAt_idx" ON "NotificationSubscription"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "subscriptionId" TEXT,
    "reasonCode" TEXT NOT NULL,
    "reasonText" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "suppressionCode" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_status_createdAt_idx" ON "NotificationDelivery"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_category_createdAt_idx" ON "NotificationDelivery"("userId", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_status_createdAt_idx" ON "NotificationDelivery"("userId", "status", "createdAt");

DO $$ BEGIN
  ALTER TABLE "NotificationPolicy" ADD CONSTRAINT "NotificationPolicy_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NotificationSubscription" ADD CONSTRAINT "NotificationSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "NotificationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
