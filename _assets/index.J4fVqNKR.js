import{i as R,b as g}from"./canvas.C3MGOkoh.js";import{P as M,a as B,f as C}from"./canvas.C3MGOkoh.js";const p=Math.PI*2;function v(h){const i=Math.sin(h*12.9898)*43758.5453;return i-Math.floor(i)}const A=`#version 300 es
precision highp float;

layout(location = 0) in vec2 aFrom;
layout(location = 1) in vec2 aTo;
/* 形变常量：(错峰延迟, 带方向的弧线幅, 径向爆发幅, 弧线方向 ±1) */
layout(location = 2) in vec4 aData;
/* 观感常量：(怠速漂移幅 px, 尺寸档倍率, 素材明度 shade, 漂移相位) */
layout(location = 3) in vec4 aLook;
/* 素材本色（0..1 RGB），colorMode='vertex' 的形态消费，palette 形态忽略 */
layout(location = 4) in vec3 aColor;

uniform float uProgress;
uniform float uTime;
/* 归一化坐标 → CSS 像素的缩放与画布尺寸 */
uniform float uScale;
uniform vec2 uResolution;
/* 怠速漂移倍率（全局 × 形态 driftScale），静态帧置 0 */
uniform float uDrift;
uniform float uSizePx;
uniform float uPixelRatio;
uniform vec2 uPointer;
uniform float uPointerRadius;
uniform float uPointerPush;
uniform float uBreath;
/* 1 = 粒子用 aColor 本色，0 = 按明度在 uColorA/uColorB 间映射 */
uniform float uVertexColor;
/* 1 = 明度反转（duotone 版画效果，高调素材防过曝） */
uniform float uShadeFlip;

out float vShade;
out vec3 vRGB;
out float vTint;

void main() {
  float delay = aData.x;
  float local = clamp((uProgress - delay) / max(1.0 - delay, 0.0001), 0.0, 1.0);
  float t = local < 0.5
    ? 4.0 * local * local * local
    : 1.0 - pow(-2.0 * local + 2.0, 3.0) * 0.5;
  float envelope = sin(3.141592653589793 * t);

  /* 与 Canvas 2D 引擎 updateDisplayed 同一套数学：弧线 + 爆发 + 扭转 */
  vec2 delta = aTo - aFrom;
  float dist = max(length(delta), 0.0001);
  vec2 mid = aFrom + delta * t;
  float radial = max(length(mid), 0.0001);
  float arc = envelope * aData.y;
  float blast = envelope * aData.z;
  float twist = aData.w * blast * 0.38;

  float x = mid.x - (delta.y / dist) * arc + (mid.x / radial) * blast - (mid.y / radial) * twist;
  float y = mid.y + (delta.x / dist) * arc + (mid.y / radial) * blast + (mid.x / radial) * twist;

  /* 怠速漂移：aLook.x 以 CSS 像素计幅值（与 Canvas 引擎 driftAmp 同分布），
   * 但这里坐标还是归一化空间，必须先除以 uScale 换算，否则幅值会被
   * 乘进 uScale（×232）放大成满屏乱飞 —— 首版就是栽在这一步。 */
  float speed = 0.00018 + fract(sin(aLook.w * 41.0 + 9.0) * 43758.5453) * 0.00018;
  float drift = aLook.x * uDrift / max(uScale, 0.0001);
  x += cos(uTime * speed + aLook.w) * drift;
  y += sin(uTime * speed * 0.83 + aLook.w) * drift;

  vec2 screen = vec2(uResolution.x * 0.5, uResolution.y * 0.5) + vec2(x, y) * uScale * uBreath;

  if (uPointerRadius > 0.0) {
    vec2 d = screen - uPointer;
    float dd = length(d);
    if (dd > 0.0 && dd < uPointerRadius) {
      float strength = pow(1.0 - dd / uPointerRadius, 2.0) * uPointerPush;
      vec2 n = d / dd;
      screen += vec2(n.x * strength - n.y * strength * 0.4, n.y * strength + n.x * strength * 0.4);
    }
  }

  vec2 clip = screen / uResolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = max(1.0, uSizePx * aLook.y * uPixelRatio);

  vShade = mix(aLook.z, 1.0 - aLook.z, uShadeFlip);
  vRGB = aColor;
  vTint = 0.86 + fract(sin(aData.w * 67.0 + 23.0) * 43758.5453) * 0.28;
}
`,S=`#version 300 es
precision mediump float;

in float vShade;
in vec3 vRGB;
in float vTint;

uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uAlpha;
uniform float uVertexColor;

out vec4 outColor;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  float d = dot(uv, uv);
  /* 衰减曲线偏硬：d=0.32 就到全亮、0.85 处才熄掉，有效点径 ≈ 几何直径的 92%。
   * 软曲线（0.5→1.0）会把有效点径缩到 70%，点阵覆盖率上不去，
   * 照片模式的亮度会被深底从缝隙里吃掉一截。 */
  float a = (1.0 - smoothstep(0.32, 0.85, d)) * uAlpha * vTint;
  if (a < 0.004) discard;
  vec3 base = mix(mix(uColorA, uColorB, vShade), vRGB, uVertexColor);
  vec3 color = base * a; /* 预乘 alpha */
  outColor = vec4(color, a);
}
`;function b(h,i,s){const e=h.createShader(i);if(!e)throw new Error("createShader failed");if(h.shaderSource(e,s),h.compileShader(e),!h.getShaderParameter(e,h.COMPILE_STATUS)){const t=h.getShaderInfoLog(e);throw h.deleteShader(e),new Error(`shader compile failed: ${t??"unknown"}`)}return e}function f(h){const i=Math.sin(h*12.9898+78.233)*43758.5453;return i-Math.floor(i)}function m(h,i,s){return Math.min(Math.max(h,i),s)}class x{constructor(i,s={}){this.uniforms={},this.reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)"),this.finePointer=window.matchMedia("(pointer: fine)"),this.shapes=[],this.cache=new Map,this.cacheShapes=new Map,this.look=new Float32Array(0),this.started=!1,this.vertexColor=!1,this.shadeFlip=!1,this.fullFrameShape=!1,this.dotScale=1,this.scrubActive=!1,this.scrubProgress=0,this.scrubPair=-1,this.active=-1,this.currentDrift=1,this.transitionStart=0,this.transitionDuration=0,this.nextSwitchAt=0,this.manualUntil=0,this.paused=!1,this.visible=!0,this.running=!1,this.frameHandle=0,this.width=0,this.height=0,this.pixelRatio=1,this.pointerX=-1e5,this.pointerY=-1e5,this.pointerActive=!1,this.intersectionObserver=null,this.resizeObserver=null,this.handleElementResize=o=>{const u=o[0]?.contentRect;!u||u.width<1||u.height<1||this.applySize(u.width,u.height)},this.handleVisibility=()=>{document.hidden?this.cancelFrame():this.requestFrame()},this.handlePointerMove=o=>{const u=this.canvas.getBoundingClientRect();this.pointerX=o.clientX-u.left,this.pointerY=o.clientY-u.top,this.pointerActive=!0},this.handlePointerLeave=()=>{this.pointerActive=!1},this.handleMotionChange=()=>{this.nextSwitchAt=performance.now()+this.options.transitionMs+this.options.holdMs,this.requestFrame()},this.handleContextLost=o=>{o.preventDefault(),this.destroy(),this.callbacks.onContextLost?.()},this.animate=o=>{if(this.frameHandle=0,!this.started||document.hidden||!this.visible)return;if(this.scrubActive){this.render(o),!this.reducedMotion.matches&&!this.paused&&(this.frameHandle=requestAnimationFrame(this.animate));return}if(this.options.autoRotate&&!this.paused&&o>=this.nextSwitchAt&&o>=this.manualUntil){this.next();return}this.render(o);const u=o-this.transitionStart>=this.transitionDuration;!this.reducedMotion.matches&&(!this.paused||!u)&&(this.frameHandle=requestAnimationFrame(this.animate))};const e=s.powerPreference??"high-performance",t=i.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,powerPreference:e});if(!t)throw new Error("webgl2 unavailable");this.canvas=i,this.gl=t,this.mobile=R(),this.count=Math.max(200,Math.round(s.count??(this.mobile?16e3:42e3))),this.options={transitionMs:s.transitionMs??1500,holdMs:s.holdMs??2600,autoRotate:s.autoRotate??!0,palette:s.palette??[[45,212,191],[153,246,228]],dotRadius:s.dotRadius??1.1,glowAlpha:s.glowAlpha??.06,glowStrength:s.glowStrength??1,coreAlpha:s.coreAlpha??.9,drift:s.drift??1,scaleFill:s.scaleFill??(this.mobile?.4:.42),maxPixelRatio:s.maxPixelRatio??2,powerPreference:e,pointerPush:s.pointerPush??64,introScatter:s.introScatter??!1},this.callbacks={onShapeChange:s.onShapeChange,onContextLost:s.onContextLost};const r=t.createProgram();if(!r)throw new Error("createProgram failed");const n=b(t,t.VERTEX_SHADER,A),a=b(t,t.FRAGMENT_SHADER,S);if(t.attachShader(r,n),t.attachShader(r,a),t.linkProgram(r),t.deleteShader(n),t.deleteShader(a),!t.getProgramParameter(r,t.LINK_STATUS)){const o=t.getProgramInfoLog(r);throw t.deleteProgram(r),new Error(`program link failed: ${o??"unknown"}`)}this.program=r,t.useProgram(r);for(const o of["uProgress","uTime","uScale","uResolution","uDrift","uSizePx","uPixelRatio","uPointer","uPointerRadius","uPointerPush","uBreath","uVertexColor","uShadeFlip","uColorA","uColorB","uAlpha"])this.uniforms[o]=t.getUniformLocation(r,o);this.buffers={from:this.makeBuffer(),to:this.makeBuffer(),data:this.makeBuffer(),look:this.makeBuffer(),color:this.makeBuffer()},this.from=new Float32Array(this.count*2),this.to=new Float32Array(this.count*2);const c=t.createVertexArray();if(!c)throw new Error("createVertexArray failed");this.vao=c,t.bindVertexArray(c),this.bindAttribute(this.buffers.from,0,2),this.bindAttribute(this.buffers.to,1,2),this.bindAttribute(this.buffers.data,2,4),this.bindAttribute(this.buffers.look,3,4),this.bindAttribute(this.buffers.color,4,3),t.bindVertexArray(null),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE),t.clearColor(0,0,0,0),this.buildParticleConstants(),i.addEventListener("webglcontextlost",this.handleContextLost)}get shapesList(){return this.shapes}get activeIndex(){return this.active}get particleCount(){return this.count}makeBuffer(){const i=this.gl.createBuffer();if(!i)throw new Error("createBuffer failed");return i}bindAttribute(i,s,e){const t=this.gl;t.bindBuffer(t.ARRAY_BUFFER,i),t.bufferData(t.ARRAY_BUFFER,e*4*this.count,t.DYNAMIC_DRAW),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,e,t.FLOAT,!1,0,0)}buildParticleConstants(){const i=this.gl,s=new Float32Array(this.count*4),e=new Float32Array(this.count*4);for(let t=0;t<this.count;t+=1){const r=f(t*7+19)>.5?1:-1;s[t*4+0]=f(t*23+31)*.38,s[t*4+1]=(.03+f(t*11+3)*.065)*r,s[t*4+2]=.075+f(t*29+17)*.25,s[t*4+3]=r,e[t*4+0]=.55+f(t*37+5)*(this.mobile?.7:1.55);const n=f(t*67+23),a=n<.42?0:n<.82?1:n<.96?2:3;e[t*4+1]=[.62,.95,1.35,1.95][a],e[t*4+2]=1,e[t*4+3]=f(t*43+13)*p}i.bindBuffer(i.ARRAY_BUFFER,this.buffers.data),i.bufferData(i.ARRAY_BUFFER,s,i.STATIC_DRAW),i.bindBuffer(i.ARRAY_BUFFER,this.buffers.look),i.bufferData(i.ARRAY_BUFFER,e,i.STATIC_DRAW),this.look=e}setShapes(i,{keepActive:s=!1}={}){const e=this.shapes[this.active]?.key;this.shapes=i;for(const t of Array.from(this.cache.keys()))i.some(r=>r.key===t)||(this.cache.delete(t),this.cacheShapes.delete(t));for(const[t,r]of Array.from(this.cacheShapes)){const n=i.find(a=>a.key===t);n&&n!==r&&(this.cache.delete(t),this.cacheShapes.delete(t))}if(i.length){if(s&&e){const t=i.findIndex(r=>r.key===e);if(t>=0){t!==this.active&&this.goTo(t);return}}this.goTo(0)}}next(){this.shapes.length&&this.goTo((this.active+1)%this.shapes.length)}goTo(i,s=!1){const e=this.shapes[i];if(!e)return;const t=this.cloudOf(e);if(!t)return;this.started?this.from.set(this.to):(this.options.introScatter?this.fillScatter(this.from):this.from.set(t.positions),this.started=!0),this.to.set(t.positions);for(let a=0;a<this.count;a+=1)this.look[a*4+2]=t.shade[a];this.vertexColor=e.sample?.colorMode==="vertex",this.shadeFlip=e.sample?.lumaInvert===!0,this.fullFrameShape=e.sample?.fullFrame===!0,this.dotScale=e.sample?.dotScale??1,this.scrubPair=-1;const r=this.gl;r.bindBuffer(r.ARRAY_BUFFER,this.buffers.from),r.bufferSubData(r.ARRAY_BUFFER,0,this.from),r.bindBuffer(r.ARRAY_BUFFER,this.buffers.to),r.bufferSubData(r.ARRAY_BUFFER,0,this.to),r.bindBuffer(r.ARRAY_BUFFER,this.buffers.look),r.bufferSubData(r.ARRAY_BUFFER,0,this.look),r.bindBuffer(r.ARRAY_BUFFER,this.buffers.color),r.bufferSubData(r.ARRAY_BUFFER,0,t.colors),this.currentDrift=this.options.drift*(e.sample?.driftScale??1);const n=performance.now();this.transitionStart=n,this.transitionDuration=this.options.transitionMs,this.nextSwitchAt=n+this.options.transitionMs+this.options.holdMs,s&&(this.manualUntil=n+7e3),this.active=i,this.callbacks.onShapeChange?.(e,i),this.requestFrame()}fillScatter(i){for(let s=0;s<this.count;s+=1){const e=v(s*131+17)*p,t=1.15+v(s*197+29)*.75;i[s*2]=Math.cos(e)*t,i[s*2+1]=Math.sin(e)*t}}setPaused(i){this.paused=i,this.requestFrame()}setDotRadius(i){this.options.dotRadius=m(i,.5,6),this.requestFrame()}setScrubEnabled(i){this.scrubActive!==i&&(this.scrubActive=i,this.scrubPair=-1,this.scrubProgress=i?0:1,this.requestFrame())}scrub(i){const s=this.shapes.length-1;if(s<1)return;const e=m(i,0,s),t=Math.min(Math.floor(e),s-1),r=this.shapes[t+1],n=this.shapes[t],a=t*1e3+(t+1);if(a!==this.scrubPair){const o=this.cloudOf(n),u=this.cloudOf(r);if(!o||!u)return;this.from.set(o.positions),this.to.set(u.positions);for(let d=0;d<this.count;d+=1)this.look[d*4+2]=u.shade[d];const l=this.gl;l.bindBuffer(l.ARRAY_BUFFER,this.buffers.from),l.bufferSubData(l.ARRAY_BUFFER,0,this.from),l.bindBuffer(l.ARRAY_BUFFER,this.buffers.to),l.bufferSubData(l.ARRAY_BUFFER,0,this.to),l.bindBuffer(l.ARRAY_BUFFER,this.buffers.look),l.bufferSubData(l.ARRAY_BUFFER,0,this.look),l.bindBuffer(l.ARRAY_BUFFER,this.buffers.color),l.bufferSubData(l.ARRAY_BUFFER,0,u.colors),this.scrubPair=a,this.currentDrift=this.options.drift*(r.sample?.driftScale??1),this.vertexColor=r.sample?.colorMode==="vertex",this.fullFrameShape=r.sample?.fullFrame===!0,this.shadeFlip=r.sample?.lumaInvert===!0}this.scrubProgress=e-t;const c=Math.round(e);c!==this.active&&(this.active=c,this.callbacks.onShapeChange?.(this.shapes[c],c)),this.requestFrame()}cloudOf(i){const s=this.cache.get(i.key);if(s&&this.cacheShapes.get(i.key)===i)return s;const e=g(i.source,{count:this.count,...i.sample});if(!e)return null;const t={positions:e.positions,shade:e.shade,colors:e.colors};return this.cache.set(i.key,t),this.cacheShapes.set(i.key,i),t}start(){this.running||(this.running=!0,document.addEventListener("visibilitychange",this.handleVisibility),this.reducedMotion.addEventListener?.("change",this.handleMotionChange),this.finePointer.matches&&(this.canvas.addEventListener("pointermove",this.handlePointerMove),this.canvas.addEventListener("pointerleave",this.handlePointerLeave)),"IntersectionObserver"in window&&(this.intersectionObserver=new IntersectionObserver(i=>{this.visible=i[0]?.isIntersecting??!0,this.visible?this.requestFrame():this.cancelFrame()},{threshold:.08}),this.intersectionObserver.observe(this.canvas)),"ResizeObserver"in window&&(this.resizeObserver=new ResizeObserver(this.handleElementResize),this.resizeObserver.observe(this.canvas)),this.resize(),this.requestFrame())}destroy(){this.running=!1,this.cancelFrame(),document.removeEventListener("visibilitychange",this.handleVisibility),this.reducedMotion.removeEventListener?.("change",this.handleMotionChange),this.canvas.removeEventListener("pointermove",this.handlePointerMove),this.canvas.removeEventListener("pointerleave",this.handlePointerLeave),this.canvas.removeEventListener("webglcontextlost",this.handleContextLost),this.intersectionObserver?.disconnect(),this.intersectionObserver=null,this.resizeObserver?.disconnect(),this.resizeObserver=null,this.cache.clear(),this.cacheShapes.clear(),this.shapes=[],this.started=!1}resize(){const i=this.canvas.getBoundingClientRect();i.width<1||i.height<1||this.applySize(i.width,i.height)}applySize(i,s){const e=Math.max(1,Math.round(i)),t=Math.max(1,Math.round(s)),r=Math.min(window.devicePixelRatio||1,this.options.maxPixelRatio);this.width=e,this.height=t,this.pixelRatio=r;const n=Math.max(1,Math.round(e*r)),a=Math.max(1,Math.round(t*r));(this.canvas.width!==n||this.canvas.height!==a)&&(this.canvas.width=n,this.canvas.height=a,this.gl.viewport(0,0,n,a)),this.requestFrame()}requestFrame(){if(!(this.frameHandle||!this.started||document.hidden||!this.visible)){if(this.reducedMotion.matches){this.render(performance.now(),!0);return}this.frameHandle=requestAnimationFrame(this.animate)}}cancelFrame(){this.frameHandle&&cancelAnimationFrame(this.frameHandle),this.frameHandle=0}render(i,s=!1){const e=this.gl,t=this.uniforms;if(!this.width||!this.height)return;const r=s?1:this.scrubActive?this.scrubProgress:this.transitionDuration<=0?1:m((i-this.transitionStart)/this.transitionDuration,0,1),n=s?1:1+Math.sin(i*52e-5)*.006;e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.program),e.bindVertexArray(this.vao),e.blendFunc(e.ONE,this.vertexColor||this.fullFrameShape?e.ONE_MINUS_SRC_ALPHA:e.ONE),e.uniform1f(t.uVertexColor,this.vertexColor?1:0),e.uniform1f(t.uShadeFlip,this.shadeFlip?1:0),e.uniform1f(t.uProgress,r),e.uniform1f(t.uTime,i),e.uniform1f(t.uScale,Math.min(this.width,this.height)*this.options.scaleFill),e.uniform2f(t.uResolution,this.width,this.height),e.uniform1f(t.uDrift,s?0:this.currentDrift),e.uniform1f(t.uPixelRatio,this.pixelRatio),e.uniform2f(t.uPointer,this.pointerActive&&!s?this.pointerX:-1e5,this.pointerActive&&!s?this.pointerY:-1e5),e.uniform1f(t.uPointerRadius,Math.min(this.width,this.height)*.24),e.uniform1f(t.uPointerPush,this.options.pointerPush),e.uniform1f(t.uBreath,n);const[a,c]=this.options.palette;e.uniform3f(t.uColorA,a[0]/255,a[1]/255,a[2]/255),e.uniform3f(t.uColorB,c[0]/255,c[1]/255,c[2]/255);const o=this.options.glowAlpha*this.options.glowStrength;o>0&&(e.uniform1f(t.uSizePx,this.options.dotRadius*this.dotScale*3.2),e.uniform1f(t.uAlpha,o),e.drawArrays(e.POINTS,0,this.count)),e.uniform1f(t.uSizePx,this.options.dotRadius*this.dotScale),e.uniform1f(t.uAlpha,this.options.coreAlpha),e.drawArrays(e.POINTS,0,this.count),e.bindVertexArray(null)}}function P(h,i={}){if(typeof document>"u"||!h.getContext||!document.createElement("canvas").getContext("webgl2"))return null;try{return new x(h,i)}catch(e){return console.warn("[morph-gpu] init failed, falling back to canvas 2d",e),null}}export{M as ParticleMorph,x as ParticleMorphGpu,g as buildPointCloud,B as buildPoints,P as createParticleMorphGpu,C as fillRoundRect,R as isMobileLayout};
