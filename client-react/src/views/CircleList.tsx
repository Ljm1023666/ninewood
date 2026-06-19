import { useState, useEffect } from 'react'
import { Users, Plus, LogIn, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/ui/back-button'
import api from '@/api'

export default function CircleList() {
  const [circles, setCircles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')

  async function load() {
    try {
      const r = await api.get('/circles-enhanced', { params: { limit: 50 } })
      setCircles(r.data?.data?.circles || [])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function create() {
    if (!name.trim()) return
    await api.post('/circles-enhanced', { name: name.trim(), type: 'PUBLIC' })
    setName('')
    load()
  }

  async function join(circleId: string) {
    await api.post(`/circles-enhanced/${circleId}/join`)
    load()
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto thin-scroll">
      <div className="absolute top-4 left-4 z-10">
        <BackButton />
      </div>
      <div className="h-16 shrink-0" />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Globe className="size-5 text-foreground" />
          需求圈
        </h1>
        <p className="text-sm text-text-primary/40 mb-6">
          加入需求圈，圈内优先匹配
        </p>

        <Card className="border-border bg-bg-secondary backdrop-blur-md mb-4">
          <CardContent className="p-4 flex gap-2">
            <Input
              className="border-border bg-bg-secondary text-text-primary placeholder:text-text-primary/30 flex-1"
              placeholder="圈子名称，需包含'需求圈'"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
              }}
            />
            <Button
              onClick={create}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] shrink-0"
            >
              <Plus className="size-4 mr-1" />
              创建
            </Button>
          </CardContent>
        </Card>

        {loading && (
          <p className="text-text-primary/40 text-sm text-center py-8">
            加载中...
          </p>
        )}

        <div className="flex flex-col gap-2">
          {circles.map((c: any) => (
            <Card
              key={c.id}
              className="border-border bg-bg-secondary backdrop-blur-md"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">{c.name}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-bg-tertiary text-text-primary/60">
                      <Users className="size-3 mr-1" />
                      {c._count?.members || c.memberCount || 0} 成员
                    </Badge>
                    <Badge className="bg-bg-tertiary text-text-primary/60">
                      {c._count?.demands || 0} 需求
                    </Badge>
                    {c.type === 'PUBLIC' && (
                      <Badge className="bg-blue-500/10 text-blue-400">
                        公开
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => join(c.id)}
                  className="border-border text-text-primary/60 hover:text-text-primary"
                >
                  <LogIn className="size-3 mr-1" />
                  加入
                </Button>
              </CardContent>
            </Card>
          ))}
          {!loading && circles.length === 0 && (
            <p className="text-text-primary/30 text-center py-8">
              暂无公开需求圈
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
