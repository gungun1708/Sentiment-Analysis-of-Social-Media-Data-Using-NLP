import { AlertCircle, LoaderCircle } from 'lucide-react'

export function Loading({ label = 'Loading analytics…' }) {
  return <div className="feedback"><LoaderCircle className="spin" size={18} />{label}</div>
}

export function DashboardSkeleton() {
  return <div className="skeleton-page" aria-label="Loading analytics">
    <div className="metrics-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-metric" key={item} />)}</div>
    <div className="dashboard-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-chart" key={item} />)}</div>
    <div className="skeleton skeleton-strip" />
  </div>
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state">
      <AlertCircle size={19} />
      <span>{message}</span>
      {onRetry && <button className="text-button" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-mark">∅</span><strong>{title}</strong><span>{description}</span></div>
}
