'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import SpecularButton from './SpecularButton';

type TurnstileOptions = {
  sitekey: string;
  theme: 'dark' | 'light' | 'auto';
  size: 'normal' | 'compact' | 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  || (process.env.NODE_ENV === 'production' ? '' : TURNSTILE_TEST_SITE_KEY);

type FormState = 'idle' | 'sending' | 'success' | 'error';
type CaptchaState = 'loading' | 'ready' | 'error';

export default function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderCaptchaRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<FormState>('idle');
  const [captchaState, setCaptchaState] = useState<CaptchaState>('loading');
  const [captchaToken, setCaptchaToken] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    setState('idle');
    setCaptchaState('loading');
    setCaptchaToken('');
    setFormError('');
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    const renderCaptcha = () => {
      if (widgetIdRef.current || !captchaRef.current) return;
      if (!TURNSTILE_SITE_KEY) {
        setCaptchaState('error');
        setFormError('The security check is not configured for this deployment.');
        return;
      }
      if (!window.turnstile) return;

      try {
        widgetIdRef.current = window.turnstile.render(captchaRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          size: 'normal',
          callback: (token) => {
            setCaptchaToken(token);
            setCaptchaState('ready');
            setFormError('');
          },
          'expired-callback': () => {
            setCaptchaToken('');
            setCaptchaState('loading');
            setFormError('The security check expired. Please complete it again.');
          },
          'error-callback': () => {
            setCaptchaToken('');
            setCaptchaState('error');
            setFormError('The security check could not load. Check your connection and try again.');
          },
        });
      } catch {
        setCaptchaState('error');
        setFormError('The security check could not load. Check your connection and try again.');
      }
    };

    renderCaptchaRef.current = renderCaptcha;
    if (window.turnstile) renderCaptcha();

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>('input:not(.honeypot)')?.focus();
    }, 30);

    return () => {
      window.clearTimeout(focusTimer);
      renderCaptchaRef.current = null;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove?.(widgetIdRef.current);
      }
      widgetIdRef.current = null;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaState('loading');
    setFormError('');
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    } else {
      renderCaptchaRef.current?.();
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!captchaToken) {
      setState('error');
      setFormError(
        captchaState === 'loading'
          ? 'Complete the security check before submitting.'
          : 'The security check is unavailable. Use Try again or reload the page.',
      );
      return;
    }

    setState('sending');
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    payload['cf-turnstile-response'] = captchaToken;

    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        if (response.status === 400 && result?.error === 'Invalid security check') {
          resetCaptcha();
          setFormError('The security check was not accepted. Please complete it again.');
        } else if (response.status === 429) {
          setFormError('Too many attempts. Please wait a minute and try again.');
        } else if (response.status === 503) {
          setFormError('Applications are temporarily unavailable. Please try again later.');
        } else if (response.status === 400) {
          setFormError('Please check the form fields and try again.');
        } else {
          setFormError('Unable to send right now. Please try again.');
        }
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setState('error');
      setFormError('Unable to reach the application service. Check your connection and try again.');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        async
        defer
        onLoad={() => renderCaptchaRef.current?.()}
        onError={() => {
          setCaptchaState('error');
          setFormError('The security check could not load. Check your connection and try again.');
        }}
      />
      <div className="apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-title" ref={dialogRef}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close application form">×</button>
        {state === 'success' ? (
          <div className="modal-success">
            <span className="eyebrow">EARLY ADOPTER PROGRAM</span>
            <h2 id="apply-title">Application received.</h2>
            <p>Thank you. We’ll be in touch.</p>
          </div>
        ) : (
          <>
            <span className="eyebrow">EARLY ADOPTER PROGRAM</span>
            <h2 id="apply-title">Better Decisions. Fewer Costly Errors.</h2>
            <p className="modal-intro">Foundation Partners gain an early voice in defining how Computational Geological Reasoning™ is applied to real exploration decisions.</p>
            <form onSubmit={submit} className="apply-form">
              <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true" />
              <label>Name<input name="name" required maxLength={120} /></label>
              <label>Company<input name="company" required maxLength={160} /></label>
              <label>Email<input name="email" type="email" required maxLength={180} /></label>
              <label>Message<textarea name="message" rows={5} maxLength={3000} /></label>
              <div className="captcha-field" aria-label="Security check">
                <div ref={captchaRef} className="cf-turnstile" />
                <p className={`captcha-status captcha-status--${captchaState}`} role="status" aria-live="polite">
                  {captchaState === 'loading' && 'Complete the security check to submit.'}
                  {captchaState === 'ready' && 'Security check complete.'}
                  {captchaState === 'error' && 'Security check unavailable.'}
                </p>
                {captchaState === 'error' && <button type="button" className="captcha-retry" onClick={resetCaptcha}>Try again</button>}
              </div>
              <SpecularButton type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Submit Application'} <span aria-hidden="true">↗</span></SpecularButton>
              {formError && <p className="form-error" role="alert">{formError}</p>}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
