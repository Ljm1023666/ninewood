/**
 * AI 2.5 结算服务 — 预充值扣款模式
 * 需求发布时预付最低报价 → 平台托管 → 完成后分配
 */

export interface SettlementBreakdown {
  minPrice: number
  finalPrice: number
  serviceFee: number
  demanderPaid: number
  providerReceived: number
  platformRevenue: number
  depositReturned: number
}

export function calculateSettlement(
  minPrice: number,
  finalPrice: number,
  deposit: number,
): SettlementBreakdown {
  const serviceFee = Math.round(finalPrice * 0.05 * 100) / 100
  const demanderPaid = finalPrice + serviceFee
  const providerReceived = finalPrice
  const platformRevenue = serviceFee

  return {
    minPrice,
    finalPrice,
    serviceFee,
    demanderPaid,
    providerReceived,
    platformRevenue,
    depositReturned: deposit,
  }
}

export function calculateSettlementWelfare(
  minPrice: number,
  finalPrice: number,
  deposit: number,
): SettlementBreakdown {
  // 公益需求: 10% platform fee goes to welfare fund pool
  const serviceFee = Math.round(finalPrice * 0.1 * 100) / 100
  const demanderPaid = finalPrice + serviceFee
  const providerReceived = finalPrice
  const platformRevenue = serviceFee

  return {
    minPrice,
    finalPrice,
    serviceFee,
    demanderPaid,
    providerReceived,
    platformRevenue,
    depositReturned: deposit,
  }
}
