function projectBody(elDeg, azDeg, radiusDeg){
  const fov=vrFov*Math.PI/180, W=window.innerWidth, H=window.innerHeight;
  const fy=Math.tan(fov*0.5), fx=fy*(W/Math.max(H,1));
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180;
  const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const el=apparentEl(elDeg)*Math.PI/180, az=azDeg*Math.PI/180;
  const sd=[Math.sin(az)*Math.cos(el), Math.cos(az)*Math.cos(el), Math.sin(el)];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const depth=dot(sd,[sy*cp, cy*cp, sp]);
  const camX=dot(sd,[cy, -sy, 0]), camY=dot(sd,[-sy*sp, -cy*sp, cp]);
  const ahead=depth>0.02;
  let nx, ny;
  if(ahead){ nx=(camX/depth)/fx; ny=(camY/depth)/fy; }
  else { const m=Math.hypot(camX,camY)||1; nx=camX/m; ny=camY/m; }
  const margin=(radiusDeg*Math.PI/180)/fy;
  const inView=ahead && Math.abs(nx)<1+margin && Math.abs(ny)<1+margin;
  return {nx, ny, inView, W, H};
}
function markPoint(proj){
  let nx=proj.nx, ny=proj.ny;
  const {inView, W, H}=proj;
  let px, py;
  if(inView){ px=W/2+nx*W/2; py=H/2-ny*H/2; }
  else {
    const s=Math.max(Math.abs(nx), Math.abs(ny), 1e-6); nx/=s; ny/=s;
    px=W/2+nx*(W/2-46); py=H/2-ny*(H/2-46);
  }
  const ur=Math.hypot(nx,ny)||1;
  return {px, py, ux:nx/ur, uy:ny/ur};
}
function placeMark(mark, proj, show){
  const at=markPoint(proj);
  if(!show){ mark.hidden=true; return at; }
  const {px, py, ux, uy}=at, off=26;
  mark.hidden=false;
  mark.style.left=px+'px'; mark.style.top=py+'px';
  if(!mark._chev){ mark._chev=mark.querySelector('.chev'); mark._badge=mark.querySelector('.badge'); }
  mark._chev.style.transform=`rotate(${Math.atan2(ux, uy)}rad)`;
  mark._badge.style.transform=`translate(calc(-50% + ${(-ux*off).toFixed(1)}px), calc(-50% + ${(uy*off).toFixed(1)}px))`;
  return at;
}
function drawMoonPhase(lit, toward){
  const c=document.getElementById('moonphase'), ctx=c.getContext('2d'), s=c.width, r=s*0.36;
  ctx.clearRect(0,0,s,s);
  ctx.save(); ctx.translate(s/2,s/2); ctx.rotate(toward);
  ctx.fillStyle='#2a2c32'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();
  ctx.fillStyle='#e8e8ea';
  const k=1-2*Math.max(0,Math.min(1,lit));
  ctx.beginPath();
  ctx.arc(0,0,r,-Math.PI/2,Math.PI/2,false);
  ctx.ellipse(0,0,Math.max(0.001,Math.abs(k))*r,r,0,Math.PI/2,-Math.PI/2,k>0);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle='#000'; ctx.lineWidth=s*0.06; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.restore();
}
let bodyMarks=null, moonPhaseDrawn=null;
function placeBodyMarks(){
  const sunEl=90-skyNow.sza, moon=skyNow.moon;
  const sun=projectBody(sunEl, skyNow.sunAz, skyNow.moon.sunRadDeg*DISK_SCALE);
  const moonProj=projectBody(moon.el, moon.az, moon.radDeg*DISK_SCALE);
  const m=bodyMarks||(bodyMarks={sun:document.getElementById('sunmark'), moon:document.getElementById('moonmark'), sn:document.getElementById('snmark')});
  // The supernova, while it is up, as the Sun and Moon.
  const sn=skyNow.sn, snProj=sn&&projectBody(sn.el, sn.az, 0.5);
  placeMark(m.sn, snProj||sun, !!sn && sn.el>0 && !snProj.inView);
  const sunAt=placeMark(m.sun, sun, !(skyNow.sunOn && sun.inView));
  if(!m.sun.hidden){ const rgb=skyNow.sunRGB; m.sun.style.color=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; }
  const moonAt=placeMark(m.moon, moonProj, !(moon.on && moonProj.inView));
  if(!m.moon.hidden){
    // Redrawn only when the phase or its tilt has visibly moved.
    const lit=moonLit(moon, skyNow.sunAz, sunEl), toward=Math.atan2(sunAt.py-moonAt.py, sunAt.px-moonAt.px), d=moonPhaseDrawn;
    if(!d || Math.abs(d.lit-lit)>0.002 || Math.abs(Math.atan2(Math.sin(d.toward-toward), Math.cos(d.toward-toward)))>0.01){
      drawMoonPhase(lit, toward); moonPhaseDrawn={lit, toward};
    }
  }
}
// The note in the middle of the VR view while something slow is being prepared.
function showVRLoad(text){ const el=document.getElementById('vrload'); el.textContent=text; el.hidden=false; }
function hideVRLoad(){ document.getElementById('vrload').hidden=true; }
function andList(a){ return a.length<2?a.join(''):a.slice(0, -1).join(', ')+' and '+a[a.length-1]; }
function requestVR(){ if(!vrOn||vrRAF) return; vrRAF=requestAnimationFrame(()=>{ vrRAF=0; paintVR(); }); }
function lookVR(dx, dy){ const deg=vrFov/Math.max(window.innerHeight,1); vrYaw=(vrYaw+dx*deg)%360; if(vrYaw<0) vrYaw+=360; vrPitch=Math.max(-80, Math.min(85, vrPitch-dy*deg)); requestVR(); }
function walking(){ return vrHeld.has('w')||vrHeld.has('a')||vrHeld.has('s')||vrHeld.has('d'); }
function stepWalk(dt){
  if(dt>0.05) dt=0.05;
  let f=0, s=0;
  if(vrHeld.has('w')) f++; if(vrHeld.has('s')) f--; if(vrHeld.has('d')) s++; if(vrHeld.has('a')) s--;
  if(!f&&!s) return;
  const yaw=vrYaw*Math.PI/180, sp=(vrHeld.has('shift')?120:24)*dt, inv=Math.hypot(f,s);
  const east=(Math.sin(yaw)*f+Math.cos(yaw)*s)/inv*sp, north=(Math.cos(yaw)*f-Math.sin(yaw)*s)/inv*sp;
  const sc=sceneFor(EP[dIdx].key);
  const hit=(x,y)=>{ if(!vrScenery) return false; if(townSolid(sc, x, y, 0.4)) return true; for(let i=0;i<12;i++){ if(sc.k[i]<0.5) continue; const dx=x-sc.o[i*4], dy=y-sc.o[i*4+1], r=scRad(sc.k[i], sc.o[i*4+2])+0.4; if(dx*dx+dy*dy<r*r) return true; } return false; };
  const nx=vrX+east, ny=vrY+north;
  if(!hit(nx,ny)){ vrX=nx; vrY=ny; } else if(!hit(nx,vrY)) vrX=nx; else if(!hit(vrX,ny)) vrY=ny;
}
function pumpWalk(){
  if(vrWalk||dayPlaying||!vrOn||!walking()) return;
  vrWalkStamp=performance.now();
  const frame=now=>{
    vrWalk=0;
    if(!vrOn||dayPlaying||!walking()) return;
    let dt=(now-vrWalkStamp)/1000; vrWalkStamp=now;
    stepWalk(dt); paintVR();
    vrWalk=requestAnimationFrame(frame);
  };
  vrWalk=requestAnimationFrame(frame);
}
function stepMinutes(d){
  if(dayPlaying) hplay.click();
  minutes+=d;
  while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
  while(minutes<0){ minutes+=DAYMIN; shiftMoonDate(-1); }
  hslider.value=minutes; renderDay();
}
function stepEpoch(d){
  setEpoch((dIdx+d%EP.length+EP.length)%EP.length);
}
// Jump to 30 minutes before the next eclipse, or with central set to 5 minutes before the next
// total or annular phase. Pressing again from that lead moves on to the one after.
// With totalOnly, annular eclipses are passed over too.
function jumpNextEclipse(central, totalOnly){
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); syncVRPad(); }
  const lead=(central?5:30)*60*1000;
  let after=pageMs()+1000, ev=null;
  for(let n=0;n<12;n++){
    ev=findNextEclipse(after, central);
    if(!ev) break;
    if(Math.abs(ev.start-lead-(after-1000))>90*1000 && !(totalOnly && ev.type!=='total')) break;
    after=ev.start+1000;
  }
  if(!ev){ vrNote=central?'no total or annular eclipse in the next forty years':'no eclipse in the next eight years'; if(vrOn) paintVR(); else document.getElementById('rsun').textContent=vrNote; return; }
  const at=pageAt(dayOfMs(ev.start-lead));
  document.getElementById('moonDate').value=at.date;
  minutes=at.min;
  hslider.value=minutes;
  const g=sunGeom(LATDEG[dLat], minutes), elev=90-g.sza;
  vrYaw=g.az; vrPitch=Math.max(-8, Math.min(15, elev-8));
  renderDay();
}
function vrQuery(){
  const q=new URLSearchParams(location.search);
  q.set('vr','1');
  q.set('epoch', EP[dIdx].key);
  q.set('lat', dLat==='Equator'?'equator':dLat==='Polar'?'75':'45');
  q.set('t', String(Math.floor(minutes)));
  q.set('date', document.getElementById('moonDate').value||localISODate(new Date()));
  return q;
}
function vrLinkURL(){ return location.pathname+'?'+vrQuery().toString()+location.hash; }
let vrLinkAt=0;
function syncVRLink(force){
  if(!vrOn||vrNav) return;
  const now=performance.now();
  if(!force && now-vrLinkAt<500) return;
  const url=vrLinkURL();
  if(location.pathname+location.search+location.hash===url) return;
  // Safari throws after about 100 replaceState calls per 30 seconds, and that error was stopping the clock.
  // iOS also repaints the page on each query change. On a phone, leave the clock out of the address bar until playback pauses.
  const q=new URLSearchParams(location.search);
  const latCode=dLat==='Equator'?'equator':dLat==='Polar'?'75':'45';
  const samePlace=q.get('epoch')===EP[dIdx].key && q.get('lat')===latCode;
  if(!force && vrTouch && samePlace) return;
  vrLinkAt=now;
  try{ history.replaceState({vr:1},'',url); }
  catch(err){}
}
function clearVRLink(){
  const q=new URLSearchParams(location.search);
  if(!q.has('vr')) return;
  q.delete('vr');
  const s=q.toString();
  history.replaceState({},'',location.pathname+(s?'?'+s:'')+location.hash);
}
function applyLink(){
  const q=new URLSearchParams(location.search);
  const ep=q.get('epoch');
  if(ep){
    let idx=EP.findIndex(e=>e.key===ep);
    if(idx<0 && /^\d+$/.test(ep)) idx=+ep;
    if(idx>=0 && idx<EP.length){ dIdx=idx; sel.value=String(dIdx); }
  }
  const lat=(q.get('lat')||'').toLowerCase();
  const latName={equator:'Equator','0':'Equator','45':'Mid-latitude',mid:'Mid-latitude','mid-latitude':'Mid-latitude','75':'Polar',polar:'Polar'}[lat];
  if(latName){
    dLat=latName;
    document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===latName?'true':'false'));
  }
  const date=q.get('date');
  if(date && /^\d{4}-\d{2}-\d{2}$/.test(date)) document.getElementById('moonDate').value=date;
  const raw=q.get('t');
  if(raw){
    let m=NaN;
    if(raw.includes(':')){ const p=raw.split(':'); m=((+p[0])*60+(+p[1]||0))*24/dayHours(); } // in the epoch's hours
    else m=+raw;
    if(m>=0 && m<=DAYMIN){ minutes=m; hslider.value=String(minutes); }
  }
  return q.has('vr');
}
