// Find (f): a box in the middle of the screen takes a name and offers the three best matches as
// it is typed, any below the horizon greyed and not to be chosen; Enter (or a click) turns and
// zooms the walk-around view to the one chosen in two seconds, along van Wijk & Nuij's smooth
// path (pulling back for a long turn), until it fills half the view: the Sun, the Moon, a planet or moon by its drawn disk (rings and all), a nebula or
// galaxy by its tile's window, a constellation by its figure. A star or supernova, a point, ends in
// a field FIND_POINT_FOV high. The view then follows it as the sky turns, until the look is moved.
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
  for(const [name, b] of BODY_WHERE) out.push({name, kind:b.host?`moon of ${b.host}`:'planet', prio:b.host?4:9, t:{k:'body', name}});
  const sn=SUPERNOVA[key];
  if(sn) out.push({name:sn.name||'Supernova', also:['supernova'], kind:'supernova', prio:9, t:{k:'sn'}});
  const P=starPlaces(key, year);
  for(let i=0;i<P.n;i++){ const s=P.list[i]; if(s[7]) out.push({name:s[7], kind:'star', prio:Math.max(0, Math.min(8, 7-s[2])), t:{k:'star', star:s}}); }
  for(const o of DSO.objects){
    const e=o.ep[key];
    if(!e||!(e[3]>0)) continue;
    const both=/^(M|NGC )\d/.test(o.id)&&o.name!==o.id;
    out.push({name:both?`${o.id} ${o.name}`:o.name, also:[o.id, o.name], kind:FIND_DSO_KIND[o.k]||'nebula', prio:6, t:{k:'dso', o}});
  }
  if(conPlaces(key, year)) for(const [abbr, name] of CON_FIG) out.push({name, also:[abbr, ...(FIND_ASTERISM[abbr]||[])], kind:'constellation', prio:7, t:{k:'con', name}});
  return out;
}
// Where a found thing is now: its direction in the view's frame (apparent altitude), its true
// azimuth and altitude, how wide the walk-around view draws it in degrees (0 for a point), and for
// a body drawn enlarged, its true radius to the edge of its rings (disk); null when the epoch has none.
function findWhere(t){
  if(!skyNow) return null;
  const key=EP[dIdx].key, lat=LATDEG[dLat], year=STAR_YEAR[key]||pageDate()[0], LST=localSidereal();
  const at=(az, el, diam, disk=0)=>({d:horizDir(az, apparentEl(el)), az, el, diam, disk});
  if(t.k==='sun') return at(skyNow.sunAz, 90-skyNow.sza, 2*skyNow.moon.sunRadDeg*DISK_SCALE, skyNow.moon.sunRadDeg);
  if(t.k==='moon') return noMoon()?null:at(skyNow.moon.az, skyNow.moon.el, 2*skyNow.moon.radDeg*DISK_SCALE, skyNow.moon.radDeg);
  if(t.k==='sn'){ const sn=supernovaPlace(lat); return sn&&at(sn.az, sn.el, 0); }
  if(t.k==='body'){ const b=BODY_WHERE.get(t.name); const k=b&&b.radDeg*(b.rings?2.3:1); return b?at(b.az, b.el, 2*k*DISK_SCALE, k):null; }
  if(t.k==='star'){
    const P=starPlaces(key, year), i=P.list.indexOf(t.star);
    if(i<0||i>=P.n) return null;
    const p=raDecAltaz(lat, P.ra[i], P.dec[i], LST);
    return at(p.az, p.alt, 0);
  }
  if(t.k==='dso'){
    const e=t.o.ep[key];
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
  return Math.max(VR_FOV_MIN, Math.min(VR_FOV_MAX, 2*Math.atan(fy)*180/Math.PI));
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
    vrFov=Math.max(VR_FOV_MIN, Math.min(VR_FOV_MAX, fov*180/Math.PI));
    if(t<1) requestVR();
    else { f.flying=false; vrFov=findFov(w.diam); d=w.d; }
  }
  vrYaw=(Math.atan2(d[0], d[1])*180/Math.PI+360)%360;
  vrPitch=Math.max(-80, Math.min(85, Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI));
}
// A look while flying or following: a few stray pixels are let go, and a real move frees the
// view (true, and the look applies).
function findLook(dx, dy){
  const f=vrFind, now=performance.now();
  if(now-f.movedAt>250) f.moved=0;
  f.movedAt=now; f.moved+=Math.abs(dx)+Math.abs(dy);
  if(f.moved<20) return false;
  vrFind=null;
  return true;
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
  // Up is above the horizon as drawn (refracted); one below it is shown greyed and can't be chosen.
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
  else if(e.key==='Enter'){ e.preventDefault(); const c=findSel>=0&&findHits[findSel]; if(c) findGo(c); }
});
findQ.addEventListener('keyup', e=>e.stopPropagation());
findQ.addEventListener('blur', ()=>setTimeout(()=>{ if(document.activeElement!==findQ) closeFind(); }, 0));
findBox.addEventListener('pointerdown', e=>e.stopPropagation());
findBox.addEventListener('wheel', e=>e.stopPropagation());
// On the page the dome flies the same way, its zoom (domeZoom) for the field and its centre for
// the look: the sky at the canvas's middle goes from where it is to the found thing, along the
// same path, in the fisheye's plane, where the dome's radius is 1. The dome zooms no further than
// DOME_ZOOM_MAX (a field about 20° across), so smaller things, and points, end there. The Sun,
// Moon and planets are drawn enlarged by bodyScale. Then it follows until the dome is zoomed,
// dragged or reset, or the walk-around view opens. Near the horizon setDomeView keeps the sky
// circle round the middle, and the thing ends off centre.
let domeFind=null;
// Where the dome puts a found thing, in units of its radius from the fisheye's centre.
function domeFindAt(w){ const r=(90-w.el)/90, a=w.az*Math.PI/180; return [r*Math.sin(a), -r*Math.cos(a)]; }
function domeFindZoom(w){
  const W=dome.width, H=dome.height, deg=w.disk?2*w.disk*bodyScale(dome):w.diam;
  return deg>0?Math.max(1, Math.min(DOME_ZOOM_MAX, 0.5*Math.min(W, H)*90/(0.46*W*deg))):DOME_ZOOM_MAX;
}
function domeFindStart(t){
  const w=findWhere(t);
  if(!w||w.d[2]<=0) return;
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
