CREATE TABLE "OutcomeDailyAggregate" (
  "day" TIMESTAMP(3) NOT NULL,
  "resourceType" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventCount" INTEGER NOT NULL,
  "activeMsSum" BIGINT NOT NULL DEFAULT 0,
  "sampleCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OutcomeDailyAggregate_pkey" PRIMARY KEY ("day", "resourceType", "eventType")
);
CREATE INDEX "OutcomeDailyAggregate_day_idx" ON "OutcomeDailyAggregate"("day");
