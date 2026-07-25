import { useEffect, useRef, useState } from 'react';
import { useRecognitionSocket } from '../hooks/useRecognitionSocket';

const JPEG_QUALITY    = 0.92;
const SEND_INTERVAL_MS = 250;

export default function WebcamPanel({ onResult }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraOn,    setCameraOn]    = useState(false);
  const { connected, result, error, sendFrame } = useRecognitionSocket();

  useEffect(() => {
    onResult({
      ...result, error,
      idleMessage: cameraOn
        ? connected ? 'Scanning…' : 'Connecting to recognition server…'
        : 'Start the camera to begin live screening',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, error, cameraOn, connected]);

  useEffect(() => {
    if (!cameraOn) return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCameraError('Could not access camera. Check browser permissions.'));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn || !connected) return;
    const iv = setInterval(() => {
      const v = videoRef.current, c = canvasRef.current;
      if (!v || !c || v.readyState < 2) return;
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      c.toBlob((blob) => blob && sendFrame(blob), 'image/jpeg', JPEG_QUALITY);
    }, SEND_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [cameraOn, connected, sendFrame]);

  const bboxStyle = (() => {
    if (!result?.bbox || !videoRef.current) return null;
    const [x1, y1, x2, y2] = result.bbox;
    const sx = videoRef.current.clientWidth  / (videoRef.current.videoWidth  || 1);
    const sy = videoRef.current.clientHeight / (videoRef.current.videoHeight || 1);
    return { left: x1*sx, top: y1*sy, width: (x2-x1)*sx, height: (y2-y1)*sy };
  })();

  const simPct = result?.similarity ? Math.round(result.similarity * 100) : 0;

  return (
    <>
      <div className="viewfinder">
        {cameraOn
          ? <video ref={videoRef} autoPlay playsInline muted />
          : (
            <div className="viewfinder-placeholder">
              <span className="vf-icon">📷</span>
              Camera is off — click Start to begin
            </div>
          )
        }
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {cameraOn && (
          <>
            <div className="reticle-corner tl" /><div className="reticle-corner tr" />
            <div className="reticle-corner bl" /><div className="reticle-corner br" />
            {!result?.face_detected && <div className="scan-line" />}

            <div className={`conn-badge ${connected ? 'online' : 'offline'}`}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor',
                display: 'inline-block', boxShadow: connected ? '0 0 6px currentColor' : 'none' }} />
              {connected ? 'LIVE' : 'connecting…'}
            </div>

            {result?.face_detected && (
              <div className="sim-overlay">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>similarity</span>
                  <span style={{ color: result?.matched ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                    {simPct}%
                  </span>
                </div>
                <div className="sim-bar">
                  <div className="sim-bar-fill" style={{
                    width: `${simPct}%`,
                    background: result?.matched
                      ? 'linear-gradient(90deg, var(--red), #ff8fa0)'
                      : 'linear-gradient(90deg, var(--green), var(--cyan))',
                  }} />
                </div>
              </div>
            )}

            {bboxStyle && (
              <div className={`bbox-overlay ${result?.matched ? '' : 'no-match'}`} style={bboxStyle} />
            )}
          </>
        )}
      </div>

      <div className="controls-row">
        <button className={`btn ${cameraOn ? '' : 'primary'}`} onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? '⏹ Stop camera' : '▶ Start camera'}
        </button>
      </div>

      {cameraError && <div className="error-banner">{cameraError}</div>}
    </>
  );
}
