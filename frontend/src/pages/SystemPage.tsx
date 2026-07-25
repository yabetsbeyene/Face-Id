import { useCallback, useEffect, useState } from 'react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface HealthResponse {
  status: string;
  database: string;
  env: string;
  email: {
    configured: boolean;
    host: string | null;
    from_email: string | null;
    fallback_recipient: boolean;
  };
}

interface SystemPageProps {
  soundArmed: boolean;
  onTestSound: () => void;
}

export default function SystemPage({ soundArmed, onTestSound }: SystemPageProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      setHealth(await response.json());
    } catch {
      setHealth(null);
      setError('Backend is unreachable. Start FastAPI on port 8000, then check again.');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void checkHealth(); }, [checkHealth]);

  const apiOnline = health?.status === 'ok';
  const databaseOnline = health?.database === 'ok';

  return (
    <main className="page page-enter">
      <section className="status-hero">
        <div>
          <p className="eyebrow">Live diagnostics</p>
          <h1 className="page-title">Know what is ready before screening starts.</h1>
          <p className="page-sub">This page checks the API and database and lets you test the browser alert siren.</p>
        </div>
        <button className="btn primary" onClick={checkHealth} disabled={checking}>
          {checking ? 'Checking…' : '↻ Run health check'}
        </button>
      </section>

      {error && <div className="error-banner prominent">{error}</div>}

      <section className="diagnostic-grid">
        <article className={`diagnostic-card ${apiOnline ? 'healthy' : 'offline'}`}>
          <span className="diagnostic-icon">API</span>
          <div><h2>Recognition backend</h2><p>{apiOnline ? 'FastAPI is responding normally.' : 'No response from localhost:8000.'}</p></div>
          <span className="diagnostic-state">{apiOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </article>
        <article className={`diagnostic-card ${databaseOnline ? 'healthy' : 'offline'}`}>
          <span className="diagnostic-icon">DB</span>
          <div><h2>PostgreSQL database</h2><p>{databaseOnline ? 'Connection and query succeeded.' : 'Database health is unavailable.'}</p></div>
          <span className="diagnostic-state">{databaseOnline ? 'READY' : 'CHECK'}</span>
        </article>
        <article className={`diagnostic-card ${soundArmed ? 'healthy' : 'warning'}`}>
          <span className="diagnostic-icon">🔊</span>
          <div><h2>Critical alert sound</h2><p>Browser audio must be enabled by a user click.</p></div>
          <button className="btn danger" onClick={onTestSound}>{soundArmed ? 'Test again' : 'Arm & test'}</button>
        </article>
        <article className={`diagnostic-card ${health?.email?.configured ? 'healthy' : 'offline'}`}>
          <span className="diagnostic-icon">✉</span>
          <div>
            <h2>Officer email alerts</h2>
            <p>{health?.email?.configured
              ? `SMTP ready via ${health.email.host}.`
              : 'SMTP credentials are missing in backend/.env.'}</p>
          </div>
          <span className="diagnostic-state">{health?.email?.configured ? 'READY' : 'NOT SET'}</span>
        </article>
      </section>

      <section className="panel connection-details">
        <p className="panel-label">Connection details</p>
        <div className="detail-row"><span>API address</span><code>{BASE_URL}</code></div>
        <div className="detail-row"><span>Environment</span><strong>{health?.env || 'Unavailable'}</strong></div>
        <div className="detail-row"><span>Camera</span><strong>{navigator.mediaDevices ? 'Browser supported' : 'Not supported'}</strong></div>
        <div className="detail-row"><span>Email sender</span><strong>{health?.email?.from_email || 'Not configured'}</strong></div>
      </section>
    </main>
  );
}
