import{i as I,b as O}from"./canvas.BTpO8cze.js";const E=Math.PI*2;function P(l){const i=Math.sin(l*12.9898)*43758.5453;return i-Math.floor(i)}const Y=`#version 300 es
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
`,z=`#version 300 es
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
`;function B(l,i,s){const e=l.createShader(i);if(!e)throw new Error("createShader failed");if(l.shaderSource(e,s),l.compileShader(e),!l.getShaderParameter(e,l.COMPILE_STATUS)){const t=l.getShaderInfoLog(e);throw l.deleteShader(e),new Error(`shader compile failed: ${t??"unknown"}`)}return e}function v(l){const i=Math.sin(l*12.9898+78.233)*43758.5453;return i-Math.floor(i)}function A(l,i,s){return Math.min(Math.max(l,i),s)}class V{constructor(i,s={}){this.uniforms={},this.reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)"),this.finePointer=window.matchMedia("(pointer: fine)"),this.shapes=[],this.cache=new Map,this.cacheShapes=new Map,this.look=new Float32Array(0),this.started=!1,this.vertexColor=!1,this.shadeFlip=!1,this.fullFrameShape=!1,this.dotScale=1,this.scrubActive=!1,this.scrubProgress=0,this.scrubPair=-1,this.active=-1,this.currentDrift=1,this.transitionStart=0,this.transitionDuration=0,this.nextSwitchAt=0,this.manualUntil=0,this.paused=!1,this.visible=!0,this.running=!1,this.frameHandle=0,this.width=0,this.height=0,this.pixelRatio=1,this.pointerX=-1e5,this.pointerY=-1e5,this.pointerActive=!1,this.intersectionObserver=null,this.resizeObserver=null,this.handleElementResize=h=>{const c=h[0]?.contentRect;!c||c.width<1||c.height<1||this.applySize(c.width,c.height)},this.handleVisibility=()=>{document.hidden?this.cancelFrame():this.requestFrame()},this.handlePointerMove=h=>{const c=this.canvas.getBoundingClientRect();this.pointerX=h.clientX-c.left,this.pointerY=h.clientY-c.top,this.pointerActive=!0},this.handlePointerLeave=()=>{this.pointerActive=!1},this.handleMotionChange=()=>{this.nextSwitchAt=performance.now()+this.options.transitionMs+this.options.holdMs,this.requestFrame()},this.handleContextLost=h=>{h.preventDefault(),this.destroy(),this.callbacks.onContextLost?.()},this.animate=h=>{if(this.frameHandle=0,!this.started||document.hidden||!this.visible)return;if(this.scrubActive){this.render(h),!this.reducedMotion.matches&&!this.paused&&(this.frameHandle=requestAnimationFrame(this.animate));return}if(this.options.autoRotate&&!this.paused&&h>=this.nextSwitchAt&&h>=this.manualUntil){this.next();return}this.render(h);const c=h-this.transitionStart>=this.transitionDuration;!this.reducedMotion.matches&&(!this.paused||!c)&&(this.frameHandle=requestAnimationFrame(this.animate))};const e=s.powerPreference??"high-performance",t=i.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,powerPreference:e});if(!t)throw new Error("webgl2 unavailable");this.canvas=i,this.gl=t,this.mobile=I(),this.count=Math.max(200,Math.round(s.count??(this.mobile?16e3:42e3))),this.options={transitionMs:s.transitionMs??1500,holdMs:s.holdMs??2600,autoRotate:s.autoRotate??!0,palette:s.palette??[[45,212,191],[153,246,228]],dotRadius:s.dotRadius??1.1,glowAlpha:s.glowAlpha??.06,glowStrength:s.glowStrength??1,coreAlpha:s.coreAlpha??.9,drift:s.drift??1,scaleFill:s.scaleFill??(this.mobile?.4:.42),maxPixelRatio:s.maxPixelRatio??2,powerPreference:e,pointerPush:s.pointerPush??64,introScatter:s.introScatter??!1},this.callbacks={onShapeChange:s.onShapeChange,onContextLost:s.onContextLost};const o=t.createProgram();if(!o)throw new Error("createProgram failed");const n=B(t,t.VERTEX_SHADER,Y),a=B(t,t.FRAGMENT_SHADER,z);if(t.attachShader(o,n),t.attachShader(o,a),t.linkProgram(o),t.deleteShader(n),t.deleteShader(a),!t.getProgramParameter(o,t.LINK_STATUS)){const h=t.getProgramInfoLog(o);throw t.deleteProgram(o),new Error(`program link failed: ${h??"unknown"}`)}this.program=o,t.useProgram(o);for(const h of["uProgress","uTime","uScale","uResolution","uDrift","uSizePx","uPixelRatio","uPointer","uPointerRadius","uPointerPush","uBreath","uVertexColor","uShadeFlip","uColorA","uColorB","uAlpha"])this.uniforms[h]=t.getUniformLocation(o,h);this.buffers={from:this.makeBuffer(),to:this.makeBuffer(),data:this.makeBuffer(),look:this.makeBuffer(),color:this.makeBuffer()},this.from=new Float32Array(this.count*2),this.to=new Float32Array(this.count*2);const d=t.createVertexArray();if(!d)throw new Error("createVertexArray failed");this.vao=d,t.bindVertexArray(d),this.bindAttribute(this.buffers.from,0,2),this.bindAttribute(this.buffers.to,1,2),this.bindAttribute(this.buffers.data,2,4),this.bindAttribute(this.buffers.look,3,4),this.bindAttribute(this.buffers.color,4,3),t.bindVertexArray(null),t.disable(t.DEPTH_TEST),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE),t.clearColor(0,0,0,0),this.buildParticleConstants(),i.addEventListener("webglcontextlost",this.handleContextLost)}get shapesList(){return this.shapes}get activeIndex(){return this.active}get particleCount(){return this.count}makeBuffer(){const i=this.gl.createBuffer();if(!i)throw new Error("createBuffer failed");return i}bindAttribute(i,s,e){const t=this.gl;t.bindBuffer(t.ARRAY_BUFFER,i),t.bufferData(t.ARRAY_BUFFER,e*4*this.count,t.DYNAMIC_DRAW),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,e,t.FLOAT,!1,0,0)}buildParticleConstants(){const i=this.gl,s=new Float32Array(this.count*4),e=new Float32Array(this.count*4);for(let t=0;t<this.count;t+=1){const o=v(t*7+19)>.5?1:-1;s[t*4+0]=v(t*23+31)*.38,s[t*4+1]=(.03+v(t*11+3)*.065)*o,s[t*4+2]=.075+v(t*29+17)*.25,s[t*4+3]=o,e[t*4+0]=.55+v(t*37+5)*(this.mobile?.7:1.55);const n=v(t*67+23),a=n<.42?0:n<.82?1:n<.96?2:3;e[t*4+1]=[.62,.95,1.35,1.95][a],e[t*4+2]=1,e[t*4+3]=v(t*43+13)*E}i.bindBuffer(i.ARRAY_BUFFER,this.buffers.data),i.bufferData(i.ARRAY_BUFFER,s,i.STATIC_DRAW),i.bindBuffer(i.ARRAY_BUFFER,this.buffers.look),i.bufferData(i.ARRAY_BUFFER,e,i.STATIC_DRAW),this.look=e}setShapes(i,{keepActive:s=!1}={}){const e=this.shapes[this.active]?.key;this.shapes=i;for(const t of Array.from(this.cache.keys()))i.some(o=>o.key===t)||(this.cache.delete(t),this.cacheShapes.delete(t));for(const[t,o]of Array.from(this.cacheShapes)){const n=i.find(a=>a.key===t);n&&n!==o&&(this.cache.delete(t),this.cacheShapes.delete(t))}if(i.length){if(s&&e){const t=i.findIndex(o=>o.key===e);if(t>=0){t!==this.active&&this.goTo(t);return}}this.goTo(0)}}next(){this.shapes.length&&this.goTo((this.active+1)%this.shapes.length)}goTo(i,s=!1){const e=this.shapes[i];if(!e)return;const t=this.cloudOf(e);if(!t)return;this.started?this.from.set(this.to):(this.options.introScatter?this.fillScatter(this.from):this.from.set(t.positions),this.started=!0),this.to.set(t.positions);for(let a=0;a<this.count;a+=1)this.look[a*4+2]=t.shade[a];this.vertexColor=e.sample?.colorMode==="vertex",this.shadeFlip=e.sample?.lumaInvert===!0,this.fullFrameShape=e.sample?.fullFrame===!0,this.dotScale=e.sample?.dotScale??1,this.scrubPair=-1;const o=this.gl;o.bindBuffer(o.ARRAY_BUFFER,this.buffers.from),o.bufferSubData(o.ARRAY_BUFFER,0,this.from),o.bindBuffer(o.ARRAY_BUFFER,this.buffers.to),o.bufferSubData(o.ARRAY_BUFFER,0,this.to),o.bindBuffer(o.ARRAY_BUFFER,this.buffers.look),o.bufferSubData(o.ARRAY_BUFFER,0,this.look),o.bindBuffer(o.ARRAY_BUFFER,this.buffers.color),o.bufferSubData(o.ARRAY_BUFFER,0,t.colors),this.currentDrift=this.options.drift*(e.sample?.driftScale??1);const n=performance.now();this.transitionStart=n,this.transitionDuration=this.options.transitionMs,this.nextSwitchAt=n+this.options.transitionMs+this.options.holdMs,s&&(this.manualUntil=n+7e3),this.active=i,this.callbacks.onShapeChange?.(e,i),this.requestFrame()}fillScatter(i){for(let s=0;s<this.count;s+=1){const e=P(s*131+17)*E,t=1.15+P(s*197+29)*.75;i[s*2]=Math.cos(e)*t,i[s*2+1]=Math.sin(e)*t}}setPaused(i){this.paused=i,this.requestFrame()}setDotRadius(i){this.options.dotRadius=A(i,.5,6),this.requestFrame()}setScrubEnabled(i){this.scrubActive!==i&&(this.scrubActive=i,this.scrubPair=-1,this.scrubProgress=i?0:1,this.requestFrame())}scrub(i){const s=this.shapes.length-1;if(s<1)return;const e=A(i,0,s),t=Math.min(Math.floor(e),s-1),o=this.shapes[t+1],n=this.shapes[t],a=t*1e3+(t+1);if(a!==this.scrubPair){const h=this.cloudOf(n),c=this.cloudOf(o);if(!h||!c)return;this.from.set(h.positions),this.to.set(c.positions);for(let p=0;p<this.count;p+=1)this.look[p*4+2]=c.shade[p];const u=this.gl;u.bindBuffer(u.ARRAY_BUFFER,this.buffers.from),u.bufferSubData(u.ARRAY_BUFFER,0,this.from),u.bindBuffer(u.ARRAY_BUFFER,this.buffers.to),u.bufferSubData(u.ARRAY_BUFFER,0,this.to),u.bindBuffer(u.ARRAY_BUFFER,this.buffers.look),u.bufferSubData(u.ARRAY_BUFFER,0,this.look),u.bindBuffer(u.ARRAY_BUFFER,this.buffers.color),u.bufferSubData(u.ARRAY_BUFFER,0,c.colors),this.scrubPair=a,this.currentDrift=this.options.drift*(o.sample?.driftScale??1),this.vertexColor=o.sample?.colorMode==="vertex",this.fullFrameShape=o.sample?.fullFrame===!0,this.shadeFlip=o.sample?.lumaInvert===!0}this.scrubProgress=e-t;const d=Math.round(e);d!==this.active&&(this.active=d,this.callbacks.onShapeChange?.(this.shapes[d],d)),this.requestFrame()}cloudOf(i){const s=this.cache.get(i.key);if(s&&this.cacheShapes.get(i.key)===i)return s;const e=O(i.source,{count:this.count,...i.sample});if(!e)return null;const t={positions:e.positions,shade:e.shade,colors:e.colors};return this.cache.set(i.key,t),this.cacheShapes.set(i.key,i),t}start(){this.running||(this.running=!0,document.addEventListener("visibilitychange",this.handleVisibility),this.reducedMotion.addEventListener?.("change",this.handleMotionChange),this.finePointer.matches&&(this.canvas.addEventListener("pointermove",this.handlePointerMove),this.canvas.addEventListener("pointerleave",this.handlePointerLeave)),"IntersectionObserver"in window&&(this.intersectionObserver=new IntersectionObserver(i=>{this.visible=i[0]?.isIntersecting??!0,this.visible?this.requestFrame():this.cancelFrame()},{threshold:.08}),this.intersectionObserver.observe(this.canvas)),"ResizeObserver"in window&&(this.resizeObserver=new ResizeObserver(this.handleElementResize),this.resizeObserver.observe(this.canvas)),this.resize(),this.requestFrame())}destroy(){this.running=!1,this.cancelFrame(),document.removeEventListener("visibilitychange",this.handleVisibility),this.reducedMotion.removeEventListener?.("change",this.handleMotionChange),this.canvas.removeEventListener("pointermove",this.handlePointerMove),this.canvas.removeEventListener("pointerleave",this.handlePointerLeave),this.canvas.removeEventListener("webglcontextlost",this.handleContextLost),this.intersectionObserver?.disconnect(),this.intersectionObserver=null,this.resizeObserver?.disconnect(),this.resizeObserver=null,this.cache.clear(),this.cacheShapes.clear(),this.shapes=[],this.started=!1}resize(){const i=this.canvas.getBoundingClientRect();i.width<1||i.height<1||this.applySize(i.width,i.height)}applySize(i,s){const e=Math.max(1,Math.round(i)),t=Math.max(1,Math.round(s)),o=Math.min(window.devicePixelRatio||1,this.options.maxPixelRatio);this.width=e,this.height=t,this.pixelRatio=o;const n=Math.max(1,Math.round(e*o)),a=Math.max(1,Math.round(t*o));(this.canvas.width!==n||this.canvas.height!==a)&&(this.canvas.width=n,this.canvas.height=a,this.gl.viewport(0,0,n,a)),this.requestFrame()}requestFrame(){if(!(this.frameHandle||!this.started||document.hidden||!this.visible)){if(this.reducedMotion.matches){this.render(performance.now(),!0);return}this.frameHandle=requestAnimationFrame(this.animate)}}cancelFrame(){this.frameHandle&&cancelAnimationFrame(this.frameHandle),this.frameHandle=0}render(i,s=!1){const e=this.gl,t=this.uniforms;if(!this.width||!this.height)return;const o=s?1:this.scrubActive?this.scrubProgress:this.transitionDuration<=0?1:A((i-this.transitionStart)/this.transitionDuration,0,1),n=s?1:1+Math.sin(i*52e-5)*.006;e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.program),e.bindVertexArray(this.vao),e.blendFunc(e.ONE,this.vertexColor||this.fullFrameShape?e.ONE_MINUS_SRC_ALPHA:e.ONE),e.uniform1f(t.uVertexColor,this.vertexColor?1:0),e.uniform1f(t.uShadeFlip,this.shadeFlip?1:0),e.uniform1f(t.uProgress,o),e.uniform1f(t.uTime,i),e.uniform1f(t.uScale,Math.min(this.width,this.height)*this.options.scaleFill),e.uniform2f(t.uResolution,this.width,this.height),e.uniform1f(t.uDrift,s?0:this.currentDrift),e.uniform1f(t.uPixelRatio,this.pixelRatio),e.uniform2f(t.uPointer,this.pointerActive&&!s?this.pointerX:-1e5,this.pointerActive&&!s?this.pointerY:-1e5),e.uniform1f(t.uPointerRadius,Math.min(this.width,this.height)*.24),e.uniform1f(t.uPointerPush,this.options.pointerPush),e.uniform1f(t.uBreath,n);const[a,d]=this.options.palette;e.uniform3f(t.uColorA,a[0]/255,a[1]/255,a[2]/255),e.uniform3f(t.uColorB,d[0]/255,d[1]/255,d[2]/255);const h=this.options.glowAlpha*this.options.glowStrength;h>0&&(e.uniform1f(t.uSizePx,this.options.dotRadius*this.dotScale*3.2),e.uniform1f(t.uAlpha,h),e.drawArrays(e.POINTS,0,this.count)),e.uniform1f(t.uSizePx,this.options.dotRadius*this.dotScale),e.uniform1f(t.uAlpha,this.options.coreAlpha),e.drawArrays(e.POINTS,0,this.count),e.bindVertexArray(null)}}function q(l,i={}){if(typeof document>"u"||!l.getContext||!document.createElement("canvas").getContext("webgl2"))return null;try{return new V(l,i)}catch(e){return console.warn("[morph-gpu] init failed, falling back to canvas 2d",e),null}}const S=document.getElementById("photo-canvas"),F=document.getElementById("stage"),C=document.getElementById("drop-hint"),w=document.getElementById("file"),M=document.getElementById("btn-color"),k=document.getElementById("btn-mono"),H=document.getElementById("btn-replay"),b=document.getElementById("dot"),L=document.getElementById("density"),D=document.getElementById("stat-count"),T=document.getElementById("stat-fps"),_=document.getElementById("status");function m(l){_&&(_.textContent=l)}if(S){let l=function(){if(!S)return;t?.destroy();const r=L?.value??"standard";if(t=q(S,{count:e[r],autoRotate:!1,scaleFill:.5,dotRadius:b?Number(b.value):2.4,coreAlpha:1,glowAlpha:.04,glowStrength:1,drift:1,palette:[[13,84,76],[178,245,232]]}),!t){m("此浏览器不支持 WebGL2，无法游玩。");return}D&&(D.textContent=String(t.particleCount)),t.setShapes(h()??[]),t.start(),t.goTo(a==="color"?0:1,!0)},i=function(r){a=r,M?.setAttribute("aria-pressed",String(r==="color")),k?.setAttribute("aria-pressed",String(r==="mono")),t?.goTo(r==="color"?0:1,!0)};const s=I(),e={light:s?3e4:8e4,standard:s?85e3:24e4,ultra:s?14e4:4e5};let t=null,o=null,n=null,a="color",d=0;const h=()=>{if(!o)return null;const r={kind:"image",image:o,width:o.naturalWidth,height:o.naturalHeight},f={fullFrame:!0,driftScale:.15};return[{key:`photo-color-${d}`,label:"照片原色",source:r,sample:{...f,colorMode:"vertex"}},{key:`photo-mono-${d}`,label:"品牌单色",source:r,sample:{...f}}]},c=()=>{if(!t||!o)return;const r=h();r&&(t.setShapes(r),t.goTo(a==="color"?0:1,!0))};let u=0,p=performance.now();const x=r=>{u+=1,r-p>=1e3&&(T&&(T.textContent=String(u)),u=0,p=r),requestAnimationFrame(x)};requestAnimationFrame(x);async function R(r){if(!r.type.startsWith("image/")){m("这不是图片文件，换一张试试");return}m("解析照片中…"),n&&URL.revokeObjectURL(n),n=URL.createObjectURL(r);const f=new Image;f.src=n;try{await f.decode()}catch{m("照片解码失败，换一张试试");return}o=f,d+=1,c(),m(`已加载 ${f.naturalWidth}×${f.naturalHeight} · ${r.name||"剪贴板图片"}`)}w?.addEventListener("change",()=>{const r=w.files?.[0];r&&R(r),w.value=""});for(const r of["dragenter","dragover"])F?.addEventListener(r,f=>{f.preventDefault(),C?.classList.add("on")});for(const r of["dragleave","drop"])F?.addEventListener(r,f=>{f.preventDefault(),C?.classList.remove("on")});F?.addEventListener("drop",r=>{const f=r.dataTransfer?.files?.[0];f&&R(f)}),window.addEventListener("paste",r=>{const y=Array.from(r.clipboardData?.items??[]).find(U=>U.type.startsWith("image/"))?.getAsFile();y&&R(y)}),M?.addEventListener("click",()=>i("color")),k?.addEventListener("click",()=>i("mono")),H?.addEventListener("click",()=>t?.goTo(a==="color"?0:1,!0)),b?.addEventListener("input",()=>{t?.setDotRadius(Number(b.value))}),L?.addEventListener("change",()=>{m("重建粒子中…"),setTimeout(()=>{l(),m("已按新密度重建")},30)});const g=new Image;g.decoding="async",g.src="/zplayer-release/demo/photo-portrait.jpg",g.decode().then(()=>{o=g,l(),m("已加载示例照片 · 上传你自己的照片试试（拖拽 / Ctrl+V 均可）")}).catch(()=>{m("示例照片加载失败，请上传一张照片"),l()})}
