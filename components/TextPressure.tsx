'use client';

import { useEffect, useRef } from 'react';

export default function TextPressure({ text, color }: { text: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const spans = Array.from(root.querySelectorAll<HTMLElement>('span'));
    let x = -10000, y = -10000, raf = 0;
    const onMove = (e: PointerEvent) => { x = e.clientX; y = e.clientY; };
    const tick = () => {
      const rr = root.getBoundingClientRect(); const max = Math.max(rr.width * .5, 1);
      spans.forEach((span) => {
        const r = span.getBoundingClientRect(); const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        const p = Math.max(0, 1 - d / max);
        span.style.transform = `scaleX(${1 + p * .32}) translateY(${p * -2}px)`;
        span.style.fontWeight = String(Math.round(400 + p * 300));
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true }); raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="text-pressure" style={{ color }} aria-label={text}>{text.split('').map((c, i) => <span key={i} aria-hidden="true">{c === ' ' ? '\u00A0' : c}</span>)}</div>;
}
