import { useEffect, useRef, useState } from 'react';

export default function EnrollCapture({ onCapture }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn,    setCameraOn]    = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [capturedUrl, setCapturedUrl] = useState(null);

  useEffect(() => {
    if (!cameraOn) return;
    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCameraError('Could not access camera. Check browser permissions.'));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [cameraOn]);

  const capture = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      setCapturedUrl(URL.createObjectURL(blob));
      onCapture(blob);
      setCameraOn(false);
    }, 'image/jpeg', 0.9);
  };

  const retake = () => { setCapturedUrl(null); onCapture(null); setCameraOn(true); };

  return (
    <>
      <div className="viewfinder">
        {capturedUrl
          ? <img src={capturedUrl} alt="Captured" />
          : cameraOn
            ? <video ref={videoRef} autoPlay playsInline muted />
            : (
              <div className="viewfinder-placeholder">
                <span className="vf-icon">📷</span>
                Click &quot;Open camera&quot; to take a photo
              </div>
            )
        }
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {(cameraOn || capturedUrl) && (
          <>
            <div className="reticle-corner tl" /><div className="reticle-corner tr" />
            <div className="reticle-corner bl" /><div className="reticle-corner br" />
          </>
        )}
      </div>

      <div className="controls-row">
        {capturedUrl
          ? <button className="btn" onClick={retake}>↺ Retake photo</button>
          : cameraOn
            ? <button className="btn primary" onClick={capture}>⊙ Capture photo</button>
            : <button className="btn primary" onClick={() => setCameraOn(true)}>📷 Open camera</button>
        }
      </div>

      {cameraError && <div className="error-banner">{cameraError}</div>}
    </>
  );
}
