import { useEffect, useState } from 'react'
import { InternalPageShell, ProseDocument } from '@/components/layout/internal-ui'
import { useUserStore } from '@/stores/user'
import { MsIcon } from '@/components/ui/ms-icon'
import { cn } from '@/lib/utils'

/**
 * 我的数据 — 用户查阅/更正/导出个人数据入口
 * 依据：《个人信息保护法》§44-§47
 *
 * 内测版 v0.1：
 * - 提供数据导出（JSON 下载）
 * - 提供主要信息查阅
 * - 真正的"账号注销"延后到公测前（避免内测误操作丢数据）
 */
export default function MyData() {
  const me = useUserStore((s) => s.user)
  const [exporting, setExporting] = useState(false)
  const [exportInfo, setExportInfo] = useState<{ count: number; sizeKb: number } | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      // 内测期：直接从前端 store 组装可见数据；公测前改成后端 /api/users/me/data-export
      const snapshot = {
        generatedAt: new Date().toISOString(),
        account: {
          id: me?.id,
          phone: me?.phone,
          nickname: me?.nickname,
          birthday: (me as any)?.birthday ?? null,
          certificationLevel: me?.certificationLevel,
          creditScore: me?.creditScore,
          cityCode: me?.cityCode,
          ipRegion: (me as any)?.ipRegion ?? null,
          createdAt: me?.createdAt,
        },
        // 详细数据（订单/需求/消息等）由后端导出接口返回
        note: '内测期仅导出账号信息；订单/需求/消息等数据待公测前由 /api/users/me/data-export 端点导出。',
      }
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ninewood-data-${me?.phone ?? me?.id ?? 'me'}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportInfo({
        count: Object.keys(snapshot).length,
        sizeKb: Math.round(blob.size / 1024),
      })
    } catch (e) {
      console.error('export failed', e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <InternalPageShell width="medium">
      <ProseDocument title="我的数据" updated="内测版 v0.1 · 最后更新：2026-06-24">
        <h2>说明</h2>
        <p>
          依据《中华人民共和国个人信息保护法》§44-§47，您有权查阅、复制、更正及删除您的个人数据。本页提供内测期可用的数据查阅与导出功能。
        </p>

        <h2>1. 我的账号信息</h2>
        <div className="not-prose rounded-lg border border-white/10 bg-white/[0.02] p-4 my-2 text-sm">
          <Row k="用户 ID" v={me?.id ?? '—'} />
          <Row k="手机号" v={me?.phone ?? '—'} />
          <Row k="昵称" v={me?.nickname ?? '—'} />
          <Row k="信用分" v={String(me?.creditScore ?? '—')} />
          <Row k="认证等级" v={me?.certificationLevel ?? '—'} />
          <Row k="注册时间" v={me?.createdAt ?? '—'} />
        </div>

        <h2>2. 导出我的数据</h2>
        <p>
          点击下方按钮将以 JSON 格式下载您当前可见的账号信息快照。内测期内暂只覆盖基础信息；订单、需求、消息、收藏等详细数据将在公测前由后端"我的数据导出"接口统一打包提供。
        </p>
        <div className="not-prose flex items-center gap-3 my-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20',
              exporting && 'opacity-50',
            )}
          >
            <MsIcon name="download" size={14} aria-hidden />
            {exporting ? '导出中…' : '导出我的数据（JSON）'}
          </button>
          {exportInfo ? (
            <span className="text-xs text-text-muted">
              已导出 {exportInfo.sizeKb} KB
            </span>
          ) : null}
        </div>

        <h2>3. 更正与删除</h2>
        <ul>
          <li>
            <strong>更正</strong>：手机号、昵称、头像、个人简介可在"个人资料"页直接修改。
          </li>
          <li>
            <strong>删除单条数据</strong>：需求、订单、消息支持单条删除（订单一旦产生不可物理删除，以满足会计/审计要求）。
          </li>
          <li>
            <strong>撤回同意</strong>：您可在"设置 → 法律 → 隐私政策"中撤回对敏感信息处理的同意。
          </li>
          <li>
            <strong>账号注销</strong>：内测期间暂不开放（避免误操作丢数据）；公测前提供 30 天反悔期的注销流程。
          </li>
        </ul>

        <h2>4. 投诉与申诉</h2>
        <p>
          如对您的个人信息处理有任何疑问或投诉，可通过以下方式联系我们：
        </p>
        <ul>
          <li>平台内举报：设置 → 举报与帮助</li>
          <li>12377 网络违法举报：https://www.12377.cn</li>
          <li>12321 网络不良信息举报：https://www.12321.cn</li>
        </ul>
      </ProseDocument>
    </InternalPageShell>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-text-muted text-xs">{k}</span>
      <span className="font-mono text-text-primary break-all">{v}</span>
    </div>
  )
}
