DROP TABLE IF EXISTS "SchedulerLease";
DROP TABLE IF EXISTS "OutcomeEvent";
DROP TABLE IF EXISTS "EmailVerificationCode";
DROP INDEX IF EXISTS "Review_orderId_reviewerId_key";
CREATE UNIQUE INDEX "Review_orderId_key" ON "Review"("orderId");
