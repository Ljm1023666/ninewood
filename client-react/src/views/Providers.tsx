import { useState, useCallback } from 'react'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpBtnPrimary,
  DlpBadge,
  DlpEmpty,
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'
import api from '@/api'
import { cn } from '@/lib/utils'

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
    <DesktopPageShell title="找服务者" subtitle="按技能标签搜索可接单的服务者" density="compact">
      <div className="dlp-split dlp-split--aside">
        <aside className="dlp-stack">
          <DlpGlass>
            <DlpGlassHead title="搜索条件" />
            <div className="dlp-glass__body">
              <div className="dlp-field">
                <label className="dlp-label">技能标签</label>
                <input
                  className="dlp-input"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search(tag)}
                  placeholder="搜索技能标签…"
                />
              </div>
              <div className="dlp-tabs !mb-4">
                {MODE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={cn('dlp-tab', mode === o.value && 'dlp-tab--active')}
                    onClick={() => {
                      setMode(o.value)
                      if (tag.trim()) search(tag)
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="mb-4 text-sm text-text-muted">
                {mode === 'normal'
                  ? '普通检索 — 只显示空闲服务者'
                  : '特殊检索 — 可穿透忙碌状态'}
              </p>
              <p className="dlp-label !normal-case !tracking-normal">热门标签</p>
              <div className="dlp-tag-grid mb-4">
                {tagHistory.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="dlp-tag"
                    onClick={() => {
                      setTag(t)
                      search(t)
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <DlpBtnPrimary onClick={() => search(tag)} disabled={!tag.trim() || loading} className="w-full">
                搜索
              </DlpBtnPrimary>
            </div>
          </DlpGlass>
        </aside>

        <div>
          {loading && <LoadingState variant="internal" lines={3} />}

          {!loading && total > 0 && (
            <p className="mb-4 text-sm text-text-secondary">
              找到 <span className="dlp-table__gold">{total}</span> 位服务者
            </p>
          )}

          {!loading && results.length > 0 && (
            <DlpGlass>
              <div className="dlp-table-wrap">
                <table className="dlp-table">
                  <thead>
                    <tr>
                      <th>服务者</th>
                      <th>标签</th>
                      <th>评分</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((p: any, i: number) => (
                      <tr key={p.userId || i}>
                        <td className="dlp-table__primary">
                          {p.tagName || `服务者 ${p.userId}`}
                        </td>
                        <td>{p.tagName || '—'}</td>
                        <td className="tabular-nums">{p.rating?.toFixed(1) || '—'}</td>
                        <td>
                          <DlpBadge tone={p.status === 'BUSY' ? 'warn' : 'success'}>
                            {p.status === 'BUSY' ? '忙碌' : '可接单'}
                          </DlpBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DlpGlass>
          )}

          {!loading && results.length === 0 && tag && (
            <DlpGlass>
              <DlpEmpty title="未找到服务者" description="试试其他标签" />
            </DlpGlass>
          )}

          {!loading && !tag && (
            <DlpGlass>
              <DlpEmpty
                title="开始搜索"
                description="在左侧输入或选择标签开始搜索"
              />
            </DlpGlass>
          )}
        </div>
      </div>
    </DesktopPageShell>
  )
}
