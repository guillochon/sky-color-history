/* ---------- Section 1: globe through time ---------- */
const globe=document.getElementById('globe'), gctx=globe.getContext('2d');
const cache={};
function tag(ctx, text, x, y){ // white label on a translucent chip, readable on a bright limb
  const m=ctx.measureText(text), w=m.width, asc=m.actualBoundingBoxAscent||12, desc=m.actualBoundingBoxDescent||3, px=5, py=2;
  let left=ctx.textAlign==='center'?x-w/2:ctx.textAlign==='right'?x-w:x;
  const max=ctx.canvas.width-3;
  if(left+w+px>max){ x-=left+w+px-max; left=max-w-px; }
  if(left-px<3){ x+=3-(left-px); left=3+px; }
  ctx.save(); ctx.fillStyle='rgba(8,10,16,.62)'; ctx.beginPath(); ctx.roundRect(left-px, y-asc-py, w+px*2, asc+desc+py*2, 3); ctx.fill(); ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.92)'; ctx.fillText(text, x, y);
}
function renderGlobe(ep){
  if(cache[ep.key]) return cache[ep.key];
  const W=globe.width,H=globe.height; const off=document.createElement('canvas'); off.width=W; off.height=H; const ctx=off.getContext('2d');
  const img=ctx.createImageData(W,H), px=img.data; const d=ep.limb; const lats=d.lats, alts=d.alts, hmax=alts[alts.length-1];
  const cx=W/2, cy=H/2, R=W*0.30, EX=0.5;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); let c=[0.02,0.024,0.04];
    if(r<R){ const lat=Math.min(82.5,Math.abs(Math.asin(dy/R))*180/Math.PI); const [i,t]=bracket(lats,lat); const a=d.disk[i],b=d.disk[i+1]; const mu=Math.pow(Math.max(0,1-(r/R)**2),0.18); c=[0,1,2].map(q=>(a[q]+(b[q]-a[q])*t)*mu); }
    else if(r<R*(1+EX)){ const h=(r/R-1)/EX*hmax; const lat=Math.min(82.5,Math.abs(Math.asin(dy/r))*180/Math.PI); const [i,t]=bracket(lats,lat),[j,u]=bracket(alts,h); const G=d.limb;
      c=[0,1,2].map(q=>{const a=G[i][j][q]+(G[i][j+1][q]-G[i][j][q])*u, b=G[i+1][j][q]+(G[i+1][j+1][q]-G[i+1][j][q])*u; return a+(b-a)*t;});
      const f=Math.min(1,(R*(1+EX)-r)/(R*EX*0.08)); c=c.map((v,q)=>[0.02,0.024,0.04][q]+(v-[0.02,0.024,0.04][q])*f); }
    const o=(y*W+x)*4; px[o]=c[0]*255; px[o+1]=c[1]*255; px[o+2]=c[2]*255; px[o+3]=255;
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='15px Newsreader, Georgia, serif';
  [[0,'0'],[20,'20'],[50,'50'],[100,'100 km']].forEach(([h,l],n)=>{const rr=R*(1+EX*h/hmax); ctx.beginPath(); ctx.moveTo(cx+rr,cy); ctx.lineTo(cx+rr,cy+9); ctx.stroke(); tag(ctx,l,cx+rr-6,cy+26+(n%2?16:0));});
  tag(ctx,'equator',cx-R*0.98+6,cy-6); tag(ctx,'pole',cx-16,cy-R-8);
  cache[ep.key]=off; return off;
}
let tPos=11, tIdx=11;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let refreshGlobeTip=()=>{}, refreshDomeTip=()=>{};
function drawGlobeAt(pos){ // blend between neighboring epochs
  const i=Math.floor(pos), t=pos-i; const a=renderGlobe(EP[i]);
  gctx.globalAlpha=1; gctx.drawImage(a,0,0);
  if(t>0.001 && i<EP.length-1){ const b=renderGlobe(EP[i+1]); gctx.globalAlpha=t; gctx.drawImage(b,0,0); gctx.globalAlpha=1; }
  gctx.font='italic 22px Newsreader, Georgia, serif'; tag(gctx, EP[Math.round(pos)].name, 14, globe.height-9);
  refreshGlobeTip();
}
const WIKI={
  hadean44:['Hadean','https://en.wikipedia.org/wiki/Hadean'],
  hadean40:['Hadean','https://en.wikipedia.org/wiki/Hadean'],
  archean38:['Eoarchean','https://en.wikipedia.org/wiki/Eoarchean'],
  archean27thin:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27vthick:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  proterozoic22:['Paleoproterozoic','https://en.wikipedia.org/wiki/Paleoproterozoic'],
  snowball07:['Snowball Earth','https://en.wikipedia.org/wiki/Snowball_Earth'],
  carbon30:['Carboniferous','https://en.wikipedia.org/wiki/Carboniferous'],
  kpg66:['Cretaceous–Paleogene extinction event','https://en.wikipedia.org/wiki/Cretaceous–Paleogene_extinction_event'],
  zetaoph:['Zeta Ophiuchi','https://en.wikipedia.org/wiki/Zeta_Ophiuchi'],
  geminga:['Geminga','https://en.wikipedia.org/wiki/Geminga'],
  volcanic:['Year Without a Summer','https://en.wikipedia.org/wiki/Year_Without_a_Summer'],
  modern:['Holocene','https://en.wikipedia.org/wiki/Holocene'],
  modernpoll:['Air pollution','https://en.wikipedia.org/wiki/Air_pollution'],
  ozonehole:['Ozone depletion','https://en.wikipedia.org/wiki/Ozone_depletion'],
  y2100:['Satellite constellation','https://en.wikipedia.org/wiki/Satellite_constellation']
};
// One epoch for the whole page: the globe follows the timeline continuously, and the dome and
// VR follow it whenever it reaches another epoch.
function showEpoch(pos){
  tPos=pos; drawGlobeAt(pos);
  const i=Math.round(pos);
  if(i!==dIdx){ const yf=yearFraction(), L=dayHours(); dIdx=i; if(dayHours()!==L) document.getElementById('moonDate').value=dateAtFraction(...yf); sel.value=String(i); renderDay(); warm(); }
  if(i===tIdx && document.getElementById('tname').textContent) return; tIdx=i;
  const ep=EP[i];
  document.getElementById('tname').textContent=ep.name;
  document.getElementById('tage').textContent=ep.age;
  document.getElementById('tsub').textContent=ep.sub;
  const wiki=WIKI[ep.key], wa=document.getElementById('twiki');
  wa.href=wiki[1]; wa.textContent=wiki[0]+' on Wikipedia';
  document.getElementById('tprose').textContent=ep.prose;
  // Long descriptions open on demand.
  const box=document.getElementById('tprosebox'), more=document.getElementById('tmore');
  box.classList.remove('open'); more.setAttribute('aria-expanded','false'); more.textContent='Read more';
  const fits=box.scrollHeight<=box.clientHeight+4;
  more.hidden=fits; box.classList.toggle('fits', fits);
  const domes=document.getElementById('tdomes'); domes.innerHTML='';
  for(const L of ['Equator','Mid-latitude','Polar summer']){ const v=ep.lat[L]; const zc=hex(tone(xyY2XYZ(v.z),YREF)), hc=hex(tone(xyY2XYZ(v.h),YREF));
    domes.insertAdjacentHTML('beforeend',`<figure><div class="sky" style="background:linear-gradient(${zc},${hc})"></div><figcaption>${L}<small>zenith ${v.zc.toLocaleString()} K · horizon ${v.hc.toLocaleString()} K</small></figcaption></figure>`); }
  document.querySelectorAll('#ttrack .tick').forEach((t,j)=>{ const on=j===i; t.classList.toggle('on',on); if(on) t.setAttribute('aria-current','true'); else t.removeAttribute('aria-current'); });
}
document.getElementById('tmore').addEventListener('click', e=>{
  const box=document.getElementById('tprosebox'), open=box.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open)); e.currentTarget.textContent=open?'Show less':'Read more';
});
const track=document.getElementById('ttrack');
EP.forEach((ep,i)=>{ const t=document.createElement('button'); t.type='button'; t.className='tick row'+(i%2); t.style.left=(100*i/(EP.length-1))+'%'; t.setAttribute('aria-label',ep.name); t.innerHTML='<i></i><span class="lb"></span><span class="name"></span>'; t.querySelector('.lb').textContent=ep.age; t.querySelector('.name').textContent=ep.name; t.addEventListener('click',()=>setEpoch(i)); track.appendChild(t); });
const tslider=document.getElementById('tslider');
function setEpoch(i){ i=Math.max(0, Math.min(EP.length-1, i)); tslider.value=String(i); showEpoch(i); }
tslider.addEventListener('input',()=>{ showEpoch(+tslider.value); });
let tRAF=null; const tplay=document.getElementById('tplay');
// The timeline's Play holds still while the globe is scrolled away.
let globeOnScreen=true;
if(window.IntersectionObserver) new IntersectionObserver(es=>{ globeOnScreen=es[es.length-1].isIntersecting; }).observe(globe);
tplay.addEventListener('click',()=>{ if(tRAF){cancelAnimationFrame(tRAF);tRAF=null;tplay.textContent='Play';tplay.setAttribute('aria-pressed','false');return;}
  tplay.textContent='Pause'; tplay.setAttribute('aria-pressed','true'); let last=performance.now();
  const speed=1/2200; // epochs per ms (2.2 s per epoch)
  const step=now=>{ const dt=now-last; last=now; tRAF=requestAnimationFrame(step); if(!globeOnScreen) return; let p=tPos+dt*speed; if(p>EP.length-1) p=0; tslider.value=p.toFixed(2); showEpoch(p); };
  tRAF=requestAnimationFrame(step); });
