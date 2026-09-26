import json
D = json.load(open('/home/claude/skycolors.json'))
LIMB = json.load(open('/home/claude/limb_all.json'))
DAY = json.load(open('/home/claude/daycycle.json'))
import io, contextlib
ns = {}
with contextlib.redirect_stdout(io.StringIO()):
    exec(open('/home/claude/gen_report.py').read(), ns)
PROSE = ns['PROSE']
order = ['hadean44','hadean40','archean38','archean27thin','archean27','archean27vthick','proterozoic22','snowball07','carbon30','kpg66','volcanic','modern','modernpoll']
ages = {'hadean44':'4.4 Ga','hadean40':'4.0 Ga','archean38':'3.8 Ga','archean27thin':'2.7 Ga','archean27':'2.7 Ga','archean27vthick':'2.7 Ga','proterozoic22':'2.2 Ga','snowball07':'700 Ma','carbon30':'300 Ma','kpg66':'66 Ma','volcanic':'1815 CE','modern':'Today','modernpoll':'Today'}
short = {'hadean44':'Early Hadean','hadean40':'Late Hadean','archean38':'Early Archean','archean27thin':'Thin haze','archean27':'Thick haze','archean27vthick':'Very thick haze','proterozoic22':'Post-oxidation','snowball07':'Snowball Earth','carbon30':'Carboniferous','kpg66':'Impact winter','volcanic':'Volcanic year','modern':'Clean air','modernpoll':'Polluted city'}
byk = {r['key']: r for r in D}
EP = []
for k in order:
    r = byk[k]
    EP.append(dict(key=k, name=r['name'], sub=r['sub'].replace('tau(550nm)','τ(550 nm)'), age=ages[k], short=short[k], prose=PROSE[k],
                   lat={L: dict(z=[v['zenith']['x'], v['zenith']['y'], v['zenith']['Y']], h=[v['horizon']['x'], v['horizon']['y'], v['horizon']['Y']],
                                zc=int(v['zenith']['cct']), hc=int(v['horizon']['cct'])) for L, v in r['lat'].items()},
                   limb=LIMB[k]))
YREF = byk['modern']['lat']['Equator']['zenith']['Y']

html = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Earth's Sky Through Time</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&display=swap" rel="stylesheet">
<style>
:root{--bg:#dfe2e8;--bg2:#cfd3db;--ink:#1a2130;--ink2:#4a5263;--rule:#a4aab6;--space:#0a0c12;--stage:#6f737b;--accent:#1a2130;
 box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#171b24;--bg2:#1f2430;--ink:#e9ebef;--ink2:#aeb4c0;--rule:#3d4453;--accent:#e9ebef}}
:root[data-theme="dark"]{--bg:#171b24;--bg2:#1f2430;--ink:#e9ebef;--ink2:#aeb4c0;--rule:#3d4453;--accent:#e9ebef}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Newsreader,Georgia,"Times New Roman",serif;font-weight:300;font-size:18px;line-height:1.45}
main{max-width:1100px;margin:0 auto;padding:1rem 1rem 4rem}
h1{font-weight:300;font-size:clamp(2rem,6vw,3.6rem);line-height:1.02;margin:1rem 0 .4rem;letter-spacing:-.01em}
h1 em{font-style:italic}
h2{font-weight:400;font-size:1.6rem;margin:2.6rem 0 .3rem;line-height:1.1}
p{margin:.35rem 0 .8rem;max-width:64ch}
.lede{color:var(--ink2);font-size:1.1rem}
.stage{background:var(--space);border-radius:4px;overflow:hidden;position:relative}
.stage.light{background:var(--stage)}
canvas{display:block;width:100%;height:auto}
.row{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:1.2rem;align-items:start}
@media (max-width:760px){.row{grid-template-columns:1fr}}
.controls{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;margin:.7rem 0 .2rem}
button{font:inherit;font-size:.95rem;color:var(--ink);background:var(--bg2);border:1px solid var(--rule);border-radius:3px;padding:.28rem .8rem;cursor:pointer}
button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
select{font:inherit;font-size:.95rem;color:var(--ink);background:var(--bg2);border:1px solid var(--rule);border-radius:3px;padding:.28rem .5rem;max-width:100%}
input[type=range]{width:100%;accent-color:var(--ink);margin:.4rem 0}
.track{position:relative;height:3.6rem;margin:0 .2rem}
.tick{position:absolute;top:0;transform:translateX(-50%);font-size:.72rem;color:var(--ink2);text-align:center;white-space:nowrap;line-height:1.15}
.tick.row1{top:1.15rem}.tick.row1 i{height:26px;margin-top:-18px}
.tick em{display:none;font-style:normal}
.tick.on em{display:block;font-size:.78rem}
.tick.on{z-index:2}
.tick i{display:block;width:1px;height:8px;background:var(--rule);margin:0 auto 3px}
.tick.on{color:var(--ink);font-weight:500}
.readout{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.4rem 1rem;font-size:.92rem;color:var(--ink2);margin:.5rem 0}
.readout b{display:block;font-weight:400;color:var(--ink);font-size:1.15rem}
.domes{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;background:var(--stage);padding:.5rem;border-radius:4px}
.domes figure{margin:0}.domes .sky{height:110px;border-radius:2px}
.domes figcaption{font-size:.78rem;color:#f2f3f5;margin-top:.3rem;line-height:1.2}
.domes figcaption small{display:block;color:#cfd3da;font-size:.7rem}
.epoch-title{margin:.2rem 0 0;font-size:1.45rem;font-weight:400;line-height:1.15}
.epoch-sub{color:var(--ink2);font-size:.95rem;margin:0 0 .6rem}
.swatchbar{display:flex;gap:2px;height:26px;border-radius:2px;overflow:hidden;background:var(--stage);padding:2px;margin:.4rem 0}
.swatchbar i{flex:1}
.legend{font-size:.8rem;color:var(--ink2)}
.foot{border-top:1px solid var(--rule);margin-top:3rem;padding-top:1rem;font-size:.9rem;color:var(--ink2)}
.foot a{color:inherit}
.hint{font-size:.85rem;color:var(--ink2)}
@media (max-width:760px){.tick .lb{visibility:hidden}.tick.on .lb{visibility:visible}.tick:first-child .lb,.tick:last-child .lb{visibility:visible}.tick.on .lb{background:var(--bg);padding:0 .3rem}}
.tick.on .lb{background:var(--bg);padding:0 .3rem;border-radius:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
.tip{position:absolute;pointer-events:none;background:rgba(20,22,30,.92);color:#fff;font-size:.85rem;padding:.3rem .5rem .3rem .35rem;border-radius:3px;display:none;white-space:nowrap;z-index:5;transform:translate(14px,-50%)}
.tip i{display:inline-block;width:1.1em;height:1.1em;border-radius:2px;vertical-align:-3px;margin-right:.4em;border:1px solid rgba(255,255,255,.5)}
.stage canvas{cursor:crosshair}
</style></head><body><main>
<h1>Earth's sky <em>through time</em></h1>
<p class="lede">An interactive companion to the sky-colour reconstruction. Scrub the timeline to watch the atmosphere change from the steam-and-CO₂ Hadean to today, then pick an epoch and scrub through a day to see how its sky moved from dawn to dusk. Every colour comes from the same spectral radiative-transfer model as the report.</p>

<h2>Four and a half billion years</h2>
<p class="hint">The globe is seen from space at equinox with the Sun behind you, so latitude runs from the equator at the centre line to the poles at top and bottom. The atmosphere is drawn 30× too thick so that altitude structure shows.</p>
<div class="row">
 <div>
  <div class="stage" id="gstage"><div class="tip" id="gtip"></div><canvas id="globe" width="720" height="720" aria-label="Volumetric rendering of Earth's atmosphere for the selected epoch"></canvas></div>
  <input id="tslider" type="range" min="0" max="12" step="0.01" value="11" aria-label="Epoch">
  <div class="track" id="ttrack"></div>
  <div class="controls"><button id="tplay" aria-pressed="false">Play</button><span class="hint">or drag the slider; ← → keys step</span></div>
 </div>
 <div>
  <h3 class="epoch-title" id="tname"></h3>
  <p class="epoch-sub" id="tsub"></p>
  <div class="domes" id="tdomes"></div>
  <p class="legend">Noon sky, zenith at top and horizon at bottom, at the equator, mid-latitudes and the summer pole; the Sun's disc in its own colour and brightness. Brightness relative to today's clean sky.</p>
  <p id="tprose"></p>
 </div>
</div>

<h2>A day under that sky</h2>
<p class="hint">A whole-sky (fisheye) view: the zenith is at the centre and the horizon is the rim, north at the top. Equinox geometry, so the Sun rises due east at 6:00 and sets due west at 18:00 everywhere; at the poles the noon Sun sits only 15° above the horizon.</p>
<div class="row">
 <div>
  <div class="stage" id="dstage"><div class="tip" id="dtip"></div><canvas id="dome" width="600" height="600" aria-label="Whole-sky view for the selected epoch, latitude and time of day"></canvas></div>
  <input id="hslider" type="range" min="270" max="1170" step="5" value="720" aria-label="Time of day (minutes)">
  <div class="controls">
   <button id="hplay" aria-pressed="false">Play</button>
   <span id="hclock" style="font-size:1.2rem;min-width:4.5ch"></span>
   <button id="expo" aria-pressed="true" title="Normalise brightness so that colour is visible in dim skies">Auto-exposure</button>
  </div>
 </div>
 <div>
  <div class="controls">
   <select id="depoch" aria-label="Epoch"></select>
   <span role="group" aria-label="Latitude"><button data-lat="Equator" aria-pressed="false">Equator</button> <button data-lat="Mid-latitude" aria-pressed="true">45°</button> <button data-lat="Polar" aria-pressed="false">75°</button></span>
  </div>
  <div class="readout">
   <div>Sun elevation<b id="relev"></b></div>
   <div>Zenith<b id="rzen"></b></div>
   <div>Horizon (side)<b id="rhor"></b></div>
   <div>Sun's disc<b id="rsun"></b></div>
  </div>
  <div class="swatchbar" id="hbar"></div>
  <p class="legend">Sky along the Sun's vertical: from the horizon under the Sun, up through the zenith, down to the opposite horizon.</p>
  <p id="dprose" class="hint"></p>
 </div>
</div>

<div class="foot">Model and data: spherical-shell single scattering with a delta-Eddington multiple-scattering correction, 380–780 nm, CIE 1931 colour matching, sRGB output without chromatic adaptation. Colours are what a daylight-balanced camera would record, not what an adapted eye would perceive. Clouds are omitted; paleoatmosphere compositions carry order-of-magnitude uncertainty. Time of day is interpolated between 21 computed solar zenith angles; the sky is computed down to a solar depression of 10°, after which it is shown dark.</div>
</main>
<script>
const EP = __EP__;
const DAY = __DAY__;
const YREF = __YREF__;
const M = [[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const g = v => v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055;
function xyY2XYZ(c){ const [x,y,Y]=c; if(y<=0||Y<=0) return [0,0,0]; return [x*Y/y, Y, (1-x-y)*Y/y]; }
function XYZ2rgb(X, expo){ // linear rgb 0..1, soft hue-preserving clip
  let r=M[0][0]*X[0]+M[0][1]*X[1]+M[0][2]*X[2], gg=M[1][0]*X[0]+M[1][1]*X[1]+M[1][2]*X[2], b=M[2][0]*X[0]+M[2][1]*X[1]+M[2][2]*X[2];
  r=Math.max(0,r*expo); gg=Math.max(0,gg*expo); b=Math.max(0,b*expo);
  const mx=Math.max(r,gg,b); if(mx>1){r/=mx;gg/=mx;b/=mx;} return [r,gg,b];
}
function tone(X, Yref, k=0.85, p=0.4, cap=0.92, floor=0){ // returns sRGB 0..255
  if(X[1]<=1e-7*Yref) return [5,6,10];
  let t=Math.min(cap, k*Math.pow(X[1]/Yref,p)); t=Math.max(t,floor);
  const rgb=XYZ2rgb(X, t/X[1]); return rgb.map(v=>Math.round(255*g(v)));
}
function cct(x,y){ const n=(x-0.3320)/(0.1858-y); return Math.round(449*n**3+3525*n**2+6823.3*n+5520.33); }
const hex = a => '#'+a.map(v=>v.toString(16).padStart(2,'0')).join('');

/* ---------- Section 1: globe through time ---------- */
const globe=document.getElementById('globe'), gctx=globe.getContext('2d');
const cache={};
function renderGlobe(ep){
  if(cache[ep.key]) return cache[ep.key];
  const W=globe.width,H=globe.height; const off=document.createElement('canvas'); off.width=W; off.height=H; const ctx=off.getContext('2d');
  const img=ctx.createImageData(W,H), px=img.data; const d=ep.limb; const lats=d.lats, alts=d.alts, hmax=alts[alts.length-1];
  const cx=W/2, cy=H/2, R=W*0.30, EX=0.5;
  const samp=(xs,x)=>{ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; };
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); let c=[0.02,0.024,0.04];
    if(r<R){ const lat=Math.min(82.5,Math.abs(Math.asin(dy/R))*180/Math.PI); const [i,t]=samp(lats,lat); const a=d.disk[i],b=d.disk[i+1]; const mu=Math.pow(Math.max(0,1-(r/R)**2),0.18); c=[0,1,2].map(q=>(a[q]+(b[q]-a[q])*t)*mu); }
    else if(r<R*(1+EX)){ const h=(r/R-1)/EX*hmax; const lat=Math.min(82.5,Math.abs(Math.asin(dy/r))*180/Math.PI); const [i,t]=samp(lats,lat),[j,u]=samp(alts,h); const G=d.limb;
      c=[0,1,2].map(q=>{const a=G[i][j][q]+(G[i][j+1][q]-G[i][j][q])*u, b=G[i+1][j][q]+(G[i+1][j+1][q]-G[i+1][j][q])*u; return a+(b-a)*t;});
      const f=Math.min(1,(R*(1+EX)-r)/(R*EX*0.08)); c=c.map((v,q)=>[0.02,0.024,0.04][q]+(v-[0.02,0.024,0.04][q])*f); }
    const o=(y*W+x)*4; px[o]=c[0]*255; px[o+1]=c[1]*255; px[o+2]=c[2]*255; px[o+3]=255;
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='15px Newsreader, Georgia, serif';
  [[0,'0'],[20,'20'],[50,'50'],[100,'100 km']].forEach(([h,l],n)=>{const rr=R*(1+EX*h/hmax); ctx.beginPath(); ctx.moveTo(cx+rr,cy); ctx.lineTo(cx+rr,cy+9); ctx.stroke(); ctx.fillText(l,cx+rr-6,cy+26+(n%2?16:0));});
  ctx.fillText('equator',cx-R*0.98+6,cy-6); ctx.fillText('pole',cx-16,cy-R-8);
  cache[ep.key]=off; return off;
}
let tPos=11, tIdx=11;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawGlobeAt(pos){ // blend between neighbouring epochs
  const i=Math.floor(pos), t=pos-i; const a=renderGlobe(EP[i]);
  gctx.globalAlpha=1; gctx.drawImage(a,0,0);
  if(t>0.001 && i<EP.length-1){ const b=renderGlobe(EP[i+1]); gctx.globalAlpha=t; gctx.drawImage(b,0,0); gctx.globalAlpha=1; }
  gctx.font='italic 22px Newsreader, Georgia, serif'; gctx.fillStyle='rgba(255,255,255,.9)'; gctx.fillText(EP[Math.round(pos)].name, 18, globe.height-18);
}
function showEpoch(pos){
  tPos=pos; drawGlobeAt(pos);
  const i=Math.round(pos); if(i===tIdx && document.getElementById('tname').textContent) return; tIdx=i;
  const ep=EP[i];
  document.getElementById('tname').textContent=ep.name;
  document.getElementById('tsub').textContent=ep.sub;
  document.getElementById('tprose').textContent=ep.prose;
  const domes=document.getElementById('tdomes'); domes.innerHTML='';
  for(const L of ['Equator','Mid-latitude','Polar summer']){ const v=ep.lat[L]; const zc=hex(tone(xyY2XYZ(v.z),YREF)), hc=hex(tone(xyY2XYZ(v.h),YREF));
    domes.insertAdjacentHTML('beforeend',`<figure><div class="sky" style="background:linear-gradient(${zc},${hc})"></div><figcaption>${L}<small>zenith ${v.zc.toLocaleString()} K · horizon ${v.hc.toLocaleString()} K</small></figcaption></figure>`); }
  document.querySelectorAll('#ttrack .tick').forEach((t,j)=>t.classList.toggle('on',j===i));
}
const track=document.getElementById('ttrack');
EP.forEach((ep,i)=>{ const t=document.createElement('div'); t.className='tick row'+(i%2); t.style.left=(100*(i+0.5)/EP.length)+'%'; t.innerHTML=`<i></i><span class="lb">${ep.age}<em>${ep.short}</em></span>`; track.appendChild(t); });
const tslider=document.getElementById('tslider');
tslider.addEventListener('input',()=>{ showEpoch(+tslider.value); });
let tRAF=null; const tplay=document.getElementById('tplay');
tplay.addEventListener('click',()=>{ if(tRAF){cancelAnimationFrame(tRAF);tRAF=null;tplay.textContent='Play';tplay.setAttribute('aria-pressed','false');return;}
  tplay.textContent='Pause'; tplay.setAttribute('aria-pressed','true'); let last=performance.now();
  const speed=1/2200; // epochs per ms (2.2 s per epoch)
  const step=now=>{ const dt=now-last; last=now; let p=tPos+dt*speed; if(p>EP.length-1) p=0; tslider.value=p.toFixed(2); showEpoch(p); tRAF=requestAnimationFrame(step); };
  tRAF=requestAnimationFrame(step); });
/* ---------- Section 2: a day under that sky ---------- */
const dome=document.getElementById('dome'), dctx=dome.getContext('2d');
const sel=document.getElementById('depoch'); EP.forEach((ep,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${ep.age} — ${ep.name}`; sel.appendChild(o); });
let dIdx=11, dLat='Mid-latitude', minutes=720, autoExpo=true;
sel.value=dIdx;
const LATDEG={'Equator':0,'Mid-latitude':45,'Polar':75};
const SZ=DAY.szas, VZ=DAY.vz, AZ=DAY.az;
function sunGeom(lat,min){ const h=(min/60-12)*15*Math.PI/180, phi=lat*Math.PI/180; const cz=Math.cos(phi)*Math.cos(h); const z=Math.acos(Math.max(-1,Math.min(1,cz)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)); let comp=180+A*180/Math.PI; if(lat===0){ comp = h<0?90:270; } return {sza:z, az:((comp%360)+360)%360}; }
function idx(xs,x){ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; }
// interpolate XYZ of the dome grid at (sza, vz, azrel): linear in sza, cubic Hermite in vz and az
function herm(xs, ys, x){ // ys: array of [X,Y,Z]; returns [X,Y,Z]
  const n=xs.length; if(x<=xs[0]) return ys[0]; if(x>=xs[n-1]) return ys[n-1];
  let i=0; while(i<n-2 && x>=xs[i+1]) i++;
  const h=xs[i+1]-xs[i], t=(x-xs[i])/h;
  const out=[0,0,0];
  for(let q=0;q<3;q++){
    const y0=ys[i][q], y1=ys[i+1][q];
    const m0 = i>0 ? (y1-ys[i-1][q])/(xs[i+1]-xs[i-1]) : (y1-y0)/h;
    const m1 = i<n-2 ? (ys[i+2][q]-y0)/(xs[i+2]-xs[i]) : (y1-y0)/h;
    const t2=t*t,t3=t2*t;
    out[q]=Math.max(0,(2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*y1+(t3-t2)*h*m1);
  }
  return out;
}
const dense={}; // per (epoch,lat,sza-slice): 91 x 91 table of XYZ, 1 deg in vz, 2 deg in az
function denseSlice(key, lat, s){
  const id=key+'|'+lat+'|'+s; if(dense[id]) return dense[id];
  const G=DAY.epochs[key][lat].dome[s].map(row=>row.map(xyY2XYZ));
  const T=new Float32Array(91*91*3);
  const cols=[]; for(let a=0;a<=90;a++){ cols.push(G.map(row=>herm(AZ,row,a*2))); }
  for(let v=0;v<=90;v++){ for(let a=0;a<=90;a++){ const X=herm(VZ,cols[a],Math.min(v,88)); const o=(v*91+a)*3; T[o]=X[0];T[o+1]=X[1];T[o+2]=X[2]; } }
  dense[id]=T; return T;
}
function domeXYZ(key, lat, si, st, vz, azr){
  const out=[0,0,0];
  const fv=Math.min(90,vz), iv=Math.min(89,Math.floor(fv)), tv=fv-iv; const fa=azr/2, ia=Math.min(89,Math.floor(fa)), ta=fa-ia;
  for(const [s,ws] of [[si,1-st],[si+1,st]]) if(ws>0){
    const T=denseSlice(key,lat,s);
    for(let q=0;q<3;q++){ const o00=(iv*91+ia)*3+q, o01=(iv*91+ia+1)*3+q, o10=((iv+1)*91+ia)*3+q, o11=((iv+1)*91+ia+1)*3+q;
      const a=T[o00]*(1-ta)+T[o01]*ta, b=T[o10]*(1-ta)+T[o11]*ta; out[q]+=ws*(a*(1-tv)+b*tv); }
  }
  return out;
}
function renderDay(){
  const ep=EP[dIdx], rec=DAY.epochs[ep.key][dLat]; const {sza,az:sunAz}=sunGeom(LATDEG[dLat],minutes);
  const W=dome.width,H=dome.height, cx=W/2, cy=H/2, R=W*0.46;
  const img=dctx.createImageData(W,H), px=img.data;
  const night = sza>=SZ[SZ.length-1];
  const [si,st]=idx(SZ,Math.min(sza,SZ[SZ.length-1]));
  // precompute a coarse polar grid then bilinear-expand for speed
  const NR=72, NA=144; const grid=[];
  let Ymax=1e-30;
  for(let ir=0;ir<=NR;ir++){ const row=[]; const vz=90*ir/NR; for(let ia=0;ia<=NA;ia++){ const comp=360*ia/NA; let azr=Math.abs(comp-sunAz); if(azr>180) azr=360-azr;
      const X=night?[0,0,0]:domeXYZ(ep.key,dLat,si,st,Math.min(vz,88),azr); if(X[1]>Ymax) Ymax=X[1]; row.push(X);} grid.push(row); }
  const Yref = autoExpo ? Math.max(Ymax, 1e-6*YREF) : YREF; const k = autoExpo?0.85:0.85, p = autoExpo?0.5:0.4;
  const colgrid=grid.map(row=>row.map(X=>tone(X,Yref,k,p,0.95)));
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); const o=(y*W+x)*4;
    if(r>R){ px[o]=10;px[o+1]=12;px[o+2]=18;px[o+3]=255; continue; }
    const fr=(r/R)*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir;
    let ang=Math.atan2(dx,-dy)*180/Math.PI; if(ang<0) ang+=360; const fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia;
    for(let q=0;q<3;q++){ const a=colgrid[ir][ia][q]*(1-ta)+colgrid[ir][ia+1][q]*ta, b=colgrid[ir+1][ia][q]*(1-ta)+colgrid[ir+1][ia+1][q]*ta; px[o+q]=a*(1-tr)+b*tr; }
    px[o+3]=255;
  }
  dctx.putImageData(img,0,0);
  // sun
  const sunc=rec.sun[Math.min(si+ (st>0.5?1:0), rec.sun.length-1)];
  const sX=xyY2XYZ(sunc); const sunRel = sX[1]/DAY.epochs['modern']['Equator'].sun[0][2];
  if(sza<90 && sunRel>3e-4){ const rr=R*sza/90, a=sunAz*Math.PI/180; const sx=cx+rr*Math.sin(a), sy=cy-rr*Math.cos(a);
    const op=Math.min(1,0.35+0.65*(Math.log10(sunRel)+3.5)/3.5); const col=hex(tone(sX, sX[1], 0.95,0.4,0.98));
    const grd=dctx.createRadialGradient(sx,sy,0,sx,sy,26); grd.addColorStop(0,col); grd.addColorStop(0.35,col); grd.addColorStop(1,col+'00');
    dctx.globalAlpha=op; dctx.fillStyle=grd; dctx.beginPath(); dctx.arc(sx,sy,26,0,7); dctx.fill(); dctx.globalAlpha=1; }
  // compass + rim
  dctx.strokeStyle='rgba(255,255,255,.35)'; dctx.lineWidth=1.5; dctx.beginPath(); dctx.arc(cx,cy,R,0,7); dctx.stroke();
  dctx.fillStyle='rgba(255,255,255,.8)'; dctx.font='16px Newsreader, Georgia, serif'; dctx.textAlign='center';
  dctx.fillText('N',cx,cy-R-6); dctx.fillText('S',cx,cy+R+18); dctx.fillText('E',cx+R+12,cy+6); dctx.fillText('W',cx-R-12,cy+6); dctx.textAlign='left';
  dctx.font='italic 20px Newsreader, Georgia, serif'; dctx.fillText(`${ep.name} · ${dLat==='Polar'?'75° latitude':dLat==='Mid-latitude'?'45° latitude':'equator'}`, 16, H-16);
  // readouts
  const hh=Math.floor(minutes/60), mm=minutes%60; document.getElementById('hclock').textContent=`${hh}:${String(mm).padStart(2,'0')}`;
  document.getElementById('relev').textContent=(90-sza).toFixed(1)+'°';
  const zX=night?[0,0,0]:domeXYZ(ep.key,dLat,si,st,0,0), hX=night?[0,0,0]:domeXYZ(ep.key,dLat,si,st,88,90);
  const fmt=X=>{ if(X[1]<=1e-7*YREF) return 'dark'; const s=X[0]+X[1]+X[2]; const c=cct(X[0]/s,X[1]/s); return (c>800&&c<60000? c.toLocaleString()+' K':'—')+` · ${(100*X[1]/YREF).toPrecision(2)}%`; };
  document.getElementById('rzen').textContent=fmt(zX); document.getElementById('rhor').textContent=fmt(hX);
  document.getElementById('rsun').textContent = sza>=90 ? 'below horizon' : (sunRel<=3e-4 ? 'not visible' : (()=>{const s=sX[0]+sX[1]+sX[2]; return cct(sX[0]/s,sX[1]/s).toLocaleString()+' K · '+(sunRel*100).toPrecision(2)+'%';})());
  // swatch bar along the sun's vertical
  const bar=document.getElementById('hbar'); bar.innerHTML='';
  const pts=[[88,0],[75,0],[60,0],[45,0],[30,0],[15,0],[0,0],[15,180],[30,180],[45,180],[60,180],[75,180],[88,180]];
  for(const [vz,azr] of pts){ const X=night?[0,0,0]:domeXYZ(ep.key,dLat,si,st,vz,azr); const i=document.createElement('i'); i.style.background=hex(tone(X,Yref,k,p,0.95)); i.title=`${vz}° from zenith, ${azr?'away from':'toward'} the Sun`; bar.appendChild(i); }
  document.getElementById('dprose').textContent = ep.prose;
}
function warm(){ const ep=EP[dIdx], key=ep.key, lat=dLat; let s=0; const step=()=>{ if(EP[dIdx].key!==key||dLat!==lat) return; while(s<SZ.length && dense[key+'|'+lat+'|'+s]) s++; if(s>=SZ.length) return; denseSlice(key,lat,s); s++; (window.requestIdleCallback||setTimeout)(step); }; (window.requestIdleCallback||setTimeout)(step); }
sel.addEventListener('change',()=>{ dIdx=+sel.value; renderDay(); warm(); });
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>{ dLat=b.dataset.lat; document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderDay(); warm(); }));
const hslider=document.getElementById('hslider'); hslider.addEventListener('input',()=>{ minutes=+hslider.value; renderDay(); });
const expo=document.getElementById('expo'); expo.addEventListener('click',()=>{ autoExpo=!autoExpo; expo.setAttribute('aria-pressed',autoExpo); renderDay(); });
let hTimer=null; const hplay=document.getElementById('hplay');
hplay.addEventListener('click',()=>{ if(hTimer){clearInterval(hTimer);hTimer=null;hplay.textContent='Play';hplay.setAttribute('aria-pressed','false');return;}
  hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); if(minutes>=1170) minutes=270;
  hTimer=setInterval(()=>{ minutes+=5; if(minutes>1170) minutes=270; hslider.value=minutes; renderDay(); },60); });
// keyboard on timeline stage
document.addEventListener('keydown',e=>{ if(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='SELECT') return; if(e.key==='ArrowRight'&&tIdx<EP.length-1){tslider.value=tIdx+1;showEpoch(tIdx+1);} if(e.key==='ArrowLeft'&&tIdx>0){tslider.value=tIdx-1;showEpoch(tIdx-1);} });
showEpoch(11); renderDay(); warm();
function colourTip(canvas, tip, inside){
  const ctx=canvas.getContext('2d'); let cur=null, copiedUntil=0;
  const show=(e)=>{ const b=canvas.getBoundingClientRect(); const px=(e.clientX-b.left)*canvas.width/b.width, py=(e.clientY-b.top)*canvas.height/b.height;
    if(!inside(px,py)){ tip.style.display='none'; cur=null; return; }
    const d=ctx.getImageData(Math.round(px),Math.round(py),1,1).data; cur=hex([d[0],d[1],d[2]]);
    tip.innerHTML=`<i style="background:${cur}"></i>${cur}${performance.now()<copiedUntil?' copied':''}`;
    tip.style.left=(e.clientX-b.left)+'px'; tip.style.top=(e.clientY-b.top)+'px'; tip.style.display='block'; };
  canvas.addEventListener('mousemove',show); canvas.addEventListener('mouseleave',()=>{tip.style.display='none';cur=null;});
  const copy=(e)=>{ show(e); if(!cur) return; if(navigator.clipboard){ navigator.clipboard.writeText(cur).then(()=>{ copiedUntil=performance.now()+1200; show(e); }); } };
  canvas.addEventListener('click',copy);
  canvas.addEventListener('touchstart',e=>{ const t=e.touches[0]; copy({clientX:t.clientX,clientY:t.clientY}); setTimeout(()=>{tip.style.display='none';},1500); },{passive:true});
}
colourTip(globe, document.getElementById('gtip'), (x,y)=>{ const r=Math.hypot(x-globe.width/2,y-globe.height/2); return r<globe.width*0.30*1.5; });
colourTip(dome, document.getElementById('dtip'), (x,y)=>{ const r=Math.hypot(x-dome.width/2,y-dome.height/2); return r<dome.width*0.46; });
</script>
</body></html>'''
html = html.replace('__EP__', json.dumps(EP, separators=(',',':'))).replace('__DAY__', json.dumps(DAY, separators=(',',':'))).replace('__YREF__', repr(YREF))
open('/mnt/user-data/outputs/sky-through-time.html','w').write(html)
print(len(html)/1e6, 'MB')
