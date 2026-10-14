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
  const cx=W/2, cy=H/2, R=W*0.30, EX=0.5, RO=R*(1+EX), BG=[0.02,0.024,0.04], G=d.limb;
  for(let y=0;y<H;y++){
    // On the disk the latitude depends on the row alone.
    const dy=y-cy; let disk=null;
    for(let x=0;x<W;x++){
      const dx=x-cx, r=Math.hypot(dx,dy), o=(y*W+x)*4; let c0=BG[0], c1=BG[1], c2=BG[2];
      if(r<R){
        if(!disk) disk=bracket(lats, Math.min(82.5,Math.abs(Math.asin(dy/R))*180/Math.PI));
        const [i,t]=disk, a=d.disk[i], b=d.disk[i+1], mu=Math.pow(Math.max(0,1-(r/R)**2),0.18);
        c0=(a[0]+(b[0]-a[0])*t)*mu; c1=(a[1]+(b[1]-a[1])*t)*mu; c2=(a[2]+(b[2]-a[2])*t)*mu;
      }else if(r<RO){
        const h=(r/R-1)/EX*hmax; const lat=Math.min(82.5,Math.abs(Math.asin(dy/r))*180/Math.PI); const [i,t]=bracket(lats,lat),[j,u]=bracket(alts,h);
        const A0=G[i][j], A1=G[i][j+1], B0=G[i+1][j], B1=G[i+1][j+1], f=Math.min(1,(RO-r)/(R*EX*0.08));
        const v=q=>{ const a=A0[q]+(A1[q]-A0[q])*u, b=B0[q]+(B1[q]-B0[q])*u; return BG[q]+(a+(b-a)*t-BG[q])*f; };
        c0=v(0); c1=v(1); c2=v(2);
      }
      px[o]=c0*255; px[o+1]=c1*255; px[o+2]=c2*255; px[o+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='15px Newsreader, Georgia, serif';
  [[0,'0'],[20,'20'],[50,'50'],[100,'100 km']].forEach(([h,l],n)=>{const rr=R*(1+EX*h/hmax); ctx.beginPath(); ctx.moveTo(cx+rr,cy); ctx.lineTo(cx+rr,cy+9); ctx.stroke(); tag(ctx,l,cx+rr-6,cy+26+(n%2?16:0));});
  tag(ctx,'equator',cx-R*0.98+6,cy-6); tag(ctx,'pole',cx-16,cy-R-8);
  cache[ep.key]=off; return off;
}
let tPos=11, tIdx=11;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let refreshGlobeTip=()=>{}, refreshDomeTip=()=>{}, refreshBarTip=()=>{}, refreshNoonTip=()=>{};
// The globe of the epoch shown: its limb is made for the epoch's own air, and a blend with the next
// tick's could show the wrong one (the Snowball's ice a billion years early).
function drawGlobeAt(pos){
  void pos;
  gctx.globalAlpha=1; gctx.drawImage(renderGlobe(EP[dIdx]),0,0);
  gctx.font='italic 22px Newsreader, Georgia, serif'; tag(gctx, EP[dIdx].name, 14, globe.height-9);
  refreshGlobeTip();
}
const WIKI=aliasEpochs({
  protoearth455:['Nice model','https://en.wikipedia.org/wiki/Nice_model'],
  hadean45:['Giant-impact hypothesis','https://en.wikipedia.org/wiki/Giant-impact_hypothesis'],
  hadean40:['Hadean','https://en.wikipedia.org/wiki/Hadean'],
  archean38:['Eoarchean','https://en.wikipedia.org/wiki/Eoarchean'],
  archean27thin:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  archean27vthick:['Neoarchean','https://en.wikipedia.org/wiki/Neoarchean'],
  proterozoic22:['Paleoproterozoic','https://en.wikipedia.org/wiki/Paleoproterozoic'],
  snowball07:['Snowball Earth','https://en.wikipedia.org/wiki/Snowball_Earth'],
  cryogenian65:['Cryogenian','https://en.wikipedia.org/wiki/Cryogenian'],
  ordovician466:['Ordovician meteor event','https://en.wikipedia.org/wiki/Ordovician_meteor_event'],
  carbon30:['Carboniferous','https://en.wikipedia.org/wiki/Carboniferous'],
  cretaceous66:['Late Cretaceous','https://en.wikipedia.org/wiki/Late_Cretaceous'],
  kpg66:['Cretaceous–Paleogene extinction event','https://en.wikipedia.org/wiki/Cretaceous–Paleogene_extinction_event'],
  zetaoph:['Zeta Ophiuchi','https://en.wikipedia.org/wiki/Zeta_Ophiuchi'],
  geminga:['Geminga','https://en.wikipedia.org/wiki/Geminga'],
  y1900:['Light pollution','https://en.wikipedia.org/wiki/Light_pollution'],
  volcanic:['Year Without a Summer','https://en.wikipedia.org/wiki/Year_Without_a_Summer'],
  modern:['Holocene','https://en.wikipedia.org/wiki/Holocene'],
  modernpoll:['Air pollution','https://en.wikipedia.org/wiki/Air_pollution'],
  ozonehole:['Ozone depletion','https://en.wikipedia.org/wiki/Ozone_depletion'],
  y2100:['Satellite constellation','https://en.wikipedia.org/wiki/Satellite_constellation']
});
// One epoch for the whole page: the globe follows the timeline continuously, and the dome and
// VR follow it whenever it reaches another epoch (setEpoch; the timeline itself sets the year,
// slideTo). date, when given, makes the page date in the
// new epoch (epoch_time.js); otherwise the new epoch keeps the season (calendar.js, epochDate).
function showEpoch(pos, date){
  tPos=pos;
  const i=Math.round(pos);
  if(i!==dIdx){ const yf=yearFraction(), prev=EP[dIdx].key; dIdx=i; document.getElementById('moonDate').value=date?date():epochDate(prev, yf); sel.value=String(i); renderDay(); warm(); }
  drawGlobeAt(pos);
  if(i===tIdx && document.getElementById('tname').textContent) return; tIdx=i;
  const ep=EP[i];
  document.getElementById('tname').textContent=ep.name;
  epochTimeText();
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
    domes.insertAdjacentHTML('beforeend',`<figure><div class="sky" data-lat="${L}" data-zc="${zc}" data-hc="${hc}" style="background:linear-gradient(${zc},${hc})"></div><figcaption>${L}<small>zenith ${v.zc.toLocaleString()} K · horizon ${v.hc.toLocaleString()} K</small></figcaption></figure>`); }
  refreshNoonTip();
  markTicks();
}
document.getElementById('tmore').addEventListener('click', e=>{
  const box=document.getElementById('tprosebox'), open=box.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open)); e.currentTarget.textContent=open?'Show less':'Read more';
});
const track=document.getElementById('ttrack');
EP.forEach((ep,i)=>{ const t=document.createElement('button'); t.type='button'; t.className='tick row'+(i%2); t.style.left=(100*i/(EP.length-1))+'%'; t.setAttribute('aria-label',ep.name); t.innerHTML='<i></i><span class="lb"></span><span class="name"></span>'; t.querySelector('.lb').textContent=ep.age; t.querySelector('.name').textContent=ep.name; t.addEventListener('click',()=>setEpoch(i)); track.appendChild(t); });
const tslider=document.getElementById('tslider');
function setEpoch(i, date){ i=Math.max(0, Math.min(EP.length-1, i)); tslider.value=String(i); showEpoch(i, date); }
// The timeline sets the time. The epochs' ticks are evenly spaced; between two, the year runs
// linearly from one's to the next's, so the slider passes through every year, and near a tick
// (TICK_SNAP) it holds that epoch at its own year. The epoch shown is the one the year belongs to.
const TICK_SNAP=0.12;
let tickT=null, sliding=false;
function tickTimes(){ return tickT||(tickT=EP.map(e=>epochAnchor(e.key))); }
function timeAtPos(p){ const T=tickTimes(), i=Math.max(0, Math.min(EP.length-2, Math.floor(p))), u=Math.max(0, Math.min(1, p-i)); return T[i]+(T[i+1]-T[i])*u; }
function posAtTime(A){
  const T=tickTimes();
  if(A===T[dIdx]) return dIdx;
  if(A<=T[0]) return 0;
  for(let i=0;i<EP.length-1;i++) if(A>=T[i] && A<=T[i+1] && T[i+1]>T[i]) return i+(A-T[i])/(T[i+1]-T[i]);
  return EP.length-1;
}
function slideTo(p){
  const i=Math.round(p);
  if(Math.abs(p-i)<TICK_SNAP){
    // Onto a tick: its epoch at its own year, steadied too where that is a million years old or more.
    if(i!==dIdx || !atAnchor(EP[i].key)){
      const ref=skyRef(), A0=pageTime(), T=tickTimes()[i];
      goToEpoch(i);
      if(2000-T>=1e6){ const B=steadyYear(T, ref, A0, p>=tPos?1:-1); if(B!==T) goToYearIn(B, dIdx); }
    }
  }
  else{
    const A=Math.round(timeAtPos(p)), j=epochIndexAt(A+yearFraction()[1]), ref=skyRef(), A0=pageTime(), dir=p>=tPos?1:-1;
    // Into another epoch: there first, then steadied in its calendar.
    if(j!==dIdx){ goToYearIn(A, j); const B=steadyYear(A, ref, A0, dir); if(B!==A) goToYearIn(B, dIdx); }
    else goToYearIn(steadyYear(A, ref, A0, dir), j);
  }
  slideYear=pageTime(); tslider.value=String(p); tPos=p; drawGlobeAt(p); tslider.setAttribute('aria-valuetext', shownAge()); epochTimeText(); markTicks();
}
// As the timeline moves, a frame's year jumps by as much as millions of years, and the sky's fast
// cycles land anywhere in their course: the Moon's phase and nodes, and the tilt's and the
// perihelion's tens of thousands of years. The Moon would leap across the sky from frame to frame,
// and the Sun wobble by most of a degree. So, like a strobe, each frame takes the year near its
// own that keeps the Sun, then the Moon, nearest where they were (ref, skyRef before the move):
// first to the thousand years within STEADY_KYR thousand (for frames a hundred thousand years
// apart or more), then among the years within STEADY_YEARS the STEADY_TRY whose Moon is nearest
// the phase it had, the one that puts it nearest where it was. Together they never stray more than
// a third of the way to the next frame's year (nor a hundredth of the age), so the years still run one way. Where frames are
// less than a few decades apart (near today) that leaves no room, so the year holds until the
// timeline passes it, then goes on to whichever of the next STEADY_METON years (the Metonic cycle,
// after which the phases come round to the same dates) suits the Moon best.
const STEADY_KYR=20, STEADY_YEARS=400, STEADY_TRY=24, STEADY_METON=19;
function sunDirNow(){ const s=sunGeom(LATDEG[dLat], minutes); return horizDir(s.az, 90-s.sza); }
function moonDirNow(){ const m=lunarPlace(LATDEG[dLat]); return horizDir(m.az, m.el); }
// The Moon's elongation east of the Sun, as a fraction of a turn, where the sky places them.
function moonPhaseNow(){ return moonPhaseAt(astroDay()); }
function moonPhaseAt(d){ const g=geoPair(d), c=vcross(g.s, g.m), x=Math.atan2(Math.hypot(...c)*Math.sign(c[2]||1), vdot(g.s, g.m))/(2*Math.PI); return x-Math.floor(x); }
function skyRef(){ return {sun:sunDirNow(), moon:noMoon()?null:moonDirNow(), phase:moonPhaseNow()}; }
// dir is the way the timeline moves (+1 later, -1 earlier).
function steadyYear(A, ref, A0, dir){
  const step=Math.abs(A-A0), strobe=step<6*STEADY_METON && ref.moon && !noMoon();
  // Near today: hold until the timeline has passed the year shown.
  if(strobe && (dir>0?A<=A0:A>=A0)) return A0;
  if(step<1) return A;
  const input=document.getElementById('moonDate'), save=input.value, [,M,D]=pageDate(), shift=epochShift();
  const sep=(u, v)=>Math.acos(Math.max(-1, Math.min(1, vdot(u, v))));
  const at=Y=>{ const y=Y-shift; input.value=fmtDate(y, M, Math.min(D, monthLen(y, M))); };
  // Only years that show the same epoch: a nudge must not carry the sky out of an event (the impact
  // winter lasts under two years) or across into the next epoch.
  const f=yearFraction()[1], key=EP[dIdx].key, keeps=Y=>epochIndexAt(Y+f, key)===dIdx;
  const best=(cands, cost)=>{ let b=A, bc=Infinity; for(const Y of cands){ if(!keeps(Y)) continue; at(Y); const c=cost(); if(c<bc){ bc=c; b=Y; } } return b; };
  try{
    let B=A;
    // Never more than a hundredth of the age: a jump from the Pleistocene to 1858 stays in 1858.
    const room=Math.min(step/6, 0.01*Math.abs(2000-A)), K=Math.min(STEADY_KYR, Math.floor(room/1000));
    if(K>=1) B=best(Array.from({length:2*K+1}, (_, k)=>A+(k-K)*1000), ()=>sep(sunDirNow(), ref.sun));
    const J=Math.max(1, Math.min(STEADY_YEARS, Math.floor(room)));
    if(ref.moon && !noMoon()){
      const near=[], [lo, hi]=!strobe?[B-J, B+J]:dir>0?[A0+1, A+STEADY_METON]:[A-STEADY_METON, A0-1];
      for(let Y=lo;Y<=hi;Y++){ at(Y); let d=moonPhaseNow()-ref.phase; d-=Math.round(d); near.push([Math.abs(d), Y]); }
      near.sort((a, b)=>a[0]-b[0]);
      B=best(near.slice(0, STEADY_TRY).map(n=>n[1]), ()=>sep(moonDirNow(), ref.moon)+2*sep(sunDirNow(), ref.sun));
    }
    return B;
  }finally{ input.value=save; }
}
// The timeline's ticks: the one nearest the slider's thumb is lit, so the light moves along with
// it; an event interrupts its background epoch, whose tick may lie behind, so the epoch whose sky
// is shown, when it is another, is marked apart.
let ticksMarked='';
function markTicks(){
  const at=Math.max(0, Math.min(EP.length-1, Math.round(tPos))), id=at+'|'+dIdx;
  if(id===ticksMarked) return; ticksMarked=id;
  document.querySelectorAll('#ttrack .tick').forEach((t, j)=>{
    t.classList.toggle('on', j===at); t.classList.toggle('sky', j===dIdx && j!==at);
    if(j===dIdx) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
  });
}
tslider.addEventListener('input',()=>{ sliding=true; slideTo(+tslider.value); sliding=false; });
// The slider and the epoch's time text follow the date, however it was set.
// A year the timeline set itself (slideTo, steadied off the slider's own year) leaves the slider be.
let slideYear=null;
function syncTimeline(){
  const p=posAtTime(pageTime());
  if(!sliding && pageTime()!==slideYear && Math.abs(p-tPos)>0.004){ tslider.value=String(p); tPos=p; drawGlobeAt(p); }
  markTicks();
  tslider.setAttribute('aria-valuetext', shownAge());
  epochTimeText();
}
function epochTimeText(){
  const age=document.getElementById('tage'), note=document.getElementById('tnote'), a=shownAge(), n=epochNote();
  if(age.textContent!==a) age.textContent=a;
  if(note.textContent!==n){ note.textContent=n; note.hidden=!n; }
}
let tRAF=null; const tplay=document.getElementById('tplay');
// The timeline's Play holds still while the epoch bar, the dome and the globe are all scrolled away.
const epochViews=new Set(); let epochOnScreen=true;
if(window.IntersectionObserver){ const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting) epochViews.add(e.target); else epochViews.delete(e.target); }); epochOnScreen=epochViews.size>0; });
  [tplay.closest('.controlbar'), document.getElementById('dome'), globe].forEach(el=>{ if(el) io.observe(el); }); }
tplay.addEventListener('click',()=>{ if(tRAF){cancelAnimationFrame(tRAF);tRAF=null;tplay.textContent='Play through time';tplay.setAttribute('aria-pressed','false');return;}
  tplay.textContent='Pause'; tplay.setAttribute('aria-pressed','true'); let last=performance.now();
  const speed=1/2200; // epochs per ms (2.2 s per epoch)
  const step=now=>{ const dt=now-last; last=now; tRAF=requestAnimationFrame(step); if(!epochOnScreen) return; let p=tPos+dt*speed; if(p>EP.length-1) p=0; sliding=true; slideTo(p); sliding=false; };
  tRAF=requestAnimationFrame(step); });
