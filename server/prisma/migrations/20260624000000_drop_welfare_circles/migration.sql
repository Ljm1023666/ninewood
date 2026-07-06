-- 内测 v0.2：彻底删除"公益圈/激励任务圈"（自动建圈的 PUBLIC 圈）
-- 原因：
--   1) PUBLIC 圈对外可见，内测期不应开放
--   2) 业务价值低，激励中心是占位功能
--   3) 用户已选择"只保留私人圈"
-- 影响范围：仅清理 welfare 路由自动建的 PUBLIC 圈（name 以"激励任务圈-"或"公益需求圈-"开头）
-- 私人圈（用户手动创建）保留不动

BEGIN;

-- 1. 找到所有需要删除的 circle id
-- 匹配 name LIKE '激励任务圈-%' 或 '公益需求圈-%'
CREATE TEMP TABLE _welfare_circles ON COMMIT DROP AS
  SELECT id FROM "Circle"
  WHERE name LIKE '激励任务圈-%'
     OR name LIKE '公益需求圈-%';

-- 2. 解除这些 circle 与需求的多对多关联（CircleDemand）
-- ON DELETE CASCADE 会自动级联删除 CircleDemand 行
DELETE FROM "CircleDemand"
WHERE "circleId" IN (SELECT id FROM _welfare_circles);

-- 3. 解除这些 circle 与需求的直接关联（Demand.circleId）
-- SetNull 而非 Cascade，避免误删用户需求
UPDATE "Demand"
SET "circleId" = NULL
WHERE "circleId" IN (SELECT id FROM _welfare_circles);

-- 4. 删除成员关系（CircleMember ON DELETE CASCADE）
-- 已在 Circle 删除时自动级联

-- 5. 删除这些 PUBLIC 圈本身（级联删除 members/announcements/activities/resources/invites）
DELETE FROM "Circle"
WHERE id IN (SELECT id FROM _welfare_circles);

-- 6. 清空 welfare 资金池数据（内测占位，无真实资金）
--    注意：保留表结构，仅清零余额 + 清空拨付与奖励流水
TRUNCATE TABLE "WelfareDisbursement" RESTART IDENTITY;
TRUNCATE TABLE "WelfareReward" RESTART IDENTITY;
UPDATE "WelfareFundPool" SET "balance" = 0, "totalInflow" = 0, "totalOutflow" = 0;

COMMIT;
