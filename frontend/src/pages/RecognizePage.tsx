import { useEffect, useRef, useState } from 'react';
import WebcamPanel from '../components/WebcamPanel';
import UploadPanel from '../components/Uploadpanel';
import MatchResult from '../components/MatchResult';
import { useMatchAlert } from '../hooks/useMatchAlert';
import { bandConfidence } from '../utils/confidence';
import type { DashboardAlert, RecognitionResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function RecognizePage({
  initialMode = 'camera',
  onAlert,
}: {
  initialMode?: 'camera' | 'upload';
  onAlert?: (alert: DashboardAlert) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [liveResult, setLiveResult] = useState<RecognitionResult>({});
  const { activeAlert, dismiss } = useMatchAlert(
    liveResult.matched,
    liveResult.person,
    liveResult.similarity
  );
  const reportedPersonRef = useRef<string | null>(null);

  useEffect(() => {
    if (liveResult.matched && liveResult.person) {
      if (reportedPersonRef.current !== liveResult.person.id) {
        reportedPersonRef.current = liveResult.person.id;
        onAlert?.({
          id: `${liveResult.person.id}-${Date.now()}`,
          person: liveResult.person,
          similarity: liveResult.similarity || 0,
          emailStatus: liveResult.email_alert_status,
          emailRecipient: liveResult.email_alert_recipient,
          detectedAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    } else {
      reportedPersonRef.current = null;
    }
  }, [liveResult, onAlert]);

  return (
    <main className="main-grid">
      {/* ── Critical alert banner ── */}
      {activeAlert && (
        <div className="critical-alert-banner">
          <div className="critical-alert-content">
            {activeAlert.person.photo_url && (
              <img
                src={`${BASE_URL}${activeAlert.person.photo_url}`}
                alt={activeAlert.person.full_name}
                className="critical-alert-photo"
              />
            )}
            <div className="critical-alert-text">
              <p className="critical-alert-title">🚨 WATCHLIST MATCH — REVIEW REQUIRED</p>
              <p className="critical-alert-name">{activeAlert.person.full_name}</p>
              <p className="critical-alert-meta">
                ID: {activeAlert.person.person_code} &nbsp;·&nbsp;
                {activeAlert.person.role || 'uncategorized'} &nbsp;·&nbsp;
                {bandConfidence(activeAlert.similarity)}% confidence
              </p>
              <p className={`email-delivery ${liveResult.email_alert_status === 'sent' ? 'sent' : 'failed'}`}>
                {liveResult.email_alert_status === 'sent'
                  ? `✓ Officer email sent to ${liveResult.email_alert_recipient}`
                  : liveResult.email_alert_status === 'cooldown'
                    ? 'Officer was already emailed recently (cooldown active)'
                    : liveResult.email_alert_status === 'not_configured'
                      ? '✕ Officer email not sent — SMTP is not configured'
                      : liveResult.email_alert_status === 'no_recipient'
                        ? '✕ Officer email not sent — no recipient is assigned'
                        : liveResult.email_alert_status === 'failed'
                          ? '✕ Officer email delivery failed — check backend logs'
                          : 'Sending officer notification…'}
              </p>
            </div>
          </div>
          <button className="btn critical-dismiss-btn" onClick={dismiss}>
            Acknowledge &amp; dismiss
          </button>
        </div>
      )}

      {/* ── Camera / upload panel ── */}
      <div className={`panel ${activeAlert ? 'flash-match critical' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p className="panel-label" style={{ margin: 0 }}>
            {mode === 'camera' ? 'Live feed' : 'Uploaded frame'}
          </p>
          <div className="seg-control">
            <button className={mode === 'camera' ? 'active' : ''} onClick={() => setMode('camera')}>
              📷 Live camera
            </button>
            <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>
              ↑ Upload photo
            </button>
          </div>
        </div>

        {mode === 'camera'
          ? <WebcamPanel onResult={setLiveResult} />
          : <UploadPanel onResult={setLiveResult} />
        }
      </div>

      {/* ── Result panel ── */}
      <div className="panel">
        <p className="panel-label">Screening result</p>
        {liveResult.error && <div className="error-banner">{liveResult.error}</div>}
        <MatchResult
          matched={liveResult.matched}
          faceDetected={liveResult.face_detected}
          qualityOk={liveResult.quality_ok}
          qualityIssues={liveResult.quality_issues}
          qualityScores={liveResult.quality_scores}
          enhanced={liveResult.enhanced}
          similarity={liveResult.similarity}
          person={liveResult.person}
          message={liveResult.message}
          idleMessage={liveResult.idleMessage}
        />
      </div>
    </main>
  );
}
