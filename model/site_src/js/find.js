// Find (f): a box in the middle of the screen takes a name and offers the three best matches as
// it is typed, any below the horizon grayed and not to be chosen; Enter (or a click) turns and
// zooms the walk-around view to the one chosen in two seconds, along van Wijk & Nuij's smooth
// path (pulling back for a long turn), until it fills half the view: the Sun, the Moon, a planet or moon by its drawn disk (rings and all), a nebula or
// galaxy by its tile's window, a constellation by its figure. A star or supernova, a point, ends in
// a field FIND_POINT_FOV high. The view then follows it as the sky turns: looking about moves it
// on the screen, and it is held there, as a share of the view's width and height through zooms,
// till a look takes the whole of it out of the view.
// From the page the dome does the same, as far as its zoom goes (domeFindStart).
const FIND_MS=2000, FIND_POINT_FOV=3, FIND_MAX=3;
const FIND_DSO_KIND={g:'galaxy', n:'nebula', p:'planetary nebula', r:'reflection nebula', s:'supernova remnant'};
// The asterisms better known than their constellations.
const FIND_ASTERISM={UMa:['Big Dipper', 'Plough'], UMi:['Little Dipper'], Sgr:['Teapot'], Cyg:['Northern Cross'], Cru:['Southern Cross']};
const FIND_GREEK={α:'alpha', β:'beta', γ:'gamma', δ:'delta', ε:'epsilon', ζ:'zeta', η:'eta', θ:'theta', ι:'iota', κ:'kappa', λ:'lambda', μ:'mu', ν:'nu', ξ:'xi', ο:'omicron', π:'pi', ρ:'rho', σ:'sigma', τ:'tau', υ:'upsilon', φ:'phi', χ:'chi', ψ:'psi', ω:'omega', '¹':'1', '²':'2', '³':'3'};
// The flight or follow under way: what, from where, and the path.
let vrFind=null;
const findBox=document.getElementById('find'), findQ=document.getElementById('findq'), findList=document.getElementById('findlist');
// The matches shown, and which are up (only those can be chosen); the chosen one, or -1.
let findHits=[], findUp=[], findSel=-1;
function findNorm(s){
  return s.replace(/[α-ω¹²³]/g, c=>' '+FIND_GREEK[c]).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findEdits(a, b){
  let row=Array.from({length:b.length+1}, (_, j)=>j);
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++) next[j]=Math.min(row[j]+1, next[j-1]+1, row[j-1]+(a[i-1]===b[j-1]?0:1));
    row=next;
  }
  return row[b.length];
}
// How well normalized query q matches a name, 0 for not at all: the whole name, its start, the
// start of a word (or of a word for each word typed), anywhere in it, then a slip or two of the
// keys at the start of the name or a word, then its letters in order.
function findScore(q, name){
  const n=findNorm(name);
  if(!n) return 0;
  const qc=q.replace(/ /g, ''), nc=n.replace(/ /g, ''), words=n.split(' '), qw=q.split(' ');
  if(nc===qc) return 100;
  if(nc.startsWith(qc)) return 90-Math.min(10, nc.length-qc.length)*0.5;
  if(words.some(w=>w.startsWith(q))) return 80;
  if(qw.length>1&&qw.every(a=>words.some(w=>w.startsWith(a)))) return 75;
  if(nc.includes(qc)) return 70;
  if(qc.length>=3){
    let d=9;
    for(const w of [nc, ...words]) for(const k of [-1, 0, 1]) d=Math.min(d, findEdits(qc, w.slice(0, qc.length+k)));
    if(d<=(qc.length>=7?2:1)) return 60-10*d;
  }
  if(qc.length>=2){
    let i=0, first=-1, last=-1;
    for(let j=0;j<nc.length&&i<qc.length;j++) if(nc[j]===qc[i]){ if(first<0) first=j; last=j; i++; }
    if(i===qc.length) return 30+10*qc.length/(last-first+1);
  }
  return 0;
}
// What can be found in the epoch shown: label, aliases, kind, a rank among equal matches, and
// what findWhere needs.
function findCatalog(){
  const key=EP[dIdx].key, year=STAR_YEAR[key]||pageDate()[0], out=[];
  out.push({name:'Sun', kind:'star', prio:10, t:{k:'sun'}});
  if(!noMoon()) out.push({name:'Moon', kind:'the Earth’s moon', prio:10, t:{k:'moon'}});
  for(const [name, b] of BODY_WHERE) out.push({name, kind:b.host?`moon of ${b.host}`:b.what?b.what.replace(/^an? /, ''):'planet', prio:b.host?4:9, t:{k:'body', name}});
  for(const s of transientPlaces(0)) out.push({name:s.name, also:[TR_TYPES[s.ev.type].label], kind:TR_TYPES[s.ev.type].label, prio:9, t:{k:'sn', id:s.ev.id}});
  const P=starPlaces(key, year);
  for(let i=0;i<P.n;i++){ const s=P.list[i]; if(s[7]) out.push({name:s[7], kind:'star', prio:Math.max(0, Math.min(8, 7-s[2])), t:{k:'star', star:s}}); }
  for(const o of DSO.objects){
    const e=o.ep[dataKey(key)];
    if(!e||!(e[3]>0)) continue;
    const both=/^(M|NGC )\d/.test(o.id)&&o.name!==o.id;
    out.push({name:both?`${o.id} ${o.name}`:o.name, also:[o.id, o.name], kind:FIND_DSO_KIND[o.k]||'nebula', prio:6, t:{k:'dso', o}});
  }
  if(conPlaces(key, year)) for(const [abbr, name] of CON_FIG) out.push({name, also:[abbr, ...(FIND_ASTERISM[abbr]||[])], kind:'constellation', prio:7, t:{k:'con', name}});
  return out;
}
// Where a found thing is now: its direction in the view's frame (apparent altitude), its true
// azimuth and altitude, how wide the walk-around view draws it in degrees (0 for a point), and for
// the Sun or Moon, drawn enlarged, its true radius (disk); null when the epoch has none.
function findWhere(t){
  if(!skyNow) return null;
  const key=EP[dIdx].key, lat=LATDEG[dLat], year=STAR_YEAR[key]||pageDate()[0], LST=localSidereal();
  // Raised by the refraction the sky shader draws with (shaderApparent), as the labels are: at the
  // deepest zoom the page's own formula (apparentEl) puts a body an arcsecond, many pixels, off.
  const at=(az, el, diam, disk=0)=>({d:horizDir(az, shaderApparent(el).a), az, el, diam, disk});
  if(t.k==='sun') return at(skyNow.sunAz, 90-skyNow.sza, 2*skyNow.moon.sunRadDeg*DISK_SCALE, skyNow.moon.sunRadDeg);
  if(t.k==='moon') return noMoon()?null:at(skyNow.moon.az, skyNow.moon.el, 2*skyNow.moon.radDeg*DISK_SCALE, skyNow.moon.radDeg);
  if(t.k==='sn'){ const sn=transientPlaces(lat).find(s=>s.ev.id===t.id); return sn&&at(sn.az, sn.el, 0); }
  if(t.k==='body'){ const b=BODY_WHERE.get(t.name); const k=b&&b.radDeg*(b.rings?2.3:1); return b?at(b.az, b.el, 2*k):null; }
  if(t.k==='star'){
    const P=starPlaces(key, year), i=P.list.indexOf(t.star);
    if(i<0||i>=P.n) return null;
    const p=raDecAltaz(lat, P.ra[i], P.dec[i], LST);
    return at(p.az, p.alt, 0);
  }
  if(t.k==='dso'){
    const e=t.o.ep[dataKey(key)];
    if(!e||!(e[3]>0)) return null;
    // Its window's radius (dso.py's r) is 1.3 times the half-diagonal of the object's ellipse.
    const m=starMeanPlace([e[0], e[1], 0, 0, 0, 0], key, year), p=raDecAltaz(lat, m.ra, m.dec, LST);
    return at(p.az, p.alt, 2*t.o.r*e[2]/1.3);
  }
  if(t.k==='con'){
    const P=conPlaces(key, year), fig=CON_FIG.find(f=>f[1]===t.name);
    if(!P||!fig) return null;
    const dirs=[...new Set(fig[2].flat())].map(i=>{ const p=raDecAltaz(lat, P[i].ra, P[i].dec, LST); return horizDir(p.az, p.alt); });
    const c=vnorm(dirs.reduce((s, d)=>vadd(s, d, [0, 0, 0]), [0, 0, 0]));
    const diam=2*Math.max(...dirs.map(d=>Math.acos(Math.min(1, vdot(c, d)))))*180/Math.PI;
    return at((Math.atan2(c[0], c[1])*180/Math.PI+360)%360, Math.asin(Math.max(-1, Math.min(1, c[2])))*180/Math.PI, diam);
  }
  return null;
}
// The vertical field in which something diam degrees wide spans half the view's narrower side.
function findFov(diam){
  if(!(diam>0)) return FIND_POINT_FOV;
  const W=window.innerWidth, H=Math.max(window.innerHeight, 1), fy=2*Math.tan(Math.min(diam, 170)*Math.PI/360)/Math.min(1, W/H);
  return Math.max(vrFovMin(diam), Math.min(VR_FOV_MAX, 2*Math.atan(fy)*180/Math.PI));
}
// van Wijk & Nuij's (2003) optimal pan and zoom, as d3.interpolateZoom, from field w0 to w1 across
// u1 (all radians): at t in [0, 1], the share of the turn made and the field.
function findPath(w0, w1, u1){
  const rho=Math.SQRT2, r2=2, r4=4;
  if(u1<1e-6){ const S=Math.log(w1/w0)/rho; return t=>[t, w0*Math.exp(rho*t*S)]; }
  const b0=(w1*w1-w0*w0+r4*u1*u1)/(2*w0*r2*u1), b1=(w1*w1-w0*w0-r4*u1*u1)/(2*w1*r2*u1);
  const r0=Math.log(Math.sqrt(b0*b0+1)-b0), r1=Math.log(Math.sqrt(b1*b1+1)-b1), S=(r1-r0)/rho, ch=Math.cosh(r0);
  return t=>{ const s=t*S; return [w0/(r2*u1)*(ch*Math.tanh(rho*s+r0)-Math.sinh(r0)), w0*ch/Math.cosh(rho*s+r0)]; };
}
function findSlerp(a, b, u){
  const ang=Math.acos(Math.max(-1, Math.min(1, vdot(a, b)))), s=Math.sin(ang);
  if(s<1e-4) return u<0.5?a:b;
  return vnorm(vadd(vscale(a, Math.sin((1-u)*ang)/s), vscale(b, Math.sin(u*ang)/s), [0, 0, 0]));
}
function findStart(t){
  const w=findWhere(t);
  if(!w||w.d[2]<=0) return;
  if(vrLockPin){ vrLockPin=null; syncVRLockBtns(); }
  const d0=horizDir(vrYaw, vrPitch), u1=Math.acos(Math.max(-1, Math.min(1, vdot(d0, w.d))));
  vrFind={t, d0, t0:0, flying:true, moved:0, movedAt:0, path:findPath(vrFov*Math.PI/180, findFov(w.diam)*Math.PI/180, u1)};
  requestVR();
}
// Before each paint (lockVRView): the next step of the flight, or the follow.
function findStep(){
  const f=vrFind;
  if(!f) return;
  const w=findWhere(f.t);
  if(!w){ vrFind=null; return; }
  let d=w.d;
  if(f.flying){
    // Timed from the first paint, which on first entering the view waits for the shaders.
    if(!f.t0) f.t0=performance.now();
    const t=Math.min(1, (performance.now()-f.t0)/FIND_MS), e=t<0.5?4*t*t*t:1-Math.pow(2-2*t, 3)/2, [u, fov]=f.path(e);
    d=findSlerp(f.d0, w.d, Math.max(0, Math.min(1, u)));
    vrFov=Math.max(vrFovMin(w.diam), Math.min(VR_FOV_MAX, fov*180/Math.PI));
    if(t<1) requestVR();
    else { f.flying=false; vrFov=findFov(w.diam); d=w.d; }
  }
  else if(f.at){
    // Held off the middle: the look turned till the ray through its page point meets it, a few
    // steps of the azimuth and altitude it misses by.
    const W=window.innerWidth, H=Math.max(window.innerHeight, 1), az=v=>Math.atan2(v[0], v[1])*180/Math.PI, el=v=>Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI;
    let yaw=vrYaw, pitch=vrPitch;
    for(let k=0;k<4;k++){
      const r=vrRayAt(f.at[0]*W, f.at[1]*H, yaw, pitch);
      yaw+=((az(d)-az(r))%360+540)%360-180; pitch=Math.max(-80, Math.min(85, pitch+el(d)-el(r)));
    }
    vrYaw=(yaw%360+360)%360; vrPitch=pitch;
    // Past the highest or lowest the look turns to, it can slip out of the view.
    if(!findOnPage(w)) vrFind=null;
    return;
  }
  vrYaw=(Math.atan2(d[0], d[1])*180/Math.PI+360)%360;
  vrPitch=Math.max(-80, Math.min(85, Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI));
}
// A look while flying or following (true, and the look applies). In the flight a few stray
// pixels are let go, and a real move ends it where it is; then the follow holds the found thing
// where the look leaves it (findHold).
function findLook(dx, dy){
  const f=vrFind, now=performance.now();
  if(f.flying){
    if(now-f.movedAt>250) f.moved=0;
    f.movedAt=now; f.moved+=Math.abs(dx)+Math.abs(dy);
    if(f.moved<20) return false;
    f.flying=false;
  }
  f.hold=true;
  return true;
}
// Where a found thing (findWhere's w) is on the page, its middle even off the page, while any of
// it shows: a disk (w.diam across, rings and all) till the whole of it has left the view. Null
// once it has, or when it is behind.
function findOnPage(w){
  const W=window.innerWidth, H=Math.max(window.innerHeight, 1), fy=Math.tan(vrFov*Math.PI/360), fx=fy*W/H, d=w.d;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cyw=Math.cos(yaw), syw=Math.sin(yaw);
  const depth=d[0]*syw*cp+d[1]*cyw*cp+d[2]*sp;
  if(depth<0.02) return null;
  const u=(d[0]*cyw-d[1]*syw)/depth/fx, v=(-d[0]*syw*sp-d[1]*cyw*sp+d[2]*cp)/depth/fy;
  const cx=(u+1)/2*W, cy=(1-v)/2*H, r=Math.tan(w.diam*Math.PI/360)/fy*H/2;
  const ox=Math.max(0, Math.abs(cx-W/2)-W/2), oy=Math.max(0, Math.abs(cy-H/2)-H/2);
  return ox*ox+oy*oy<=r*r?[cx, cy]:null;
}
// After a look: where the found thing now is on the page, as a share of its width and height (past
// 0 or 1 for a disk's middle off the page), or the follow let go when all of it has left the view.
function findHold(){
  const f=vrFind;
  f.hold=false;
  const w=findWhere(f.t), p=w&&findOnPage(w);
  if(!p){ vrFind=null; return; }
  f.at=[p[0]/window.innerWidth, p[1]/Math.max(window.innerHeight, 1)];
}
// A change of epoch (stepEpoch) with the view locked on something (a pin's lock, or following
// something found, in the walk-around view or on the dome) moves the date and clock to keep it
// near where it was: first the place in the sky, then the time of day, then the date moved as
// little as may be, each costing degrees (LOCK_CLOCK_DEG an hour off the clock, LOCK_SHIFT_DEG for
// half a year off the date). The date can move up to half a year either way: a star comes round
// to the same place about four minutes earlier each day of today's year, so some day has it there
// at the same hour. It is kept LOCK_WELL_UP_DEG up (or as high as it was) where it can be, so as
// not to end just over the horizon when higher places are not much farther, else just above it;
// one that never rises leaves the date and clock alone. A star is found again in the new epoch's
// list by its name (and found again after the search, which remakes the list for the years it
// tries). lockKeep is called before the change and returns what to do after it, or null;
// while lockHeld, the change does not render the sky (renderDay), which is rendered once after,
// and its paints leave the lock, the follow and the pins as they are (lockVRView), not yet
// knowing the star again.
const LOCK_UP_DEG=2, LOCK_WELL_UP_DEG=10, LOCK_CLOCK_DEG=1, LOCK_SHIFT_DEG=0.5, LOCK_DAY_STEPS=96;
let lockHeld=false;
function lockTarget(){
  if(vrOn&&vrLockPin){
    const p=vrLockPin;
    return p.kind==='sun'||p.kind==='moon'||p.kind==='sn'?{k:p.kind}:p.kind==='mark'?(p.planet?{k:'body', name:p.planet}:p.star?{k:'star', star:p.star}:null):null;
  }
  if(vrOn&&vrFind) return vrFind.t;
  if(!vrOn&&domeFind) return domeFind.t;
  return null;
}
// Its true azimuth and altitude at the clock's time, worked out afresh rather than from the last
// render (skyNow), which the search does not make.
function lockPlace(t){
  const lat=LATDEG[dLat], key=EP[dIdx].key;
  if(t.k==='sun'){ const g=sunGeom(lat, minutes); return {az:g.az, el:90-g.sza}; }
  if(t.k==='moon') return noMoon()?null:lunarPlace(lat);
  if(t.k==='body'){ placePlanets(lat, [], [], key, STAR_YEAR[key]||pageDate()[0], localSidereal()); return BODY_WHERE.get(t.name)||null; }
  return findWhere(t);
}
function lockRematch(t){
  if(t.k!=='star') return t;
  const key=EP[dIdx].key, P=starPlaces(key, STAR_YEAR[key]||pageDate()[0]), list=P.list.slice(0, P.n);
  if(list.includes(t.star)) return t;
  // By name, or one without a name by its place and brightness (the list is remade for each year).
  const [ra, dec, mag, , , , , name]=t.star, d=horizDir(ra, dec);
  const s=name?list.find(x=>x[7]===name):list.find(x=>!x[7]&&Math.abs(x[2]-mag)<1&&vdot(d, horizDir(x[0], x[1]))>Math.cos(0.5*Math.PI/180));
  return s?{...t, star:s}:null;
}
// v turned by angle a (radians) about unit axis p.
function lockTurn(v, p, a){ const c=Math.cos(a), sn=Math.sin(a), k=vdot(p, v)*(1-c), x=vcross(p, v); return [0, 1, 2].map(i=>v[i]*c+x[i]*sn+p[i]*k); }
function lockKeep(){
  const t0=lockTarget(), w0=t0&&lockPlace(t0);
  if(!w0) return null;
  const d0=horizDir(w0.az, w0.el), pin=vrOn&&vrLockPin, f=vrOn?vrFind:domeFind;
  return ()=>{
    let t=lockRematch(t0);
    if(!t){ renderDay(); return; }
    const dateEl=document.getElementById('moonDate'), date0=dateEl.value, m0=minutes, k0=epochDayIndex(...pageDate());
    const Yd=yearDays(), half=Math.floor(Yd/2), S=Math.max(1, Math.round(Yd/LOCK_DAY_STEPS));
    const pole=horizDir(0, LATDEG[dLat]), spin=2*Math.PI*(1+1/Yd)/DAYMIN, turn=(k, m)=>spin*((k-k0)*DAYMIN+m);
    const at=(k, m)=>{
      dateEl.value=fmtDate(...epochDateOf(k)); minutes=m;
      const tk=lockRematch(t), w=tk&&lockPlace(tk);
      return w&&horizDir(w.az, w.el);
    };
    // Where it is in the sky's own frame (turned back by the sky's turning since midnight of the
    // date the epoch came in at) on day k: a star, nebula, constellation or supernova the same every
    // day, worked out once; a planet once a day, at midday; the Sun and the Moon at midnight,
    // midday and the next midnight, between which each is taken to move evenly. The search tries
    // every few minutes from these.
    const sky=(k, m)=>{ const d=at(k, m); return d&&lockTurn(d, pole, turn(k, m)); };
    const fixed=t.k!=='sun'&&t.k!=='moon'&&t.k!=='body', sky0=fixed&&sky(k0, m0), models=new Map();
    const model=k=>{
      if(fixed) return sky0?[sky0, sky0, sky0]:null;
      if(!models.has(k)){ const s=t.k==='body'?Array(3).fill(sky(k, DAYMIN/2)):[0, DAYMIN/2, DAYMIN].map(m=>sky(k, m)); models.set(k, s.every(Boolean)?s:null); }
      return models.get(k);
    };
    const fromModel=(s, k, m)=>{
      const u=m/(DAYMIN/2), [a, b]=u<1?[s[0], s[1]]:[s[1], s[2]], w=u<1?u:u-1;
      return lockTurn(vnorm(a.map((v, i)=>v+(b[i]-v)*w)), pole, -turn(k, m));
    };
    const cost=(h, k, m, up)=>{
      if(!h||Math.asin(Math.max(-1, Math.min(1, h[2])))*180/Math.PI<=up) return Infinity;
      const dm=Math.abs(m-m0)%DAYMIN, off=Math.min(dm, DAYMIN-dm)/DAYMIN*24;
      return Math.acos(Math.max(-1, Math.min(1, vdot(d0, h))))*180/Math.PI+LOCK_CLOCK_DEG*off+LOCK_SHIFT_DEG*Math.abs(k-k0)/half;
    };
    const scan=(k, ms, up, best)=>{ const s=model(k); if(s) for(const m of ms){ const c=cost(fromModel(s, k, m), k, m, up); if(c<best.c) best={c, k, m}; } return best; };
    const range=(a, b, d)=>{ const r=[]; for(let m=a;m<=b;m+=d) r.push((m%DAYMIN+DAYMIN)%DAYMIN); return r; };
    let found=null;
    for(const up of [Math.max(LOCK_UP_DEG, Math.min(LOCK_WELL_UP_DEG, w0.el)), LOCK_UP_DEG]){
      let best={c:Infinity};
      const n=Math.floor(half/S), every5=range(0, DAYMIN-5, 5);
      for(let j=-n;j<=n;j++) best=scan(k0+j*S, every5, up, best);
      if(best.c===Infinity) continue;
      const near=range(best.m-30, best.m+30, 1);
      for(let k=best.k-S;k<=best.k+S;k++) if(Math.abs(k-k0)<=half) best=scan(k, near, up, best);
      // The last few minutes worked out exactly.
      let exact={c:Infinity};
      for(const m of range(best.m-10, best.m+10, 1)){ const c=cost(at(best.k, m), best.k, m, up); if(c<exact.c) exact={c, k:best.k, m}; }
      if(exact.c<Infinity){ found=exact; break; }
    }
    dateEl.value=found?fmtDate(...epochDateOf(found.k)):date0;
    minutes=found?found.m:m0;
    t=lockRematch(t);
    if(t){ if(pin){ if(t.k==='star') pin.star=t.star; } else f.t=t; }
    // The planets as the clock now has them, for findWhere until the next render.
    if(t&&t.k==='body') lockPlace(t);
    // Rendered again even where nothing moved: the search remade the star list, and the marks a
    // pin is found among must be from the one t is.
    hslider.value=minutes; renderDay();
  };
}
function findRender(){
  const q=findNorm(findQ.value);
  findHits=[];
  if(q){
    const scored=[];
    for(const c of findCatalog()){
      const s=Math.max(findScore(q, c.name), ...(c.also||[]).map(a=>findScore(q, a)));
      if(s>0) scored.push({c, r:s+c.prio*0.5});
    }
    findHits=scored.sort((a, b)=>b.r-a.r).slice(0, FIND_MAX).map(h=>h.c);
  }
  // Up is above the horizon as drawn (refracted); one below it is shown grayed and can't be chosen.
  findUp=findHits.map(c=>{ const w=findWhere(c.t); return !!w&&w.d[2]>0; });
  findSel=findUp.indexOf(true);
  findList.textContent='';
  findHits.forEach((c, i)=>{
    const li=document.createElement('li'), b=document.createElement('b'), s=document.createElement('span');
    li.id='findopt'+i; li.setAttribute('role', 'option');
    b.textContent=c.name+(findUp[i]?'':' (below horizon)');
    s.textContent=c.kind;
    li.append(b, s);
    if(!findUp[i]){ li.className='down'; li.setAttribute('aria-disabled', 'true'); li.addEventListener('mousedown', e=>e.preventDefault()); findList.append(li); return; }
    li.addEventListener('mousedown', e=>{ e.preventDefault(); findGo(c); });
    li.addEventListener('mousemove', ()=>{ if(findSel!==i){ findSel=i; findMark(); } });
    findList.append(li);
  });
  if(q&&!findHits.length){ const li=document.createElement('li'); li.className='none'; li.textContent='Nothing by that name in this sky'; findList.append(li); }
  findMark();
}
function findMark(){
  [...findList.children].forEach((li, i)=>li.setAttribute('aria-selected', i===findSel?'true':'false'));
  if(findSel>=0) findQ.setAttribute('aria-activedescendant', 'findopt'+findSel); else findQ.removeAttribute('aria-activedescendant');
}
function openFind(){
  // In the walk-around view the box must be inside it, the full-screen element, to show.
  const host=vrOn?document.getElementById('vr'):document.body;
  if(findBox.parentNode!==host) host.append(findBox);
  vrHeld.clear();
  findBox.hidden=false; findQ.value=''; findRender(); findQ.focus();
}
function closeFind(){
  if(findBox.hidden) return;
  findBox.hidden=true;
  if(vrOn) vrModalShut=performance.now();
  if(document.activeElement===findQ) findQ.blur();
  if(vrOn) document.getElementById('vr').focus();
}
function findGo(c){
  closeFind();
  if(vrOn) findStart(c.t); else domeFindStart(c.t);
}
findQ.addEventListener('input', findRender);
// The box's keys are its own: none reach the page's or the walk-around view's.
findQ.addEventListener('keydown', e=>{
  e.stopPropagation();
  if(e.key==='Escape'){ e.preventDefault(); closeFind(); }
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    const n=findHits.length, step=e.key==='ArrowDown'?1:n-1;
    if(findSel>=0){ let i=findSel; do i=(i+step)%n; while(!findUp[i]); findSel=i; findMark(); }
  }
  else if(e.key==='Enter'){ e.preventDefault(); if(!findQ.value.trim()){ closeFind(); return; } const c=findSel>=0&&findHits[findSel]; if(c) findGo(c); }
});
findQ.addEventListener('keyup', e=>e.stopPropagation());
findQ.addEventListener('blur', ()=>setTimeout(()=>{ if(document.activeElement!==findQ) closeFind(); }, 0));
findBox.addEventListener('pointerdown', e=>e.stopPropagation());
findBox.addEventListener('wheel', e=>e.stopPropagation());
// On the page the dome flies the same way, its zoom (domeZoom) for the field and its center for
// the look: the sky at the canvas's middle goes from where it is to the found thing, along the
// same path, in the fisheye's plane, where the dome's radius is 1. The dome zooms no further than
// DOME_ZOOM_MAX (a field about 20° across), so smaller things, and points, end there. The Sun and
// Moon are drawn enlarged (DOME_DISK). Then it follows until the dome is zoomed,
// dragged or reset, or the walk-around view opens. Near the horizon setDomeView keeps the sky
// circle round the middle, and the thing ends off center.
let domeFind=null;
// Where the dome puts a found thing, in units of its radius from the fisheye's center.
function domeFindAt(w){ const r=(90-w.el)/90, a=w.az*Math.PI/180; return [r*Math.sin(a), -r*Math.cos(a)]; }
function domeFindZoom(w){
  const W=dome.width, H=dome.height, deg=w.disk?2*w.disk*DOME_DISK/(0.46*W)*90/SUN_RADIUS_DEG:w.diam;
  return deg>0?Math.max(1, Math.min(DOME_ZOOM_MAX, 0.5*Math.min(W, H)*90/(0.46*W*deg))):DOME_ZOOM_MAX;
}
function domeFindStart(t){
  const w=findWhere(t);
  if(!w||w.d[2]<=0) return;
  domeWheel.stop();
  if(!domeOnScreen) dome.scrollIntoView({block:'center', behavior:'smooth'});
  const v=domeView(), R0=dome.width*0.46*v.z, c0=[-domeZoom.ox/R0, -domeZoom.oy/R0], p=domeFindAt(w);
  // The path's widths are the canvas's width in dome radii.
  domeFind={t, c0, t0:0, flying:true, path:findPath(1/(0.46*v.z), 1/(0.46*domeFindZoom(w)), Math.hypot(p[0]-c0[0], p[1]-c0[1]))};
  requestAnimationFrame(domeFindStep);
}
function domeFindStep(){
  const f=domeFind;
  if(!f||vrOn){ domeFind=null; return; }
  const w=findWhere(f.t);
  if(!w){ domeFind=null; return; }
  const p=domeFindAt(w);
  let c=p, z=domeZoom.z;
  if(f.flying){
    if(!f.t0) f.t0=performance.now();
    const t=Math.min(1, (performance.now()-f.t0)/FIND_MS), e=t<0.5?4*t*t*t:1-Math.pow(2-2*t, 3)/2, [u, wd]=f.path(e), k=Math.max(0, Math.min(1, u));
    c=[f.c0[0]+(p[0]-f.c0[0])*k, f.c0[1]+(p[1]-f.c0[1])*k];
    z=Math.max(1, Math.min(DOME_ZOOM_MAX, 1/(0.46*wd)));
    if(t>=1){ f.flying=false; z=domeFindZoom(w); c=p; }
  }
  const R=dome.width*0.46*z;
  setDomeView(z, -c[0]*R, -c[1]*R);
  requestAnimationFrame(domeFindStep);
}
// The dome's own zoom, drag and reset free it.
const domeFindStop=()=>{ domeFind=null; };
dome.addEventListener('wheel', domeFindStop, {passive:true});
dome.addEventListener('mousedown', e=>{ if(e.button===1) domeFindStop(); });
dome.addEventListener('dblclick', domeFindStop);
