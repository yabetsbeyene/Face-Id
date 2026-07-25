import { useState } from 'react';
import type { PageKey } from '../App';

export default function GuidePage({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const [openStep, setOpenStep] = useState(0);
  const steps = [
    ['1', 'Enroll trusted records', 'Add a clear, front-facing photo and accurate identity details before running a comparison.'],
    ['2', 'Choose a screening mode', 'Use Live Screening for continuous camera frames or Photo Check for one uploaded image.'],
    ['3', 'Review every red alert', 'A match is an automated similarity result—not a final identity decision. Always verify it manually.'],
    ['4', 'Acknowledge the alert', 'After review, use the red acknowledge button to stop the siren and clear the persistent alert.'],
  ];

  return (
    <main className="page page-enter">
      <section className="guide-hero">
        <p className="eyebrow">Quick start</p>
        <h1 className="page-title">A clear workflow for every screening.</h1>
        <p className="page-sub">Open each step for guidance, then jump directly to the relevant workspace.</p>
      </section>
      <section className="guide-layout">
        <div className="guide-steps">
          {steps.map(([number, title, body], index) => (
            <button className={`guide-step ${openStep === index ? 'open' : ''}`} key={title} onClick={() => setOpenStep(index)}>
              <span className="step-number">{number}</span>
              <span><strong>{title}</strong>{openStep === index && <p>{body}</p>}</span>
              <span className="step-arrow">{openStep === index ? '−' : '+'}</span>
            </button>
          ))}
        </div>
        <aside className="panel quick-actions">
          <p className="panel-label">Start an action</p>
          <button className="btn primary" onClick={() => onNavigate('live')}>◉ Open live screening</button>
          <button className="btn" onClick={() => onNavigate('upload')}>↑ Check a photo</button>
          <button className="btn" onClick={() => onNavigate('enroll')}>+ Enroll a person</button>
          <button className="btn" onClick={() => onNavigate('system')}>● Check system status</button>
        </aside>
      </section>
      <section className="responsible-use">
        <strong>Human review is required.</strong>
        <p>Face similarity can be affected by lighting, camera angle, image quality, and demographic bias. Never take consequential action from this tool alone.</p>
      </section>
    </main>
  );
}
