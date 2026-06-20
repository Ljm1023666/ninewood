-- Stage 1.2 + 配套 schema 修复 — 公益收尾、用户点数、钱包流水、举证字段
-- 本次 commit 的 schema 改动:
--  A) S1.2 新增:WelfareDisbursement(资金池出账)
--  B) S1.2 扩展:WelfareReward 加 rewardType + choiceLabel(选奖)
--  C) 历史遗留修复(此前 wallet.service.ts / acceptance.service.ts 引用但 schema 缺失,
--     导致 S1.3 commit 后 typecheck 失败):
--     - User.points Int @default(1000000)(D5 决策:开发期模拟货币)
--     - WalletLedger / WalletHold 模型 + 2 个 enum(支持 stage 0 wallet.service 实现)
--     - Complaint.evidenceUrls String[] @default([])(stage 0 v1.4 引入)

-- 1) enums
CREATE TYPE "WalletLedgerType" AS ENUM ('HOLD', 'RELEASE', 'CREDIT', 'DEBIT');
CREATE TYPE "WalletHoldStatus" AS ENUM ('HELD', 'RELEASED', 'CONSUMED');

-- 2) User 加 points
ALTER TABLE "User" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 1000000;

-- 3) Complaint 加 evidenceUrls
ALTER TABLE "Complaint" ADD COLUMN "evidenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4) WalletHold
CREATE TABLE "WalletHold" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "demandId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WalletHoldStatus" NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletHold_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WalletHold_demandId_key" ON "WalletHold"("demandId");
CREATE INDEX "WalletHold_userId_idx" ON "WalletHold"("userId");
CREATE INDEX "WalletHold_status_idx" ON "WalletHold"("status");

-- 5) WalletLedger
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletLedgerType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletLedger_userId_createdAt_idx" ON "WalletLedger"("userId", "createdAt");
CREATE INDEX "WalletLedger_referenceType_referenceId_idx" ON "WalletLedger"("referenceType", "referenceId");

-- 6) WelfareDisbursement(资金池 → 政府/部门拨付)
CREATE TABLE "WelfareDisbursement" (
    "id" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recipientOrg" VARCHAR(200) NOT NULL,
    "memo" VARCHAR(500),
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WelfareDisbursement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WelfareDisbursement_regionId_idx" ON "WelfareDisbursement"("regionId");
CREATE INDEX "WelfareDisbursement_createdAt_idx" ON "WelfareDisbursement"("createdAt");

-- 7) WelfareReward 扩展
ALTER TABLE "WelfareReward" ADD COLUMN "rewardType" TEXT NOT NULL DEFAULT 'random';
ALTER TABLE "WelfareReward" ADD COLUMN "choiceLabel" VARCHAR(100);

-- 8) 索引:WelfareReward 已有 providerId/demandId 索引,补 choiceLabel 列无需额外索引