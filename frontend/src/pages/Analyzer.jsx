import { useState } from 'react'
import { Check, CircleCheck, Eraser, MessageSquareText, Send, Sparkles } from 'lucide-react'
import api, { errorMessage } from '../services/api'
import { ErrorState } from '../components/Feedback'
import Toast from '../components/Toast'

const examples = [
  'Just tried the new update and honestly, I love how much faster everything feels.',
  'Waited three weeks for my order and it arrived broken. Really disappointed.',
  'The store is open from 9am to 6pm today.',
]
const labels = ['positive', 'negative', 'neutral']

export default function Analyzer() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')

  const analyze = async (event) => {
    event.preventDefault()
    if (!text.trim()) { setError('Write or paste a social post before analyzing.'); return }
    if (text.trim().length > 5000) { setError('Please keep your post under 5,000 characters.'); return }
    setError('')
    setLoading(true)
    setSaved(false)
    try {
      const response = await api.post('/analyze', { text: text.trim(), save: true })
      setResult(response.data)
      setSaved(true)
      setToast('Sentiment analysis saved to history.')
    } catch (requestError) {
      setError(errorMessage(requestError))
      setResult(null)
    } finally { setLoading(false) }
  }

  return (
    <>
    <Toast message={toast} onClose={() => setToast('')} />
    <div className="analyzer-layout">
      <section className="panel analyzer-panel">
        <div className="panel-heading"><div><div className="section-kicker"><Sparkles size={14} /> MODEL-POWERED ANALYSIS</div><h2>What are people saying?</h2><p>Paste a social post and let our NLP model read between the lines.</p></div><div className="analyzer-counter">{text.length.toLocaleString()} <span>/ 5,000</span></div></div>
        <form onSubmit={analyze}>
          <div className="textarea-shell"><MessageSquareText size={17} /><textarea aria-label="Social media post" maxLength={5000} value={text} onChange={(event) => { setText(event.target.value); if (error) setError('') }} placeholder="Paste a post, comment, or review here…" /><span className="textarea-hint">Your text is analyzed locally and saved to your workspace.</span></div>
          {error && <ErrorState message={error} />}
          <div className="analyzer-actions"><button type="button" className="button secondary" onClick={() => { setText(''); setResult(null); setError(''); setSaved(false) }}><Eraser size={15} /> Clear</button><button className="button primary" disabled={loading || !text.trim()}>{loading ? <><span className="button-spinner" /> Reading sentiment…</> : <><Sparkles size={16} /> Analyze sentiment <Send size={14} /></>}</button></div>
        </form>
        <div className="examples"><span>TRY AN EXAMPLE</span>{examples.map((example, index) => <button key={index} onClick={() => { setText(example); setResult(null); setError('') }}>{['Positive', 'Negative', 'Neutral'][index]} <span>↗</span></button>)}</div>
      </section>
      <section className={`panel result-panel ${result ? 'result-ready' : ''}`}>
        <div className="result-heading"><div><div className="section-kicker"><span className="result-live-dot" /> ANALYSIS RESULT</div><h2>Your sentiment snapshot</h2><p>Predicted using the connected Python ML model.</p></div><div className="result-spark"><Sparkles size={17} /></div></div>
        {result ? <div className="result-content" key={result.id}>
          <div className={`result-banner ${result.sentiment}`}><div className="result-orb"><CircleCheck size={22} /></div><div><span>PREDICTED SENTIMENT</span><strong>{result.sentiment}</strong></div><div className="result-confidence"><b>{(result.confidence * 100).toFixed(1)}%</b><span>confidence</span></div></div>
          <div className="probability-heading"><strong>Class probabilities</strong><span>Model confidence by class</span></div>
          <div className="probability-list">{labels.map((label) => <div className="probability-row" key={label}><div className="probability-label"><span className={`prob-dot ${label}`} />{label}<strong>{(result.probabilities[label] * 100).toFixed(1)}%</strong></div><div className="prob-track"><i className={label} style={{ width: `${result.probabilities[label] * 100}%` }} /></div></div>)}</div>
          <div className="saved-note"><Check size={14} /> Saved to analysis history <span>·</span> {new Date(result.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="model-note"><Sparkles size={14} /><span>Predicted by TF-IDF + Logistic Regression. Confidence is the model's estimated probability, not a guarantee of correctness.</span></div>
        </div> : <div className="result-placeholder"><div className="placeholder-art"><span /><span /><span /><div><Sparkles size={23} /></div></div><strong>Ready when you are</strong><p>Your sentiment breakdown will appear here once you analyze a post.</p><div className="placeholder-tags"><span>Positive</span><span>Negative</span><span>Neutral</span></div></div>}
        {saved && <span className="sr-only">Analysis saved.</span>}
      </section>
      <div className="analyzer-footnote"><span><span className="online-dot" /> MODEL ONLINE</span><span>Analysis history is stored in your local SQLite database.</span></div>
    </div>
    </>
  )
}
