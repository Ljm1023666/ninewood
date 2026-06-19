import { useState, useEffect } from 'react'
import { Receipt, ArrowUpRight, ArrowDownLeft, Gift } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BackButton } from '@/components/ui/back-button'
import { Badge } from '@/components/ui/badge'
import api from '@/api'

interface TransactionItem {
  id: string
  demandId: string
  demandTitle: string
  role: 'DEMANDER' | 'PROVIDER'
  minPrice: number
  finalPrice: number
  serviceFee: number
  demanderPaid: number
  providerReceived: number
  platformRevenue: number
  depositReturned: number
  isWelfare: boolean
  createdAt: string
}

export default function TransactionHistory() {
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  async function load(pageNum = 1) {
    setLoading(true)
    try {
      const r = await api.get('/transactions/history', {
        params: { page: pageNum, limit: 20 },
      })
      setItems(r.data?.data?.items || [])
      setTotalPages(r.data?.data?.totalPages || 1)
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function goPage(p: number) {
    setPage(p)
    load(p)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Receipt className="size-5 text-amber-400" />
          交易历史
        </h1>
        <p className="text-sm text-text-primary/40 mb-6">
          查看所有已完成交易的明细
        </p>

        {loading ? (
          <div className="text-center text-text-primary/30 py-12">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <Card className="border-border bg-bg-secondary backdrop-blur-md">
            <CardContent className="p-8 text-center">
              <Receipt className="size-12 text-text-primary/10 mx-auto mb-3" />
              <p className="text-text-primary/30">暂无交易记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="border-border bg-bg-secondary backdrop-blur-md hover:border-amber-500/30 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.role === 'DEMANDER' ? (
                        <ArrowUpRight className="size-4 text-red-400" />
                      ) : (
                        <ArrowDownLeft className="size-4 text-emerald-400" />
                      )}
                      <span className="text-sm font-medium text-text-primary">
                        {item.demandTitle}
                      </span>
                      {item.isWelfare && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          <Gift className="size-3 mr-0.5" />
                          公益
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-text-primary/30">
                      {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-text-primary/40">成交金额</span>
                    <span className="text-text-primary text-right">
                      ¥{item.finalPrice.toFixed(2)}
                    </span>
                    <span className="text-text-primary/40">平台服务费</span>
                    <span className="text-text-primary/30 text-right">
                      ¥{item.serviceFee.toFixed(2)}
                    </span>
                    {item.depositReturned > 0 && (
                      <>
                        <span className="text-text-primary/40">押金退回</span>
                        <span className="text-emerald-400 text-right">
                          +¥{item.depositReturned.toFixed(2)}
                        </span>
                      </>
                    )}
                    <span className="text-text-primary/40 pt-1 border-t border-border mt-1">
                      {item.role === 'DEMANDER' ? '你支付' : '你收到'}
                    </span>
                    <span
                      className={`text-right pt-1 border-t border-border mt-1 font-bold ${item.role === 'DEMANDER' ? 'text-red-400' : 'text-emerald-400'}`}
                    >
                      {item.role === 'DEMANDER' ? '-' : '+'}¥
                      {item.role === 'DEMANDER'
                        ? (item.demanderPaid - item.depositReturned).toFixed(2)
                        : item.providerReceived.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => goPage(i + 1)}
                    className={`px-3 py-1 rounded text-xs ${page === i + 1 ? 'bg-amber-500/20 text-amber-400' : 'text-text-primary/30 hover:text-text-primary/60'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
