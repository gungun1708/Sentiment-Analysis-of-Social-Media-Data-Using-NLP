import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, BarChart3, ChevronLeft, CircleHelp, FileChartColumn, LayoutDashboard, Menu, Moon, Search, Sparkles, Sun, Upload, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/analyzer', label: 'Text analyzer', icon: Sparkles },
  { to: '/bulk', label: 'Bulk analysis', icon: Upload },
  { to: '/insights', label: 'Social insights', icon: BarChart3 },
  { to: '/model', label: 'Model performance', icon: FileChartColumn },
]
const titles = {
  '/': ['Overview', 'Your audience, in perspective.'],
  '/analyzer': ['Text analyzer', 'Understand the sentiment behind every message.'],
  '/bulk': ['Bulk analysis', 'Bring a dataset. Leave with a clear signal.'],
  '/insights': ['Social insights', 'Explore the conversation, one signal at a time.'],
  '/model': ['Model performance', 'Transparency behind every prediction.'],
  '/about': ['About Pulse AI', 'The thinking behind the intelligence.'],
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lightMode, setLightMode] = useState(false)
  const location = useLocation()
  const page = titles[location.pathname] || titles['/']
  return (
    <div className={`app-shell ${lightMode ? 'light-mode' : ''}`}>
      {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-icon"><Activity size={21} /></div>
          <div><strong>pulse<span>ai</span></strong><small>INTELLIGENCE SUITE</small></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Bulk analysis' && <span className="nav-tag">CSV</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={15} /></div><strong>Good data, clearer decisions.</strong><p>Explore sentiment signals across every post.</p><NavLink to="/about">Discover Pulse AI <ChevronLeft size={13} /></NavLink></div>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><CircleHelp size={18} /><span>About project</span></NavLink>
          <div className="profile-card"><div className="avatar">P</div><div><strong>Project workspace</strong><span>Local analytics</span></div><span className="online-dot" /></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{page[0]}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={16} /><input aria-label="Search posts" placeholder="Search posts…" onKeyDown={(event) => {
              if (event.key === 'Enter' && event.currentTarget.value.trim()) window.location.href = `/insights?search=${encodeURIComponent(event.currentTarget.value.trim())}`
            }} /><kbd>⌘ K</kbd></label>
            <span className="topbar-divider" />
            <button className="icon-button" title="Toggle light theme" aria-label="Toggle theme" onClick={() => setLightMode(!lightMode)}>{lightMode ? <Moon size={18} /> : <Sun size={18} />}</button>
            <div className="top-avatar">P</div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> SOCIAL LISTENING · AI INSIGHTS</div><h1>{page[0]}</h1><p>{page[1]}</p></div><div className="live-badge"><span /> LIVE DATA</div></div>
          <Outlet />
          <footer className="footer"><span>Pulse AI <span className="footer-dot">·</span> Social Sentiment Intelligence</span><span>Built for more thoughtful decisions.</span></footer>
        </div>
      </main>
    </div>
  )
}
