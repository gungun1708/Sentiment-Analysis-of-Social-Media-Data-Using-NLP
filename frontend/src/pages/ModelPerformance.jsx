import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, BookOpen, BrainCircuit, CalendarDays, Database, FlaskConical, Target } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import api, { errorMessage } from '../services/api'
import ChartCard from '../components/ChartCard'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'

const matrixColors = [['#31385a', '#593746', '#403956'], ['#603244', '#414767', '#473c57'], ['#41385b', '#4a3650', '#2e5354']]

export default function ModelPerformance() {
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { const response = await api.get('/model/metrics'); setMetrics(response.data) }
    catch (requestError) { setError(errorMessage(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  return <>
    <div className="model-intro panel"><div className="model-intro-symbol"><BrainCircuit size={24} /></div><div><div className="eyebrow"><span className="eyebrow-dot" /> TRANSPARENT BY DESIGN</div><h2>Trust the signal. Know the model.</h2><p>Every prediction is powered by a measurable, locally trained classifier. Explore its held-out evaluation below.</p></div><div className="model-built"><span>MODEL TYPE</span><strong>Supervised NLP</strong></div></div>
    {error && <ErrorState message={error} onRetry={load} />}
    {loading ? <Loading label="Loading model evaluation…" /> : metrics && <>
      {metrics.demonstration_data && <div className="demo-warning"><AlertTriangle size={17} /><span><strong>Demonstration model.</strong> Scores reflect a small, synthetic sample dataset and are not production-grade. Train on a larger, representative, correctly labeled corpus before relying on this model.</span></div>}
      <div className="metrics-grid model-metrics-grid">
        {[['Accuracy', metrics.accuracy], ['Precision', metrics.precision], ['Recall', metrics.recall], ['F1-score', metrics.f1_score]].map(([label, value], index) => <div className={`panel model-score score-${index}`} key={label}><div><span>{label.toUpperCase()}</span><Target size={16} /></div><strong>{(value * 100).toFixed(1)}<small>%</small></strong><span>weighted average · held-out test</span></div>)}
      </div>
      <div className="model-detail-grid">
        <ChartCard title="Confusion matrix" subtitle={`Held-out test set · ${metrics.test_size} examples`} className="confusion-card">
          <div className="matrix-wrap"><div className="matrix-axis-y">ACTUAL LABEL</div><div className="matrix-content"><div className="matrix-pred-label">PREDICTED LABEL</div><div className="confusion-matrix"><div className="matrix-corner" />{metrics.labels.map((label) => <span className="matrix-header" key={`h-${label}`}>{label}</span>)}{metrics.confusion_matrix.map((row, rowIndex) => <div className="matrix-row" key={`r-${metrics.labels[rowIndex]}`}><span className="matrix-header">{metrics.labels[rowIndex]}</span>{row.map((value, colIndex) => <span className="matrix-cell" key={colIndex} style={{ background: matrixColors[rowIndex][colIndex] }}><strong>{value}</strong>{rowIndex === colIndex && <small>correct</small>}</span>)}</div>)}</div></div></div>
          <p className="matrix-legend"><span /> Correct predictions appear on the diagonal. Each row shows actual class labels.</p>
        </ChartCard>
        <ChartCard title="Training data" subtitle="Labeled examples used by the pipeline" className="class-dist-card">
          {Object.keys(metrics.class_distribution).length ? <div className="class-dist-content"><ResponsiveContainer width="100%" height={175}><PieChart><Pie data={Object.entries(metrics.class_distribution).map(([name, value]) => ({ name, value }))} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={4} stroke="none">{['#ff718b', '#36d7b7', '#777af8'].map((color, index) => <Cell key={index} fill={color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="legend-list">{metrics.labels.map((label, index) => <div className="legend-row" key={label}><span className="legend-dot" style={{ background: ['#ff718b', '#36d7b7', '#777af8'][index] }} /><span>{label}</span><strong>{metrics.class_distribution[label] || 0}</strong></div>)}</div></div> : <EmptyState title="No class data" description="Train a model to see class distribution." />}
          <div className="dataset-meta"><div><Database size={15} /><span>Dataset</span><strong>{metrics.dataset_size.toLocaleString()} rows</strong></div><div><FlaskConical size={15} /><span>Split</span><strong>{metrics.train_size} train · {metrics.test_size} test</strong></div><div><CalendarDays size={15} /><span>Trained</span><strong>{new Date(metrics.trained_at).toLocaleDateString()}</strong></div></div>
        </ChartCard>
      </div>
      <div className="panel methodology-card"><div className="methodology-title"><BookOpen size={17} /><div><h2>Methodology & limitations</h2><p>How each sentiment estimate is produced</p></div></div><div className="methodology-grid"><div><span className="method-num">01</span><strong>Text preparation</strong><p>URLs and mentions are normalized, hashtag words are retained, and whitespace is cleaned. Negation terms are not removed.</p></div><div><span className="method-num">02</span><strong>Feature extraction</strong><p>TF-IDF turns text into weighted features with unigram and bigram signals to preserve short phrases.</p></div><div><span className="method-num">03</span><strong>Classification</strong><p>Balanced Logistic Regression predicts one of three classes and reports its estimated class probabilities.</p></div><div><span className="method-num">04</span><strong>Evaluation</strong><p>{metrics.methodology} These scores do not guarantee performance on posts from another source.</p></div></div><div className="limitations-note"><AlertTriangle size={15} /><span>Language, sarcasm, slang, class balance, and dataset representativeness can affect results. Demonstration scores are especially limited; use a larger real labeled dataset for meaningful evaluation.</span></div></div>
      <div className="training-source">TRAINED FROM <strong>{metrics.dataset_source}</strong> <span>·</span> {metrics.demonstration_data ? 'synthetic demonstration examples' : 'user-provided labeled dataset'}</div>
    </>}
  </>
}
