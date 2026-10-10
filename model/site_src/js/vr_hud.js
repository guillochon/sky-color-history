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
  if(!show){ if(!mark.hidden) mark.hidden=true; return at; }
  const {px, py, ux, uy}=at, off=26;
  if(mark.hidden) mark.hidden=false;
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
// Labels (l): a name beside each star, planet, satellite and supernova that shows (an unnamed
// stand-in star in the deep epochs by its spectral type), and a cross on the radiant of each
// active meteor shower (showers.js radiantMarks). The faintest
// labelled grows with the zoom, from about V 1.6 across 90° and V 3 at the usual 60° to every
// point (V 6.5) by 20°, and a label that would overlap a brighter one's is left out, as is one
// on a point cloud hides. With them, the constellation figures and names (constellations.js),
// less each line whose stars have since moved too far apart to make it.
let vrLabels=false, vrLabelsDrawn=false;
const CON_PLACES={}, CON_KEEP={};
// A line is left out when its stars have moved to more than three times today's separation.
const CON_LINE_MAX=3;
// Whether each line of CON_FIG, in order, is drawn for the epoch: all of them unless its stars
// are moved there (CON_EPOCHS).
function conKeep(key){
  if(CON_KEEP[key]) return CON_KEEP[key];
  const E=CON_EPOCHS[key], keep=[];
  const unit=p=>{ const r=Math.PI/180, cd=Math.cos(p[1]*r); return [cd*Math.cos(p[0]*r), cd*Math.sin(p[0]*r), Math.sin(p[1]*r)]; };
  const sep=(p, q)=>Math.acos(Math.max(-1, Math.min(1, vdot(unit(p), unit(q)))));
  for(const [, , chains] of CON_FIG) for(const run of chains) for(let k=1;k<run.length;k++){
    const i=run[k-1], j=run[k];
    keep.push(!E||sep(E[i], E[j])<=CON_LINE_MAX*sep(CON_VERT[i], CON_VERT[j]));
  }
  return CON_KEEP[key]=keep;
}
// The figures' vertices for the epoch, as right ascension and declination of date, or null.
function conPlaces(key, year){
  const k=key+'|'+year;
  if(CON_PLACES[k]!==undefined) return CON_PLACES[k];
  const moved=CON_EPOCHS[key], src=moved||(starsFor(key)===STARS?CON_VERT:null);
  return CON_PLACES[k]=src&&src.map(v=>starMeanPlace([v[0], v[1], 0, 0, moved?0:v[2], moved?0:v[3]], key, year));
}
// The constellation lines, as great circles between their stars, cut at the horizon; returns
// the names to label, at the middle of the stars of each figure's lines that are drawn.
function drawConstellations(ctx, proj){
  const key=EP[dIdx].key, P=conPlaces(key, STAR_YEAR[key]||pageDate()[0]);
  if(!P) return [];
  const lat=LATDEG[dLat], LST=localSidereal();
  const dirs=P.map(p=>{ let H=rev(LST-rev(p.ra)); if(H>180) H-=360; const a=altaz(lat, p.dec, H); return horizDir(a.az, a.alt); });
  ctx.strokeStyle='rgba(140,170,225,.38)'; ctx.lineWidth=1; ctx.beginPath();
  const names=[], keep=conKeep(key);
  let li=0;
  for(const [, name, chains] of CON_FIG){
    const sum=[0, 0, 0];
    let any=false;
    for(const run of chains){
      for(let k=1;k<run.length;k++){
        if(!keep[li++]) continue;
        any=true;
        for(const i of [run[k-1], run[k]]){ sum[0]+=dirs[i][0]; sum[1]+=dirs[i][1]; sum[2]+=dirs[i][2]; }
        const a=dirs[run[k-1]], b=dirs[run[k]], ang=Math.acos(Math.max(-1, Math.min(1, vdot(a, b))));
        const n=Math.max(1, Math.ceil(ang*180/Math.PI/0.5)), s=Math.sin(ang)||1;
        let pen=false;
        for(let j=0;j<=n;j++){
          const t=j/n, wa=ang>1e-6?Math.sin((1-t)*ang)/s:1-t, wb=ang>1e-6?Math.sin(t*ang)/s:t;
          const d=[a[0]*wa+b[0]*wb, a[1]*wa+b[1]*wb, a[2]*wa+b[2]*wb], q=d[2]>0?proj(d):null;
          if(!q){ pen=false; continue; }
          if(pen) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
          pen=true;
        }
      }
    }
    const c=vnorm(sum);
    if(any&&c[2]>0.02){ const q=proj(c); if(q) names.push({x:q[0], y:q[1], text:name}); }
  }
  ctx.stroke();
  return names;
}
function drawVRLabels(){
  const c=document.getElementById('vrlabels'), dpr=Math.min(window.devicePixelRatio||1, 2), W=window.innerWidth, H=window.innerHeight;
  const w=Math.round(W*dpr), h=Math.round(H*dpr);
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; vrLabelsDrawn=false; }
  const ctx=c.getContext('2d'), on=vrLabels&&skyNow&&skyNow.starMarks;
  // A canvas left clear needs no clearing each frame.
  if(!on&&!vrLabelsDrawn) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
  vrLabelsDrawn=!!on;
  if(!on) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const lim=3+8*Math.log10(60/vrFov), key=EP[dIdx].key, pts=[];
  // The view's projection, as projectBody, for a direction at true altitude; null behind.
  const fy=Math.tan(vrFov*Math.PI/360), fx=fy*W/Math.max(H, 1), yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180;
  const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const proj=d=>{
    const e=apparentEl(Math.asin(Math.min(1, d[2]))*180/Math.PI)*Math.PI/180, r=Math.hypot(d[0], d[1])||1, ce=Math.cos(e);
    const v=[d[0]/r*ce, d[1]/r*ce, Math.sin(e)], depth=v[0]*sy*cp+v[1]*cy*cp+v[2]*sp;
    if(depth<0.02) return null;
    const x=(v[0]*cy-v[1]*sy)/depth/fx, y=(-v[0]*sy*sp-v[1]*cy*sp+v[2]*cp)/depth/fy;
    return Math.abs(x)<3&&Math.abs(y)<3?[W/2+x*W/2, H/2-y*H/2]:null;
  };
  for(const n of drawConstellations(ctx, proj)) if(n.x>0&&n.x<W&&n.y>0&&n.y<H) pts.push({x:n.x, y:n.y, mag:1, text:n.text, kind:'con'});
  const cloudAt=vrGL&&vrGL.cloudAt;
  const add=(s, text, kind)=>{
    if(s.el<=0) return;
    const p=projectBody(s.el, s.az, 0);
    if(!p.inView) return;
    // A planet drawn larger than its label's usual offset is labelled beside its disk (or rings).
    const x=W/2+p.nx*W/2, y=H/2-p.ny*H/2, off=s.kind!=null?s.radDeg*DISK_SCALE*(s.rings?2.3:1)/(vrFov/H):0;
    pts.push({x:x+off*0.7, y:y-off*0.7, mag:s.mag, text, kind});
  };
  if(skyNow.sn) add(skyNow.sn, skyNow.sn.name||'Supernova', 'sn');
  // Active meteor showers' radiants (showers.js), marked with a small cross.
  for(const r of radiantMarks()){ const p=projectBody(r.el, r.az, 0); if(p.inView) pts.push({x:W/2+p.nx*W/2, y:H/2-p.ny*H/2, mag:-3, text:r.text, kind:'rad'}); }
  for(const s of skyNow.starMarks){
    if((s.mag>lim&&!s.planet)||s.el<=0||markHidden(s)) continue;
    // Labelled when it shows: its colour as the sky pass adds it (faded near the naked-eye limit,
    // dimmed by the air), times what the cloud in front lets through. 0.06 is where the drawn
    // point stands out from the sky around it.
    const m=starThroughAir(s.mag, s.el, key), dim=Math.pow(10, -0.2*(m-s.mag));
    const a=cloudAt?cloudAt(horizDir(s.az, apparentEl(s.el))):0;
    if(Math.max(...s.rgb)*starVisible(m-(s.mag-markMag(s)), skyRAt(skyNow.rgrid, s.el, s.az)*skyNow.rCd)*dim*(1-a)<0.06) continue;
    add(s, s.planet||(s.star?s.star[7]||starTypeLabel(s.star[8]):'satellite'), s.host?'moon':s.planet?'planet':s.star?(s.star[7]?'star':'stype'):'sat');
  }
  pts.sort((a, b)=>a.mag-b.mag);
  ctx.textBaseline='middle'; ctx.lineJoin='round';
  const placed=[], STYLE={con:['italic 13px', 'rgba(150,180,235,.7)'], sn:['600 13px', '#dbeaff'], planet:['600 13px', '#ffe2a8'], moon:['11px', 'rgba(255,226,168,.75)'], rad:['600 12px', '#ffd2b8'], star:['12px', 'rgba(220,230,255,.85)'], stype:['italic 11px', 'rgba(205,215,240,.65)'], sat:['11px', 'rgba(180,190,205,.6)']};
  for(const p of pts){
    if(!p.text) continue;
    const [font, col]=STYLE[p.kind];
    ctx.font=font+' system-ui, sans-serif';
    const tw=ctx.measureText(p.text).width, x=p.kind==='con'?p.x-tw/2:p.x+7, y=p.kind==='con'?p.y:p.y-7, box=[x-2, y-8, x+tw+2, y+8];
    if(x+tw>W-4||y<40||y>H-72) continue;
    if(placed.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1])) continue;
    placed.push(box, [p.x-4, p.y-4, p.x+4, p.y+4]);
    ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.lineWidth=3; ctx.strokeText(p.text, x, y);
    ctx.fillStyle=col; ctx.fillText(p.text, x, y);
    if(p.kind==='rad'){ ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(p.x-5, p.y); ctx.lineTo(p.x+5, p.y); ctx.moveTo(p.x, p.y-5); ctx.lineTo(p.x, p.y+5); ctx.stroke(); }
    if(placed.length>400) break;
  }
}
// The note in the middle of the VR view while something slow is being prepared.
function showVRLoad(text){ const el=document.getElementById('vrload'); el.textContent=text; el.hidden=false; }
function hideVRLoad(){ document.getElementById('vrload').hidden=true; }
function andList(a){ return a.length<2?a.join(''):a.slice(0, -1).join(', ')+' and '+a[a.length-1]; }
function requestVR(){ if(!vrOn||vrRAF) return; vrRAF=requestAnimationFrame(()=>{ vrRAF=0; paintVR(); }); }
// A view locked on a pin (vrLockPin) turns only with what it is locked on.
function lookVR(dx, dy){ if(vrLockPin) return; const deg=vrFov/Math.max(window.innerHeight,1); vrYaw=(vrYaw+dx*deg)%360; if(vrYaw<0) vrYaw+=360; vrPitch=Math.max(-80, Math.min(85, vrPitch-dy*deg)); requestVR(); }
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
  if(!ev){ vrNote=central?'no total or annular eclipse in the next forty years':'no eclipse in the next eight years'; if(vrOn) paintVR(); else document.getElementById('recl').textContent=vrNote; return; }
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
  q.set('lat', dLat==='Equator'?'equator':String(LATDEG[dLat]));
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
  const latCode=dLat==='Equator'?'equator':String(LATDEG[dLat]);
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
    // Without a date in the link, the epoch's own year, at today's season.
    if(idx>=0 && idx<EP.length){ const yf=yearFraction(), prev=EP[dIdx].key; dIdx=idx; sel.value=String(dIdx); if(!q.get('date')) document.getElementById('moonDate').value=epochDate(prev, yf); }
  }
  const lat=(q.get('lat')||'').toLowerCase();
  const latName={equator:'Equator','0':'Equator','45':'Mid-latitude',mid:'Mid-latitude','mid-latitude':'Mid-latitude','75':'Polar',polar:'Polar','-45':'Mid-latitude S','-75':'Polar S'}[lat];
  if(latName){
    dLat=latName;
    document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===latName?'true':'false'));
  }
  const date=q.get('date');
  if(date && /^-?\d{4,}-\d{2}-\d{2}$/.test(date)) document.getElementById('moonDate').value=date;
  const raw=q.get('t');
  if(raw){
    let m=NaN;
    if(raw.includes(':')){ const p=raw.split(':'); m=((+p[0])*60+(+p[1]||0))*24/dayHours(); } // in the epoch's hours
    else m=+raw;
    if(m>=0 && m<=DAYMIN){ minutes=m; hslider.value=String(minutes); }
  }
  return q.has('vr');
}
