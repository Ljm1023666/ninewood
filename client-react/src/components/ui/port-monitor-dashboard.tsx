import React, { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Server, Database, Globe, Cpu, Activity,
  Wifi, WifiOff, AlertTriangle, RefreshCw, Clock,
  RotateCw, Play,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePortMonitor, type HealthData } from '@/hooks/usePortMonitor'

const PORT_COLORS: Record<string, string> = {
  'Express 服务器': '#3b82f6',
  'PostgreSQL': '#8b5cf6',
  'Redis': '#ef4444',
  '语义分类器': '#10b981',
  'Vite Dev Server': '#f59e0b',
}

const PORT_ICONS: Record<string, React.ReactNode> = {
  'Express 服务器': <Server className="h-[1em] w-[1em]" />,
  'PostgreSQL': <Database className="h-[1em] w-[1em]" />,
  'Redis': <Cpu className="h-[1em] w-[1em]" />,
  '语义分类器': <Globe className="h-[1em] w-[1em]" />,
  'Vite Dev Server': <Globe className="h-[1em] w-[1em]" />,
}

function StatusBadge({ status }: { status: 'online' | 'offline' | 'error' }) {
  const variant = status === 'online' ? 'success' : status === 'error' ? 'warning' : 'destructive'
  const icon = status === 'online'
    ? <Wifi className="h-[0.8em] w-[0.8em]" />
    : status === 'error'
      ? <AlertTriangle className="h-[0.8em] w-[0.8em]" />
      : <WifiOff className="h-[0.8em] w-[0.8em]" />
  const label = status === 'online' ? '在线' : status === 'error' ? '异常' : '离线'
  return (
    <Badge variant={variant} className="gap-1 text-[0.75em]">
      {icon}{label}
    </Badge>
  )
}

interface ServiceCardProps {
  service: HealthData['services'][number]
  onRestart: (name: string) => void
  loading: boolean
}

function ServiceCard({ service, onRestart, loading }: ServiceCardProps) {
  const isOnline = service.status === 'online'
  const isExpress = service.name === 'Express 服务器'

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-[0.8em]">
        <CardTitle className="text-[0.85em] font-medium flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 text-[1.1em]">{PORT_ICONS[service.name]}</span>
          <span className="truncate">{service.name}</span>
        </CardTitle>
        <span className="relative flex shrink-0 h-[0.6em] w-[0.6em]">
          {isOnline ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-full w-full bg-green-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-full w-full bg-red-500" />
          )}
        </span>
      </CardHeader>
      <CardContent className="p-[0.8em] pt-0">
        <div className="flex items-center justify-between">
          <div className="text-[1.4em] font-bold">{service.port}</div>
          <div className="flex flex-col items-end gap-0.5">
            <StatusBadge status={service.status} />
            {isOnline && (
              <span className="text-[0.7em] text-muted-foreground">
                {service.responseTime}ms
              </span>
            )}
          </div>
        </div>
        {service.error && (
          <p className="text-[0.7em] text-destructive mt-1 truncate" title={service.error}>
            {service.error}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={loading || isExpress}
          onClick={() => onRestart(service.name)}
          className="w-full mt-2 text-[0.7em] h-auto py-1 gap-1"
          title={isExpress ? 'Express 无法自我重启，请在终端中手动操作' : `重启 ${service.name}`}
        >
          <RotateCw className={loading ? 'animate-spin h-[0.9em] w-[0.9em]' : 'h-[0.9em] w-[0.9em]'} />
          {isExpress ? '手动重启' : '重启'}
        </Button>
      </CardContent>
    </Card>
  )
}

interface ResponseTimeChartProps {
  history: { time: string; [key: string]: number | string }[]
  services: HealthData['services']
}

const ResponseTimeChart = React.memo(function ResponseTimeChart({ history, services }: ResponseTimeChartProps) {
  const chartServices = useMemo(
    () => services.filter((s) => s.status === 'online'),
    [services],
  )

  if (history.length < 2) {
    return (
      <Card className="flex-1 min-h-0 min-w-0 flex flex-col">
        <CardHeader className="p-[0.8em] pb-0 shrink-0">
          <CardTitle className="text-[0.9em] flex items-center gap-1.5">
            <Activity className="h-[1em] w-[1em]" />响应时间趋势
          </CardTitle>
          <CardDescription className="text-[0.7em]">等待更多数据点...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground text-[0.85em]">
          数据收集中，请稍候...
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
      <CardHeader className="p-[0.8em] pb-0 shrink-0">
        <CardTitle className="text-[0.9em] flex items-center gap-1.5">
          <Activity className="h-[1em] w-[1em]" />响应时间趋势 (ms)
        </CardTitle>
        <CardDescription className="text-[0.7em]">最近 {history.length} 次检查</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <div className="w-full h-full px-[0.5em] pb-[0.5em]">
          <ResponsiveContainer width="100%" height="100%" debounce={200}>
            <LineChart data={history} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
              <XAxis dataKey="time" stroke="#6b7280" fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(v) => `${v}ms`} width={45} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderRadius: '0.5rem',
                  fontSize: '0.85em',
                }}
                itemStyle={{ color: '#f9fafb' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend wrapperStyle={{ paddingTop: '6px', fontSize: '0.8em' }} />
              {chartServices.map((svc) => (
                <Line
                  key={svc.name}
                  type="monotone"
                  dataKey={svc.name}
                  stroke={PORT_COLORS[svc.name] || '#6b7280'}
                  strokeWidth={1.5}
                  dot={false}
                  name={`${svc.name} (${svc.port})`}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})

function CheckLog({ data }: { data: HealthData }) {
  const entries = useMemo(() => {
    return [...data.services].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'online' ? 1 : -1
      return b.responseTime - a.responseTime
    })
  }, [data])

  return (
    <Card className="min-h-0 flex flex-col" style={{ flex: '0 0 28%' }}>
      <CardHeader className="p-[0.8em] pb-0 shrink-0">
        <CardTitle className="text-[0.9em] flex items-center gap-1.5">
          <Clock className="h-[1em] w-[1em]" />最近检查记录
        </CardTitle>
        <CardDescription className="text-[0.7em]">
          更新时间: {new Date(data.timestamp).toLocaleTimeString('zh-CN')} · 总耗时 {data.totalCheckTime}ms
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {entries.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between px-[1em] py-[0.6em] hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0 text-[1.1em]">{PORT_ICONS[svc.name]}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-[0.8em] truncate">{svc.name}</span>
                  <span className="text-[0.7em] text-muted-foreground">端口 {svc.port}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {svc.status === 'online' && (
                  <span className="text-[0.75em] text-muted-foreground">{svc.responseTime}ms</span>
                )}
                <StatusBadge status={svc.status} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PortMonitorDashboard() {
  const { data, history, error, actionLoading, refetch, restartService, startAll } = usePortMonitor(5000)

  const offlineCount = data ? data.services.filter((s) => s.status !== 'online').length : 0

  return (
    <div className="h-full w-full flex flex-col gap-[1vh] p-[1.5vh] overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-[clamp(1.2rem,1.6vw,2rem)] font-extrabold tracking-tight text-primary leading-tight">
            端口监控仪表盘
          </h1>
          <p className="text-[0.7em] text-muted-foreground mt-0.5">
            实时监控所有服务端口状态与响应时间
          </p>
        </div>
        <div className="flex items-center gap-2">
          {offlineCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={startAll}
              disabled={actionLoading !== null}
              className="gap-1.5 text-[0.8em]"
            >
              <Play className="h-[0.9em] w-[0.9em]" />
              启动全部 ({offlineCount})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5 text-[0.8em]">
            <RefreshCw className="h-[0.9em] w-[0.9em]" />刷新
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-[0.8em] text-destructive flex items-center gap-2 text-[0.85em] shrink-0">
          <AlertTriangle className="h-[1em] w-[1em] shrink-0" />
          无法获取监控数据: {error}
        </div>
      )}

      {data && (
        <div className="flex items-center gap-2 text-[0.8em] shrink-0">
          <span className={data.status === 'healthy' ? 'text-green-500' : 'text-yellow-500'}>
            {data.status === 'healthy' ? '● 全部健康' : '● 部分降级'}
          </span>
          <span className="text-muted-foreground">
            · 上次检查: {new Date(data.timestamp).toLocaleTimeString('zh-CN')}
          </span>
        </div>
      )}

      {/* 服务状态卡片 */}
      <div className="grid gap-[1vh] shrink-0" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}>
        {data ? (
          data.services.map((svc) => (
            <ServiceCard
              key={svc.name}
              service={svc}
              onRestart={restartService}
              loading={actionLoading === svc.name}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-[2em] text-muted-foreground text-[0.85em]">
            <Activity className="h-[1.5em] w-[1.5em] mx-auto mb-1 animate-pulse" />
            正在连接监控服务...
          </div>
        )}
      </div>

      {/* 图表 + 检查记录 */}
      <div className="flex-1 min-h-0 flex gap-[1vh]">
        {data && (
          <>
            <ResponseTimeChart history={history} services={data.services} />
            <CheckLog data={data} />
          </>
        )}
      </div>
    </div>
  )
}
