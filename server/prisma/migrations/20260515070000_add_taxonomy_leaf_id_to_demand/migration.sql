-- Add leaf-level taxonomy field for accurate card-pool stats
ALTER TABLE "Demand"
ADD COLUMN "taxonomyLeafId" TEXT;

CREATE INDEX "Demand_taxonomyLeafId_idx" ON "Demand"("taxonomyLeafId");
