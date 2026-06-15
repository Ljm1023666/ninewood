import { useState, useEffect } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { STITCH_PAGE_ICONS } from '@/constants/stitch-icons'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  InternalPageShell,
  InternalContentBlock,
  SettingsPanel,
  SettingsInput,
  SettingsActionButton,
  StatusChip,
} from '@/components/layout/internal-ui'
import { ListItemCard } from '@/components/ui/list-item-card'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import api from '@/api'

type CircleRow = {
  id: string
  name: string
  type?: string
  _count?: { members?: number; demands?: number }
  memberCount?: number
}

function CircleListItem({
  circle,
  onJoin,
}: {
  circle: CircleRow
  onJoin: () => void
}) {
  const members = circle._count?.members || circle.memberCount || 0
  const demands = circle._count?.demands || 0

  return (
    <ListItemCard variant="internal" className="p-4">
      <div className="relative z-[1] flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-wide text-text-primary">
            {circle.name}
          </h2>
          <StatusChip
            label={`${members}人`}
            className="border-[var(--internal-accent)]/35 bg-[var(--internal-accent)]/10 text-blue-300"
          />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <StatusChip
              label={`${demands} 需求`}
              className="border-white/15 bg-white/5 text-text-muted"
            />
            {circle.type === 'PUBLIC' ? (
              <StatusChip
                label="公开"
                className="border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
              />
            ) : null}
          </div>
          <SettingsActionButton onClick={onJoin}>
            <MsIcon name="login" size={12} className="mr-1" aria-hidden />
            加入
          </SettingsActionButton>
        </div>
      </div>
    </ListItemCard>
  )
}

export default function CircleList() {
  const [circles, setCircles] = useState<CircleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await api.get('/circles-enhanced', { params: { limit: 50 } })
      setCircles(r.data?.data?.circles || [])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function create() {
    if (!name.trim()) return
    await api.post('/circles-enhanced', { name: name.trim(), type: 'PUBLIC' })
    setName('')
    void load()
  }

  async function join(circleId: string) {
    await api.post(`/circles-enhanced/${circleId}/join`)
    void load()
  }

  return (
    <InternalPageShell width="medium">
      <PageHeader
        title="需求圈"
        subtitle="加入需求圈，圈内优先匹配"
        onBack="back"
      />

      <InternalContentBlock>
        <SettingsPanel>
          <div className="flex items-center gap-2 p-4">
            <SettingsInput
              value={name}
              onChange={setName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create()
              }}
              placeholder="圈子名称，需包含「需求圈」"
              className="min-w-0 flex-1"
            />
            <SettingsActionButton variant="primary" onClick={() => void create()}>
              <MsIcon name={STITCH_PAGE_ICONS.circles} size={14} className="mr-1" aria-hidden />
              创建
            </SettingsActionButton>
          </div>
        </SettingsPanel>

        {loading ? <LoadingState variant="internal" lines={3} /> : null}

        {!loading && circles.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {circles.map((c) => (
              <CircleListItem
                key={c.id}
                circle={c}
                onJoin={() => void join(c.id)}
              />
            ))}
          </div>
        ) : null}

        {!loading && circles.length === 0 ? (
          <EmptyState
            variant="internal"
            type="circle"
            message="暂无公开需求圈"
          />
        ) : null}
      </InternalContentBlock>
    </InternalPageShell>
  )
}
