import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { demandApi } from '@/api/demand'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/confirm-dialog'
import {
  NODE_SEARCH_CATEGORY,
  TAXONOMY,
  subtreeLeafIds,
} from '@/components/card-pool/taxonomy'
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MapPin,
  Send,
  Users,
  Wifi,
} from 'lucide-react'

const schema = z.object({
  title: z.string().min(2, '标题至少 2 字').max(100, '标题最多 100 字'),
  description: z.string().min(2, '描述至少 2 字').max(2000, '描述最多 2000 字'),
  minPrice: z.coerce
    .number()
    .min(1, '价格须大于 0')
    .max(999999, '价格超出范围'),
  category: z.string().min(1, '请选择分类'),
  taxonomyLeafId: z.string().min(1, '请选择细分类'),
  serviceType: z.enum(['ONLINE', 'OFFLINE']),
  expireDays: z.coerce.number().min(1).max(30),
})

type FormValues = z.infer<typeof schema>

const EXPIRE_OPTIONS = [
  { d: 3, label: '3 天' },
  { d: 7, label: '7 天' },
  { d: 30, label: '30 天' },
]

export default function DemandCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const circleId = searchParams.get('circleId')?.trim() || ''

  const [submitting, setSubmitting] = useState(false)
  const [hasFrozen, setHasFrozen] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      minPrice: 0,
      category: '',
      taxonomyLeafId: '',
      serviceType: 'ONLINE',
      expireDays: 7,
    },
  })

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const serviceType = watch('serviceType')
  const expireDays = watch('expireDays')
  const description = watch('description')
  const titleVal = watch('title')
  const category = watch('category')
  const taxonomyLeafId = watch('taxonomyLeafId')

  const leafOptions = useMemo(() => {
    const branchRoot = serviceType === 'ONLINE' ? 'online' : 'offline'
    return subtreeLeafIds(branchRoot).map((leafId) => ({
      id: leafId,
      label: TAXONOMY[leafId]?.label ?? leafId,
      category: NODE_SEARCH_CATEGORY[leafId] ?? '',
    }))
  }, [serviceType])

  useEffect(() => {
    const first = leafOptions[0]
    if (!first) return
    const stillValid = leafOptions.some((opt) => opt.id === taxonomyLeafId)
    if (stillValid) {
      const matched = leafOptions.find((opt) => opt.id === taxonomyLeafId)
      if (matched && matched.category !== category) {
        setValue('category', matched.category, { shouldValidate: true })
      }
      return
    }
    setValue('taxonomyLeafId', first.id, { shouldValidate: true })
    setValue('category', first.category, { shouldValidate: true })
  }, [leafOptions, taxonomyLeafId, category, setValue])

  useEffect(() => {
    void demandApi
      .getMyStatus()
      .then((r) => setHasFrozen(Boolean(r.data.data?.hasFrozen)))
      .catch(() => {})
  }, [])

  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    try {
      const expireAt = new Date(
        Date.now() + data.expireDays * 86400000,
      ).toISOString()
      const fd = new FormData()
      fd.append('title', data.title.trim())
      fd.append('description', data.description.trim())
      fd.append('minPrice', String(data.minPrice))
      fd.append('category', data.category)
      fd.append('taxonomyLeafId', data.taxonomyLeafId)
      fd.append('serviceType', data.serviceType)
      fd.append('expireAt', expireAt)
      if (circleId) fd.append('circleId', circleId)
      await demandApi.create(fd)
      toast('发布成功', 'success')
      navigate(circleId ? `/circles/${circleId}` : '/my-demands')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast(err.response?.data?.message || '发布失败，请稍后重试', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative z-[1] flex h-full min-h-0 w-full min-w-0 flex-col bg-background">
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto thin-scroll">
        <div className="flex justify-center">
          <form
            className="relative z-[1] mx-auto flex w-full max-w-3xl flex-col px-6 py-8"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <div className="mb-6 flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 text-muted-foreground"
                aria-label="返回"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="size-6" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  发布需求
                </h1>
                <p className="text-sm text-muted-foreground">
                  列表卡片主要展示：标题、两行简介、分类、线上/线下、预算。
                </p>
              </div>
            </div>

            {circleId ? (
              <Badge
                variant="secondary"
                className="mb-4 gap-1 border-primary/20 bg-primary/10 text-xs font-medium text-primary"
              >
                <Users className="size-3" aria-hidden />
                发布到圈内
              </Badge>
            ) : null}

            {hasFrozen ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-xs text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden
                />
                有冻结中的需求，请先在「我的需求」中处理后再发布。
              </div>
            ) : null}

            <div className="space-y-5 px-0 py-0">
              <div className="space-y-1.5">
                <Label
                  htmlFor="title"
                  className="text-sm text-muted-foreground"
                >
                  标题
                </Label>
                <Input
                  id="title"
                  placeholder="一句话说明要做什么"
                  maxLength={100}
                  {...register('title')}
                  className={cn(
                    'h-12 text-base',
                    errors.title && 'border-destructive',
                  )}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="text-destructive">
                    {errors.title?.message || '\u00a0'}
                  </span>
                  <span className="tabular-nums">{titleVal.length}/100</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-sm text-muted-foreground">
                  简介（列表里约显示两行）
                </Label>
                <Textarea
                  id="desc"
                  placeholder="补充关键信息即可"
                  maxLength={2000}
                  rows={4}
                  {...register('description')}
                  className={cn(
                    'min-h-32 resize-y text-base',
                    errors.description && 'border-destructive',
                  )}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="text-destructive">
                    {errors.description?.message || '\u00a0'}
                  </span>
                  <span className="tabular-nums">
                    {description.length}/2000
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="price"
                    className="text-sm text-muted-foreground"
                  >
                    预算（元）
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    {...register('minPrice')}
                    className={cn(
                      'h-12 text-base [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                      errors.minPrice && 'border-destructive',
                    )}
                  />
                  {errors.minPrice ? (
                    <p className="text-[11px] text-destructive">
                      {errors.minPrice.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <span className="text-sm text-muted-foreground">方式</span>
                  <div className="flex rounded-lg border border-border p-0.5">
                    <button
                      type="button"
                      onClick={() => setValue('serviceType', 'ONLINE')}
                      className={cn(
                        'flex h-12 flex-1 items-center justify-center gap-2 rounded-md py-3 text-base font-semibold transition-colors',
                        serviceType === 'ONLINE'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Wifi className="size-3.5" aria-hidden />
                      线上
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('serviceType', 'OFFLINE')}
                      className={cn(
                        'flex h-12 flex-1 items-center justify-center gap-2 rounded-md py-3 text-base font-semibold transition-colors',
                        serviceType === 'OFFLINE'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <MapPin className="size-3.5" aria-hidden />
                      线下
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="taxonomyLeafId"
                  className="text-sm text-muted-foreground"
                >
                  细分类
                </Label>
                <select
                  id="taxonomyLeafId"
                  title="细分类"
                  aria-label="细分类"
                  value={taxonomyLeafId}
                  onChange={(e) => {
                    const v = e.target.value
                    const matched = leafOptions.find((opt) => opt.id === v)
                    setValue('taxonomyLeafId', v, { shouldValidate: true })
                    setValue('category', matched?.category ?? '', {
                      shouldValidate: true,
                    })
                  }}
                  className={cn(
                    'h-12 w-full rounded-lg border border-border bg-background px-3 text-base text-text-primary',
                    errors.taxonomyLeafId && 'border-destructive',
                  )}
                >
                  {leafOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-muted-foreground">
                  大类：{category || '未匹配'}
                </div>
                {errors.taxonomyLeafId || errors.category ? (
                  <p className="text-[11px] text-destructive">
                    {errors.taxonomyLeafId?.message || errors.category?.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <span className="text-sm text-muted-foreground">有效期</span>
                <div className="flex gap-1.5">
                  {EXPIRE_OPTIONS.map(({ d, label }) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValue('expireDays', d)}
                      className={cn(
                        'flex h-12 flex-1 items-center justify-center rounded-lg border py-3 text-center text-base font-semibold transition-colors',
                        expireDays === d
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-[2] shrink-0 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-md -mx-6">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-14 flex-1 text-lg font-semibold"
                  disabled={submitting}
                  onClick={() => navigate(-1)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="h-14 flex-[2] gap-2 text-lg font-semibold"
                  disabled={submitting || hasFrozen}
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  发布
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
