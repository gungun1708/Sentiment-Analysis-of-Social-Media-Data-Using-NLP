import { useRef, useState } from 'react'
import { Check, Download, FileSpreadsheet, FileUp, LoaderCircle, Sparkles, Upload, X } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import api, { errorMessage } from '../services/api'
import { parseCsvPreview } from '../utils/csv'
import ChartCard from '../components/ChartCard'
import PostsTable from '../components/PostsTable'
import { ErrorState } from '../components/Feedback'
import Toast from '../components/Toast'

const colors = { positive: '#777af8', negative: '#ff718b', neutral: '#36d7b7' }

export default function BulkAnalysis() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [textColumn, setTextColumn] = useState('')
  const [platformColumn, setPlatformColumn] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [toast, setToast] = useState('')

  const selectFile = async (selected) => {
    setError('')
    setResult(null)
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) { setError('Please choose a .csv file.'); return }
    if (selected.size > 5 * 1024 * 1024) { setError('This file is larger than the 5 MB upload limit.'); return }
    try {
      const content = await selected.text()
      const parsed = parseCsvPreview(content)
      if (parsed.rows.length > 500) { setError('This CSV contains more than 500 rows. Split it into smaller files and try again.'); return }
      setFile(selected)
      setPreview(parsed)
      setTextColumn(parsed.headers.includes('text') ? 'text' : parsed.headers[0])
      setPlatformColumn(parsed.headers.includes('platform') ? 'platform' : '')
    } catch (parseError) {
      setFile(null); setPreview(null)
      setError(parseError.message || 'Unable to read this CSV.')
    }
  }

  const analyze = async () => {
    if (!file || !textColumn) return
    setLoading(true); setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const response = await api.post('/upload-csv', form, { params: { text_column: textColumn, platform_column: platformColumn || undefined } })
      setResult(response.data)
      setToast(`${response.data.rows_analyzed} CSV rows analyzed and saved.`)
    } catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }

  const downloadResults = () => {
    if (!result) return
    const headers = ['text', 'sentiment', 'confidence', 'platform']
    const escape = (value) => {
      let safe = String(value ?? '')
      if (/^[\s]*[=+\-@]/.test(safe)) safe = `'${safe}`
      return `"${safe.replaceAll('"', '""')}"`
    }
    const csv = [headers.join(','), ...result.items.map((item) => [item.text, item.sentiment, item.confidence, item.platform].map(escape).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'sentiment-analysis-results.csv'; anchor.click()
    URL.revokeObjectURL(url)
  }

  const chartData = result ? Object.entries(result.summary).map(([name, value]) => ({ name, value, color: colors[name] })) : []

  return (
    <>
    <Toast message={toast} onClose={() => setToast('')} />
    <>
      <div className="bulk-intro panel"><div className="bulk-intro-icon"><FileSpreadsheet size={20} /></div><div><strong>Turn a spreadsheet into a sentiment story.</strong><p>Upload a CSV, choose the post column, and the model will analyze every valid row. Empty text rows are safely skipped.</p></div><span className="format-chip">CSV · UTF-8</span></div>
      <div className="bulk-grid">
        <section className="panel upload-panel">
          <div className="panel-heading"><div><h2>Upload your dataset</h2><p>Choose a CSV with a column containing social posts.</p></div><span className="step-indicator">01 <i /> 02</span></div>
          <button className={`drop-zone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]) }}>
            <span className="upload-icon">{file ? <FileSpreadsheet size={22} /> : <FileUp size={22} />}</span>
            <strong>{file ? file.name : 'Drop your CSV here'}</strong>
            <span>{file ? `${(file.size / 1024).toFixed(1)} KB · ${preview?.rows.length} data rows` : 'or click to browse from your device'}</span>
            {!file && <span className="file-limit">Maximum 5 MB · 500 rows per upload</span>}
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => selectFile(event.target.files[0])} />
          {preview && <div className="column-selectors"><label>Text column<select value={textColumn} onChange={(event) => setTextColumn(event.target.value)}>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label><label>Platform column <span>(optional)</span><select value={platformColumn} onChange={(event) => setPlatformColumn(event.target.value)}><option value="">Not provided</option>{preview.headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label></div>}
          {error && <ErrorState message={error} />}
          <div className="upload-actions">{file && <button className="button secondary" onClick={() => { setFile(null); setPreview(null); setResult(null); setError('') }}><X size={15} /> Remove</button>}<button className="button primary" disabled={!file || !textColumn || loading} onClick={analyze}>{loading ? <><LoaderCircle size={16} className="spin" /> Analyzing rows…</> : <><Sparkles size={16} /> Analyze dataset <span>→</span></>}</button></div>
        </section>
        <section className="panel preview-panel"><div className="panel-heading"><div><h2>Dataset preview</h2><p>Check your columns before analysis</p></div>{preview && <span className="preview-count">{preview.rows.length} ROWS</span>}</div>
          {preview ? <div className="preview-table-wrap"><table className="data-table preview-table"><thead><tr>{preview.headers.slice(0, 4).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{preview.rows.slice(0, 5).map((row, index) => <tr key={index}>{preview.headers.slice(0, 4).map((header) => <td key={header} title={row[header]}>{row[header] || <span className="missing-value">empty</span>}</td>)}</tr>)}</tbody></table></div> : <div className="preview-empty"><div className="preview-empty-icon"><Upload size={19} /></div><strong>Your data will appear here</strong><span>Upload a CSV to preview its columns and a sample of rows.</span></div>}
          <div className="privacy-note"><Check size={14} /> Your data is processed by this app and stored in its local database.</div>
        </section>
      </div>
      {result && <div className="bulk-results">
        <div className="bulk-result-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> ANALYSIS COMPLETE</div><h2>Your dataset, decoded.</h2><p>{result.rows_analyzed} rows analyzed · {result.rows_skipped} empty rows skipped</p></div><button className="button secondary" onClick={downloadResults}><Download size={16} /> Download results CSV</button></div>
        <div className="bulk-summary-grid"><div className="panel bulk-summary"><span className="summary-label">ANALYZED POSTS</span><strong>{result.rows_analyzed}</strong><span>of {result.rows_received} total rows</span></div>{Object.entries(result.summary).map(([label, count]) => <div className={`panel bulk-summary summary-${label}`} key={label}><span className="summary-label">{label.toUpperCase()} SENTIMENT</span><strong>{count}</strong><span>{result.rows_analyzed ? (count / result.rows_analyzed * 100).toFixed(1) : 0}% of analyzed posts</span></div>)}</div>
        <div className="bulk-result-panels"><ChartCard title="Sentiment mix" subtitle="Predicted classes for this upload"><div className="bulk-chart-layout"><ResponsiveContainer width={190} height={190}><PieChart><Pie data={chartData} dataKey="value" innerRadius={54} outerRadius={78} paddingAngle={4} stroke="none">{chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="legend-list">{chartData.map((item) => <div className="legend-row" key={item.name}><span className="legend-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></div></ChartCard><ChartCard title="Analyzed rows" subtitle="Predictions from the connected Python model"><PostsTable posts={result.items.slice(0, 8)} /></ChartCard></div>
      </div>}
      <div className="bulk-footnote"><span><i /> Your model's output is estimated sentiment, not a guarantee of correctness.</span><span>Maximum 500 rows per upload · 5 MB limit</span></div>
    </>
    </>
  )
}
