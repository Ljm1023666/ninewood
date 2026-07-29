import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { circleApi } from '@/api/circle'
import { cn } from '@/lib/utils'
import { MsIcon } from '@/components/ui/ms-icon'
import {
  DesktopPageShell,
  DlpGlass,
  DlpEmpty,
  DlpBtnPrimary,
} from '@/components/layout/desktop-page'
import { LoadingState } from '@/components/ui/loading-state'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import '@/styles/circles-plaza.css'
import '@/styles/circle-interest-detail.css'

const roleLabel: Record<string, string> = {
  OWNER: '圈主',
  ADMIN: '管理员',
  MEMBER: '成员',
}

type CircleBrief = {
  id: string
  name: string
  description?: string | null
  type?: string
  status?: string
  memberCount?: number
  createdAt?: string
  _count?: { members?: number }
}

type MyCircleRow = {
  circleId: string
  role: string
  circle?: CircleBrief
}

function inferTheme(c: Pick<CircleBrief, 'name' | 'description'>): string {
  const text = `${c.name || ''} ${c.description || ''}`
  if (/设计|UI|视觉/i.test(text)) return 'UI设计'
  if (/开发|技术|代码|工程/i.test(text)) return '技术开发'
  if (/产品|需求/i.test(text)) return '产品需求'
  if (/数据|分析/i.test(text)) return '数据分析'
  if (/测试/i.test(text)) return '测试服务'
  return '综合'
}

function circleIcon(c: Pick<CircleBrief, 'name' | 'description' | 'type'>): string {
  const text = `${c.name || ''} ${c.description || ''}`.toLowerCase()
  if (text.includes('设计') || text.includes('ui')) return 'palette'
  if (text.includes('开发') || text.includes('技术') || text.includes('代码')) return 'code'
  if (text.includes('产品') || text.includes('需求')) return 'lightbulb'
  if (text.includes('数据') || text.includes('分析')) return 'analytics'
  if (text.includes('测试')) return 'bug_report'
  if (c.type === 'PRIVATE') return 'lock'
  return 'groups'
}

function statusChip(status?: string): { label: string; className: string } {
  if (status === 'WARNING') return { label: '低活跃', className: 'circles-mine__chip--warn' }
  if (status === 'DEFUNCT') return { label: '已停用', className: 'circles-mine__chip--bad' }
  return { label: '活跃', className: 'circles-mine__chip--ok' }
}

export default function CirclesMine() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<MyCircleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await circleApi.my()
      setRows(res.data.data as MyCircleRow[])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const list = useMemo(
    () =>
      rows.filter((r) => r.circle?.id).map((r) => ({
        ...r,
        circle: r.circle!,
      })),
    [rows],
  )

  return (
    <DesktopPageShell
      title="我的圈子"
      subtitle="管理你创建与加入的圈子"
      actions={
        <LiquidMetalButton
          type="button"
          className="circles-plaza__tool-btn"
          onClick={() => navigate('/circles')}
        >
          <MsIcon name="explore" size={16} aria-hidden />
          圈子广场
        </LiquidMetalButton>
      }
    >
      {loading ? <LoadingState variant="internal" lines={3} /> : null}

      {error ? (
        <DlpGlass>
          <DlpEmpty
            icon={<MsIcon name="error_outline" size={48} />}
            title="加载失败"
            description={error}
            action={<DlpBtnPrimary onClick={() => void load()}>重试</DlpBtnPrimary>}
          />
        </DlpGlass>
      ) : null}

      {!loading && !error ? (
        <div className="circles-plaza__mine-grid">
          {list.map((row) => {
            const c = row.circle
            const chip = statusChip(c.status)
            const total = c._count?.members ?? c.memberCount ?? 0
            const open = () => navigate(`/circles/${c.id}`)
            return (
              <article key={row.circleId} className="circles-plaza__mine-card">
                <div className="circles-plaza__mine-top">
                  <div className="circles-plaza__mine-icon" aria-hidden>
                    <MsIcon name={circleIcon(c)} size={26} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="circles-plaza__mine-title-row">
                      <h3 className="circles-plaza__mine-title" onClick={open}>
                        {c.name}
                      </h3>
                      <span
                        className={cn(
                          'circles-plaza__role',
                          row.role === 'OWNER' && 'circles-plaza__role--owner',
                        )}
                      >
                        {roleLabel[row.role] ?? row.role}
                      </span>
                      <span className={cn('circles-mine__chip', chip.className)}>
                        {chip.label}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-text-secondary">
                      {c.description?.trim() || '暂无简介'}
                    </p>
                  </div>
                </div>
                <div className="circles-plaza__mine-foot">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <MsIcon name="group" size={14} aria-hidden />
                      {total} 人
                    </span>
                    <span aria-hidden>·</span>
                    <span>{inferTheme(c)}</span>
                    <span aria-hidden>·</span>
                    <span>{c.type === 'PUBLIC' ? '公开' : '私密'}</span>
                  </div>
                  <LiquidMetalButton
                    type="button"
                    className="circles-plaza__enter"
                    onClick={open}
                  >
                    进入
                    <MsIcon name="chevron_right" size={16} aria-hidden />
                  </LiquidMetalButton>
                </div>
              </article>
            )
          })}

          {list.length === 0 ? (
            <div className="col-span-full">
              <DlpGlass>
                <DlpEmpty
                  icon={<MsIcon name="folder_off" size={48} />}
                  title="你还没有加入圈子"
                  description="去圈子广场创建或加入一个圈子吧"
                  action={
                    <LiquidMetalButton
                      label="前往圈子广场"
                      onClick={() => navigate('/circles')}
                    />
                  }
                />
              </DlpGlass>
            </div>
          ) : null}
        </div>
      ) : null}
    </DesktopPageShell>
  )
}
