// Crimson Eclipse preview engine: the viewer (WebGL2, HDR + bloom, day and blood moon, inspection, layer cut).
// A page calls CE.viewer({ variants:[{ key, name, make(W) -> meta }] }). meta: tag, cam {target, dist, yaw, pitch}, sun, moon,
// size, shakeAt, groups(nt, t) -> [mat4 by group], beams(nt, t, G) -> [{a, b, w, e}].
'use strict';
(function () {
const CE = window.CE;
const { ss } = CE.math;

// ------------------------------------------------------------------ matrices (column-major)
const I4 = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
const Tm = (x, y, z) => { const m = I4(); m[12] = x; m[13] = y; m[14] = z; return m; };
const Sm = s => { const m = I4(); m[0] = m[5] = m[10] = s; return m; };
const RX = a => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
const RY = a => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const RZ = a => { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
function mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k*4+j]*b[i*4+k]; o[i*4+j] = s; } return o; }
const M4 = (...ms) => ms.reduce((a, b) => mul(a, b));
const about = (p, m) => M4(Tm(p[0], p[1], p[2]), m, Tm(-p[0], -p[1], -p[2]));
const applyP = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const applyD = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2], m[1]*p[0]+m[5]*p[1]+m[9]*p[2], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]];
const spinUp = (n, ramp) => n <= 0 ? 0 : n < ramp ? n*n/(2*ramp) : n - ramp/2;
const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x/l); };
const dirFrom = (az, el) => [Math.sin(az)*Math.cos(el), Math.sin(el), Math.cos(az)*Math.cos(el)];
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]], cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function perspective(fy, asp, n, f) { const t = 1/Math.tan(fy/2), m = new Float32Array(16); m[0] = t/asp; m[5] = t; m[10] = (f+n)/(n-f); m[11] = -1; m[14] = 2*f*n/(n-f); return m; }
function lookAt(e, c, up) { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x);
  return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]), -(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]), -(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]), 1]); }
function invert(a) { const inv = new Float32Array(16);
  inv[0]=a[5]*a[10]*a[15]-a[5]*a[11]*a[14]-a[9]*a[6]*a[15]+a[9]*a[7]*a[14]+a[13]*a[6]*a[11]-a[13]*a[7]*a[10];
  inv[4]=-a[4]*a[10]*a[15]+a[4]*a[11]*a[14]+a[8]*a[6]*a[15]-a[8]*a[7]*a[14]-a[12]*a[6]*a[11]+a[12]*a[7]*a[10];
  inv[8]=a[4]*a[9]*a[15]-a[4]*a[11]*a[13]-a[8]*a[5]*a[15]+a[8]*a[7]*a[13]+a[12]*a[5]*a[11]-a[12]*a[7]*a[9];
  inv[12]=-a[4]*a[9]*a[14]+a[4]*a[10]*a[13]+a[8]*a[5]*a[14]-a[8]*a[6]*a[13]-a[12]*a[5]*a[10]+a[12]*a[6]*a[9];
  inv[1]=-a[1]*a[10]*a[15]+a[1]*a[11]*a[14]+a[9]*a[2]*a[15]-a[9]*a[3]*a[14]-a[13]*a[2]*a[11]+a[13]*a[3]*a[10];
  inv[5]=a[0]*a[10]*a[15]-a[0]*a[11]*a[14]-a[8]*a[2]*a[15]+a[8]*a[3]*a[14]+a[12]*a[2]*a[11]-a[12]*a[3]*a[10];
  inv[9]=-a[0]*a[9]*a[15]+a[0]*a[11]*a[13]+a[8]*a[1]*a[15]-a[8]*a[3]*a[13]-a[12]*a[1]*a[11]+a[12]*a[3]*a[9];
  inv[13]=a[0]*a[9]*a[14]-a[0]*a[10]*a[13]-a[8]*a[1]*a[14]+a[8]*a[2]*a[13]+a[12]*a[1]*a[10]-a[12]*a[2]*a[9];
  inv[2]=a[1]*a[6]*a[15]-a[1]*a[7]*a[14]-a[5]*a[2]*a[15]+a[5]*a[3]*a[14]+a[13]*a[2]*a[7]-a[13]*a[3]*a[6];
  inv[6]=-a[0]*a[6]*a[15]+a[0]*a[7]*a[14]+a[4]*a[2]*a[15]-a[4]*a[3]*a[14]-a[12]*a[2]*a[7]+a[12]*a[3]*a[6];
  inv[10]=a[0]*a[5]*a[15]-a[0]*a[7]*a[13]-a[4]*a[1]*a[15]+a[4]*a[3]*a[13]+a[12]*a[1]*a[7]-a[12]*a[3]*a[5];
  inv[14]=-a[0]*a[5]*a[14]+a[0]*a[6]*a[13]+a[4]*a[1]*a[14]-a[4]*a[2]*a[13]-a[12]*a[1]*a[6]+a[12]*a[2]*a[5];
  inv[3]=-a[1]*a[6]*a[11]+a[1]*a[7]*a[10]+a[5]*a[2]*a[11]-a[5]*a[3]*a[10]-a[9]*a[2]*a[7]+a[9]*a[3]*a[6];
  inv[7]=a[0]*a[6]*a[11]-a[0]*a[7]*a[10]-a[4]*a[2]*a[11]+a[4]*a[3]*a[10]+a[8]*a[2]*a[7]-a[8]*a[3]*a[6];
  inv[11]=-a[0]*a[5]*a[11]+a[0]*a[7]*a[9]+a[4]*a[1]*a[11]-a[4]*a[3]*a[9]-a[8]*a[1]*a[7]+a[8]*a[3]*a[5];
  inv[15]=a[0]*a[5]*a[10]-a[0]*a[6]*a[9]-a[4]*a[1]*a[10]+a[4]*a[2]*a[9]+a[8]*a[1]*a[6]-a[8]*a[2]*a[5];
  const det = a[0]*inv[0]+a[1]*inv[4]+a[2]*inv[8]+a[3]*inv[12]; for (let i = 0; i < 16; i++) inv[i] /= det; return inv; }
CE.m = { I4, Tm, Sm, RX, RY, RZ, mul, M4, about, applyP, applyD, spinUp, norm, dirFrom };

// ------------------------------------------------------------------ shaders
const H2 = `float h2(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }`;
const BLOCK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aUV; layout(location=2) in vec4 aN; layout(location=3) in vec4 aL; layout(location=4) in vec4 aM; layout(location=5) in vec4 aX;
uniform mat4 uVP; uniform mat4 uG[16]; uniform float uN, uAT, uCut;
out vec3 vW; out vec3 vUV; out vec3 vN; out float vShade; out vec4 vL; out vec4 vM; out vec2 vX;
void main(){
  bool awake = uN > .5 && uAT > aX.y + .3; int vis = int(aX.x + .5);
  if ((vis == 1 && awake) || (vis == 2 && !awake) || aX.z > uCut) { gl_Position = vec4(2., 2., 2., 1.); return; }
  vec3 w = aPos, n = aN.xyz; int g = int(aM.w + .5);
  if (g > 0) { mat4 M = uG[g]; w = (M*vec4(w, 1.)).xyz; n = mat3(M)*n; }
  vW = w; vUV = aUV; vN = n; vShade = aN.w; vL = aL; vM = aM; vX = vec2(aX.y, aX.w);
  gl_Position = uVP*vec4(w, 1.);
}`;
const BLOCK_FS = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec3 vW; in vec3 vUV; in vec3 vN; in float vShade; in vec4 vL; in vec4 vM; in vec2 vX;
uniform sampler2DArray uTex; uniform int uPass; uniform vec3 uCam, uSun, uMoon; uniform float uN, uAT, uTime;
uniform vec4 uLP[8]; uniform vec4 uLC[8]; uniform int uNL;
out vec4 o;
float lv(float l){ float x = clamp(l/15., 0., 1.); return x/(4. - 3.*x); }
float on(float d){ return d < 0. ? 1. : smoothstep(d, d + 1.2, uAT)*uN; }
void main(){
  vec4 tx;
  if (vX.y > .5) tx = textureGrad(uTex, vec3(fract(vUV.xy), vUV.z), dFdx(vUV.xy), dFdy(vUV.xy));
  else tx = texture(uTex, vUV);
  if (uPass == 0 && tx.a < .5) discard;
  if (uPass == 1 && tx.a < .03) discard;
  vec3 alb = pow(tx.rgb, vec3(2.2)), N = normalize(vN);
  float e = smoothstep(vX.x, vX.x + 1.2, uAT)*uN;
  float sky = lv(vL.x), fl = .9 + .1*sin(uTime*9. + vW.x*3. + vW.z*2.)*sin(uTime*6.3 + vW.y*1.7);
  vec3 day = vec3(1., .97, .9)*(.8 + .32*max(dot(N, normalize(uSun)), 0.));
  vec3 nig = vec3(.05, .013, .017) + vec3(.34, .055, .05)*max(dot(N, normalize(uMoon)), 0.);
  vec3 lit = sky*mix(day, nig, uN);
  lit += lv(vL.y)*on(vL.z)*vec3(1.4, .98, .58)*fl;
  lit += lv(vL.w)*on(vM.x)*vec3(2., .24, .17)*(.85 + .15*fl);
  lit *= vShade;
  for (int i = 0; i < 8; i++) { if (i >= uNL) break;
    vec4 lp = uLP[i], lc = uLC[i]; float le = smoothstep(lp.w, lp.w + 1.2, uAT)*uN; if (le <= 0.) continue;
    vec3 L = lp.xyz - vW; float d = length(L);
    lit += lc.rgb*le*smoothstep(lc.w*2., lc.w*.3, d)/(1. + d*d/(lc.w*lc.w)*2.)*(.25 + .75*max(dot(N, L/d), 0.))*fl; }
  float bright = smoothstep(.3, .9, max(tx.r, max(tx.g, tx.b)));
  vec3 col = alb*lit + alb*bright*(vM.y + vM.z*e)*(.9 + .1*fl);
  float dist = length(vW - uCam);
  vec3 fogc = mix(vec3(.50, .56, .64), vec3(.055, .012, .016), uN);
  col = mix(col, fogc, 1. - exp(-dist*mix(.0017, .0042, uN)));
  o = vec4(col, uPass == 1 ? tx.a : 1.);
}`;
const FS_VS = `#version 300 es
out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv; uniform mat4 uInvVP; uniform vec3 uCam, uSun, uMoon; uniform float uN, uTime;
out vec4 o;
${H2}
void main(){
  vec4 p = uInvVP*vec4(vUv*2.-1., 1., 1.); vec3 d = normalize(p.xyz/p.w - uCam); float y = d.y;
  vec3 day = mix(vec3(.62,.66,.70), vec3(.30,.42,.60), smoothstep(0., .6, y));
  float sd = max(dot(d, normalize(uSun)), 0.); day += vec3(1.,.9,.7)*(pow(sd, 400.)*4. + pow(sd, 8.)*.25);
  vec3 M = normalize(uMoon); float md = acos(clamp(dot(d, M), -1., 1.));
  vec3 nig = mix(vec3(.10,.02,.024), vec3(.015,.003,.006), smoothstep(0., .7, y));
  nig += vec3(.9,.12,.08)*exp(-md*5.)*.6 + vec3(.5,.05,.04)*exp(-md*1.6)*.25;
  float disc = smoothstep(.062, .056, md);
  vec2 mq = floor(vec2(atan(d.x, d.z), d.y)*500.);
  nig = mix(nig, vec3(2.4,.36,.24)*(.82+.18*h2(mq))*(1.-.35*smoothstep(.03,.06,md)), disc);
  vec3 sq = floor(d*260.); float st = h2(sq.xy + sq.z*7.3);
  nig += vec3(1.,.8,.75)*step(.9975, st)*smoothstep(0., .15, y)*(1.-disc);
  vec3 col = mix(day, nig, uN);
  vec3 fogc = mix(vec3(.50,.56,.64), vec3(.055,.012,.016), uN);
  o = vec4(mix(col, fogc, smoothstep(.12, -.05, y)), 1.);
}`;
const P_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aC; layout(location=1) in vec4 aA; layout(location=2) in vec4 aB; layout(location=3) in vec3 aCol;
uniform mat4 uVP; uniform vec3 uR, uU; uniform float uTime, uAT, uN;
out vec2 vC; out vec3 vCol; out float vA;
void main(){
  int k = int(aA.w + .5); float ph = aB.x, sz = aB.y, d = aB.z, ex = aB.w, t = uTime;
  float e = smoothstep(d, d + 1.5, uAT)*uN;
  vec3 p = aA.xyz, col = aCol; float a = 0.;
  if (k == 0) { p += vec3(sin(t*.11+ph*6.3)*1.6, sin(t*.07+ph*4.1)*.9, cos(t*.09+ph*5.7)*1.6);
    a = .3*(.6+.4*sin(t*.5+ph*20.)); col = mix(vec3(1.,.92,.75), vec3(1.4,.3,.22), uN); }
  else if (k == 1) { float f = fract(t*.11*(.6+ph) + ph*7.); p += vec3(sin(f*5.+ph*9.)*.8, f*ex, cos(f*4.+ph*7.)*.8); a = sin(f*3.1416)*e; }
  else if (k == 2) { float f = fract(t*.9 + ph*5.), an = ph*6.2832; p += vec3(cos(an)*(1.05+f*.7), -2.9*f*f, sin(an)*(1.05+f*.7)); a = e*(1.-f*.7); }
  vC = aC; vCol = col; vA = a;
  if (a <= .001) { gl_Position = vec4(2., 2., 2., 1.); return; }
  gl_Position = uVP*vec4(p + (uR*aC.x + uU*aC.y)*sz, 1.);
}`;
const P_FS = `#version 300 es
precision highp float; in vec2 vC; in vec3 vCol; in float vA; out vec4 o;
void main(){ float m = max(0., 1. - dot(vC, vC)); m *= m; o = vec4(vCol*m*vA, 0.); }`;
const BEAM_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 aC;
uniform mat4 uVP; uniform vec3 uCam; uniform vec3 uBA[2]; uniform vec3 uBB[2]; uniform float uBW[2]; uniform float uBE[2];
out vec2 vC; out float vE;
void main(){ int i = gl_InstanceID; vec3 A = uBA[i], B = uBB[i], ax = B - A, q = mix(A, B, aC.y*.5 + .5);
  vec3 side = normalize(cross(ax, uCam - q))*uBW[i];
  vC = aC; vE = uBE[i]; gl_Position = uVP*vec4(q + side*aC.x, 1.); }`;
const BEAM_FS = `#version 300 es
precision highp float; in vec2 vC; in float vE; uniform float uTime; out vec4 o;
void main(){ float x = abs(vC.x), k = vC.y*.5 + .5;
  float m = pow(1.-x, 10.)*2.2 + pow(1.-x, 2.)*.45;
  float along = (1. - k*.85)*(.85 + .15*sin(k*120. - uTime*9.));
  o = vec4(vec3(3.,.34,.24)*m*along*vE, 0.); }`;
const BRIGHT_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uS; uniform vec2 uPx; out vec4 o;
void main(){ vec3 c = vec3(0.); for (int i = 0; i < 4; i++) { vec2 q = vec2(float(i&1), float(i>>1))*2.-1.; c += texture(uS, vUv + q*uPx).rgb; }
  c *= .25; o = vec4(max(c - 1.15, 0.), 1.); }`;
const BLUR_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uS; uniform vec2 uDir; out vec4 o;
void main(){ float w[5] = float[](.227,.194,.121,.054,.016); vec3 c = texture(uS, vUv).rgb*w[0];
  for (int i = 1; i < 5; i++) { c += texture(uS, vUv + uDir*float(i)).rgb*w[i]; c += texture(uS, vUv - uDir*float(i)).rgb*w[i]; } o = vec4(c, 1.); }`;
const COMP_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uS, uB; uniform float uT; out vec4 o;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
void main(){ vec3 c = texture(uS, vUv).rgb + texture(uB, vUv).rgb*.75;
  c = pow(aces(c*.95), vec3(1./2.2));
  float vg = length(vUv - .5)*1.35; c *= mix(1., .55, smoothstep(.45, 1., vg));
  c += (fract(sin(dot(vUv*1000. + uT, vec2(12.9898, 78.233)))*43758.5) - .5)*.02;
  o = vec4(c, 1.); }`;

// ------------------------------------------------------------------ page chrome
const CSS = `
:root { --red:#ff3b2f; --dim:#b9a7a5; --bg:rgba(12,4,5,.72); --line:rgba(255,90,70,.22); }
* { box-sizing:border-box; }
html,body { margin:0; height:100%; background:#000; color:#f3e9e7; overflow:hidden; font:14px/1.45 system-ui,"Segoe UI",Roboto,sans-serif; }
canvas { position:fixed; inset:0; width:100%; height:100%; display:block; cursor:grab; touch-action:none; }
canvas.drag { cursor:grabbing; }
.ui { transition:opacity .35s; } body.hide .ui { opacity:0; pointer-events:none; }
#cap { position:fixed; left:18px; top:14px; max-width:min(620px,74vw); text-shadow:0 1px 6px #000,0 0 2px #000; pointer-events:none; }
#cap .v { font-size:22px; font-weight:700; letter-spacing:.02em; } #cap .v b { color:var(--red); margin-right:.35em; }
#cap .tag { color:#e6d6d3; margin-top:4px; } #cap .tag i { color:var(--dim); font-style:normal; }
#cap .size { color:var(--dim); margin-top:6px; font-size:12px; }
#cap .ph { margin-top:8px; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#ffb4a8; }
#tex { position:fixed; right:14px; top:12px; font-size:12px; padding:5px 9px; border-radius:7px; background:var(--bg); border:1px solid var(--line); max-width:46vw; }
#tex { display:flex; gap:8px; align-items:center; } #tex.warn { border-color:#c98a2a; color:#ffd59a; } #tex button { padding:3px 8px; font-size:12px; }
#bar { position:fixed; left:0; right:0; bottom:0; padding:10px 16px 12px; background:linear-gradient(transparent,rgba(0,0,0,.82) 45%); display:flex; flex-wrap:wrap; align-items:center; gap:10px 12px; }
.grp { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
button { font:inherit; color:inherit; background:var(--bg); border:1px solid var(--line); border-radius:7px; padding:6px 11px; cursor:pointer; white-space:nowrap; }
button:hover { border-color:var(--red); } button.on { background:#7d120d; border-color:var(--red); }
label.cut { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dim); } label.cut input { width:120px; accent-color:#c0261c; }
#hint { color:var(--dim); font-size:12px; margin-left:auto; }
#tip { position:fixed; pointer-events:none; font:12px/1.4 ui-monospace,Consolas,monospace; background:rgba(8,3,4,.88); border:1px solid var(--line); border-radius:6px; padding:5px 8px; display:none; max-width:60vw; white-space:pre-wrap; z-index:3; }
#load { position:fixed; inset:0; display:grid; place-items:center; color:#ffb4a8; font-size:13px; letter-spacing:.12em; text-transform:uppercase; pointer-events:none; }
#err { position:fixed; inset:0; display:none; place-items:center; padding:30px; text-align:center; color:#ffb4a8; white-space:pre-wrap; font:12px monospace; overflow:auto; background:#000; z-index:5; }
@media (max-width:640px){ #cap .tag { font-size:12px; } #hint { display:none; } }`;
const HTML = `<canvas id="cv"></canvas>
<div id="cap" class="ui"><div class="v"><b id="vk"></b><span id="vn"></span></div><div class="tag" id="vt"></div><div class="size" id="vs"></div><div class="ph" id="ph"></div></div>
<div id="tex" class="ui"><span id="texs"></span><button id="bJar" title="Pick your own Minecraft client jar, e.g. %APPDATA%\\.minecraft\\versions\\26.3\\26.3.jar. Read here, kept in this browser, never sent anywhere.">Load real textures…</button><input id="jar" type="file" accept=".jar,.zip" hidden></div>
<div id="bar" class="ui"><div class="grp" id="vars"></div>
  <div class="grp"><button id="bDay">☀ Day</button><button id="bNight">☾ Blood moon</button></div>
  <div class="grp"><button id="bSpin">⟳ Turn</button><label class="cut">Cut <input id="cut" type="range" min="0" max="100" value="100"><span id="cutv">all</span></label><button id="bUi">Hide UI (H)</button></div>
  <span id="hint">drag: turn · right-drag: move · wheel: zoom · hover: block id · double-click: centre · N / D</span></div>
<div id="tip"></div><div id="load">Building…</div><div id="err"></div>`;

CE.viewer = function (opts) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', HTML);
  const $ = id => document.getElementById(id);
  const fail = msg => { const e = $('err'); e.style.display = 'grid'; e.textContent = msg; };
  addEventListener('error', ev => fail(String(ev.error && ev.error.stack || ev.message)));
  addEventListener('unhandledrejection', ev => fail(String(ev.reason && ev.reason.stack || ev.reason)));
  const cv = $('cv'), gl = cv.getContext('webgl2', { antialias:false, alpha:false, preserveDrawingBuffer:true });
  if (!gl) { fail('WebGL2 is not available in this browser.'); return; }
  const HDR = !!gl.getExtension('EXT_color_buffer_float');
  function shader(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => (i+1) + ': ' + l).join('\n').slice(0, 6000)); return s; }
  function program(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); u[a.name.replace(/\[0\]$/, '')] = u[a.name]; }
    return { p, u }; }
  const P_BLOCK = program(BLOCK_VS, BLOCK_FS), P_BG = program(FS_VS, BG_FS), P_PART = program(P_VS, P_FS), P_BEAM = program(BEAM_VS, BEAM_FS);
  const P_BRIGHT = program(FS_VS, BRIGHT_FS), P_BLUR = program(FS_VS, BLUR_FS), P_COMP = program(FS_VS, COMP_FS);

  const VF = CE.mesh.VF, STRIDE = VF*4;
  function meshVAO(m) { const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, m.v, gl.STATIC_DRAW);
    [[0,3,0],[1,3,12],[2,4,24],[3,4,40],[4,4,56],[5,4,72]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, STRIDE, o); });
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.i, gl.STATIC_DRAW);
    gl.bindVertexArray(null); return { vao, n:m.i.length }; }
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const vaoP = gl.createVertexArray(), partBuf = gl.createBuffer();
  gl.bindVertexArray(vaoP);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
  [[1,4,0],[2,4,16],[3,3,32]].forEach(([l, n, o]) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 44, o); gl.vertexAttribDivisor(l, 1); });
  const vaoQ = gl.createVertexArray(); gl.bindVertexArray(vaoQ);
  gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  const vaoE = gl.createVertexArray();
  gl.bindVertexArray(null);

  // far ground: a flat grass ring beyond the built terrain, tiled
  function groundMesh(R, layer) { const v = [], ix = [], y = -.98, F = 600;
    const rect = (x0, z0, x1, z1) => { const b = v.length/VF;
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) v.push(x, y, z, x, z, layer, 0, 1, 0, 1, 15, 0, -1, 0, -1, 0, 0, 0, 0, 0, -10, 1);
      ix.push(b, b+1, b+2, b, b+2, b+3); };
    rect(-F, -F, F, -R); rect(-F, R, F, F); rect(-F, -R, -R, R); rect(R, -R, F, R);
    return { v:new Float32Array(v), i:new Uint32Array(ix) }; }

  // render targets
  let W = 0, H = 0, fbS, texS, fbA, texA, fbB, texB, BW, BH;
  function tex(w, h) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, HDR ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, HDR ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
  function fbo(t, depth) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    if (depth) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth); return f; }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth*dpr), h = Math.round(innerHeight*dpr);
    if (w === W && h === H) return; W = w; H = h; cv.width = w; cv.height = h;
    texS = tex(W, H); const dep = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, dep);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H); fbS = fbo(texS, dep);
    BW = Math.max(1, W >> 2); BH = Math.max(1, H >> 2); texA = tex(BW, BH); fbA = fbo(texA); texB = tex(BW, BH); fbB = fbo(texB);
  }

  // ------------------------------------------------------------------ variants
  const Q = new URLSearchParams(location.search), V = opts.variants, CACHE = [];
  let vi = Math.max(0, V.findIndex(v => v.key.toLowerCase() === (Q.get('v') || '').toLowerCase())), cur = null, busy = false;
  let night = Q.get('night') === '1', nt = night ? 12 : 0, spin = Q.get('spin') !== '0' && opts.spin !== false;
  let yaw = 0, pitch = .2, dist = 80, target = [0, 0, 0], cutY = 1e9;
  if (Q.get('ui') === '0') document.body.classList.add('hide');
  if (V.length > 1) V.forEach((v, i) => { const b = document.createElement('button'); b.textContent = v.key + ' · ' + v.short; b.onclick = () => select(i); $('vars').appendChild(b); });
  async function prepare(i) {
    const v = V[i], Wd = CE.World(), meta = v.make(Wd);
    const t0 = performance.now(), mesh = CE.mesh(Wd), t1 = performance.now();
    const R = meta.groundR || 76, gl0 = 'block/grass_block_top' + CE.blocks.GRASS;
    let gi = mesh.layers.indexOf(gl0); if (gi < 0) { gi = mesh.layers.length; mesh.layers.push(gl0); }
    const texArr = await CE.textures.build(gl, mesh.layers);
    console.log(`[${v.key}] ${Wd.M.size} blocks, ${mesh.quads} faces, mesh ${(t1 - t0).toFixed(0)} ms, ${mesh.layers.length} textures`);
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
    return { ...meta, key:v.key, name:v.name, W:Wd, tex:texArr, solid:meshVAO(mesh.solid), trans:meshVAO(mesh.trans), ground:meta.noGround ? null : meshVAO(groundMesh(R, gi)),
      lights:Wd.LIGHTS, parts:new Float32Array(Wd.PARTS), bounds:mesh.bounds };
  }
  async function select(i) {
    if (busy) return; busy = true; $('load').style.display = 'grid';
    await new Promise(r => setTimeout(r, 30)); await CE.textures.ready;
    try { if (!CACHE[i]) CACHE[i] = await prepare(i); } catch (e) { busy = false; fail(String(e.stack || e)); return; }
    vi = i; cur = CACHE[i]; busy = false; $('load').style.display = 'none';
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferData(gl.ARRAY_BUFFER, cur.parts, gl.STATIC_DRAW);
    yaw = cur.cam.yaw; pitch = cur.cam.pitch; dist = cur.cam.dist; target = cur.cam.target.slice();
    $('vk').textContent = cur.key; $('vn').textContent = cur.name; $('vt').innerHTML = cur.tag || '';
    $('vs').textContent = cur.size ? `About ${cur.size[0]} × ${cur.size[2]} blocks, ${cur.size[1]} high${cur.figure !== false ? ' (the dark figure is a player)' : ''}.` : '';
    [...$('vars').children].forEach((b, k) => b.classList.toggle('on', k === i));
    const c = $('cut'); c.min = cur.bounds[0][1]; c.max = cur.bounds[1][1]; c.value = c.max; cutY = 1e9; $('cutv').textContent = 'all';
    const u = new URL(location); u.searchParams.set('v', cur.key.toLowerCase()); history.replaceState(null, '', u);
    texStatus();
  }
  function texStatus() { const st = CE.textures.stats, el = $('tex'), s = $('texs'), has = CE.textures.hasVanilla();
    $('bJar').style.display = has ? 'none' : '';
    if (has && !st.standIn.size) { el.className = 'ui'; s.textContent = `Vanilla textures ${CE.textures.version() || ''} ✓ (from your game)`; s.title = ''; }
    else { el.className = 'ui warn'; s.title = [...st.standIn].join('\n');
      s.textContent = has ? `${st.standIn.size} stand-in textures (not in your jar)` : 'Stand-in textures (painted guesses)'; } }
  $('bJar').onclick = () => $('jar').click();
  $('jar').onchange = async e => { const f = e.target.files[0]; if (!f) return; const ld = $('load'); ld.style.display = 'grid'; ld.textContent = 'Reading ' + f.name + '…';
    try { const r = await CE.textures.useJar(f); console.log(`${r.count} textures (${r.version}) read from ${f.name}, kept in this browser: ${r.kept}`); }
    catch (err) { ld.textContent = 'Building…'; fail(String(err.message || err)); return; }
    ld.textContent = 'Building…'; CACHE.length = 0; select(vi); };
  function setNight(on) { night = on; $('bDay').classList.toggle('on', !on); $('bNight').classList.toggle('on', on); }
  $('bDay').onclick = () => setNight(false); $('bNight').onclick = () => setNight(true);
  $('bSpin').onclick = () => { spin = !spin; $('bSpin').classList.toggle('on', spin); };
  $('bUi').onclick = () => document.body.classList.toggle('hide');
  $('cut').oninput = e => { const v = +e.target.value; cutY = v >= +e.target.max ? 1e9 : v; $('cutv').textContent = cutY > 1e8 ? 'all' : 'y ≤ ' + v; };
  addEventListener('keydown', e => { if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hide');
    if (e.key === 'n' || e.key === 'N') setNight(true); if (e.key === 'd' || e.key === 'D') setNight(false);
    const k = +e.key; if (k >= 1 && k <= V.length) select(k - 1); });
  let drag = null, mouse = null, VPi = null, eye = [0, 0, 0];
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => { drag = { x:e.clientX, y:e.clientY, pan:e.button === 2 || e.shiftKey }; cv.setPointerCapture(e.pointerId); cv.classList.add('drag'); $('tip').style.display = 'none'; });
  cv.addEventListener('pointermove', e => { mouse = [e.clientX, e.clientY]; if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (drag.pan) { const k = dist*.0016; target[0] -= (Math.cos(yaw)*dx - Math.sin(yaw)*dy)*k; target[2] -= (-Math.sin(yaw)*dx - Math.cos(yaw)*dy)*k; }
    else { yaw -= dx*.005; pitch = Math.min(1.45, Math.max(-.05, pitch + dy*.004)); } });
  const endDrag = () => { drag = null; cv.classList.remove('drag'); };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('pointerleave', () => { mouse = null; $('tip').style.display = 'none'; });
  cv.addEventListener('wheel', e => { e.preventDefault(); dist = Math.min(220, Math.max(4, dist*Math.exp(e.deltaY*.001))); }, { passive:false });
  function pick() { if (!mouse || !VPi || !cur) return null;
    const r = cv.getBoundingClientRect(), nx = (mouse[0] - r.left)/r.width*2 - 1, ny = 1 - (mouse[1] - r.top)/r.height*2;
    const f = applyP4(VPi, [nx, ny, 1]); return CE.raycast(cur.W, eye, norm(sub(f, eye)), 400, cutY); }
  const applyP4 = (m, p) => { const x = m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], y = m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], z = m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14], w = m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]; return [x/w, y/w, z/w]; };
  cv.addEventListener('dblclick', () => { const e = pick(); if (e) target = [e.x + .5, e.y + .5, e.z + .5]; });
  setNight(night); $('bSpin').classList.toggle('on', spin);

  // ------------------------------------------------------------------ frame
  const LP = new Float32Array(32), LC = new Float32Array(32), GB = new Float32Array(256);
  let last = performance.now(), time = 0, tipT = 0;
  function phase() { if (nt <= .01) return opts.dayLabel || 'Day'; if (!night) return 'Dawn: falling asleep';
    return nt < 3 ? 'Nightfall: the moon turns red' : nt < 9 ? 'Awakening' : 'Awake under the blood moon'; }
  function frame(now) { requestAnimationFrame(frame); draw(now); }
  function draw(now) {
    const dt = Math.min(.05, (now - last)/1000); last = now; time += dt;
    if (!cur) return;
    nt = night ? Math.min(nt + dt, 60) : Math.max(nt - dt*3, 0);
    const uN = ss(0, 3, nt);
    if (spin && !drag) yaw += dt*.05;
    resize();
    $('ph').textContent = phase();
    eye = [target[0] + dist*Math.cos(pitch)*Math.sin(yaw), target[1] + dist*Math.sin(pitch), target[2] + dist*Math.cos(pitch)*Math.cos(yaw)];
    if (cur.shakeAt != null && night && nt > cur.shakeAt) { const a = .35*Math.exp(-(nt - cur.shakeAt)*2.2); eye = eye.map((v, i) => v + Math.sin(time*(37 + i*11))*a); }
    eye[1] = Math.max(eye[1], .6);
    const view = lookAt(eye, target, [0, 1, 0]), proj = perspective(55*Math.PI/180, W/H, .1, 1500), VP = mul(proj, view);
    VPi = invert(VP);
    const R = [view[0], view[4], view[8]], U = [view[1], view[5], view[9]];
    const G0 = cur.groups ? cur.groups(nt, time) : [], G = Array.from({ length:16 }, (_, g) => G0[g] || I4());
    for (let g = 0; g < 16; g++) GB.set(G[g], g*16);
    const L = cur.lights; LP.fill(0); LC.fill(0);
    L.slice(0, 8).forEach((l, i) => { const p = l.grp ? applyP(G[l.grp], l.p) : l.p; LP.set([p[0], p[1], p[2], l.d], i*4); LC.set([l.c[0], l.c[1], l.c[2], l.rad], i*4); });
    const beams = cur.beams ? cur.beams(nt, time, G) : [];
    if (mouse && !drag && now - tipT > 90) { tipT = now; const e = pick(), tip = $('tip');
      if (e) { tip.textContent = `${CE.describe(e)}\nat ${e.x}, ${e.y}, ${e.z}`; tip.style.display = 'block';
        tip.style.left = Math.min(mouse[0] + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (mouse[1] + 16) + 'px'; }
      else tip.style.display = 'none'; }
    // sky
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbS); gl.viewport(0, 0, W, H);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(P_BG.p); gl.bindVertexArray(vaoE);
    gl.uniformMatrix4fv(P_BG.u.uInvVP, false, VPi); gl.uniform3fv(P_BG.u.uCam, eye);
    gl.uniform3fv(P_BG.u.uSun, cur.sun); gl.uniform3fv(P_BG.u.uMoon, cur.moon); gl.uniform1f(P_BG.u.uN, uN); gl.uniform1f(P_BG.u.uTime, time);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // blocks: solid and cutout, then translucent
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(P_BLOCK.p); const u = P_BLOCK.u;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, cur.tex); gl.uniform1i(u.uTex, 0);
    gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniformMatrix4fv(u.uG, false, GB);
    gl.uniform3fv(u.uCam, eye); gl.uniform3fv(u.uSun, cur.sun); gl.uniform3fv(u.uMoon, cur.moon);
    gl.uniform1f(u.uN, uN); gl.uniform1f(u.uAT, nt); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uCut, cutY);
    gl.uniform4fv(u.uLP, LP); gl.uniform4fv(u.uLC, LC); gl.uniform1i(u.uNL, Math.min(8, L.length));
    gl.uniform1i(u.uPass, 0);
    for (const m of [cur.ground, cur.solid]) if (m && m.n) { gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0); }
    gl.enable(gl.BLEND); gl.depthMask(false);
    if (cur.trans.n) { gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.uniform1i(u.uPass, 1); gl.bindVertexArray(cur.trans.vao); gl.drawElements(gl.TRIANGLES, cur.trans.n, gl.UNSIGNED_INT, 0); }
    // particles and beams (additive)
    gl.blendFunc(gl.ONE, gl.ONE);
    if (cur.parts.length) { gl.useProgram(P_PART.p); gl.bindVertexArray(vaoP);
      gl.uniformMatrix4fv(P_PART.u.uVP, false, VP); gl.uniform3fv(P_PART.u.uR, R); gl.uniform3fv(P_PART.u.uU, U);
      gl.uniform1f(P_PART.u.uTime, time); gl.uniform1f(P_PART.u.uAT, nt); gl.uniform1f(P_PART.u.uN, uN);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, cur.parts.length/11); }
    if (beams.length) { gl.useProgram(P_BEAM.p); gl.bindVertexArray(vaoQ);
      const BA = new Float32Array(6), BB = new Float32Array(6), BWd = new Float32Array(2), BE = new Float32Array(2);
      beams.slice(0, 2).forEach((b, i) => { BA.set(b.a, i*3); BB.set(b.b, i*3); BWd[i] = b.w; BE[i] = b.e*uN; });
      gl.uniformMatrix4fv(P_BEAM.u.uVP, false, VP); gl.uniform3fv(P_BEAM.u.uCam, eye); gl.uniform1f(P_BEAM.u.uTime, time);
      gl.uniform3fv(P_BEAM.u.uBA, BA); gl.uniform3fv(P_BEAM.u.uBB, BB); gl.uniform1fv(P_BEAM.u.uBW, BWd); gl.uniform1fv(P_BEAM.u.uBE, BE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, Math.min(2, beams.length)); }
    gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    // bloom and tone mapping
    gl.bindVertexArray(vaoE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.viewport(0, 0, BW, BH);
    gl.useProgram(P_BRIGHT.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texS);
    gl.uniform1i(P_BRIGHT.u.uS, 0); gl.uniform2f(P_BRIGHT.u.uPx, 1/W, 1/H); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(P_BLUR.p); gl.uniform1i(P_BLUR.u.uS, 0);
    for (let k = 0; k < 2; k++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbB); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform2f(P_BLUR.u.uDir, (1.5+k)/BW, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.bindTexture(gl.TEXTURE_2D, texB); gl.uniform2f(P_BLUR.u.uDir, 0, (1.5+k)/BH); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(P_COMP.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texS); gl.uniform1i(P_COMP.u.uS, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texA); gl.uniform1i(P_COMP.u.uB, 1);
    gl.uniform1f(P_COMP.u.uT, time); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }
  requestAnimationFrame(frame);
  select(vi);
  // for tests and screenshots: CE.view.look({ target, dist, yaw, pitch, spin, nt })
  return CE.view = { select, setNight, draw:() => draw(performance.now()), look(o) { if (o.target) target = o.target.slice(); if (o.dist != null) dist = o.dist; if (o.yaw != null) yaw = o.yaw;
    if (o.pitch != null) pitch = o.pitch; if (o.spin != null) { spin = o.spin; $('bSpin').classList.toggle('on', spin); } if (o.nt != null) nt = o.nt; } };
};
})();
