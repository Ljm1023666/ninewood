'use client'

import React, { useEffect, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
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
  CircleFadingPlus,
  CircleOff,
  CircleUserRound,
  File,
  Image,
  ListFilter,
  Menu,
  MessageCircle,
  MessageSquareDashed,
  MessageSquareDot,
  Mic,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  Smile,
  SquarePen,
  Star,
  User,
  User2,
  UserRound,
  Users,
  Video,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/** 与模板一致的联系人条目（应用侧可带 id 用于路由） */
export type TemplateContact = {
  id?: string
  name: string
  message: string
  image: string
}

export const DEFAULT_CONTACT_LIST: TemplateContact[] = [
  { name: 'Manoj Rayi', message: 'Your Last Message Here', image: 'https://github.com/rayimanoj8.png' },
  { name: 'Anjali Kumar', message: 'Hello, how are you?', image: 'https://randomuser.me/api/portraits/women/2.jpg' },
  { name: 'Ravi Teja', message: 'Looking forward to the meeting.', image: 'https://randomuser.me/api/portraits/men/3.jpg' },
  { name: 'Sneha Reddy', message: 'Can you send the report?', image: 'https://randomuser.me/api/portraits/women/4.jpg' },
  { name: 'Arjun Das', message: 'Thank you for your help!', image: 'https://randomuser.me/api/portraits/men/5.jpg' },
  { name: 'Priya Sharma', message: "Let's catch up soon.", image: 'https://randomuser.me/api/portraits/women/6.jpg' },
  { name: 'Vikram Singh', message: 'I will call you later.', image: 'https://randomuser.me/api/portraits/men/7.jpg' },
  { name: 'Kavya Rao', message: 'Did you receive my email?', image: 'https://randomuser.me/api/portraits/women/8.jpg' },
  { name: 'Rahul Verma', message: 'Meeting rescheduled to tomorrow.', image: 'https://randomuser.me/api/portraits/men/9.jpg' },
  { name: 'Deepika Nair', message: 'Happy birthday! Have a great day!', image: 'https://randomuser.me/api/portraits/women/10.jpg' },
  { name: 'Rohit Malhotra', message: "What's the update?", image: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { name: 'Neha Gupta', message: "Hope you're doing well!", image: 'https://randomuser.me/api/portraits/women/12.jpg' },
  { name: 'Amit Yadav', message: "Let's finalize the project.", image: 'https://randomuser.me/api/portraits/men/13.jpg' },
  { name: 'Simran Kaur', message: 'Good morning!', image: 'https://randomuser.me/api/portraits/women/14.jpg' },
  { name: 'Varun Chopra', message: "I'll send the documents soon.", image: 'https://randomuser.me/api/portraits/men/15.jpg' },
  { name: 'Meera Joshi', message: 'How was your weekend?', image: 'https://randomuser.me/api/portraits/women/16.jpg' },
  { name: 'Karthik Reddy', message: 'Please confirm the time.', image: 'https://randomuser.me/api/portraits/men/17.jpg' },
  { name: 'Pooja Sharma', message: 'See you at the event!', image: 'https://randomuser.me/api/portraits/women/18.jpg' },
  { name: 'Sandeep Kumar', message: 'Just checking in.', image: 'https://randomuser.me/api/portraits/men/19.jpg' },
  { name: 'Lavanya Patel', message: "Don't forget the meeting.", image: 'https://randomuser.me/api/portraits/women/20.jpg' },
]

const menuItems = [
  { title: 'Messages', url: '#', icon: MessageCircle },
  { title: 'Phone', url: '#', icon: Phone },
  { title: 'Status', url: '#', icon: CircleFadingPlus },
]

export type HomeProps = {
  /** 覆盖左侧联系人列表；不传则用模板默认 20 条 */
  contacts?: TemplateContact[]
  /** 受控：当前会话（高亮列表项 + 右侧信息）；不传则组件内 useState */
  currentChat?: TemplateContact | null
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
}: {
  currentChat: TemplateContact | null
  middle: React.ReactNode
  inputRow: React.ReactNode
  /** 嵌入主 Layout 时用 h-full，避免 h-screen + fixed 侧栏导致遮挡与撑破 flex */
  embedInLayout?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col justify-between pb-2 ml-1',
        embedInLayout ? 'h-full' : 'h-screen',
      )}
    >
      <div className="h-16 border-b flex items-center px-3">
        <Avatar className="size-12">
          <AvatarImage src={currentChat?.image} />
          <AvatarFallback>PR</AvatarFallback>
        </Avatar>
        <div className="space-y-1 ml-2">
          <CardTitle>{currentChat?.name}</CardTitle>
          <CardDescription>Contact Info</CardDescription>
        </div>
        <div className="flex-grow flex justify-end gap-2">
          <Button variant="ghost" size="icon">
            <Video />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone />
          </Button>
          <Button variant="ghost" size="icon">
            <Search />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{middle}</div>

      {inputRow}
    </div>
  )
}

/** 与模板一致的输入条（图标 + 下拉 + Input + Send + Mic） */
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
  const attach =
    attachMenu ?? (
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
        <DropdownMenuTrigger>
          <Button variant="ghost" size="icon">
            <Paperclip />
          </Button>
        </DropdownMenuTrigger>
        {attach}
      </DropdownMenu>
      <Input placeholder="Type a message" className="flex-grow border-0" {...inputProps} />
      <Button variant="ghost" size="icon" type="button" onClick={onSendClick}>
        <Send />
      </Button>
      <Button variant="ghost" size="icon">
        <Mic />
      </Button>
    </div>
  )
}

function LeftChatListPanel({
  contactList,
  onPick,
  embedInLayout = false,
}: {
  contactList: TemplateContact[]
  onPick: (c: TemplateContact, index: number) => void
  embedInLayout?: boolean
}) {
  return (
    <ResizablePanel defaultSize={25} minSize={20} className="min-h-0 min-w-0 flex-grow">
      <div
        className={cn(
          'flex min-h-0 flex-col border ml-1',
          embedInLayout ? 'h-full' : 'h-screen',
        )}
      >
        <div className="h-10 px-2 py-4 flex items-center">
          <p className="ml-1">Chats</p>
          <div className="flex justify-end w-full">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon">
                  <SquarePen />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <User /> New Contact
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users /> New Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ListFilter />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Chats By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <MessageSquareDot /> Unread
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star /> Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CircleUserRound /> Contacts
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CircleOff /> Non Contacts
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Users /> Groups
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageSquareDashed /> Drafts
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="relative px-2 py-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5" />
          <Input placeholder="Search or start new chat" className="pl-10" />
        </div>

        <ScrollArea className="flex-grow">
          {contactList.map((contact, index) => (
            <button
              key={contact.id ?? `${contact.name}-${index}`}
              type="button"
              onClick={() => onPick(contact, index)}
              className="px-4 w-full py-2 hover:bg-secondary cursor-pointer text-left"
            >
              <div className="flex flex-row gap-2">
                <Avatar className="size-12">
                  <AvatarImage src={contact.image} />
                  <AvatarFallback>{contact.name[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <CardTitle>{contact.name}</CardTitle>
                  <CardDescription>{contact.message}</CardDescription>
                </div>
              </div>
            </button>
          ))}
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
  return (
    <ResizablePanel defaultSize={75} minSize={40} className="min-h-0 min-w-0">
      <TemplateChatRightShell
        currentChat={currentChat}
        middle={<div className="h-full w-full" />}
        inputRow={<TemplateChatInputRow inputProps={{ readOnly: true }} />}
        embedInLayout={embedInLayout}
      />
    </ResizablePanel>
  )
}

/** 模板 Navigate 侧栏（依赖 SidebarProvider + useSidebar） */
function TemplateNavigateSidebar() {
  const { toggleSidebar } = useSidebar()
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigate</SidebarGroupLabel>
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
            <SidebarMenuButton>
              <Settings /> Settings
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <User2 /> Manoj Rayi
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem>
                  <a href="https://github.com/rayimanoj8/">Account</a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Back Up</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span>Sign out</span>
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
  onSelectContact,
  rightColumn,
  showNavigateRail = true,
}: HomeProps = {}) {
  const contacts = contactsProp ?? DEFAULT_CONTACT_LIST
  const embedInLayout = !showNavigateRail
  const [internalChat, setInternalChat] = useState<TemplateContact | null>(() => contacts[0] ?? null)

  useEffect(() => {
    if (currentChatProp !== undefined) return
    if (!contacts.length) {
      setInternalChat(null)
      return
    }
    const same = (a: TemplateContact | null, b: TemplateContact) =>
      (a?.id != null && b.id != null && a.id === b.id) ||
      (!!a && a.name === b.name && a.image === b.image && a.message === b.message)
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
      <LeftChatListPanel contactList={contacts} onPick={pick} embedInLayout={embedInLayout} />

      <ResizableHandle />

      {rightColumn ?? (
        <DefaultRightChatPanel currentChat={currentChat} embedInLayout={embedInLayout} />
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
