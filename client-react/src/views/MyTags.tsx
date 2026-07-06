import { useState, useEffect, useCallback } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { useTagLoader } from '@/components/ui/tag-selector'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import {
  DesktopPageShell,
  DlpGlass,
  DlpGlassHead,
  DlpGlassBody,
  DlpToggleRow,
} from '@/components/layout/desktop-page'
import { userApi } from '@/api/user'
export default function MyTags() {
  const { tags: allTags, loading: allTagsLoading, error: allTagsError } = useTagLoader()
  const [myTags, setMyTags] = useState<string[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [allowSpecialSearch, setAllowSpecialSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tagsRes, busyRes] = await Promise.all([userApi.getMyTags(), userApi.getMyBusy()])
      setMyTags(tagsRes.data.data?.serviceTags || [])
      const busyData = busyRes.data.data
      setIsBusy(busyData?.isBusy || false)
      setAllowSpecialSearch(busyData?.allowSpecialSearch || false)
    } catch (e: any) {
      setError(e.response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const removeTag = async (tag: string) => {
    const prev = myTags
    const next = myTags.filter((t) => t !== tag)
    setMyTags(next)
    try {
      await userApi.updateTags(next)
    } catch {
      setMyTags(prev)
    }
  }

  const addTag = async (tag: string) => {
    if (myTags.includes(tag)) return
    const prev = myTags
    const next = [...myTags, tag]
    setMyTags(next)
    try {
      await userApi.updateTags(next)
    } catch {
      setMyTags(prev)
    }
  }

  const toggleBusy = async (v: boolean) => {
    const prev = isBusy
    setIsBusy(v)
    try {
      await userApi.updateBusy(v, allowSpecialSearch)
    } catch {
      setIsBusy(prev)
    }
  }

  const toggleAllowSpecialSearch = async (v: boolean) => {
    const prev = allowSpecialSearch
    setAllowSpecialSearch(v)
    try {
      await userApi.updateBusy(isBusy, v)
    } catch {
      setAllowSpecialSearch(prev)
    }
  }

  if (loading) {
    return (
      <DesktopPageShell title="我的标签">
        <LoadingState lines={4} />
      </DesktopPageShell>
    )
  }

  if (error) {
    return (
      <DesktopPageShell title="我的标签">
        <ErrorState message={error} onRetry={loadData} />
      </DesktopPageShell>
    )
  }

  const availableTags = allTags.filter((t) => !myTags.includes(t))

  return (
    <DesktopPageShell
      title="我的标签"
      subtitle={`已开通 ${myTags.length} 个标签 · ${isBusy ? '忙碌中' : '可被发现'}`}
    >
      <div className="dlp-split dlp-split--aside">
        <aside className="dlp-stack">
          <DlpGlass>
            <DlpGlassHead title="已开通标签" subtitle="点击 × 可移除" />
            <DlpGlassBody>
              {myTags.length === 0 ? (
                <p className="text-sm text-text-muted">暂无标签，从右侧标签库添加</p>
              ) : (
                <div className="dlp-tag-grid">
                  {myTags.map((tag) => (
                    <span key={tag} className="dlp-tag dlp-tag--on">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-text-muted hover:text-error"
                        aria-label={`移除标签 ${tag}`}
                      >
                        <MsIcon name="close" size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </DlpGlassBody>
          </DlpGlass>

          <DlpGlass>
            <DlpGlassBody className="!p-0">
              <DlpToggleRow
                label="忙碌中"
                description="开启后不会出现在搜索结果中"
                checked={isBusy}
                onChange={toggleBusy}
              />
              {isBusy && (
                <DlpToggleRow
                  label="允许特殊搜索"
                  description="即使忙碌，特殊搜索仍能找到您"
                  checked={allowSpecialSearch}
                  onChange={toggleAllowSpecialSearch}
                />
              )}
            </DlpGlassBody>
          </DlpGlass>
        </aside>

        <DlpGlass>
          <DlpGlassHead title="标签库" subtitle="点击添加至已开通列表" />
          <DlpGlassBody>
            {availableTags.length === 0 ? (
              <p className="text-sm text-text-muted">所有可用标签已添加</p>
            ) : (
              <div className="dlp-tag-grid">
                {availableTags.map((tag) => (
                  <button key={tag} type="button" className="dlp-tag" onClick={() => addTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {allTagsLoading && <p className="mt-4 text-sm text-text-muted">加载标签库…</p>}
            {allTagsError && <p className="mt-4 text-sm text-error">{allTagsError}</p>}
          </DlpGlassBody>
        </DlpGlass>
      </div>
    </DesktopPageShell>
  )
}
