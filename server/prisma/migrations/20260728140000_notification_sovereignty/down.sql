-- 回滚脚本（仅本地/测试库演练，禁止对生产直接执行）
-- 配对：20260728140000_notification_sovereignty
-- 不触碰 PushPreference / Short / Follow

DROP TABLE IF EXISTS "NotificationDelivery";
DROP TABLE IF EXISTS "NotificationSubscription";
DROP TABLE IF EXISTS "NotificationPolicy";

DROP TYPE IF EXISTS "NotificationDeliveryStatus";
DROP TYPE IF EXISTS "NotificationDeliveryMode";
DROP TYPE IF EXISTS "NotificationChannel";
DROP TYPE IF EXISTS "NotificationCategory";
