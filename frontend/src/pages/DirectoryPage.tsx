import { useEffect, useState } from 'react';
import { deletePerson, getPeople, updatePerson } from '../api/client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function DirectoryPage() {
  const [people, setPeople] = useState([]);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [form, setForm] = useState({
    person_code: '', full_name: '', role: '', notes: '', alert_email: '',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadPeople = async () => {
    try {
      setError(null);
      setPeople(await getPeople());
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    loadPeople();
  }, []);

  const openManager = (person) => {
    setSelectedPerson(person);
    setForm({
      person_code: person.person_code || '',
      full_name: person.full_name || '',
      role: person.role || '',
      notes: person.notes || '',
      alert_email: person.alert_email || '',
    });
    setFeedback(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedPerson) return;

    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await updatePerson(selectedPerson.id, {
        person_code: form.person_code.trim(),
        full_name: form.full_name.trim(),
        role: form.role.trim(),
        notes: form.notes.trim(),
        alert_email: form.alert_email.trim().toLowerCase(),
      });

      setPeople((prev) => prev.map((person) => (person.id === selectedPerson.id ? { ...person, ...updated } : person)));
      setSelectedPerson({ ...selectedPerson, ...updated });
      setFeedback('Record updated successfully.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;
    if (!window.confirm(`Delete ${selectedPerson.full_name}?`)) return;

    setDeletingId(selectedPerson.id);
    setError(null);
    setFeedback(null);

    try {
      await deletePerson(selectedPerson.id);
      setPeople((prev) => prev.filter((person) => person.id !== selectedPerson.id));
      setSelectedPerson(null);
      setFeedback('Record removed from the directory.');
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = people.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.person_code.toLowerCase().includes(search.toLowerCase()) ||
    (p.role || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1 className="page-title">Person Directory</h1>
          <p className="page-sub">{people.length} enrolled record{people.length !== 1 ? 's' : ''}</p>
        </div>
        <input
          className="field-input"
          style={{ width: 240 }}
          placeholder="🔍  Search by name, ID, category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {feedback && <div className="success-banner" style={{ marginTop: 10, marginBottom: 16 }}>{feedback}</div>}

      <div className="directory-grid">
        {filtered.map((person) => (
          <article className="directory-card" key={person.id}>
            {person.photo_url
              ? <img className="directory-avatar" src={`${BASE_URL}${person.photo_url}`} alt={person.full_name} />
              : <span className="avatar-placeholder">?</span>
            }
            <div className="directory-info">
              <p className="directory-name">{person.full_name}</p>
              <p className="directory-meta">{person.person_code}</p>
              {person.role && <span className="dir-role-tag">{person.role}</span>}
            </div>
            <div className="directory-actions">
              <button className="directory-action-btn" onClick={() => openManager(person)}>Manage</button>
            </div>
            <time className="directory-date">
              {new Date(person.created_at).toLocaleDateString()}
            </time>
          </article>
        ))}

        {!error && filtered.length === 0 && (
          <div className="panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {people.length === 0 ? 'No people enrolled yet.' : 'No results match your search.'}
          </div>
        )}
      </div>

      {selectedPerson && (
        <div className="manage-modal-backdrop" onClick={() => setSelectedPerson(null)}>
          <div className="manage-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manage-modal-header">
              <div>
                <p className="eyebrow">Directory management</p>
                <h2 className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>{selectedPerson.full_name}</h2>
              </div>
              <button className="btn" onClick={() => setSelectedPerson(null)}>Close</button>
            </div>

            <form onSubmit={handleSave} className="manage-form">
              <label className="field-label">
                Full name
                <input
                  className="field-input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </label>

              <label className="field-label">
                ID number
                <input
                  className="field-input"
                  value={form.person_code}
                  onChange={(e) => setForm({ ...form, person_code: e.target.value })}
                />
              </label>

              <label className="field-label">
                Officer alert email
                <input
                  className="field-input"
                  type="email"
                  value={form.alert_email}
                  onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
                />
              </label>

              <label className="field-label">
                Category
                <input
                  className="field-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                />
              </label>

              <label className="field-label">
                Notes
                <textarea
                  className="field-input"
                  style={{ minHeight: 90, resize: 'vertical' }}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <div className="manage-actions">
                <button type="submit" className="btn primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="btn danger" onClick={handleDelete} disabled={deletingId === selectedPerson.id}>
                  {deletingId === selectedPerson.id ? 'Deleting…' : 'Delete entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
