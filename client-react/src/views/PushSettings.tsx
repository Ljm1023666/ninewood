import { useState, useEffect } from 'react'
import { Bell, BellOff, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import api from '@/api'

export default function PushSettings() {
  const [pref, setPref] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [kw, setKw] = useState('')
  const [tag, setTag] = useState('')

  useEffect(() => {
    api
      .get('/pushes/preferences')
      .then((r) => setPref(r.data?.data || {}))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await api.put('/pushes/preferences', pref)
    setSaving(false)
  }

  function addKw() {
    if (kw.trim()) {
      setPref({
        ...pref,
        excludeKeywords: [...(pref.excludeKeywords || []), kw.trim()],
      })
      setKw('')
    }
  }
  function removeKw(i: number) {
    setPref({
      ...pref,
      excludeKeywords: pref.excludeKeywords.filter(
        (_: any, idx: number) => idx !== i,
      ),
    })
  }
  function addTag() {
    if (tag.trim()) {
      setPref({
        ...pref,
        excludeTags: [...(pref.excludeTags || []), tag.trim()],
      })
      setTag('')
    }
  }
  function removeTag(i: number) {
    setPref({
      ...pref,
      excludeTags: pref.excludeTags.filter((_: any, idx: number) => idx !== i),
    })
  }

  if (loading)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <span className="text-text-primary/40">加载中...</span>
      </div>
    )

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">推送设置</h1>
        <p className="text-sm text-text-primary/40 mb-6">
          管理需求推送偏好，拒绝不想收到的内容
        </p>

        <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
          <CardHeader>
            <CardTitle className="text-text-primary text-base flex items-center gap-2">
              <Bell className="size-4" />
              接收开关
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Button
              onClick={() =>
                setPref({ ...pref, receivePushes: !pref.receivePushes })
              }
              className={
                pref.receivePushes !== false ? 'bg-emerald-500' : 'bg-gray-600'
              }
            >
              {pref.receivePushes !== false ? (
                <Bell className="size-4 mr-1" />
              ) : (
                <BellOff className="size-4 mr-1" />
              )}
              {pref.receivePushes !== false ? '已开启' : '已关闭'}
            </Button>
            <select
              className="border border-border bg-bg-secondary text-text-primary text-sm rounded-lg px-3 py-2"
              value={pref.pushFrequency || 'NORMAL'}
              onChange={(e) =>
                setPref({ ...pref, pushFrequency: e.target.value })
              }
            >
              <option value="HIGH">实时推送</option>
              <option value="NORMAL">每小时汇总</option>
              <option value="LOW">每天汇总</option>
              <option value="OFF">完全关闭</option>
            </select>
          </CardContent>
        </Card>

        <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
          <CardHeader>
            <CardTitle className="text-text-primary text-base">
              排除关键词
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input
                className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30"
                placeholder="输入关键词..."
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addKw()
                }}
              />
              <Button
                onClick={addKw}
                variant="outline"
                className="border-border text-text-primary/60"
              >
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(pref.excludeKeywords || []).map((k: string, i: number) => (
                <Badge
                  key={i}
                  className="bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1"
                >
                  {k}{' '}
                  <X
                    className="size-3 cursor-pointer"
                    onClick={() => removeKw(i)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
          <CardHeader>
            <CardTitle className="text-text-primary text-base">
              排除标签
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input
                className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30"
                placeholder="输入标签名..."
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTag()
                }}
              />
              <Button
                onClick={addTag}
                variant="outline"
                className="border-border text-text-primary/60"
              >
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(pref.excludeTags || []).map((t: string, i: number) => (
                <Badge
                  key={i}
                  className="bg-amber-500/10 text-amber-400 border-amber-500/20 flex items-center gap-1"
                >
                  {t}{' '}
                  <X
                    className="size-3 cursor-pointer"
                    onClick={() => removeTag(i)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={save}
          disabled={saving}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] w-full"
        >
          <Save className="size-4 mr-1" /> {saving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  )
}
