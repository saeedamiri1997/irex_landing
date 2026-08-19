import { NextResponse } from 'next/server';
import { getEmailHealth, sendApplicationEmail } from '@/lib/email';

const attempts = new Map<string, { count: number; resetAt: number }>();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(getEmailHealth());
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now(); const current = attempts.get(ip);
  if (!current || current.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 60_000 });
  else { current.count += 1; if (current.count > 5) return NextResponse.json({ error: 'Too many requests' }, { status: 429 }); }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (String(body.website || '').trim()) return NextResponse.json({ ok: true });

  const name = String(body.name || '').trim(); const company = String(body.company || '').trim(); const email = String(body.email || '').trim(); const message = String(body.message || '').trim();
  if (!name || !company || !EMAIL_RE.test(email) || name.length > 120 || company.length > 160 || email.length > 180 || message.length > 3000) return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });

  const result = await sendApplicationEmail({
    name,
    company,
    email,
    message,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'Email delivery failed' }, { status: result.error === 'Email service is not configured' ? 503 : 502 });
  return NextResponse.json({ ok: true, id: result.id, mode: result.mode });
}
