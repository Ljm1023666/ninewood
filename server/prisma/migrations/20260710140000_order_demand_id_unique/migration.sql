-- 每个需求最多一个订单，防止并发接单重复建单
CREATE UNIQUE INDEX "Order_demandId_key" ON "Order"("demandId");
