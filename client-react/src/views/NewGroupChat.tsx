import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { messageApi } from '@/api/message'
import { toast } from '@/components/ui/confirm-dialog'
interface Contact {
  id: string
  nickname: string
  avatarUrl?: string | null
}

export default function NewGroupChat() {
  const navigate = useNavigate()
  const myId = useUserStore((s) => s.user?.id)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selected, setSelected] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!myId) return
    messageApi.conversations().then((convRes) => {
      const convs = ((convRes.data.data ?? []) as any[]).map((c: any) => c.user)
      Promise.all([userApi.following(myId), userApi.followers(myId)])
        .then(([fr, fer]) => {
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
        .catch(() => {})
    })
  }, [myId])

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

  function handleDone() {
    if (selected.length === 0) return
    setShowNameDialog(true)
  }

  async function createGroup() {
    if (selected.length === 0 || creating) return
    setCreating(true)
    try {
      const name =
        groupName.trim() || selected.map((s) => s.nickname).join('、')
      const res = await messageApi.createMerge(
        name,
        selected.map((s) => s.id),
      )
      navigate(`/messages/merge/${res.data.data.id}`, { replace: true })
    } catch (e: any) {
      setCreating(false)
      toast(e?.response?.data?.message || e?.message || '创建失败')
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-bg-primary text-text-primary">
      {/* 顶栏 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary"
        >
          <X className="h-5 w-5" />
          取消
        </button>
        <span className="text-base font-bold">发起群聊</span>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={handleDone}
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
        {selected.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selected.map((c) => (
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

      {/* 群名弹窗 */}
      {showNameDialog && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNameDialog(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-center text-lg font-bold text-text-primary">
              设置群聊名称
            </h2>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="输入群聊名称"
              autoFocus
              className="mt-4 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[var(--primary-start)]"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowNameDialog(false)}
                className="flex-1 rounded-lg border border-border py-2 text-sm text-text-secondary"
              >
                取消
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={createGroup}
                className="flex-1 rounded-lg bg-[var(--primary-start)] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {creating ? '创建中…' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
