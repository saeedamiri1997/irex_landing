type ApplicationEmail = {
  name: string;
  company: string;
  email: string;
  message: string;
};

type EmailResult = {
  ok: boolean;
  id?: string;
  mode: 'resend' | 'log';
  error?: string;
};

const DEFAULT_TO = 'irex.pty.ltd@gmail.com';
const DEFAULT_FROM = 'IREX Applications <onboarding@resend.dev>';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getEmailConfig() {
  const mode = process.env.EMAIL_DELIVERY_MODE === 'log' ? 'log' : 'resend';
  return {
    mode,
    apiKey: process.env.RESEND_API_KEY,
    to: process.env.APPLICATION_EMAIL || DEFAULT_TO,
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
  };
}

export function getEmailHealth() {
  const config = getEmailConfig();
  return {
    mode: config.mode,
    configured: config.mode === 'log' || Boolean(config.apiKey),
    toConfigured: Boolean(process.env.APPLICATION_EMAIL),
    fromConfigured: Boolean(process.env.RESEND_FROM_EMAIL),
    missing: [
      config.mode === 'resend' && !config.apiKey ? 'RESEND_API_KEY' : '',
      !process.env.APPLICATION_EMAIL ? 'APPLICATION_EMAIL' : '',
      !process.env.RESEND_FROM_EMAIL ? 'RESEND_FROM_EMAIL' : '',
    ].filter(Boolean),
  };
}

export async function sendApplicationEmail(application: ApplicationEmail): Promise<EmailResult> {
  const config = getEmailConfig();
  const subject = `IREX Early Adopter - ${application.company}`;
  const text = [
    `Name: ${application.name}`,
    `Company: ${application.company}`,
    `Email: ${application.email}`,
    '',
    'Message:',
    application.message || '-',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <h1 style="font-size:20px;margin:0 0 16px">IREX Early Adopter Application</h1>
      <p><strong>Name:</strong> ${escapeHtml(application.name)}</p>
      <p><strong>Company:</strong> ${escapeHtml(application.company)}</p>
      <p><strong>Email:</strong> ${escapeHtml(application.email)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap">${escapeHtml(application.message || '-')}</p>
    </div>
  `;

  if (config.mode === 'log') {
    console.info('IREX application email dry run', {
      to: config.to,
      from: config.from,
      replyTo: application.email,
      subject,
      text,
    });
    return { ok: true, mode: 'log', id: 'dry-run' };
  }

  if (!config.apiKey) {
    return { ok: false, mode: 'resend', error: 'Email service is not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      reply_to: application.email,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (!response.ok) {
    return {
      ok: false,
      mode: 'resend',
      error: data?.message || 'Email delivery failed',
    };
  }

  return { ok: true, mode: 'resend', id: data?.id };
}
