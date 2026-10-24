import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Clock3, MessageSquareText, ThumbsDown, ThumbsUp, Waves } from 'lucide-react'
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import { useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import PostsTable from '../components/PostsTable'
import { DashboardSkeleton, EmptyState, ErrorState, Loading } from '../components/Feedback'

const COLORS = ['#6f75fa', '#ff718b', '#36d7b7']
const tooltipStyle = { background: '#171b2a', border: '1px solid #2a3042', borderRadius: 10, color: '#eff0fa' }
const asDate = (date) => date || undefined

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [trends, setTrends] = useState([])
  const [keywords, setKeywords] = useState([])
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sentiment, setSentiment] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = { start_date: asDate(startDate), end_date: asDate(endDate) }
    try {
      const [stats, trendData, keywordData, postData] = await Promise.all([
        api.get('/dashboard/stats', { params }),
        api.get('/insights/trends', { params }),
        api.get('/insights/keywords', { params }),
        api.get('/posts', { params: { ...params, sentiment: sentiment || undefined, page_size: 6 } }),
      ])
      setData(stats.data)
      setTrends(trendData.data)
      setKeywords(keywordData.data)
      setPosts(postData.data.items)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, sentiment])
  useEffect(() => { load() }, [load])

  const distribution = useMemo(() => data ? [
    { name: 'Positive', value: data.positive, color: COLORS[0] },
    { name: 'Negative', value: data.negative, color: COLORS[1] },
    { name: 'Neutral', value: data.neutral, color: COLORS[2] },
  ] : [], [data])
  const total = data?.total || 0

  return (
    <>
      <div className="toolbar-row">
        <div className="date-controls"><span className="filter-label">PERIOD</span><input aria-label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><span className="date-dash">—</span><input aria-label="End date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
        <div className="filter-controls"><span className="filter-label">SENTIMENT</span><select aria-label="Filter recent posts by sentiment" value={sentiment} onChange={(event) => setSentiment(event.target.value)}><option value="">All sentiments</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select><button className="button secondary small" onClick={() => navigate('/analyzer')}><Activity size={15} /> Analyze a post</button></div>
      </div>
      {error && <ErrorState message={error} onRetry={load} />}
      {loading ? <DashboardSkeleton /> : data && <>
        <div className="metrics-grid">
          <MetricCard label="Total analyzed" value={total.toLocaleString()} note="all saved posts" tone="violet" icon={MessageSquareText} />
          <MetricCard label="Positive sentiment" value={data.positive.toLocaleString()} note={`${data.positive_percentage}% of all posts`} tone="green" icon={ThumbsUp} />
          <MetricCard label="Negative sentiment" value={data.negative.toLocaleString()} note={total ? `${(data.negative / total * 100).toFixed(1)}% of all posts` : 'no posts yet'} tone="rose" icon={ThumbsDown} />
          <MetricCard label="Neutral sentiment" value={data.neutral.toLocaleString()} note={total ? `${(data.neutral / total * 100).toFixed(1)}% of all posts` : 'no posts yet'} tone="cyan" icon={Waves} />
        </div>
        <div className="dashboard-grid">
          <ChartCard title="Sentiment distribution" subtitle="A snapshot of audience perspective" className="distribution-card">
            {total ? <div className="donut-layout"><div className="donut-wrap"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={distribution} dataKey="value" innerRadius={67} outerRadius={92} paddingAngle={5} stroke="none" cornerRadius={5}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{total.toLocaleString()}</strong><span>POSTS</span></div></div><div className="legend-list">{distribution.map((entry) => <div className="legend-row" key={entry.name}><span className="legend-dot" style={{ background: entry.color }} /><span>{entry.name}</span><strong>{entry.value.toLocaleString()}</strong><small>{(entry.value / total * 100).toFixed(1)}%</small></div>)}</div></div> : <EmptyState title="No sentiment data yet" description="Analyze a post or upload a CSV to see your audience distribution." />}
          </ChartCard>
          <ChartCard title="Sentiment comparison" subtitle="Total posts by category">
            {total ? <ResponsiveContainer width="100%" height={244}><BarChart data={distribution} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}><CartesianGrid stroke="#242a3a" horizontal={false} /><XAxis type="number" tick={{ fill: '#777f96', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" tick={{ fill: '#a5abc0', fontSize: 11 }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState title="Waiting for your first post" description="Your comparison chart will appear here." />}
          </ChartCard>
          <ChartCard title="Sentiment over time" subtitle="Daily volume by sentiment" className="trend-card" action={<span className="chart-meta"><Clock3 size={13} /> By day</span>}>
            {trends.length ? <ResponsiveContainer width="100%" height={250}><LineChart data={trends} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}><CartesianGrid stroke="#242a3a" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#777f96', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777f96', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="positive" name="Positive" stroke={COLORS[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" dataKey="negative" name="Negative" stroke={COLORS[1]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /><Line type="monotone" dataKey="neutral" name="Neutral" stroke={COLORS[2]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /></LineChart></ResponsiveContainer> : <EmptyState title="No trends to plot" description="Daily sentiment will appear as you analyze posts." />}
          </ChartCard>
          <ChartCard title="Top keywords" subtitle="Most frequent terms across your posts" action={<button className="text-button" onClick={() => navigate('/insights')}>Explore <ArrowUpRight size={14} /></button>}>
            {keywords.length ? <div className="keyword-list">{keywords.slice(0, 8).map((item, index) => <div className="keyword-row" key={item.word}><span className="keyword-rank">{String(index + 1).padStart(2, '0')}</span><span className="keyword-name">{item.word}</span><div className="keyword-meter"><i style={{ width: `${Math.max(5, item.count / keywords[0].count * 100)}%` }} /></div><strong>{item.count}</strong></div>)}</div> : <EmptyState title="No keywords yet" description="Keywords are extracted from your analyzed posts." />}
          </ChartCard>
        </div>
        <div className="platform-strip"><div><span className="platform-icon"><BarChart3 size={17} /></span><div><strong>Platform distribution</strong><small>Based on posts with platform metadata</small></div></div>{data.platforms.length ? <div className="platform-pills">{data.platforms.slice(0, 5).map((item) => <span key={item.platform}>{item.platform}<b>{item.count}</b></span>)}</div> : <span className="platform-empty">Platform metadata will show here when provided.</span>}</div>
        <ChartCard title="Recent analyzed posts" subtitle="The latest signals from your audience" action={<select aria-label="Filter recent sentiment" value={sentiment} onChange={(event) => setSentiment(event.target.value)} className="inline-select"><option value="">All sentiment</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select>}><PostsTable posts={posts} compact /></ChartCard>
      </>}
    </>
  )
}
