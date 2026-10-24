import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import Analyzer from './pages/Analyzer'
import BulkAnalysis from './pages/BulkAnalysis'
import Insights from './pages/Insights'
import ModelPerformance from './pages/ModelPerformance'
import About from './pages/About'

export default function App() {
  return (
    <Routes><Route element={<AppLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/analyzer" element={<Analyzer />} />
      <Route path="/bulk" element={<BulkAnalysis />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/model" element={<ModelPerformance />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route></Routes>
  )
}
