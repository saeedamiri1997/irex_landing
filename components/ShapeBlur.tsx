'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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

export default function ShapeBlur({ className = '' }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene(); const camera = new THREE.OrthographicCamera(); camera.position.z = 1;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setClearColor(0x000000, 0); mount.appendChild(renderer.domElement);
    const mouse = new THREE.Vector2(), damp = new THREE.Vector2(), res = new THREE.Vector2();
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true, uniforms: {
      u_mouse: { value: damp }, u_resolution: { value: res }, u_pixelRatio: { value: 1 }, u_color: { value: new THREE.Color('#00B8C4') },
      u_radius: { value: 32 }, u_borderSize: { value: 2 }, u_circleSize: { value: 360 }, u_circleEdge: { value: 220 },
    }});
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1,1), material); scene.add(quad);
    let w=1,h=1,raf=0,last=performance.now();
    const resize=()=>{w=mount.clientWidth;h=mount.clientHeight;const dpr=Math.min(devicePixelRatio||1,2);const style=getComputedStyle(mount);const radius=parseFloat(style.borderTopLeftRadius)||0;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);camera.left=-w/2;camera.right=w/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();quad.scale.set(w,h,1);res.set(w,h).multiplyScalar(dpr);material.uniforms.u_pixelRatio.value=dpr;material.uniforms.u_radius.value=radius*dpr;material.uniforms.u_borderSize.value=2*dpr;material.uniforms.u_circleSize.value=360*dpr;material.uniforms.u_circleEdge.value=220*dpr;};
    const onMove=(e:PointerEvent)=>{const r=mount.getBoundingClientRect();mouse.set(e.clientX-r.left,e.clientY-r.top);}; window.addEventListener('pointermove',onMove,{passive:true});
    const ro=new ResizeObserver(resize);ro.observe(mount);resize();
    const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.05);last=now;damp.x=THREE.MathUtils.damp(damp.x,mouse.x,8,dt);damp.y=THREE.MathUtils.damp(damp.y,mouse.y,8,dt);renderer.render(scene,camera);raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(raf);ro.disconnect();window.removeEventListener('pointermove',onMove);quad.geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);};
  },[]);
  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
