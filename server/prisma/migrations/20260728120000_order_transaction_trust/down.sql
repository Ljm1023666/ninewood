-- 回滚脚本（仅用于本地/测试库验证，禁止对生产直接执行）
-- 配对：20260728120000_order_transaction_trust

DROP TABLE IF EXISTS "IdempotencyRecord";
DROP TABLE IF EXISTS "OrderPartialProposal";

DROP INDEX IF EXISTS "WalletLedger_operationKey_key";
ALTER TABLE "WalletLedger" DROP COLUMN IF EXISTS "operationKey";

DROP TYPE IF EXISTS "IdempotencyStatus";
DROP TYPE IF EXISTS "PartialProposalStatus";

-- OrderStatus 枚举无法安全删除已用过的 PARTIAL_PENDING（PG 限制）。
-- 本地验证策略：确认无行使用该值后，保留枚举值（向前兼容空洞）或重建枚举（高成本，测试库可用下方可选块）。
-- 可选（仅空库/确认无 PARTIAL_PENDING 行时）：
-- ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
-- CREATE TYPE "OrderStatus" AS ENUM ('PENDING','IN_PROGRESS','WAITING_REVIEW','COMPLETED','CANCELLED','REFUNDED','DISPUTED');
-- ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING ("status"::text::"OrderStatus");
-- DROP TYPE "OrderStatus_old";
