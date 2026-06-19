'use client'

import { useState, useEffect, useRef } from 'react'
import { useId } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DateWheelPicker } from '@/components/ui/date-wheel-picker'
import { cn } from '@/lib/utils'
import { Cake, Camera } from 'lucide-react'

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

/** 编辑资料弹窗（Stitch Achromatic · 固定深色） */
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

  const displayAvatar = avatarPreview || user?.avatarUrl || undefined
  const isUploading = uploadingKind === 'avatar'
  const avatarInitial = (user?.nickname || '?').slice(0, 1)
  const displayName = nickname.trim() || user?.nickname || '用户'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="profile-edit-dialog max-h-[min(90vh,870px)] sm:max-w-[480px]">
        <header className="profile-edit-dialog__header">
          <DialogTitle className="profile-edit-dialog__title">
            编辑资料
          </DialogTitle>
          <p className="profile-edit-dialog__subtitle">
            修改你的个人资料和头像
          </p>
        </header>

        <div className="profile-edit-dialog__body thin-scroll">
          <div className="profile-edit-dialog__avatar-row">
            <div className="relative shrink-0">
              <Avatar
                className={cn(
                  'size-16 border border-[var(--internal-hairline)] bg-[var(--internal-surface-hover)]',
                  isUploading && 'opacity-50',
                )}
              >
                {displayAvatar ? (
                  <AvatarImage src={displayAvatar} alt="" />
                ) : null}
                <AvatarFallback className="bg-[var(--internal-surface-hover)] text-xl font-medium text-[var(--internal-text)]">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-[var(--internal-hairline)] bg-[var(--internal-surface-hover)] text-[var(--internal-text-muted)] transition-colors hover:text-[var(--internal-text)] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="更换头像"
              >
                <Camera className="size-3.5" />
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
              <p className="profile-edit-dialog__avatar-name">{displayName}</p>
              <p className="profile-edit-dialog__avatar-hint">
                点击头像右下角图标更换
              </p>
            </div>
          </div>

          <form
            id={`profile-edit-form-${id}`}
            className="profile-edit-dialog__form"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
          >
            <div className="profile-edit-dialog__field">
              <label
                htmlFor={`nickname-${id}`}
                className="profile-edit-dialog__label"
              >
                昵称
              </label>
              <input
                id={`nickname-${id}`}
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的昵称"
                className="profile-edit-dialog__input"
              />
            </div>

            <div className="profile-edit-dialog__field">
              <div className="profile-edit-dialog__label-row">
                <label htmlFor={`bio-${id}`} className="profile-edit-dialog__label">
                  个人简介
                </label>
                <span className="profile-edit-dialog__counter">
                  {bioRemaining} 字剩余
                </span>
              </div>
              <textarea
                id={`bio-${id}`}
                placeholder="介绍一下自己..."
                value={bio}
                onChange={handleBioChange}
                className="profile-edit-dialog__textarea"
              />
            </div>

            <div className="profile-edit-dialog__field">
              <label className="profile-edit-dialog__label">生日</label>
              {birthdayEditing ? (
                <div className="profile-edit-dialog__picker">
                  <DateWheelPicker
                    value={birthday}
                    onChange={setBirthday}
                    size="sm"
                    minYear={1920}
                    maxYear={new Date().getFullYear()}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="profile-edit-dialog__action"
                      onClick={() => setBirthdayEditing(false)}
                    >
                      完成
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-edit-dialog__birthday-row">
                  <div className="profile-edit-dialog__birthday-value">
                    <Cake className="profile-edit-dialog__birthday-icon size-4" />
                    <span className="truncate">
                      {birthday
                        ? birthday.toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '未设置'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="profile-edit-dialog__action"
                    onClick={() => setBirthdayEditing(true)}
                  >
                    {birthday ? '修改' : '设置'}
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        <footer className="profile-edit-dialog__footer">
          <button
            type="submit"
            form={`profile-edit-form-${id}`}
            className="profile-edit-dialog__save"
            disabled={!nickname.trim() || saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
