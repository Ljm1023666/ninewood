import { useState, useEffect, useCallback } from 'react'
import { Tag, Plus, X, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import { userTagApi } from '@/api/user-tag'

export default function UserTagsManage() {
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')

  const load = useCallback(async () => {
    try {
      const r = await userTagApi.list()
      setTags(r.data?.data?.tags || [])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(tagName: string) {
    await userTagApi.toggle(tagName)
    load()
  }

  async function addTag() {
    if (!newTag.trim()) return
    await userTagApi.open(newTag.trim())
    setNewTag('')
    load()
  }

  async function removeTag(tagName: string) {
    await userTagApi.close(tagName)
    load()
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">我的标签</h1>
        <p className="text-sm text-text-primary/40 mb-6">
          管理服务标签，控制检索可见性
        </p>

        <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
          <CardHeader>
            <CardTitle className="text-text-primary text-base flex items-center gap-2">
              <Plus className="size-4" />
              添加标签
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30"
              placeholder="输入标签名..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTag()
              }}
            />
            <Button
              onClick={addTag}
              className="bg-[#7C3AED] hover:bg-[#6D28D9]"
            >
              添加
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <p className="text-text-primary/40 text-sm text-center py-8">
            <Clock className="size-4 inline animate-spin mr-1" />
            加载中...
          </p>
        )}

        <div className="flex flex-col gap-2">
          {tags.map((t: any) => (
            <Card
              key={t.tagName}
              className="border-border bg-bg-secondary backdrop-blur-md cursor-pointer hover:bg-bg-tertiary transition-colors"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Tag className="size-5 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-text-primary">
                      {t.tagName}
                    </span>
                    <div className="flex gap-2 mt-0.5">
                      <Badge
                        className={
                          t.status === 'IDLE'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : t.status === 'BUSY'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-gray-500/15 text-gray-400'
                        }
                      >
                        {t.status === 'IDLE'
                          ? '空闲'
                          : t.status === 'BUSY'
                            ? '忙碌'
                            : '隐藏'}
                      </Badge>
                      {t.certified && (
                        <Badge className="bg-blue-500/15 text-blue-400">
                          已认证
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggle(t.tagName)}
                    className="text-text-primary/60 hover:text-text-primary"
                  >
                    {t.status === 'IDLE' ? (
                      <ToggleRight className="size-5 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="size-5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeTag(t.tagName)}
                    className="text-text-primary/40 hover:text-red-400"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && tags.length === 0 && (
            <p className="text-text-primary/30 text-center py-8">
              暂无标签，从上方添加
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
