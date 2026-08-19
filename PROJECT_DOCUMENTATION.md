# IREX Landing Page — Project Documentation

> **Purpose of this document:** This file is written for another AI assistant (e.g. Claude) to fully understand this Next.js project without re-reviewing the codebase. It is intended to be precise, unambiguous, and self-contained. Where something could not be determined with confidence, it is explicitly marked **"Unclear — needs manual review"**.

- **Repository root:** `/home/user/irex_landing`
- **Generated on:** 2026-08-19
- **Analysis source:** A full review of every tracked file in the repository.

---

## 1. Project Overview

### 1.1 Purpose

This is a **single-page marketing / landing site** for **IREX Pty Ltd** — a mining-exploration-technology company that markets "Computational Geological Reasoning™ (CGR™)". The page explains IREX's product philosophy (decision-making under geological uncertainty, replacing "pattern matching" with "reasoning"), presents feature/value sections, and collects **Early Adopter Program** applications through a modal form wired to an email API.

It is **not** a real product — there is no login, no database, and no persistent data store. The only server-side behaviour is a single email-delivery API route.

### 1.2 Technologies and versions (exact, from `package.json` / `package-lock.json`)

| Technology | Version | Role |
|---|---|---|
| **Next.js** | **`15.5.22`** (App Router) | React framework / server |
| **React** | **`19.1.1`** | UI library |
| **react-dom** | **`19.1.1`** | DOM renderer |
| **TypeScript** | **`^5.8.3`** (strict) | Language / types |
| **package manager** | **npm** (`package-lock.json`, lockfileVersion **3**) | Dependency manager |
| **GSAP** | **`3.15.0`** | Scroll-triggered animation / video scrubbing |
| **Three.js** | **`0.179.1`** | WebGL (positioning-card border effect) |
| **OGL** | **`1.0.11`** | Lightweight WebGL (topography + specular button FX) |
| ESLint | `^9.24.0` + `eslint-config-next` `15.5.22` | Linting |
| Node (host requirement) | 20+ (per `HOSTING.md`) | Runtime |

**Language:** The project is entirely **TypeScript** (`allowJs: false` in `tsconfig.json`). There is no standalone JavaScript source.

### 1.3 Routing structure

Uses the **Next.js App Router** (`app/` directory). There is **no `pages/` directory**.

- `/` → `app/page.tsx` (renders `LandingPage`)
- `/api/apply` → `app/api/apply/route.ts` (API route: `GET` health check, `POST` submit application)

All non-route files are `'use client'` components. The only React Server Components are `app/layout.tsx` and `app/page.tsx`.

---

## 2. Folder and File Structure

Full tree (all tracked files; `node_modules`, `.git`, `.next`, build output excluded):

```
irex_landing/
├── .env.example              # Environment variable template (no secrets)
├── .gitignore                # Ignores node_modules, .next, .env*, logs, .vercel
├── .vercelignore             # Deploy ignore list (.next, node_modules, *.log)
├── HOSTING.md                # Self-hosting / deployment guide
├── README.md                 # Project readme (stack, setup, media, footer)
├── PROJECT_DOCUMENTATION.md  # THIS FILE
│
├── app/                      # App Router root
│   ├── layout.tsx            # Root layout: <html>/<body>, metadata, fonts via CSS
│   ├── page.tsx              # Home page → renders <LandingPage />
│   ├── globals.css           # ALL styling for the site (single global stylesheet)
│   └── api/
│       └── apply/
│           └── route.ts      # Email-delivery API (GET health / POST submit)
│
├── components/               # All UI + WebGL components (all 'use client')
│   ├── LandingPage.tsx       # Main page composition (all sections)
│   ├── Header.tsx            # Fixed top header (floating on scroll)
│   ├── LineSidebar.tsx       # Right-edge section dot navigation
│   ├── ScrollVideoScene.tsx  # HERO: scroll-scrubbed video + scene panels  ★ video
│   ├── ApplyModal.tsx        # Early-Adopter application modal form
│   ├── SpotlightCard.tsx     # Card with mouse-tracking spotlight
│   ├── SpecularButton.tsx    # OGL shader animated button
│   ├── ShapeBlur.tsx         # Three.js rounded-rect border effect
│   ├── Topography.tsx        # OGL animated topography background
│   └── TextPressure.tsx      # Unused hover-reactive text component (dead code)
│
├── lib/
│   ├── content.ts            # Content data: sections list, narrative video URL, video scenes
│   └── email.ts              # Email config + Resend/log sending logic
│
├── next.config.ts            # Next.js config
├── tsconfig.json             # TypeScript config
├── eslint.config.mjs         # Flat ESLint config
├── next-env.d.ts             # Auto-generated Next types (do not edit)
├── package.json              # Scripts + dependencies
└── package-lock.json         # npm lockfile
```

**Where things live:**

| Concern | Location |
|---|---|
| Components | `components/` |
| Page + API routes | `app/` |
| All styling | `app/globals.css` (single file — no CSS Modules, no Tailwind) |
| Content/data | `lib/content.ts` |
| Server email logic | `lib/email.ts` |
| Config | `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` |
| Assets / media | **None committed.** Referenced at URL paths `/media/*` and `/brand/*` but **no `public/` directory exists** (see §4). |

---

## 3. Components

### 3.1 Component inventory and responsibilities

| # | Component | File | Responsibility |
|---|---|---|---|
| 1 | `LandingPage` | `components/LandingPage.tsx` | **Page root** (`'use client'`). Owns the modal open/close state and composes every section of the page. |
| 2 | `Header` | `components/Header.tsx` | Fixed top bar with brand logo + "REASONING FIRST" tagline. Uses GSAP ScrollTrigger to add the `is-floating` class (pill-shaped floating header) after scrolling 80px. |
| 3 | `LineSidebar` | `components/LineSidebar.tsx` | Right-edge vertical dot navigation. Uses `IntersectionObserver` to highlight the active section and smooth-scrolls on click. Rendered list comes from `sections` in `lib/content.ts`. Hidden ≤900px. |
| 4 | `ScrollVideoScene` | `components/ScrollVideoScene.tsx` | **Hero video scene.** ★ See §4. Pins a full-viewport section while scroll-scrubbing a single MP4, and swaps between 4 text panels (`videoScenes`) as progress crosses each scene's time range. |
| 5 | `SpotlightCard` | `components/SpotlightCard.tsx` | Wrapper card that tracks the mouse and sets CSS custom properties (`--mouse-x/y`, `--spotlight-color`) so a spotlight can be drawn in CSS. |
| 6 | `SpecularButton` | `components/SpecularButton.tsx` | Reusable button whose surface is an OGL WebGL canvas (specular shine that follows the pointer). Used for all CTAs and the modal submit. |
| 7 | `ShapeBlur` | `components/ShapeBlur.tsx` | Three.js WebGL effect: an animated rounded-rectangle border that brightens near the cursor. Used inside the Positioning card. |
| 8 | `Topography` | `components/Topography.tsx` | OGL WebGL "topography"/contour-line background with morphing, grain, and mouse interaction. Used behind the CTA section. **Includes its own `IntersectionObserver` + `visibilitychange` pause/resume of the render loop.** |
| 9 | `TextPressure` | `components/TextPressure.tsx` | Hover-reactive text effect (characters scale/weight-shift toward cursor). **Unused / dead code — not imported anywhere.** |
| 10 | `ApplyModal` | `components/ApplyModal.tsx` | Early-Adopter application modal. Contains the form, ESC/backdrop close, focus management, and posts JSON to `/api/apply`. |

### 3.2 Order in which they render on the page

`LandingPage` renders, top-to-bottom:

1. `<Header />`
2. `<LineSidebar />`
3. `<ScrollVideoScene onApply={openApply} />` — hero (pinned scroll-scrub video)
4. `<section id="prediction">` — "From Prediction To Reasoning"
5. `<section id="cgr-definition">` — CGR™ definition
6. `<section className="reasoning-section">` — "Generate. Test. Reject."
7. `<section id="principle">` (manifesto) — "Every Deposit Is Individual"
8. `<section id="transparency">` — "Designed for Auditability" (2-col SpotlightCards)
9. `<section id="control">` — "Built for Control" (3-col SpotlightCards)
10. `<section id="value">` — "Reduce Risk Before It Becomes Capital"
11. `<section id="positioning">` — Positioning card with `ShapeBlur`
12. `<section id="apply">` (CTA) — "Early Adopter Program" with `Topography` background + `SpecularButton`
13. `<footer className="site-footer">` — logo, tagline, LinkedIn link
14. `<ApplyModal open={applyOpen} onClose={closeApply} />`

Section IDs referenced by the sidebar (`lib/content.ts` → `sections`): `hero`, `prediction`, `cgr-definition`, `principle`, `transparency`, `control`, `value`, `positioning`, `apply`.

> **Note on `#hero`:** the `hero` section id lives on the `<ScrollVideoScene>` root (`<section id="hero" ...>`).

---

## 4. Video Details ★ (most important section)

### 4.1 Which component(s) render video content

**Only one component renders a `<video>` element: `components/ScrollVideoScene.tsx`** (the hero). No other component in the codebase renders video.

### 4.2 Video file path / filename referenced in code

Defined in `lib/content.ts`:

```ts
export const narrativeVideo = '/media/irex-scroll-narrative.mp4';
```

Used in `components/ScrollVideoScene.tsx`:

```tsx
<video
  ref={videoRef}
  src={narrativeVideo}   // === '/media/irex-scroll-narrative.mp4'
  muted
  playsInline
  preload="auto"
  onLoadedMetadata={() => setReady(true)}
  onLoadedData={() => setReady(true)}
  onCanPlayThrough={() => setReady(true)}
  className={ready ? 'is-ready' : ''}
/>
```

The absolute video URL path is **`/media/irex-scroll-narrative.mp4`**.

### 4.3 Are the video files committed to git? Where are they served from?

**The video file is NOT committed to the git repository.**

- `git ls-files` shows **no `public/` directory at all** and **no media/video/brand asset files** are tracked.
- There is **no `public/` folder and no `media/` folder** anywhere in the working tree.
- The video is referenced by the root-relative URL `/media/irex-scroll-narrative.mp4`.

This means the video (and the `/brand/*` logo images, and the `/media/frame-05-layers.png` OG image — see §4.6) must be **served from somewhere outside the repo**: an external CDN / object storage / reverse-proxy static file server that maps the `/media/*` (and `/brand/*`) URL namespace to the files.

Evidence that this is expected at runtime:
- `next.config.ts` defines a `Cache-Control` header specifically for the `/media/:path*` route (`public, max-age=31536000, immutable`) — i.e. the site expects long-lived CDN-cacheable media under `/media/`.
- `app/layout.tsx` sets the OpenGraph image to `/media/frame-05-layers.png`.
- The README describes the media as optimized MP4s.

**Exact serving location is Unclear — needs manual review.** It is not derivable from the committed code alone. The deployment (per `HOSTING.md`) is a plain Node/Next host (or Vercel — see §8), so the `/media/*` and `/brand/*` assets are either (a) expected to be dropped into a `public/` folder at deploy time, or (b) served by an external CDN/static host configured out-of-band. Neither the exact URL origin nor how `/media/*` is mapped is present in the repo.

### 4.4 Lazy-loading approach for the video

There is **no true lazy-loading library or mechanism** applied to the video. Specifically:

- ❌ No `next/dynamic`
- ❌ No `loading="lazy"` attribute on the `<video>` element
- ❌ No `IntersectionObserver` on the video (the only `IntersectionObserver`s in the codebase are in `LineSidebar.tsx` and `Topography.tsx` — neither concerns the video)
- ❌ No third-party lazy-load package (e.g. no `lazysizes`, no `react-lazyload`)

What actually exists is a **"readiness-gated" scroll-scrub**, not lazy loading. The exact mechanisms, quoted from `components/ScrollVideoScene.tsx`:

1. **Eager preload + opacity fade-in gated on readiness** (the video is in the hero, i.e. above the fold, so it is requested eagerly):

```tsx
const [ready, setReady] = useState(false);
...
<video
  ref={videoRef}
  src={narrativeVideo}
  muted
  playsInline
  preload="auto"
  onLoadedMetadata={() => setReady(true)}
  onLoadedData={() => setReady(true)}
  onCanPlayThrough={() => setReady(true)}
  className={ready ? 'is-ready' : ''}
/>
```

The `<video>` starts with `opacity: 0` (CSS `.scene-media video { opacity: 0; transition: opacity .35s ease; }`) and only fades in once a `ready` state is reached (any of loadedmetadata/loadeddata/canplaythrough), via `.scene-media video.is-ready { opacity: 1; }`.

2. **Scroll-scrub `requestAnimationFrame` loop that only seeks once the video is playable:**

```ts
const scrubToScroll = () => {
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : NARRATIVE_DURATION;
  const targetTime = gsap.utils.clamp(0, duration, targetProgress * duration);

  if (readyRef.current && video.readyState >= 2 && Math.abs(targetTime - video.currentTime) > 0.018) {
    video.currentTime = targetTime;
  }

  raf = requestAnimationFrame(scrubToScroll);
};
```

3. **GSAP `ScrollTrigger` that pins the section and drives `targetProgress`:**

```ts
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: '+=520%',
  pin: true,
  scrub: 0.72,
  anticipatePin: 1,
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    targetProgress = self.progress;
    // ... computes active scene index and calls setActiveIndex(...)
  },
});
```

4. **Reduced-motion fallback** in `app/globals.css` hides the video entirely for users with reduced-motion preference:

```css
@media (prefers-reduced-motion: reduce) {
  .scene-media video {
    display: none;
  }
}
```

> **Conclusion for the next developer:** there is no lazy-loading implementation for the video today. The video is loaded eagerly (`preload="auto"`) on page load and simply not shown until ready. This matches the stated goal that "the current lazy loading implementation exists but needs improvement/changes" in the sense that the existing mechanism is a readiness fade-in rather than a true deferral; if deferred loading is desired, it must be added (e.g. native `loading="lazy"`, an `IntersectionObserver` that sets `preload`/`src` only when the section approaches the viewport, or `next/dynamic`).

### 4.5 Video file format and size

**Format:** The README states the scroll-scrub video is an **H.264 MP4** optimized with **frequent keyframes** and the **`faststart`** flag (moov atom moved to the front so it can begin playing before full download). The codebase references one file, `/media/irex-scroll-narrative.mp4`.

**Size / exact bitrate / exact dimensions:** **Unclear — needs manual review.** The actual file is not in the repo, so its byte size, resolution, and bitrate cannot be determined from the code.

**Duration:** The scrub is driven by a hard-coded `NARRATIVE_DURATION = 25` (seconds) in `ScrollVideoScene.tsx`:

```ts
const NARRATIVE_DURATION = 25;
```

The four `videoScenes` map onto this 25 s timeline with these start/end seconds (`lib/content.ts`):

| Scene id | Start (s) | End (s) |
|---|---|---|
| `cgr` (hero) | 0 | 4 |
| `first-principles` | 4 | 11.92 |
| `problem` | 11.92 | 19.58 |
| `limitations` | 19.58 | 25 |

**Discrepancy to note:** The README says *"The four scroll-scrub videos are H.264 MP4 files"* (plural). The code, however, references **one single video file** (`/media/irex-scroll-narrative.mp4`) that is scrubbed across all four scenes. Either (a) the README is loosely worded and there is really one 25 s narrative MP4, or (b) there were originally four separate files and the implementation was consolidated to one. As the committed code stands, **only one video URL is referenced.** This wording discrepancy is marked here for manual review.

### 4.6 Poster image / fallback / autoplay / muted settings

- **`poster` attribute:** **None.** The `<video>` element does **not** set a `poster` attribute. (There is a `frame-05-layers.png` referenced as the OpenGraph image in `app/layout.tsx` at `/media/frame-05-layers.png` — i.e. a frame still is referenced for social sharing — but it is **not** wired as a `<video poster>` and not committed to the repo.)
- **`muted`:** Yes — `<video muted playsInline>`.
- **`playsInline`:** Yes.
- **`autoplay`:** **No** `autoplay` attribute. Playback is not automatic; the video is scrubbed to `video.currentTime` by the rAF loop driven by scroll progress (see §4.4). The user is expected to scroll.
- **`controls`:** No.
- **`loop`:** No.
- **Fallback / static frame:** There is no per-scene static image fallback in the committed code. The only "fallbacks" are (a) the dark `#0a1118` background of `.scene-media`, (b) the fade-in gating on readiness, and (c) the reduced-motion CSS that hides the video (`.scene-media video { display: none; }`).
- **Note:** The README claims "Each scene also has a static start/end frame for loading and reduced-motion fallbacks." **No such per-scene static-frame mechanism is present in the committed code** — no poster attribute, no `<img>` fallback layer, and no start/end-frame markup. Only the `frame-05-layers.png` OpenGraph image is referenced. This README statement appears inconsistent with the code as committed and is marked **Unclear — needs manual review**.

---

## 5. Styling

### 5.1 Approach

**Plain global CSS** via a single stylesheet: `app/globals.css` (1571 lines), imported once in `app/layout.tsx`. There is **no Tailwind, no CSS Modules, no styled-components, no Sass, no CSS-in-JS**. Styling is class-name based (BEM-ish `block__element` naming), imported globally.

### 5.2 Fonts

Google Fonts are imported at the top of `globals.css` via `@import`:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@0;1&display=swap');
```

- `DM Mono` (monospace) — default body font (`font-family: 'DM Mono', monospace`).
- `Instrument Serif` (serif) — used for headings (`.section-title, h1, h2`).

### 5.3 Theme / design tokens

Defined as CSS custom properties in `:root` in `globals.css`:

```css
:root {
    --navy: #1B2430;
    --white: #F5F7FA;
    --teal: #00B8C4;
    --copper: #C97A32;
    --coral: #FF5860;
    --muted: rgba(245, 247, 250, 0.66);
    --hair: rgba(245, 247, 250, 0.10);
}
```

Key structural/visual features in the CSS:
- **Dark navy theme** throughout (`--navy` background on `html`/`body`).
- **Responsive breakpoints:** `@media (max-width: 900px)` (tablet) and `@media (max-width: 600px)` (mobile).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables transitions and hides the video (see §4.6).
- WebGL canvases (SpecularButton, ShapeBlur, Topography) are sized/styled via their own component code + supporting CSS classes.

### 5.4 Related theme/config files

There is **no separate theme file** (no `tailwind.config`, no `theme.ts`). All theming lives inside `app/globals.css`. The only styling-related config is the base `tsconfig.json`/`eslint.config.mjs` and the `next.config.ts`.

---

## 6. Environment Variables and Config

### 6.1 `next.config.ts` (full content)

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  output: 'standalone',
  async headers() {
    return [
      {
        source: '/media/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Settings and their meaning:

| Setting | Meaning |
|---|---|
| `reactStrictMode: true` | Enables React Strict Mode (double-rendering in dev; surfaces bugs). |
| `output: 'standalone'` | Builds a self-contained Node server in `.next/standalone` for easy deployment to a plain Node host (no full Next/Node image needed). |
| `async headers()` | Adds an **immutable, cache-for-1-year** `Cache-Control` header to every response path matching `/media/*` (i.e. `public, max-age=31536000, immutable`). Intended so CDN-cached media under `/media/` never revalidates. |

> **No `images` config / no `remotePatterns`:** The site uses `next/image` for the header logo with a local path `/brand/irex-logo-dark.png` (which is **not present in the repo**). Because there is no `images` block in `next.config.ts` and the path is root-relative (not a remote host), `next/image` will try to serve it from the local `public/` — but `public/` does not exist. This will 404 unless `/brand/*` is mapped by the external static server/CDN. **Marked Unclear — needs manual review.**

### 6.2 `.env.example` (full content — no sensitive values)

```dotenv
RESEND_API_KEY=
APPLICATION_EMAIL=alipourmohammadi90@gmail.com
RESEND_FROM_EMAIL=IREX Applications <onboarding@resend.dev>
EMAIL_DELIVERY_MODE=resend
```

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key for sending email (left **empty** in the example). |
| `APPLICATION_EMAIL` | Recipient address for submitted applications (default: `alipourmohammadi90@gmail.com`). |
| `RESEND_FROM_EMAIL` | Sender address/name used on outgoing emails (default: `IREX Applications <onboarding@resend.dev>`). |
| `EMAIL_DELIVERY_MODE` | `resend` (default) sends via the Resend API; `log` enables a dry-run mode that logs to console instead of sending. |

How they're consumed (`lib/email.ts`): if `EMAIL_DELIVERY_MODE === 'log'`, emails are only logged; otherwise the Resend REST API (`POST https://api.resend.com/emails`) is called with the `RESEND_API_KEY`. `APPLICATION_EMAIL`/`RESEND_FROM_EMAIL` fall back to the defaults above if unset. `getEmailHealth()` reports which required vars are missing.

---

## 7. Dependencies

### 7.1 `package.json` (full content)

```json
{
  "name": "irex-landing",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "gsap": "3.15.0",
    "next": "15.5.22",
    "ogl": "1.0.11",
    "react": "19.1.1",
    "react-dom": "19.1.1",
    "three": "0.179.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.1",
    "@types/node": "^22.14.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@types/three": "^0.179.0",
    "eslint": "^9.24.0",
    "eslint-config-next": "15.5.22",
    "typescript": "^5.8.3"
  }
}
```

### 7.2 Dependencies — explanations

**Runtime dependencies:**
- `next` (`15.5.22`) — Next.js framework (App Router).
- `react` / `react-dom` (`19.1.1`) — React runtime.
- `gsap` (`3.15.0`) — GreenSock Animation Platform; used with `ScrollTrigger` for the pinned video-scrub scene and the header float behaviour. Also provides `gsap.utils.clamp`.
- `ogl` (`1.0.11`) — Minimal WebGL library; used for the `Topography` CTA background and the `SpecularButton` surface shaders (WebGL2).
- `three` (`0.179.1`) — Three.js; used in `ShapeBlur` for the positioning-card rounded-rect WebGL border effect.

**Dev dependencies:**
- `@eslint/eslintrc` (`^3.3.1`) — Provides `FlatCompat`, used in `eslint.config.mjs` to bridge the old `.eslintrc`-style `next` configs into ESLint 9 flat config.
- `@types/node` (`^22.14.0`) — Node type definitions (for server code / config files).
- `@types/react` / `@types/react-dom` (`^19.1.0`) — React type definitions.
- `@types/three` (`^0.179.0`) — Three.js type definitions.
- `eslint` (`^9.24.0`) — Linter (flat config).
- `eslint-config-next` (`15.5.22`) — Next.js ESLint config (`next/core-web-vitals`, `next/typescript`).
- `typescript` (`^5.8.3`) — TypeScript compiler.

> Note: `gsap`, `ogl`, and `three` are bundled client-side; they ship to the browser. No SSR-heavy cost applies since all consuming components are `'use client'`.

---

## 8. Build and Deploy

### 8.1 Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev --turbopack` | Local dev server using the **Turbopack** bundler. |
| `build` | `next build` | Production build. |
| `start` | `next start` | Serve the production build (Node host). |
| `lint` | `next lint` | Run ESLint. |

### 8.2 Deployment platform

**Primarily a plain Node.js host** (per `HOSTING.md`): Node 20+, `npm ci && npm run build && npm run start` (default port `3000`, configurable via `PORT`). `next.config.ts` sets `output: 'standalone'`, which produces a self-contained server for such hosts.

**Vercel** is also strongly implied:
- `.vercelignore` exists (ignore list: `.next`, `node_modules`, `*.log`).
- `.gitignore` ignores `.vercel/`.
- The `next` version and App Router structure are Vercel-compatible.

> The exact production platform (plain Node vs. Vercel vs. another CDN-fronted host) is **Unclear — needs manual review**. Either way, note that `/media/*` and `/brand/*` assets must be available to the deployment (see §4.3).

### 8.3 Hosting notes (from `HOSTING.md`)

- Requires Node.js 20+ and a Resend API key.
- Required env vars on the host: `EMAIL_DELIVERY_MODE`, `RESEND_API_KEY`, `APPLICATION_EMAIL`, `RESEND_FROM_EMAIL`.
- Health check: `GET /api/apply` returns JSON such as `{ "mode": "resend", "configured": true }`.
- For a production domain, `RESEND_FROM_EMAIL` should be a verified Resend sender.

---

## 9. Known Issues / Notes for the Next Developer

1. **Video files are large and are NOT committed to the repo.** There is no `public/` folder and no tracked media. The video `/media/irex-scroll-narrative.mp4` (plus `/brand/*` logos and `/media/frame-05-layers.png`) must be served from outside the repo (CDN / external static host / injected into `public/` at deploy time). **The exact external origin is not determinable from the code — confirm where media is served from before relying on video playback in a deployed environment.**

2. **No real lazy-loading for the video exists yet.** The video is loaded eagerly with `preload="auto"` and merely gated behind a readiness fade-in; there is no `loading="lazy"`, no `IntersectionObserver`, and no `next/dynamic` on the video. If deferred loading is required, it must be implemented. (See full analysis in §4.4.)

3. **The README wording is inconsistent with the code:**
   - README says *"four scroll-scrub videos"* but the code references **one** file, `/media/irex-scroll-narrative.mp4`, scrubbed across four scenes. Confirm whether this is one 25 s video or should be four.
   - README says *"Each scene also has a static start/end frame for loading and reduced-motion fallbacks"* but **no such per-scene frame/poster mechanism exists in the committed code** (no `poster` attribute, no per-scene static image). Only `frame-05-layers.png` is referenced, as the OpenGraph image only.

4. **`next/image` will 404 for the header logo unless `/brand/*` is served externally.** `Header.tsx` uses `<Image src="/brand/irex-logo-dark.png" ...>` with no `images` config and no `public/` folder. The logo must be provided by the external static serving setup or dropped into `public/brand/`.

5. **Dead code:** `components/TextPressure.tsx` is a complete, working component but is **not imported or used anywhere**. It can be deleted or wired up.

6. **No true lazy-loading for WebGL canvases either (mostly):** `ShapeBlur` runs a continuous `requestAnimationFrame` render loop with no visibility gating; `Topography` does pause/resume via `IntersectionObserver` + `document.visibilitychange`; `SpecularButton` runs a continuous rAF loop. On low-power devices these are worth auditing for performance, though the CTA is near the bottom of the page.

7. **Email delivery requires configuration.** With `EMAIL_DELIVERY_MODE=resend` and no `RESEND_API_KEY`, the API returns HTTP `503`. Use `EMAIL_DELIVERY_MODE=log` for local dry-runs.

8. **`reactStrictMode: true`** is enabled — in development, effects run twice, which matters for the WebGL/GSAP cleanup paths (they are implemented with proper teardowns, but worth keeping in mind when debugging).

9. **Reduced-motion handling:** with `prefers-reduced-motion: reduce`, the hero video is hidden (`display: none`) and the section is no longer pinned (height becomes auto). Ensure the hero text remains readable without the video in that case.

10. **API route specifics:** `/api/apply` (`app/api/apply/route.ts`) enforces a per-IP rate limit (max 5 POSTs / 60 s, keyed by `x-forwarded-for`), validates field lengths, and uses a hidden "website" honeypot field for spam (a non-empty value returns a fake `{ ok: true }`). It is `force-dynamic` and Node runtime. `GET /api/apply` returns email-config health.

---

*End of documentation.*
