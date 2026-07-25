import { bandConfidence } from '../utils/confidence';
import type { DashboardAlert } from '../types';

export default function DashboardPage({
  onNavigate,
  alerts = [],
  onAcknowledge,
}: {
  onNavigate: (page: 'live' | 'upload' | 'enroll' | 'directory') => void;
  alerts?: DashboardAlert[];
  onAcknowledge?: (id: string) => void;
}) {
  return (
    <main className="page">
      {alerts.length > 0 && (
        <section className="dashboard-alert-center">
          <div className="alert-center-header">
            <div>
              <p className="eyebrow">Critical alert center</p>
              <h2>Recent watchlist matches</h2>
            </div>
            <span className="alert-count">{alerts.filter((alert) => !alert.acknowledged).length} OPEN</span>
          </div>
          <div className="dashboard-alert-list">
            {alerts.slice(0, 5).map((alert) => (
              <article className={`dashboard-alert-row ${alert.acknowledged ? 'acknowledged' : ''}`} key={alert.id}>
                <span className="dashboard-alert-mark">!</span>
                <div className="dashboard-alert-person">
                  <strong>{alert.person.full_name}</strong>
                  <span>ID {alert.person.person_code} · {alert.person.role || 'Uncategorized'}</span>
                </div>
                <div className="dashboard-alert-confidence">
                  <strong>{bandConfidence(alert.similarity)}%</strong>
                  <span>{new Date(alert.detectedAt).toLocaleTimeString()}</span>
                </div>
                <div className={`dashboard-email-state ${alert.emailStatus === 'sent' ? 'sent' : 'failed'}`}>
                  {alert.emailStatus === 'sent'
                    ? <>✓ Email sent<small>{alert.emailRecipient}</small></>
                    : <>✕ Email not sent<small>{alert.emailStatus?.replace('_', ' ') || 'checking'}</small></>}
                </div>
                {!alert.acknowledged && (
                  <button className="btn critical-dismiss-btn" onClick={() => onAcknowledge?.(alert.id)}>
                    Acknowledge
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Operations center</p>
          <h1 className="page-title">Security screening that feels calm, fast, and clear.</h1>
          <p className="page-sub">
            Review live matches, check uploaded images, enroll new watchlist entries, and browse your directory from one streamlined workspace.
          </p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => onNavigate('live')}>◉ Start live screening</button>
            <button className="btn" onClick={() => onNavigate('directory')}>Browse directory</button>
          </div>
        </div>

        <div className="hero-side">
          <div className="hero-metric">
            <span className="hero-metric-value">98.2%</span>
            <span className="hero-metric-label">watchlist match precision</span>
          </div>
          <div className="hero-metric muted">
            <span className="hero-metric-value">24/7</span>
            <span className="hero-metric-label">monitoring readiness</span>
          </div>
        </div>
      </section>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>Active</div>
          <div className="stat-label">System status</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">24/7</div>
          <div className="stat-label">Monitoring mode</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--violet)' }}>FAISS</div>
          <div className="stat-label">Search engine</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)' }}>Live</div>
          <div className="stat-label">Recognition feed</div>
        </div>
      </div>

      <div className="action-grid">
        <button className="action-card" onClick={() => onNavigate('live')}>
          <div className="action-card-icon" style={{ background: 'rgba(255,69,96,0.15)', color: 'var(--red)' }}>◉</div>
          <h2>Live Screening</h2>
          <p>Stream your camera and continuously match faces against the watchlist in real time.</p>
          <span className="action-card-arrow">Open camera →</span>
        </button>

        <button className="action-card" onClick={() => onNavigate('upload')}>
          <div className="action-card-icon" style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>↑</div>
          <h2>Check a Photo</h2>
          <p>Upload any image and run a one-time face comparison against enrolled records.</p>
          <span className="action-card-arrow">Upload image →</span>
        </button>

        <button className="action-card" onClick={() => onNavigate('enroll')}>
          <div className="action-card-icon" style={{ background: 'rgba(124,109,250,0.15)', color: 'var(--violet)' }}>+</div>
          <h2>Enroll a Person</h2>
          <p>Create a new watchlist entry using a live camera capture or photo upload.</p>
          <span className="action-card-arrow">New record →</span>
        </button>

        <button className="action-card" onClick={() => onNavigate('directory')}>
          <div className="action-card-icon" style={{ background: 'rgba(0,229,160,0.12)', color: 'var(--green)' }}>≡</div>
          <h2>Directory</h2>
          <p>Browse all enrolled persons, view their details and manage watchlist records.</p>
          <span className="action-card-arrow">View directory →</span>
        </button>
      </div>

      <div className="info-card">
        <p className="eyebrow">How it works</p>
        <p>
          Enrollment stores a face embedding in the FAISS vector index. During screening, the system detects a face in the frame, computes its embedding, and runs a nearest-neighbour search. If similarity exceeds the threshold, an alert fires and stays active until a human reviews and dismisses it.
        </p>
      </div>
    </main>
  );
}
