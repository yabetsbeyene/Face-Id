import { useEffect, useRef, useState } from 'react';
import { useRecognitionSocket } from '../hooks/useRecognitionSocket';

const SEND_INTERVAL_MS = 350; // ~3 frames/sec -- plenty for CPU inference, keeps the socket light

export default function WebcamPanel({ onResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const { connected, result, error, sendFrame } = useRecognitionSocket();

  useEffect(() => {
    onResult({ ...result, error, idleMessage: cameraOn ? 'Waiting for a face…' : 'Start the camera to begin' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, error, cameraOn]);

  useEffect(() => {
    if (!cameraOn) return;

    let stream;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480 } })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setCameraError('Could not access the camera. Check your browser permissions.'));

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  useEffect(() => {
    if (!cameraOn || !connected) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob && sendFrame(blob), 'image/jpeg', 0.8);
    }, SEND_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cameraOn, connected, sendFrame]);

  // Scale the backend's pixel bbox (based on the raw video frame) onto the displayed <video> element
  const bboxStyle = (() => {
    if (!result?.bbox || !videoRef.current) return null;
    const [x1, y1, x2, y2] = result.bbox;
    const scaleX = videoRef.current.clientWidth / (videoRef.current.videoWidth || 1);
    const scaleY = videoRef.current.clientHeight / (videoRef.current.videoHeight || 1);
    return {
      left: x1 * scaleX,
      top: y1 * scaleY,
      width: (x2 - x1) * scaleX,
      height: (y2 - y1) * scaleY,
    };
  })();

  return (
    <>
      <div className="viewfinder">
        {cameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted />
        ) : (
          <div className="viewfinder-placeholder">
            Camera is off.
            <br />
            Start it to begin live recognition.
          </div>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {cameraOn && (
          <>
            <div className="reticle-corner tl" />
            <div className="reticle-corner tr" />
            <div className="reticle-corner bl" />
            <div className="reticle-corner br" />
            {!result?.face_detected && <div className="scan-line" />}
            {bboxStyle && (
              <div
                className={`bbox-overlay ${result.matched ? '' : 'no-match'}`}
                style={bboxStyle}
              />
            )}
          </>
        )}
      </div>

      <div className="controls-row">
        <button className="btn primary" onClick={() => setCameraOn((v) => !v)}>
          {cameraOn ? 'Stop camera' : 'Start camera'}
        </button>
      </div>

      {cameraError && <div className="error-banner">{cameraError}</div>}
    </>
  );
}