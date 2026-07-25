/**
 * Thin wrapper around the backend REST endpoints.
 * Adjust BASE_URL if your backend runs somewhere other than localhost:8000.
 */
import type {
  EnrollmentInput,
  EnrollmentResult,
  Person,
  PersonUpdate,
  RecognitionResult,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Uploads a single image file for one-shot recognition.
 * Mirrors POST /recognize/image on the backend.
 */
export async function recognizeImage(file: File): Promise<RecognitionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/recognize/image`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Recognition request failed (${res.status})`);
  }

  return res.json();
}

/**
 * Enrolls a new person: uploads their photo + identity fields.
 * Mirrors POST /enroll on the backend. `photoBlob` can be a File (from an
 * <input type="file">) or a Blob (from a webcam capture canvas).
 */
export async function enrollPerson({
  photoBlob,
  personCode,
  fullName,
  role,
  notes,
  alertEmail,
}: EnrollmentInput): Promise<EnrollmentResult> {
  const formData = new FormData();
  formData.append('file', photoBlob, 'photo.jpg');
  formData.append('person_code', personCode);
  formData.append('full_name', fullName);
  if (role) formData.append('role', role);
  if (notes) formData.append('notes', notes);
  if (alertEmail) formData.append('alert_email', alertEmail);

  const res = await fetch(`${BASE_URL}/enroll`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Enrollment failed (${res.status})`);
  }

  return res.json();
}

export async function getPeople(): Promise<Person[]> {
  const res = await fetch(`${BASE_URL}/people`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Could not load directory (${res.status})`);
  }
  return res.json();
}

export async function updatePerson(personId: string, updates: PersonUpdate): Promise<Person> {
  const res = await fetch(`${BASE_URL}/people/${personId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Update failed (${res.status})`);
  }

  return res.json();
}

export async function deletePerson(personId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/people/${personId}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Delete failed (${res.status})`);
  }
}

export const WS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://') + '/ws/recognize';
