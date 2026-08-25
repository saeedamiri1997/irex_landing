/**
 * Regression test for the cold-load hero video race.
 *
 * Failure mode (reported): on a genuine first visit (empty HTTP cache) the hero
 * scroll-scrub video stays at opacity 0 ("blank") and never scrubs; a manual
 * reload fixes it because the media then comes from the browser cache.
 *
 * Root cause of the race: with `preload="auto"` the browser starts fetching
 * the WebM as soon as the SSR'd <video> is parsed — i.e. BEFORE the Next.js
 * bundle finishes downloading/parsing and React hydrates. Media events
 * (`loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`) that fire
 * before hydration are permanently missed by the JSX `onLoadedMetadata` props
 * (React attaches those listeners only at hydration/commit), so the `ready`
 * gate never flips: `is-ready` is never applied (the video stays at
 * `opacity: 0`) and `scrubToScroll` keeps skipping seeks because
 * `readyRef.current` stays false.
 *
 * These tests simulate that ordering deterministically against the real
 * component. gsap/ScrollTrigger are stubbed because jsdom has no layout/scroll
 * engine; what matters here is the media-readiness path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import type { ReactElement } from 'react';
import ScrollVideoScene from '@/components/ScrollVideoScene';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  create: vi.fn(),
  context: vi.fn(),
}));

vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    utils: {
      clamp: (min: number, max: number, value: number) => Math.min(max, Math.max(min, value)),
    },
    context: mocks.context,
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    create: mocks.create,
    refresh: mocks.refresh,
  },
}));

let rafQueue: FrameRequestCallback[] = [];
let rafId = 0;

beforeEach(() => {
  rafQueue = [];
  rafId = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    rafId += 1;
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});

  mocks.create.mockReturnValue({});
  mocks.context.mockImplementation((fn: () => void) => {
    fn();
    return { revert: vi.fn() };
  });
  mocks.refresh.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function pumpFrames(count: number) {
  for (let i = 0; i < count; i += 1) {
    const frame = rafQueue.shift();
    if (!frame) return;
    act(() => frame(performance.now()));
  }
}

/** Simulate the video element having already received media data. */
function markVideoLoaded(video: HTMLVideoElement, readyState = 4) {
  Object.defineProperty(video, 'readyState', { value: readyState, configurable: true });
  Object.defineProperty(video, 'networkState', { value: 2, configurable: true });
}

function dispatchLoadedEvents(video: HTMLVideoElement) {
  video.dispatchEvent(new Event('loadedmetadata'));
  video.dispatchEvent(new Event('loadeddata'));
  video.dispatchEvent(new Event('canplaythrough'));
}

function renderSSR() {
  const html = renderToString(<ScrollVideoScene /> as ReactElement);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function videoOf(container: HTMLElement) {
  const video = container.querySelector('video');
  if (!video) throw new Error('video element not found');
  return video;
}

function hydrate(container: HTMLElement) {
  let root: Root | undefined;
  act(() => {
    root = hydrateRoot(container, <ScrollVideoScene /> as ReactElement);
  });
  return () => act(() => root?.unmount());
}

describe('ScrollVideoScene hero video readiness race', () => {
  it('recovers when media events fired before hydration (cold-load ordering)', () => {
    // COLD-LOAD SEQUENCE: the browser parsed <video preload="auto"> from the
    // SSR HTML and already fetched the WebM metadata; loadedmetadata/loadeddata
    // were dispatched BEFORE React attached its JSX handlers.
    const container = renderSSR();
    const video = videoOf(container);
    markVideoLoaded(video);
    dispatchLoadedEvents(video);

    // React hydrates after the media events were missed.
    const unmount = hydrate(container);
    pumpFrames(2);

    // The video must become visible without a manual reload.
    expect(video.classList.contains('is-ready')).toBe(true);

    unmount();
    container.remove();
  });

  it('recovers when metadata is already present but its event never re-fires', () => {
    // Worst case of the missed-event race: media data is sitting in the
    // element (browser cache / fast delivery) but no media event ever fires
    // again after hydration.
    const container = renderSSR();
    const video = videoOf(container);
    markVideoLoaded(video, 2);

    const unmount = hydrate(container);
    pumpFrames(2);

    expect(video.classList.contains('is-ready')).toBe(true);

    unmount();
    container.remove();
  });

  it('flips ready when media events fire after hydration (warm-cache ordering)', () => {
    const container = renderSSR();
    const video = videoOf(container);
    const unmount = hydrate(container);

    markVideoLoaded(video);
    act(() => dispatchLoadedEvents(video));
    pumpFrames(2);

    expect(video.classList.contains('is-ready')).toBe(true);

    unmount();
    container.remove();
  });

  it('refreshes ScrollTrigger exactly once when ready flips', () => {
    const container = renderSSR();
    const video = videoOf(container);
    const unmount = hydrate(container);

    markVideoLoaded(video);
    act(() => dispatchLoadedEvents(video));
    pumpFrames(2);

    expect(mocks.refresh).toHaveBeenCalledTimes(1);

    unmount();
    container.remove();
  });

  it('does not gate the copy panels on media readiness', () => {
    const container = renderSSR();
    const unmount = hydrate(container);

    const activePanel = container.querySelector('.scene-copy--panel.is-active');
    expect(activePanel).not.toBeNull();

    unmount();
    container.remove();
  });

  it('scrubs to the correct frame after cold-load recovery', () => {
    const container = renderSSR();
    const video = videoOf(container);

    // Cold load: media events were already missed before hydration.
    markVideoLoaded(video);
    dispatchLoadedEvents(video);
    const unmount = hydrate(container);
    pumpFrames(2);

    // ScrollTrigger was created with the expected pin configuration.
    const triggerVars = mocks.create.mock.calls[0][0] as {
      pin: boolean;
      end: string;
      onUpdate: (self: { progress: number }) => void;
    };
    expect(triggerVars.pin).toBe(true);
    expect(triggerVars.end).toBe('+=520%');

    // Scroll to the middle of the pinned range; the scrub loop must seek the
    // video to the matching frame instead of skipping it (the pre-fix bug
    // skipped every seek because `readyRef.current` never flipped).
    act(() => triggerVars.onUpdate({ progress: 0.5 }));
    Object.defineProperty(video, 'duration', { value: 25, configurable: true });
    video.currentTime = 0;
    pumpFrames(2);

    expect(video.currentTime).toBeGreaterThan(10);
    expect(video.currentTime).toBeLessThan(15);

    unmount();
    container.remove();
  });
});
