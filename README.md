# IREX Landing Page

A Next.js landing page for IREX Pty Ltd and Computational Geological Reasoning™ (CGR™). The page presents the reasoning-first exploration message, a scroll-scrubbed hero narrative, product/value sections, and an Early Adopter application form.

This is a marketing site. It has no login, database, CMS, or persistent application store. The only server-side feature is the `/api/apply` route, which verifies Cloudflare Turnstile and delivers applications through Resend (or logs them locally in dry-run mode).

## Stack

- Next.js 15.5.22 / App Router
- React 19.1.1 and TypeScript
- GSAP 3.15.0 + ScrollTrigger
- OGL 1.0.11 and Three.js 0.179.1 for WebGL effects
- npm lockfile v3
- Node.js 20 or newer for hosting

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The development server runs on port 3000 by default. Use `PORT=3001 npm run dev` when another local service already uses that port.

The checked-in `.env.example` uses Cloudflare's public Turnstile test keys and `EMAIL_DELIVERY_MODE=log`. The log mode does not call Resend; it writes the rendered application to the server console and returns a dry-run success. Do not use the test keys or log mode for production.

## Application form configuration

Production requires all of the following:

```env
EMAIL_DELIVERY_MODE=resend
RESEND_API_KEY=...
APPLICATION_EMAIL=...
RESEND_FROM_EMAIL=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
```

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` before `npm run build` as well as in the deployed environment: Next inlines `NEXT_PUBLIC_*` values into the browser bundle at build time. `RESEND_FROM_EMAIL` must be a sender/domain verified in Resend. `APPLICATION_EMAIL` is the recipient for applications. These values are intentionally not fabricated by the server; the hosting environment must provide them. See [HOSTING.md](./HOSTING.md) for deployment and health-check details.

The form explicitly renders Turnstile and does not submit until a token exists. Load, error, expired-token, server rejection, network, rate-limit, and missing-email-configuration states are surfaced in the modal.

## Media

The hero uses the checked-in WebM files in `public/media`:

- `irex-scroll-narrative.webm` — desktop source, approximately 25.01 seconds and 12.97 MB.
- `irex-scroll-narrative-mobile.webm` — mobile source, approximately 25.01 seconds and 10.54 MB.

`ScrollVideoScene` selects the mobile file with `<source media="(max-width: 600px)">`; the second source is the desktop fallback. The older four MP4 files and five PNG frames remain in `public/media` as static assets, but they are not used by the current hero component. The page does not request `/media/irex-scroll-narrative.mp4`.

## Commands

```bash
npm run dev     # Next dev with Turbopack
npm run build   # production build and type/lint checks
npm run start   # serve the built app through Next
npm run lint    # ESLint
```

The repository's Next config enables `output: 'standalone'`. For a standalone Node deployment, follow the copy/run instructions in [HOSTING.md](./HOSTING.md).

## Footer

The footer links to [IREX on LinkedIn](https://www.linkedin.com/company/irex-pty-ltd/).
