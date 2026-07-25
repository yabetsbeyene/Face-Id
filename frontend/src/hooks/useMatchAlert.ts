import { useCallback, useEffect, useRef, useState } from 'react';

const REPEAT_INTERVAL_MS = 900;

/**
 * Persistent watchlist match alert: once a match is found, it stays active
 * -- visually and audibly -- until a human explicitly dismisses it.
 */
export function useMatchAlert(matched, person, similarity) {
  const [activeAlert, setActiveAlert] = useState(null); // { person, similarity } | null
  const dismissedIdRef = useRef(null);
  const soundIntervalRef = useRef(null);

  useEffect(() => {
    if (matched && person?.id) {
      const isNewPerson = !activeAlert || activeAlert.person.id !== person.id;
      const wasDismissedForThisPerson = dismissedIdRef.current === person.id;

      if (isNewPerson && !wasDismissedForThisPerson) {
        setActiveAlert({ person, similarity });
      } else if (!isNewPerson) {
        // Same person still in frame -- keep the displayed similarity current.
        setActiveAlert((prev) => (prev ? { ...prev, similarity } : prev));
      }
    } else {
      // Person left frame -- clear memory so future appearances alert again.
      dismissedIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, person, similarity]);

  // Looping sound while an alert is active.
  useEffect(() => {
    if (!activeAlert) return;

    playAlertTone();
    soundIntervalRef.current = setInterval(playAlertTone, REPEAT_INTERVAL_MS);
    return () => clearInterval(soundIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAlert?.person?.id]);

  const dismiss = useCallback(() => {
    if (activeAlert?.person?.id) {
      dismissedIdRef.current = activeAlert.person.id;
    }
    clearInterval(soundIntervalRef.current);
    setActiveAlert(null);
  }, [activeAlert]);

  return { activeAlert, dismiss };
}

/**
 * High-volume multi-frequency emergency siren burst.
 * Uses dual oscillators at maximum output volume for immediate attention.
 */
export function playAlertTone() {
  try {
    const LegacyAudioContext = (
      window as typeof window & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext;
    const ctx = new (window.AudioContext || LegacyAudioContext!)();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Web Audio gain is at maximum. The final loudness still follows the
    // operator's device/browser volume and cannot override system settings.
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1, now);
    masterGain.gain.setValueAtTime(1, now + 0.58);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    masterGain.connect(ctx.destination);

    // Primary High Siren Tone (1174.66 Hz - D6)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(1174.66, now);
    osc1.frequency.exponentialRampToValueAtTime(1567.98, now + 0.2); // Sweep up to G6
    osc1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.72);

    // Secondary Harmony Tone for piercing dissonance (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.2);
    osc2.connect(masterGain);
    osc2.start(now);
    osc2.stop(now + 0.72);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(659.25, now);
    osc3.frequency.exponentialRampToValueAtTime(987.77, now + 0.3);
    osc3.connect(masterGain);
    osc3.start(now);
    osc3.stop(now + 0.72);
    window.setTimeout(() => void ctx.close(), 850);
  } catch {
    // Audio unavailable -- fail silently rather than breaking recognition.
  }
}
