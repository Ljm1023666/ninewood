-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PARTIAL_PENDING';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PartialProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "WalletLedger" ADD COLUMN IF NOT EXISTS "operationKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WalletLedger_operationKey_key" ON "WalletLedger"("operationKey");

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderPartialProposal" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "proposedPrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PartialProposalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedBy" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "remainingDemandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrderPartialProposal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestHash" TEXT,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "leaseOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrderPartialProposal_orderId_status_idx" ON "OrderPartialProposal"("orderId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "IdempotencyRecord_userId_scope_key_key" ON "IdempotencyRecord"("userId", "scope", "key");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_resourceId_scope_idx" ON "IdempotencyRecord"("resourceId", "scope");
CREATE INDEX IF NOT EXISTS "IdempotencyRecord_status_leaseUntil_idx" ON "IdempotencyRecord"("status", "leaseUntil");

DO $$ BEGIN
  ALTER TABLE "OrderPartialProposal" ADD CONSTRAINT "OrderPartialProposal_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
