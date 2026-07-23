export default function MatchResult({ matched, faceDetected, similarity, person, message, idleMessage }) {
  const pct = similarity != null ? Math.max(0, Math.round(similarity * 100)) : 0;
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const photoSrc = person?.photo_url ? `${BASE_URL}${person.photo_url}` : null;

  if (faceDetected === undefined) {
    return <div className="match-state idle">{idleMessage || 'Waiting…'}</div>;
  }

  if (!faceDetected) {
    return <div className="match-state idle">No face detected in frame</div>;
  }

  if (matched && person) {
    return (
      <div>
        <div className="match-state matched">● MATCH FOUND</div>
        <div className="person-card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 4 }}>
            {photoSrc && (
              <img
                src={photoSrc}
                alt={person.full_name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--teal)' }}
              />
            )}
            <p className="person-name" style={{ margin: 0 }}>{person.full_name}</p>
          </div>
          <div className="person-field">
            <span className="label">Person code</span>
            <span className="value">{person.person_code}</span>
          </div>
          <div className="person-field">
            <span className="label">Role</span>
            <span className="value">{person.role || '—'}</span>
          </div>
          <div className="person-field">
            <span className="label">Enrolled</span>
            <span className="value">{new Date(person.created_at).toLocaleString()}</span>
          </div>
          <div className="person-field" style={{ border: 'none' }}>
            <span className="label">Confidence</span>
            <span className="value">{pct}%</span>
          </div>
          <div className="confidence-bar">
            <div className="confidence-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="match-state no-match">● NO MATCH</div>
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        {message || 'This face is not in the enrolled directory.'}
      </p>
      <div className="confidence-bar">
        <div className="confidence-bar-fill no-match" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
        closest similarity: {pct}%
      </p>
    </div>
  );
}