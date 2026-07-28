-- Phase 2 Task Quiet 本地回滚

ALTER TABLE "TaskQuietRecord" DROP CONSTRAINT IF EXISTS "TaskQuietRecord_userId_fkey";
DROP INDEX IF EXISTS "TaskQuietRecord_resourceId_idx";
DROP INDEX IF EXISTS "TaskQuietRecord_userId_createdAt_idx";
DROP INDEX IF EXISTS "TaskQuietRecord_resourceType_resourceId_key";
DROP TABLE IF EXISTS "TaskQuietRecord";
