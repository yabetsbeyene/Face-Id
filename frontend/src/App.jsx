import { useState } from 'react';
import WebcamPanel from './components/WebcamPanel';
import UploadPanel from './components/UploadPanel';
import MatchResult from './components/MatchResult';

export default function App() {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [liveResult, setLiveResult] = useState({});

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">
          <span className="status-dot" />
          Face ID Console
        </h1>
        <div className="mode-toggle">
          <button className={mode === 'camera' ? 'active' : ''} onClick={() => setMode('camera')}>
            Live camera
          </button>
          <button className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>
            Upload photo
          </button>
        </div>
      </header>

      <main className="main-grid">
        <div className="panel">
          <p className="panel-label">{mode === 'camera' ? 'Live feed' : 'Uploaded frame'}</p>
          {mode === 'camera' ? (
            <WebcamPanel onResult={setLiveResult} />
          ) : (
            <UploadPanel onResult={setLiveResult} />
          )}
        </div>

        <div className="panel">
          <p className="panel-label">Match result</p>
          {liveResult.error && <div className="error-banner">{liveResult.error}</div>}
          <MatchResult
            matched={liveResult.matched}
            faceDetected={liveResult.face_detected}
            similarity={liveResult.similarity}
            person={liveResult.person}
            message={liveResult.message}
            idleMessage={liveResult.idleMessage}
          />
        </div>
      </main>
    </div>
  );
}