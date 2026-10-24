import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function SentimentBadge({ sentiment }) {
  return <span className={`sentiment-badge ${sentiment}`}><i />{sentiment}</span>
}

export default function PostsTable({ posts, compact = false }) {
  if (!posts?.length) return <div className="table-empty">No analyzed posts yet. Analyze text or upload a CSV to get started.</div>
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr><th>POST</th><th>SENTIMENT</th><th>CONFIDENCE</th><th>PLATFORM</th><th>TIME</th>{compact && <th />}</tr></thead>
        <tbody>{posts.map((post) => (
          <tr key={post.id}><td className="post-cell" title={post.text}>{post.text}</td><td><SentimentBadge sentiment={post.sentiment} /></td><td><span className="confidence-value">{(post.confidence * 100).toFixed(1)}%</span></td><td><span className="platform-label">{post.platform || '—'}</span></td><td className="time-cell">{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>{compact && <td><ArrowUpRight size={14} className="muted-icon" /></td>}</tr>
        ))}</tbody>
      </table>
      {compact && <Link to="/insights" className="table-link">View all posts <ArrowUpRight size={14} /></Link>}
    </div>
  )
}
