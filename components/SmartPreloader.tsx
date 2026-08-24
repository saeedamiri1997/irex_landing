'use client';

import { useEffect, useState } from 'react';

const START_DELAY_MS = 180;
const REVEAL_MS = 1500;
const EXIT_MS = 720;

export default function SmartPreloader() {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let frame = 0;
    let exitTimer = 0;
    let doneTimer = 0;
    const startedAt = performance.now() + START_DELAY_MS;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const raw = Math.max(0, Math.min(1, (now - startedAt) / REVEAL_MS));
      setProgress(Math.round(ease(raw) * 100));

      if (raw < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }

      setProgress(100);
      exitTimer = window.setTimeout(() => {
        setExiting(true);
        doneTimer = window.setTimeout(() => {
          document.body.style.overflow = originalOverflow;
          setDone(true);
        }, EXIT_MS);
      }, 120);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (done) return null;

  return (
    <div className={`smart-preloader${exiting ? ' smart-preloader--exit' : ''}`} aria-hidden="true">
      <div className="smart-preloader__counter">{progress}%</div>
      <div className="smart-preloader__fill" style={{ transform: `scaleY(${progress / 100})` }} />
    </div>
  );
}
