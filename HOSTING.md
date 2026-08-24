# IREX Hosting Guide

IREX is a Next.js App Router application with one Node.js server route for Early Adopter applications. Deploy it on a host that can run a Next.js/Node server and serve the checked-in `public` directory.

The exact production provider and domain are not defined in this repository. The instructions below apply to a conventional Node host; Vercel or another Next-compatible host can manage the build and static assets using the same environment variables.

## Runtime and build

- Node.js 20 or newer
- npm
- HTTPS in production (required for normal Turnstile operation)
- The repository's `public/brand` and `public/media` assets included in the deployment

Install and build from the repository root:

```bash
npm ci
npm run build
```

This project sets `output: 'standalone'`. On a conventional Node host, copy the public and static build assets beside the standalone server and run that server:

```bash
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static
PORT=3000 node .next/standalone/server.js
```

Set `PORT` to the port supplied by the host. `npm run start` also serves a built app for local checks, but Next reports that `next start` is not the preferred command when `output: 'standalone'` is enabled; use the standalone server command above for a standalone deployment.

## Required production environment

Configure these values in the host's secret/environment settings before starting the server:

| Variable | Required | Purpose |
|---|---:|---|
| `EMAIL_DELIVERY_MODE=resend` | Yes | Selects real Resend delivery. Any value other than `log` uses Resend mode. |
| `RESEND_API_KEY` | Yes | Server-only Resend API credential. |
| `APPLICATION_EMAIL` | Yes | Recipient address for Early Adopter applications. |
| `RESEND_FROM_EMAIL` | Yes | Verified Resend sender, for example `IREX Applications <applications@example.com>`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Public Cloudflare Turnstile site key used by the browser. |
| `TURNSTILE_SECRET_KEY` | Yes | Server-only Cloudflare Turnstile verification secret. |

`RESEND_API_KEY`, `APPLICATION_EMAIL`, and `RESEND_FROM_EMAIL` have no production fallbacks in the email sender. Hosting must provide them. The sender domain must be verified in Resend, and the Turnstile site-key hostname configuration must include the real application domain.

For local/dry-run work only, set `EMAIL_DELIVERY_MODE=log`. In that mode the API logs the email payload and returns `{ "ok": true, "mode": "log", "id": "dry-run" }`; it does not require Resend recipient/sender settings. Cloudflare's documented test keys may be used locally. Never use test keys or log mode as the production configuration.

## Health check

After deployment, request:

```text
GET https://your-domain.example/api/apply
```

A correctly configured production response includes:

```json
{
  "mode": "resend",
  "configured": true,
  "toConfigured": true,
  "fromConfigured": true,
  "missing": [],
  "turnstileConfigured": true
}
```

This endpoint reports configuration presence, not delivery-provider reachability. It does not expose secret values. A missing production variable should be fixed in the host configuration, followed by a restart/redeploy.

## Submission checks

Use a real browser on the configured HTTPS domain to complete Turnstile and submit a test application. Confirm the success state in the modal and receipt at `APPLICATION_EMAIL`. Do not mark delivery as production-verified from a local log-mode test or from a request with a mocked Turnstile response.

The repository cannot verify a live domain, production Turnstile hostname registration, Resend sender verification, or mailbox delivery without access to those hosting/provider credentials. Those checks remain an operator/deployment responsibility.

## Operational behavior

- `POST /api/apply` accepts JSON and validates required name/company, email format, and field lengths.
- `message` is optional and limited to 3,000 characters; name, company, and email are limited to 120, 160, and 180 characters.
- The hidden `website` honeypot returns a fake `{ "ok": true }` response for non-empty values without sending mail.
- A process-local per-IP limiter allows five POST attempts per 60-second window; the sixth returns HTTP 429. It uses the first value in `x-forwarded-for` when available, so the deployment proxy must set that header correctly.
- Turnstile is verified server-side at Cloudflare's siteverify endpoint before field validation and delivery.
- Missing Resend configuration returns HTTP 503. Upstream Resend failures return HTTP 502. Invalid fields/security tokens return HTTP 400.
- The limiter is in-memory and per process/instance. A multi-instance deployment needs an external shared limiter if stronger global enforcement is required.

## Media and caching

The hero WebM and other static assets live in `public/media`; logos live in `public/brand`. The Next config applies `public, max-age=31536000, immutable` to `/media/*`, so replace/version media filenames when content changes. The hero currently selects the mobile WebM at viewport widths up to 600px and the desktop WebM otherwise.
