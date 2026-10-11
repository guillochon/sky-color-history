/* ---------- Section 2: a day under that sky ---------- */
// The Moon pass and the colour tip read the dome back every render, so it is kept in memory.
const dome=document.getElementById('dome'), dctx=dome.getContext('2d', {willReadFrequently:true});
const sel=document.getElementById('depoch'); EP.forEach((ep,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=`${ep.age} — ${ep.name}`; sel.appendChild(o); });
let dIdx=MODERN_IDX, dLat='Mid-latitude', minutes=720, autoExpo=false;
const DAYMIN=1440; // midnight to midnight
sel.value=dIdx;
const LATDEG={'Equator':0,'Mid-latitude':45,'Polar':75,'Mid-latitude S':-45,'Polar S':-75};
// The southern latitudes share the northern ones' sky tables: the colours are tabulated by the
// Sun's height and the azimuth from it, the same in either hemisphere (the air is not told apart).
function dayLat(){ return dLat.replace(/ S$/, ''); }
// The latitude in words, as the dome's corner and the VR view give it.
function latLabel(){ const d=LATDEG[dLat]; return d?(d<0?'−':'')+Math.abs(d)+'°':'equator'; }
const SZ=DAY.szas, VZ=DAY.vz, AZ=DAY.az;
// The dome's zoom: the scroll wheel magnifies it up to DOME_ZOOM_MAX times about the pointer.
// z scales the fisheye's radius and (ox, oy) moves its centre, in canvas pixels.
const DOME_ZOOM_MAX=10, domeZoom={z:1, ox:0, oy:0};
function domeView(){ const W=dome.width, z=domeZoom.z; return {cx:W/2+domeZoom.ox, cy:dome.height/2+domeZoom.oy, R:W*0.46*z, z}; }
// The Sun at clock time min (sundial time) and declination dec, by default the page date's.
function sunGeom(lat, min, dec=sunEquatorial(astroDay()).Dec){ const p=altaz(lat, dec, (min/60-12)*15); return {sza:90-p.alt, az:p.az}; }
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
const dense={}; // per (epoch,lat): by sza index, a 91 x 91 table of XYZ, 1 deg in vz, 2 deg in az
function denseSlices(key, lat){ const id=key+'|'+lat; return dense[id]||(dense[id]=[]); }
function denseSlice(key, lat, s){
  const slices=denseSlices(key, lat); if(slices[s]) return slices[s];
  const G=DAY.epochs[key][lat].dome[s].map(row=>row.map(xyY2XYZ));
  const T=new Float32Array(91*91*3);
  const cols=[]; for(let a=0;a<=90;a++){ cols.push(G.map(row=>herm(AZ,row,a*2))); }
  for(let v=0;v<=90;v++){ for(let a=0;a<=90;a++){ const X=herm(VZ,cols[a],Math.min(v,88)); const o=(v*91+a)*3; T[o]=X[0];T[o+1]=X[1];T[o+2]=X[2]; } }
  slices[s]=T; return T;
}
// XYZ of the dome grid at solar zenith index si+st, view zenith vz and azimuth from the Sun azr,
// written into out. slices is denseSlices(key, lat).
function domeSample(slices, key, lat, si, st, vz, azr, out){
  out[0]=0; out[1]=0; out[2]=0;
  const fv=Math.min(90,vz), iv=Math.min(89,Math.floor(fv)), tv=fv-iv; const fa=azr/2, ia=Math.min(89,Math.floor(fa)), ta=fa-ia;
  const o00=(iv*91+ia)*3, o01=o00+3, o10=o00+273, o11=o10+3;
  for(let n=0;n<2;n++){
    const s=si+n, ws=n?st:1-st;
    if(!(ws>0)) continue;
    const T=slices[s]||denseSlice(key,lat,s);
    for(let q=0;q<3;q++){ const a=T[o00+q]*(1-ta)+T[o01+q]*ta, b=T[o10+q]*(1-ta)+T[o11+q]*ta; out[q]+=ws*(a*(1-tv)+b*tv); }
  }
  return out;
}
const DOME_TMP=new Float64Array(3);
function domeXYZ(key, lat, si, st, vz, azr){
  const o=domeSample(denseSlices(key, lat), key, lat, si, st, vz, azr, DOME_TMP);
  return [o[0], o[1], o[2]];
}
function skySource(sza, az){
  // Samples run through 20° below the horizon. From there to 30°, fade that last sky to black.
  // Past 9° down the model's twilight fades too slowly: measured zenith skies dim by about a
  // magnitude per degree of depression until the natural night sky takes over near 18°, while
  // the model's dim by a quarter of that. The extra 0.75 mag per degree closes the gap.
  const last=SZ[SZ.length-1], past=Math.max(0, sza-last);
  const fade=(past<=0 ? 1 : Math.max(0, 1-past/10))*Math.pow(10, -0.3*Math.max(0, sza-99));
  const [si,st]=bracket(SZ, Math.min(Math.max(sza, SZ[0]), last));
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
const AIRGLOW_O={protoearth455:0, hadean45:0, proterozoic22:0.3, snowball07:0.8, ordovician466:0.9, archean27thin:0, archean27:0, archean27vthick:0, archean38:0, hadean40:0};
const AIRGLOW_CO2={protoearth455:0.15, hadean45:0.15, archean27thin:0.15, archean27:0.15, archean27vthick:0.15, archean38:0.15, hadean40:0.15};
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
// The proto-Earth's guessed 3 bar of CO2 over a bar of N2 has a Rayleigh depth near 0.6, and with
// its dust 0.85 magnitudes. All three are dimmed at the zenith by the excess over clean air, and more toward the horizon.
// The soot of the impact winter absorbs what it removes; elsewhere the haze mostly scatters it
// back into the diffuse sky, so only the soot also darkens the airglow's diffuse glow.
const EXT_K={hadean45:7.6, protoearth455:0.85, hadean40:0.35, archean27:0.8, archean27vthick:1.8, kpg66:2.3, volcanic:0.7, modernpoll:0.8};
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
function toneLUT(k, p){
  const key=k+'|'+p; let T=toneLUTs[key];
  if(!T){ T=toneLUTs[key]=new Float32Array(6501); for(let i=0;i<=6500;i++) T[i]=toneT(Math.pow(10, -12+i*0.002), k, p, 0.95); }
  return T;
}
function toneAt(T, r){
  const x=(Math.log10(Math.max(r, 1e-12))+12)/0.002, i=Math.min(6499, Math.floor(x)), f=Math.min(1, x-i);
  return T[i]+(T[i+1]-T[i])*f;
}
// tone(), for the XYZ at X[o..o+2], written to out[o..o+2].
function toneTo(X, o, Yref, k, p, cap, out){
  const x0=X[o], x1=X[o+1], x2=X[o+2];
  if(!(x1>0)){ out[o]=0; out[o+1]=0; out[o+2]=0; return; }
  const e=Math.max(toneT(x1/Yref, k, p, cap), 0)/x1;
  let r=M[0][0]*x0+M[0][1]*x1+M[0][2]*x2, gg=M[1][0]*x0+M[1][1]*x1+M[1][2]*x2, b=M[2][0]*x0+M[2][1]*x1+M[2][2]*x2;
  r=Math.max(0,r*e); gg=Math.max(0,gg*e); b=Math.max(0,b*e);
  const mx=Math.max(r,gg,b); if(mx>1){r/=mx;gg/=mx;b/=mx;}
  out[o]=Math.round(255*g(r)); out[o+1]=Math.round(255*g(gg)); out[o+2]=Math.round(255*g(b));
}
// The dome's sky grid: DOME_NR+1 rings from the zenith to the horizon, DOME_NA+1 azimuths.
const DOME_NR=72, DOME_NA=144;
// The sky in XYZ on that grid, and its log luminance for the Milky Way pass: scratch space that
// every render fills in full.
const DOME_XYZ=new Float64Array((DOME_NR+1)*(DOME_NA+1)*3), DOME_LOGR=new Float64Array((DOME_NR+1)*(DOME_NA+1));
// The dome canvas's fixed geometry, worked out once: for each pixel the grid cell under it
// (0xFFFF outside the sky circle) and where in the cell it falls; the same for each 2×2 block
// of the Milky Way pass, with its direction and elevation.
let domeGeo=null;
function domeGeometry(W, H){
  const {cx, cy, R}=domeView();
  if(domeGeo && domeGeo.W===W && domeGeo.H===H && domeGeo.cx===cx && domeGeo.cy===cy && domeGeo.R===R) return domeGeo;
  const NR=DOME_NR, NA=DOME_NA, NC=NA+1;
  const cellOf=(dx, dy, rr, out, j)=>{
    const fr=(rr/R)*NR, ir=Math.min(NR-1,Math.floor(fr));
    let ang=Math.atan2(dx,-dy)*180/Math.PI; if(ang<0) ang+=360;
    const fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa));
    out.cell[j]=ir*NC+ia; out.tr[j]=fr-ir; out.ta[j]=fa-ia; return ang;
  };
  const n=W*H, px={cell:new Uint16Array(n), tr:new Float64Array(n), ta:new Float64Array(n)};
  for(let y=0, j=0;y<H;y++) for(let x=0;x<W;x++,j++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx,dy);
    if(r>R){ px.cell[j]=0xFFFF; continue; }
    cellOf(dx, dy, r, px, j);
  }
  const W2=W>>1, H2=H>>1, nb=W2*H2, bl={cell:new Uint16Array(nb), tr:new Float64Array(nb), ta:new Float64Array(nb)};
  const dir=new Float64Array(nb*3), el=new Float64Array(nb);
  for(let j=0, b=0;j<H2;j++) for(let i=0;i<W2;i++,b++){
    const dx=2*i+1-cx, dy=2*j+1-cy, rr=Math.hypot(dx, dy);
    if(rr>R){ bl.cell[b]=0xFFFF; continue; }
    const ang=cellOf(dx, dy, rr, bl, b);
    el[b]=90-90*rr/R;
    const d=horizDir(ang, el[b]); dir[b*3]=d[0]; dir[b*3+1]=d[1]; dir[b*3+2]=d[2];
  }
  return domeGeo={W, H, cx, cy, R, px, bl, dir, el, W2, nb, extK:null, ext:null, img:null};
}
// Extinction toward each Milky Way block for k magnitudes per airmass, kept for the last k.
function domeExtinction(geo, k){
  if(geo.extK!==k){ geo.ext=new Float64Array(geo.nb); for(let b=0;b<geo.nb;b++) if(geo.bl.cell[b]!==0xFFFF) geo.ext[b]=extinction(geo.el[b], k); geo.extK=k; }
  return geo.ext;
}
// The packed sky texture for VR and the dome's aurora (RGB and log luminance), made once per sky.
function skyTexData(sky){
  if(!sky.rgba){
    const n=sky.rgrid.length, cg=sky.colgrid, d=new Uint8Array(n*4);
    for(let c=0;c<n;c++){ d[c*4]=cg[c*3]; d[c*4+1]=cg[c*3+1]; d[c*4+2]=cg[c*3+2]; d[c*4+3]=encodeLogR(sky.rgrid[c]); }
    sky.rgba=d;
  }
  return sky.rgba;
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
  if(vrOn) perfBeg('sky model');
  // The date shows at once, while an epoch's sky is still loading.
  syncDateUI();
  if(!dayReady(EP[dIdx].key, 'modern')) return;
  vrNote='';
  const ep=EP[dIdx], rec=DAY.epochs[ep.key][dayLat()], sunNow=sunEquatorial(astroDay()); const {sza,az:sunAz}=sunGeom(LATDEG[dLat], minutes, sunNow.Dec);
  // Sunlight, and the moonlight it makes, go as the inverse square of the distance from the Sun:
  // 3.4% brighter at perihelion in January than on average, 3.3% dimmer at aphelion in July.
  const sunFlux=1/(sunNow.au*sunNow.au);
  const W=dome.width,H=dome.height, {cx, cy, R, z}=domeView();
  // Moonlight is the Sun's sky field, evaluated at the Moon and added. Hold the
  // Sun's pre-fade luminance so auto-exposure does not undo the twilight fade.
  const sunSrc=skySource(sza, sunAz);
  const moon=lunarPlace(LATDEG[dLat]);
  const moonSrc=skySource(90-moon.el, moon.az);
  // In a lunar eclipse (lunar_eclipse.js) the moonlight falls with the disk's mean light.
  const lunar=lunarEclipseNow(moon);
  const mScale=moonSkyScale(moon, sunAz, 90-sza)*sunFlux*(lunar?lunar.Ymean:1);
  const si=sunSrc.si, st=sunSrc.st, past=sunSrc.past;
  // The planets and stars, placed now so that a planet bright enough to light the sky can: as the
  // Moon does, the Sun's sky field evaluated at the planet, scaled by its light over the Sun's
  // (the Sun's own dimness in the epoch is in the field already). Only past magnitude -6, which
  // in these skies is Theia passing the proto-Earth, at up to about -8.5: a few percent of the full
  // Moon's light.
  const stars=placeStars(LATDEG[dLat]);
  const sunLmag=2.5*Math.log10((ep.sunL)||1);
  const planetLights=stars.marks.filter(s=>s.planet&&!s.host&&s.mag<-6).map(s=>({src:skySource(90-s.el, s.az), k:Math.pow(10, -0.4*(s.mag+sunLmag-MOON_V_SUN))}));
  const NR=DOME_NR, NA=DOME_NA, NC=NA+1, NG=(NR+1)*NC;
  const addField=(X, src, scale, vz, comp)=>{
    if(!src || src.fade<=0) return null;
    let azr=Math.abs(comp-src.az); if(azr>180) azr=360-azr;
    const S=domeXYZ(ep.key,dayLat(),src.si,src.st,Math.min(vz,88),azr);
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
      for(let azr=0;azr<=180;azr+=10){ const S=domeXYZ(ep.key,dayLat(),rs.si,rs.st,vz,azr), w=(azr===0||azr===180)?0.5:1; X[0]+=S[0]*w; X[1]+=S[1]*w; X[2]+=S[2]*w; }
      ring.push(X.map(v=>v/18)); }
    const zen=domeXYZ(ep.key,dayLat(),si,st,0,0)[1]*sunSrc.fade;
    ringK=1e-3*zen/Math.max(ring[0][1], 1e-30)*smooth01(0.5, 1, cover);
  }
  const addRing=(X, vz)=>{ if(!ring) return; const r=ring[Math.min(NR, Math.round(vz/90*NR))]; X[0]+=r[0]*ringK; X[1]+=r[1]*ringK; X[2]+=r[2]*ringK; };
  const night=nightRows(ep.key, NR);
  // Debris (debris.js): the excess zodiacal light, and the Ordovician ring with the glow its light
  // lends the air (0.027 cd/m² of sky per lux, as moonlight).
  const ringR=ringOf(ep.key), zodiOn=zodiK(ep.key)>1, ecl=(zodiOn||ringR)?eclipticFrame(LATDEG[dLat]):null, sunDir=horizDir(sunAz, 90-sza);
  const zodiXY=xyY2XYZ([NIGHT_REST_XY[0], NIGHT_REST_XY[1], 1]), ekD=extK(ep.key), cduD=cdPerUnit();
  const ringLux=ringR?ringIlluminance(ringR, sunDir, ecl.pole, sunFlux, ekD):0, ringSky=ringR?xyY2XYZ([0.285, 0.300, 0.027*ringLux/cduD]):null;
  // The sky on the grid, in XYZ: the night sky, then the Sun's field, the Moon's, and the ring.
  const grid=DOME_XYZ, S=DOME_TMP, slices=denseSlices(ep.key, dayLat()), sunF=sunVis*sunFlux;
  let Ymax=1e-30, Yhold=1e-30, Ysun=1e-30;
  const zAbs=zodiOn?absZenith(ep.key):0;
  for(let ir=0;ir<=NR;ir++){ const vz=90*ir/NR, vzc=Math.min(vz,88), nr=night[ir], rg=ring?ring[Math.min(NR, Math.round(vz/90*NR))]:null;
    const el=90-vz, zExt=zodiOn?0.4+0.6*extinction(el, ekD):0;
    for(let ia=0;ia<=NA;ia++){ const comp=360*ia/NA;
      let X0=nr[0], X1=nr[1], X2=nr[2];
      if(!(sunSrc.fade<=0)){
        let azr=Math.abs(comp-sunSrc.az); if(azr>180) azr=360-azr;
        domeSample(slices, ep.key, dayLat(), sunSrc.si, sunSrc.st, vzc, azr, S);
        if(sunF>0){ const f=sunSrc.fade*sunF; X0+=S[0]*f; X1+=S[1]*f; X2+=S[2]*f; }
        const y=S[1]*sunSrc.fade; if(y>Ysun) Ysun=y; if(S[1]>Yhold) Yhold=S[1];
      }
      if(!(moonSrc.fade<=0)){
        let azr=Math.abs(comp-moonSrc.az); if(azr>180) azr=360-azr;
        domeSample(slices, ep.key, dayLat(), moonSrc.si, moonSrc.st, vzc, azr, S);
        if(mScale>0){ const f=moonSrc.fade*mScale; X0+=S[0]*f; X1+=S[1]*f; X2+=S[2]*f; }
      }
      for(const pl of planetLights){
        if(pl.src.fade<=0) continue;
        let azr=Math.abs(comp-pl.src.az); if(azr>180) azr=360-azr;
        domeSample(slices, ep.key, dayLat(), pl.src.si, pl.src.st, vzc, azr, S);
        const f=pl.src.fade*pl.k; X0+=S[0]*f; X1+=S[1]*f; X2+=S[2]*f;
      }
      if(rg){ X0+=rg[0]*ringK; X1+=rg[1]*ringK; X2+=rg[2]*ringK; }
      if(zodiOn){ const zl=zodiExtra(ep.key, horizDir(comp, el), ecl)*zAbs*zExt/cduD; X0+=zodiXY[0]*zl; X1+=zodiXY[1]*zl; X2+=zodiXY[2]*zl; }
      if(ringSky){ X0+=ringSky[0]; X1+=ringSky[1]; X2+=ringSky[2]; }
      if(X1>Ymax) Ymax=X1;
      const o=(ir*NC+ia)*3; grid[o]=X0; grid[o+1]=X1; grid[o+2]=X2;
    }
  }
  const Ybase=past>0?Yhold:Math.max(Ysun,Ymax);
  const Yref = autoExpo ? Math.max(Ybase, 1e-6*YREF) : YREF; const k=0.85, p = autoExpo?0.5:0.4;
  // Display colours (sRGB bytes) and luminance over the reference, flat in grid order.
  const colgrid=new Uint8Array(NG*3), rgrid=new Float64Array(NG);
  for(let c=0;c<NG;c++){ toneTo(grid, c*3, Yref, k, p, 0.95, colgrid); rgrid[c]=Math.max(grid[c*3+1], 1e-30)/Yref; }
  // The Milky Way on the dome, per pixel, once the sky is dark enough for it to matter.
  const cdu=cdPerUnit(), mwOn=!!mwMap && rgrid[0]<2e-6, galB=mwOn?galacticBasis(LATDEG[dLat]):null, ek=extK(ep.key);
  // The nebulae and galaxies (dso.js): their bright cores can show through a moonlit sky.
  const dsoList=rgrid[0]<2e-4?dsoPlace(LATDEG[dLat]):[];
  const geo=domeGeometry(W, H), W2=geo.W2;
  // The Milky Way, the nebulae and galaxies, and the sky under them vary slowly, so the mix is
  // worked out once per 2×2 pixel block: each pixel's linear colour is scaled by mwA and gains
  // mwB (three channels) of their light.
  const mwA=(mwOn||dsoList.length)&&!fast?new Float32Array(geo.nb):null, mwB=mwA?new Float32Array(geo.nb*3):null;
  if(mwA){
    if(!MW_LIN) MW_LIN=xyzLin(xyY2XYZ([MW_XY[0], MW_XY[1], 1]));
    const lgrid=DOME_LOGR; for(let c=0;c<NG;c++) lgrid[c]=Math.log(rgrid[c]);
    const ext=domeExtinction(geo, ek), extZ=extZenith(ep.key), scale=cdu*Yref, T=toneLUT(k, p), bl=geo.bl, dir=geo.dir;
    const [b0, b1, b2]=galB||GAL_AXES, db=galB?galB.db:0, dd=[0, 0, 0], Ld=[0, 0, 0], blockRad=Math.PI/R;
    for(let bi=0;bi<geo.nb;bi++){
      const c=bl.cell[bi]; if(c===0xFFFF) continue;
      const d0=dir[bi*3], d1=dir[bi*3+1], d2=dir[bi*3+2];
      let rMw=0;
      if(mwOn){
        const x=d0*b0[0]+d1*b0[1]+d2*b0[2], y=d0*b1[0]+d1*b1[1]+d2*b1[2], z=d0*b2[0]+d1*b2[1]+d2*b2[2];
        rMw=mwSample(Math.atan2(y, x)*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, z)))*180/Math.PI-db)*ext[bi]*extZ/scale;
      }
      let rD=0;
      if(dsoList.length){
        dd[0]=d0; dd[1]=d1; dd[2]=d2;
        if(dsoAt(dsoList, dd, blockRad, Ld)){ const s=ext[bi]*extZ/scale; Ld[0]*=s; Ld[1]*=s; Ld[2]*=s; rD=Ld[0]*0.2126+Ld[1]*0.7152+Ld[2]*0.0722; }
      }
      const rAdd=rMw+rD;
      if(!(rAdd>0)) continue;
      const tr=bl.tr[bi], ta=bl.ta[bi];
      const la=lgrid[c]*(1-ta)+lgrid[c+1]*ta, lb=lgrid[c+NC]*(1-ta)+lgrid[c+NC+1]*ta, rBg=Math.exp(la*(1-tr)+lb*tr);
      if(rAdd<rBg*0.003) continue;
      const rNew=rBg+rAdd, tBg=toneAt(T, rBg);
      let tNew=toneAt(T, rNew);
      // A nebula or galaxy over the sky and the Milky Way (color.js toneDso).
      if(rD>0){ const rb=rBg+rMw; tNew=toneDso(rMw>0?toneAt(T, rb):tBg, rb, rNew, tNew); }
      const g=tNew/rNew;
      mwA[bi]=tBg>0?(tNew/tBg)*(rBg/rNew):0;
      for(let q=0;q<3;q++) mwB[bi*3+q]=g*(MW_LIN[q]*rMw+(rD>0?Ld[q]:0));
    }
  }
  // Ice halos (halo.js), from the Sun and the Moon: each source's halo luminance over Yref per
  // unit of haloAt, and its colour as linear RGB of unit luminance.
  const hStr=haloStrength(ep.key, dayLat()), halos=[];
  let haloVR=null;
  if(hStr>0){
    let rMin=Infinity; for(let c=0;c<NG;c++) if(rgrid[c]<rMin) rMin=rgrid[c];
    const beamLin=sza0=>{ const [i]=bracket(SZ, Math.max(sza0, SZ[0])); let j=i; while(j>0 && !(rec.sun[j][1]>0)) j--; const c=rec.sun[j]; return c[1]>0?xyzLin(xyY2XYZ([c[0], c[1], 1])):[1, 1, 1]; };
    const add=(az, el, k, sza0)=>{ const h={src:haloSource(horizDir(az, el)), k:el>-1&&k>0?k:0, lin:beamLin(sza0)}; if(h.k*20>rMin*0.003) halos.push(h); return h; };
    const hs=add(sunAz, 90-sza, hStr*directBeam(rec, sza)*sunVis*sunFlux*YREF/Yref, sza);
    const hm=add(moon.az, moon.el, hStr*directBeam(rec, 90-moon.el)*mScale*YREF/Yref, 90-moon.el);
    haloVR={k:new Float32Array([hs.k, hm.k]), sun:new Float32Array(hs.lin), moon:new Float32Array(hm.lin)};
  }
  const haloOn=!fast && halos.length>0;
  // Comets (comets.js), per pixel on the dome.
  const comets=cometsNow(ep.key, LATDEG[dLat]), cometOn=!fast&&comets.length>0;
  // The ring, per pixel on the dome; for VR its constants.
  const ringPw=Math.PI/180*90/R, ringOn=!fast&&!!ringR;
  const ringVR=ringR?{R:ringR, P:ecl.pole, k:1.27e5*ringR.sunL*sunFlux*ringR.alb/(4*Math.PI)/(Yref*cdu)*absZenith(ep.key)}:null;
  if(!fast){
    if(!geo.img) geo.img=dctx.createImageData(W,H);
    const img=geo.img, px=img.data, cell=geo.px.cell, ptr=geo.px.tr, pta=geo.px.ta, C2=NC*3;
    const rctx=ringOn?{dir:domePixelDirs(geo), v:[0, 0, 0], R:ringR, s:sunDir, P:ecl.pole, pw:ringPw, sunFlux, k:ekD, extZ:absZenith(ep.key), rCd:Yref*cdu, rgrid, NC, T:toneLUT(k, p)}:null;
    const cctx=cometOn?{dir:domePixelDirs(geo), v:[0, 0, 0], L:[0, 0, 0], o:{}, list:comets, pw:Math.PI/180*90/R, k:ekD, extZ:absZenith(ep.key), rCd:Yref*cdu, rgrid, NC, T:toneLUT(k, p)}:null;
    const hctx=haloOn?{dir:domePixelDirs(geo), rgrid, NC, T:toneLUT(k, p), v:[0, 0, 0], w:[0, 0, 0], L:[0, 0, 0]}:null;
    for(let y=0, j=0;y<H;y++) for(let x=0;x<W;x++,j++){
      const o=j*4, c=cell[j];
      if(c===0xFFFF){ px[o]=10;px[o+1]=12;px[o+2]=18;px[o+3]=255; continue; }
      const tr=ptr[j], ta=pta[j], c0=c*3;
      for(let q=0;q<3;q++){ const a=colgrid[c0+q]*(1-ta)+colgrid[c0+3+q]*ta, b=colgrid[c0+C2+q]*(1-ta)+colgrid[c0+C2+3+q]*ta; px[o+q]=a*(1-tr)+b*tr; }
      px[o+3]=255;
      if(mwA){
        const bi=(y>>1)*W2+(x>>1), a=mwA[bi];
        if(a>0||mwB[bi*3+1]>0){ for(let q=0;q<3;q++) px[o+q]=linToByte(SRGB_LIN[Math.round(px[o+q])]*a+mwB[bi*3+q]); }
      }
      if(ringOn) domeRingPixel(px, o, j, c, tr, ta, rctx);
      if(cometOn) domeCometPixel(px, o, j, c, tr, ta, cctx);
      if(haloOn) domeHaloPixel(px, o, j, c, tr, ta, halos, hctx);
    }
    dctx.putImageData(img,0,0);
  }
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
  const SUNR=DOME_DISK*z*moon.sunRadDeg/SUN_RADIUS_DEG, rr=R*sza/90, a=sunAz*Math.PI/180, sx=cx+rr*Math.sin(a), sy=cy-rr*Math.cos(a);
  const sunRGB=tone(sXd, sXd[1], 0.95,0.4,0.98);
  // Comet heads join the stars as points (their coma and tails are drawn per pixel above).
  for(const C of comets){ if(C.el<0) continue; const sh=pointDisplay(cometHeadMag(C)); stars.marks.push({az:C.az, el:C.el, mag:cometHeadMag(C), px:sh.px, rgb:starTint(5200).map(v=>Math.min(2.4, v)*Math.min(1, 0.62*Math.sqrt(Math.pow(10, -0.4*(cometHeadMag(C)-STAR_VANCHOR))))), comet:C}); }
  if(!fast) drawStarsOnDome(stars.marks, rgrid, Yref*cdu, ep.key, moon);
  const sunUpPix=!fast && rr-SUNR<R && sunRelD>3e-4;
  if(sunUpPix){
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    // The Moon covers the photosphere; drawMoonOnDome then draws it over the sky like the rest of its disk.
    if(moon.el>-moon.radDeg){
      const mrr=R*(90-moon.el)/90, ma=moon.az*Math.PI/180;
      dctx.beginPath(); dctx.rect(0,0,W,H); dctx.arc(cx+mrr*Math.sin(ma), cy-mrr*Math.cos(ma), moon.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG), 0, Math.PI*2, true); dctx.clip('evenodd');
    }
    // Limb darkening, as stops of a radial gradient: dense toward the edge, where it falls fastest.
    const g=dctx.createRadialGradient(sx,sy,0,sx,sy,SUNR);
    for(const r of [0, 0.3, 0.5, 0.65, 0.75, 0.83, 0.89, 0.93, 0.96, 0.98, 1]) g.addColorStop(r, hex(sunLimbRGB(sunRGB, r)));
    dctx.globalAlpha=1; dctx.fillStyle=g; dctx.beginPath(); dctx.arc(sx,sy,SUNR,0,Math.PI*2); dctx.fill(); dctx.restore();
    // Its spots and faculae, where the Moon isn't in front.
    const mrr=R*(90-moon.el)/90, ma=moon.az*Math.PI/180;
    drawSunSurfaceOnDome(sx, sy, SUNR, sunAz, 90-sza, moon.el>-moon.radDeg?[cx+mrr*Math.sin(ma), cy-mrr*Math.cos(ma), moon.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG)]:null);
  }
  // Corona, pink chromosphere, and the diamond ring: the corona shows once less than about 3% of
  // the drawn photosphere is left (Sun's inner corona is about a millionth of the disk, near the
  // full Moon's brightness), the ring while the last sliver is going.
  const sunUp=sza<90+SUN_RADIUS_DEG*diskScale;
  const corona=sunUp?1-smooth01(0.003, 0.03, sunVis):0;
  const cGain=corona>0?coronaGain(ep.key, 90-sza):0, cMap=corona>0?coronaMap(ep.key, cGain):null, cRim=corona>0?coronaRimK(ep.key, cGain):1;
  const {beads, beadW, beadDir}=findBeads(moon, sunAz, sza, rSun, rMoon, sunUp);
  if(!fast && sunUpPix && (corona>0 || beadW>0)){
    const mrr=R*(90-moon.el)/90, ma=moon.az*Math.PI/180, mx=cx+mrr*Math.sin(ma), my=cy-mrr*Math.cos(ma), mr=moon.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG);
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
    dctx.beginPath(); dctx.rect(0,0,W,H); dctx.arc(mx,my,mr,0,Math.PI*2,true); dctx.clip('evenodd');
    if(corona>0){
      // The epoch's corona, drawn as today's at the radius where today's is as bright (corona.js).
      const out=coronaOuter(cMap), g=dctx.createRadialGradient(sx,sy,SUNR,sx,sy,SUNR*out);
      for(let i=0;i<=20;i++){ const t=i/20; const a=1+(out-1)*t; g.addColorStop(t, `rgba(255,248,236,${coronaAlpha(coronaRemap(cMap, a))*(1-smooth01(5, CORONA_MAP_MAX, a))*(i<20)*corona})`); }
      dctx.fillStyle=g; dctx.beginPath(); dctx.arc(sx,sy,SUNR*out,0,Math.PI*2); dctx.fill();
      dctx.strokeStyle=`rgba(255,90,120,${0.9*corona*Math.min(1, cRim)})`; dctx.lineWidth=1.5*Math.max(1, cRim); dctx.beginPath(); dctx.arc(sx,sy,SUNR+0.75,0,Math.PI*2); dctx.stroke();
    }
    dctx.restore();
  }
  if(!fast) drawMoonOnDome(moon, sunAz, 90-sza, lunar);
  if(!fast && sunUpPix && beadW>0){
    // The dome is too coarse for separate beads; the brightest stands for them.
    const bAz=Math.atan2(beadDir[0], beadDir[1]), bZ=90-Math.asin(beadDir[2])*180/Math.PI, br=R*bZ/90, bx=cx+br*Math.sin(bAz), by=cy-br*Math.cos(bAz);
    const g=dctx.createRadialGradient(bx,by,0,bx,by,SUNR*3);
    g.addColorStop(0, `rgba(255,255,250,${beadW})`); g.addColorStop(0.15, `rgba(255,250,235,${0.6*beadW})`); g.addColorStop(1, 'rgba(255,250,235,0)');
    dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip(); dctx.fillStyle=g; dctx.beginPath(); dctx.arc(bx,by,SUNR*3,0,Math.PI*2); dctx.fill(); dctx.restore();
  }
  // What kind of eclipse this is, for the readouts. The first and last percent keep a decimal, so a
  // sliver of a bite never reads as 0% or 100% covered.
  let eclipse='', central=false;
  if(sunUp && cover>0.0005){
    central=sepDeg<=Math.abs(rMoon-rSun);
    if(central){
      const end=centralEnd(pageMs(), diskScale), left=end==null?0:Math.max(0, (end-pageMs())/1000);
      eclipse=(rMoon>=rSun?'total eclipse':'annular eclipse')+(end==null?'':` · ${Math.floor(left/60)}m ${String(Math.floor(left%60)).padStart(2,'0')}s left`);
    }else eclipse=`partial eclipse · ${cover>0.99?(Math.floor(cover*1000)/10).toFixed(1):cover<0.01?Math.max(0.1, Math.round(cover*1000)/10).toFixed(1):Math.round(cover*100)}% covered`;
  }
  // Brightness as a share of the full Moon: a crescent is only a few percent.
  // In a lunar eclipse it can be far less, so small shares keep one figure, and the readout gives
  // the Moon's magnitude.
  const fullPct=r=>{ const p=r*100; return (p<1e-3 ? 'under 0.001' : p<0.1 ? p.toPrecision(1) : p<10 ? p.toFixed(1) : Math.round(p))+'%'; };
  const sn=supernovaPlace(LATDEG[dLat]);
  if(!fast) drawSupernovaOnDome(sn);
  skyNow={colgrid, nr:NR, na:NA, sza, sunAz, sunRGB, sunVis, lunar, sunOn:sunRelD>3e-4 && sza<90+SUN_RADIUS_DEG*DISK_SCALE*1.5+35/60*refK(), moon, corona, coronaMap:cMap, coronaRim:cRim, beads, eclipse:eclipse||(lunar&&moon.on?lunar.text:''), central, rgrid, cityUp:cityUplight(ep.key, Yref, k, p), Yref, toneK:k, toneP:p, rCd:Yref*cdu, gal:mwMap?galacticBasis(LATDEG[dLat]):null, dso:dsoList, extK:ek, stars:stars.tex, starMarks:stars.marks, bodies:stars.bodies, starBins:stars.bins, starIdx:stars.idx, starIdxCount:stars.idxCount, sn, moonRel:mScale/MOON_SUN_FULL, mScale, sunFlux, halo:haloVR, ring:ringVR, ecl, comets, aur:auroraState(ep.key, LATDEG[dLat], minutes, rgrid[0]*Yref*cdu), gen:++skyGen};
  document.getElementById('raur').textContent=auroraReadout(skyNow.aur);
  document.getElementById('rmet').textContent=meteorReadout();
  document.getElementById('rcomet').textContent=cometReadout();
  metKick();
  document.getElementById('rmoon').textContent = moon.none ? 'none yet: the Moon forms in a later giant impact' : (moon.el<-moon.radDeg ? 'below horizon' : moon.el.toFixed(1)+'°')+' · '+Math.round(moonLit(moon, sunAz, 90-sza)*100)+'% lit · '+fullPct(mScale/MOON_SUN_FULL)+' of full';
  // The eclipse's details have a cell of their own that is always there, so the Sun's and Moon's
  // readouts keep their size as an eclipse comes and goes.
  document.getElementById('recl').textContent=eclipse?'Sun · '+eclipse:lunar?'Moon · '+(MOON_V_SUN-2.5*Math.log10(Math.max(mScale, 1e-40))).toFixed(1)+' mag · '+lunar.text:'none';
  perfEnd('sky model');
  if(vrOn) paintVR();
  if(fast) return;
  // compass + rim
  dctx.strokeStyle='rgba(255,255,255,.35)'; dctx.lineWidth=1.5; dctx.beginPath(); dctx.arc(cx,cy,R,0,7); dctx.stroke();
  dctx.fillStyle='rgba(255,255,255,.8)'; dctx.font='16px Newsreader, Georgia, serif'; dctx.textAlign='center';
  dctx.fillText('N',cx,cy-R-6); dctx.fillText('S',cx,cy+R+18); dctx.fillText('E',cx+R+12,cy+6); dctx.fillText('W',cx-R-12,cy+6); dctx.textAlign='left';
  // Two short lines in the corner, clear of the sky circle and the S mark.
  dctx.font='italic 20px Newsreader, Georgia, serif'; dctx.fillText(ep.short, 12, H-27);
  if(z>1.005){ dctx.font='15px Newsreader, Georgia, serif'; dctx.fillText(`${z<9.95?z.toFixed(1):'10'}× · middle-drag to pan, double-click to reset`, 12, 22); }
  dctx.font='15px Newsreader, Georgia, serif'; dctx.fillText(`${ep.age} · ${dLat==='Equator'?'equator':latLabel()+' latitude'}`, 12, H-8);
  // readouts
  document.getElementById('hclock').textContent=clockLabel(minutes);
  document.getElementById('rday').textContent=`${dayHours()} hours · ${Math.round(yearDays())}-day year`;
  document.getElementById('relev').textContent=(90-sza).toFixed(1)+'°';
  const sumAt=(vz,comp)=>{ const X=night[Math.min(NR, Math.round(vz/90*NR))].slice(); addField(X,sunSrc,sunVis*sunFlux,vz,comp); addField(X,moonSrc,mScale,vz,comp); for(const pl of planetLights) addField(X,pl.src,pl.k,vz,comp); addRing(X,vz);
    if(zodiOn){ const el=90-vz, zl=zodiExtra(ep.key, horizDir(comp, el), ecl)*absZenith(ep.key)*(0.4+0.6*extinction(el, ekD))/cduD; for(let q=0;q<3;q++) X[q]+=zodiXY[q]*zl; }
    if(ringSky) for(let q=0;q<3;q++) X[q]+=ringSky[q];
    return X; };
  const zX=sumAt(0, sunAz), hX=sumAt(88, sunAz+90);
  const fmt=X=>{ if(X[1]*cdu<1) return skyMagArcsec(X[1]*cdu).toFixed(1)+' mag/arcsec²'; const s=X[0]+X[1]+X[2]; const c=cct(X[0]/s,X[1]/s); return (c>800&&c<60000? c.toLocaleString()+' K':'—')+` · ${(100*X[1]/YREF).toPrecision(2)}%`; };
  document.getElementById('rzen').textContent=fmt(zX); document.getElementById('rhor').textContent=fmt(hX);
  document.getElementById('rsun').textContent = sza>=90 ? 'below horizon' : (sunRel<=3e-4 ? 'not visible' : (()=>{const s=sX[0]+sX[1]+sX[2]; return cct(sX[0]/s,sX[1]/s).toLocaleString()+' K · '+(sunRel*100).toPrecision(2)+'%';})());
  // swatch bar along the sun's vertical
  const bar=document.getElementById('hbar'); bar.innerHTML='';
  const pts=[[88,0],[75,0],[60,0],[45,0],[30,0],[15,0],[0,0],[15,180],[30,180],[45,180],[60,180],[75,180],[88,180]];
  for(const [vz,azr] of pts){ const X=sumAt(vz, sunAz+azr); const i=document.createElement('i'); i.dataset.hex=hex(tone(X,Yref,k,p,0.95)); i.style.background=i.dataset.hex; i.dataset.vz=vz; i.dataset.azr=azr; i.setAttribute('aria-label',`${vz}° from zenith, ${azr?'away from':'toward'} the Sun`); bar.appendChild(i); }
  refreshBarTip();
  markHour();
  paintDomeAurora();
  drawDomeLabels();
  refreshDomeTip();
}
function warm(){ const ep=EP[dIdx], key=ep.key, lat=dayLat(); let s=0; if(!DAY.epochs[key]){ loadDay(key).then(()=>{ if(EP[dIdx].key===key && dayLat()===lat && DAY.epochs[key]) warm(); }); return; } const step=()=>{ if(EP[dIdx].key!==key||dayLat()!==lat) return; while(s<SZ.length && denseSlices(key,lat)[s]) s++; if(s>=SZ.length) return; denseSlice(key,lat,s); s++; (window.requestIdleCallback||setTimeout)(step); }; (window.requestIdleCallback||setTimeout)(step); }
// The controls ask for a render on the next frame, so a burst of input draws once.
let renderQueued=0;
function requestRender(){ if(!renderQueued) renderQueued=requestAnimationFrame(()=>{ renderQueued=0; renderDay(); }); }
// The scroll wheel zooms the dome about the pointer, by the same factor per notch. The centre
// may move only as far as keeps the sky around the middle of the canvas, as wide as the unzoomed
// dome, inside the sky circle. Zoomed all the way out, the page scrolls as usual.
function setDomeView(z, ox, oy){
  const m=Math.hypot(ox, oy), lim=dome.width*0.46*(z-1); if(m>lim){ ox*=lim/m; oy*=lim/m; }
  if(z===domeZoom.z && ox===domeZoom.ox && oy===domeZoom.oy) return;
  Object.assign(domeZoom, {z, ox, oy}); requestRender();
}
function zoomDome(z, px, py){
  const v=domeView();
  z=Math.max(1, Math.min(DOME_ZOOM_MAX, z));
  setDomeView(z, px-(px-v.cx)*z/v.z-dome.width/2, py-(py-v.cy)*z/v.z-dome.height/2);
}
dome.addEventListener('wheel', e=>{
  const d=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*400:e.deltaY;
  if(d>0 && domeZoom.z<=1) return;
  e.preventDefault();
  const b=dome.getBoundingClientRect();
  zoomDome(domeZoom.z*Math.exp(-d*0.0015), (e.clientX-b.left)*dome.width/b.width, (e.clientY-b.top)*dome.height/b.height);
}, {passive:false});
dome.addEventListener('dblclick', ()=>zoomDome(1, dome.width/2, dome.height/2));
// Dragging with the middle button moves a zoomed view; the sky follows the pointer.
let domeDrag=null;
dome.addEventListener('mousedown', e=>{
  if(e.button!==1 || domeZoom.z<=1) return;
  e.preventDefault(); domeDrag={x:e.clientX, y:e.clientY}; dome.style.cursor='grabbing';
});
window.addEventListener('mousemove', e=>{
  if(!domeDrag) return;
  const b=dome.getBoundingClientRect(), k=dome.width/b.width;
  setDomeView(domeZoom.z, domeZoom.ox+(e.clientX-domeDrag.x)*k, domeZoom.oy+(e.clientY-domeDrag.y)*k);
  domeDrag={x:e.clientX, y:e.clientY};
});
window.addEventListener('mouseup', e=>{ if(e.button===1 && domeDrag){ domeDrag=null; dome.style.cursor=''; } });
// The middle button would otherwise start the browser's autoscroll or open a link.
dome.addEventListener('auxclick', e=>{ if(e.button===1) e.preventDefault(); });
// Whether the dome is on screen: Play holds still while it is scrolled away.
let domeOnScreen=true;
if(window.IntersectionObserver) new IntersectionObserver(es=>{ domeOnScreen=es[es.length-1].isIntersecting; }).observe(dome);
sel.addEventListener('change',()=>setEpoch(+sel.value));
document.querySelectorAll('[data-lat]').forEach(b=>b.addEventListener('click',()=>{ dLat=b.dataset.lat; document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed',x===b)); requestRender(); warm(); }));
const hslider=document.getElementById('hslider'); hslider.addEventListener('input',()=>{ minutes=+hslider.value; requestRender(); });
const htrack=document.getElementById('htrack');
const HMIN=+hslider.min, HMAX=+hslider.max;
// The time of day in the epoch's own hours: m is the fraction of the day times DAYMIN.
function clockParts(m){ const h=Math.min(m, DAYMIN)/DAYMIN*dayHours(), s=Math.floor(h*3600+1e-6); return [Math.floor(s/3600), Math.floor(s/60)%60, s%60]; }
function clockLabel(m){ const [hh, mm]=clockParts(m); return hh+':'+String(mm).padStart(2,'0'); }
// The short readouts keep one size whatever they say: each is held to the height of the longest
// text it can show at the page's width, and the clock and the date's button to the width of their
// longest, measured again only when the width or the fonts change. The last three (comets,
// eclipse, meteors) run to two or three lines only now and then, and take the height they need.
function readoutSamples(){
  const sky=['88,888 K · 0.0088%', '88.8 mag/arcsec²'];
  return {
    hclock:['88:88'], dateBtn:['Sep 88, 8888', 'Sep 88, year −8888'], rday:['88.8 hours · 888-day year'],
    relev:['-88.8°'], rzen:sky, rhor:sky,
    rsun:['88,888 K · 0.088%', 'below horizon', 'not visible'],
    rmoon:['-88.8° · 100% lit · under 0.001% of full', 'below horizon · 100% lit · under 0.001% of full'],
    raur:['hidden by the CO₂', 'oval too far north', 'oval too far south', 'inside the polar cap', 'oval overhead · sky too bright',
      'oval 88° north · violet and pink (nitrogen)', 'oval 88° south · violet and pink (nitrogen)', 'oval 88° north · pale green and violet', 'oval 88° south · pale green and violet'],
  };
}
let readoutW=0;
function holdReadouts(force){
  const w=document.querySelector('.readout').getBoundingClientRect().width;
  if(!w||(!force&&w===readoutW)) return;
  readoutW=w;
  for(const [id, samples] of Object.entries(readoutSamples())){
    const el=document.getElementById(id), keep=el.textContent, wide=id==='hclock'||id==='dateBtn', size=()=>{ const r=el.getBoundingClientRect(); return wide?r.width:r.height; };
    el.style[wide?'minWidth':'minHeight']='';
    let m=0;
    for(const s of samples){ el.textContent=s; m=Math.max(m, size()); }
    el.textContent=keep;
    el.style[wide?'minWidth':'minHeight']=Math.ceil(m)+'px';
  }
}
if(window.ResizeObserver) new ResizeObserver(()=>holdReadouts(false)).observe(document.querySelector('.readout'));
if(document.fonts){ document.fonts.ready.then(()=>holdReadouts(true)); document.fonts.addEventListener('loadingdone', ()=>holdReadouts(true)); }
// A tick at each of the epoch's hours, built again when the day length changes.
function buildTicks(){
  const L=dayHours(); if(htrack.dataset.hours===String(L)) return;
  htrack.dataset.hours=String(L); htrack.innerHTML='';
  for(let n=0; n<=L; n++){ const m=n/L*DAYMIN; const t=document.createElement('button'); t.type='button'; t.className='tick row'+(n%2); t.style.left=(100*(m-HMIN)/(HMAX-HMIN))+'%'; t.dataset.min=String(m); t.innerHTML=`<i></i><span class="lb">${n}:00</span>`; t.addEventListener('click',()=>{ minutes=m; hslider.value=minutes; requestRender(); }); htrack.appendChild(t); }
}
function markHour(){ buildTicks(); const ticks=[...htrack.querySelectorAll('.tick')]; let best=0, bd=Infinity; ticks.forEach((t,j)=>{ const d=Math.abs(+t.dataset.min-minutes); if(d<bd){ bd=d; best=j; } }); ticks.forEach((t,j)=>{ const on=j===best; t.classList.toggle('on',on); if(on) t.setAttribute('aria-current','true'); else t.removeAttribute('aria-current'); }); }
const aurBtn=document.getElementById('aurstorm'); aurBtn.addEventListener('click',()=>{ aurStorm=!aurStorm; aurBtn.setAttribute('aria-pressed',aurStorm); requestRender(); });
const expo=document.getElementById('expo'); expo.addEventListener('click',()=>{ autoExpo=!autoExpo; expo.setAttribute('aria-pressed',autoExpo); requestRender(); });
let dayPlaying=false, playRAF=0, playStamp=0; const hplay=document.getElementById('hplay');
// Play speed: 'real' runs the sky's clock at one second per second; 'default' is the pace below;
// 'fast' is five times that. Keys 1, 2 and 3.
let playSpeed='default';
const SPEED_X={default:1, fast:5};
// Clock minutes per real second at real time: a minute of the clock is dayHours × 2.5 s.
function realMinPerSec(){ return 1/(dayHours()*2.5); }
// The play speed as words and a multiple of real time, for the VR view's clock line (at the VR
// pace, a fifth of the page's), shown paused or playing.
function speedLabel(){
  if(playSpeed==='real') return 'real time';
  const x=(2.5/0.06)/5*60*24/dayHours()*SPEED_X[playSpeed];
  return (playSpeed==='fast'?'fast':'normal speed')+', '+Math.round(x).toLocaleString()+'×';
}
function setPlaySpeed(s){
  if(!(s==='real'||s==='default'||s==='fast')) return;
  playSpeed=s;
  document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed', b.dataset.speed===s?'true':'false'));
  adoptPlayRate();
  if(vrOn) requestVR();
}
document.querySelectorAll('[data-speed]').forEach(b=>b.addEventListener('click', ()=>setPlaySpeed(b.dataset.speed)));
// Play slows tenfold as the Sun goes from 85% to 99% covered and through an annular phase, so
// totality and the ring last long enough to watch; lunar eclipses slow it too.
function eclipseSlow(){
  if(!skyNow) return 1;
  // A lunar eclipse slows threefold through the partial phase and tenfold through totality.
  const lu=skyNow.lunar&&skyNow.moon.on?(skyNow.lunar.total?1:skyNow.lunar.umbral?0.75:0):0;
  if(!skyNow.sunOn) return 1-0.9*lu;
  return 1-0.9*Math.max(skyNow.central?1:0, smooth01(0.85, 0.99, 1-(skyNow.sunVis==null?1:skyNow.sunVis)), lu);
}
function adoptPlayRate(){
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
      minutes+=playSpeed==='real'?dt*realMinPerSec():dt*(2.5/0.06)/5*eclipseSlow()*24/dayHours()*SPEED_X[playSpeed];
      while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
      hslider.value=minutes; renderDay(true);
    };
    playRAF=requestAnimationFrame(frame);
  }else{
    // On the page the dome is drawn about every 60 ms, 2.5 minutes of sky each time, timed by
    // the display so slow renders do not queue up.
    playStamp=performance.now();
    const frame=now=>{
      if(!dayPlaying||vrOn) return;
      playRAF=requestAnimationFrame(frame);
      if(!domeOnScreen){ playStamp=now; return; }
      const dt=now-playStamp;
      if(playSpeed==='real'){
        // Real time: the clock moves every frame (the meteors follow it), the sky is redrawn each
        // second, as it barely changes in between.
        minutes+=Math.min(dt, 1000)/1000*realMinPerSec(); playStamp=now;
        while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
        if(now-(adoptPlayRate.drawn||0)>=1000){ adoptPlayRate.drawn=now; hslider.value=minutes; renderDay(); }
        return;
      }
      if(dt<60) return;
      playStamp=now;
      minutes+=2.5*Math.min(dt/60, 4)*eclipseSlow()*24/dayHours()*SPEED_X[playSpeed];
      while(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); }
      hslider.value=minutes; renderDay();
    };
    playRAF=requestAnimationFrame(frame);
  }
}
hplay.addEventListener('click',()=>{
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); if(vrOn) syncVRLink(true); if(vrOn&&walking()) pumpWalk(); }
  else { dayPlaying=true; if(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); adoptPlayRate(); }
  syncVRPad();
  if(vrOn) paintVR();
});
