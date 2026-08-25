/**
 * Regression coverage for the pinned hero's two media branches.
 *
 * Desktop/tablet still use a scroll-scrubbed WebM and retain the cold-load
 * readiness guard. At <=600px the server initially renders neither media
 * branch, then the client mounts only the portrait image stack. This prevents
 * a mobile browser from discovering or requesting a video before hydration.
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
let mobileViewport = false;
let mediaReadyState = 0;
const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();
const readyStateDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState');
const networkStateDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'networkState');

beforeEach(() => {
  rafQueue = [];
  rafId = 0;
  mobileViewport = false;
  mediaReadyState = 0;
  mediaQueryListeners.clear();

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    rafId += 1;
    return rafId;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return mobileViewport;
    },
    media: '(max-width: 600px)',
    addEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') mediaQueryListeners.add(listener);
    },
    removeEventListener: (event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') mediaQueryListeners.delete(listener);
    },
  }));

  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => mediaReadyState,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'networkState', {
    configurable: true,
    get: () => 2,
  });
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);

  mocks.create.mockReturnValue({});
  mocks.context.mockImplementation((fn: () => void) => {
    fn();
    return { revert: vi.fn() };
  });
  mocks.refresh.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (readyStateDescriptor) Object.defineProperty(HTMLMediaElement.prototype, 'readyState', readyStateDescriptor);
  if (networkStateDescriptor) Object.defineProperty(HTMLMediaElement.prototype, 'networkState', networkStateDescriptor);
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

function setMobileViewport(next: boolean) {
  mobileViewport = next;
  act(() => {
    mediaQueryListeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
  });
}

function sourceOf(element: Element | null) {
  return decodeURIComponent(element?.getAttribute('src') ?? '');
}

describe('ScrollVideoScene media branches', () => {
  it('keeps all media out of SSR markup until the client selects its viewport branch', () => {
    const container = renderSSR();

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.scene-media__image-stack')).toBeNull();

    container.remove();
  });

  it('recovers desktop readiness when metadata is already available on a cold load', () => {
    // The desktop <video> now mounts after hydration, but still needs to make
    // its opacity/readiness transition safely if metadata is already present.
    mediaReadyState = 4;
    const container = renderSSR();
    const unmount = hydrate(container);
    const video = videoOf(container);
    pumpFrames(2);

    expect(video.classList.contains('is-ready')).toBe(true);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);

    unmount();
    container.remove();
  });

  it('keeps desktop video readiness working when media events arrive after hydration', () => {
    const container = renderSSR();
    const unmount = hydrate(container);
    const video = videoOf(container);

    mediaReadyState = 4;
    act(() => video.dispatchEvent(new Event('canplaythrough')));
    pumpFrames(2);

    expect(video.classList.contains('is-ready')).toBe(true);

    unmount();
    container.remove();
  });

  it('scrubs the desktop video to the current ScrollTrigger progress once ready', () => {
    mediaReadyState = 4;
    const container = renderSSR();
    const unmount = hydrate(container);
    const video = videoOf(container);
    pumpFrames(2);

    const triggerVars = mocks.create.mock.calls[0][0] as {
      pin: boolean;
      end: string;
      onUpdate: (self: { progress: number }) => void;
    };
    expect(triggerVars.pin).toBe(true);
    expect(triggerVars.end).toBe('+=520%');

    act(() => triggerVars.onUpdate({ progress: 0.5 }));
    Object.defineProperty(video, 'duration', { value: 25, configurable: true });
    video.currentTime = 0;
    pumpFrames(2);

    expect(video.currentTime).toBeGreaterThan(10);
    expect(video.currentTime).toBeLessThan(15);

    unmount();
    container.remove();
  });

  it('mounts the five mapped static frames and no video on mobile', () => {
    setMobileViewport(true);
    const container = renderSSR();
    const unmount = hydrate(container);

    expect(container.querySelector('video')).toBeNull();
    expect(rafQueue).toHaveLength(0);
    expect([...container.querySelectorAll('.scene-media__image')].map((image) => sourceOf(image))).toEqual(expect.arrayContaining([
      expect.stringContaining('/media/frame-01-rocks-916.webp'),
      expect.stringContaining('/media/frame-02-topography-916.webp'),
      expect.stringContaining('/media/frame-03-cross-section-916.webp'),
      expect.stringContaining('/media/frame-04-diorama-916.webp'),
      expect.stringContaining('/media/frame-05-layers-916.webp'),
    ]));
    expect(sourceOf(container.querySelector('.scene-media__image.is-active'))).toContain('/media/frame-01-rocks-916.webp');

    unmount();
    container.remove();
  });

  it('uses mobile ScrollTrigger progress to change the active frame and copy panel', () => {
    setMobileViewport(true);
    const container = renderSSR();
    const unmount = hydrate(container);

    const triggerVars = mocks.create.mock.calls[0][0] as {
      pin: boolean;
      end: string;
      onUpdate: (self: { progress: number }) => void;
    };
    expect(triggerVars.pin).toBe(true);
    expect(triggerVars.end).toBe('+=520%');

    act(() => triggerVars.onUpdate({ progress: 0.5 }));

    expect(container.querySelector('.scene-copy--panel.is-active')?.getAttribute('data-scene')).toBe('first-principles');
    expect(sourceOf(container.querySelector('.scene-media__image.is-active'))).toContain('/media/frame-03-cross-section-916.webp');
    expect(container.querySelector('video')).toBeNull();

    unmount();
    container.remove();
  });

  it('unmounts desktop video when a viewport switches into the mobile branch', () => {
    const container = renderSSR();
    const unmount = hydrate(container);
    expect(container.querySelector('video')).not.toBeNull();

    setMobileViewport(true);

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelectorAll('.scene-media__image')).toHaveLength(5);

    unmount();
    container.remove();
  });
});
