import { useState } from 'react';
import EnrollCapture from '../components/EnrollCapture';
import EnrollUpload from '../components/EnrollUpload';
import { enrollPerson } from '../api/client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const initialForm = { personCode: '', fullName: '', role: '', notes: '', alertEmail: '' };

export default function EnrollPage() {
  const [photoSource, setPhotoSource] = useState('camera');
  const [photoBlob, setPhotoBlob]     = useState(null);
  const [form, setForm]               = useState(initialForm);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [enrolled, setEnrolled]       = useState(null);

  const canSubmit = photoBlob && form.personCode.trim() && form.fullName.trim()
    && form.alertEmail.trim() && !submitting;

  const switchPhotoSource = (src) => { setPhotoSource(src); setPhotoBlob(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await enrollPerson({
        photoBlob,
        personCode: form.personCode.trim(),
        fullName:   form.fullName.trim(),
        role:       form.role.trim()  || undefined,
        notes:      form.notes.trim() || undefined,
        alertEmail: form.alertEmail.trim().toLowerCase(),
      });
      setEnrolled(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const enrollAnother = () => {
    setEnrolled(null); setPhotoBlob(null);
    setForm(initialForm); setError(null);
  };

  /* ── Success screen ── */
  if (enrolled) {
    return (
      <main className="page">
        <div className="enroll-success">
          <div className="success-banner">
            <span className="success-icon">✓</span>
            SUCCESSFULLY ADDED TO WATCHLIST
          </div>
          <div className="panel">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
              {enrolled.person.photo_url && (
                <img
                  src={`${BASE_URL}${enrolled.person.photo_url}`}
                  alt={enrolled.person.full_name}
                  style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover',
                           border: '2px solid var(--green)', boxShadow: '0 0 14px var(--green-glow)' }}
                />
              )}
              <div>
                <div className="person-name">{enrolled.person.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {enrolled.person.person_code}
                </div>
              </div>
            </div>
            <div className="person-field">
              <span className="label">Category</span>
              <span className="value">{enrolled.person.role || '—'}</span>
            </div>
            <div className="person-field">
              <span className="label">Alert recipient</span>
              <span className="value">{enrolled.person.alert_email}</span>
            </div>
            <div className="person-field" style={{ border: 'none' }}>
              <span className="label">Detection confidence</span>
              <span className="value">{Math.round(enrolled.detection_confidence * 100)}%</span>
            </div>
            <div className="confidence-bar" style={{ marginTop: 10 }}>
              <div className="confidence-bar-fill" style={{ width: `${Math.round(enrolled.detection_confidence * 100)}%` }} />
            </div>
            <div className="controls-row" style={{ marginTop: 20 }}>
              <button className="btn primary" onClick={enrollAnother}>+ Enroll another person</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Enroll form ── */
  return (
    <main className="main-grid">
      {/* Left: photo capture */}
      <div className="panel">
        <p className="panel-label">Photo</p>
        <div className="seg-control" style={{ marginBottom: 16 }}>
          <button className={photoSource === 'camera' ? 'active' : ''} onClick={() => switchPhotoSource('camera')}>
            📷 Camera
          </button>
          <button className={photoSource === 'upload' ? 'active' : ''} onClick={() => switchPhotoSource('upload')}>
            ↑ Upload
          </button>
        </div>
        {photoSource === 'camera'
          ? <EnrollCapture onCapture={setPhotoBlob} />
          : <EnrollUpload  onCapture={setPhotoBlob} />
        }
        {photoBlob && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
            <span>✓</span> Photo ready
          </div>
        )}
      </div>

      {/* Right: form */}
      <div className="panel">
        <p className="panel-label">Watchlist entry details</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field-label">
            Full name <span style={{ color: 'var(--red)' }}>*</span>
            <input
              className="field-input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="e.g. Hana Girma"
              required
            />
          </label>

          <label className="field-label">
            ID number <span style={{ color: 'var(--red)' }}>*</span>
            <input
              className="field-input"
              value={form.personCode}
              onChange={(e) => setForm({ ...form, personCode: e.target.value })}
              placeholder="e.g. 123456789"
              required
            />
          </label>

          <label className="field-label">
            Officer alert email <span style={{ color: 'var(--red)' }}>*</span>
            <input
              className="field-input"
              type="email"
              value={form.alertEmail}
              onChange={(e) => setForm({ ...form, alertEmail: e.target.value })}
              placeholder="e.g. officer@department.org"
              autoComplete="email"
              required
            />
            <small style={{ color: 'var(--text-muted)', marginTop: 5 }}>
              Confirmed match alerts will be sent to this address.
            </small>
          </label>

          <label className="field-label">
            Category
            <input
              className="field-input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="e.g. Missing person, Suspect…"
            />
          </label>

          <label className="field-label">
            Notes
            <textarea
              className="field-input"
              style={{ minHeight: 80, resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes…"
            />
          </label>

          {error && <div className="error-banner">{error}</div>}

          {!photoBlob && (
            <p style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'var(--font-mono)',
                        padding: '8px 12px', background: 'var(--amber-dim)', borderRadius: 6,
                        border: '1px solid rgba(255,176,32,0.2)', margin: 0 }}>
              ⚠ Capture or upload a photo first
            </p>
          )}

          <button type="submit" className="btn primary" disabled={!canSubmit} style={{ marginTop: 4 }}>
            {submitting ? '⏳ Adding…' : '+ Add to watchlist'}
          </button>
        </form>
      </div>
    </main>
  );
}
