const STAR_N=STARS.length;
// The texture holds the stars, then satellites. The planets and their moons are drawn apart
// (planets.js, the sky shader's bodies).
const SAT_CAP=2048, DOME_SAT_CAP=6400, STAR_MAP_W=STAR_N+SAT_CAP;
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
// Present-day mean place. epochKey is the geological scene; every scene uses this
// catalog for now. Proper motion is applied in the J2000 frame, then equatorial
// precession (Lieske, as given by Meeus) carries the place to `year`. Those series
// only hold for centuries, so a historical sky replaces this function and keeps the call.
function starMeanPlace(star, epochKey, year){
  void epochKey;
  const dt=year-2000, cosDec=Math.cos(star[1]*Math.PI/180);
  const ra0=star[0]+(star[4]/3600)*dt/(Math.abs(cosDec)<1e-4?(cosDec<0?-1e-4:1e-4):cosDec);
  const dec0=star[1]+(star[5]/3600)*dt;
  const T=dt/100, T2=T*T, T3=T2*T, arc=Math.PI/180/3600;
  const zeta=(2306.2181*T+0.30188*T2+0.017998*T3)*arc;
  const zed=(2306.2181*T+1.09468*T2+0.018203*T3)*arc;
  const theta=(2004.3109*T-0.42665*T2-0.041833*T3)*arc;
  const a=ra0*Math.PI/180+zeta, sd=Math.sin(dec0*Math.PI/180), cd=Math.cos(dec0*Math.PI/180);
  const A=cd*Math.sin(a), B=Math.cos(theta)*cd*Math.cos(a)-Math.sin(theta)*sd, C=Math.sin(theta)*cd*Math.cos(a)+Math.cos(theta)*sd;
  let ra=(Math.atan2(A,B)+zed)*180/Math.PI; ra=((ra%360)+360)%360;
  return {ra, dec:Math.asin(Math.max(-1,Math.min(1,C)))*180/Math.PI};
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
function starDisplay(star){
  const d=magDisplay(star[2], 42), tint=starTint(star[6]||10000);
  return {px:d.px, rgb:tint.map(c=>Math.min(2.4, c)*d.amp)};
}
// Same scale as the stars. The catalog's brightest star sits on the flux cap of 42,
// so a datacenter brighter than that still grows, up to a higher cap.
const POINT_TINT=starTint(5772).map(c=>Math.min(2.4, c));
function pointDisplay(mag){ const d=magDisplay(mag, 200); return {px:d.px, rgb:POINT_TINT.map(c=>c*d.amp)}; }
// The star list for an epoch, as rows of STARS. A moved epoch's rows come from stars_epochs.js.
// An epoch traced through the Galaxy keeps its traced stars and fills each quarter magnitude up
// to today's count with stand-ins: today's stars of that magnitude, keeping their galactic
// latitude and colour but at a random galactic longitude (seeded per epoch), since the real
// stars of that sky cannot be known.
const STAR_LISTS={};
function starsFor(key){
  if(STAR_LISTS[key]) return STAR_LISTS[key];
  const full=r=>[r[0], r[1], r[2], r[3], 0, 0, r[4], r[5]];
  if(STARS_EPOCH[key]) return STAR_LISTS[key]=STARS_EPOCH[key].map(full);
  const seed=STAR_STANDIN_SEED[key];
  if(seed==null) return STARS;
  const traced=(STAR_TRACED[key]||[]).map(full), have={}, bins=new Map();
  for(const s of traced){ const b=Math.floor(s[2]*4); have[b]=(have[b]||0)+1; }
  for(const s of STARS){ const b=Math.floor(s[2]*4); if(!bins.has(b)) bins.set(b, []); bins.get(b).push(s); }
  const rand=mulberry32(seed>>>0);
  const d2r=Math.PI/180, [G0, G1, G2]=GAL_AXES, fill=[];
  for(const [b, group] of bins){
    for(const s of group.slice(0, Math.max(0, group.length-(have[b]||0)))){
      const ra=s[0]*d2r, dec=s[1]*d2r, cd=Math.cos(dec);
      const sb=Math.max(-1, Math.min(1, G2[0]*cd*Math.cos(ra)+G2[1]*cd*Math.sin(ra)+G2[2]*Math.sin(dec)));
      const cb=Math.sqrt(1-sb*sb), l=rand()*2*Math.PI, u=cb*Math.cos(l), v=cb*Math.sin(l);
      const e=[0, 1, 2].map(i=>u*G0[i]+v*G1[i]+sb*G2[i]);
      fill.push([((Math.atan2(e[1], e[0])/d2r)%360+360)%360, Math.asin(Math.max(-1, Math.min(1, e[2])))/d2r, s[2], s[3], 0, 0, s[6], '']);
    }
  }
  return STAR_LISTS[key]=traced.concat(fill).sort((a, b)=>a[2]-b[2]).slice(0, 1000);
}
function starBinsFor(up){
  const pxMax=STAR_PX_ANCHOR*Math.pow(42, 0.22);
  const sig=pxMax*(VR_FOV_MAX*Math.PI/180)/Math.max(window.innerHeight, 1);
  const cutoff=Math.acos(Math.max(-1, Math.min(1, 1-8*sig*sig)))*180/Math.PI;
  const infl=Math.min(12, cutoff+0.8);
  const cosKeep=Math.cos((STAR_CELL_HD+infl)*Math.PI/180);
  const lists=Array.from({length:STAR_CELLS}, ()=>[]);
  const cap=STAR_IDX_W*32;
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
      const t=cursor+k, tx=t%STAR_IDX_W, ty=(t/STAR_IDX_W)|0;
      idx[(ty*STAR_IDX_W+tx)*4]=bin[k];
    }
    cursor+=bin.length;
  }
  return {info, idx, count:cursor};
}
