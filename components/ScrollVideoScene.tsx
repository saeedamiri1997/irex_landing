'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { narrativeVideo, videoScenes } from '@/lib/content';
import SpecularButton from './SpecularButton';

gsap.registerPlugin(ScrollTrigger);

const NARRATIVE_DURATION = 25;
const MIN_VIDEO_SEEK_DELTA = 0.04;
const MIN_VIDEO_SEEK_INTERVAL_MS = 1000 / 30;
const MOBILE_MEDIA_QUERY = '(max-width: 600px)';
/** HTMLMediaElement.HAVE_METADATA — metadata (duration/dimensions) is available. */
const HAVE_METADATA = 1;
/** HTMLMediaElement.HAVE_CURRENT_DATA — data for the current playback position is available. */
const HAVE_CURRENT_DATA = 2;

export default function ScrollVideoScene({ onApply }: { onApply?: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readyRef = useRef(false);
  const activeIndexRef = useRef(0);
  const targetProgressRef = useRef(0);
  // Keep media out of the SSR markup until the browser has told us which
  // branch applies. This is essential: CSS-only hiding would still let mobile
  // browsers request a video before hydration.
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const progressStops = useMemo(
    () => videoScenes.map((scene) => ({ start: scene.start / NARRATIVE_DURATION, end: scene.end / NARRATIVE_DURATION })),
    [],
  );

  useEffect(() => {
    const query = window.matchMedia?.(MOBILE_MEDIA_QUERY);
    if (!query) {
      setIsMobile(false);
      return;
    }

    const updateMediaBranch = () => setIsMobile(query.matches);
    updateMediaBranch();
    query.addEventListener('change', updateMediaBranch);
    return () => query.removeEventListener('change', updateMediaBranch);
  }, []);

  /**
   * Flip the desktop-media ready gate exactly once. The gate controls both the
   * video's opacity (`is-ready`) and the seeks in `scrubToScroll`.
   */
  const markReady = useCallback(() => {
    if (readyRef.current) return false;
    readyRef.current = true;
    setReady(true);
    return true;
  }, []);

  // ScrollTrigger drives panel selection for both media branches. On mobile it
  // remains responsible for pinning/progress, but has no video work to do.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

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
          targetProgressRef.current = self.progress;
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

    return () => ctx.revert();
  }, [progressStops]);

  // This effect is deliberately desktop/tablet-only. The mobile branch mounts
  // no <video>, attaches no media listeners, polls no readyState, and performs
  // no requestAnimationFrame seeking.
  useEffect(() => {
    if (isMobile !== false) return;

    const video = videoRef.current;
    if (!video) return;

    readyRef.current = false;
    setReady(false);

    // React does not serialize `muted` into SSR HTML, so declaring it in JSX
    // triggers a hydration mismatch warning; set it as a DOM property instead.
    video.muted = true;

    let raf = 0;
    let lastSeekAt = -Infinity;

    const handleMediaReady = () => {
      // The pin range is stable, but a refresh synchronizes the current scroll
      // progress after a media-ready transition exactly once.
      if (markReady()) ScrollTrigger.refresh();
    };

    const scrubToScroll = (now: number) => {
      // Safety net: metadata may have arrived before these native listeners.
      if (!readyRef.current && video.readyState >= HAVE_METADATA) handleMediaReady();

      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : NARRATIVE_DURATION;
      const targetTime = gsap.utils.clamp(0, duration, targetProgressRef.current * duration);
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

    // Native listeners are retained for cold-cache desktop loads. Unlike JSX
    // event props, readyState is also inspected immediately and on each frame.
    const mediaEvents = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'] as const;
    mediaEvents.forEach((event) => video.addEventListener(event, handleMediaReady));

    if (video.readyState >= HAVE_METADATA) handleMediaReady();

    if (video.readyState < HAVE_METADATA && (video.networkState === 0 || video.networkState === 1)) {
      video.load();
    }

    raf = requestAnimationFrame(scrubToScroll);

    return () => {
      cancelAnimationFrame(raf);
      mediaEvents.forEach((event) => video.removeEventListener(event, handleMediaReady));
    };
  }, [isMobile, markReady]);

  return (
    <section id="hero" ref={sectionRef} className="video-scene video-scene--narrative">
      <div className="scene-media" aria-hidden="true">
        {isMobile === true && (
          <div className="scene-media__image-stack">
            {videoScenes.map((scene, index) => (
              <Image
                key={scene.mobileImage}
                className={`scene-media__image ${activeIndex === index ? 'is-active' : ''}`}
                src={scene.mobileImage}
                alt=""
                fill
                sizes="100vw"
                priority={index === 0}
              />
            ))}
          </div>
        )}
        {isMobile === false && (
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            className={ready ? 'is-ready' : ''}
          >
            <source src={narrativeVideo} type="video/webm" />
          </video>
        )}
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
