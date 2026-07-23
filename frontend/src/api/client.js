/**
 * Thin wrapper around the backend REST endpoints.
 * Adjust BASE_URL if your backend runs somewhere other than localhost:8000.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Uploads a single image file for one-shot recognition.
 * Mirrors POST /recognize/image on the backend.
 */
export async function recognizeImage(file) {
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

export const WS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://') + '/ws/recognize';