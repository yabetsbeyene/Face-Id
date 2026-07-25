import { useEffect, useRef, useState } from 'react';
import { recognizeImage } from '../api/client';

export default function UploadPanel({ onResult }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    onResult({
      face_detected:  result ? result.message !== 'No face detected' : undefined,
      quality_ok:     result?.quality_ok,
      quality_issues: result?.quality_issues,
      matched:        result?.matched,
      similarity:     result?.similarity,
      person:         result?.person,
      message:        result?.message,
      error,
      idleMessage: loading ? 'Checking against enrolled faces…' : 'Upload a photo to check for a match',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, error, loading]);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null); setResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      setResult(await recognizeImage(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="viewfinder">
        {preview
          ? <img src={preview} alt="Uploaded frame" />
          : (
            <div className="viewfinder-placeholder">
              <span className="vf-icon">🖼</span>
              No photo uploaded yet
            </div>
          )
        }
        {preview && (
          <>
            <div className="reticle-corner tl" /><div className="reticle-corner tr" />
            <div className="reticle-corner bl" /><div className="reticle-corner br" />
            {loading && <div className="scan-line" />}
          </>
        )}
        {loading && (
          <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8,
            background: 'rgba(3,5,10,0.8)', borderRadius: 7, padding: '6px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)', animation: 'blink 0.8s infinite' }} />
            Analyzing…
          </div>
        )}
      </div>

      <div className="controls-row">
        <div className="upload-dropzone" style={{ flex: 1 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}>
          <span className="dz-icon">↑</span>
          {preview ? 'Upload a different photo' : 'Click or drag a photo to check against watchlist'}
        </div>
        <input ref={inputRef} type="file" accept="image/*,.heic,.heif,.avif,.svg" style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {error && <div className="error-banner">{error}</div>}
    </>
  );
}
