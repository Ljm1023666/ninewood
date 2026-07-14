import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Search, SquarePen, Users } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import type { TemplateContact } from '@/components/ui/chat-template'
import { cn } from '@/lib/utils'
import { formatChatTime } from '@/utils/time'

type Props = {
  contacts: TemplateContact[]
  loading: boolean
  selectedContactId: string | null
  unreadById: Record<string, number>
  onSelectContact: (contact: TemplateContact) => void
}

/** src 不变时头像组件不更新，避免重复设置背景图。 */
const ConversationAvatar = memo(function ConversationAvatar({
  image,
  name,
  isMerge,
}: {
  image: string
  name: string
  isMerge?: boolean
}) {
  if (isMerge) {
    return (
      <div className="msg-list-avatar msg-list-avatar--merge" aria-hidden>
        <Users className="size-4" />
      </div>
    )
  }

  if (image) {
    return (
      <div
        className="msg-list-avatar msg-list-avatar--photo"
        style={{ backgroundImage: `url("${image.replace(/"/g, '\\"')}")` }}
        role="img"
        aria-label={name}
      />
    )
  }

  return (
    <div className="msg-list-avatar msg-list-avatar--fallback" aria-hidden>
      {name.charAt(0) || '?'}
    </div>
  )
})

function MessagesConversationSidebarImpl({
  contacts,
  loading,
  selectedContactId,
  unreadById,
  onSelectContact,
}: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.message.toLowerCase().includes(q),
    )
  }, [contacts, search])

  return (
    <aside className="msg-conv-sidebar">
      <header className="internal-page-header msg-list-header shrink-0 px-4">
        <div className="flex min-w-0 items-center">
          <BackButton compact />
          <h1 className="internal-display-title ml-4">消息</h1>
        </div>
        <div className="msg-list-header__actions">
          <button
            type="button"
            className="msg-list-header__action"
            onClick={() => navigate('/messages/new-group')}
            aria-label="新建群聊"
            title="新建群聊"
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            className="msg-list-header__action"
            onClick={() => navigate('/search')}
            aria-label="发起新会话"
            title="发起新会话"
          >
            <SquarePen className="size-4" />
          </button>
        </div>
      </header>

      <div className="msg-list-search-wrap shrink-0 px-4 pb-3">
        <div className="msg-list-search-field">
          <Search className="msg-list-search__icon size-4" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索会话"
            className="msg-list-search"
          />
        </div>
      </div>

      <div
        className="msg-conv-sidebar__scroll thin-scroll"
        aria-busy={loading && contacts.length === 0}
      >
        <div className="msg-list-rows">
          {loading && contacts.length === 0
            ? Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="msg-list-skeleton" aria-hidden>
                  <span className="msg-list-skeleton__avatar" />
                  <span className="msg-list-skeleton__copy">
                    <span className="msg-list-skeleton__name" />
                    <span className="msg-list-skeleton__message" />
                  </span>
                </div>
              ))
            : null}

          {filtered.map((contact) => {
            const id = contact.id ?? contact.name
            const selected =
              !!contact.id && contact.id === selectedContactId
            const unread =
              contact.id && contact.id in unreadById
                ? unreadById[contact.id]!
                : (contact.unreadCount ?? 0)

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectContact(contact)}
                className={cn(
                  'internal-message-row w-full text-left',
                  selected && 'internal-message-row--active',
                )}
              >
                <ConversationAvatar
                  image={contact.image}
                  name={contact.name}
                  isMerge={contact.type === 'merge'}
                />
                <div className="msg-list-copy min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="msg-list-name truncate">
                      {contact.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {contact.lastMessageAt ? (
                        <span className="msg-list-time">
                          {formatChatTime(contact.lastMessageAt)}
                        </span>
                      ) : null}
                      {unread > 0 ? (
                        <span className="msg-list-unread-badge">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <p
                    className={cn(
                      'msg-list-preview mt-1 truncate',
                      unread > 0 && 'msg-list-preview--unread',
                    )}
                  >
                    {contact.message || '暂无消息'}
                  </p>
                </div>
              </button>
            )
          })}

          {!loading && filtered.length === 0 ? (
            <div className="msg-list-empty">
              <MessageCircle className="size-5" aria-hidden />
              <span>{search.trim() ? '没有匹配的会话' : '暂无会话'}</span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

function sidebarPropsEqual(a: Props, b: Props) {
  return (
    a.contacts === b.contacts &&
    a.loading === b.loading &&
    a.selectedContactId === b.selectedContactId &&
    a.unreadById === b.unreadById &&
    a.onSelectContact === b.onSelectContact
  )
}

export const MessagesConversationSidebar = memo(
  MessagesConversationSidebarImpl,
  sidebarPropsEqual,
)
