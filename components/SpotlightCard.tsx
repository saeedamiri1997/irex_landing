'use client';

import { useRef } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(0,184,196,.18)' }: { children: React.ReactNode; className?: string; spotlightColor?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`spotlight-card ${className}`}
      onMouseMove={(e) => {
        const el = ref.current; if (!el) return; const r = el.getBoundingClientRect();
        el.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
        el.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
        el.style.setProperty('--spotlight-color', spotlightColor);
      }}
    >{children}</div>
  );
}
