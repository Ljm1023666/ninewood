import { useEffect, useRef, useState } from 'react'
import { MsIcon } from '@/components/ui/ms-icon'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { toast } from '@/components/ui/confirm-dialog'
import { useUserStore } from '@/stores/user'
import { useCircleHub } from './circle-hub-context'
import { circleApi, type CircleResourceItem } from '@/api/circle'

// MOCK_FILES removed (replaced by API)

const FILTERS = [
  { key: 'all', label: '全部文件' },
  { key: 'doc', label: '文档' },
  { key: 'design', label: '设计资源' },
  { key: 'code', label: '代码片段' },
  { key: 'video', label: '视频教程' },
]

const CATEGORY_ICON: Record<string, { icon: string; className: string }> = {
  DOC: { icon: 'description', className: 'cdb-hub-file-icon--blue' },
  DESIGN: { icon: 'draw', className: 'cdb-hub-file-icon--purple' },
  CODE: { icon: 'code', className: 'cdb-hub-file-icon--green' },
  VIDEO: { icon: 'movie', className: 'cdb-hub-file-icon--orange' },
  OTHER: { icon: 'folder_zip', className: 'cdb-hub-file-icon--yellow' },
}

function pickIcon(cat: string) {
  return CATEGORY_ICON[cat] || CATEGORY_OTHER
}
const CATEGORY_OTHER = { icon: 'folder_zip', className: 'cdb-hub-file-icon--yellow' }

/** 资源文件 鈥?Stitch resources-variant-c Bento 混合布局 */
export default function CircleHubResources() {
  const { circleId, circle } = useCircleHub()
  const userId = useUserStore((s) => s.user?.id)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CircleResourceItem[]>([])
  const [recent, setRecent] = useState<CircleResourceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const load = async (cat: string, q: string) => {
    if (!circleId) return
    setLoading(true)
    setError('')
    try {
      const res = await circleApi.getResources(circleId, { category: cat, q, limit: 50 })
      const data = res.data.data as { recent: CircleResourceItem[]; items: CircleResourceItem[] }
      setItems(data.items || [])
      setRecent(data.recent || [])
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!circleId) return
    const t = setTimeout(() => {
      void load(filter, query.trim())
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, filter, query])

  if (!circle) return null

  async function handleFile(file: File) {
    if (!circleId) return
    setUploading(true)
    try {
      const cat = filter === 'all' ? 'OTHER' : filter.toUpperCase()
      await circleApi.uploadResource(circleId, file, cat)
      toast(`${file.name} 上传成功`, 'success')
      await load(filter, query.trim())
    } catch (e: unknown) {
      toast((e as { response?: { data?: { message?: string } } }).response?.data?.message || '上传失败', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="cdb-main-inner cdb-hub-page">
      <div className="cdb-hub-resources-head">
        <div>
          <h1 className="cdb-hub-display-title">资源库</h1>
          <p className="cdb-text-muted">共享与合作的文件中心</p>
        </div>
        <div className="cdb-hub-resources-actions">
          <div className="cdb-hub-search">
            <MsIcon name="search" size={20} className="cdb-hub-search-icon" aria-hidden />
            <input
              className="cdb-hub-search-input"
              placeholder="搜索文件..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          <LiquidMetalButton
            label={uploading ? '上传中...' : '上传资源'}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          />
        </div>
      </div>

      <div className="cdb-hub-filters">
        {FILTERS.map((f) => (
          <LiquidMetalButton
            key={f.key}
            type="button"
            className={filter === f.key ? 'cdb-hub-filter cdb-hub-filter--active' : 'cdb-hub-filter'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </LiquidMetalButton>
        ))}
      </div>

      {error ? <p style={{ color: '#e85a4f' }}>{error}</p> : null}

      <div className="cdb-hub-resources-stack">
        {recent.length > 0 ? (
          <section>
            <h2 className="cdb-hub-section-title">最近上传</h2>
            <div className="cdb-hub-recent-grid">
              {recent.map((file) => {
                const meta = pickIcon(file.category)
                return (
                  <a
                    key={file.id}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="cdb-glass-card cdb-hub-file-card"
                  >
                    <div className="cdb-hub-file-thumb">
                      <MsIcon name={meta.icon} size={40} className={meta.className} aria-hidden />
                    </div>
                    <div>
                      <h3 className="cdb-hub-file-name">{file.name}</h3>
                      <p className="cdb-text-muted cdb-text-body-sm">
                        {file.sizeLabel} 路 由 {file.uploader.nickname} 上传
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="cdb-glass-card cdb-hub-table-card">
          <h2 className="cdb-hub-section-title cdb-hub-table-title">所有文件</h2>
          {loading ? (
            <p className="cdb-text-muted" style={{ padding: 24, textAlign: 'center' }}>加载中...</p>
          ) : items.length === 0 ? (
            <p className="cdb-text-muted" style={{ padding: 24, textAlign: 'center' }}>暂无文件</p>
          ) : (
            <div className="cdb-hub-table-wrap">
              <table className="cdb-hub-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>大小</th>
                    <th>上传者</th>
                    <th className="cdb-hub-table-date">日期</th>
                    {userId ? <th>操作</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((file) => {
                    const meta = pickIcon(file.category)
                    return (
                      <tr key={file.id}>
                        <td>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="cdb-hub-table-name"
                          >
                            <div className="cdb-hub-table-icon">
                              <MsIcon name={meta.icon} size={20} className={meta.className} aria-hidden />
                            </div>
                            <span>{file.name}</span>
                          </a>
                        </td>
                        <td className="cdb-text-muted">{file.sizeLabel}</td>
                        <td>
                          <div className="cdb-hub-table-uploader">
                            <span className="cdb-hub-uploader-avatar">
                              {file.uploader.nickname.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="cdb-text-muted">{file.uploader.nickname}</span>
                          </div>
                        </td>
                        <td className="cdb-hub-table-date cdb-text-muted">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        {userId ? (
                          <td>
                            <LiquidMetalButton
                              type="button"
                              className="cdb-hub-icon-btn"
                              aria-label="删除"
                              onClick={async () => {
                                if (!circleId) return
                                if (!confirm(`确认删除 ${file.name}？`)) return
                                try {
                                  await circleApi.deleteResource(circleId, file.id)
                                  toast('已删除', 'success')
                                  await load(filter, query.trim())
                                } catch (e: unknown) {
                                  toast((e as { response?: { data?: { message?: string } } }).response?.data?.message || '删除失败', 'error')
                                }
                              }}
                            >
                              <MsIcon name="delete" size={18} aria-hidden />
                            </LiquidMetalButton>
                          </td>
                        ) : null}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
