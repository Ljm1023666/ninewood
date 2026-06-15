import { useState, useCallback } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SettingsInput,
  SegmentedFilter,
  SearchResultRow,
  StatusChip,
} from '@/components/layout/internal-ui'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import api from '@/api'

const MODE_OPTIONS = [
  { value: 'normal' as const, label: '普通' },
  { value: 'special' as const, label: '特殊' },
]

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
    <InternalPageShell width="medium">
      <PageHeader title="找服务者" onBack="back" divider={false} className="mb-6" />

      <InternalContentBlock>
        <SettingsInput
          value={tag}
          onChange={setTag}
          onKeyDown={(e) => e.key === 'Enter' && search(tag)}
          placeholder="搜索服务者、技能标签…"
        />

        <SegmentedFilter
          options={MODE_OPTIONS}
          value={mode}
          onChange={(v) => {
            setMode(v)
            if (tag.trim()) search(tag)
          }}
        />

        <p className="text-xs text-text-muted">
          {mode === 'normal'
            ? '普通检索 — 只显示空闲（IDLE）状态的服务者'
            : '特殊检索 — 穿透忙碌（BUSY）状态，可看到所有在线服务者'}
        </p>

        <div className="flex flex-wrap gap-2">
          {tagHistory.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTag(t)
                search(t)
              }}
              className="border border-[var(--internal-hairline)] px-3 py-1 font-mono text-xs text-text-muted transition-colors hover:bg-white/[0.03] hover:text-text-primary"
            >
              {t}
            </button>
          ))}
        </div>

        {loading && <LoadingState variant="internal" lines={3} />}

        {!loading && total > 0 && (
          <p className="text-sm text-text-secondary">
            找到{' '}
            <span className="font-semibold text-[var(--internal-accent)]">
              {total}
            </span>{' '}
            位服务者
          </p>
        )}

        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map((p: any, i: number) => {
              const metaParts = [
                p.certified ? '已认证' : null,
                p.tagName,
                `评分 ${p.rating?.toFixed(1) || '-'}`,
                `${p.orderCount || 0} 单`,
              ].filter(Boolean)

              return (
                <SearchResultRow
                  key={p.userId || i}
                  title={p.tagName || `服务者 ${p.userId}`}
                  meta={metaParts.join(' · ')}
                  avatarFallback={p.tagName?.charAt(0) || '?'}
                  badge={p.status === 'BUSY' ? '忙碌' : '可接单'}
                />
              )
            })}
          </div>
        )}

        {!loading && results.length === 0 && tag && (
          <EmptyState
            type="search"
            variant="internal"
            message="未找到服务者，试试其他标签"
          />
        )}

        {!loading && !tag && (
          <EmptyState
            type="search"
            variant="internal"
            message="输入标签开始搜索"
          />
        )}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
