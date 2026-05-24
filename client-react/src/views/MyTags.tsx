import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { TagSelector, useTagLoader } from '@/components/ui/tag-selector'
import { Chip } from '@/components/ui/chip'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/loading-state'
import { ErrorState } from '@/components/ui/error-state'
import { PageHeader } from '@/components/layout/PageHeader'
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
      const [tagsRes, busyRes] = await Promise.all([
        userApi.getMyTags(),
        userApi.getMyBusy(),
      ])
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

  // 全页 loading
  if (loading) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <PageHeader title="我的标签" onBack="back" />
          <LoadingState lines={4} />
        </div>
      </div>
    )
  }

  // 全页 error
  if (error) {
    return (
      <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
          <PageHeader title="我的标签" onBack="back" />
          <ErrorState message={error} onRetry={loadData} />
        </div>
      </div>
    )
  }

  const availableTags = allTags.filter((t) => !myTags.includes(t))

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
        <PageHeader title="我的标签" onBack="back" />

        {/* 1. 我的标签开关 */}
        <Card>
          <CardHeader>
            <CardTitle>我的标签开关</CardTitle>
          </CardHeader>
          <CardContent>
            {myTags.length === 0 ? (
              <p className="text-sm text-text-muted">暂无标签，从下方添加</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myTags.map((tag) => (
                  <div key={tag} className="group flex items-center gap-0.5">
                    <Chip variant="outlined" selected className="h-8 pr-1">
                      {tag}
                    </Chip>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="flex size-5 items-center justify-center rounded-full text-text-muted opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all"
                      aria-label={`移除标签 ${tag}`}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. 添加标签 */}
        <Card>
          <CardHeader>
            <CardTitle>添加标签</CardTitle>
          </CardHeader>
          <CardContent>
            {availableTags.length === 0 ? (
              <p className="text-sm text-text-muted">所有可用标签已添加</p>
            ) : (
              <TagSelector
                tags={availableTags}
                selected={[]}
                onChange={(tags) => {
                  const added = tags.find((t) => !myTags.includes(t))
                  if (added) addTag(added)
                }}
                loading={allTagsLoading}
                error={allTagsError}
                max={99}
              />
            )}
          </CardContent>
        </Card>

        {/* 3. 忙碌状态 */}
        <Card>
          <CardHeader>
            <CardTitle>忙碌状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-text-primary">忙碌中</p>
                  <p className="text-xs text-text-muted">开启后不会出现在搜索结果中</p>
                </div>
                <Switch checked={isBusy} onCheckedChange={toggleBusy} />
              </div>
              {isBusy && (
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-text-primary">允许特殊搜索</p>
                    <p className="text-xs text-text-muted">即使忙碌，特殊搜索仍能找到您</p>
                  </div>
                  <Switch
                    checked={allowSpecialSearch}
                    onCheckedChange={toggleAllowSpecialSearch}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
