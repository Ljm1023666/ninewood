-- CreateEnum
CREATE TYPE "ParticipantKind" AS ENUM ('HUMAN', 'INTERFACE');

-- CreateEnum
CREATE TYPE "LoopKind" AS ENUM ('HUMAN', 'EARTH', 'HEAVEN');

-- CreateEnum
CREATE TYPE "LoopExecutionMode" AS ENUM ('MANUAL', 'AUTOMATED', 'HYBRID');

-- CreateEnum
CREATE TYPE "LoopRunStatus" AS ENUM ('TRIGGERED', 'MATCHING', 'EXECUTING', 'WAITING_HUMAN', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'INCONCLUSIVE', 'COMPENSATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "CapabilityHostMode" AS ENUM ('EXTERNAL_API', 'PLATFORM_HOSTED');

-- CreateEnum
CREATE TYPE "CapabilityHealth" AS ENUM ('ONLINE', 'DEGRADED', 'OFFLINE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LoopLinkRelation" AS ENUM ('TRIGGER', 'DELEGATE', 'FALLBACK', 'COMPENSATE', 'SUPPLY', 'OBSERVE', 'VERIFY');

-- CreateEnum
CREATE TYPE "LoopEventVisibility" AS ENUM ('SYSTEM_ONLY', 'ACTOR', 'PUBLIC_METRIC');

-- CreateTable
CREATE TABLE "LoopDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "loopKind" "LoopKind" NOT NULL,
    "initiatorKind" "ParticipantKind" NOT NULL,
    "receiverKind" "ParticipantKind" NOT NULL,
    "executionMode" "LoopExecutionMode" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "outcomeSchema" JSONB NOT NULL DEFAULT '{}',
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoopDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityEndpoint" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "hostMode" "CapabilityHostMode" NOT NULL DEFAULT 'EXTERNAL_API',
    "executionMode" "LoopExecutionMode" NOT NULL DEFAULT 'HYBRID',
    "paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inputSchema" JSONB NOT NULL DEFAULT '{}',
    "outputSchema" JSONB NOT NULL DEFAULT '{}',
    "healthStatus" "CapabilityHealth" NOT NULL DEFAULT 'UNKNOWN',
    "healthCheckedAt" TIMESTAMP(3),
    "capacityJson" JSONB,
    "pricePolicyJson" JSONB,
    "successRatePublic" BOOLEAN NOT NULL DEFAULT false,
    "sourceUserTagId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopOffering" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "endpointId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dealRate" DOUBLE PRECISION,
    "avgDurationMs" INTEGER,
    "recentSuccessN" INTEGER NOT NULL DEFAULT 0,
    "recentTotalN" INTEGER NOT NULL DEFAULT 0,
    "internalSuccessRate" DOUBLE PRECISION,
    "requiresVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoopOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopRun" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "offeringId" TEXT,
    "loopKind" "LoopKind" NOT NULL,
    "status" "LoopRunStatus" NOT NULL DEFAULT 'TRIGGERED',
    "initiatorRef" TEXT NOT NULL,
    "receiverRef" TEXT,
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "expectedOutcome" JSONB NOT NULL DEFAULT '{}',
    "actualOutcome" JSONB,
    "demandId" TEXT,
    "orderId" TEXT,
    "parentRunId" TEXT,
    "correlationId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoopRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopEvent" (
    "id" TEXT NOT NULL,
    "loopRunId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorRef" TEXT NOT NULL,
    "visibility" "LoopEventVisibility" NOT NULL DEFAULT 'SYSTEM_ONLY',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoopEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoopLink" (
    "id" TEXT NOT NULL,
    "sourceRunId" TEXT NOT NULL,
    "targetRunId" TEXT NOT NULL,
    "relation" "LoopLinkRelation" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoopLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationContract" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "verifierEndpointId" TEXT NOT NULL,
    "claimSchema" JSONB NOT NULL DEFAULT '{}',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRun" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "loopRunId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoopDefinition_code_key" ON "LoopDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityEndpoint_code_key" ON "CapabilityEndpoint"("code");

-- CreateIndex
CREATE INDEX "CapabilityEndpoint_ownerType_ownerId_idx" ON "CapabilityEndpoint"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "CapabilityEndpoint_healthStatus_idx" ON "CapabilityEndpoint"("healthStatus");

-- CreateIndex
CREATE INDEX "CapabilityEndpoint_paths_idx" ON "CapabilityEndpoint" USING GIN ("paths");

-- CreateIndex
CREATE INDEX "LoopOffering_status_idx" ON "LoopOffering"("status");

-- CreateIndex
CREATE INDEX "LoopOffering_paths_idx" ON "LoopOffering" USING GIN ("paths");

-- CreateIndex
CREATE INDEX "LoopOffering_definitionId_idx" ON "LoopOffering"("definitionId");

-- CreateIndex
CREATE INDEX "LoopRun_demandId_idx" ON "LoopRun"("demandId");

-- CreateIndex
CREATE INDEX "LoopRun_orderId_idx" ON "LoopRun"("orderId");

-- CreateIndex
CREATE INDEX "LoopRun_status_idx" ON "LoopRun"("status");

-- CreateIndex
CREATE INDEX "LoopRun_loopKind_createdAt_idx" ON "LoopRun"("loopKind", "createdAt");

-- CreateIndex
CREATE INDEX "LoopRun_correlationId_idx" ON "LoopRun"("correlationId");

-- CreateIndex
CREATE INDEX "LoopEvent_loopRunId_createdAt_idx" ON "LoopEvent"("loopRunId", "createdAt");

-- CreateIndex
CREATE INDEX "LoopEvent_type_createdAt_idx" ON "LoopEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoopEvent_loopRunId_idempotencyKey_key" ON "LoopEvent"("loopRunId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "LoopLink_sourceRunId_idx" ON "LoopLink"("sourceRunId");

-- CreateIndex
CREATE INDEX "LoopLink_targetRunId_idx" ON "LoopLink"("targetRunId");

-- CreateIndex
CREATE INDEX "LoopLink_relation_idx" ON "LoopLink"("relation");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationContract_offeringId_verifierEndpointId_key" ON "VerificationContract"("offeringId", "verifierEndpointId");

-- CreateIndex
CREATE INDEX "VerificationRun_loopRunId_idx" ON "VerificationRun"("loopRunId");

-- CreateIndex
CREATE INDEX "VerificationRun_contractId_createdAt_idx" ON "VerificationRun"("contractId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoopOffering" ADD CONSTRAINT "LoopOffering_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "LoopDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopOffering" ADD CONSTRAINT "LoopOffering_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "CapabilityEndpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopRun" ADD CONSTRAINT "LoopRun_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "LoopDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopRun" ADD CONSTRAINT "LoopRun_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "LoopOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopEvent" ADD CONSTRAINT "LoopEvent_loopRunId_fkey" FOREIGN KEY ("loopRunId") REFERENCES "LoopRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopLink" ADD CONSTRAINT "LoopLink_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "LoopRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopLink" ADD CONSTRAINT "LoopLink_targetRunId_fkey" FOREIGN KEY ("targetRunId") REFERENCES "LoopRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationContract" ADD CONSTRAINT "VerificationContract_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "LoopOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationContract" ADD CONSTRAINT "VerificationContract_verifierEndpointId_fkey" FOREIGN KEY ("verifierEndpointId") REFERENCES "CapabilityEndpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "VerificationContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_loopRunId_fkey" FOREIGN KEY ("loopRunId") REFERENCES "LoopRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

