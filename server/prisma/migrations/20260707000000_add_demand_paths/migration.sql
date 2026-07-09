-- TASK-11: 路径检索字段与 GIN 索引
ALTER TABLE "Demand" ADD COLUMN "paths" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Demand" ADD COLUMN "pathsEditedAt" TIMESTAMP(3);
CREATE INDEX "Demand_paths_idx" ON "Demand" USING GIN ("paths");
