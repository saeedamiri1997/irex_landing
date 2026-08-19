'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import SpecularButton from './SpecularButton';

export default function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle'|'sending'|'success'|'error'>('idle');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus(), 30);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState('sending');
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch('/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Request failed'); setState('success');
    } catch { setState('error'); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title" ref={dialogRef}>
        <button className="modal-close" onClick={onClose} aria-label="Close application form">×</button>
        {state === 'success' ? <div className="modal-success"><span className="eyebrow">EARLY ADOPTER PROGRAM</span><h2 id="apply-title">Application received.</h2><p>Thank you. We’ll be in touch.</p></div> : <>
          <span className="eyebrow">EARLY ADOPTER PROGRAM</span><h2 id="apply-title">Apply to IREX</h2><p className="modal-intro">Tell us about your organisation and exploration needs.</p>
          <form onSubmit={submit} className="apply-form">
            <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true" />
            <label>Name<input name="name" required maxLength={120} /></label>
            <label>Company<input name="company" required maxLength={160} /></label>
            <label>Email<input name="email" type="email" required maxLength={180} /></label>
            <label>Message<textarea name="message" rows={5} maxLength={3000} /></label>
            <SpecularButton type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Submit Application'} <span aria-hidden="true">↗</span></SpecularButton>
            {state === 'error' && <p className="form-error">Unable to send right now. Please try again.</p>}
          </form>
        </>}
      </div>
    </div>
  );
}
