DROP INDEX IF EXISTS "Review_orderId_key";
CREATE UNIQUE INDEX "Review_orderId_reviewerId_key" ON "Review"("orderId", "reviewerId");

CREATE TABLE "EmailVerificationCode" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailVerificationCode_email_createdAt_idx" ON "EmailVerificationCode"("email", "createdAt");
CREATE INDEX "EmailVerificationCode_expiresAt_idx" ON "EmailVerificationCode"("expiresAt");

CREATE TABLE "SchedulerLease" (
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "leaseUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulerLease_pkey" PRIMARY KEY ("name")
);
CREATE INDEX "SchedulerLease_leaseUntil_idx" ON "SchedulerLease"("leaseUntil");

CREATE TABLE "OutcomeEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "correlationId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activeMs" INTEGER,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "OutcomeEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OutcomeEvent_correlationId_occurredAt_idx" ON "OutcomeEvent"("correlationId", "occurredAt");
CREATE INDEX "OutcomeEvent_resourceType_resourceId_idx" ON "OutcomeEvent"("resourceType", "resourceId");
CREATE INDEX "OutcomeEvent_eventType_occurredAt_idx" ON "OutcomeEvent"("eventType", "occurredAt");
