'use client'

import { useState, useEffect, useRef } from 'react'
import { useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DateWheelPicker } from '@/components/ui/date-wheel-picker'
import { cn } from '@/lib/utils'
import { UserPen, Cake, Camera } from 'lucide-react'

const BIO_MAX = 200

export interface ProfileEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    nickname?: string
    bio?: string | null
    birthday?: string | null
    avatarUrl?: string | null
  } | null
  onSave: (data: {
    nickname: string
    bio: string
    birthday?: string
  }) => Promise<void>
  onAvatarChange: (file: File) => Promise<void>
  uploadingKind: 'avatar' | 'cover' | null
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  user,
  onSave,
  onAvatarChange,
  uploadingKind,
}: ProfileEditDialogProps) {
  const id = useId()
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [birthday, setBirthday] = useState<Date | undefined>()
  const [birthdayEditing, setBirthdayEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const prevOpen = useRef(false)

  useEffect(() => {
    if (open && !prevOpen.current && user) {
      setNickname(user.nickname || '')
      setBio(user.bio || '')
      setBirthday(user.birthday ? new Date(user.birthday) : undefined)
      setBirthdayEditing(false)
      setAvatarPreview(null)
    }
    prevOpen.current = open
  }, [open, user])

  const bioRemaining = BIO_MAX - bio.length

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    if (v.length <= BIO_MAX) setBio(v)
  }

  const handleSave = async () => {
    const n = nickname.trim()
    if (!n) return
    setSaving(true)
    try {
      await onSave({
        nickname: n,
        bio: bio.trim(),
        birthday: birthday?.toISOString(),
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    await onAvatarChange(file)
  }

  const displayAvatar = avatarPreview || user?.avatarUrl
  const isUploading = uploadingKind === 'avatar'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        {/* 头部：图标 + 标题 */}
        <div className="flex flex-col gap-2">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border"
            aria-hidden="true"
          >
            <UserPen className="opacity-80 size-4" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">编辑资料</DialogTitle>
            <DialogDescription className="text-left">
              修改你的个人资料和头像
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 头像区域 */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar
              className={cn(
                'h-16 w-16 rounded-full border-2 border-border/50',
                isUploading && 'opacity-50',
              )}
            >
              <AvatarImage
                src={displayAvatar || ''}
                alt={user?.nickname || ''}
              />
              <AvatarFallback className="text-xl">
                {(user?.nickname || '?')[0]}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full bg-foreground/80 text-background hover:bg-foreground transition"
              aria-label="更换头像"
            >
              <Camera className="size-3" />
            </button>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.nickname || '用户'}
            </p>
            <p className="text-xs text-muted-foreground">
              点击下方图标更换头像
            </p>
          </div>
        </div>

        {/* 表单区域 */}
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`nickname-${id}`}>昵称</Label>
              <Input
                id={`nickname-${id}`}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`bio-${id}`}>个人简介</Label>
              <Textarea
                id={`bio-${id}`}
                placeholder="介绍一下自己..."
                value={bio}
                onChange={handleBioChange}
                className="min-h-[80px]"
              />
              <p className="text-xs text-right text-muted-foreground">
                {bioRemaining} 字剩余
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Cake className="size-3.5" />
                生日
              </Label>
              {birthdayEditing ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-3">
                  <DateWheelPicker
                    value={birthday}
                    onChange={setBirthday}
                    size="sm"
                    minYear={1920}
                    maxYear={new Date().getFullYear()}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setBirthdayEditing(false)}
                  >
                    完成
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-input bg-muted/40 px-3 py-2 shadow-sm shadow-black/5">
                  <span className="text-sm text-foreground">
                    {birthday
                      ? birthday.toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '未设置'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setBirthdayEditing(true)}
                  >
                    {birthday ? '修改' : '设置'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            disabled={!nickname.trim() || saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
