import { bandConfidence } from '../utils/confidence';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function QualityHint({ issues, scores }) {
  if (!issues || issues.length === 0) return null;
  const pre  = scores?.blur_variance_enhanced != null ? Math.round(scores.blur_variance) : null;
  const post = scores?.blur_variance_enhanced != null ? Math.round(scores.blur_variance_enhanced) : null;
  return (
    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,176,32,0.08)',
      border: '1px solid rgba(255,176,32,0.2)', borderRadius: 8, fontSize: 11,
      color: 'var(--text-sub)', fontFamily: 'var(--font-mono)' }}>
      <span style={{ color: 'var(--amber)', fontWeight: 600 }}>⚡ Auto-enhanced</span>
      {pre != null && post != null && (
        <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>sharpness {pre} → {post}</span>
      )}
      <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, color: 'var(--text-muted)' }}>
        {issues.map((iss, i) => <li key={i}>{iss}</li>)}
      </ul>
    </div>
  );
}

export default function MatchResult({ matched, faceDetected, qualityOk, qualityIssues,
  qualityScores, similarity, person, message, idleMessage, enhanced }) {
  const pct      = bandConfidence(similarity);
  const photoSrc = person?.photo_url ? `${BASE_URL}${person.photo_url}` : null;

  if (faceDetected === undefined) {
    return (
      <div className="match-state idle" style={{ flexDirection: 'column', justifyContent: 'center',
        padding: '32px 20px', gap: 8, textAlign: 'center' }}>
        <span style={{ fontSize: 32, opacity: 0.2 }}>◎</span>
        <span>{idleMessage || 'Waiting…'}</span>
      </div>
    );
  }

  if (!faceDetected) {
    return (
      <div className="match-state idle" style={{ flexDirection: 'column', justifyContent: 'center',
        padding: '32px 20px', gap: 8, textAlign: 'center' }}>
        <span style={{ fontSize: 32, opacity: 0.2 }}>⊘</span>
        <span>No face detected in frame</span>
      </div>
    );
  }

  if (matched && person) {
    return (
      <div>
        <div className="match-state flagged">⚠ POSSIBLE MATCH — REVIEW REQUIRED</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 14px',
          fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Automated similarity match. Human verification required before any action.
        </p>
        <div className="person-card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            {photoSrc && (
              <img src={photoSrc} alt={person.full_name} style={{ width: 56, height: 56,
                borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--red)',
                boxShadow: '0 0 12px var(--red-glow)' }} />
            )}
            <p className="person-name">{person.full_name}</p>
          </div>
          <div className="person-field">
            <span className="label">Watchlist ID</span>
            <span className="value">{person.person_code}</span>
          </div>
          <div className="person-field">
            <span className="label">Category</span>
            <span className="value">{person.role || '—'}</span>
          </div>
          <div className="person-field">
            <span className="label">Enrolled</span>
            <span className="value">{new Date(person.created_at).toLocaleString()}</span>
          </div>
          <div className="person-field" style={{ border: 'none' }}>
            <span className="label">Confidence</span>
            <span className="value" style={{ color: 'var(--red)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className="confidence-bar">
            <div className="confidence-bar-fill no-match" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {enhanced && !qualityOk && <QualityHint issues={qualityIssues} scores={qualityScores} />}
      </div>
    );
  }

  return (
    <div>
      <div className="match-state cleared">✓ CLEARED — NOT ON WATCHLIST</div>
      <p style={{ color: 'var(--text-sub)', fontSize: 13, margin: '0 0 14px' }}>
        {message || 'This face does not match any enrolled watchlist entry.'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12,
        fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6 }}>
        <span>Closest similarity</span>
        <span style={{ color: 'var(--green)' }}>{pct}%</span>
      </div>
      <div className="confidence-bar">
        <div className="confidence-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {enhanced && !qualityOk && <QualityHint issues={qualityIssues} scores={qualityScores} />}
    </div>
  );
}
