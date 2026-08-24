'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { watchDevicePixelRatio } from '@/lib/dpr';

const vertexShader = `varying vec2 v_texcoord; void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);v_texcoord=uv;}`;
const fragmentShader = `
varying vec2 v_texcoord; uniform vec2 u_mouse; uniform vec2 u_resolution; uniform float u_pixelRatio; uniform vec3 u_color;
uniform float u_radius; uniform float u_borderSize; uniform float u_circleSize; uniform float u_circleEdge;
float sdRoundRect(vec2 p, vec2 b, float r){vec2 q=abs(p)-b+vec2(r);return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;}
void main(){
  vec2 p=gl_FragCoord.xy;
  vec2 halfSize=(u_resolution.xy-vec2(u_borderSize))*0.5;
  vec2 local=p-u_resolution.xy*0.5;
  float sdf=sdRoundRect(local,halfSize,max(u_radius-u_borderSize*.5,0.0));
  float aa=max(length(vec2(dFdx(sdf),dFdy(sdf)))*1.35,1.0);
  float border=1.0-smoothstep(u_borderSize*.5-aa,u_borderSize*.5+aa,abs(sdf));
  vec2 mouse=u_mouse*u_pixelRatio;
  float proximity=1.0-smoothstep(u_circleSize,u_circleSize+u_circleEdge,distance(p,mouse));
  float alpha=border*(0.34+proximity*0.66);
  gl_FragColor=vec4(u_color,alpha);
}`;

const cappedDpr = () => Math.min(window.devicePixelRatio || 1, 2);

export default function ShapeBlur({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2();
    const damp = new THREE.Vector2();
    const resolution = new THREE.Vector2();
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        u_mouse: { value: damp },
        u_resolution: { value: resolution },
        u_pixelRatio: { value: 1 },
        u_color: { value: new THREE.Color('#00B8C4') },
        u_radius: { value: 32 },
        u_borderSize: { value: 2 },
        u_circleSize: { value: 360 },
        u_circleEdge: { value: 220 },
      },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    scene.add(quad);

    let width = 1;
    let height = 1;
    let raf = 0;
    let last = performance.now();
    let isVisible = false;
    let isPageVisible = !document.hidden;

    const resize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      const dpr = cappedDpr();
      const style = getComputedStyle(mount);
      const radius = parseFloat(style.borderTopLeftRadius) || 0;

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      quad.scale.set(width, height, 1);

      resolution.set(width, height).multiplyScalar(dpr);
      material.uniforms.u_pixelRatio.value = dpr;
      material.uniforms.u_radius.value = radius * dpr;
      material.uniforms.u_borderSize.value = 2 * dpr;
      material.uniforms.u_circleSize.value = 360 * dpr;
      material.uniforms.u_circleEdge.value = 220 * dpr;
    };

    const onMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.set(event.clientX - rect.left, event.clientY - rect.top);
    };

    const tryStop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (!isVisible || !isPageVisible) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      damp.x = THREE.MathUtils.damp(damp.x, mouse.x, 8, dt);
      damp.y = THREE.MathUtils.damp(damp.y, mouse.y, 8, dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();
    window.addEventListener('pointermove', onMove, { passive: true });

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) tryStart();
        else tryStop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(mount);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const stopDprWatcher = watchDevicePixelRatio(resize);

    return () => {
      tryStop();
      stopDprWatcher();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
