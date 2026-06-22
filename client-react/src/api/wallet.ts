import api from './index'

export type WalletSummary = {
  balance: number
  held: number
  monthlyIncome: number
  monthlyExpense: number
}

export type WalletLedgerType = 'HOLD' | 'RELEASE' | 'CREDIT' | 'DEBIT'

export type WalletLedgerItem = {
  id: string
  type: WalletLedgerType
  amount: number
  balanceAfter: number
  referenceType: string | null
  referenceId: string | null
  memo: string | null
  createdAt: string
}

export type WalletLedgerPage = {
  items: WalletLedgerItem[]
  total: number
  page: number
  totalPages: number
}

export const walletApi = {
  getBalance() {
    return api.get<{ data: WalletSummary }>('/wallet/balance')
  },
  getLedger(params?: { page?: number; limit?: number }) {
    return api.get<{ data: WalletLedgerPage }>('/wallet/ledger', { params })
  },
}
