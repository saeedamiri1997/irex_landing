'use client';

import { useEffect, useRef } from 'react';
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl';
import { watchDevicePixelRatio } from '@/lib/dpr';

const PAD = 20;
const VERT = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;
const FRAG = `#version 300 es
precision highp float;
uniform vec2 uCenter; uniform vec2 uHalfSize; uniform float uRadius; uniform float uAngle; uniform float uPx;
uniform vec3 uLineColor; uniform vec3 uBaseColor; uniform float uIntensity; uniform float uShineSize;
uniform float uShineFade; uniform float uThickness; uniform float uBaseWidth; out vec4 fragColor;
float sdRoundedRect(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+r;return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}
float gaussianLine(float d,float sigma){float x=d/(sigma+1e-6);float k=mix(1.0,1.6,smoothstep(0.0,1.5,x));return exp(-k*x*x);}
void main(){vec2 p=gl_FragCoord.xy-uCenter;float d=sdRoundedRect(p,uHalfSize,uRadius);vec2 L=vec2(cos(uAngle),sin(uAngle));
float base=(1.0-smoothstep(0.0,uBaseWidth,abs(d)))*0.45;vec2 nEll=normalize(p/(uHalfSize*uHalfSize)+1e-6);
float phi=acos(clamp(abs(dot(nEll,L)),0.0,1.0));float rim=1.0-smoothstep(uShineSize-uShineFade,uShineSize+uShineFade+1e-4,phi);
float line=gaussianLine(d,uThickness);float edgeClamp=1.0-smoothstep(0.5*uPx,3.0*uPx,abs(d));float hi=line*rim*edgeClamp*uIntensity;
vec3 col=uBaseColor*base+uLineColor*hi;float a=clamp(base+hi,0.0,1.0);fragColor=vec4(col,a);}`;

function hexColor(hex: string) {
  const color = new Color(hex);
  return [color.r, color.g, color.b] as [number, number, number];
}

const cappedDpr = () => Math.min(window.devicePixelRatio || 1, 2);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export default function SpecularButton({ children, className = '', ...props }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    const fx = fxRef.current;
    if (!button || !fx) return;

    let dpr = cappedDpr();
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if ((geometry.attributes as unknown as Record<string, unknown>).uv) {
      delete (geometry.attributes as unknown as Record<string, unknown>).uv;
    }

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: { value: [0, 0] },
        uHalfSize: { value: [1, 1] },
        uRadius: { value: 10 * dpr },
        uAngle: { value: 2.4 },
        uPx: { value: dpr },
        uLineColor: { value: hexColor('#00B8C4') },
        uBaseColor: { value: hexColor('#394451') },
        uIntensity: { value: 0 },
        uShineSize: { value: 10 * Math.PI / 180 },
        uShineFade: { value: 40 * Math.PI / 180 },
        uThickness: { value: 1 * dpr },
        uBaseWidth: { value: dpr },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    fx.appendChild(gl.canvas);

    let width = 1;
    let height = 1;
    const resize = () => {
      const rect = button.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      renderer.dpr = dpr;
      renderer.setSize(width + PAD * 2, height + PAD * 2);
      program.uniforms.uCenter.value = [(PAD + width / 2) * dpr, (PAD + height / 2) * dpr];
      program.uniforms.uHalfSize.value = [(width / 2) * dpr, (height / 2) * dpr];
      program.uniforms.uPx.value = dpr;
      program.uniforms.uThickness.value = dpr;
      program.uniforms.uBaseWidth.value = dpr;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(button);
    resize();

    let pointerAngle: number | null = null;
    let proximity = 0;
    let angle = 2.4;
    let idle = 2.4;
    let bright = 0;
    let raf = 0;
    let last = performance.now();
    let isVisible = false;
    let isPageVisible = !document.hidden;

    const onMove = (event: PointerEvent) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      pointerAngle = Math.atan2(centerY - event.clientY, event.clientX - centerX);
      const t = Math.max(0, 1 - distance / 220);
      proximity = t * t * (3 - 2 * t);
    };

    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const update = (now: number) => {
      raf = 0;
      if (!isVisible || !isPageVisible) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      idle += 0.25 * dt;
      const target = pointerAngle ?? idle;
      const diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));
      bright += (proximity - bright) * (1 - Math.exp(-dt * 8));
      program.uniforms.uAngle.value = angle;
      program.uniforms.uRadius.value = Math.min(10, Math.min(width, height) / 2) * dpr;
      program.uniforms.uIntensity.value = 1.15 * bright;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(update);
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(update);
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) tryStart();
        else tryStop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(button);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onMove, { passive: true });

    const stopDprWatcher = watchDevicePixelRatio(() => {
      dpr = cappedDpr();
      resize();
    });

    return () => {
      tryStop();
      stopDprWatcher();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      if (gl.canvas.parentNode === fx) fx.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <button ref={buttonRef} className={`specular-button ${className}`} {...props}>
      <span ref={fxRef} className="specular-button__fx" aria-hidden="true" />
      <span className="specular-button__label">{children}</span>
    </button>
  );
}
