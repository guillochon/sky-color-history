const STAR_N=STARS.length;
// The texture holds the stars, then the planets (planets.js), then satellites.
const SAT_CAP=2048, DOME_SAT_CAP=6400, STAR_MAP_W=STAR_N+PLANET_N+SAT_CAP;
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
// At that magnitude and brighter, size and brightness stay as they were.
// Fainter stars follow a power of the same flux, fit so the faintest star is one pixel.
function starDisplay(star){
  const flux=Math.pow(10, -0.4*(star[2]-STAR_VANCHOR));
  const amp=Math.min(1, 0.62*Math.pow(Math.max(flux, 0), 0.5));
  const px=flux>=1
    ? STAR_PX_ANCHOR*Math.pow(Math.min(flux, 42), 0.22)
    : STAR_PX_ANCHOR*Math.pow(Math.max(flux, 1e-6), STAR_FAINT_EXP);
  const tint=starTint(star[6]||10000);
  return {px, rgb:tint.map(c=>Math.min(2.4, c)*amp)};
}
// Same scale as the stars. The catalog's brightest star sits on the flux cap of 42,
// so a datacenter brighter than that still grows, up to a higher cap.
function pointDisplay(mag){
  const flux=Math.pow(10, -0.4*(mag-STAR_VANCHOR));
  const amp=Math.min(1, 0.62*Math.pow(Math.max(flux, 0), 0.5));
  const px=flux>=1
    ? STAR_PX_ANCHOR*Math.pow(Math.min(flux, 200), 0.22)
    : STAR_PX_ANCHOR*Math.pow(Math.max(flux, 1e-6), STAR_FAINT_EXP);
  const tint=starTint(5772);
  return {px, rgb:tint.map(c=>Math.min(2.4, c)*amp)};
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
