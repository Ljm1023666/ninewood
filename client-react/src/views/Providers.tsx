import { useState, useCallback } from 'react'
import { Search, Clock, Star, User } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import api from '@/api'

export default function Providers() {
  const [tag, setTag] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'normal' | 'special'>('normal')
  const [tagHistory] = useState<string[]>([
    '出租车司机',
    '平面设计',
    '王者荣耀陪玩',
    '同城跑腿',
    '家政保洁',
    '小程序开发',
  ])

  const search = useCallback(
    async (tagName: string) => {
      if (!tagName.trim()) return
      setLoading(true)
      try {
        if (mode === 'special') {
          const res = await api.post('/providers/special-search', {
            tagName: tagName.trim(),
            includeBusy: true,
          })
          const data = res.data?.data || res.data
          setResults(data?.providers || [])
          setTotal(data?.providers?.length || 0)
        } else {
          const res = await api.get('/providers/search', {
            params: { tagName: tagName.trim(), limit: 20 },
          })
          const data = res.data?.data || res.data
          setResults(data?.providers || [])
          setTotal(data?.total || 0)
        }
      } catch (e) {
        console.error('Provider search error', e)
        setResults([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    },
    [mode],
  )

  return (
    <div
      className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll"
      style={{
        fontFamily:
          "'Space Mono', 'Montserrat', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
        {/* 标题区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            找到<span className="text-[#A78BFA]">服务者</span>
          </h1>
          <p className="mt-2 text-sm text-text-primary/40">
            输入标签名称，检索附近空闲的服务者。匿名安全，只显示距离不暴露位置。
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-primary/30" />
            <Input
              className="pl-10 h-12 rounded-xl border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/20 text-base"
              placeholder="搜索标签名称..."
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search(tag)
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMode('normal')
                search(tag)
              }}
              variant={mode === 'normal' ? 'default' : 'outline'}
              className={`h-12 rounded-xl px-5 text-sm font-bold cursor-pointer transition-colors duration-200 ${
                mode === 'normal'
                  ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-text-primary'
                  : 'border-border text-text-primary/40 hover:text-text-primary'
              }`}
            >
              普通
            </Button>
            <Button
              onClick={() => {
                setMode('special')
                search(tag)
              }}
              variant={mode === 'special' ? 'default' : 'outline'}
              className={`h-12 rounded-xl px-5 text-sm font-bold cursor-pointer transition-colors duration-200 ${
                mode === 'special'
                  ? 'bg-[#7C3AED] hover:bg-[#6D28D9] text-text-primary'
                  : 'border-border text-text-primary/40 hover:text-text-primary'
              }`}
            >
              特殊
            </Button>
          </div>
        </div>

        {/* 模式说明 */}
        <p className="mb-4 text-xs text-text-primary/30">
          {mode === 'normal'
            ? '普通检索 — 只显示空闲（IDLE）状态的服务者'
            : '特殊检索 — 穿透忙碌（BUSY）状态，可看到所有在线服务者'}
        </p>

        {/* 快速标签 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tagHistory.map((t) => (
            <Badge
              key={t}
              variant="secondary"
              className="cursor-pointer rounded-full border-border bg-bg-secondary text-text-primary/60 hover:bg-bg-tertiary hover:text-text-primary transition-colors duration-200 px-4 py-1.5"
              onClick={() => {
                setTag(t)
                search(t)
              }}
            >
              {t}
            </Badge>
          ))}
        </div>

        {/* 结果区 */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Clock className="size-5 text-text-primary/40 animate-spin" />
            <span className="ml-2 text-sm text-text-primary/40">搜索中...</span>
          </div>
        )}

        {!loading && total > 0 && (
          <p className="mb-4 text-sm text-text-primary/50">
            找到 <span className="text-[#A78BFA] font-bold">{total}</span>{' '}
            位服务者
          </p>
        )}

        <div className="flex flex-col gap-3">
          {!loading &&
            results.map((p: any, i: number) => (
              <Card
                key={p.userId || i}
                className="cursor-pointer rounded-xl border-border bg-bg-secondary backdrop-blur-xl hover:bg-bg-tertiary hover:border-white/[0.12] transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30">
                        <User className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold text-text-primary truncate">
                            {p.tagName}
                          </CardTitle>
                          <Badge
                            className={`rounded-full text-xs cursor-default ${
                              p.status === 'BUSY'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {p.status === 'BUSY' ? '忙碌' : '空闲'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-text-primary/40 font-mono">
                          ID: {p.userId}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-xs text-text-primary/40">
                      <span className="flex items-center gap-1">
                        <Star className="size-3.5 text-muted-foreground" />
                        {p.rating?.toFixed(1) || '-'}
                      </span>
                      <span>{p.orderCount || 0} 单</span>
                    </div>
                  </div>
                  {p.certified && (
                    <Badge className="mt-3 rounded-full bg-blue-500/15 text-blue-400 border-blue-500/20 text-xs cursor-default">
                      已认证
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}

          {!loading && results.length === 0 && tag && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="size-10 text-text-primary/10 mb-4" />
              <p className="text-text-primary/30 font-mono text-sm">
                未找到服务者
              </p>
              <p className="mt-1 text-text-primary/15 text-xs">
                试试其他标签，如&ldquo;出租车司机&rdquo;
              </p>
            </div>
          )}

          {!tag && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="size-12 mb-4 opacity-20" />
              <p className="text-text-primary/30 font-mono text-sm">
                输入标签开始搜索
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
