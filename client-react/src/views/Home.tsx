import { Link } from 'react-router-dom'
import { Search, MapPin, User } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold text-text-primary mb-4">九木</h1>
      <p className="text-text-muted mb-10 text-lg">自由市场，主动探索</p>

      <div className="flex gap-4">
        <Link
          to="/discover"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-card px-8 py-6 hover:border-accent/50 hover:bg-bg-tertiary transition-all"
        >
          <Search className="size-8 text-accent" />
          <span className="text-text-primary font-medium">探索需求</span>
          <span className="text-xs text-text-muted">浏览活池</span>
        </Link>
        <Link
          to="/discover/certified"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-card px-8 py-6 hover:border-accent/50 hover:bg-bg-tertiary transition-all"
        >
          <User className="size-8 text-accent" />
          <span className="text-text-primary font-medium">认证服务者</span>
          <span className="text-xs text-text-muted">附近可接单</span>
        </Link>
        <Link
          to="/card-pool/dead"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-bg-card px-8 py-6 hover:border-accent/50 hover:bg-bg-tertiary transition-all"
        >
          <MapPin className="size-8 text-accent" />
          <span className="text-text-primary font-medium">荣耀墙</span>
          <span className="text-xs text-text-muted">死池归档</span>
        </Link>
      </div>
    </div>
  )
}
