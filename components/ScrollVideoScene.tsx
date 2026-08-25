'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { narrativeMobileVideo, narrativeVideo, videoScenes } from '@/lib/content';
import SpecularButton from './SpecularButton';

gsap.registerPlugin(ScrollTrigger);

const NARRATIVE_DURATION = 25;
const MIN_VIDEO_SEEK_DELTA = 0.04;
const MIN_VIDEO_SEEK_INTERVAL_MS = 1000 / 30;
/** HTMLMediaElement.HAVE_METADATA — metadata (duration/dimensions) is available. */
const HAVE_METADATA = 1;
/** HTMLMediaElement.HAVE_CURRENT_DATA — data for the current playback position is available. */
const HAVE_CURRENT_DATA = 2;

export default function ScrollVideoScene({ onApply }: { onApply?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readyRef = useRef(false);
  const activeIndexRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const progressStops = useMemo(
    () => videoScenes.map((scene) => ({ start: scene.start / NARRATIVE_DURATION, end: scene.end / NARRATIVE_DURATION })),
    [],
  );

  /**
   * Flip the media-ready gate exactly once. The gate controls both the video's
   * opacity (`is-ready`) and the seeks in `scrubToScroll`, so it must never be
   * able to get stuck at false. Returns true only on the transition so
   * follow-up work (ScrollTrigger refresh) runs once.
   */
  const markReady = useCallback(() => {
    if (readyRef.current) return false;
    readyRef.current = true;
    setReady(true);
    return true;
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // React does not serialize `muted` into SSR HTML, so declaring it in JSX
    // triggers a hydration mismatch warning; set it as a DOM property instead.
    video.muted = true;

    let targetProgress = 0;
    let raf = 0;
    let lastSeekAt = -Infinity;

    const handleMediaReady = () => {
      // Once the media is available, re-sync ScrollTrigger. The pin range
      // itself is stable (the video is absolutely positioned and `+=520%` is
      // relative to the viewport), but this defensively covers any layout
      // shift that happened while the media was still loading (fonts,
      // preloader unlock, scrollbar appearance) and re-syncs progress.
      if (markReady()) ScrollTrigger.refresh();
    };

    const scrubToScroll = (now: number) => {
      // Safety net: poll readyState so readiness can never be lost even if a
      // media event fired before hydration and never re-fires.
      if (!readyRef.current && video.readyState >= HAVE_METADATA) handleMediaReady();

      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : NARRATIVE_DURATION;
      const targetTime = gsap.utils.clamp(0, duration, targetProgress * duration);
      const timeSinceLastSeek = now - lastSeekAt;

      if (
        readyRef.current
        && video.readyState >= HAVE_CURRENT_DATA
        && timeSinceLastSeek >= MIN_VIDEO_SEEK_INTERVAL_MS
        && Math.abs(targetTime - video.currentTime) >= MIN_VIDEO_SEEK_DELTA
      ) {
        video.currentTime = targetTime;
        lastSeekAt = now;
      }

      raf = requestAnimationFrame(scrubToScroll);
    };

    const ctx = gsap.context(() => {
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
          const nextIndex = progressStops.findIndex((stop, index) => {
            const isLast = index === progressStops.length - 1;
            return self.progress >= stop.start && (isLast ? self.progress <= 1 : self.progress < stop.end);
          });

          if (nextIndex >= 0 && activeIndexRef.current !== nextIndex) {
            activeIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
          }
        },
      });
    }, section);

    // Attach media listeners natively. `preload="auto"` means the browser can
    // start fetching the SSR'd <video> before React hydrates, so the JSX
    // `onLoadedMetadata` handlers alone can permanently miss the events on a
    // cold load (video then stays at opacity 0 and never scrubs — the bug).
    const mediaEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'] as const;
    mediaEvents.forEach((event) => video.addEventListener(event, handleMediaReady));

    // Cold-load recovery: if the media had already loaded by the time React
    // hydrated, read the current readyState instead of waiting for an event
    // that already fired.
    if (video.readyState >= HAVE_METADATA) handleMediaReady();

    // If resource selection never started (deferred/stalled, e.g. low-power
    // mode or a browser that paused preload), re-kick it now that our
    // listeners are attached so the media events fire deterministically.
    if (video.readyState < HAVE_METADATA && (video.networkState === 0 || video.networkState === 1)) {
      video.load();
    }

    raf = requestAnimationFrame(scrubToScroll);

    return () => {
      cancelAnimationFrame(raf);
      mediaEvents.forEach((event) => video.removeEventListener(event, handleMediaReady));
      ctx.revert();
    };
  }, [progressStops, markReady]);

  return (
    <section id="hero" ref={sectionRef} className="video-scene video-scene--narrative">
      <div className="scene-media" aria-hidden="true">
        <video
          ref={videoRef}
          playsInline
          preload="auto"
          className={ready ? 'is-ready' : ''}
        >
          <source src={narrativeMobileVideo} type="video/webm" media="(max-width: 600px)" />
          <source src={narrativeVideo} type="video/webm" />
        </video>
        <div className="scene-vignette" />
      </div>

      <div className="scene-copy-stack">
        {videoScenes.map((scene, index) => (
          <article
            key={scene.id}
            data-scene={scene.id}
            className={`scene-copy scene-copy--panel ${activeIndex === index ? 'is-active' : ''}`}
            aria-hidden={activeIndex !== index}
          >
            {scene.eyebrow && (
              <div className="scene-kicker">
                <span className="eyebrow">{scene.eyebrow}</span>
              </div>
            )}
            {scene.statements && scene.statements.length > 0 && (
              <div className="scene-intro">
                {scene.label && <span className="scene-intro__label">{scene.label}</span>}
                {scene.statements.map((line) => (
                  <p className="scene-intro__statement" key={line}>{line}</p>
                ))}
                {scene.preIntro && <p className="scene-intro__body">{scene.preIntro}</p>}
              </div>
            )}
            <h1>{scene.title}</h1>
            {scene.body && <p className="scene-lead">{scene.body}</p>}
            {scene.highlights
              ?.filter((line) => !scene.blocks?.some((block) => block.body?.includes(line)))
              .map((line) => <p className="scene-highlight" key={line}>{line}</p>)}

            {scene.blocks?.map((block, blockIndex) => (
              <div className="scene-text-block" key={`${scene.id}-${blockIndex}`}>
                {block.heading && <h2>{block.heading}</h2>}
                {block.body?.map((line) => (
                  <p className={scene.highlights?.includes(line) ? 'scene-highlight' : undefined} key={line}>
                    {line}
                  </p>
                ))}
              </div>
            ))}

            {scene.listIntro && <p className="scene-list-intro">{scene.listIntro}</p>}
            {scene.bullets && (
              <ul className="scene-bullets">
                {scene.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            )}
            {scene.closing && <p className="scene-closing">{scene.closing}</p>}
            {scene.coreLine && !scene.cta && <p className="scene-core-line">{scene.coreLine}</p>}

            {scene.cta && onApply && (
              <div className="hero-actions">
                <SpecularButton onClick={onApply}>
                  Apply to Join <span aria-hidden="true">↗</span>
                </SpecularButton>
                <span className="microcopy">Limited Early Adopter Program</span>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
