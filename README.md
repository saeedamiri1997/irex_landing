# IREX Landing Page

Next.js 15 / React 19 landing page for IREX Pty Ltd.

## Stack
- Next.js 15.5.x + App Router
- React 19
- TypeScript
- GSAP + ScrollTrigger
- OGL / WebGL
- Three.js
- Turbopack (dev)
- ESLint

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Application form
The `/api/apply` route sends Early Adopter applications through Resend.
Configure:
- `RESEND_API_KEY`
- `APPLICATION_EMAIL=irex.pty.ltd@gmail.com`
- `RESEND_FROM_EMAIL` (use a verified Resend sender for production)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Media
The scroll-scrub narrative video is served as WebM from `public/media`. Static frames remain available for previews and reduced-motion fallbacks.

## Footer
LinkedIn: https://www.linkedin.com/company/irex-pty-ltd/
