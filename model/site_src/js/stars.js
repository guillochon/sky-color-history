const STAR_N=STARS.length;
// The texture holds the stars, then satellites, then the novae and supernovae (transients.js),
// then the comets' heads (comets.js). The planets and their moons are drawn apart (planets.js,
// the sky shader's bodies).
const SAT_CAP=2048, DOME_SAT_CAP=6400, TR_CAP=4, HEAD_CAP=4, STAR_MAP_W=STAR_N+SAT_CAP+TR_CAP+HEAD_CAP;
// V of the hundredth star. Brighter stars, and every star this bright, keep the
// sizes from when the dome showed only that hundred.
const STAR_VANCHOR=STARS[Math.min(99, STARS.length-1)][2];
const STAR_VFAINT=STARS.reduce((m,s)=>s[2]>m?s[2]:m,-99);
const STAR_PX_ANCHOR=1.8, STAR_PX_FAINT=1;
const STAR_FLUX_FAINT=Math.pow(10, -0.4*(STAR_VFAINT-STAR_VANCHOR));
const STAR_FAINT_EXP=STAR_FLUX_FAINT<1 ? Math.log(STAR_PX_FAINT/STAR_PX_ANCHOR)/Math.log(STAR_FLUX_FAINT) : 0.22;
// Cube cells keep the VR shader from testing every star at every pixel.
// Eight cells on a side, six faces. A star is copied into every cell whose center
// lies within a glow-radius of it, and the shader reads only the cell under the pixel.
const STAR_CUBE=8, STAR_CELLS=6*STAR_CUBE*STAR_CUBE, STAR_BIN_MAX=96, STAR_IDX_W=1024;
const STAR_CELL_HD=10.05;
const STAR_CELL_CENTERS=(()=>{
  const n=STAR_CUBE, out=new Float32Array(STAR_CELLS*3);
  let c=0;
  for(let face=0; face<6; face++){
    for(let iv=0; iv<n; iv++){
      for(let iu=0; iu<n; iu++){
        const u=-1+(iu+0.5)*2/n, v=-1+(iv+0.5)*2/n;
        let x,y,z;
        if(face===0){ x=1; y=u; z=v; }
        else if(face===1){ x=-1; y=-u; z=v; }
        else if(face===2){ x=u; y=1; z=v; }
        else if(face===3){ x=-u; y=-1; z=v; }
        else if(face===4){ x=u; y=v; z=1; }
        else { x=-u; y=v; z=-1; }
        const m=Math.hypot(x,y,z)||1;
        out[c++]=x/m; out[c++]=y/m; out[c++]=z/m;
      }
    }
  }
  return out;
})();
// Tanner Helland's blackbody curve, divided by its luminance so equal V means equal brightness.
function starTint(kelvin){
  const t=Math.max(1000,Math.min(40000,kelvin))/100;
  let r,g,b;
  if(t<=66){
    r=255; g=99.4708025861*Math.log(t)-161.1195681661;
    b=t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307;
  }else{
    r=329.698727446*Math.pow(t-60,-0.1332047592);
    g=288.1221695283*Math.pow(t-60,-0.0755148492); b=255;
  }
  r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b));
  const y=0.2126*r+0.7152*g+0.0722*b||1;
  return [r/y,g/y,b/y];
}
// Each star of STARS gets its motion (stars_epochs.js, STAR_MOTION): proper motion (arcsec/yr),
// then distance (pc) and radial velocity (km/s) as row[9] and row[10]; row[8] is its MK type.
// STAR_EXTRA's rows, the stars that outshone some of today's thousand at other times, come so.
STARS.forEach((s, i)=>{ const m=STAR_MOTION[i]; if(m){ s[4]=m[0]; s[5]=m[1]; s[9]=m[2]; s[10]=m[3]; } s[8]=STAR_TYPES[i]||''; });
const STAR_REAL=STARS.concat(STAR_EXTRA);
// A star's J2000 direction and its change in magnitude dt years from 2000. A star with a distance
// moves in a straight line through space, from its proper motion and radial velocity, and dm is
// the change in its magnitude as its distance changes (no closer than 1 pc, as in
// build_star_epochs.py). Without one it moves along a great circle at its proper motion.
const KMS_PC_YR=1.0227122e-6, ARCSEC=Math.PI/180/3600;
function starLine(star, dt){
  const a=star[0]*Math.PI/180, d=star[1]*Math.PI/180, sa=Math.sin(a), ca=Math.cos(a), sd=Math.sin(d), cd=Math.cos(d);
  const u=[cd*ca, cd*sa, sd], ea=[-sa, ca, 0], ed=[-sd*ca, -sd*sa, cd];
  const pa=star[4]||0, pd=star[5]||0, dist=star[9], rv=star[10]||0;
  if(dt && dist>0){
    // Position in pc at dt: today's, plus the velocity (pc/yr) times dt.
    const p=[0, 1, 2].map(i=>dist*u[i]+dt*(rv*KMS_PC_YR*u[i]+dist*ARCSEC*(pa*ea[i]+pd*ed[i])));
    const r=Math.hypot(...p);
    return {v:p.map(c=>c/r), dm:5*Math.log10(Math.max(r, 1)/Math.max(dist, 1))};
  }
  if(dt && (pa || pd)){
    const w=Math.hypot(pa, pd), th=w*ARCSEC*dt, c=Math.cos(th), s=Math.sin(th);
    return {v:[0, 1, 2].map(i=>u[i]*c+(pa*ea[i]+pd*ed[i])/w*s), dm:0};
  }
  return {v:u, dm:0};
}
// Mean place in the year shown (the epoch's own calendar year, as the date picker has it): the
// star's line taken to that year on the timeline, then the long-term precession (calendar.js).
// The rows starsFor gives are already placed for their year, with no motion of their own.
function starMeanPlace(star, epochKey, year){
  const {v, dm}=starLine(star, year+epochShift(epochKey)-2000);
  const [X, Y, Z]=precessionMatrix(year).map(r=>r[0]*v[0]+r[1]*v[1]+r[2]*v[2]);
  let ra=Math.atan2(Y, X)*180/Math.PI; ra=((ra%360)+360)%360;
  return {ra, dec:Math.asin(Math.max(-1,Math.min(1,Z)))*180/Math.PI, dm};
}
// Daylight exposure hides the stars. Flux is relative to the old faint limit.
// At that magnitude and brighter, size and brightness stay as they were, the size growing as
// flux^grow up to flux cap. Fainter stars follow a power of the same flux, fit so the faintest
// star is one pixel. Stars, planets, satellites and meteors all use this scale.
function magDisplay(mag, cap, grow=0.22){
  const flux=Math.pow(10, -0.4*(mag-STAR_VANCHOR));
  const px=flux>=1
    ? STAR_PX_ANCHOR*Math.pow(Math.min(flux, cap), grow)
    : STAR_PX_ANCHOR*Math.pow(Math.max(flux, 1e-6), STAR_FAINT_EXP);
  return {flux, px, amp:Math.min(1, 0.62*Math.pow(Math.max(flux, 0), 0.5))};
}
function starDisplay(star, mag=star[2]){
  const d=magDisplay(mag, 42), tint=starTint(star[6]||10000);
  return {px:d.px, rgb:tint.map(c=>Math.min(2.4, c)*d.amp)};
}
// Same scale as the stars. The catalog's brightest star sits on the flux cap of 42,
// so a datacenter brighter than that still grows, up to a higher cap.
const POINT_TINT=starTint(5772).map(c=>Math.min(2.4, c));
function pointDisplay(mag){ const d=magDisplay(mag, 200); return {px:d.px, rgb:POINT_TINT.map(c=>c*d.amp)}; }
// The stars of a year, the thousand brightest, as rows of STARS placed for that year (J2000
// direction, V then). Straight lines hold for about two million years, when the Galaxy's pull has
// bent them by a few parsecs: each real star (today's thousand and STAR_EXTRA) is shown to a time
// of its own between STAR_LINE_MIN and STAR_LINE_MAX years from 2000 and fades out over the
// STAR_FADE before it. Each of today's thousand then gives way to stand-ins of its kind, whose real
// counterparts that far back cannot be known: stars of its absolute magnitude, color and type
// passing the Sun one after another on straight lines at STAR_FLYBY_KMS (15-40 km/s, as the
// nearby stars' speeds relative to the Sun run), each nearest the Sun, at today's star's distance,
// halfway through its time and so as bright as today's star then, its closest approach toward the
// galactic latitude today's star has, at a random longitude. Each passage lasts the time it takes
// to go twice that distance, from half a million to twenty million years (the same for each of a
// slot's passages), and fades into the next over STAR_FADE. So the sky changes as fast as the nearby stars move, and never all at once.
const STAR_LINE_MIN=1.9e6, STAR_LINE_MAX=2.2e6, STAR_FADE=5e4, STAR_FLYBY_KMS=[15, 40];
function starSeed(i, k){ let h=2166136261^i; h=Math.imul(h^(k+0x9e3779b9), 16777619); h=Math.imul(h^(h>>>15), 2246822507); return mulberry32((h^(h>>>13))>>>0); }
const STAR_LINE_T=[];
function starLineYears(i){ return STAR_LINE_T[i]??(STAR_LINE_T[i]=STAR_LINE_MIN+(STAR_LINE_MAX-STAR_LINE_MIN)*starSeed(i, -1)()); }
function fadeIn(x){ return smooth01(0, STAR_FADE, x); }
// Slot i's passages (today's star i's stand-ins): their speed (pc/yr), nearest distance (pc) and
// length (years), the same for each passage of the slot.
const STAR_SLOT=[];
function starSlot(i){
  if(STAR_SLOT[i]) return STAR_SLOT[i];
  const s=STARS[i], b=Math.min(Math.max(s[9]||100, 3), 2000), V=(STAR_FLYBY_KMS[0]+(STAR_FLYBY_KMS[1]-STAR_FLYBY_KMS[0])*starSeed(i, -2)())*KMS_PC_YR;
  return STAR_SLOT[i]={b, V, L:Math.min(2e7, Math.max(5e5, 2*b/V)), M:s[2]-5*Math.log10(Math.max(s[9]||100, 1)/10)};
}
// Passage k of slot i: the direction of its nearest approach, n, and of its motion, m.
const STAR_PASS=new Map();
function starPassage(i, k){
  const id=i*4194304+k, hit=STAR_PASS.get(id); if(hit) return hit;
  if(STAR_PASS.size>8000) STAR_PASS.clear();
  const s=STARS[i], rnd=starSeed(i, k), {b, V, L, M}=starSlot(i);
  const d2r=Math.PI/180, ra=s[0]*d2r, dec=s[1]*d2r, cd=Math.cos(dec), [G0, G1, G2]=GAL_AXES;
  const sb=Math.max(-1, Math.min(1, G2[0]*cd*Math.cos(ra)+G2[1]*cd*Math.sin(ra)+G2[2]*Math.sin(dec)));
  const cb=Math.sqrt(1-sb*sb), l=rnd()*2*Math.PI, n=[0, 1, 2].map(j=>cb*Math.cos(l)*G0[j]+cb*Math.sin(l)*G1[j]+sb*G2[j]);
  // The way it moves: a random direction square to n.
  const t=[rnd()-0.5, rnd()-0.5, rnd()-0.5], tn=vdot(t, n), m0=[0, 1, 2].map(j=>t[j]-tn*n[j]), mm=Math.hypot(...m0)||1;
  const P={n, m:m0.map(c=>c/mm), b, V, L, M}; STAR_PASS.set(id, P); return P;
}
function standIn(i, k, x, w){
  const P=starPassage(i, k), s=STARS[i], y=P.V*x, r=Math.hypot(P.b, y), v=[0, 1, 2].map(j=>(P.b*P.n[j]+y*P.m[j])/r);
  return [Math.atan2(v[1], v[0])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI,
    P.M+5*Math.log10(r/10)-2.5*Math.log10(Math.max(w, 1e-4)), s[3], 0, 0, s[6], '', s[8]];
}
let starsMemo=null;
function starsAt(A){
  A=Math.round(A);
  if(starsMemo && starsMemo.A===A) return starsMemo.list;
  const dt=A-2000, out=[];
  STAR_REAL.forEach((s, i)=>{
    const T=starLineYears(i), w=1-fadeIn(Math.abs(dt)-(T-STAR_FADE));
    if(!(w>0)) return;
    // A star that has exploded (transients.js) is gone.
    const {v, dm}=starLine(s, dt), mag=TR_GONE.has(s[7])&&A>=TR_GONE.get(s[7])?99:s[2]+dm-2.5*Math.log10(w);
    out.push([Math.atan2(v[1], v[0])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI, mag, s[3], 0, 0, s[6], s[7], s[8]]);
  });
  // Stand-ins, from when each of today's stars fades on, the passages after one another, the far
  // side (in the past, or the future) seeded apart.
  STARS.forEach((s, i)=>{
    const tau=Math.abs(dt)-(starLineYears(i)-STAR_FADE);
    if(!(tau>0)) return;
    const side=dt<0?0:1e6, L=starSlot(i).L, k=Math.floor(tau/L), x=tau-k*L;
    out.push(standIn(i, side+k, x-L/2, fadeIn(x)));
    if(k>0 && x<STAR_FADE) out.push(standIn(i, side+k-1, x+L/2, 1-fadeIn(x)));
  });
  out.forEach(r=>{ r[0]=((r[0]%360)+360)%360; });
  const list=out.sort((a, b)=>a[2]-b[2]).slice(0, STAR_N);
  starsMemo={A, list};
  return list;
}
// The epoch key's stars in its calendar year `year` (the year on the timeline for the stars).
function starsFor(key, year=STAR_YEAR[key]||pageDate()[0]){ return starsAt(year+epochShift(key)); }
// A stand-in's label from its MK type: "K1.5 III" is a K1.5 giant.
const STAR_LUM_WORD={V:'dwarf', IV:'subgiant', III:'giant', II:'bright giant', Ib:'supergiant', Iab:'supergiant', Ia:'supergiant', I:'supergiant'};
function starTypeLabel(t){
  if(!t) return '';
  const [sp, lum]=t.split(' ');
  return sp+' '+(STAR_LUM_WORD[lum]||'star');
}
// Each cell's stars are written into idx whole, two texels apiece (the star map's two rows:
// direction and size, then color and magnitude), so the sky shader reads a star where it
// would otherwise read its index and then the star.
function starBinsFor(up, tex){
  const pxMax=STAR_PX_ANCHOR*Math.pow(42, 0.22);
  const sig=pxMax*(VR_FOV_MAX*Math.PI/180)/Math.max(window.innerHeight, 1);
  const cutoff=Math.acos(Math.max(-1, Math.min(1, 1-8*sig*sig)))*180/Math.PI;
  const infl=Math.min(12, cutoff+0.8);
  const cosKeep=Math.cos((STAR_CELL_HD+infl)*Math.PI/180);
  const lists=Array.from({length:STAR_CELLS}, ()=>[]);
  const cap=STAR_IDX_W*32/2;
  let used=0;
  for(const s of up){
    for(let c=0;c<STAR_CELLS;c++){
      const o=c*3, p0=STAR_CELL_CENTERS[o], p1=STAR_CELL_CENTERS[o+1], p2=STAR_CELL_CENTERS[o+2];
      if(s.x*p0+s.y*p1+s.z*p2<cosKeep) continue;
      const bin=lists[c];
      if(bin.length>=STAR_BIN_MAX || used>=cap) continue;
      bin.push(s.i); used++;
    }
  }
  const idx=new Float32Array(STAR_IDX_W*32*4);
  const info=new Float32Array(64*6*4);
  let cursor=0;
  for(let c=0;c<STAR_CELLS;c++){
    const bin=lists[c], x=c%64, y=(c/64)|0, q=(y*64+x)*4;
    info[q]=cursor; info[q+1]=bin.length;
    for(let k=0;k<bin.length;k++){
      const t=(cursor+k)*2, si=bin[k];
      idx.set(tex.subarray(si*4, si*4+4), t*4);
      idx.set(tex.subarray((STAR_MAP_W+si)*4, (STAR_MAP_W+si)*4+4), (t+1)*4);
    }
    cursor+=bin.length;
  }
  return {info, idx, count:cursor};
}
