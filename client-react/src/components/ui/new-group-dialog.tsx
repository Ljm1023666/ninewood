import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { messageApi } from '@/api/message'

interface Contact {
  id: string
  nickname: string
  avatarUrl?: string | null
}

interface NewGroupDialogProps {
  open: boolean
  onClose: () => void
}

export function NewGroupDialog({ open, onClose }: NewGroupDialogProps) {
  const navigate = useNavigate()
  const myId = useUserStore((s) => s.user?.id)
  const [title, setTitle] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact[]>([])
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || !myId) return
    setTitle('')
    setSelected([])
    setSearch('')
    // 加载联系人：消息过的用户 + 关注/粉丝
    Promise.all([
      messageApi.conversations(),
      userApi.following(myId),
      userApi.followers(myId),
    ])
      .then(([convRes, fr, fer]) => {
        const convs = ((convRes.data.data ?? []) as any[]).map(
          (c: any) => c.user,
        )
        const following = (fr.data.data?.list ?? []) as any[]
        const followers = (fer.data.data?.list ?? []) as any[]
        const map = new Map<string, Contact>()
        for (const u of [...convs, ...following, ...followers]) {
          if (!u?.id || u.id === myId) continue
          if (!map.has(u.id)) {
            map.set(u.id, {
              id: u.id,
              nickname: u.nickname || '?',
              avatarUrl: u.avatarUrl,
            })
          }
        }
        setContacts(Array.from(map.values()))
      })
      .catch(() => setContacts([]))
  }, [open, myId])

  function toggle(c: Contact) {
    setSelected((prev) => {
      const exists = prev.find((x) => x.id === c.id)
      if (exists) return prev.filter((x) => x.id !== c.id)
      return [...prev, c]
    })
  }

  const filtered = contacts.filter((c) =>
    c.nickname.toLowerCase().includes(search.toLowerCase()),
  )

  const sortedSelected = [...selected]

  async function create() {
    if (!title.trim() || selected.length === 0) return
    setCreating(true)
    try {
      const res = await messageApi.createMerge(
        title.trim(),
        selected.map((s) => s.id),
      )
      onClose()
      navigate(`/messages/merge/${res.data.data.id}`)
    } catch {
      /* noop */
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-card text-text-primary">
      {/* 顶栏 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-text-secondary"
        >
          <X className="h-5 w-5" />
          取消
        </button>
        <span className="text-base font-bold">发起群聊</span>
        <button
          type="button"
          disabled={selected.length === 0 || creating}
          onClick={() => {
            if (selected.length === 1) {
              // 只有一人 → 直接发起单聊
              const s = selected[0]!
              onClose()
              navigate(`/messages/${s.id}`)
              return
            }
            // 多人 → 创建群聊
            setTitle('')
            void create()
          }}
          className="text-sm font-semibold text-[var(--primary-start)] disabled:opacity-30"
        >
          {selected.length <= 1 ? '完成' : `下一步(${selected.length})`}
        </button>
      </div>

      {/* 搜索 + 已选 */}
      <div className="shrink-0 border-b border-border bg-bg-secondary px-4 pb-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索"
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
        {/* 已选联系人 chips */}
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sortedSelected.map((c) => (
              <span
                key={c.id}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-[var(--primary-start)]/15 px-3 py-1.5 text-sm font-medium text-[var(--primary-start)]"
                onClick={() => toggle(c)}
              >
                {c.nickname}
                <X className="h-3.5 w-3.5" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 联系人列表 */}
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {filtered.map((c) => {
          const isSel = !!selected.find((x) => x.id === c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c)}
              className="flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left active:bg-bg-secondary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-tertiary text-sm font-bold text-text-secondary">
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  c.nickname.charAt(0)
                )}
              </div>
              <span className="flex-1 text-[15px] text-text-primary">
                {c.nickname}
              </span>
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  isSel
                    ? 'border-[var(--primary-start)] bg-[var(--primary-start)]'
                    : 'border-border',
                )}
              >
                {isSel && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 群名输入（选多人后显示） */}
      {selected.length > 1 && (
        <div className="shrink-0 border-t border-border bg-bg-secondary px-4 py-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入群聊名称（选填）"
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[var(--primary-start)]"
          />
          <button
            type="button"
            disabled={selected.length === 0 || creating}
            onClick={create}
            className="mt-2 w-full rounded-lg bg-[var(--primary-start)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            创建群聊 ({selected.length}人)
          </button>
        </div>
      )}
    </div>
  )
}
