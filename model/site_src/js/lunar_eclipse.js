/* ---------- lunar eclipses: the Moon in the Earth's shadow ---------- */
// The shadow is the same from everywhere the Moon is up, so it is worked geocentrically: the
// Moon's centre's distance from the shadow's axis (the antisolar direction), in Earth radii at
// the Moon. The umbra and penumbra take Danjon's enlargement of the Earth by 1/85 of the Moon's
// parallax (the air and clouds the grazing light cannot get through), as the eclipse almanacs do;
// with the Moon nearer or the young Sun smaller, they follow on their own.
// The light inside comes from lunar_eclipse.py (EP.shadow): sunlight bent into the shadow
// through the epoch's air, every sunrise and sunset on Earth at once, as a function of the
// distance from the axis. Today the umbra is a dull copper with a paler, bluish edge where the
// ozone takes out the orange; without ozone the edge is orange; through the K-Pg soot or a
// Tambora veil the Moon is gone; with the Moon nearer, the bent light no longer reaches the
// middle of the shadow, which goes dark.
const MOON_ER=MOON_R_KM/EARTH_R_KM, AU_KM=1.495979e8, DANJON=1+1/85;
const LUN_LUT_N=64, LUN_ADAPT_P=0.25, LUN_REL_P=0.6;
function shadowRec(key){
  let s=(EP.find(e=>e.key===key)||EP[0]).shadow;
  if(typeof s==='string') s=EP.find(e=>e.key===s).shadow;
  return s;
}
// The shadow at day number d: the Moon's offset from the axis (equatorial, Earth radii), its
// distance, and the umbra's and penumbra's radii there.
function lunarShadowGeo(d){
  const g=geoPair(d), sc=(MOON_RE[EP[dIdx].key]||MOON_RE_NOW)/MOON_RE_NOW, r=g.eq.r*sc;
  const a=[-g.s[0], -g.s[1], -g.s[2]], ma=vdot(g.m, a);
  const off=[(g.m[0]-ma*a[0])*r, (g.m[1]-ma*a[1])*r, (g.m[2]-ma*a[2])*r];
  const sun=sunEquatorial(d), sR=sunRadiusAt(sun.Ms)*Math.PI/180, sP=EARTH_R_KM/AU_KM/sun.au;
  return {off, rho:ma>0?Math.hypot(off[0], off[1], off[2]):Infinity, r, a, m:g.m, umb:DANJON-r*(sR-sP), pen:DANJON+r*(sR+sP)};
}
// Umbral and penumbral magnitudes: how far into each shadow the Moon reaches, in its diameters.
function lunarMags(s){ return {u:(s.umb+MOON_ER-s.rho)/(2*MOON_ER), p:(s.pen+MOON_ER-s.rho)/(2*MOON_ER)}; }
// How far the Moon is from the umbra (or with total set, from being wholly inside it): negative while in.
function lunarGap(ms, total){ const s=lunarShadowGeo(dayOfMs(ms)); return s.rho-(total?s.umb-MOON_ER:s.umb+MOON_ER); }
// The Moon's true altitude at time ms at the page's latitude.
function moonElAt(ms){
  const d=dayOfMs(ms), eq=geoPair(d).eq, lst=rev(sunEquatorial(d).RA+(pageAt(d).min/60-12)*15);
  return raDecAltaz(LATDEG[dLat], eq.RA, eq.Dec, lst).alt;
}
// The first umbral eclipse (with total set, the first total one) whose phase starts after
// afterMs with the Moon at least 5° up at its middle, searched full Moon by full Moon.
// Returns {start, end, mid, total}.
function findNextLunarEclipse(afterMs, total){
  const msOf=d=>(d-DN_UNIX)*86400000, gr=(Math.sqrt(5)-1)/2, f=ms=>lunarGap(ms, total);
  const P=synodic();
  let k=Math.floor((dayOfMs(afterMs)-DN_NEW0)/P-0.5)-1;
  const kEnd=k+Math.ceil((total?40:12)*TROPICAL_YEAR/P)+2;
  for(;k<=kEnd;k++){
    const t0=msOf(DN_NEW0+(k+0.5)*P), span=0.15*P*86400000;
    let a=t0-span, b=t0+span, c=b-gr*(b-a), e=a+gr*(b-a), fc=f(c), fe=f(e);
    for(let i=0;i<34;i++){
      if(fc<fe){ b=e; e=c; fe=fc; c=b-gr*(b-a); fc=f(c); }
      else { a=c; c=e; fc=fe; e=a+gr*(b-a); fe=f(e); }
    }
    const mid=(a+b)/2;
    if(f(mid)>=0) continue;
    let lo=t0-span, hi=mid;
    for(let i=0;i<26;i++){ const m=(lo+hi)/2; if(f(m)<0) hi=m; else lo=m; }
    const start=hi; lo=mid; hi=t0+span;
    for(let i=0;i<26;i++){ const m=(lo+hi)/2; if(f(m)<0) lo=m; else hi=m; }
    const end=lo;
    if(start<=afterMs || moonElAt((start+end)/2)<5) continue;
    return {start, end, mid, total:lunarGap(mid, true)<0};
  }
  return null;
}
// When the current umbral (or total) phase ends, for the time left in the readouts.
function lunarPhaseEnd(ms, total){
  if(lunarGap(ms, total)>=0) return null;
  let lo=ms, hi=ms+0.3*86400000;
  if(lunarGap(hi, total)<0) return null;
  for(let i=0;i<26;i++){ const m=(lo+hi)/2; if(lunarGap(m, total)<0) lo=m; else hi=m; }
  return lo;
}
// The shadow per epoch on LUN_LUT_N samples from the axis out to rhoMax: its luminance over the
// uneclipsed Moon's, and its colour (linear sRGB over that luminance).
const lunarLuts=new Map();
function lunarLut(key){
  let L=lunarLuts.get(key); if(L) return L;
  const s=shadowRec(key), n=s.Y.length, Y=new Float32Array(LUN_LUT_N), C=new Float32Array(LUN_LUT_N*3);
  for(let i=0;i<LUN_LUT_N;i++){
    const x=i/(LUN_LUT_N-1)*(n-1), j=Math.min(n-2, Math.floor(x)), f=x-j;
    Y[i]=Math.exp(Math.log(Math.max(s.Y[j], 1e-30))*(1-f)+Math.log(Math.max(s.Y[j+1], 1e-30))*f);
    const c=[0, 1, 2].map(q=>Math.max(0, s.rgb[j][q]*(1-f)+s.rgb[j+1][q]*f)), cy=Math.max(0.2126*c[0]+0.7152*c[1]+0.0722*c[2], 1e-30);
    for(let q=0;q<3;q++) C[i*3+q]=c[q]/cy;
  }
  L={Y, C, rhoMax:s.rhoMax, s}; lunarLuts.set(key, L); return L;
}
// The shadow as drawn, for an eye (or camera) adapted to A, the brightest light on the disk:
// A^0.25 for how far it has adapted and (Y/A)^0.6 for the contrast across the disk. The full
// Moon stays as drawn. In a partial phase the umbra is near black beside the penumbra, as it
// looks; in totality a copper Moon at −0.4 magnitude (12 below full) still reads as a lit disk
// at a fifth of the full Moon's drawn brightness, while one 20 magnitudes down is gone.
function lunarDisplay(L, A){
  const lut=new Float32Array(LUN_LUT_N*3), a=Math.pow(A, LUN_ADAPT_P);
  for(let i=0;i<LUN_LUT_N;i++){
    const g=Math.min(1, a*Math.pow(L.Y[i]/A, LUN_REL_P));
    let o=[0, 1, 2].map(q=>L.C[i*3+q]*g); const mx=Math.max(...o); if(mx>1) o=o.map(v=>v/mx);
    for(let q=0;q<3;q++) lut[i*3+q]=o[q];
  }
  return lut;
}
// The shadow's luminance (over the uneclipsed Moon's) at rho Earth radii from the axis.
function shadowY(s, rho){
  const n=s.Y.length, x=rho/s.rhoMax*(n-1); if(x>=n-1) return 1;
  const j=Math.floor(x), f=x-j;
  return Math.exp(Math.log(Math.max(s.Y[j], 1e-30))*(1-f)+Math.log(Math.max(s.Y[j+1], 1e-30))*f);
}
// The eclipse now, for the Moon as placed (lunarPlace): null outside the penumbra. c is where the
// shadow's axis meets the Moon's disk, in its radii along the disk's east and north (moonBasis),
// k turns a distance on the disk (in its radii) into a share of rhoMax for the lookup, and Ymean
// is the disk's mean light over the uneclipsed Moon's, which dims the moonlit sky.
function lunarEclipseNow(moon){
  const d=astroDay(), s=lunarShadowGeo(d);
  if(!(s.rho<s.pen+MOON_ER)) return null;
  const sun=sunEquatorial(d), lst=localSidereal(), lat=LATDEG[dLat];
  const ax=raDecAltaz(lat, rev(sun.RA+180), -sun.Dec, lst), ah=horizDir(ax.az, ax.alt), b=moonBasis(moon);
  // The axis's point at the Moon's distance, from the Moon's centre, in the horizon frame.
  const md=b.md, ma=vdot(md, ah), v=[(ma*ah[0]-md[0])*s.r, (ma*ah[1]-md[1])*s.r, (ma*ah[2]-md[2])*s.r];
  const c=[vdot(v, b.east)/MOON_ER, vdot(v, b.north)/MOON_ER];
  const L=lunarLut(EP[dIdx].key), sh=L.s;
  let sum=0, cnt=0, A=1e-30;
  for(let j=-6;j<=6;j++) for(let i=-6;i<=6;i++){
    const x=i/6, y=j/6; if(x*x+y*y>1) continue;
    const Y=shadowY(sh, Math.hypot(x-c[0], y-c[1])*MOON_ER); sum+=Y; cnt++; if(Y>A) A=Y;
  }
  const mg=lunarMags(s), total=mg.u>=1, umbral=mg.u>0;
  let text;
  if(umbral){
    const end=lunarPhaseEnd(pageMs(), total), left=end==null?0:Math.max(0, (end-pageMs())/1000);
    text=(total?'total':'partial')+' lunar eclipse · umbral magnitude '+mg.u.toFixed(2)+(end==null?'':` · ${total?'totality':'umbral phase'} ${Math.floor(left/3600)?Math.floor(left/3600)+'h ':''}${Math.floor(left/60)%60}m left`);
  }else text='penumbral lunar eclipse · magnitude '+mg.p.toFixed(2);
  return {c, k:MOON_ER/L.rhoMax, lut:lunarDisplay(L, A), key:EP[dIdx].key, Ymean:sum/cnt, total, umbral, text};
}
// The display factor (linear) at disk position (x, y) in Moon radii, into out.
function lunarFactor(lu, x, y, out){
  const t=Math.hypot(x-lu.c[0], y-lu.c[1])*lu.k;
  if(t>=1){ out[0]=out[1]=out[2]=1; return out; }
  const p=t*(LUN_LUT_N-1), i=Math.min(LUN_LUT_N-2, Math.floor(p)), f=p-i;
  for(let q=0;q<3;q++) out[q]=lu.lut[i*3+q]*(1-f)+lu.lut[(i+1)*3+q]*f;
  return out;
}
// The shadow's spectrum (over the uneclipsed Moon's light) at disk position (x, y), on the
// spectrum's wavelengths: the model's rows are every fourth of its samples, 380 to 780 nm by 10.
function lunarSpectrumAt(lu, x, y, lam){
  const s=shadowRec(lu.key), n=s.Y.length, rho=Math.hypot(x-lu.c[0], y-lu.c[1])*MOON_ER;
  const pos=Math.min(rho/s.rhoMax*(n-1)/4, s.sp.length-1), j=Math.min(s.sp.length-2, Math.floor(pos)), f=pos-j;
  return Float32Array.from(lam, L=>{
    const w=Math.max(0, Math.min(39.999, (L-380)/10)), i=Math.floor(w), g=w-i;
    const at=r=>s.sp[r][i]*(1-g)+s.sp[r][i+1]*g;
    return Math.pow(10, at(j)*(1-f)+at(j+1)*f);
  });
}
// Jump to 30 minutes before the next umbral eclipse, or with total set to 5 minutes before the
// next totality, the Moon in view. Pressing again from that lead moves on to the one after.
function jumpNextLunarEclipse(total){
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); syncVRPad(); }
  const lead=(total?5:30)*60*1000;
  let after=pageMs()+1000, ev=null;
  for(let n=0;n<12;n++){
    ev=findNextLunarEclipse(after, total);
    if(!ev) break;
    if(Math.abs(ev.start-lead-(after-1000))>90*1000) break;
    after=ev.start+1000;
  }
  if(!ev){ vrNote=total?'no total lunar eclipse in the next forty years':'no lunar eclipse in the next twelve years'; if(vrOn) paintVR(); else document.getElementById('rmoon').textContent=vrNote; return; }
  const at=pageAt(dayOfMs(ev.start-lead));
  document.getElementById('moonDate').value=at.date;
  minutes=at.min;
  hslider.value=minutes;
  renderDay();
  lookAtMoon();
}
// Turn the first-person view to the Moon.
function lookAtMoon(){ const mo=lunarPlace(LATDEG[dLat]); vrYaw=mo.az; vrPitch=Math.max(-8, Math.min(60, mo.el-4)); }
