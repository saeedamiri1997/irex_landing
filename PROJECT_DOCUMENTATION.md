# IREX Landing — Project Documentation

**Last updated:** 2026-08-25

This document describes the implementation currently in this repository. It is intended to be the source of truth for a future developer or coding agent; it deliberately records behavior that is easy to misread from the visual design alone.

## 1. What this project is

IREX Landing is a single-page marketing site for IREX Pty Ltd. It presents Computational Geological Reasoning™ (CGR™) as a reasoning-first approach to exploration decisions under geological uncertainty and invites visitors to apply to the Early Adopter Program.

There is no login, database, CMS, analytics integration, or persistent application store in this repository. The only server-side feature is `POST /api/apply`, which verifies Cloudflare Turnstile and sends an application through Resend, or logs it in a local dry-run mode.

## 2. Runtime and project structure

| Area | Implementation |
|---|---|
| Framework | Next.js 15.5.22 App Router |
| UI | React 19.1.1, TypeScript, strict type checking |
| Scroll/media | GSAP 3.15.0 and ScrollTrigger |
| WebGL | Three.js 0.179.1 for the positioning border; OGL 1.0.11 for topography and button effects |
| Package manager | npm, lockfile version 3 |
| Host runtime | Node.js 20 or newer |
| Styling | One global stylesheet: `app/globals.css`; no Tailwind or CSS modules |
| Next output | `output: 'standalone'` in the root Next config |
| Tests | Vitest 3 + jsdom; regression suite in `tests/` (`npm test`) |

The repository has both `next.config.js` and `next.config.ts`; their settings are currently equivalent. Next uses the JavaScript config in normal builds. Do not edit one without checking the other.

```text
app/
  layout.tsx                 Root metadata and global CSS
  page.tsx                   Renders LandingPage
  globals.css                All site, responsive, modal, WebGL and motion styles
  api/apply/route.ts         GET health check and POST application endpoint
components/
  LandingPage.tsx            Page composition and modal open/close state
  Header.tsx                 Fixed/floating logo header
  LineSidebar.tsx            Desktop section navigation
  ScrollVideoScene.tsx       Pinned hero media and five scene panels
  ApplyModal.tsx             Turnstile-protected Early Adopter form
  SpotlightCard.tsx          Mouse-position CSS card spotlight
  SpecularButton.tsx         OGL specular button canvas
  ShapeBlur.tsx              Three.js positioning-card border canvas
  Topography.tsx             OGL CTA contour-line canvas
  TextPressure.tsx           Unused hover text component; not imported
lib/
  content.ts                 Sidebar sections, hero media paths and scene copy
  dpr.ts                     Shared matchMedia device-pixel-ratio watcher
  email.ts                   Resend/log email configuration and delivery
tests/
  scroll-video-scene.race.test.tsx  Hero media branch/readiness/scrub regression suite
  setup.ts                   React `act` test-environment flag
vitest.config.ts             Vitest configuration (jsdom, `@` alias)
public/
  brand/                     IREX logos
  media/                     Desktop WebM, legacy MP4, portrait WebP and PNG media assets
```

## 3. Page composition

`components/LandingPage.tsx` renders the following in order:

1. `Header`
2. `LineSidebar`
3. `ScrollVideoScene` (`#hero`)
4. Reasoning section (`Generate. Test. Reject.`)
5. Principle/manifesto section (`#principle`)
6. Transparency cards (`#transparency`)
7. Control cards (`#control`)
8. Economic value section (`#value`)
9. Positioning card (`#positioning`) with `ShapeBlur`
10. CGR definition card (`#cgr-definition`)
11. Early Adopter CTA (`#apply`) with `Topography` and `SpecularButton`
12. Footer
13. `ApplyModal`, conditionally rendered from the page-level `applyOpen` state

The sidebar section list is in `lib/content.ts`: `hero`, `principle`, `transparency`, `control`, `value`, `positioning`, `cgr-definition`, and `apply`. There is no standalone prediction section. The prediction copy is one panel inside the pinned hero.

### 3.1 Header and sidebar

- `Header` uses the local `/brand/irex-logo-dark.png` asset through `next/image` and becomes a floating pill after 80px of scroll.
- `LineSidebar` observes the section elements and scrolls to them on click.
- The exact responsive boundary is `@media (max-width: 900px)`: the sidebar is hidden at 900px and below, and is visible at 901px and above. This is intentional, not a `min-width` approximation.

### 3.2 Hero scenes and responsive media branches

`ScrollVideoScene` pins a full viewport section with the same ScrollTrigger configuration at every viewport size:

- `start: 'top top'`
- `end: '+=520%'`
- `pin: true`
- `scrub: 0.72`
- `anticipatePin: 1`
- `invalidateOnRefresh: true`

The five scene ranges are defined in seconds in `lib/content.ts`:

| Scene | Range | Mobile static frame | Purpose |
|---|---:|---|---|
| `cgr` | 0–3.23 | `frame-01-rocks-916.webp` | Hero target-decision statement and CTA |
| `prediction` | 3.23–8.07 | `frame-02-topography-916.webp` | Move from prediction to reasoning |
| `first-principles` | 8.07–14.46 | `frame-03-cross-section-916.webp` | Noisy footprints, invariants, and CGR principle |
| `problem` | 14.46–20.64 | `frame-04-diorama-916.webp` | Data-rich/interpretation-poor problem and consequences |
| `limitations` | 20.64–25.00 | `frame-05-layers-916.webp` | Why patterns do not equal understanding |

The text panels are stacked in one grid cell. `ScrollTrigger.onUpdate` resolves the active scene from the progress range and updates the shared `activeIndex`; that same index activates the copy panel and, on a phone, the matching static frame. The image stack is full-bleed, uses `next/image` optimization, and crossfades its absolutely positioned frames with the panel change.

The **exact mobile boundary is `max-width: 600px`, inclusive**. To make sure a phone cannot request a video during HTML parsing, neither media branch is emitted in the SSR markup. On client mount `matchMedia('(max-width: 600px)')` chooses one branch:

- **Mobile (<=600px):** mounts only the five portrait WebP images. It mounts no `<video>`, attaches no media listeners, does no `readyState` polling, and starts no frame-seeking animation loop.
- **Desktop/tablet (>600px):** mounts only `/media/irex-scroll-narrative.webm` with the existing scroll-scrub and fade-in behavior.

The media-query listener also changes branches if a browser viewport crosses 600px after mount. In the mobile branch, the GSAP pin and progress logic remains active; it continues to drive both copy and static-frame selection without a video seek.

### 3.3 Desktop hero video readiness (cold-load guard)

The desktop/tablet video retains the readiness guard that prevents a cold-load blank hero. It is initially transparent and becomes visible only after `markReady()` applies `is-ready`. The native `loadedmetadata`, `loadeddata`, `canplay`, and `canplaythrough` listeners are attached in the desktop-only effect; the effect also reads `video.readyState` immediately and polls it in the scrub loop. Therefore an event that occurs before listener attachment cannot leave the gate permanently false.

`markReady()` is idempotent. On its one transition it calls `ScrollTrigger.refresh()` so the current pinned progress is re-synchronized, while seeking continues to be throttled to at most 30 assignments per second and ignores target changes below 0.04 seconds. The video is still set to `muted` as a DOM property rather than a JSX prop to avoid React's SSR hydration warning.

The original first-visit race is additionally avoided structurally: the desktop `<video>` is now created only after client hydration has selected the >600px branch. Do not move it back into the SSR markup or replace the native/`readyState` guard with JSX-only media handlers.

## 4. Media and static assets

All current media is checked into `public`, so a deployment must include that directory.

- `/media/irex-scroll-narrative.webm` is the only active hero video. It is used only above 600px and is approximately 25.01 seconds, 12,967,827 bytes (~12.97 MB), and ~4.15 Mbps.
- `/media/frame-01-rocks-916.webp` through `/media/frame-05-layers-916.webp` are the active 9:16 mobile hero frames. Their scene mapping is declared alongside the scene data as `mobileImage` in `lib/content.ts` and is listed in section 3.2.
- `/media/irex-scroll-narrative-mobile.webm` was removed from the repository. It must not be reintroduced as a CSS-hidden source: on mobile the hero must remain an image-only branch with no video request.

The following files are present in `public/media` but are not referenced by the current hero component:

- `01-rocks-to-topography.mp4`
- `02-topography-to-cross-section.mp4`
- `03-cross-section-to-diorama.mp4`
- `04-diorama-to-layers.mp4`
- `frame-01-rocks.png` through `frame-05-layers.png`

`frame-05-layers.png` is used as the Open Graph image in `app/layout.tsx`. The page does not request `/media/irex-scroll-narrative.mp4`; that path is obsolete and should not be restored in documentation or deployment rules.

The active media response header is configured by the root Next config for `/media/:path*` as `public, max-age=31536000, immutable`. Change filenames when replacing immutable media.

## 5. WebGL and animation lifecycle

The page has three reusable WebGL effects and one scroll-driven hero media animation. They are intentionally client-only and clean up their observers, event listeners, animation frames, canvases, and contexts on unmount.

### 5.1 Visibility and page-visibility gating

- `ShapeBlur` starts its Three.js render loop only while its element intersects the viewport and `document.hidden` is false.
- Every `SpecularButton` instance (hero CTAs and form submit) has the same `IntersectionObserver` plus `visibilitychange` gating. Off-screen buttons do not render continuously.
- `Topography` already used the same gating pattern and continues to do so for the CTA background.
- A hidden page cancels the active frame in all three effects. Returning to the page starts it again only if the element is still visible.

Pointer listeners still update lightweight target state where needed, but they do not force a render while an effect is gated.

### 5.2 Dynamic DPR handling

`lib/dpr.ts` exposes `watchDevicePixelRatio`, which subscribes to a resolution `matchMedia` query and re-subscribes after each change. `ShapeBlur`, `Topography`, and `SpecularButton` use it. Each recalculates its backing buffer/uniforms and caps the effective DPR at 2. This matters when a browser window moves between displays or an emulated device scale factor changes after mount.

### 5.3 Initial render and reduced motion

There is no preloader or initial scroll lock. `LandingPage` renders the header, hero, and remaining page content directly; no component writes `document.body.style.overflow` during initial load.

For `prefers-reduced-motion: reduce`, smooth scrolling and primary transitions are disabled. The desktop/tablet hero video is hidden, while the mobile static frame remains available without crossfade motion. The scene copy remains available as text.

## 6. Responsive behavior and overflow decisions

The base stylesheet still has `body { overflow-x: hidden; }` as a defensive guard, but the layout fixes are intended to prevent content from being wider than the document:

- At widths up to 900px, the reasoning heading, value outcome lines, and problem-scene statement are explicitly allowed to wrap instead of inheriting desktop `nowrap` behavior.
- On mobile, `.scene-copy` and `.video-scene--right .scene-copy` use `margin: 0` and `width: 100%`; the earlier extra width/margin calculation is removed.
- The problem statement can wrap at tablet/mobile widths.
- The mobile portrait WebP frame stack uses `object-fit: cover`, preserving its 9:16 composition while covering the hero. The desktop/tablet video rule is also `cover`.
- The prediction closing line remains `nowrap` on desktop/tablet but is intentionally allowed to wrap at 600px and below because a readable single line is not possible on a phone.

The exact viewport matrix used for overflow checks is 375×812, 390×844, 600×900, 720×900, 768×1024, and 900×900. The intended invariant at each size is `document.documentElement.scrollWidth <= window.innerWidth` and no horizontal scrollbar.

### 6.1 ApplyModal scrolling/spacing decision

The modal intentionally uses a bounded, internally scrollable panel rather than allowing the page behind it to scroll:

- Opening the modal locks body scrolling and restores the previous body overflow value on close.
- `.apply-modal` has a viewport-relative `max-height` and `overflow: auto` with `overscroll-behavior: contain`.
- The backdrop itself can scroll if a browser viewport or virtual keyboard leaves less space than expected.
- At widths up to 600px the backdrop has a 12px gutter, the panel uses 30px top/34px bottom and 28px side padding, and `100dvh` is used where supported.
- This keeps the close control and all fields reachable without making the main page jump. The form becomes one column at the tablet breakpoint.

## 7. Application form and API

### 7.1 Client behavior (`ApplyModal.tsx`)

The modal explicitly loads Cloudflare's Turnstile script with `?render=explicit` and renders one widget when the modal opens. It tracks:

- widget load and render failures;
- a completed token;
- expired tokens;
- Turnstile error callbacks;
- a retry/reset action;
- sending, success, server error, rate-limit, configuration, and network states.

The client refuses to submit without a current Turnstile token and sends it as `cf-turnstile-response`. Error messages are placed in an alert region; the widget status is announced through a live status element.

When `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is absent in a non-production local build, the component uses Cloudflare's public test site key. A production build does not use that fallback and reports that the security check is not configured.

### 7.2 Server behavior (`app/api/apply/route.ts`)

The route uses the Node.js runtime and `force-dynamic`.

`GET /api/apply` returns configuration health without secret values:

- `mode`
- `configured`
- `toConfigured`
- `fromConfigured`
- `missing`
- `turnstileConfigured`

`POST /api/apply` performs these steps:

1. Identify the client from the first `x-forwarded-for` value, or `unknown`.
2. Apply a process-local limit of five POST attempts per IP per 60 seconds. The sixth attempt returns HTTP 429.
3. Parse JSON; invalid JSON returns HTTP 400.
4. If `website` is non-empty, return fake success `{ "ok": true }` without Turnstile or email delivery. This is the honeypot path.
5. Verify `cf-turnstile-response` against Cloudflare's siteverify endpoint.
6. Validate required fields and length limits:
   - `name`: required, max 120 characters;
   - `company`: required, max 160 characters;
   - `email`: required, basic email pattern, max 180 characters;
   - `message`: optional, max 3,000 characters.
7. Call `sendApplicationEmail`.

Expected error status codes are 400 for malformed fields/security tokens, 429 for the limiter, 503 when Resend configuration is incomplete, and 502 for an upstream Resend failure. The limiter is deliberately in memory and per process; a multi-instance deployment needs a shared limiter for global enforcement.

In development, if `TURNSTILE_SECRET_KEY` is absent, the route can use Cloudflare's public test secret. In production there is no secret fallback: `TURNSTILE_SECRET_KEY` must be provided by the host.

### 7.3 Email delivery (`lib/email.ts`)

`EMAIL_DELIVERY_MODE=log` is the local/dry-run path. It prints the recipient, sender, reply-to, subject, and text payload with `console.info` and returns:

```json
{ "ok": true, "mode": "log", "id": "dry-run" }
```

It does not call Resend and does not require recipient/sender values. The production path is Resend mode and requires all three server-side email variables:

- `RESEND_API_KEY`
- `APPLICATION_EMAIL`
- `RESEND_FROM_EMAIL`

There are no production fallback email addresses or API keys in the sender. Missing any of those values returns `Email service is not configured`, which the route maps to HTTP 503. The email includes escaped HTML and a plain-text version, with the applicant's email in `reply_to`.

## 8. Environment and deployment

Copy `.env.example` to `.env.local` for local work. The local template selects log mode and contains Cloudflare test credentials. The test credentials are not production credentials.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a build-time public variable in Next.js. It must be available before `npm run build` so that the browser bundle receives the correct site key; setting it only at server start does not change an already-built client bundle.

Production must set:

```env
EMAIL_DELIVERY_MODE=resend
RESEND_API_KEY=real_resend_api_key
APPLICATION_EMAIL=real_recipient_address
RESEND_FROM_EMAIL=IREX Applications <verified-sender@example.com>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=real_public_site_key
TURNSTILE_SECRET_KEY=real_secret_key
```

`APPLICATION_EMAIL` and `RESEND_FROM_EMAIL` are supplied by hosting and the Resend account; they must not be invented in code. The Resend sender/domain must be verified, and the Turnstile site key must allow the real domain. See `HOSTING.md` for the standalone build command, asset copying, health check, and operator-level production verification.

For a conventional standalone Node deployment:

```bash
npm ci
npm run build
cp -R public .next/standalone/public
cp -R .next/static .next/standalone/.next/static
PORT=3000 node .next/standalone/server.js
```

The exact live hosting provider and domain are not recorded in this repository. Consequently, production Turnstile hostname validation, Resend sender verification, and actual mailbox delivery cannot be claimed as verified from local tests.

## 9. Verification record

### 9.1 Build and static checks

The latest validation completed successfully:

```bash
npm test
npm run build
```

The production build compiles, type-checks, and completes Next's build-time linting without warnings for this change. `npm ci` also completed successfully from the lockfile.

### 9.2 Local application delivery check

The actual `lib/email.ts` function and the actual API handler have been exercised locally with `EMAIL_DELIVERY_MODE=log`. A mocked Turnstile siteverify response was used only to isolate the email dry-run path; the test returned HTTP 200 with `mode: "log"` and `id: "dry-run"`, and the server emitted the application payload to the console. This is not a production Turnstile or email-delivery verification.

### 9.3 Performance and browser checks

The investigation baseline recorded before these fixes was:

- Lighthouse mobile: 81/100, LCP 2.8s, TBT 510ms, 7.69 MB transfer.
- Lighthouse desktop: 99/100, LCP 0.6s, TBT 30ms, 9.79 MB transfer.
- Hero scroll jank near 1,000 CSS px/s: 24 frame gaps above 50ms at 375px and 31 at 768px.
- Before layout fixes, representative `scrollWidth` values were 406px at 375/390 and 831px at 720/768 while body overflow masking hid the defects.

The production build completed successfully after the mobile-frame/preloader update. Static regression checks confirm the SSR markup has no media before viewport selection, the <=600px branch has five mapped frames and no `<video>`/video RAF work, desktop retains its ready/fade/scrub path, and mobile ScrollTrigger progress changes both the copy panel and active frame. The <=900px sidebar boundary and the three gated WebGL effects remain unchanged.

A numeric post-fix browser result could not be produced in this sandbox. There is no Chrome/Chromium executable installed: `npx playwright install chromium` failed because the browser download connection was reset, and both Lighthouse attempts (mobile 412×823 and desktop) stopped with Lighthouse's `CHROME_PATH`/Chrome-not-installed error. Consequently, the 412×823 and desktop scores, the >50ms jank counts at 375/768, and real-browser `scrollWidth` measurements at 375×812, 390×844, 600×900, 720×900, 768×1024, and 900×900 remain unverified here rather than being represented as assumed passes.

There is also no production domain or valid production Turnstile/Resend credential set available in this checkout. The local log-mode/API test is explicitly not a production Turnstile or mailbox-delivery verification. An operator with hosting/domain access must run the real-browser submission and delivery test described in `HOSTING.md`.

### 9.4 Hero media branch and desktop readiness verification

`tests/scroll-video-scene.race.test.tsx` (`npm test`) renders the real `ScrollVideoScene` through React's server renderer and hydrates it in jsdom with `gsap`/`ScrollTrigger` stubbed. jsdom has no layout engine, so the suite asserts the trigger configuration and component state transitions rather than browser pin geometry. The current seven checks cover:

1. SSR emits neither a video nor an image stack before the client selects a media branch, preventing a pre-hydration mobile video request.
2. Desktop/tablet remains visible when metadata is already available on its initial load and calls `ScrollTrigger.refresh()` once.
3. Desktop/tablet still becomes ready when a media event arrives after hydration.
4. The ready desktop scrub loop seeks to the frame matching 50% scroll progress.
5. The <=600px branch mounts exactly the five mapped WebP frames, with no video and no video RAF loop.
6. Mobile `ScrollTrigger` progress activates `first-principles` copy and `frame-03-cross-section-916.webp` at 50% progress.
7. Crossing from a desktop/tablet viewport into the mobile breakpoint unmounts the video and mounts the static frame stack.

`npm test` and `npm run build` passed for this change. A local production-server smoke check confirmed that the SSR page contains zero hero `<video>` tags, image-stack markup, or WebM paths before client viewport selection; the desktop WebM and a representative WebP frame return HTTP 200 with immutable caching, and the removed mobile WebM returns HTTP 404. A genuine browser DevTools cold-cache/network-tab check cannot be recorded from this sandbox because no Chrome/Chromium executable is installed. Before release, validate once in an incognito window with cache disabled: at >600px the desktop video should fade in and scrub, while at <=600px the Network tab must show WebP/Next image optimizer request(s) and no `irex-scroll-narrative*.webm` request.

## 10. Editing guidance

- Keep `/media` filenames versioned because of the immutable cache header.
- If changing a hero scene range, update both `lib/content.ts` and the scene/progress verification checks.
- Preserve WebGL cleanup and the visibility/page-visibility gates when changing effects.
- Preserve the `matchMedia('(max-width: 600px)')` media branch unless the design breakpoint changes everywhere. Do not emit the desktop video in SSR markup or use CSS hiding as a substitute.
- Do not revert the desktop hero readiness handling in `ScrollVideoScene.tsx` to JSX-only media props (`onLoadedMetadata` etc.): the native listeners plus `readyState` checks are what make cold-cache loads reliable.
- Run `npm test` after touching `ScrollVideoScene.tsx`; `tests/scroll-video-scene.race.test.tsx` is the regression suite for the cold-load race.
- Do not replace production email variables with defaults in code. Use `EMAIL_DELIVERY_MODE=log` for local dry-runs.
- If adding a new sidebar section, add both its DOM `id` and its `sections` entry in matching order.
