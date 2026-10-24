import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export default function MetricCard({ label, value, note, tone = 'violet', icon: Icon, trend }) {
  return (
    <section className={`metric-card tone-${tone}`}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">{trend !== undefined ? <span className="metric-trend">{trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(trend)}%</span> : <span className="metric-dot" />}{note}</div>
      <div className="metric-glow" />
    </section>
  )
}
