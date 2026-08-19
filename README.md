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
- `APPLICATION_EMAIL=alipourmohammadi90@gmail.com`
- `RESEND_FROM_EMAIL` (use a verified Resend sender for production)

## Media
The four scroll-scrub videos are H.264 MP4 files optimized with frequent keyframes and `faststart`. Each scene also has a static start/end frame for loading and reduced-motion fallbacks.

## Footer
LinkedIn: https://www.linkedin.com/company/irex-pty-ltd/
