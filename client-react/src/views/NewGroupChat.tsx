import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/stores/user'
import { userApi } from '@/api/user'
import { messageApi } from '@/api/message'
import { toast } from '@/components/ui/confirm-dialog'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpBtnPrimary,
  DlpBtnGhost,
} from '@/components/layout/desktop-page'

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
      const name = groupName.trim() || selected.map((s) => s.nickname).join('、')
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
    <DesktopPageShell
      title="发起群聊"
      subtitle="选择联系人创建合并会话"
      flush
      actions={
        <DlpBtnPrimary onClick={handleDone} disabled={selected.length === 0}>
          {selected.length <= 1 ? '完成' : `下一步 (${selected.length})`}
        </DlpBtnPrimary>
      }
    >
      <div className="dlp-split dlp-split--group min-h-[480px]">
        <div className="flex min-h-0 flex-col">
          <div className="dlp-search-row !mb-4">
            <input
              className="dlp-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索联系人"
            />
          </div>

          <DlpGlass className="min-h-0 flex-1 overflow-hidden">
            <div className="thin-scroll max-h-[520px] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {filtered.map((c) => {
                  const isSel = !!selected.find((x) => x.id === c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c)}
                      className={cn(
                        'flex items-center gap-3 border-b border-[var(--wallet-divider)] px-4 py-3 text-left transition-colors hover:bg-[var(--wallet-row-hover)]',
                        isSel && 'bg-[color-mix(in_srgb,var(--price-foreground)_8%,transparent)]',
                      )}
                    >
                      <div className="dlp-avatar !size-10">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" />
                        ) : (
                          c.nickname.charAt(0)
                        )}
                      </div>
                      <span className="flex-1 text-base text-text-primary">{c.nickname}</span>
                      <div
                        className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded border-2',
                          isSel
                            ? 'border-[var(--price-foreground)] bg-[var(--price-foreground)]'
                            : 'border-[var(--wallet-glass-border)]',
                        )}
                      >
                        {isSel && <MsIcon name="check" size={12} className="text-[var(--wallet-on-accent)]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </DlpGlass>
        </div>

        <aside>
          <DlpGlass className="flex h-full flex-col">
            <DlpGlassHead title="已选成员" subtitle={`${selected.length} 人`} />
            <DlpGlassBody className="min-h-[200px] flex-1">
              {selected.length === 0 ? (
                <p className="text-sm text-text-muted">从左侧列表选择联系人</p>
              ) : (
                <div className="dlp-tag-grid">
                  {selected.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c)}
                      className="dlp-tag dlp-tag--on"
                    >
                      {c.nickname}
                      <MsIcon name="close" size={14} />
                    </button>
                  ))}
                </div>
              )}
            </DlpGlassBody>
          </DlpGlass>
        </aside>
      </div>

      {showNameDialog && (
        <div className="dlp-modal-backdrop">
          <div
            className="absolute inset-0"
            onClick={() => setShowNameDialog(false)}
          />
          <div className="dlp-glass dlp-modal relative z-10">
            <h3>设置群聊名称</h3>
            <input
              className="dlp-input mt-4 w-full"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="输入群聊名称（可选）"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <DlpBtnGhost onClick={() => setShowNameDialog(false)} className="flex-1">
                取消
              </DlpBtnGhost>
              <DlpBtnPrimary onClick={createGroup} disabled={creating} className="flex-1">
                {creating ? '创建中…' : '创建'}
              </DlpBtnPrimary>
            </div>
          </div>
        </div>
      )}
    </DesktopPageShell>
  )
}
