import { useEffect, useRef, useState } from 'react';
import { recognizeImage } from '../api/client';

export default function UploadPanel({ onResult }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    onResult({
      face_detected: result ? result.message !== 'No face detected' : undefined,
      matched: result?.matched,
      similarity: result?.similarity,
      person: result?.person,
      message: result?.message,
      error,
      idleMessage: loading ? 'Checking against enrolled faces…' : 'Upload a photo to check for a match',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, error, loading]);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const data = await recognizeImage(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="viewfinder">
        {preview ? (
          <img src={preview} alt="Uploaded frame" />
        ) : (
          <div className="viewfinder-placeholder">No photo uploaded yet</div>
        )}
        {preview && (
          <>
            <div className="reticle-corner tl" />
            <div className="reticle-corner tr" />
            <div className="reticle-corner bl" />
            <div className="reticle-corner br" />
            {loading && <div className="scan-line" />}
          </>
        )}
      </div>

      <div className="controls-row">
        <div
          className="upload-dropzone"
          style={{ flex: 1 }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          Click or drag a photo here to check it against enrolled faces
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}
    </>
  );
}