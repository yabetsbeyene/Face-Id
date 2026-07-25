import { useRef, useState } from 'react';

export default function EnrollUpload({ onCapture }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onCapture(file);
  };

  const clear = () => {
    setPreview(null);
    onCapture(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div className="viewfinder">
        {preview
          ? <img src={preview} alt="Selected" />
          : (
            <div className="viewfinder-placeholder">
              <span className="vf-icon">🖼</span>
              No photo selected yet
            </div>
          )
        }
        {preview && (
          <>
            <div className="reticle-corner tl" /><div className="reticle-corner tr" />
            <div className="reticle-corner bl" /><div className="reticle-corner br" />
          </>
        )}
      </div>

      <div className="controls-row">
        {preview
          ? <button className="btn" onClick={clear}>↺ Choose different photo</button>
          : (
            <div className="upload-dropzone" style={{ flex: 1 }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}>
              <span className="dz-icon">↑</span>
              Click or drag a photo here
            </div>
          )
        }
        <input ref={inputRef} type="file" accept="image/*,.heic,.heif,.avif,.svg" style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    </>
  );
}
