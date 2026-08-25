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
| Scroll/video | GSAP 3.15.0 and ScrollTrigger |
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
  ScrollVideoScene.tsx       Pinned hero video and five scene panels
  ApplyModal.tsx             Turnstile-protected Early Adopter form
  SmartPreloader.tsx         Short initial progress overlay
  SpotlightCard.tsx          Mouse-position CSS card spotlight
  SpecularButton.tsx         OGL specular button canvas
  ShapeBlur.tsx              Three.js positioning-card border canvas
  Topography.tsx             OGL CTA contour-line canvas
  TextPressure.tsx           Unused hover text component; not imported
lib/
  content.ts                 Sidebar sections, video paths and scene copy
  dpr.ts                     Shared matchMedia device-pixel-ratio watcher
  email.ts                   Resend/log email configuration and delivery
tests/
  scroll-video-scene.race.test.tsx  Cold-load readiness/scrub regression suite
  setup.ts                   React `act` test-environment flag
vitest.config.ts             Vitest configuration (jsdom, `@` alias)
public/
  brand/                     IREX logos
  media/                     WebM, legacy MP4 and PNG media assets
```

## 3. Page composition

`components/LandingPage.tsx` renders the following in order:

1. `SmartPreloader`
2. `Header`
3. `LineSidebar`
4. `ScrollVideoScene` (`#hero`)
5. Reasoning section (`Generate. Test. Reject.`)
6. Principle/manifesto section (`#principle`)
7. Transparency cards (`#transparency`)
8. Control cards (`#control`)
9. Economic value section (`#value`)
10. Positioning card (`#positioning`) with `ShapeBlur`
11. CGR definition card (`#cgr-definition`)
12. Early Adopter CTA (`#apply`) with `Topography` and `SpecularButton`
13. Footer
14. `ApplyModal`, conditionally rendered from the page-level `applyOpen` state

The sidebar section list is in `lib/content.ts`: `hero`, `principle`, `transparency`, `control`, `value`, `positioning`, `cgr-definition`, and `apply`. There is no standalone prediction section. The prediction copy is one panel inside the pinned hero.

### 3.1 Header and sidebar

- `Header` uses the local `/brand/irex-logo-dark.png` asset through `next/image` and becomes a floating pill after 80px of scroll.
- `LineSidebar` observes the section elements and scrolls to them on click.
- The exact responsive boundary is `@media (max-width: 900px)`: the sidebar is hidden at 900px and below, and is visible at 901px and above. This is intentional, not a `min-width` approximation.

### 3.2 Hero scenes

`ScrollVideoScene` pins a full viewport section with:

- `start: 'top top'`
- `end: '+=520%'`
- `pin: true`
- `scrub: 0.72`
- `anticipatePin: 1`
- `invalidateOnRefresh: true`

The five scene ranges are defined in seconds in `lib/content.ts`:

| Scene | Range | Purpose |
|---|---:|---|
| `cgr` | 0–3.23 | Hero target-decision statement and CTA |
| `prediction` | 3.23–8.07 | Move from prediction to reasoning |
| `first-principles` | 8.07–14.46 | Noisy footprints, invariants, and CGR principle |
| `problem` | 14.46–20.64 | Data-rich/interpretation-poor problem and consequences |
| `limitations` | 20.64–25.00 | Why patterns do not equal understanding |

The text panels are stacked in one grid cell and activated by the ScrollTrigger progress. The video loop is always scheduled while the component is mounted, but actual `currentTime` assignments are throttled to at most 30 per second and skipped when the target has moved less than 0.04 seconds. This reduces expensive media seeks while preserving scroll-following behavior.

### 3.3 Hero video cold-load readiness (race-condition fix)

The hero video had a first-visit-only bug: with an empty browser cache, the video stayed hidden (`opacity: 0`, no `is-ready` class) and never scrubbed until the user manually reloaded the page. After a reload (warm cache) it worked, which made it look like a hosting/CDN problem — it was not; it is a client-side timing race.

**Root cause.** `<video preload="auto">` is present in the SSR HTML, so the browser starts fetching the WebM (and parses its header) the moment the HTML is parsed — while the Next.js JS bundle is still downloading and React has not yet hydrated. The readiness gate was driven exclusively by JSX handlers:

```tsx
onLoadedMetadata={() => setReady(true)}
onLoadedData={() => setReady(true)}
onCanPlayThrough={() => setReady(true)}
```

React attaches those listeners only during hydration. On a cold load, `loadedmetadata` typically fires *before* hydration, so the handlers never see it, `ready` stays `false` forever, and:

- `.is-ready` is never applied, so the CSS keeps the video at `opacity: 0` (the reported "hidden/blank" hero); and
- `scrubToScroll` skips every seek (`readyRef.current` gating), so the scroll-scrub is dead even after the media finishes downloading.

On a warm reload the media comes from cache and hydration wins the race, which is why the bug only appeared on first visit. The same failure also happens if the metadata event is missed for any other reason, and any future viewer that relies on an unmissable gate would inherit it.

**Why the pin-range hypothesis was rejected.** The suspected desync of ScrollTrigger's pin range (`end: '+=520%'`) was checked carefully and is not the fault: in GSAP 3.15 the `+=N%` end offset is resolved against the *scroller (viewport) size* (`_offsetToPx(value, size)` where `size` is the viewport height), not the trigger height, and the `<video>` is `position: absolute` inside a fixed-height section, so video metadata/dimensions never change the section's layout. The pin range is therefore identical before and after metadata loads; no `ScrollTrigger.refresh()` can fix the hidden-video symptom because the symptom is the `ready` gate, not the scroll range. A defensive `ScrollTrigger.refresh()` is still issued on the ready transition (below) to re-sync progress if anything else shifted layout during media loading (fonts, preloader unlock, scrollbar appearance).

**Fix implemented in `ScrollVideoScene.tsx`:**

1. Media listeners are attached natively in the mount effect (`loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`) instead of via JSX props. After hydration, they cannot miss events, and their lifetime is tied to the ScrollTrigger's.
2. At mount the component reads `video.readyState` directly; if metadata is already present (`readyState >= 1`), readiness is applied immediately — this recovers events that fired before hydration.
3. The existing per-frame `scrubToScroll` loop also polls `readyState` as a safety net, so readiness can never get stuck even if a media event is missed for any other reason.
4. If resource selection never started (`networkState` EMPTY/IDLE) at mount, `video.load()` re-kicks it so events fire after the listeners are attached.
5. Readiness is now set through one idempotent `markReady()` (ref + state atomically) so the gate flips exactly once; on the transition `ScrollTrigger.refresh()` is called.
6. `muted` was moved from the JSX prop to `video.muted = true` in the effect to remove a benign React 19 SSR hydration-mismatch warning (React does not serialize `muted` into the server HTML).

Behavior is unchanged when media loads normally: the video fades in via `.is-ready` and immediately scrubs to the frame matching the current scroll position (`targetProgress` is already tracking scroll while hidden), so no black flash or frame jump is introduced.

## 4. Media and static assets

All current media is checked into `public`, so a deployment must include that directory. The files used by the current hero are:

- `/media/irex-scroll-narrative.webm`: desktop WebM, approximately 25.01 seconds, 12,967,827 bytes (~12.97 MB), approximately 4.15 Mbps.
- `/media/irex-scroll-narrative-mobile.webm`: mobile WebM, approximately 25.01 seconds, 10,538,527 bytes (~10.54 MB), approximately 3.37 Mbps.

`lib/content.ts` exports those paths as `narrativeVideo` and `narrativeMobileVideo`. The `<video>` in `ScrollVideoScene` lists the mobile source first with `media="(max-width: 600px)"`, then the desktop source as the fallback. The mobile selection boundary is therefore 600px CSS width, inclusive for the media query.

The following files are also present in `public/media` but are not referenced by the current hero component:

- `01-rocks-to-topography.mp4`
- `02-topography-to-cross-section.mp4`
- `03-cross-section-to-diorama.mp4`
- `04-diorama-to-layers.mp4`
- `frame-01-rocks.png` through `frame-05-layers.png`

`frame-05-layers.png` is used as the Open Graph image in `app/layout.tsx`. The page does not request `/media/irex-scroll-narrative.mp4`; that path is obsolete and should not be restored in documentation or deployment rules.

The active media response header is configured by the root Next config for `/media/:path*` as `public, max-age=31536000, immutable`. Change filenames when replacing immutable media.

## 5. WebGL and animation lifecycle

The page has three reusable WebGL effects and one scroll/video animation. They are intentionally client-only and clean up their observers, event listeners, animation frames, canvases, and contexts on unmount.

### 5.1 Visibility and page-visibility gating

- `ShapeBlur` starts its Three.js render loop only while its element intersects the viewport and `document.hidden` is false.
- Every `SpecularButton` instance (hero CTAs and form submit) has the same `IntersectionObserver` plus `visibilitychange` gating. Off-screen buttons do not render continuously.
- `Topography` already used the same gating pattern and continues to do so for the CTA background.
- A hidden page cancels the active frame in all three effects. Returning to the page starts it again only if the element is still visible.

Pointer listeners still update lightweight target state where needed, but they do not force a render while an effect is gated.

### 5.2 Dynamic DPR handling

`lib/dpr.ts` exposes `watchDevicePixelRatio`, which subscribes to a resolution `matchMedia` query and re-subscribes after each change. `ShapeBlur`, `Topography`, and `SpecularButton` use it. Each recalculates its backing buffer/uniforms and caps the effective DPR at 2. This matters when a browser window moves between displays or an emulated device scale factor changes after mount.

### 5.3 SmartPreloader

`SmartPreloader` shows a progress overlay and temporarily sets `document.body.style.overflow = 'hidden'`. The current timing is:

- start delay: 80ms
- progress reveal: 650ms
- exit delay: 80ms
- exit transition: 360ms

The theoretical maximum initial scroll-lock duration is therefore about 1.17 seconds, rather than the former roughly 2.5 seconds. The original body overflow value is restored on completion and cleanup.

### 5.4 Reduced motion

For `prefers-reduced-motion: reduce`, smooth scrolling is disabled, transitions are removed for the primary animated elements, the hero is no longer pinned, and the hero video is hidden. The scene copy remains available as text.

## 6. Responsive behavior and overflow decisions

The base stylesheet still has `body { overflow-x: hidden; }` as a defensive guard, but the layout fixes are intended to prevent content from being wider than the document:

- At widths up to 900px, the reasoning heading, value outcome lines, and problem-scene statement are explicitly allowed to wrap instead of inheriting desktop `nowrap` behavior.
- On mobile, `.scene-copy` and `.video-scene--right .scene-copy` use `margin: 0` and `width: 100%`; the earlier extra width/margin calculation is removed.
- The problem statement can wrap at tablet/mobile widths.
- The mobile video uses `object-fit: cover`, preserving the source aspect ratio rather than stretching with `fill`. The base video rule is also `cover`.
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

The current production build and lint command complete successfully:

```bash
npm run build
npm run lint
```

The build/lint output contains the existing `@next/next/no-img-element` warning for `components/LandingPage.tsx:185` and the existing missing `metadataBase` warning from Next metadata handling. Neither is a build failure.

`npm ci` has also completed successfully from the lockfile.

### 9.2 Local application delivery check

The actual `lib/email.ts` function and the actual API handler have been exercised locally with `EMAIL_DELIVERY_MODE=log`. A mocked Turnstile siteverify response was used only to isolate the email dry-run path; the test returned HTTP 200 with `mode: "log"` and `id: "dry-run"`, and the server emitted the application payload to the console. This is not a production Turnstile or email-delivery verification.

### 9.3 Performance and browser checks

The investigation baseline recorded before these fixes was:

- Lighthouse mobile: 81/100, LCP 2.8s, TBT 510ms, 7.69 MB transfer.
- Lighthouse desktop: 99/100, LCP 0.6s, TBT 30ms, 9.79 MB transfer.
- Hero scroll jank near 1,000 CSS px/s: 24 frame gaps above 50ms at 375px and 31 at 768px.
- Before layout fixes, representative `scrollWidth` values were 406px at 375/390 and 831px at 720/768 while body overflow masking hid the defects.

The post-fix production build was served successfully with the standalone server and passed HTTP smoke checks for `/`, both WebM files, the logos/OG image, and `/api/apply`. Static regression checks confirmed the responsive rules intended for the six requested viewport checks, the 600px mobile source media query, the <=900px sidebar media boundary, the three gated WebGL effects, and the DPR watcher re-subscription behavior.

A numeric post-fix browser result could not be produced in this sandbox. There is no Chrome/Chromium executable installed: `npx playwright install chromium` failed because the browser download connection was reset, and both Lighthouse attempts (mobile 412×823 and desktop) stopped with Lighthouse's `CHROME_PATH`/Chrome-not-installed error. Consequently, the 412×823 and desktop scores, the >50ms jank counts at 375/768, and real-browser `scrollWidth` measurements at 375×812, 390×844, 600×900, 720×900, 768×1024, and 900×900 remain unverified here rather than being represented as assumed passes.

There is also no production domain or valid production Turnstile/Resend credential set available in this checkout. The local log-mode/API test is explicitly not a production Turnstile or mailbox-delivery verification. An operator with hosting/domain access must run the real-browser submission and delivery test described in `HOSTING.md`.

### 9.4 Hero video cold-load race verification

A regression suite was added at `tests/scroll-video-scene.race.test.tsx` (`npm test`). It renders the real `ScrollVideoScene` through React's server renderer and hydrates it in jsdom with `gsap`/`ScrollTrigger` stubbed (jsdom has no layout engine, so the pin math itself cannot run there; the ScrollTrigger config is asserted from the created trigger). The suite deterministically reproduces the cold-load ordering — media events dispatched on the SSR'd video *before* hydration — plus these cases:

1. Media events fired before hydration: video must become `is-ready` without a manual reload (fails on the pre-fix code; passes with the fix).
2. Metadata already present in the element but its event never re-fires: must still recover (fails pre-fix; passes post-fix).
3. Media events fired after hydration (warm-cache ordering): must stay working.
4. `ScrollTrigger.refresh()` is called exactly once when readiness flips (0 calls pre-fix because readiness never flipped).
5. The scene copy panels are not gated on media readiness.
6. After cold-load recovery, scrolling to 50% of the pinned range seeks the video to the matching frame (pre-fix every seek was skipped because `readyRef` never flipped).

Pre-fix the suite fails 3 tests (the exact reported failure modes); post-fix all 6 pass. `npm run build` and `npm run lint` also pass; the standalone production server serves `/`, both WebM assets with range requests and the immutable cache header.

Still not possible in this sandbox: a real browser with a fully cleared cache (there is no Chromium/Chrome binary and the Playwright/Chromium download CDN is unreachable here, same constraint as section 9.3). The jsdom suite exercises the real component and the real event-ordering race, but an operator should still do one genuine first-visit check against the deployed site (devtools → Application → Clear site data, or a fresh incognito window) to confirm the video fades in and scrubs with no manual reload.

## 10. Editing guidance

- Keep `/media` filenames versioned because of the immutable cache header.
- If changing a hero scene range, update both `lib/content.ts` and the scene/progress verification checks.
- Preserve WebGL cleanup and the visibility/page-visibility gates when changing effects.
- Preserve the mobile source media query at 600px unless the design breakpoint changes everywhere.
- Do not revert the hero video readiness handling in `ScrollVideoScene.tsx` to JSX-only media props (`onLoadedMetadata` etc.): the native listeners plus `readyState` checks are what make first-visit (cold cache) loads reliable.
- Run `npm test` after touching `ScrollVideoScene.tsx`; `tests/scroll-video-scene.race.test.tsx` is the regression suite for the cold-load race.
- Do not replace production email variables with defaults in code. Use `EMAIL_DELIVERY_MODE=log` for local dry-runs.
- If adding a new sidebar section, add both its DOM `id` and its `sections` entry in matching order.
