-- Task 10 · Agent 自动化任务：新增 AgentTask + AgentTaskRun 表
-- 详见 docs/specs/TASK-10-agent-automation.md §2

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL,
    "atHour" INTEGER,
    "atMinute" INTEGER NOT NULL DEFAULT 0,
    "weekday" INTEGER,
    "filters" JSONB NOT NULL,
    "deliveryChannels" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTaskRun" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentTask_userId_idx" ON "AgentTask"("userId");

-- CreateIndex
CREATE INDEX "AgentTask_enabled_nextRunAt_idx" ON "AgentTask"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "AgentTaskRun_taskId_runAt_idx" ON "AgentTaskRun"("taskId", "runAt");

-- CreateIndex
CREATE INDEX "AgentTaskRun_taskId_readAt_idx" ON "AgentTaskRun"("taskId", "readAt");

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTaskRun" ADD CONSTRAINT "AgentTaskRun_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AgentTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;