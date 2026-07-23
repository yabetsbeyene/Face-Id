import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL } from '../api/client';

/**
 * Manages the WebSocket connection to /ws/recognize.
 * Call sendFrame(blob) with a JPEG blob to get a recognition result back;
 * the latest result is exposed as `result`, and `connected` tracks socket health.
 */
export function useRecognitionSocket() {
  const [connected, setConnected] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      setConnected(true);
      setError(null); // clear any stale error from a prior harmless connection attempt
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setError('Could not reach the recognition socket. Is the backend running?');
    ws.onmessage = (event) => {
      setError(null); // a real message means the connection is genuinely working
      try {
        setResult(JSON.parse(event.data));
      } catch {
        setError('Received an unreadable response from the server');
      }
    };
    socketRef.current = ws;

    return () => ws.close();
  }, []);

  const sendFrame = useCallback((blob) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(blob);
    }
  }, []);

  return { connected, result, error, sendFrame };
}