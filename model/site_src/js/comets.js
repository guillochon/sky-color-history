// Comets: a coma round the nucleus, a broad dust tail curving behind it along its orbit, and a
// narrow blue ion tail pointing straight away from the Sun, all placed in space and seen in
// perspective from the ground.
//
// The modern-era skies (today's air, the polluted city, the ozone-hole years, 1815 and 2100)
// show real comets on their real dates, from JPL's orbital elements (Small-Body Database), for
// whatever date the page shows. The periodic ones return: Halley (1682 to 2061), Swift–Tuttle
// (1862, 1992, 2126), Pons–Brooks (1884, 1954, 2024, 2095), on the same orbit each time. The
// brightness law m = M1 + 5 log Δ + 10 log r (r and Δ in AU from the Sun and from Earth) has M1
// set so each comet's brightest moment matches the peak magnitude recorded for it (for the
// periodic ones, at the apparition listed first). Sungrazers brighten no further inside 0.02 AU.
// Each row: name, designation, q (AU), e, i, Ω, ω (degrees, J2000 ecliptic), perihelion times
// (JD), peak magnitude, and the floor on r if any.
const COMETS_REAL=[
  ['Halley’s Comet', '1P/Halley', 0.574864, 0.967936, 162.19, 59.099, 112.24, [2446469.97, 2335655.80, 2363592.60, 2391598.90, 2418781.70, 2474033.80], 2.4],
  ['Comet Swift–Tuttle', '109P/Swift–Tuttle', 0.959516, 0.9632258, 113.45, 139.38, 152.98, [2448968.50, 2401375.90, 2497757.50], 5.0],
  ['Comet Pons–Brooks', '12P/Pons–Brooks', 0.780861, 0.9545612, 74.191, 255.86, 198.99, [2460421.63, 2409201.50, 2434884.50, 2486394.50], 4.5],
  ['Comet Hale–Bopp', 'C/1995 O1', 0.890538, 0.994981, 89.288, 282.73, 130.41, [2450537.13], -0.8],
  ['Comet Hyakutake', 'C/1996 B2', 0.230224, 0.9998916, 124.92, 188.05, 130.18, [2450204.89], 0.0],
  ['Comet NEOWISE', 'C/2020 F3', 0.294651, 0.999178, 128.94, 61.01, 37.279, [2459034.18], 1.0],
  ['Comet McNaught', 'C/2006 P1', 0.170736, 1.000019, 77.837, 267.41, 155.97, [2454113.30], -5.5],
  ['Comet Ikeya–Seki', 'C/1965 S1', 0.007786, 0.999915, 141.86, 346.99, 69.049, [2439054.68], -10, 0.02],
  ['Comet West', 'C/1975 V1', 0.196595, 1.000016, 43.074, 118.92, 358.43, [2442833.72], -3],
  ['Comet Bennett', 'C/1969 Y1', 0.53762, 0.9962933, 90.04, 224.66, 354.15, [2440665.55], 0.0],
  ['Comet Tsuchinshan–ATLAS', 'C/2023 A3', 0.39143, 1.000095, 139.11, 21.559, 308.49, [2460581.24], -1.0],
  ['Comet Lemmon', 'C/2025 A6', 0.529904, 0.9955362, 143.66, 108.1, 132.97, [2460988.04], 3.0],
  ['The Great Comet of 1811', 'C/1811 F1', 1.03541, 0.995125, 106.93, 143.05, 65.41, [2382768.26], 0.0],
  ['Donati’s Comet', 'C/1858 L1', 0.578469, 0.996295, 116.95, 167.3, 129.11, [2399952.96], 0.0],
  ['The Great Comet of 1861', 'C/1861 J1', 0.822384, 0.98507, 85.442, 280.91, 330.08, [2400938.51], 0.0],
  ['The Great September Comet', 'C/1882 R1', 0.00775263, 0.999907, 142.02, 347.69, 69.609, [2408706.22], -10, 0.02],
  ['The Great January Comet', 'C/1910 A1', 0.128958, 0.9997801, 138.78, 90.029, 320.89, [2418689.09], -5],
  ['The Great March Comet', 'C/1843 D1', 0.005527, 0.999914, 144.35, 3.5272, 82.639, [2394259.41], -7, 0.02],
  ['Comet Kohoutek', 'C/1973 E1', 0.142425, 1.000008, 14.304, 258.49, 37.798, [2442044.93], -3],
  ['Comet Mrkos', 'C/1957 P1', 0.354936, 0.999338, 93.957, 68.324, 40.319, [2436051.93], 1.0],
  ['Comet Arend–Roland', 'C/1956 R1', 0.316043, 1.000248, 119.94, 215.86, 308.77, [2435936.53], 1.0],
  ['Kirch’s Great Comet', 'C/1680 V1', 0.006222, 0.999986, 60.678, 276.63, 350.61, [2335019.99], -3, 0.02],
  ['The Great Comet of 1577', 'C/1577 V1', 0.1775, 1, 104.88, 31.237, 255.67, [2297356.95], -3],
  ['Messier’s Comet', 'C/1769 P1', 0.122755, 0.999249, 40.734, 178.29, 329.12, [2367454.62], 0.0],
];
const COMET_REAL_EPOCHS=new Set(['modern', 'modernpoll', 'ozonehole', 'volcanic', 'y2100']);
// Random comets for the other epochs: long-period comets with perihelia inside COMET_QMAX AU, each
// year's drawn from a generator seeded by the epoch and the year, so a date always has the same.
// Today about one comet a year reaches naked-eye brightness (peak m ≤ 6), 0.4 a year m ≤ 3 and
// 0.15 m ≤ 0, about one every six or seven years (Green 2020's list, 1935–2020, via Sekanina
// 2023; Kidger 1994). Their absolute magnitudes follow Hughes 2001: N(<H) ∝ 10^(0.34 H) brighter
// than H = 6.5, flat fainter, here to H = 10; perihelia dN/dq ∝ 1 + √q (Francis 2005). The rate
// is set by a Monte Carlo of this code to give one naked-eye comet a year (which also gives
// about 0.15 a year brighter than 0).
// Through time (comets within 2 AU of the Sun, relative to today):
//   - Today sits in the tail of a comet shower: the star HD 7977 passed through the outer Oort
//     cloud about 2.8 Myr ago (Bailer-Jones 2022), and if it passed within 6,000–10,000 AU the
//     flux of new comets is still 2–2.5 times the long-term level (Kaib & Raymond 2026). So a
//     quiet epoch has 0.6 of today's comets: 700, 466, 300 and 66 Ma (no shower shows in the K-Pg
//     ³He record). 1.78 Ma, 0.7–1 Myr after the passage, was near the shower's peak: 4 times
//     today. 342 ka, in the same tail as today: 1.1.
//   - The giant planets' instability, almost certainly within 100 Myr of the Solar System's
//     birth (de Sousa et al. 2020; Nesvorný 2018), scattered the primordial comet disk; the flux
//     then decayed, settling by about 1 Gyr (Vokrouhlický, Nesvorný & Dones 2019). Taken as 30
//     at 4.4 Ga, 5 at 4.0 and 4 at 3.8 Ga, 1.5 at 2.7 and 1.2 at 2.2 Ga: estimates (a late
//     instability near 4 Ga would put thousands at 4.0 Ga instead).
const COMET_RATE={hadean44:30, hadean40:5, archean38:4, archean27thin:1.5, archean27:1.5, archean27vthick:1.5, proterozoic22:1.2,
  snowball07:0.6, ordovician466:0.6, carbon30:0.6, kpg66:0.6, zetaoph:4, geminga:1.1};
function cometRate(key){ return COMET_REAL_EPOCHS.has(key)?0:(COMET_RATE[key]??1); }
// Comets a year today with H ≤ 10 and q ≤ 2 AU: 3.2 gives one a year peaking at m ≤ 6 (seen at
// least 20° from the Sun) and 0.3 a year at m ≤ 3; Hughes's normalisation (0.5 a year per AU
// of q brighter than H = 6.5) gives 3.7. Comets brighter than 0 come out at a quarter of the
// observed rate: many real ones are sungrazers or pass close to Earth, which this mix lacks.
const COMET_PER_YEAR=3.2;
// An absolute magnitude: the steep bright branch carries 1/3.74 of the comets to H = 10.
function cometDrawH(U, V){ return U<1/3.74?6.5+Math.log10(V)/0.34:6.5+3.5*V; }
// A perihelion distance from dN/dq ∝ 1 + √q on [0, 2]: invert q + ⅔ q^1.5 by bisection.
function cometDrawQ(U){ const tot=COMET_QMAX+2/3*Math.pow(COMET_QMAX, 1.5), y=U*tot; let lo=0, hi=COMET_QMAX; for(let k=0;k<40;k++){ const m=(lo+hi)/2; if(m+2/3*Math.pow(m, 1.5)<y) lo=m; else hi=m; } return (lo+hi)/2; }
const COMET_K=0.01720209895, COMET_AU_KM=1.495978707e8, COMET_QMAX=2, JD_D0=2451543.5;
// Heliocentric ecliptic position (AU, ecliptic of date) of comet c at Julian date jd, perihelion tp.
function cometHelio(c, jd, tp){
  const dt=jd-tp, e=c.e, q=c.q;
  let x, y;
  if(e<0.98){
    const a=q/(1-e), M=COMET_K/Math.pow(a, 1.5)*dt;
    let E=M+e*Math.sin(M);
    for(let k=0;k<50;k++){ const f=E-e*Math.sin(E)-M, d=f/(1-e*Math.cos(E)); E-=d; if(Math.abs(d)<1e-12) break; }
    x=a*(Math.cos(E)-e); y=a*Math.sqrt(1-e*e)*Math.sin(E);
  }else{
    // Near-parabolic: Barker's equation, good near perihelion for e close to 1.
    const W=3*COMET_K/Math.sqrt(2*q*q*q)*dt, Y=Math.cbrt(W/2+Math.sqrt(W*W/4+1)), s=Y-1/Y, nu=2*Math.atan(s), r=q*(1+s*s);
    x=r*Math.cos(nu); y=r*Math.sin(nu);
  }
  const d2r=Math.PI/180, O=(c.om+1.397*(jd-2451545)/36525)*d2r, w=c.w*d2r, i=c.i*d2r;
  const cO=Math.cos(O), sO=Math.sin(O), cw=Math.cos(w), sw=Math.sin(w), ci=Math.cos(i), si=Math.sin(i);
  return [x*(cO*cw-sO*sw*ci)-y*(cO*sw+sO*cw*ci), x*(sO*cw+cO*sw*ci)-y*(sO*sw-cO*cw*ci), x*sw*si+y*cw*si];
}
// Earth's heliocentric position at day number d, from the page's solar ephemeris.
function earthHelio(d){ const s=sunEquatorial(d), l=s.lam*Math.PI/180; return [-s.au*Math.cos(l), -s.au*Math.sin(l), 0]; }
// A heliocentric point to a direction in the horizon frame, at latitude lat, with Earth at E.
function helioToHoriz(P, E, lat, lst){
  const x=P[0]-E[0], y=P[1]-E[1], z=P[2]-E[2], D=Math.hypot(x, y, z), eps=OBLIQUITY*Math.PI/180;
  const X=x, Yq=y*Math.cos(eps)-z*Math.sin(eps), Zq=y*Math.sin(eps)+z*Math.cos(eps);
  const ra=Math.atan2(Yq, X)*180/Math.PI, dec=Math.asin(Zq/D)*180/Math.PI, p=altaz(lat, dec, rev(lst-ra));
  return {dir:horizDir(p.az, p.alt), el:p.alt, az:p.az, D};
}
function cometMag(c, r, D){ return c.M1+5*Math.log10(D)+10*Math.log10(Math.max(r, c.rmin||0)); }
// M1 for each real comet from its recorded peak, at the apparition listed first.
const cometReal=COMETS_REAL.map(([name, desig, q, e, i, om, w, tps, peak, rmin])=>{
  const c={name, desig, q, e, i, om, w, tps, rmin:rmin||0, M1:0, real:true};
  let best=99;
  for(let t=-250;t<=250;t+=0.5){ const jd=tps[0]+t, d=jd-JD_D0, P=cometHelio(c, jd, tps[0]), E=earthHelio(d), r=Math.hypot(...P), D=Math.hypot(P[0]-E[0], P[1]-E[1], P[2]-E[2]); best=Math.min(best, cometMag(c, r, D)); }
  c.M1=peak-best;
  return c;
});
// Random comets of year bin b (365.25-day years of the day number) for epoch key.
const cometBins=new Map();
function cometYear(key, b){
  const id=key+'|'+b; let got=cometBins.get(id);
  if(got) return got;
  got=[];
  const R=cometRate(key);
  if(R>0){
    const rng=mulberry32(metHash('comet|'+id)), U=()=>Math.max(rng(), 1e-12);
    const lam=R*COMET_PER_YEAR;
    let n=0, p=Math.exp(-lam), s=p; const u=rng(); while(u>s&&n<400){ n++; p*=lam/n; s+=p; }
    for(let k=0;k<n;k++){
      const H=cometDrawH(U(), U()), q=Math.max(0.005, cometDrawQ(U()));
      got.push({name:'A comet', desig:'', q, e:0.999, i:Math.acos(2*U()-1)*180/Math.PI, om:360*U(), w:360*U(), tps:[JD_D0+(b+U())*365.25], M1:Math.max(H, -2), rmin:0.02, real:false, id:id+'|'+k});
    }
  }
  cometBins.set(id, got);
  if(cometBins.size>200) cometBins.clear();
  return got;
}
// An invented great comet for the ζ Oph sky, the only one not from an orbit catalogue or the random
// draw. It returns every year, as the supernova shines every year in that sky: perihelion
// (0.76 AU) on 29 June, then through July it passes 0.5–0.6 AU from Earth, due north in the late
// evening from 45° (27–33° up at 22:30), its tail rising from the horizon, while the supernova is
// low in the south-southwest, 125° or more away. Peak magnitude −3. Row: name, designation, q, e,
// i, Ω, ω, [month, day] of perihelion, peak magnitude.
const COMETS_FICT={zetaoph:[['The great comet of the ζ Oph sky (invented)', 'invented', 0.7625, 0.997, 28.88, 239.64, 34.01, [6, 29.4], -3]]};
const cometFict={};
for(const key in COMETS_FICT) cometFict[key]=COMETS_FICT[key].map(([name, desig, q, e, i, om, w, md, peak])=>{
  const c={name, desig, q, e, i, om, w, md, rmin:0, M1:0, real:true}, tp=dayNumber(2026, md[0], Math.floor(md[1]), 24*(md[1]%1))+JD_D0;
  let best=99;
  for(let t=-250;t<=250;t+=0.5){ const jd=tp+t, P=cometHelio(c, jd, tp), E=earthHelio(jd-JD_D0), r=Math.hypot(...P), D=Math.hypot(P[0]-E[0], P[1]-E[1], P[2]-E[2]); best=Math.min(best, cometMag(c, r, D)); }
  c.M1=peak-best;
  return c;
});
// The comets in the sky now, with everything both views and the tooltip need.
function cometsNow(key, lat){
  const d=astroDay(), jd=d+JD_D0, E=earthHelio(d), lst=localSidereal(), list=[];
  const cands=[];
  if(COMET_REAL_EPOCHS.has(key)){ for(const c of cometReal) for(const tp of c.tps) if(Math.abs(jd-tp)<400) cands.push([c, tp]); }
  else{ const b=Math.floor((jd-JD_D0)/365.25); for(let y=b-1;y<=b+1;y++) for(const c of cometYear(key, y)) if(Math.abs(jd-c.tps[0])<400) cands.push([c, c.tps[0]]); }
  // The invented comet, on the same dates every year of the page's calendar.
  for(const c of cometFict[key]||[]){ const Y=pageDate()[0]; for(let y=Y-1;y<=Y+1;y++){ const tp=dayNumber(y, c.md[0], Math.floor(c.md[1]), 24*(c.md[1]%1))+JD_D0; if(Math.abs(jd-tp)<400) cands.push([c, tp]); } }
  const k=extK(key);
  for(const [c, tp] of cands){
    const P=cometHelio(c, jd, tp), r=Math.hypot(...P), h=helioToHoriz(P, E, lat, lst), m=cometMag(c, r, h.D);
    if(m>7.5) continue;
    // Activity: brighter comets have bigger comae and longer tails; both grow toward the Sun.
    const act=Math.pow(10, -0.2*(c.M1-6)), rr=Math.max(r, 0.05);
    const comaKm=Math.min(5e5, 1e5*Math.sqrt(act)/Math.sqrt(rr)), Ld=Math.min(0.45, 0.075*act/rr), Li=r<2.5?Math.min(0.7, 1.6*Ld):0;
    // The dust lags behind along the orbit: the motion's direction from a day earlier.
    const P0=cometHelio(c, jd-1, tp), v=vnorm([P[0]-P0[0], P[1]-P0[1], P[2]-P0[2]]), rh=[P[0]/r, P[1]/r, P[2]/r];
    const spine=[], ion=[];
    for(let s=0;s<=6;s++){ const f=s/6, Q=[P[0]+rh[0]*Ld*f-v[0]*Ld*0.45*f*f, P[1]+rh[1]*Ld*f-v[1]*Ld*0.45*f*f, P[2]+rh[2]*Ld*f-v[2]*Ld*0.45*f*f]; spine.push(helioToHoriz(Q, E, lat, lst).dir); }
    for(const f of [0, 1]) ion.push(helioToHoriz([P[0]+rh[0]*Li*f, P[1]+rh[1]*Li*f, P[2]+rh[2]*Li*f], E, lat, lst).dir);
    const ang=(a, b)=>Math.acos(Math.max(-1, Math.min(1, vdot(a, b))));
    const lenD=ang(spine[0], spine[6]), lenI=ang(ion[0], ion[1]);
    if(h.el<-0.5&&Math.max(...spine.map(s=>s[2]), ion[1][2])<0) continue;
    list.push({c, tp, r, D:h.D, mag:m, el:h.el, az:h.az, dir:h.dir, rhoc:comaKm/(h.D*COMET_AU_KM), spine, ion, lenD, lenI,
      Ld, Li, gas:Math.min(0.7, 0.25+0.3/rr), sodium:r<0.7, k, extent:Math.max(lenD, lenI)+comaKm/(h.D*COMET_AU_KM)*6});
  }
  return list;
}
// Light (lux above the air) of each part. A comet's total magnitude is measured on its head, so
// that light goes to the coma (with the central condensation, drawn as a point like a star, a
// quarter of it); the dust tail carries twice as much and the ion tail a sixteenth, set so a great
// comet's tail shows plainly from a dark site (estimates). A long tail spreads its light thin.
function cometLux(C){ const E=Math.pow(10, -0.4*(C.mag+13.99)); return {coma:0.75*E, dust:2*E, ion:C.Li>0?0.12*E:0}; }
// The central condensation's magnitude, drawn as a point.
function cometHeadMag(C){ return C.mag+1.5; }
// Luminance (cd/m², above the air) of each part of comet C toward unit v; pw is a pixel's angle,
// the smallest the coma and tails are drawn. Writes {coma, dust, ion}.
function cometAt(C, v, pw, out){
  out.coma=out.dust=out.ion=0;
  const ch=vdot(v, C.dir); if(ch<Math.cos(C.extent+4*pw)) return out;
  const lx=C.lux||(C.lux=cometLux(C));
  // Coma: exponential in angle from the head, its light normalised over the plane, with a bright
  // central condensation a sixth its size.
  const rc=Math.max(C.rhoc, 1.5*pw), dh=Math.sqrt(Math.max(0, 2-2*ch));
  const rc2=Math.max(C.rhoc/6, pw);
  out.coma=lx.coma*(0.8*Math.exp(-dh/rc)/(2*Math.PI*rc*rc)+0.2*Math.exp(-dh/rc2)/(2*Math.PI*rc2*rc2));
  // A tail: distance to its spine, a width growing from the coma's size to a tenth of its
  // length (a thirtieth for the ion tail), brightness falling along it; normalised so its light adds to lum.
  const tail=(pts, len, lum, wEnd, fall)=>{
    if(!(lum>0)||len<1e-6) return 0;
    let best=Infinity, bs=0;
    const n=pts.length-1;
    for(let k=0;k<n;k++){
      const a=pts[k], b=pts[k+1], ab=[b[0]-a[0], b[1]-a[1], b[2]-a[2]], L2=vdot(ab, ab);
      const t=L2>0?Math.max(0, Math.min(1, ((v[0]-a[0])*ab[0]+(v[1]-a[1])*ab[1]+(v[2]-a[2])*ab[2])/L2)):0;
      const q=[a[0]+ab[0]*t-v[0], a[1]+ab[1]*t-v[1], a[2]+ab[2]*t-v[2]], dd=vdot(q, q);
      if(dd<best){ best=dd; bs=(k+t)/n; }
    }
    const w=Math.max(rc*(1-bs)+wEnd*len*bs, pw), b=Math.pow(1-bs, fall)*(bs>0?1:0.5);
    // ∫0^1 (1−s)^fall ds · len · √(2π) w̄ with w̄ the mean width.
    const norm=len/(fall+1)*Math.sqrt(2*Math.PI)*Math.max(0.5*(rc+wEnd*len), pw);
    return lum*b*Math.exp(-0.5*best/(w*w))/norm;
  };
  out.dust=tail(C.spine, C.lenD, lx.dust, 0.1, 1.4);
  out.ion=tail(C.ion, C.lenI, lx.ion, 0.03, 1.0);
  return out;
}
// Colours of the parts as linear sRGB of unit luminance, from their spectra (spectrum.js).
let COMET_LIN=null;
function cometLin(){
  if(COMET_LIN) return COMET_LIN;
  const lin=S=>{ const X=[0, 0, 0]; for(let i=0;i<SP_N;i++) for(let q=0;q<3;q++) X[q]+=S[i]*SP_CMF[i][q]; return xyzLin(X).map(c=>Math.max(0, c)/X[1]); };
  return COMET_LIN={coma:lin(cometComaSpectrum(0.5, false)), dust:lin(SP_COMET_DUST), ion:lin(SP_COMET_ION)};
}
// Add the comets to dome pixel j, mixed under the display curve as the halos are.
function domeCometPixel(px, o, j, c, tr, ta, H){
  const d=H.dir, v=H.v; v[0]=d[j*4]; v[1]=d[j*4+1]; v[2]=d[j*4+2];
  if(v[2]<-0.01) return;
  // Most pixels are far from every comet: test the cones first.
  let near=false;
  for(const C of H.list) if(v[0]*C.dir[0]+v[1]*C.dir[1]+v[2]*C.dir[2]>=(C.cosExt??(C.cosExt=Math.cos(C.extent+4*H.pw)))){ near=true; break; }
  if(!near) return;
  const L=H.L; L[0]=L[1]=L[2]=0;
  const lin=cometLin(), ext=extinction(Math.max(d[j*4+3], 0), H.k)*H.extZ;
  for(const C of H.list){
    const p=cometAt(C, v, H.pw, H.o);
    for(let q=0;q<3;q++) L[q]+=(p.coma*(lin.coma[q]*C.gas+lin.dust[q]*(1-C.gas))+p.dust*lin.dust[q]+p.ion*lin.ion[q])*ext/H.rCd;
  }
  const rH=0.2126*L[0]+0.7152*L[1]+0.0722*L[2];
  if(!(rH>0)) return;
  const g=H.rgrid, NC=H.NC, rBg=(g[c]*(1-ta)+g[c+1]*ta)*(1-tr)+(g[c+NC]*(1-ta)+g[c+NC+1]*ta)*tr;
  if(rH<rBg*0.003) return;
  const rNew=rBg+rH, tBg=toneAt(H.T, rBg), tNew=toneAt(H.T, rNew), a=tBg>0?(tNew/tBg)*(rBg/rNew):0, b=tNew/rNew;
  for(let q=0;q<3;q++) px[o+q]=linToByte(SRGB_LIN[px[o+q]]*a+L[q]*b);
}
// The walk-around view: up to COMET_GL comets as uniforms, the same model in GLSL.
const COMET_GL=3;
function cometUniforms(){
  const list=(skyNow&&skyNow.comets)||[], H=new Float32Array(COMET_GL*4), K=new Float32Array(COMET_GL*4), S=new Float32Array(COMET_GL*7*4), I=new Float32Array(COMET_GL*2*4);
  const sorted=list.slice().sort((a, b)=>a.mag-b.mag).slice(0, COMET_GL);
  sorted.forEach((C, n)=>{
    const lx=C.lux||(C.lux=cometLux(C)), r=skyNow.rCd;
    H.set([C.dir[0], C.dir[1], C.dir[2], C.rhoc], n*4);
    const a=absZenith(EP[dIdx].key)/r;
    K.set([lx.coma*a, lx.dust*a, lx.ion*a, C.gas], n*4);
    C.spine.forEach((p, k)=>S.set([p[0], p[1], p[2], k===0?C.lenD:C.extent], (n*7+k)*4));
    C.ion.forEach((p, k)=>I.set([p[0], p[1], p[2], C.lenI], (n*2+k)*4));
  });
  return {H, K, S, I, n:sorted.length};
}
const COMET_GLSL=`
uniform vec4 cometH[${COMET_GL}], cometK[${COMET_GL}], cometS[${COMET_GL*7}], cometI[${COMET_GL*2}]; uniform float cometN; uniform vec3 cometComa, cometDust, cometIon;
// One tail: the spine from pts[o] over n segments, its length, light, end width and falloff.
float cometTail(vec3 v, int o, int n, bool ion, float len, float lum, float rc, float wEnd, float fall, float pw){
  if(lum<=0.0||len<1e-6) return 0.0;
  float best=1e9, bs=0.0;
  for(int k=0;k<6;k++){
    if(k>=n) break;
    vec3 a=ion?cometI[o+k].xyz:cometS[o+k].xyz, b=ion?cometI[o+k+1].xyz:cometS[o+k+1].xyz, ab=b-a;
    float L2=dot(ab, ab), t=L2>0.0?clamp(dot(v-a, ab)/L2, 0.0, 1.0):0.0;
    vec3 q=a+ab*t-v; float dd=dot(q, q);
    if(dd<best){ best=dd; bs=(float(k)+t)/float(n); }
  }
  float w=max(rc*(1.0-bs)+wEnd*len*bs, pw), b=pow(1.0-bs, fall)*(bs>0.0?1.0:0.5);
  float norm=len/(fall+1.0)*2.5066283*max(0.5*(rc+wEnd*len), pw);
  return lum*b*exp(-0.5*best/(w*w))/norm;
}
// The comets' light over the sky reference toward v (linear colour), pw a pixel's angle.
vec3 cometsAt(vec3 v, float pw){
  vec3 L=vec3(0.0);
  for(int c=0;c<${COMET_GL};c++){
    if(float(c)>=cometN) break;
    vec4 h=cometH[c], k=cometK[c];
    float ch=dot(v, h.xyz);
    if(ch<cos(cometS[c*7+1].w+4.0*pw)) continue;
    float rc=max(h.w, 1.5*pw), rc2=max(h.w/6.0, pw), dh=sqrt(max(0.0, 2.0-2.0*ch));
    float coma=k.x*(0.8*exp(-dh/rc)/(6.2831853*rc*rc)+0.2*exp(-dh/rc2)/(6.2831853*rc2*rc2));
    float dust=cometTail(v, c*7, 6, false, cometS[c*7].w, k.y, rc, 0.1, 1.4, pw);
    float ion=cometTail(v, c*2, 1, true, cometI[c*2].w, k.z, rc, 0.03, 1.0, pw);
    L+=coma*(cometComa*k.w+cometDust*(1.0-k.w))+dust*cometDust+ion*cometIon;
  }
  return L;
}`;
// Readout: the brightest comet up, or how many are about.
function cometReadout(){
  const list=(skyNow&&skyNow.comets)||[];
  if(!list.length) return 'none bright enough to see';
  const C=list.slice().sort((a, b)=>a.mag-b.mag)[0], tail=C.lenD*180/Math.PI;
  const where=C.el>0?`${Math.round(C.el)}° up`:'below the horizon';
  return `${C.c.name}, magnitude ${C.mag.toFixed(1)} · tail ${tail<1?'<1':Math.round(tail)}° · ${where}`+(list.length>1?` · ${list.length-1} more`:'');
}
// Spectra. Dust: sunlight, a little reddened by the grains. Coma gas: the C₂ Swan bands (heads at
// 563.5, 516.5, 473.7 and 436.5 nm, shaded to the violet) that make comae green, C₃ near 405 nm,
// CN at 388 nm, weak NH₂ bands through the red, and sodium D close to the Sun. Ion tail: CO⁺ in
// its comet-tail bands (400–460 nm) that make it blue, with N₂⁺ at 391 nm and the red H₂O⁺ bands.
const SP_COMET_DUST=spNorm(spPlanck(5772).map((v, i)=>v*(1+0.25*(SP_LAM[i]-550)/230)));
function spBands(list, shade){
  const S=new Float32Array(SP_N);
  for(const [c, w, wid] of list) for(let i=0;i<SP_N;i++){ const x=SP_LAM[i]-c; if(x>2||x<-(wid||8)*4) continue; S[i]+=w*(x>0?Math.exp(-x*x/0.8):Math.exp(x/(shade?(wid||8):1.5)))/(wid||8); }
  return S;
}
const SP_SWAN=spBands([[563.5, 0.5, 6], [516.5, 1, 6], [473.7, 0.6, 5], [436.5, 0.15, 4]], true);
const SP_C3=Float32Array.from(SP_LAM, l=>0.012*Math.exp(-0.5*((l-405)/9)**2));
const SP_CN=spBands([[388.3, 0.35, 2]], true), SP_NH2=spBands([[570, 0.03, 3], [598, 0.04, 3], [630, 0.04, 3], [663, 0.035, 3], [700, 0.03, 3], [735, 0.02, 3]], true);
const SP_COMET_ION=spNorm(spAdd([1, spBands([[400.6, 0.25, 2], [425.2, 1, 2], [427.4, 0.8, 2], [455.0, 0.7, 2], [456.8, 0.6, 2], [391.4, 0.15, 1.5]], true)],
  [1, spBands([[615.4, 0.25, 2], [619.4, 0.3, 2], [634.0, 0.12, 2], [698.0, 0.18, 2]], true)]));
// The coma's gas, of unit luminance, with sodium when the comet is within about 0.7 AU of the Sun.
function cometGasSpectrum(sodium){ return spNorm(spAdd([1, SP_SWAN], [1, SP_C3], [1, SP_CN], [1, SP_NH2], [sodium?0.4:0, spLines([[589.0, 2], [589.6, 1]])])); }
// The whole coma: gas share gas of the light, the rest dust.
function cometComaSpectrum(gas, sodium){ return spAdd([gas, cometGasSpectrum(sodium)], [1-gas, SP_COMET_DUST]); }
