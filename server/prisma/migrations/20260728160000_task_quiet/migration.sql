-- Phase 2: Task Quiet / CompletionSummary
-- 配对 down.sql 仅用于本地回滚演练

CREATE TABLE IF NOT EXISTS "TaskQuietRecord" (
    "id" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "outcomeStatus" TEXT NOT NULL,
    "outcomeSummary" TEXT NOT NULL,
    "evidenceSummary" JSONB NOT NULL DEFAULT '[]',
    "nextRequiredAction" JSONB,
    "sourceRefsStopped" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notificationsStopped" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskQuietRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskQuietRecord_resourceType_resourceId_key"
  ON "TaskQuietRecord"("resourceType", "resourceId");

CREATE INDEX IF NOT EXISTS "TaskQuietRecord_userId_createdAt_idx"
  ON "TaskQuietRecord"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "TaskQuietRecord_resourceId_idx"
  ON "TaskQuietRecord"("resourceId");

DO $$ BEGIN
  ALTER TABLE "TaskQuietRecord"
    ADD CONSTRAINT "TaskQuietRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
