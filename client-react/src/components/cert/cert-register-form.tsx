import { useState } from 'react'
import { certificationApi } from '@/api/certification'
import { toast } from '@/components/ui/confirm-dialog'

export function CertRegisterForm({
  onRegistered,
  id = 'cert-upload',
}: {
  onRegistered?: () => void
  id?: string
}) {
  const [tags, setTags] = useState('')
  const [regionId, setRegionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    const list = tags.split(/[,,\s]+/).map((s) => s.trim()).filter(Boolean)
    if (list.length === 0) {
      toast('请至少输入一个服务标签', 'error')
      return
    }
    setSubmitting(true)
    try {
      await certificationApi.register({
        tags: list,
        regionId: regionId ? Number(regionId) : undefined,
      })
      toast('认证材料已提交，请等待审核', 'success')
      setTags('')
      setRegionId('')
      onRegistered?.()
    } catch (e: any) {
      toast(e?.response?.data?.message || '提交失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id={id} className="cert-stitch-glass cert-stitch-register">
      <h3>上传认证材料</h3>
      <p>
        填写您的服务标签与服务区域，提交后专家委员会将在 3-5 个工作日内完成审核。
      </p>
      <div className="cert-stitch-field">
        <label htmlFor="cert-tags">服务标签</label>
        <input
          id="cert-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例如：React 开发, 小程序, UI 设计（逗号分隔）"
        />
      </div>
      <div className="cert-stitch-field">
        <label htmlFor="cert-region">服务区域 ID（可选）</label>
        <input
          id="cert-region"
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          placeholder="区域 ID"
        />
      </div>
      <button
        type="button"
        className="cert-stitch-btn-solid w-full"
        onClick={submit}
        disabled={submitting}
      >
        {submitting ? '提交中…' : '提交认证申请'}
      </button>
    </section>
  )
}
