import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userApi } from '@/api/user'
import { certLabel, certColor } from '@/constants/cert'
import { Search as SearchIcon, X } from 'lucide-react'

export default function Search() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    const kw = keyword.trim(); if (!kw) return
    setLoading(true); setSearched(true)
    try { const res = await userApi.search(kw); setResults(res.data.data) } catch { setResults([]) }
    finally { setLoading(false) }
  }

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="flex gap-2 px-4 py-3 items-center border-b border-border">
        <div className="flex-1 flex items-center gap-2 bg-bg-secondary rounded-lg px-3 py-2">
          <SearchIcon size={16} className="text-text-muted flex-shrink-0" />
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="搜索用户昵称或手机号" autoFocus className="flex-1 bg-transparent border-none outline-none text-text-primary text-[15px] placeholder:text-text-muted" />
          {keyword && <button onClick={() => { setKeyword(''); setResults([]); setSearched(false) }} className="text-text-muted"><X size={14} /></button>}
        </div>
        <button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-[var(--primary-gradient)] text-white text-sm font-semibold">搜索</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-center py-16 text-text-muted text-sm">搜索中...</p>}
        {searched && !loading && (results.length === 0 ? <p className="text-center py-16 text-text-muted text-sm">未找到相关用户</p> :
          results.map((u: any) => (
            <div key={u.id} onClick={() => navigate(`/profile/${u.id}`)} className="flex gap-3 px-5 py-3.5 items-center cursor-pointer hover:bg-bg-secondary">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden" style={{ background: certColor[u.certificationLevel as keyof typeof certColor] || '#6b7280' }}>
                {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.nickname?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0"><div className="text-[15px] font-medium">{u.nickname}</div>{u.bio && <div className="text-xs text-text-muted mt-0.5 truncate">{u.bio.slice(0, 40)}</div>}</div>
              {u.certificationLevel !== 'NONE' && <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: certColor[u.certificationLevel as keyof typeof certColor] }}>{certLabel[u.certificationLevel as keyof typeof certLabel]}</span>}
            </div>
          )))}
      </div>
    </div>
  )
}
