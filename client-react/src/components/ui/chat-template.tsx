'use client'

import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  SidebarInset,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/blocks/sidebar'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardDescription, CardTitle } from '@/components/ui/card'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Brush,
  Camera,
  ChartBarIncreasing,
  ChevronUp,
  File,
  Image,
  ListFilter,
  Menu,
  MessageCircle,
  MessageSquareDot,
  Paperclip,
  Send,
  Settings,
  Smile,
  SquarePen,
  User,
  User2,
  UserRound,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/** 与模板一致的联系人条目（应用侧可带 id 用于路由） */
export type TemplateContact = {
  id?: string
  name: string
  message: string
  image: string
  unreadCount?: number
  /** 'user' | 'merge'，用于区分群聊与会话 */
  type?: 'user' | 'merge'
}

export const DEFAULT_CONTACT_LIST: TemplateContact[] = [
  {
    name: 'Manoj Rayi',
    message: 'Your Last Message Here',
    image: 'https://github.com/rayimanoj8.png',
  },
  {
    name: 'Anjali Kumar',
    message: 'Hello, how are you?',
    image: 'https://randomuser.me/api/portraits/women/2.jpg',
  },
  {
    name: 'Ravi Teja',
    message: 'Looking forward to the meeting.',
    image: 'https://randomuser.me/api/portraits/men/3.jpg',
  },
  {
    name: 'Sneha Reddy',
    message: 'Can you send the report?',
    image: 'https://randomuser.me/api/portraits/women/4.jpg',
  },
  {
    name: 'Arjun Das',
    message: 'Thank you for your help!',
    image: 'https://randomuser.me/api/portraits/men/5.jpg',
  },
  {
    name: 'Priya Sharma',
    message: "Let's catch up soon.",
    image: 'https://randomuser.me/api/portraits/women/6.jpg',
  },
  {
    name: 'Vikram Singh',
    message: 'I will call you later.',
    image: 'https://randomuser.me/api/portraits/men/7.jpg',
  },
  {
    name: 'Kavya Rao',
    message: 'Did you receive my email?',
    image: 'https://randomuser.me/api/portraits/women/8.jpg',
  },
  {
    name: 'Rahul Verma',
    message: 'Meeting rescheduled to tomorrow.',
    image: 'https://randomuser.me/api/portraits/men/9.jpg',
  },
  {
    name: 'Deepika Nair',
    message: 'Happy birthday! Have a great day!',
    image: 'https://randomuser.me/api/portraits/women/10.jpg',
  },
  {
    name: 'Rohit Malhotra',
    message: "What's the update?",
    image: 'https://randomuser.me/api/portraits/men/11.jpg',
  },
  {
    name: 'Neha Gupta',
    message: "Hope you're doing well!",
    image: 'https://randomuser.me/api/portraits/women/12.jpg',
  },
  {
    name: 'Amit Yadav',
    message: "Let's finalize the project.",
    image: 'https://randomuser.me/api/portraits/men/13.jpg',
  },
  {
    name: 'Simran Kaur',
    message: 'Good morning!',
    image: 'https://randomuser.me/api/portraits/women/14.jpg',
  },
  {
    name: 'Varun Chopra',
    message: "I'll send the documents soon.",
    image: 'https://randomuser.me/api/portraits/men/15.jpg',
  },
  {
    name: 'Meera Joshi',
    message: 'How was your weekend?',
    image: 'https://randomuser.me/api/portraits/women/16.jpg',
  },
  {
    name: 'Karthik Reddy',
    message: 'Please confirm the time.',
    image: 'https://randomuser.me/api/portraits/men/17.jpg',
  },
  {
    name: 'Pooja Sharma',
    message: 'See you at the event!',
    image: 'https://randomuser.me/api/portraits/women/18.jpg',
  },
  {
    name: 'Sandeep Kumar',
    message: 'Just checking in.',
    image: 'https://randomuser.me/api/portraits/men/19.jpg',
  },
  {
    name: 'Lavanya Patel',
    message: "Don't forget the meeting.",
    image: 'https://randomuser.me/api/portraits/women/20.jpg',
  },
]

const menuItems = [
  { title: '消息', to: '/messages', icon: MessageCircle },
  { title: '找人', to: '/search', icon: Users },
]

export type HomeProps = {
  /** 覆盖左侧联系人列表；不传则用模板默认 20 条 */
  contacts?: TemplateContact[]
  /** 受控：当前会话（高亮列表项 + 右侧信息）；不传则组件内 useState */
  currentChat?: TemplateContact | null
  /** 与路由会话 id 一致时高亮左侧条目 */
  selectedContactId?: string | null
  /** 选中左侧联系人 */
  onSelectContact?: (contact: TemplateContact, index: number) => void
  /** 传入时完全替换右侧 ResizablePanel 内容（用于嵌入 ChatDetail / 占位） */
  rightColumn?: React.ReactNode
  /**
   * 是否显示模板左侧 Navigate 浮动侧栏（Messages / Phone / Status）。
   * 在 Ninewood 主 Layout 内应设为 false：该侧栏为 position:fixed;left:0，会盖住会话列表并与全局侧栏叠在一起。
   */
  showNavigateRail?: boolean
}

/** 模板右侧：中间消息区 + 与模板一致的底栏（由业务传入 Input 等交互） */
export function TemplateChatRightShell({
  currentChat,
  middle,
  inputRow,
  embedInLayout = false,
  headerLeading,
  avatarFallback,
  onProfileClick,
}: {
  currentChat: TemplateContact | null
  middle: React.ReactNode
  inputRow: React.ReactNode
  embedInLayout?: boolean
  headerLeading?: React.ReactNode
  avatarFallback?: string
  /** 点击"联系人信息" → 跳转 /profile/:id */
  onProfileClick?: () => void
}) {
  const fb =
    avatarFallback?.trim() ||
    (currentChat?.name ? currentChat.name.slice(0, 2) : '?')

  const showAvatar =
    currentChat && currentChat.name && currentChat.name.trim() !== ''

  return (
    <div
      className={cn(
        'ml-1 flex min-h-0 flex-col border-l border-border bg-background',
        embedInLayout ? 'h-full' : 'h-screen',
      )}
    >
      <div className="flex h-16 shrink-0 items-center border-b border-border px-2">
        {headerLeading ? (
          <div className="mr-1 flex shrink-0 items-center">{headerLeading}</div>
        ) : null}
        {showAvatar ? (
          <Avatar className="size-12 shrink-0">
            <AvatarImage src={currentChat?.image} />
            <AvatarFallback className="text-xs font-semibold">
              {fb}
            </AvatarFallback>
          </Avatar>
        ) : null}
        {showAvatar ? (
          onProfileClick ? (
            <button
              type="button"
              onClick={onProfileClick}
              className="ml-2 min-w-0 flex-1 cursor-pointer text-left hover:opacity-80"
            >
              <CardTitle className="truncate text-base font-semibold text-text-primary">
                {currentChat?.name}
              </CardTitle>
              <CardDescription className="text-xs text-text-muted">
                查看主页
              </CardDescription>
            </button>
          ) : (
            <div className="ml-2 min-w-0 flex-1">
              <CardTitle className="truncate text-base font-semibold text-text-primary">
                {currentChat?.name}
              </CardTitle>
            </div>
          )
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {middle}
      </div>

      <div className="shrink-0">{inputRow}</div>
    </div>
  )
}

/** 与模板一致的输入条（图标 + 下拉 + Input + Send） */
export function TemplateChatInputRow({
  inputProps,
  onSendClick,
  attachMenu,
  smileButtonProps,
}: {
  inputProps: React.ComponentProps<typeof Input>
  onSendClick?: () => void
  /** 可选：替换 Paperclip 下拉的交互（如隐藏文件 input） */
  attachMenu?: React.ReactNode
  smileButtonProps?: React.ComponentProps<typeof Button>
}) {
  const attach = attachMenu ?? (
    <DropdownMenuContent>
      <DropdownMenuItem>
        <Image /> Photos & Videos
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Camera /> Camera
      </DropdownMenuItem>
      <DropdownMenuItem>
        <File /> Document
      </DropdownMenuItem>
      <DropdownMenuItem>
        <UserRound /> Contact
      </DropdownMenuItem>
      <DropdownMenuItem>
        <ChartBarIncreasing /> Poll
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Brush /> Drawing
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  return (
    <div className="flex h-10 pt-2 border-t">
      <Button variant="ghost" size="icon" type="button" {...smileButtonProps}>
        <Smile />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" type="button">
            <Paperclip />
          </Button>
        </DropdownMenuTrigger>
        {attach}
      </DropdownMenu>
      <Input
        placeholder="输入消息…"
        className="flex-grow border-0"
        {...inputProps}
      />
      <Button variant="ghost" size="icon" type="button" onClick={onSendClick}>
        <Send />
      </Button>
    </div>
  )
}

function LeftChatListPanel({
  contactList,
  onPick,
  selectedContactId,
  embedInLayout = false,
  onNewChat,
  onNavigateToSearch,
}: {
  contactList: TemplateContact[]
  onPick: (c: TemplateContact, index: number) => void
  selectedContactId?: string | null
  embedInLayout?: boolean
  /** 点击"新建联系人" */
  onNewChat?: () => void
  /** 点击"新建群聊" */
  onNavigateToSearch?: () => void
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filtered: { contact: TemplateContact; origIndex: number }[] = []
  contactList.forEach((c, i) => {
    if (filter === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) return
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.message.toLowerCase().includes(q)
      )
        return
    }
    filtered.push({ contact: c, origIndex: i })
  })
  return (
    <ResizablePanel
      defaultSize={25}
      minSize={20}
      className="min-h-0 min-w-0 flex-grow"
    >
      <div
        className={cn(
          'ml-1 flex min-h-0 flex-col border-r border-border bg-card/30',
          embedInLayout ? 'h-full' : 'h-screen',
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 px-3">
          <p className="text-base font-bold tracking-tight text-text-primary">
            会话
          </p>
          <div className="flex justify-end w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" type="button">
                  <SquarePen />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onNewChat}>
                  <User /> 新建联系人
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onNavigateToSearch}>
                  <Users /> 新建群聊
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" type="button">
                  <ListFilter />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>筛选会话</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      setFilter(filter === 'unread' ? 'all' : 'unread')
                    }
                  >
                    <MessageSquareDot />
                    未读
                    {filter === 'unread' && ' ✓'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative shrink-0 px-3 pb-3">
          <Input
            placeholder="搜索或发起新聊天"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-border bg-background"
          />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {filtered.map(({ contact, origIndex }) => {
            const selected = !!contact.id && contact.id === selectedContactId
            return (
              <button
                key={contact.id ?? `${contact.name}-${origIndex}`}
                type="button"
                onClick={() => onPick(contact, origIndex)}
                className={cn(
                  'w-full border-l-2 border-transparent px-3 py-3 text-left transition-colors',
                  'hover:bg-accent/10',
                  selected &&
                    'border-[var(--primary-start)] bg-accent/15 shadow-[inset_3px_0_0_var(--primary-start)]',
                )}
              >
                <div className="flex flex-row items-center gap-3">
                  <Avatar className="size-12 shrink-0">
                    {contact.type === 'merge' ? (
                      <AvatarFallback className="bg-[var(--primary-start)]/15 text-[var(--primary-start)]">
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={contact.image} />
                        <AvatarFallback>
                          {contact.name?.charAt(0) ?? '?'}
                        </AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="truncate text-[15px] font-semibold leading-tight text-text-primary">
                      {contact.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1 text-xs text-text-muted">
                      {contact.message}
                    </CardDescription>
                  </div>
                </div>
              </button>
            )
          })}
        </ScrollArea>
      </div>
    </ResizablePanel>
  )
}

function DefaultRightChatPanel({
  currentChat,
  embedInLayout = false,
}: {
  currentChat: TemplateContact | null
  embedInLayout?: boolean
}) {
  const navigateTo = useNavigate()
  return (
    <ResizablePanel defaultSize={75} minSize={40} className="min-h-0 min-w-0">
      <TemplateChatRightShell
        currentChat={currentChat}
        middle={<div className="h-full w-full" />}
        inputRow={<TemplateChatInputRow inputProps={{ readOnly: true }} />}
        embedInLayout={embedInLayout}
        onProfileClick={() => {
          if (currentChat?.id) navigateTo(`/profile/${currentChat.id}`)
        }}
      />
    </ResizablePanel>
  )
}

/** 模板 Navigate 侧栏（依赖 SidebarProvider + useSidebar） */
function TemplateNavigateSidebar() {
  const { toggleSidebar } = useSidebar()
  const navigate = useNavigate()
  const me = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleSidebar} asChild>
                  <span>
                    <Menu />
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <Settings /> 设置
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> {me?.nickname ?? '我'}
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild>
                  <Link to="/profile">个人主页</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    logout()
                    navigate('/login', { replace: true })
                  }}
                >
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

// ** Home Component（与所给模板一致；可选 props 接入路由数据） **
export function Home({
  contacts: contactsProp,
  currentChat: currentChatProp,
  selectedContactId,
  onSelectContact,
  rightColumn,
  showNavigateRail = true,
}: HomeProps = {}) {
  const contacts = contactsProp ?? DEFAULT_CONTACT_LIST
  const navigateTo = useNavigate()
  const embedInLayout = !showNavigateRail
  const [internalChat, setInternalChat] = useState<TemplateContact | null>(
    () => contacts[0] ?? null,
  )

  useEffect(() => {
    if (currentChatProp !== undefined) return
    if (!contacts.length) {
      setInternalChat(null)
      return
    }
    const same = (a: TemplateContact | null, b: TemplateContact) =>
      (a?.id != null && b.id != null && a.id === b.id) ||
      (!!a &&
        a.name === b.name &&
        a.image === b.image &&
        a.message === b.message)
    const still = internalChat && contacts.some((c) => same(internalChat, c))
    if (!still) setInternalChat(contacts[0] ?? null)
  }, [contacts, currentChatProp, internalChat])

  const isControlled = currentChatProp !== undefined
  const currentChat = isControlled ? currentChatProp : internalChat

  function pick(contact: TemplateContact, index: number) {
    onSelectContact?.(contact, index)
    if (!isControlled) setInternalChat(contact)
  }

  const mainPanels = (
    <ResizablePanelGroup
      direction="horizontal"
      className={cn(embedInLayout ? 'h-full min-h-0' : 'h-screen')}
    >
      <LeftChatListPanel
        contactList={contacts}
        onPick={pick}
        selectedContactId={selectedContactId}
        embedInLayout={embedInLayout}
        onNewChat={() => navigateTo('/search')}
        onNavigateToSearch={() => navigateTo('/messages/new-group')}
      />

      <ResizableHandle />

      {rightColumn ?? (
        <DefaultRightChatPanel
          currentChat={currentChat}
          embedInLayout={embedInLayout}
        />
      )}
    </ResizablePanelGroup>
  )

  return (
    <>
      {showNavigateRail ? <TemplateNavigateSidebar /> : null}

      <SidebarInset
        className={cn(
          'min-h-0 min-w-0 w-full',
          embedInLayout && 'flex-1 overflow-hidden',
        )}
      >
        {mainPanels}
      </SidebarInset>
    </>
  )
}

/** 独立预览：SidebarProvider + 与模板一致的 Home */
export function ChatTemplateDemoPage() {
  return (
    <SidebarProvider>
      <Home />
    </SidebarProvider>
  )
}
