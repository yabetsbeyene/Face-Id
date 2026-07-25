import { useCallback, useEffect, useMemo, useState } from 'react';
import RecognizePage from './pages/RecognizePage';
import EnrollPage from './pages/EnrollPage';
import DashboardPage from './pages/DashboardPage';
import DirectoryPage from './pages/DirectoryPage';
import SystemPage from './pages/SystemPage';
import GuidePage from './pages/GuidePage';
import { playAlertTone } from './hooks/useMatchAlert';
import type { DashboardAlert } from './types';

export type PageKey =
  | 'dashboard'
  | 'live'
  | 'upload'
  | 'enroll'
  | 'directory'
  | 'system'
  | 'guide';

const NAV: Array<{ key: PageKey; label: string; icon: string; group: string }> = [
  { key: 'dashboard', label: 'Dashboard', icon: '⌂', group: 'Workspace' },
  { key: 'live', label: 'Live Screening', icon: '◉', group: 'Workspace' },
  { key: 'upload', label: 'Photo Check', icon: '↑', group: 'Workspace' },
  { key: 'enroll', label: 'Enroll Person', icon: '+', group: 'Records' },
  { key: 'directory', label: 'Directory', icon: '≡', group: 'Records' },
  { key: 'system', label: 'System Status', icon: '●', group: 'Support' },
  { key: 'guide', label: 'Operator Guide', icon: '?', group: 'Support' },
];

const PAGE_TITLES: Record<PageKey, { title: string; sub: string }> = {
  dashboard: { title: 'Operations Center', sub: 'FaceID surveillance console' },
  live: { title: 'Live Screening', sub: 'Real-time face recognition' },
  upload: { title: 'Photo Check', sub: 'One-shot image comparison' },
  enroll: { title: 'Enroll Person', sub: 'Add a new watchlist record' },
  directory: { title: 'Directory', sub: 'Review and manage enrolled people' },
  system: { title: 'System Status', sub: 'Backend connectivity and alert controls' },
  guide: { title: 'Operator Guide', sub: 'Safe and effective screening workflow' },
};

const pathFor = (page: PageKey) => (page === 'dashboard' ? '/' : `/${page}`);
const pageFromPath = (): PageKey => {
  const candidate = window.location.pathname.split('/').filter(Boolean)[0] as PageKey;
  return candidate in PAGE_TITLES ? candidate : 'dashboard';
};

export default function App() {
  const [section, setSection] = useState<PageKey>(pageFromPath);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [soundArmed, setSoundArmed] = useState(false);
  const [alerts, setAlerts] = useState<DashboardAlert[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('faceid-alerts') || '[]');
    } catch {
      return [];
    }
  });
  const pt = PAGE_TITLES[section];

  useEffect(() => {
    const handleBack = () => setSection(pageFromPath());
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, []);

  useEffect(() => {
    document.title = `${pt.title} · FaceID`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pt.title]);

  useEffect(() => {
    localStorage.setItem('faceid-alerts', JSON.stringify(alerts.slice(0, 20)));
  }, [alerts]);

  useEffect(() => {
    const hasOpenAlert = alerts.some((alert) => !alert.acknowledged);
    if (!hasOpenAlert || section === 'live' || section === 'upload') return;
    playAlertTone();
    const alarm = window.setInterval(playAlertTone, 900);
    return () => window.clearInterval(alarm);
  }, [alerts, section]);

  const handleNavigate = (key: PageKey) => {
    if (key !== section) window.history.pushState({}, '', pathFor(key));
    setSection(key);
    setMobileNavOpen(false);
  };

  const armSound = () => {
    playAlertTone();
    setSoundArmed(true);
  };

  const handleAlert = useCallback((alert: DashboardAlert) => {
    setAlerts((current) => [alert, ...current].slice(0, 20));
  }, []);

  const acknowledgeAlert = (id: string) => {
    setAlerts((current) => current.map((alert) => (
      alert.id === id ? { ...alert, acknowledged: true } : alert
    )));
  };

  const content = useMemo(() => ({
    dashboard: <DashboardPage onNavigate={handleNavigate} alerts={alerts} onAcknowledge={acknowledgeAlert} />,
    live: <RecognizePage initialMode="camera" onAlert={handleAlert} />,
    upload: <RecognizePage initialMode="upload" onAlert={handleAlert} />,
    enroll: <EnrollPage />,
    directory: <DirectoryPage />,
    system: <SystemPage soundArmed={soundArmed} onTestSound={armSound} />,
    guide: <GuidePage onNavigate={handleNavigate} />,
  }[section]), [section, soundArmed, alerts, handleAlert]);

  const groups = [...new Set(NAV.map((item) => item.group))];

  return (
    <div className={`app-shell ${mobileNavOpen ? 'menu-open' : ''}`}>
      <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} />
      <aside className={`app-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <button className="sidebar-brand brand-button" onClick={() => handleNavigate('dashboard')}>
          <div className="sidebar-brand-icon">⬡</div>
          <div className="sidebar-brand-text"><strong>FaceID</strong><span>OPERATIONS</span></div>
        </button>

        <div className="sidebar-highlight">
          <span className="sidebar-highlight-title">Mission control</span>
          <span className="sidebar-highlight-copy">Fast screening, human review, and clear watchlist management.</span>
        </div>

        {groups.map((group) => (
          <div key={group}>
            <p className="sidebar-section-label">{group}</p>
            <nav className="sidebar-nav">
              {NAV.filter((item) => item.group === group).map(({ key, label, icon }) => (
                <button
                  key={key}
                  className={`nav-item ${section === key ? 'active' : ''}`}
                  onClick={() => handleNavigate(key)}
                  aria-current={section === key ? 'page' : undefined}
                >
                  <span className="nav-icon">{icon}</span>{label}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="sidebar-footer">
          <button className={`sound-arm ${soundArmed ? 'armed' : ''}`} onClick={armSound}>
            <span>{soundArmed ? '🔊' : '🔇'}</span>
            <span><strong>{soundArmed ? 'Alerts armed' : 'Arm alert sound'}</strong><small>Click to test loud siren</small></span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div>
            <div className="topbar-title">{pt.title}</div>
            <div className="topbar-sub">{pt.sub}</div>
          </div>
          <div className="topbar-right">
            <button className={`topbar-chip interactive ${soundArmed ? 'armed' : ''}`} onClick={armSound}>
              {soundArmed ? '🔊 Alerts armed' : 'Enable alert sound'}
            </button>
            {section === 'live' && <span className="live-badge"><span className="live-dot" /> LIVE</span>}
            <button className="mobile-menu-toggle" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Toggle navigation">☰</button>
          </div>
        </header>
        {alerts.some((alert) => !alert.acknowledged) && section !== 'live' && section !== 'upload' && (
          <div className="global-critical-alert">
            <span className="global-alert-pulse">!</span>
            <div>
              <strong>WATCHLIST MATCH: {alerts.find((alert) => !alert.acknowledged)?.person.full_name}</strong>
              <small>
                {alerts.find((alert) => !alert.acknowledged)?.emailStatus === 'sent'
                  ? 'Officer email sent'
                  : 'Officer email needs attention'}
              </small>
            </div>
            <button className="btn critical-dismiss-btn" onClick={() => handleNavigate('dashboard')}>
              Review alert
            </button>
          </div>
        )}
        <div className="app-content" key={section}>{content}</div>
      </div>
    </div>
  );
}
