'use client';

import { useEffect, useState } from 'react';
import { sections } from '@/lib/content';

export default function LineSidebar() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return; const idx = sections.findIndex((s) => s.id === visible.target.id); if (idx >= 0) setActive(idx);
    }, { threshold: [.2,.45,.7] });
    nodes.forEach((n) => observer.observe(n)); return () => observer.disconnect();
  }, []);
  return (
    <nav className="line-sidebar" aria-label="Page sections">
      {sections.map((section, i) => (
        <button key={section.id} className={i === active ? 'active' : ''} onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })} aria-label={`Go to ${section.label}`}>
          <span className="line-sidebar__label">{section.label}</span><span className="line-sidebar__tick" />
        </button>
      ))}
    </nav>
  );
}
