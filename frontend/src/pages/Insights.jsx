import { useCallback, useEffect, useState } from 'react'
import { ArrowDownWideNarrow, ArrowLeft, ArrowRight, Download, Search, SlidersHorizontal } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSearchParams } from 'react-router-dom'
import api, { errorMessage } from '../services/api'
import ChartCard from '../components/ChartCard'
import PostsTable from '../components/PostsTable'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'

const tones = { positive: '#777af8', negative: '#ff718b', neutral: '#36d7b7' }

export default function Insights() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [sentiment, setSentiment] = useState('')
  const [platform, setPlatform] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [postsData, setPostsData] = useState({ items: [], total: 0 })
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState([])
  const [keywords, setKeywords] = useState([])
  const [positiveKeywords, setPositiveKeywords] = useState([])
  const [negativeKeywords, setNegativeKeywords] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 12

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const params = { page, page_size: pageSize, search: search || undefined, sentiment: sentiment || undefined, platform: platform || undefined, start_date: startDate || undefined, end_date: endDate || undefined, sort }
    const insightsParams = { start_date: startDate || undefined, end_date: endDate || undefined }
    try {
      const [postResponse, statsResponse, trendsResponse, keywordsResponse, positiveResponse, negativeResponse] = await Promise.all([
        api.get('/posts', { params }),
        api.get('/dashboard/stats', { params: insightsParams }),
        api.get('/insights/trends', { params: insightsParams }),
        api.get('/insights/keywords', { params: { ...insightsParams, limit: 12 } }),
        api.get('/insights/keywords', { params: { ...insightsParams, limit: 8, sentiment: 'positive' } }),
        api.get('/insights/keywords', { params: { ...insightsParams, limit: 8, sentiment: 'negative' } }),
      ])
      setPostsData(postResponse.data); setStats(statsResponse.data); setTrends(trendsResponse.data); setKeywords(keywordsResponse.data); setPositiveKeywords(positiveResponse.data); setNegativeKeywords(negativeResponse.data)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }, [page, search, sentiment, platform, startDate, endDate, sort])
  useEffect(() => { load() }, [load])
  const totalPages = Math.max(1, Math.ceil(postsData.total / pageSize))
  const exportUrl = `${import.meta.env.VITE_API_BASE_URL || '/api'}/export/csv${sentiment || startDate || endDate ? `?${new URLSearchParams({ ...(sentiment ? { sentiment } : {}), ...(startDate ? { start_date: startDate } : {}), ...(endDate ? { end_date: endDate } : {}) })}` : ''}`

  return (
    <>
      <div className="insights-overview"><div className="insight-highlight"><div className="highlight-glyph">↗</div><div><span>CONVERSATION VOLUME</span><strong>{stats?.total?.toLocaleString() ?? '—'} <small>posts</small></strong><p>Analyzed in this workspace within the selected period.</p></div></div><div className="insight-highlight"><div className="highlight-glyph green">◉</div><div><span>POSITIVE SHARE</span><strong>{stats ? `${stats.positive_percentage}%` : '—'}</strong><p>Share of all analyzed posts classified as positive.</p></div></div><div className="insight-highlight"><div className="highlight-glyph rose">◎</div><div><span>PLATFORMS TRACKED</span><strong>{stats?.platforms?.length ?? '—'} <small>sources</small></strong><p>Platforms represented in saved post metadata.</p></div></div></div>
      <div className="insight-chart-grid">
        <ChartCard title="Keyword frequency" subtitle="Common terms from the analyzed posts">{keywords.length ? <ResponsiveContainer width="100%" height={258}><BarChart data={keywords.slice(0, 9)} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}><CartesianGrid stroke="#242a3a" vertical={false} /><XAxis dataKey="word" tick={{ fill: '#979eb4', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777f96', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171b2a', border: '1px solid #2a3042', borderRadius: 10 }} /><Bar dataKey="count" fill="#777af8" radius={[5, 5, 0, 0]} barSize={25} /></BarChart></ResponsiveContainer> : <EmptyState title="No keyword signals yet" description="Analyze posts to see the words appearing in your conversation." />}</ChartCard>
        <ChartCard title="Platform comparison" subtitle="Posts by attributed platform">{stats?.platforms?.length ? <ResponsiveContainer width="100%" height={258}><BarChart data={stats.platforms} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}><CartesianGrid stroke="#242a3a" vertical={false} /><XAxis dataKey="platform" tick={{ fill: '#979eb4', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777f96', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171b2a', border: '1px solid #2a3042', borderRadius: 10 }} /><Bar dataKey="count" name="Posts" radius={[5, 5, 0, 0]} barSize={29}>{stats.platforms.map((entry, index) => <Cell key={entry.platform} fill={['#777af8', '#36d7b7', '#ff718b', '#a88aff', '#ffc16a'][index % 5]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState title="No platform metadata" description="Include a platform column when analyzing CSV data." />}</ChartCard>
        <ChartCard title="Daily sentiment trends" subtitle="Volume over time from saved predictions">{trends.length ? <ResponsiveContainer width="100%" height={258}><LineChart data={trends} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}><CartesianGrid stroke="#242a3a" vertical={false} /><XAxis dataKey="date" tick={{ fill: '#979eb4', fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#777f96', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#171b2a', border: '1px solid #2a3042', borderRadius: 10 }} /><Line type="monotone" dataKey="positive" name="Positive" stroke="#777af8" strokeWidth={2.3} dot={false} /><Line type="monotone" dataKey="negative" name="Negative" stroke="#ff718b" strokeWidth={2.3} dot={false} /><Line type="monotone" dataKey="neutral" name="Neutral" stroke="#36d7b7" strokeWidth={2.3} dot={false} /></LineChart></ResponsiveContainer> : <EmptyState title="No daily trends yet" description="Trend lines will appear when saved analyses span one or more days." />}</ChartCard>
      </div>
      <section className="panel term-comparison-panel"><div className="panel-heading"><div><h2>Positive & negative terms</h2><p>Most frequent words in posts for each predicted class</p></div></div><div className="term-comparison-grid">{[[positiveKeywords, 'positive', 'Words in positive posts'], [negativeKeywords, 'negative', 'Words in negative posts']].map(([items, label, title]) => <div className={`term-column ${label}`} key={label}><strong>{title}</strong>{items.length ? items.map((item, index) => <div className="term-row" key={item.word}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.word}</b><i>{item.count}</i></div>) : <span className="term-empty">No {label} posts in this period.</span>}</div>)}</div></section>
      <section className="panel insight-table-panel">
        <div className="panel-heading insight-table-heading"><div><h2>Post explorer</h2><p>Search, filter, and sort your analyzed posts.</p></div><a className="button secondary small" href={exportUrl} download><Download size={14} /> Export CSV</a></div>
        <div className="table-filters"><label className="table-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search post text…" /></label><label className="filter-select"><SlidersHorizontal size={14} /><select aria-label="Filter sentiment" value={sentiment} onChange={(event) => { setSentiment(event.target.value); setPage(1) }}><option value="">All sentiments</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="neutral">Neutral</option></select></label><select aria-label="Filter platform" className="filter-select" value={platform} onChange={(event) => { setPlatform(event.target.value); setPage(1) }}><option value="">All platforms</option>{(stats?.platforms || []).map((item) => <option value={item.platform} key={item.platform}>{item.platform}</option>)}</select><label className="date-filter"><span>FROM</span><input aria-label="From date" type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1) }} /></label><label className="date-filter"><span>TO</span><input aria-label="To date" type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1) }} /></label><label className="sort-select"><ArrowDownWideNarrow size={15} /><select aria-label="Sort posts" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="confidence">Confidence</option></select></label></div>
        {error && <ErrorState message={error} onRetry={load} />}
        {loading ? <Loading label="Loading posts…" /> : <><PostsTable posts={postsData.items} /><div className="pagination"><span>Showing <strong>{postsData.total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, postsData.total)}</strong> of <strong>{postsData.total}</strong> posts</span><div><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={15} /></button><span>Page <b>{page}</b> of {totalPages}</span><button aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ArrowRight size={15} /></button></div></div></>}
      </section>
      <div className="insights-legend">{Object.entries(tones).map(([label, color]) => <span key={label}><i style={{ background: color }} />{label} posts</span>)}</div>
    </>
  )
}
