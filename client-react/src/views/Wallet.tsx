import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/ui/back-button'
import { MsIcon } from '@/components/ui/ms-icon'
import { toast } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import {
  walletApi,
  type WalletLedgerItem,
  type WalletLedgerType,
  type WalletSummary,
} from '@/api/wallet'

const LEDGER_TYPE_LABEL: Record<WalletLedgerType, string> = {
  HOLD: '托管',
  RELEASE: '释放',
  CREDIT: '入账',
  DEBIT: '扣款',
}

const LEDGER_BADGE_CLASS: Record<WalletLedgerType, string> = {
  HOLD: 'wallet-badge--hold',
  RELEASE: 'wallet-badge--release',
  CREDIT: 'wallet-badge--credit',
  DEBIT: 'wallet-badge--debit',
}

function formatPoints(n: number) {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSignedPoints(amount: number) {
  const sign = amount > 0 ? '+' : ''
  return `${sign}${formatPoints(amount)}`
}

function amountClass(type: WalletLedgerType, amount: number) {
  if (type === 'HOLD') return 'wallet-amount--hold'
  if (amount > 0) return 'wallet-amount--pos'
  if (amount < 0) return 'wallet-amount--neg'
  return ''
}

function WalletHeroSkeleton() {
  return (
    <section className="wallet-hero" aria-hidden>
      <div className="wallet-skeleton h-4 w-40" />
      <div className="wallet-skeleton mt-6 h-16 w-72 max-w-full" />
      <div className="mt-8 flex gap-3">
        <div className="wallet-skeleton h-12 w-40 rounded-full" />
        <div className="wallet-skeleton h-12 w-36 rounded-full" />
      </div>
    </section>
  )
}

function WalletStatsSkeleton() {
  return (
    <div className="wallet-stats" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="wallet-stat">
          <div className="wallet-skeleton h-3 w-24" />
          <div className="wallet-skeleton mt-4 h-8 w-32" />
        </div>
      ))}
    </div>
  )
}

export default function Wallet() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [ledger, setLedger] = useState<WalletLedgerItem[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await walletApi.getBalance()
      setSummary(res.data.data)
    } catch {
      toast('加载余额失败', 'error')
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const loadLedger = useCallback(async (pageNum = 1) => {
    setLoadingLedger(true)
    try {
      const res = await walletApi.getLedger({ page: pageNum, limit: 20 })
      const data = res.data.data
      setLedger(data.items)
      setTotalPages(data.totalPages)
      setPage(data.page)
    } catch {
      toast('加载流水失败', 'error')
    } finally {
      setLoadingLedger(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
    void loadLedger(1)
  }, [loadSummary, loadLedger])

  return (
    <div className="wallet-page thin-scroll">
      <div className="wallet-page__ambient" aria-hidden />

      <div className="wallet-page__inner">
        <header className="wallet-topbar">
          <BackButton onBack={() => navigate(-1)} compact />
        </header>

        <div className="wallet-title-block">
          <h1 className="wallet-title-block__heading">点数钱包</h1>
          <div className="wallet-title-block__rule">
            <span aria-hidden />
            <p className="wallet-title-block__subtitle">开发期模拟货币 · 1 点 = 1 元</p>
            <span aria-hidden />
          </div>
        </div>

        {loadingSummary ? (
          <WalletHeroSkeleton />
        ) : summary ? (
          <section className="wallet-hero">
            <MsIcon
              name="account_balance_wallet"
              size={220}
              className="wallet-hero__watermark"
              aria-hidden
            />
            <p className="wallet-hero__label">可用余额 Available Balance</p>
            <div className="wallet-hero__balance">
              <span className="wallet-hero__amount">{formatPoints(summary.balance)}</span>
              <span className="wallet-hero__unit">点</span>
            </div>
            <div className="wallet-hero__actions">
              <button
                type="button"
                className="wallet-btn-primary"
                onClick={() => toast('开发期暂不支持充值', 'info')}
              >
                <MsIcon name="add_circle" size={20} aria-hidden />
                充值点数（开发）
              </button>
              <button
                type="button"
                className="wallet-btn-secondary"
                onClick={() => navigate('/transactions')}
              >
                <MsIcon name="receipt_long" size={20} aria-hidden />
                查看交易记录
              </button>
            </div>
          </section>
        ) : null}

        {loadingSummary ? (
          <WalletStatsSkeleton />
        ) : summary ? (
          <div className="wallet-stats">
            <article className="wallet-stat">
              <div className="wallet-stat__head">
                <span className="wallet-stat__label">托管中 Escrow</span>
                <MsIcon name="lock" size={22} className="wallet-stat__icon" aria-hidden />
              </div>
              <div className="wallet-stat__value">
                <span className="wallet-stat__number">{formatPoints(summary.held)}</span>
                <span className="wallet-stat__unit wallet-stat__unit--gold">点</span>
              </div>
            </article>
            <article className="wallet-stat">
              <div className="wallet-stat__head">
                <span className="wallet-stat__label">本月支出 Expenses</span>
                <MsIcon
                  name="trending_down"
                  size={22}
                  className="wallet-stat__icon wallet-stat__icon--expense"
                  aria-hidden
                />
              </div>
              <div className="wallet-stat__value">
                <span className="wallet-stat__number">{formatPoints(summary.monthlyExpense)}</span>
                <span className="wallet-stat__unit wallet-stat__unit--expense">点</span>
              </div>
            </article>
            <article className="wallet-stat">
              <div className="wallet-stat__head">
                <span className="wallet-stat__label">本月收入 Income</span>
                <MsIcon
                  name="trending_up"
                  size={22}
                  className="wallet-stat__icon wallet-stat__icon--income"
                  aria-hidden
                />
              </div>
              <div className="wallet-stat__value">
                <span className="wallet-stat__number">{formatPoints(summary.monthlyIncome)}</span>
                <span className="wallet-stat__unit wallet-stat__unit--income">点</span>
              </div>
            </article>
          </div>
        ) : null}

        <section className="wallet-ledger">
          <div className="wallet-ledger__head">
            <div>
              <h2 className="wallet-ledger__title">最近交易记录</h2>
              <p className="wallet-ledger__caption">Recent Transactions History</p>
            </div>
            {!loadingLedger && ledger.length > 0 ? (
              <span className="wallet-ledger__meta">20 条/页</span>
            ) : null}
          </div>

          {loadingLedger ? (
            <div className="px-8 py-6 space-y-4" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="wallet-skeleton h-12 w-full" />
              ))}
            </div>
          ) : null}

          {!loadingLedger && ledger.length === 0 ? (
            <div className="wallet-empty">
              <div className="wallet-empty__icon">
                <MsIcon name="account_balance_wallet" size={28} aria-hidden />
              </div>
              <p className="wallet-empty__title">暂无点数流水</p>
              <p className="wallet-empty__desc">发布需求、接单结算后，变动会显示在这里</p>
            </div>
          ) : null}

          {!loadingLedger && ledger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="wallet-ledger-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>类型</th>
                    <th>金额</th>
                    <th>余额</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id}>
                      <td className="wallet-cell-time">
                        {new Date(row.createdAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span className={cn('wallet-badge', LEDGER_BADGE_CLASS[row.type])}>
                          {LEDGER_TYPE_LABEL[row.type]}
                        </span>
                      </td>
                      <td className={amountClass(row.type, row.amount)}>
                        {formatSignedPoints(row.amount)}
                      </td>
                      <td>{formatPoints(row.balanceAfter)}</td>
                      <td className="wallet-cell-memo" title={row.memo ?? ''}>
                        {row.memo || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loadingLedger && totalPages > 1 ? (
            <div className="wallet-pagination">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void loadLedger(i + 1)}
                  className={cn(
                    'wallet-page-btn',
                    page === i + 1 && 'wallet-page-btn--active',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <footer className="wallet-footer">
          <div className="wallet-footer__rule" aria-hidden />
          <p className="wallet-footer__text">
            <MsIcon name="verified_user" size={14} aria-hidden />
            Secure Simulated Environment · 上线前将替换为真实支付渠道
          </p>
        </footer>
      </div>
    </div>
  )
}
