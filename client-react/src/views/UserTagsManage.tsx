import { useState, useEffect, useCallback } from 'react'
import {
  InternalContentBlock,
  InternalSection,
  SettingsActionButton,
  SettingsInput,
  SettingsPanel,
  SettingsProShell,
  SettingsRow,
} from '@/components/layout/internal-ui'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { userTagApi } from '@/api/user-tag'
import { MsIcon } from '@/components/ui/ms-icon'

const STATUS_LABEL: Record<string, string> = {
  IDLE: '空闲',
  BUSY: '忙碌',
  HIDDEN: '隐藏',
}

export default function UserTagsManage() {
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await userTagApi.list()
      setTags(r.data?.data?.tags || r.data?.data || [])
    } catch {
      setTags([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(tagName: string) {
    setBusy((prev) => ({ ...prev, [tagName]: true }))
    try {
      await userTagApi.toggle(tagName)
      await load()
    } finally {
      setBusy((prev) => ({ ...prev, [tagName]: false }))
    }
  }

  async function addTag() {
    if (!newTag.trim()) return
    await userTagApi.open(newTag.trim())
    setNewTag('')
    load()
  }

  async function removeTag(tagName: string) {
    setBusy((prev) => ({ ...prev, [tagName]: true }))
    try {
      await userTagApi.close(tagName)
      await load()
    } finally {
      setBusy((prev) => ({ ...prev, [tagName]: false }))
    }
  }

  return (
    <SettingsProShell active="tags" title="我的标签">
      <InternalContentBlock>
        <InternalSection label="添加">
          <SettingsPanel>
            <SettingsRow
              label="新标签"
              description="开通后可在检索中被发现"
              last
            >
              <div className="flex w-full min-w-[200px] max-w-sm gap-2">
                <SettingsInput
                  value={newTag}
                  onChange={setNewTag}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  placeholder="输入标签名"
                />
                <SettingsActionButton
                  variant="primary"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  添加
                </SettingsActionButton>
              </div>
            </SettingsRow>
          </SettingsPanel>
        </InternalSection>

        <InternalSection label="标签列表">
          {loading ? <LoadingState variant="internal" lines={3} /> : null}

          {!loading && tags.length === 0 ? (
            <EmptyState
              type="search"
              variant="internal"
              message="暂无标签，从上方添加"
            />
          ) : null}

          {!loading && tags.length > 0 ? (
            <SettingsPanel>
              {tags.map((t: any, i: number) => (
                <SettingsRow
                  key={t.tagName}
                  label={t.tagName}
                  description={[
                    STATUS_LABEL[t.status] || t.status,
                    t.certified ? '已认证' : null,
                    t.orderCount != null ? `${t.orderCount} 单` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  last={i === tags.length - 1}
                >
                  <div className="flex shrink-0 gap-2">
                    <SettingsActionButton
                      onClick={() => toggle(t.tagName)}
                      disabled={busy[t.tagName] || t.status === 'BUSY'}
                    >
                      {t.status === 'IDLE' ? '隐藏' : '显示'}
                    </SettingsActionButton>
                    <SettingsActionButton
                      variant="danger"
                      onClick={() => removeTag(t.tagName)}
                      disabled={busy[t.tagName]}
                    >
                      <MsIcon name="close" size={14} aria-hidden />
                    </SettingsActionButton>
                  </div>
                </SettingsRow>
              ))}
            </SettingsPanel>
          ) : null}
        </InternalSection>
      </InternalContentBlock>
    </SettingsProShell>
  )
}
