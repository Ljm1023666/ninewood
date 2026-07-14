-- CreateTable
CREATE TABLE "ServiceCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'ONLINE',
    "cityCode" TEXT,
    "regionId" INTEGER,
    "paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceMin" DECIMAL(10,2),
    "priceMax" DECIMAL(10,2),
    "priceUnit" TEXT,
    "deliveryMode" TEXT NOT NULL DEFAULT 'ONLINE',
    "availability" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCardClaim" (
    "id" TEXT NOT NULL,
    "serviceCardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCardClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceCardEvidence" (
    "id" TEXT NOT NULL,
    "serviceCardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "successfulCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "lastCompletedAt" TIMESTAMP(3),
    "sourceType" TEXT NOT NULL DEFAULT 'COMPLETED_ORDER',
    "sourceVersion" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceCardEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "cardType" TEXT NOT NULL,
    "demandId" TEXT,
    "serviceCardId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceCard_userId_status_idx" ON "ServiceCard"("userId", "status");
CREATE INDEX "ServiceCard_status_createdAt_idx" ON "ServiceCard"("status", "createdAt");
CREATE INDEX "ServiceCard_category_idx" ON "ServiceCard"("category");
CREATE INDEX "ServiceCard_regionId_idx" ON "ServiceCard"("regionId");
CREATE INDEX "ServiceCard_paths_idx" ON "ServiceCard" USING GIN ("paths");
CREATE INDEX "ServiceCard_tags_idx" ON "ServiceCard" USING GIN ("tags");
CREATE UNIQUE INDEX "ServiceCardClaim_serviceCardId_label_key" ON "ServiceCardClaim"("serviceCardId", "label");
CREATE INDEX "ServiceCardClaim_label_idx" ON "ServiceCardClaim"("label");
CREATE UNIQUE INDEX "ServiceCardEvidence_serviceCardId_label_key" ON "ServiceCardEvidence"("serviceCardId", "label");
CREATE INDEX "ServiceCardEvidence_label_completedCount_idx" ON "ServiceCardEvidence"("label", "completedCount");
CREATE UNIQUE INDEX "CardAttachment_messageId_key" ON "CardAttachment"("messageId");
CREATE INDEX "CardAttachment_cardType_idx" ON "CardAttachment"("cardType");
CREATE INDEX "CardAttachment_demandId_idx" ON "CardAttachment"("demandId");
CREATE INDEX "CardAttachment_serviceCardId_idx" ON "CardAttachment"("serviceCardId");

ALTER TABLE "ServiceCard" ADD CONSTRAINT "ServiceCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceCard" ADD CONSTRAINT "ServiceCard_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ServiceCardClaim" ADD CONSTRAINT "ServiceCardClaim_serviceCardId_fkey" FOREIGN KEY ("serviceCardId") REFERENCES "ServiceCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceCardEvidence" ADD CONSTRAINT "ServiceCardEvidence_serviceCardId_fkey" FOREIGN KEY ("serviceCardId") REFERENCES "ServiceCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardAttachment" ADD CONSTRAINT "CardAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardAttachment" ADD CONSTRAINT "CardAttachment_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardAttachment" ADD CONSTRAINT "CardAttachment_serviceCardId_fkey" FOREIGN KEY ("serviceCardId") REFERENCES "ServiceCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
