/* ---------- Section 2: a day under that sky ---------- */
const dome=document.getElementById('dome'), dctx=dome.getContext('2d');
const sel=document.getElementById('depoch'); EP.forEach((ep,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${ep.age} — ${ep.name}`; sel.appendChild(o); });
let dIdx=MODERN_IDX, dLat='Mid-latitude', minutes=720, autoExpo=false;
const DAYMIN=1440; // midnight to midnight
sel.value=dIdx;
const LATDEG={'Equator':0,'Mid-latitude':45,'Polar':75};
const SZ=DAY.szas, VZ=DAY.vz, AZ=DAY.az;
function sunGeom(lat,min){ const h=(min/60-12)*15*Math.PI/180, phi=lat*Math.PI/180; const cz=Math.cos(phi)*Math.cos(h); const z=Math.acos(Math.max(-1,Math.min(1,cz)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)); let comp=180+A*180/Math.PI; if(lat===0){ comp = h<0?90:270; } return {sza:z, az:((comp%360)+360)%360}; }
function idx(xs,x){ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; }
// interpolate XYZ of the dome grid at (sza, vz, azrel): linear in sza, monotone cubic in vz and az
function herm(xs, ys, x){ // PCHIP: ys is an array of [X,Y,Z]; stays between adjacent samples
  const n=xs.length; if(x<=xs[0]) return ys[0]; if(x>=xs[n-1]) return ys[n-1];
  let i=0; while(i<n-2 && x>=xs[i+1]) i++;
  const h=xs[i+1]-xs[i], t=(x-xs[i])/h, t2=t*t, t3=t2*t;
  const sgn=v=>v<0?-1:v>0?1:0;
  const slope=(k,q)=>{
    if(n<3) return (ys[1][q]-ys[0][q])/(xs[1]-xs[0]);
    const at=k0=>{ const hl=xs[k0]-xs[k0-1], hr=xs[k0+1]-xs[k0];
      const dl=(ys[k0][q]-ys[k0-1][q])/hl, dr=(ys[k0+1][q]-ys[k0][q])/hr;
      if(dl*dr<=0) return 0; const w1=2*hr+hl, w2=hr+2*hl; return (w1+w2)/(w1/dl+w2/dr); };
    if(k>0 && k<n-1) return at(k);
    const left=k===0, h0=left?xs[1]-xs[0]:xs[n-1]-xs[n-2], h1=left?xs[2]-xs[1]:xs[n-2]-xs[n-3];
    const d0=(left?ys[1][q]-ys[0][q]:ys[n-1][q]-ys[n-2][q])/h0, d1=(left?ys[2][q]-ys[1][q]:ys[n-2][q]-ys[n-3][q])/h1;
    let m=((2*h0+h1)*d0-h0*d1)/(h0+h1);
    if(sgn(m)!==sgn(d0)) m=0; else if(sgn(d0)!==sgn(d1) && Math.abs(m)>3*Math.abs(d0)) m=3*d0;
    return m;
  };
  const out=[0,0,0];
  for(let q=0;q<3;q++){
    const y0=ys[i][q], y1=ys[i+1][q], m0=slope(i,q), m1=slope(i+1,q);
    out[q]=Math.max(0,(2*t3-3*t2+1)*y0+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*y1+(t3-t2)*h*m1);
  }
  return out;
}
const dense={}; // per (epoch,lat,sza-slice): 91 x 91 table of XYZ, 1 deg in vz, 2 deg in az
function denseSlice(key, lat, s){
  const id=key+'|'+lat+'|'+s; if(dense[id]) return dense[id];
  const G=DAY.epochs[key][lat].dome[s].map(row=>row.map(xyY2XYZ));
  const T=new Float32Array(91*91*3);
  const cols=[]; for(let a=0;a<=90;a++){ cols.push(G.map(row=>herm(AZ,row,a*2))); }
  for(let v=0;v<=90;v++){ for(let a=0;a<=90;a++){ const X=herm(VZ,cols[a],Math.min(v,88)); const o=(v*91+a)*3; T[o]=X[0];T[o+1]=X[1];T[o+2]=X[2]; } }
  dense[id]=T; return T;
}
function domeXYZ(key, lat, si, st, vz, azr){
  const out=[0,0,0];
  const fv=Math.min(90,vz), iv=Math.min(89,Math.floor(fv)), tv=fv-iv; const fa=azr/2, ia=Math.min(89,Math.floor(fa)), ta=fa-ia;
  for(const [s,ws] of [[si,1-st],[si+1,st]]) if(ws>0){
    const T=denseSlice(key,lat,s);
    for(let q=0;q<3;q++){ const o00=(iv*91+ia)*3+q, o01=(iv*91+ia+1)*3+q, o10=((iv+1)*91+ia)*3+q, o11=((iv+1)*91+ia+1)*3+q;
      const a=T[o00]*(1-ta)+T[o01]*ta, b=T[o10]*(1-ta)+T[o11]*ta; out[q]+=ws*(a*(1-tv)+b*tv); }
  }
  return out;
}
function skySource(sza, az){
  // Samples run through 20° below the horizon. From there to 30°, fade that last sky to black.
  // Past 9° down the model's twilight fades too slowly: measured zenith skies dim by about a
  // magnitude per degree of depression until the natural night sky takes over near 18°, while
  // the model's dim by a quarter of that. The extra 0.75 mag per degree closes the gap.
  const last=SZ[SZ.length-1], past=Math.max(0, sza-last);
  const fade=(past<=0 ? 1 : Math.max(0, 1-past/10))*Math.pow(10, -0.3*Math.max(0, sza-99));
  const [si,st]=idx(SZ, Math.min(Math.max(sza, SZ[0]), last));
  return {si, st, fade, az, past};
}
// Baily's beads: walk round the Moon's limb (with its relief, limbH) in the plane of the sky and
// find where photosphere still shows between the limb and the far edge of the Sun. Their glare follows
// the photosphere left (with the relief) and fades as more of it shows; each bead gets the
// square root of its share of the largest. Returns up to six as vec4s (direction, strength).
function findBeads(moon, sunAz, sza, rSun, rMoon, sunUp){
  const out=new Float32Array(24), none={beads:out, beadW:0, beadDir:[0,0,1]};
  if(!sunUp) return none;
  const b=moonBasis(moon), sd=horizDir(sunAz, 90-sza), d2r=Math.PI/180;
  const cosSep=Math.max(-1, Math.min(1, vdot(sd, b.md))), sep=Math.acos(cosSep);
  if(sep>(rSun+rMoon*1.01)*d2r) return none;
  const k=sep>1e-9?sep/Math.sqrt(Math.max(1-cosSep*cosSep, 1e-18)):1;
  const cx=vdot(sd, b.east)*k, cy=vdot(sd, b.north)*k, R=rSun*d2r, c2=cx*cx+cy*cy;
  const N=720, dth=2*Math.PI/N, w=new Float64Array(N), rm=new Float64Array(N);
  let total=0;
  for(let i=0;i<N;i++){
    const th=i*dth, ux=Math.sin(th), uy=Math.cos(th), uc=ux*cx+uy*cy, disc=uc*uc-(c2-R*R);
    if(disc<=0) continue;
    const far=uc+Math.sqrt(disc), near=Math.max(0, uc-Math.sqrt(disc)), lo=Math.max(near, rMoon*d2r*(1+limbH(th)));
    if(far>lo){ w[i]=(far*far-lo*lo)/2*dth; rm[i]=(far+lo)/2; total+=w[i]; }
  }
  const vis=total/(Math.PI*R*R);
  const env=smooth01(0, 0.0015, vis)*(1-smooth01(0.012, 0.045, vis));
  if(!(env>0)) return none;
  // A bead at each local peak of the visible width along the limb (a valley in the relief), with
  // the light between the neighbouring troughs.
  const at=i=>w[(i+N)%N], peaks=[];
  for(let i=0;i<N;i++){
    if(!(w[i]>0) || w[i]<at(i-1) || w[i]<=at(i+1)) continue;
    let a=w[i], j=i-1; while(at(j)>0 && at(j)<=at(j+1) && i-j<N/2){ a+=at(j); j--; }
    j=i+1; while(at(j)>0 && at(j)<=at(j-1) && j-i<N/2){ a+=at(j); j++; }
    peaks.push({i, a});
  }
  peaks.sort((p, q)=>q.a-p.a);
  const top=peaks.slice(0, 6), amax=top.length?top[0].a:1;
  let beadDir=[0,0,1];
  top.forEach((p, j)=>{
    const th=p.i*dth, dir=vnorm(vadd(b.md, vscale(b.east, rm[p.i]*Math.sin(th)), vscale(b.north, rm[p.i]*Math.cos(th))));
    if(j===0) beadDir=dir;
    out.set([dir[0], dir[1], dir[2], env*Math.sqrt(p.a/amax)], j*4);
  });
  return {beads:out, beadW:env, beadDir};
}
// Model sky luminance to cd/m². The clear sky at the zenith with the Sun 45° up is about
// 2.7 kcd/m², a typical measured value; the modern mid-latitude model sky there sets the scale
// (about 970 cd/m² per unit). The full-Moon sky then comes out near 18 mag/arcsec², as measured.
let CD_PER_UNIT=0;
function cdPerUnit(){
  if(!CD_PER_UNIT){ const q=skySource(45, 0); CD_PER_UNIT=2700/domeXYZ('modern', 'Mid-latitude', q.si, q.st, 0, 0)[1]; }
  return CD_PER_UNIT;
}
// The night sky. The natural sky (airglow, zodiacal light, faint stars) is 22.0 mag/arcsec² at
// the zenith (Leinert et al. 1998), brightening toward the horizon as airglow does: the slant
// path through a layer 100 km up (van Rhijn). Extinction dims the direct light toward the
// horizon, but the air scatters much of it back into view, so 40% is kept whatever the airmass;
// the horizon comes out about twice the zenith, as measured at dark sites. Near neutral colour.
// Artificial skyglow is for an observer in a mid-sized city of a few hundred thousand people:
// zenith brightness (cd/m²) and the colour of the lamps' light scattered by the air.
//   Today: 18.8 mag/arcsec² in all, typical of such a city centre in the World Atlas (Falchi et
//     al. 2016), from a mix of high-pressure sodium and LED lamps.
//   1980–2000: about six times the natural sky, as for mid-sized cities in the first atlas
//     (Cinzano, Falchi & Elvidge 2001), orange high-pressure sodium.
//   Polluted city: 1.6 times today's, as the extra haze scatters more of the same light back.
//   2100: today's level, all LED. The trend cannot be projected that far: Kyba et al. 2023
//     measured skies brightening 9.6% a year over 2011–2022.
//   1815: oil lamps. Per head, Britain then used about 1/6500 of the light it did in 2000
//     (Fouquet & Pearson 2006), so the glow is a few thousandths of the natural sky.
// Within the city the glow rises about threefold toward the horizon.
const NIGHT_NATURAL=1.71e-4, NIGHT_XY=[0.310, 0.330];
// The airglow's share depends on the air. In V about half of today's dark sky is airglow (Leinert
// et al. 1998). The other half, zodiacal light and faint starlight, is sunlight-coloured (5772 K,
// xy 0.3265, 0.3361), which leaves the airglow at xy 0.294, 0.324 for the measured total.
// Nearly all of the visible airglow needs free oxygen: the 557.7 nm green line and the 630 nm red
// line from O atoms made by splitting O2, the OH bands (H + O3), the sodium D lines (cycled
// through O3 and O), and the NO2 continuum (NO + O). So:
//   - With O2 at 1% of today's level (2.2 Ga), the Schumann-Runge light that splits it is
//     absorbed lower down, where the atoms recombine fast, so few atoms remain near 95 km. The
//     green line goes as about the cube of their density, and ozone is down to 66 DU. Kept at 30%:
//     an estimate, as no model of this nightglow exists.
//   - Snowball Earth's thinner ozone (169 DU) and somewhat lower O2: 80%.
//   - With no O2 at all, the oxygen airglow is gone. O atoms still come from CO2 split by
//     sunlight, as on Venus and Mars, and recombine on the night side to glow in the violet
//     O2 Herzberg II bands (Venus: Krasnopolsky 1983), near 400–500 nm. Their photons are
//     taken to number about as many as today's airglow photons. Violet light looks dim to the eye,
//     so their luminance is about 15% of today's airglow (band shape: a Gaussian at 450 nm, 45 nm
//     wide, xy 0.145, 0.120).
const NIGHT_REST_XY=[0.3265, 0.3361], AIRGLOW_XY=[0.294, 0.324], HERZBERG_XY=[0.145, 0.120], AIRGLOW_SHARE=0.5;
const AIRGLOW_O={proterozoic22:0.3, snowball07:0.8, archean27thin:0, archean27:0, archean27vthick:0, archean38:0, hadean40:0, hadean44:0};
const AIRGLOW_CO2={archean27thin:0.15, archean27:0.15, archean27vthick:0.15, archean38:0.15, hadean40:0.15, hadean44:0.15};
// The natural night sky at the zenith outside the air (cd/m², XYZ) for epoch key.
function nightNatural(key){
  const fo=AIRGLOW_O[key]??1, fc=AIRGLOW_CO2[key]||0, out=[0,0,0];
  for(const [xy, Y] of [[NIGHT_REST_XY, 1-AIRGLOW_SHARE], [AIRGLOW_XY, AIRGLOW_SHARE*fo], [HERZBERG_XY, AIRGLOW_SHARE*fc]]){
    if(!(Y>0)) continue;
    const X=xyY2XYZ([xy[0], xy[1], Y*NIGHT_NATURAL]); out[0]+=X[0]; out[1]+=X[1]; out[2]+=X[2];
  }
  return out;
}
const SKYGLOW={modern:[3.09e-3, 0.44, 0.40], modernpoll:[4.94e-3, 0.45, 0.40], ozonehole:[1.03e-3, 0.50, 0.41], y2100:[3.09e-3, 0.38, 0.38], volcanic:[3e-7, 0.52, 0.41]};
// Extinction of starlight, magnitudes per airmass in V: about 0.15 from the gas (Rayleigh and
// ozone) plus 1.086 times each epoch's aerosol or haze optical depth at 550 nm. Clean air is
// 0.25. The Early Hadean's 30 bar of CO2 scatters so much (optical depth about 7) that no star
// shows through it. Starlight, the Milky Way, and the airglow all come from above the air, so
// all three are dimmed at the zenith by the excess over clean air, and more toward the horizon.
// The soot of the impact winter absorbs what it removes; elsewhere the haze mostly scatters it
// back into the diffuse sky, so only the soot also darkens the airglow's diffuse glow.
const EXT_K={hadean44:7.6, hadean40:0.35, archean27:0.8, archean27vthick:1.8, kpg66:2.3, volcanic:0.7, modernpoll:0.8};
function extK(key){ return EXT_K[key]||0.25; }
// Transmission at the zenith relative to clean air, and the part of it lost to absorption.
function extZenith(key){ return Math.pow(10, -0.4*(extK(key)-0.25)); }
function absZenith(key){ return key==='kpg66' ? Math.pow(10, -0.4*1.086*1.5) : 1; }
// A star's magnitude through the air at true altitude el, relative to clean air at the zenith.
function starThroughAir(mag, el, key){ const k=extK(key); return mag-2.5*Math.log10(Math.max(extinction(el, k), 1e-9))+(k-0.25); }
function nightRows(key, NR){
  const cdu=cdPerUnit(), glow=SKYGLOW[key], q=6371/6471, rows=[], N=nightNatural(key);
  for(let ir=0;ir<=NR;ir++){
    const vz=Math.min(90*ir/NR, 89.5), el=90-vz, sz=Math.sin(vz*Math.PI/180);
    const f=absZenith(key)*(0.4+0.6*extinction(el, extK(key)))/Math.sqrt(1-q*q*sz*sz)/cdu, X=N.map(v=>v*f);
    if(glow){ const G=xyY2XYZ([glow[1], glow[2], glow[0]*(1+2.2*Math.exp(-el/12))/cdu]); X[0]+=G[0]; X[1]+=G[1]; X[2]+=G[2]; }
    rows.push(X);
  }
  return rows;
}
// Linear sRGB of XYZ, without the clip in XYZ2rgb.
function xyzLin(X){ return [0,1,2].map(i=>M[i][0]*X[0]+M[i][1]*X[1]+M[i][2]*X[2]); }
let MW_LIN=null; // milkyway.js loads after this file
const SRGB_LIN=Array.from({length:256}, (_, i)=>ginv(i/255));
// Adding the Milky Way (luminance ratio rMw) to sky of luminance ratio rBg under the display
// curve: the pixel goes to the curve's value for the sum, its colour the luminance-weighted mix.
// Returns the factor on the sky's linear colour and the weight of the Milky Way's.
// toneT tabulated in log10 r (steps of 0.002 decade) for the per-pixel dome work.
const toneLUTs={};
function toneFast(r, k, p){
  const key=k+'|'+p; let T=toneLUTs[key];
  if(!T){ T=toneLUTs[key]=new Float32Array(6501); for(let i=0;i<=6500;i++) T[i]=toneT(Math.pow(10, -12+i*0.002), k, p, 0.95); }
  const x=(Math.log10(Math.max(r, 1e-12))+12)/0.002, i=Math.min(6499, Math.floor(x)), f=Math.min(1, x-i);
  return T[i]+(T[i+1]-T[i])*f;
}
function mwMix(rBg, rMw, k, p){
  if(!MW_LIN) MW_LIN=xyzLin(xyY2XYZ([MW_XY[0], MW_XY[1], 1]));
  const rNew=rBg+rMw, tBg=toneFast(rBg, k, p), tNew=toneFast(rNew, k, p);
  return [tBg>0?(tNew/tBg)*(rBg/rNew):0, tNew*rMw/rNew];
}
// Linear light to an sRGB byte, through a 4096-step table.
const LIN_BYTE=Array.from({length:4097}, (_, i)=>Math.round(255*g(i/4096)));
function linToByte(v){ return LIN_BYTE[Math.max(0, Math.min(4096, Math.round(v*4096)))]; }
// Light from the city on the base of a cloud: city clouds glow, amplifying the skyglow up to
// about tenfold (Kyba et al. 2011, PLoS ONE 6, e17307). Here the base is lit to six times the
// clear-sky glow at the zenith, as linear display light for the cloud shader.
function cityUplight(key, Yref, k, p){
  const glow=SKYGLOW[key];
  if(!glow) return new Float32Array(3);
  const c=tone(xyY2XYZ([glow[1], glow[2], 6*glow[0]/cdPerUnit()]), Yref, k, p, 0.95);
  return new Float32Array(c.map(v=>Math.pow(v/255, 2.2)));
}
function renderDay(fast){
  vrNote='';
  const ep=EP[dIdx], rec=DAY.epochs[ep.key][dLat]; const {sza,az:sunAz}=sunGeom(LATDEG[dLat],minutes);
  const W=dome.width,H=dome.height, cx=W/2, cy=H/2, R=W*0.46;
  // Moonlight is the Sun's sky field, evaluated at the Moon and added. Hold the
  // Sun's pre-fade luminance so auto-exposure does not undo the twilight fade.
  const sunSrc=skySource(sza, sunAz);
  const moon=lunarPlace(LATDEG[dLat]);
  const moonSrc=skySource(90-moon.el, moon.az);
  const mScale=moonSkyScale(moon, sunAz, 90-sza);
  const si=sunSrc.si, st=sunSrc.st, past=sunSrc.past;
  const NR=72, NA=144; const grid=[];
  const addField=(X, src, scale, vz, comp)=>{
    if(!src || src.fade<=0) return null;
    let azr=Math.abs(comp-src.az); if(azr>180) azr=360-azr;
    const S=domeXYZ(ep.key,dLat,src.si,src.st,Math.min(vz,88),azr);
    if(scale>0){ const f=src.fade*scale; X[0]+=S[0]*f; X[1]+=S[1]*f; X[2]+=S[2]*f; }
    return S;
  };
  // Eclipse: the Moon is outside the air, so it only hides part of the photosphere.
  // The whole sunlit sky scales by the fraction still visible. The disks are the ones
  // drawn in this view, which are larger than the true disks.
  const diskScale=vrOn?DISK_SCALE:(DOME_DISK/(dome.width*0.46))*90/SUN_RADIUS_DEG;
  const sepDeg=Math.acos(Math.max(-1,Math.min(1,vdot(horizDir(moon.az,moon.el),horizDir(sunAz,90-sza)))))*180/Math.PI;
  const rSun=moon.sunRadDeg*diskScale, rMoon=moon.radDeg*diskScale;
  const cover=sunCovered(sepDeg, rSun, rMoon), sunVis=1-cover;
  // Near totality the sky is lit from outside the Moon's shadow, tens to a hundred kilometres
  // away, where the Sun is still partly up: deep twilight overhead and a sunset glow all round
  // the horizon. That is this epoch's sky with the Sun 6° below the horizon, averaged over
  // azimuth, scaled to 1e-3 of the uneclipsed zenith: measured totality skies are about three
  // orders of magnitude darker than the day sky, as bright as the end of civil twilight (Sharp,
  // Lloyd & Silverman 1966; AAS eclipse pages).
  let ring=null, ringK=0;
  if(cover>0.5 && sunSrc.fade>0){
    const rs=skySource(96, 0); ring=[];
    for(let ir=0;ir<=NR;ir++){ const vz=Math.min(90*ir/NR, 88), X=[0,0,0];
      for(let azr=0;azr<=180;azr+=10){ const S=domeXYZ(ep.key,dLat,rs.si,rs.st,vz,azr), w=(azr===0||azr===180)?0.5:1; X[0]+=S[0]*w; X[1]+=S[1]*w; X[2]+=S[2]*w; }
      ring.push(X.map(v=>v/18)); }
    const zen=domeXYZ(ep.key,dLat,si,st,0,0)[1]*sunSrc.fade;
    ringK=1e-3*zen/Math.max(ring[0][1], 1e-30)*smooth01(0.5, 1, cover);
  }
  const addRing=(X, vz)=>{ if(!ring) return; const r=ring[Math.min(NR, Math.round(vz/90*NR))]; X[0]+=r[0]*ringK; X[1]+=r[1]*ringK; X[2]+=r[2]*ringK; };
  const night=nightRows(ep.key, NR);
  let Ymax=1e-30, Yhold=1e-30, Ysun=1e-30;
  for(let ir=0;ir<=NR;ir++){ const row=[]; const vz=90*ir/NR; for(let ia=0;ia<=NA;ia++){ const comp=360*ia/NA;
      const X=night[ir].slice();
      const Xsun=addField(X, sunSrc, sunVis, vz, comp);
      if(Xsun){ const y=Xsun[1]*sunSrc.fade; if(y>Ysun) Ysun=y; if(Xsun[1]>Yhold) Yhold=Xsun[1]; }
      addField(X, moonSrc, mScale, vz, comp);
      addRing(X, vz);
      if(X[1]>Ymax) Ymax=X[1]; row.push(X);} grid.push(row); }
  const Ybase=past>0?Yhold:Math.max(Ysun,Ymax);
  const Yref = autoExpo ? Math.max(Ybase, 1e-6*YREF) : YREF; const k = autoExpo?0.85:0.85, p = autoExpo?0.5:0.4;
  const colgrid=grid.map(row=>row.map(X=>tone(X,Yref,k,p,0.95)));
  const rgrid=grid.map(row=>row.map(X=>Math.max(X[1], 1e-30)/Yref));
  // The Milky Way on the dome, per pixel, once the sky is dark enough for it to matter.
  const cdu=cdPerUnit(), mwOn=!!mwMap && rgrid[0][0]<2e-6, galB=mwOn?galacticBasis(LATDEG[dLat]):null;
  const lgrid=mwOn?rgrid.map(row=>row.map(v=>Math.log(v))):null, ek=extK(ep.key);
  // The Milky Way and the sky under it vary slowly, so the mix is worked out once per 2×2 pixel
  // block: each pixel's linear colour is scaled by mwA and gains mwB of the Milky Way's colour.
  const W2=W>>1, mwA=mwOn&&!fast?new Float32Array(W2*(H>>1)):null, mwB=mwA?new Float32Array(mwA.length):null;
  if(mwA) for(let j=0;j<(H>>1);j++) for(let i=0;i<W2;i++){
    const dx=2*i+1-cx, dy=2*j+1-cy, rr=Math.hypot(dx, dy);
    if(rr>R) continue;
    let ang=Math.atan2(dx,-dy)*180/Math.PI; if(ang<0) ang+=360;
    const el=90-90*rr/R, rMw=mwAt(galB, horizDir(ang, el))*extinction(el, ek)*extZenith(ep.key)/(cdu*Yref);
    if(!(rMw>0)) continue;
    const fr=(rr/R)*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir, fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia;
    const la=lgrid[ir][ia]*(1-ta)+lgrid[ir][ia+1]*ta, lb=lgrid[ir+1][ia]*(1-ta)+lgrid[ir+1][ia+1]*ta, rBg=Math.exp(la*(1-tr)+lb*tr);
    if(rMw<rBg*0.003) continue;
    const m=mwMix(rBg, rMw, k, p); mwA[j*W2+i]=m[0]; mwB[j*W2+i]=m[1];
  }
  if(!fast){ const img=dctx.createImageData(W,H), px=img.data;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy); const o=(y*W+x)*4;
    if(r>R){ px[o]=10;px[o+1]=12;px[o+2]=18;px[o+3]=255; continue; }
    const fr=(r/R)*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir;
    let ang=Math.atan2(dx,-dy)*180/Math.PI; if(ang<0) ang+=360; const fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia;
    for(let q=0;q<3;q++){ const a=colgrid[ir][ia][q]*(1-ta)+colgrid[ir][ia+1][q]*ta, b=colgrid[ir+1][ia][q]*(1-ta)+colgrid[ir+1][ia+1][q]*ta; px[o+q]=a*(1-tr)+b*tr; }
    px[o+3]=255;
    if(mwA){
      const bi=(y>>1)*W2+(x>>1), b=mwB[bi];
      if(b>0){ const a=mwA[bi]; for(let q=0;q<3;q++) px[o+q]=linToByte(SRGB_LIN[Math.round(px[o+q])]*a+MW_LIN[q]*b); }
    }
  }
  dctx.putImageData(img,0,0); }
  // sun
  const sunc=rec.sun[Math.min(si+ (st>0.5?1:0), rec.sun.length-1)];
  const sX=xyY2XYZ(sunc); const sunRel = sX[1]/DAY.epochs['modern']['Equator'].sun[0][2];
  // Blend chromaticity between samples so the disk color moves continuously.
  // Below about 1e-6 the direct beam is a one-wavelength leftover. In the early
  // Hadean that leftover sits on the green part of the spectrum locus, and drawing
  // it at full brightness makes a green disk. Hold the last sample that still has a hue.
  const noonY=DAY.epochs['modern']['Equator'].sun[0][2];
  const hue=i=>rec.sun[i][1]>0 && rec.sun[i][2]>=1e-6;
  let i0=si; while(i0>0 && !hue(i0)) i0--;
  const i1=Math.min(si+1, rec.sun.length-1), c0=rec.sun[i0], c1=hue(i1)?rec.sun[i1]:c0, u=hue(i1)?st:0;
  const sXd=xyY2XYZ([c0[0]*(1-u)+c1[0]*u, c0[1]*(1-u)+c1[1]*u, 1]);
  let visI=si; while(visI>0 && rec.sun[visI][2]/noonY<=3e-4) visI--;
  const sunRelD=rec.sun[visI][2]/noonY;
  const SUNR=DOME_DISK*moon.sunRadDeg/SUN_RADIUS_DEG, rr=R*sza/90, a=sunAz*Math.PI/180, sx=cx+rr*Math.sin(a), sy=cy-rr*Math.cos(a);
  const sunRGB=tone(sXd, sXd[1], 0.95,0.4,0.98);
  const stars=placeStars(LATDEG[dLat]);
  if(!fast) drawStarsOnDome(stars.marks, rgrid, Yref*cdu, ep.key);
  const sunUpPix=!fast && rr-SUNR<R && sunRelD>3e-4;
  if(sunUpPix){
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    const col=hex(sunRGB);
    // The Moon covers the photosphere; drawMoonOnDome then draws it over the sky like the rest of its disk.
    if(moon.el>-moon.radDeg){
      const mrr=R*(90-moon.el)/90, ma=moon.az*Math.PI/180;
      dctx.beginPath(); dctx.rect(0,0,W,H); dctx.arc(cx+mrr*Math.sin(ma), cy-mrr*Math.cos(ma), moon.radDeg*(DOME_DISK/SUN_RADIUS_DEG), 0, Math.PI*2, true); dctx.clip('evenodd');
    }
    dctx.globalAlpha=1; dctx.fillStyle=col; dctx.beginPath(); dctx.arc(sx,sy,SUNR,0,Math.PI*2); dctx.fill(); dctx.restore();
  }
  // Corona, pink chromosphere, and the diamond ring: the corona shows once less than about 3% of
  // the drawn photosphere is left (Sun's inner corona is about a millionth of the disk, near the
  // full Moon's brightness), the ring while the last sliver is going.
  const sunUp=sza<90+SUN_RADIUS_DEG*diskScale;
  const corona=sunUp?1-smooth01(0.003, 0.03, sunVis):0;
  const {beads, beadW, beadDir}=findBeads(moon, sunAz, sza, rSun, rMoon, sunUp);
  if(!fast && sunUpPix && (corona>0 || beadW>0)){
    const mrr=R*(90-moon.el)/90, ma=moon.az*Math.PI/180, mx=cx+mrr*Math.sin(ma), my=cy-mrr*Math.cos(ma), mr=moon.radDeg*(DOME_DISK/SUN_RADIUS_DEG);
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    dctx.beginPath(); dctx.rect(0,0,W,H); dctx.arc(mx,my,mr,0,Math.PI*2,true); dctx.clip('evenodd');
    if(corona>0){
      const g=dctx.createRadialGradient(sx,sy,SUNR,sx,sy,SUNR*6);
      [[0,1],[0.1,0.5],[0.2,0.28],[0.4,0.12],[0.7,0.04],[1,0]].forEach(([t,a])=>g.addColorStop(t, `rgba(255,248,236,${a*corona})`));
      dctx.fillStyle=g; dctx.beginPath(); dctx.arc(sx,sy,SUNR*6,0,Math.PI*2); dctx.fill();
      dctx.strokeStyle=`rgba(255,90,120,${0.9*corona})`; dctx.lineWidth=1.5; dctx.beginPath(); dctx.arc(sx,sy,SUNR+0.75,0,Math.PI*2); dctx.stroke();
    }
    dctx.restore();
  }
  if(!fast) drawMoonOnDome(moon, sunAz, 90-sza);
  if(!fast && sunUpPix && beadW>0){
    // The dome is too coarse for separate beads; the brightest stands for them.
    const bAz=Math.atan2(beadDir[0], beadDir[1]), bZ=90-Math.asin(beadDir[2])*180/Math.PI, br=R*bZ/90, bx=cx+br*Math.sin(bAz), by=cy-br*Math.cos(bAz);
    const g=dctx.createRadialGradient(bx,by,0,bx,by,SUNR*3);
    g.addColorStop(0, `rgba(255,255,250,${beadW})`); g.addColorStop(0.15, `rgba(255,250,235,${0.6*beadW})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip(); dctx.fillStyle=g; dctx.beginPath(); dctx.arc(bx,by,SUNR*3,0,Math.PI*2); dctx.fill(); dctx.restore();
  }
  // What kind of eclipse this is, for the readouts.
  let eclipse='', central=false;
  if(sunUp && cover>0.0005){
    central=sepDeg<=Math.abs(rMoon-rSun);
    if(central){
      const end=centralEnd(pageMs(), diskScale), left=end==null?0:Math.max(0, (end-pageMs())/1000);
      eclipse=(rMoon>=rSun?'total eclipse':'annular eclipse')+(end==null?'':` · ${Math.floor(left/60)}m ${String(Math.floor(left%60)).padStart(2,'0')}s left`);
    }else eclipse=`partial eclipse · ${cover>0.99?(Math.floor(cover*1000)/10).toFixed(1):Math.round(cover*100)}% covered`;
  }
  const sn=supernovaPlace(LATDEG[dLat]);
  if(!fast) drawSupernovaOnDome(sn);
  skyNow={colgrid, sza, sunAz, sunRGB, sunVis, sunOn:sunRelD>3e-4 && sza<90+SUN_RADIUS_DEG*DISK_SCALE+35/60, moon, corona, beads, eclipse, central, rgrid, cityUp:cityUplight(ep.key, Yref, k, p), Yref, toneK:k, toneP:p, rCd:Yref*cdu, gal:mwMap?galacticBasis(LATDEG[dLat]):null, extK:ek, stars:stars.tex, starBins:stars.bins, starIdx:stars.idx, starIdxCount:stars.idxCount, sn, moonRel:mScale/MOON_SUN_FULL, gen:++skyGen};
  document.getElementById('rmoon').textContent = (moon.el<-moon.radDeg ? 'below horizon' : moon.el.toFixed(1)+'°')+' · '+Math.round(moonLit(moon, sunAz, 90-sza)*100)+'% lit · '+(mScale/MOON_SUN_FULL).toPrecision(2)+'× full';
  if(vrOn) paintVR();
  if(fast) return;
  // compass + rim
  dctx.strokeStyle='rgba(255,255,255,.35)'; dctx.lineWidth=1.5; dctx.beginPath(); dctx.arc(cx,cy,R,0,7); dctx.stroke();
  dctx.fillStyle='rgba(255,255,255,.8)'; dctx.font='16px Newsreader, Georgia, serif'; dctx.textAlign='center';
  dctx.fillText('N',cx,cy-R-6); dctx.fillText('S',cx,cy+R+18); dctx.fillText('E',cx+R+12,cy+6); dctx.fillText('W',cx-R-12,cy+6); dctx.textAlign='left';
  // Two short lines in the corner, clear of the sky circle and the S mark.
  dctx.font='italic 20px Newsreader, Georgia, serif'; dctx.fillText(ep.short, 12, H-27);
  dctx.font='15px Newsreader, Georgia, serif'; dctx.fillText(`${ep.age} · ${dLat==='Polar'?'75° latitude':dLat==='Mid-latitude'?'45° latitude':'equator'}`, 12, H-8);
  // readouts
  document.getElementById('hclock').textContent=clockLabel(minutes)+(dayHours()<24?` · ${dayHours()}-hour day`:'');
  document.getElementById('relev').textContent=(90-sza).toFixed(1)+'°';
  const sumAt=(vz,comp)=>{ const X=night[Math.min(NR, Math.round(vz/90*NR))].slice(); addField(X,sunSrc,sunVis,vz,comp); addField(X,moonSrc,mScale,vz,comp); addRing(X,vz); return X; };
  const zX=sumAt(0, sunAz), hX=sumAt(88, sunAz+90);
  const fmt=X=>{ if(X[1]*cdu<1) return skyMagArcsec(X[1]*cdu).toFixed(1)+' mag/arcsec²'; const s=X[0]+X[1]+X[2]; const c=cct(X[0]/s,X[1]/s); return (c>800&&c<60000? c.toLocaleString()+' K':'—')+` · ${(100*X[1]/YREF).toPrecision(2)}%`; };
  document.getElementById('rzen').textContent=fmt(zX); document.getElementById('rhor').textContent=fmt(hX);
  document.getElementById('rsun').textContent = sza>=90 ? 'below horizon' : (sunRel<=3e-4 ? 'not visible' : (()=>{const s=sX[0]+sX[1]+sX[2]; return cct(sX[0]/s,sX[1]/s).toLocaleString()+' K · '+(sunRel*100).toPrecision(2)+'%';})());
  if(eclipse) document.getElementById('rsun').textContent+=' · '+eclipse;
  // swatch bar along the sun's vertical
  const bar=document.getElementById('hbar'); bar.innerHTML='';
  const pts=[[88,0],[75,0],[60,0],[45,0],[30,0],[15,0],[0,0],[15,180],[30,180],[45,180],[60,180],[75,180],[88,180]];
  for(const [vz,azr] of pts){ const X=sumAt(vz, sunAz+azr); const i=document.createElement('i'); i.style.background=hex(tone(X,Yref,k,p,0.95)); i.title=`${vz}° from zenith, ${azr?'away from':'toward'} the Sun`; bar.appendChild(i); }
  markHour();
  refreshDomeTip();
}
function warm(){ const ep=EP[dIdx], key=ep.key, lat=dLat; let s=0; const step=()=>{ if(EP[dIdx].key!==key||dLat!==lat) return; while(s<SZ.length && dense[key+'|'+lat+'|'+s]) s++; if(s>=SZ.length) return; denseSlice(key,lat,s); s++; (window.requestIdleCallback||setTimeout)(step); }; (window.requestIdleCallback||setTimeout)(step); }
sel.addEventListener('change',()=>setEpoch(+sel.value));
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>{ dLat=b.dataset.lat; document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); renderDay(); warm(); }));
const hslider=document.getElementById('hslider'); hslider.addEventListener('input',()=>{ minutes=+hslider.value; renderDay(); });
document.getElementById('moonDate').addEventListener('change',()=>renderDay());
const htrack=document.getElementById('htrack');
const HMIN=+hslider.min, HMAX=+hslider.max;
// The time of day in the epoch's own hours: m is the fraction of the day times DAYMIN.
function clockParts(m){ const h=Math.min(m, DAYMIN)/DAYMIN*dayHours(), s=Math.floor(h*3600+1e-6); return [Math.floor(s/3600), Math.floor(s/60)%60, s%60]; }
function clockLabel(m){ const [hh, mm]=clockParts(m); return hh+':'+String(mm).padStart(2,'0'); }
// A tick at each of the epoch's hours, built again when the day length changes.
function buildTicks(){
  const L=dayHours(); if(htrack.dataset.hours===String(L)) return;
  htrack.dataset.hours=String(L); htrack.innerHTML='';
  for(let n=0; n<=L; n++){ const m=n/L*DAYMIN; const t=document.createElement('button'); t.type='button'; t.className='tick row'+(n%2); t.style.left=(100*(m-HMIN)/(HMAX-HMIN))+'%'; t.dataset.min=String(m); t.innerHTML=`<i></i><span class="lb">${n}:00</span>`; t.addEventListener('click',()=>{ minutes=m; hslider.value=minutes; renderDay(); }); htrack.appendChild(t); }
}
function markHour(){ buildTicks(); const ticks=[...htrack.querySelectorAll('.tick')]; let best=0, bd=Infinity; ticks.forEach((t,j)=>{ const d=Math.abs(+t.dataset.min-minutes); if(d<bd){ bd=d; best=j; } }); ticks.forEach((t,j)=>{ const on=j===best; t.classList.toggle('on',on); if(on) t.setAttribute('aria-current','true'); else t.removeAttribute('aria-current'); }); }
const expo=document.getElementById('expo'); expo.addEventListener('click',()=>{ autoExpo=!autoExpo; expo.setAttribute('aria-pressed',autoExpo); renderDay(); });
let hTimer=null, dayPlaying=false, playRAF=0, playStamp=0; const hplay=document.getElementById('hplay');
// Play slows tenfold as the Sun goes from 85% to 99% covered and through an annular phase, so
// totality and the ring last long enough to watch.
function eclipseSlow(){
  if(!skyNow||!skyNow.sunOn) return 1;
  return 1-0.9*Math.max(skyNow.central?1:0, smooth01(0.85, 0.99, 1-(skyNow.sunVis==null?1:skyNow.sunVis)));
}
function adoptPlayRate(){
  if(hTimer){ clearInterval(hTimer); hTimer=null; }
  if(playRAF){ cancelAnimationFrame(playRAF); playRAF=0; }
  if(!dayPlaying) return;
  if(vrOn){
    // Page play covers 2.5 minutes of sky per 60 ms. In VR that rate is five times slower, and time advances continuously so the Sun does not jump.
    // The rate is in hours, so a shorter day goes by faster.
    playStamp=performance.now();
    const frame=now=>{
      if(!dayPlaying||!vrOn) return;
      playRAF=requestAnimationFrame(frame);
      let dt=(now-playStamp)/1000; playStamp=now; if(dt>0.05) dt=0.05;
      stepWalk(dt);
      minutes+=dt*(2.5/0.06)/5*eclipseSlow()*24/dayHours();
      while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
      hslider.value=minutes; renderDay(true);
    };
    playRAF=requestAnimationFrame(frame);
  }else hTimer=setInterval(()=>{ minutes+=2.5*eclipseSlow()*24/dayHours(); while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hslider.value=minutes; renderDay(); },60);
}
hplay.addEventListener('click',()=>{
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); if(vrOn) syncVRLink(true); if(vrOn&&walking()) pumpWalk(); }
  else { dayPlaying=true; if(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); adoptPlayRate(); }
  syncVRPad();
  if(vrOn) paintVR();
});
