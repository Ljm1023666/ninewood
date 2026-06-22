/**
 * Task 10 · Agent 自动化任务管理页
 *
 * Tabs：任务列表 / 结果箱
 * - 任务列表：启停 / 立即运行 / 删除；点击跳详情
 * - 结果箱：未读标记 + 标记已读
 *
 * 创建入口走对话优先（无「手动新建」主按钮）；空态引导回 /agent。
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  agentTasksApi,
  type AgentTask,
  type AgentTaskRun,
} from '@/api/agent-tasks'
import { AgentMarkdown } from '@/components/agent/agent-markdown'

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
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [runs, setRuns] = useState<AgentTaskRun[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

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
      if (tab === 'inbox') await reloadInbox()
      await reloadTasks()
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
    <div className="agent-tasks-page">
      <header className="agent-tasks-page__header">
        <h1 className="agent-tasks-page__title">自动化任务</h1>
        <p className="agent-tasks-page__subtitle">
          定时筛选需求并推送摘要 · 只读 + 只推送 · 永不调用写工具
        </p>
      </header>

      <nav className="agent-tasks-page__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'tasks'}
          className={`agent-tasks-page__tab ${tab === 'tasks' ? 'is-active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          任务列表 <span className="agent-tasks-page__count">{tasks.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'inbox'}
          className={`agent-tasks-page__tab ${tab === 'inbox' ? 'is-active' : ''}`}
          onClick={() => setTab('inbox')}
        >
          结果箱
          {unread > 0 && (
            <span className="agent-tasks-page__badge">{unread}</span>
          )}
        </button>
      </nav>

      {error && <div className="agent-tasks-page__error">{error}</div>}
      {loading && <div className="agent-tasks-page__loading">加载中…</div>}

      {tab === 'tasks' && !loading && tasks.length === 0 && (
        <div className="agent-tasks-page__empty">
          <p>还没有自动化任务。</p>
          <p className="agent-tasks-page__empty-hint">
            去 <Link to="/agent" className="agent-link">和 Agent 对话</Link>，试试说
            「每小时帮我筛含王者荣耀标签的新需求」。
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
    </div>
  )
}