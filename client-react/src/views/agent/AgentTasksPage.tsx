/**
 * Task 10 · Agent 自动化任务管理页
 *
 * Tabs：任务列表 / 结果箱
 * - 任务列表：表单新建 + 启停 / 立即运行 / 删除
 * - 结果箱：未读标记 + 标记已读
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import '@/styles/agent-tasks.css'
import { Link, useNavigate } from 'react-router-dom'
import {
  agentTasksApi,
  type AgentTask,
  type AgentTaskRun,
} from '@/api/agent-tasks'
import { AgentTaskCreateForm } from '@/components/agent/agent-task-create-form'
import { AgentMarkdown } from '@/components/agent/agent-markdown'
import { PageHeader } from '@/components/layout/PageHeader'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import {
  InternalContentBlock,
  InternalPageShell,
  SegmentedFilter,
} from '@/components/layout/internal-ui'
import { MAX_ACTIVE_TASKS } from '@/utils/agent-task-form'

type Tab = 'tasks' | 'inbox'

function describeSchedule(t: AgentTask): string {
  const h = (t.atHour ?? 0).toString().padStart(2, '0')
  const m = t.atMinute.toString().padStart(2, '0')
  switch (t.frequency) {
    case 'HOURLY':
      return `每小时 :${m}`
    case 'DAILY':
      return `每天 ${h}:${m}`
    case 'WEEKLY': {
      const names = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
      return `每${names[t.weekday ?? 1]} ${h}:${m}`
    }
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { hour12: false })
}

export default function AgentTasksPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [runs, setRuns] = useState<AgentTaskRun[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const atTaskQuota = tasks.length >= MAX_ACTIVE_TASKS

  const tabOptions = useMemo(
    () => [
      { value: 'tasks' as const, label: `任务列表 (${tasks.length})` },
      {
        value: 'inbox' as const,
        label: unread > 0 ? `结果箱 · ${unread} 未读` : '结果箱',
      },
    ],
    [tasks.length, unread],
  )

  const reloadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await agentTasksApi.list()
      setTasks(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadInbox = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [box, count] = await Promise.all([
        agentTasksApi.inbox({ limit: 50 }),
        agentTasksApi.unreadCount(),
      ])
      setRuns(box.runs)
      setUnread(count)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await agentTasksApi.unreadCount()
      setUnread(count)
    } catch {
      /* 角标刷新失败不影响主流程 */
    }
  }, [])

  useEffect(() => {
    if (tab === 'tasks') reloadTasks()
    else reloadInbox()
  }, [tab, reloadTasks, reloadInbox])

  async function handleToggle(t: AgentTask) {
    setPendingId(t.id)
    try {
      await agentTasksApi.patch(t.id, { enabled: !t.enabled })
      await reloadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setPendingId(null)
    }
  }

  async function handleRunNow(t: AgentTask) {
    setPendingId(t.id)
    try {
      await agentTasksApi.runNow(t.id)
      await reloadTasks()
      await refreshUnreadCount()
      if (tab === 'inbox') await reloadInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : '执行失败')
    } finally {
      setPendingId(null)
    }
  }

  async function handleDelete(t: AgentTask) {
    if (!window.confirm(`确认删除任务「${t.name}」？此操作不可恢复。`)) return
    setPendingId(t.id)
    try {
      await agentTasksApi.remove(t.id)
      await reloadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    } finally {
      setPendingId(null)
    }
  }

  async function handleMarkRead(runId: string) {
    try {
      await agentTasksApi.markRead(runId)
      await reloadInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : '标记失败')
    }
  }

  return (
    <InternalPageShell width="medium">
      <div className="agent-tasks-page">
        <PageHeader
          title="自动化任务"
          subtitle="用自然语言描述任务 → AI 构建执行流程 → 满意后保存"
          onBack={() => navigate('/agent')}
          actions={
            tab === 'tasks' ? (
              <LiquidMetalButton
                label={formOpen ? '收起表单' : '+ 新建任务'}
                onClick={() => setFormOpen(v => !v)}
                disabled={atTaskQuota && !formOpen}
                aria-label={atTaskQuota ? `最多 ${MAX_ACTIVE_TASKS} 个任务` : undefined}
              />
            ) : undefined
          }
        />

        <InternalContentBlock>
          <div className="agent-tasks-page__tabs-wrap">
            <SegmentedFilter
              options={tabOptions}
              value={tab}
              onChange={setTab}
              size="large"
            />
          </div>

          {error && <div className="agent-tasks-page__error">{error}</div>}
          {loading && <div className="agent-tasks-page__loading">加载中…</div>}

          {tab === 'tasks' && formOpen && (
            <div className="agent-task-form-panel">
              {atTaskQuota ? (
                <div className="agent-tasks-page__error">
                  已达上限（每用户最多 {MAX_ACTIVE_TASKS} 个任务）。请先删除或暂停旧任务。
                </div>
              ) : (
                <AgentTaskCreateForm
                  onCreated={() => {
                    setFormOpen(false)
                    void reloadTasks()
                  }}
                  onCancel={() => setFormOpen(false)}
                />
              )}
            </div>
          )}

          {tab === 'tasks' && !formOpen && atTaskQuota && (
            <p className="agent-tasks-page__quota-hint">
              任务已满 {MAX_ACTIVE_TASKS}/{MAX_ACTIVE_TASKS}。删除后可新建，或在{' '}
              <Link to="/agent" className="agent-link">Agent 对话</Link> 中让助手起草。
            </p>
          )}

          {tab === 'tasks' && !loading && tasks.length === 0 && !formOpen && (
            <div className="agent-tasks-page__empty">
              <p>还没有自动化任务。</p>
              <p className="agent-tasks-page__empty-hint">
                点击右上角「新建任务」，用自然语言描述后点「构建任务」；也可去{' '}
                <Link to="/agent" className="agent-link">和 Agent 对话</Link> 起草。
              </p>
            </div>
          )}

          {tab === 'tasks' && tasks.length > 0 && (
            <ul className="agent-tasks-list">
              {tasks.map(t => (
                <li key={t.id} className="agent-task-item">
                  <div className="agent-task-item__head">
                    <div className="agent-task-item__title">
                      <span className={`agent-task-item__pill ${t.enabled ? 'is-on' : 'is-off'}`}>
                        {t.enabled ? '运行中' : '已暂停'}
                      </span>
                      <strong>{t.name}</strong>
                    </div>
                    <div className="agent-task-item__actions">
                      <button
                        type="button"
                        className="agent-btn agent-btn--ghost"
                        onClick={() => handleToggle(t)}
                        disabled={pendingId === t.id}
                      >
                        {t.enabled ? '暂停' : '启用'}
                      </button>
                      <button
                        type="button"
                        className="agent-btn agent-btn--ghost"
                        onClick={() => handleRunNow(t)}
                        disabled={pendingId === t.id}
                      >
                        立即运行
                      </button>
                      <button
                        type="button"
                        className="agent-btn agent-btn--danger"
                        onClick={() => handleDelete(t)}
                        disabled={pendingId === t.id}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <div className="agent-task-item__meta">
                    <span>⏰ {describeSchedule(t)}</span>
                    <span>📦 类型 {t.type}</span>
                    <span>
                      📡 {t.deliveryChannels.map(c => (c === 'MESSAGE' ? '消息中心' : '结果箱')).join(' + ')}
                    </span>
                  </div>
                  <div className="agent-task-item__schedule">
                    <span>下次运行：{formatDate(t.nextRunAt)}</span>
                    <span>上次运行：{formatDate(t.lastRunAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === 'inbox' && !loading && runs.length === 0 && (
            <div className="agent-tasks-page__empty">
              <p>结果箱为空。任务执行后会自动收到推送。</p>
            </div>
          )}

          {tab === 'inbox' && runs.length > 0 && (
            <ul className="agent-inbox-list">
              {runs.map(r => (
                <li
                  key={r.id}
                  className={`agent-inbox-item ${r.readAt ? 'is-read' : 'is-unread'}`}
                >
                  <div className="agent-inbox-item__head">
                    <span className={`agent-inbox-item__status agent-inbox-item__status--${r.status.toLowerCase()}`}>
                      {r.status === 'SUCCESS' ? '命中' : r.status === 'EMPTY' ? '无结果' : '失败'}
                    </span>
                    <span className="agent-inbox-item__name">
                      {r.task?.name ?? '未知任务'}
                    </span>
                    <span className="agent-inbox-item__time">
                      {formatDate(r.runAt)}
                    </span>
                    {!r.readAt && (
                      <button
                        type="button"
                        className="agent-btn agent-btn--ghost agent-btn--xs"
                        onClick={() => handleMarkRead(r.id)}
                      >
                        标记已读
                      </button>
                    )}
                  </div>
                  <div className="agent-inbox-item__body">
                    <AgentMarkdown content={r.summary} />
                    {Array.isArray(r.payload) && r.payload.length > 0 && (
                      <ul className="agent-inbox-item__hits">
                        {(r.payload as Array<{ id?: string; title?: string; path?: string }>).map(
                          (item, idx) => (
                            <li key={item.id ?? idx}>
                              <Link to={item.path ?? '#'} className="agent-link">
                                {item.title ?? item.id ?? '未命名'}
                              </Link>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </InternalContentBlock>
      </div>
    </InternalPageShell>
  )
}
