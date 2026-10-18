// Satellites, from Sputnik on: the skies dated 1957 and later (the modern-era skies and 2100) carry
// what was in orbit on their date, each with a simple shape after its real design that sets how
// bright it is and is drawn when the zoom resolves it.
//
// Where they are. The megaconstellations' filed shells are Lawler, Boley & Rein 2022, AJ 163, 21:
// Starlink, OneWeb, Kuiper and StarNet/Guowang, 65,262 satellites, which fill by 2040 and are the
// 2100 sky's. Before that each fills by its launches (SAT_GROUPS), and Starlink's second generation
// as it flies today, near 530 km, stands in for its filed shells until they fill. Under them, the
// satellites and spent stages of every other program, about 4,000 by today, in the orbits most
// used. Each satellite is shown once its constellation's share in orbit reaches its own random
// rank, so a constellation grows evenly over its shells. The Sun is where it is on the date: the
// clock is sundial time, so the observer's place in the orbits' frame turns with the Sun's hour
// angle (local midnight puts it on the side away from the Sun), and the Sun's declination tilts
// the Sun out of that frame's equator; the shells' nodes keep their place to the Sun. A satellite
// in Earth's shadow, a cylinder behind it, is dark. Magnitude is V, the same scale as the stars,
// dimmed by Kasten & Young airmass.
//
// The ISS flies its real orbit from its element set of 13 October 2026, with the regression of
// its node: exact for some weeks about that date and right in kind before and after, from its
// first module (November 1998) to its planned deorbiting (late 2030). Mir, 1986 to 2001, flies an
// orbit of its kind (51.6°, 390 km) at an assumed phase. The page's observer has no longitude,
// only sundial time, so a pass is the one seen at that hour somewhere on the observer's latitude.
const SAT_RE=6371, SAT_GM=398600.4418, SAT_AU=149597870.7, SAT_MSUN=-26.77;
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15, 1|a); t=t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function gauss01(rng){ let u=0, v=0; while(u===0) u=rng(); while(v===0) v=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function ssoInc(aKm){
  const mmot=Math.sqrt(SAT_GM/(aKm*aKm*aKm));
  const c=-2*1.99096871e-7*Math.pow(aKm/6378.137,2)/(3*1.08262668e-3*mmot);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}

// ---------- The shapes ----------
// Materials: [diffuse albedo, specular reflectance, the specular lobe's width (rad), whether that
// reflectance follows Fresnel's law for glass]. Estimates; no operator publishes its spacecraft's.
//   FOIL   the bus's thermal blankets and panels, gray-gold, 0.45;
//   CELLS  solar cells under cover glass on a part's +z face (dark blue, 0.06, the grid between;
//          glass reflects 4% straight on and more at a slant, in a lobe about 1° wide from the
//          panels' waviness and the Sun's disk), the part's other faces BACK, the arrays' dark
//          composite backs, 0.12;
//   BOOM   0.4;
//   OSR    optical solar reflectors, the silvered quartz tiles of a radiator: dark (0.08) but
//          mirror-like, 88%, in a lobe about 0.5° wide;
//   WHITE  white paint and blankets, the ISS's modules and radiators, 0.8;
//   FILM   the dielectric mirror film on a second-generation Starlink's underside, which sends the
//          sunlight away rather than down: 0.05 diffuse, 80% mirror in a lobe about 2° wide;
//   VISOR  a first-generation Starlink's bus under its sunshade visors ("VisorSat"), 0.12.
const FOIL=0, CELLS=1, BACK=2, BOOM=3, OSR=4, WHITE=5, FILM=6, VISOR=7;
const SAT_MATS=[[0.45, 0, 0, false], [0.06, 0.04, 0.0175, true], [0.12, 0, 0, false], [0.4, 0, 0, false], [0.08, 0.88, 0.009, false], [0.8, 0, 0, false], [0.05, 0.8, 0.035, false], [0.12, 0, 0, false]];
// A part: a box of half-sizes h (m), its center at c in the body's frame (x along the orbit, y
// across it, z up) plus o in its own frame, which is the body's ('B') or the wings' ('W', as the
// drive points them: satFrame), and its material.
const part=(fr, c, o, h, mat)=>({fr, c, o, h, mat});
const wingPair=(c, gap, half, mat=CELLS)=>[part('W', c, [gap+half[0], 0, 0], half, mat), part('W', c, [-gap-half[0], 0, 0], half, mat)];
// drive: the wings' drive axis, 'F' along the orbit, 'N' across it, or '2' (two axes, square to the Sun).
const SAT_SHAPES={
  // The orbital datacenters (2100): a flat-packed bus 7.4 by 3.2 m holding the compute; two wings
  // on a boom along the orbit, 40 by 10 m each, 800 m² in all; two radiators across the orbit, 18
  // by 8 m, optical solar reflectors, radiating from both faces (288 m² a face); after Starcloud's
  // four subsystems (arrays, radiators, compute, laser terminals), its flat-packed Starcloud-3,
  // and Google's Project Suncatcher. Its wings' drive runs along the orbit: in a dawn-dusk orbit
  // the Sun is near the orbit's pole, and the drive follows it all but its share along the orbit.
  odc:{label:'orbital datacenter', drive:'F', parts:[part('B', [0, 0, 0], [0, 0, 0], [1.6, 3.7, 0.4], FOIL), ...wingPair([0, 0, 0], 3, [20, 5, 0.04]),
    part('W', [0, 0, 0], [0, 0, 0], [3, 0.12, 0.12], BOOM), part('B', [0, 12.7, 0], [0, 0, 0], [0.03, 9, 4], OSR), part('B', [0, -12.7, 0], [0, 0, 0], [0.03, 9, 4], OSR)]},
  // Starlink's first generation (v1.0/v1.5): a flat bus 3.2 by 1.6 m and one wing 8.1 by 2.8 m.
  // Starlinks fly SpaceX's brightness mitigation (mitig): over observers in twilight or darkness
  // the wings turn on their drive to stand upright, edge-on to the ground below.
  starlink1:{label:'Starlink', drive:'N', mitig:true, parts:[part('B', [0, 0, 0], [0, 0, 0], [1.6, 0.8, 0.1], VISOR), part('W', [0, 0, 0], [0.8+0.3+4.05, 0, 0], [4.05, 1.4, 0.03], CELLS)]},
  // Its second ("v2 mini"): a bus 4.1 by 2.7 m under mirror film, two wings 12.8 by 4.1 m.
  starlink2:{label:'Starlink', drive:'N', mitig:true, parts:[part('B', [0, 0, 0], [0, 0, 0], [2.05, 1.35, 0.15], FILM), ...wingPair([0, 0, 0], 1.65, [6.4, 2.05, 0.03])]},
  // OneWeb: a box bus about 1 by 1 by 1.3 m, two wings 4.4 by 1.3 m.
  oneweb:{label:'OneWeb', drive:'N', parts:[part('B', [0, 0, 0], [0, 0, 0], [0.5, 0.5, 0.65], FOIL), ...wingPair([0, 0, 0], 0.7, [2.2, 0.65, 0.03])]},
  // Kuiper: a flat bus 3 by 1.6 m, two wings 6 by 3 m.
  kuiper:{label:'Kuiper', drive:'N', parts:[part('B', [0, 0, 0], [0, 0, 0], [1.5, 0.8, 0.15], FOIL), ...wingPair([0, 0, 0], 1.0, [3, 1.5, 0.03])]},
  // Guowang (StarNet): a bus 2 by 1.5 by 1 m, two wings 7 by 2 m.
  guowang:{label:'Guowang', drive:'N', parts:[part('B', [0, 0, 0], [0, 0, 0], [1, 0.75, 0.5], FOIL), ...wingPair([0, 0, 0], 0.95, [3.5, 1, 0.03])]},
  // Everyone else's: a box bus 1.6 m across and two wings 6 by 2 m, scaled per satellite (SAT_SCALE).
  payload:{label:'satellite', drive:'N', parts:[part('B', [0, 0, 0], [0, 0, 0], [0.8, 0.8, 0.8], FOIL), ...wingPair([0, 0, 0], 1.0, [3, 1, 0.03])]},
  // Mir: its core and modules about the node, foil-gray with age, and two pairs of wings.
  mir:{label:'Mir', drive:'2', parts:[part('B', [-2, 0, 0], [0, 0, 0], [8, 2.1, 2.1], FOIL), part('B', [6, 0, 0], [0, 0, 0], [2, 9.5, 2], FOIL),
    ...wingPair([-2, 0, 3], 2.5, [7, 2, 0.03]), ...wingPair([6, 7, 3], 2.5, [6, 1.6, 0.03])]},
};
// The ISS as it grew (issShape): its modules along the orbit, white; from late 2000 its first
// big wings on the Z1 truss; from mid-2007 the full 109 m truss across the orbit, its eight wings,
// each 35 by 11.6 m, at both ends, and its two white radiators, 23 m long, edge-on to the Sun.
// Its arrays follow the Sun on two axes, as its rotary joints and gimbals turn them.
const ISS_STAGES=[
  [1998.88, {label:'International Space Station', drive:'2', parts:[part('B', [-8, 0, -4], [0, 0, 0], [19, 2.2, 2.2], WHITE), ...wingPair([-14, 0, -4], 2.2, [7, 1.5, 0.03])]}],
  [2000.92, {label:'International Space Station', drive:'2', parts:[part('B', [-2, 0, -4], [0, 0, 0], [24, 2.2, 2.2], WHITE), part('B', [0, 0, 2], [0, 0, 0], [2.5, 6, 1.5], FOIL),
    ...wingPair([0, 0, 6], 2.2, [17.5, 5.8, 0.04])]}],
  [2007.5, {label:'International Space Station', drive:'2', parts:[part('B', [0, 0, 0], [0, 0, 0], [2.5, 54.5, 1.5], FOIL), part('B', [-2, 0, -4], [0, 0, 0], [27, 2.2, 2.2], WHITE),
    part('B', [16, 0, -4], [0, 0, 0], [2.2, 11, 2.2], WHITE), ...[42, 54, -42, -54].flatMap(y=>wingPair([0, y, 0], 2.2, [17.5, 5.8, 0.04])),
    part('W', [0, 20, 0], [0, 0, 0], [11.5, 0.05, 5.5], WHITE), part('W', [0, -20, 0], [0, 0, 0], [11.5, 0.05, 5.5], WHITE)]}]];
const ISS_END=2030.9;
function issShape(Y){ let s=null; for(const [y, sh] of ISS_STAGES) if(Y>=y) s=sh; return Y<ISS_END?s:null; }
// Each shape's reach from its center (m), for the patch it is drawn in and how soon it resolves.
for(const sh of [...Object.values(SAT_SHAPES), ...ISS_STAGES.map(s=>s[1])])
  sh.span=Math.max(...sh.parts.map(p=>Math.hypot(...p.c)+Math.hypot(...p.o)+Math.hypot(...p.h)));
// A satellite's frames from the Sun's way S, its way along the orbit F, the orbit's pole N and its
// own up U (unit vectors, in any one frame). The body points at the Earth: x along the orbit, y
// across, z up. Its wings turn on their drive and so follow the Sun but for its share along the
// drive's axis; a two-axis drive follows it wholly. A shape with brightness mitigation (mitig)
// stands its wings upright instead while the Sun is less than 15° above its own horizon, as it
// is over observers in twilight or darkness. tilt is how far they sit off that, about the drive
// (each satellite's own error, 2° on average).
function satFrames(sh, S, F, N, U, tilt){
  const drive=sh.drive;
  const dot=(a, b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], cross=(a, b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit=v=>{ const l=Math.hypot(...v)||1; return v.map(x=>x/l); };
  let X;
  if(drive==='2'){ X=cross(N, S); X=Math.hypot(...X)<1e-6?F:unit(X); }
  else X=drive==='F'?F:N;
  let Z=unit(S.map((s, i)=>s-dot(S, X)*X[i]));
  if(sh.mitig && dot(S, U)<0.26){ const k=unit(cross(X, S)); if(Math.hypot(...cross(X, S))>0.05) Z=dot(k, U)<0?k.map(v=>-v):k; }
  const w=cross(X, Z), c=Math.cos(tilt), s=Math.sin(tilt);
  Z=Z.map((z, i)=>z*c+w[i]*s);
  return {B:[F, N, U], W:[X, cross(Z, X), Z]};
}
// The Earth below, a Lambertian surface of albedo 0.3 lit by the Sun. Its light on a face turned
// straight down, per unit of sunlight, by the cosine of the Sun's angle from the satellite's up
// (SU, from -1 to 1 in 64 steps) and the cosine of the Earth's limb's angle from straight down
// (cosLimb, 0.15 to 0.65 in 8 steps, 150 km to beyond 2,000 km up): the sunlit ground the
// satellite sees, each patch by its own Sun's height, so near the terminator only the lit crescent
// toward the Sun counts. Worked out once, on the cap of directions toward the Earth.
const SAT_EARTH_E=(()=>{
  const T=new Float32Array(64*8), nt=24, np=24;
  for(let j=0;j<8;j++){
    const cl=0.15+0.5*j/7, sr=Math.sqrt(1-cl*cl), r=1/sr, rho=Math.asin(sr);
    for(let i=0;i<64;i++){
      const SU=-1+2*i/63, Sh=Math.sqrt(Math.max(0, 1-SU*SU));
      let E=0;
      for(let a=0;a<nt;a++){
        const th=(a+0.5)/nt*rho, ct=Math.cos(th), st=Math.sin(th), dth=rho/nt;
        // Down the line at th from straight down to the ground: t from the satellite (radius r, the
        // Earth's 1).
        const b=r*ct, t=b-Math.sqrt(Math.max(0, b*b-(r*r-1)));
        for(let q=0;q<np;q++){
          const ph=(q+0.5)/np*2*Math.PI, mx=st*Math.cos(ph), mz=-ct;
          // The ground point's up (r U + t m) against the Sun (SU along U, Sh along the first horizontal).
          const gx=t*mx, gz=r+t*mz, mu=(gx*Sh+gz*SU)/Math.hypot(gx, t*st*Math.sin(ph), gz);
          if(mu>0) E+=0.3/Math.PI*mu*ct*st*dth*(2*Math.PI/np);
        }
      }
      T[j*64+i]=E;
    }
  }
  return T;
})();
function satEarthE(SU, cosLimb){
  const x=Math.min(63, Math.max(0, (SU+1)/2*63)), y=Math.min(7, Math.max(0, (cosLimb-0.15)/0.5*7));
  const i=Math.min(62, Math.floor(x)), j=Math.min(6, Math.floor(y)), fx=x-i, fy=y-j, T=SAT_EARTH_E;
  return (T[j*64+i]*(1-fx)+T[j*64+i+1]*fx)*(1-fy)+(T[j*64+64+i]*(1-fx)+T[j*64+64+i+1]*fx)*fy;
}
// The Earth's radiance (per unit of sunlight) seen along m from a satellite at up U whose limb is
// at cosLimb: the ground it lands on, lit by its own Sun's height; 0 off the Earth or on its night.
function satEarthL(m, U, S, cosLimb){
  const mU=m[0]*U[0]+m[1]*U[1]+m[2]*U[2];
  if(-mU<=cosLimb) return 0;
  const r=1/Math.sqrt(1-cosLimb*cosLimb), b=-r*mU, t=b-Math.sqrt(Math.max(0, b*b-(r*r-1)));
  const g=[r*U[0]+t*m[0], r*U[1]+t*m[1], r*U[2]+t*m[2]], mu=g[0]*S[0]+g[1]*S[1]+g[2]*S[2];
  return mu>0?0.3/Math.PI*mu:0;
}
// Fresnel's reflectance of glass (n 1.5) for light at cosine c from the normal (Schlick).
function glassFresnel(c){ const k=1-Math.max(0, Math.min(1, c)); return 0.04+0.96*k*k*k*k*k; }
// The light a satellite of shape sh, scaled by scale, sends toward o (unit, from it to the
// observer), as its intensity per unit of sunlight (m²/sr): fr its frames (satFrames), S the Sun's
// way, U its up, cosLimb the cosine of the Earth's limb's angle from straight down. Each face of
// each part is Lambertian, lit by the Sun and by the Earth below, plus its mirror lobe: the Sun's
// glint, and the sunlit Earth it reflects. One part's shadow on another is left out.
function satLight(sh, scale, o, S, U, fr, cosLimb){
  const faces=sh.faces||(sh.faces=satFaces(sh)), s2=scale*scale;
  const ox=o[0], oy=o[1], oz=o[2], Sx=S[0], Sy=S[1], Sz=S[2], Ux=U[0], Uy=U[1], Uz=U[2];
  const earthE=satEarthE(Sx*Ux+Sy*Uy+Sz*Uz, cosLimb);
  let I=0;
  for(const f of faces){
    const a=fr[f.fr][f.ax], nx=a[0]*f.sg, ny=a[1]*f.sg, nz=a[2]*f.sg, no=nx*ox+ny*oy+nz*oz;
    if(no<=0) continue;
    const area=f.area*s2;
    if(area<0.05) continue;
    const nS=nx*Sx+ny*Sy+nz*Sz, sunI=nS>0?nS:0, nd=-(nx*Ux+ny*Uy+nz*Uz), down=nd>0?nd:0;
    I+=f.kd*(sunI+earthE*down)*area*no/Math.PI;
    if(!(f.ks>0)) continue;
    // The Sun's glint: the mirror's lobe about the reflected sunlight, per steradian.
    if(sunI>0){
      const c=(2*nS*nx-Sx)*ox+(2*nS*ny-Sy)*oy+(2*nS*nz-Sz)*oz;
      if(c>Math.cos(6*f.sig)){ const ang=Math.acos(Math.min(1, c)); I+=f.ks*(f.glass?glassFresnel(nS)/0.04:1)*sunI*area*Math.exp(-0.5*ang*ang/(f.sig*f.sig))/(2*Math.PI*f.sig*f.sig); }
    }
    // The Earth it mirrors, where its reflection of the line of sight lands.
    const L=satEarthL([2*no*nx-ox, 2*no*ny-oy, 2*no*nz-oz], U, S, cosLimb);
    if(L>0) I+=f.ks*(f.glass?glassFresnel(no)/0.04:1)*L*area*no;
  }
  return I;
}
// A shape's faces for satLight, worked out once: its parts' six faces each (frame, axis, sign,
// area at scale 1, material), cells on a wing's +z face and its back on the others.
function satFaces(sh){
  const out=[];
  for(const p of sh.parts) for(let ax=0;ax<3;ax++) for(let sg=-1;sg<=1;sg+=2){
    const [kd, ks, sig, glass]=SAT_MATS[p.mat===CELLS&&!(ax===2&&sg>0)?BACK:p.mat];
    out.push({fr:p.fr, ax, sg, area:4*p.h[(ax+1)%3]*p.h[(ax+2)%3], kd, ks, sig, glass});
  }
  return out;
}

// ---------- The population ----------
// Each group's satellites in orbit by year: [year, count] points, the last one this year's; after
// it the count runs on to full, its filed total (cap), by 2040, or to full where that is given (0:
// Starlink's second generation as it flies today gives way to its filed shells). Launch counts are
// approximate.
const SAT_GROUPS=[
  {key:'sl1', shape:'starlink1', cap:4424, tl:[[2019.38, 60], [2019.9, 120], [2020.5, 540], [2021, 950], [2021.5, 1650], [2022, 1900], [2022.6, 2800], [2023.5, 4000], [2026.8, 4200]]},
  {key:'sl2', shape:'starlink2', cap:30000, tl:[[2026.8, 0]]},
  {key:'slv', shape:'starlink2', cap:7518, tl:[[2026.8, 0]]},
  {key:'sl2now', shape:'starlink2', cap:6500, full:0, tl:[[2023.15, 0], [2023.5, 300], [2024, 1500], [2024.5, 2500], [2025, 3500], [2025.8, 5000], [2026.8, 6000]]},
  {key:'ow', shape:'oneweb', cap:7092, tl:[[2019.15, 6], [2020.2, 74], [2021, 110], [2021.6, 288], [2022, 428], [2023.2, 618], [2026.8, 640]]},
  {key:'gw', shape:'guowang', cap:12992, tl:[[2024.9, 0], [2025.5, 60], [2026.8, 150]]},
  {key:'ku', shape:'kuiper', cap:3236, tl:[[2025.3, 0], [2025.5, 54], [2025.9, 153], [2026.8, 400]]},
  {key:'leg', shape:'payload', cap:4000, full:4000, tl:[[1957.76, 1], [1958, 3], [1960, 30], [1965, 350], [1970, 900], [1975, 1300], [1980, 1600], [1985, 1900], [1990, 2200], [1995, 2400],
    [2000, 2600], [2005, 2750], [2010, 3000], [2015, 3300], [2020, 3700], [2026.8, 4000]]},
];
// The share of group g in orbit in year Y.
function satShare(g, Y){
  const T=g.tl;
  if(Y<T[0][0]) return 0;
  let c;
  if(Y>=T[T.length-1][0]){ const [y1, c1]=T[T.length-1]; c=c1+((g.full??g.cap)-c1)*Math.min(1, (Y-y1)/(2040-y1)); }
  else { let i=0; while(Y>T[i+1][0]) i++; const [a, ca]=T[i], [b, cb]=T[i+1]; c=ca+(cb-ca)*(Y-a)/(b-a); }
  return Math.min(1, Math.max(0, c/g.cap));
}
// The shells: [count, inclination °, altitude km, group]. Lawler, Boley & Rein's (2022) filed
// shells, then Starlink's second generation as it flies today. The other programs' satellites
// are drawn below.
const SAT_SHELLS=[[7178,30,328,'sl2'],[7178,40,334,'sl2'],[7178,53,345,'sl2'],[2000,96.9,360,'sl2'],[1998,75,373,'sl2'],[4000,53,499,'sl2'],[144,148,604,'sl2'],[324,115.7,614,'sl2'],
  [2547,53,346,'slv'],[2478,48,341,'slv'],[2493,42,336,'slv'],[1600,53,550,'sl1'],[1584,53.2,540,'sl1'],[720,70,570,'sl1'],[348,97.6,560,'sl1'],[172,97.6,560,'sl1'],
  [720,87.9,1200,'ow'],[1764,87.9,1200,'ow'],[2304,40,1200,'ow'],[2304,55,1200,'ow'],[480,85,590,'gw'],[2000,50,600,'gw'],[3600,55,508,'gw'],[1728,30,1145,'gw'],[1728,40,1145,'gw'],
  [1728,50,1145,'gw'],[1728,60,1145,'gw'],[1156,51.9,630,'ku'],[1296,42,610,'ku'],[784,33,509,'ku'],
  [2500,43,530,'sl2now'],[2500,53,525,'sl2now'],[1500,33,535,'sl2now']];
const SAT_GROUP_IX=Object.fromEntries(SAT_GROUPS.map((g, i)=>[g.key, i]));
const SAT_LEG_N=4000;
const SAT_N=SAT_SHELLS.reduce((n, s)=>n+s[0], 0)+SAT_LEG_N;
const SAT_A=new Float64Array(SAT_N), SAT_CI=new Float64Array(SAT_N), SAT_SI=new Float64Array(SAT_N);
const SAT_CO=new Float64Array(SAT_N), SAT_SO=new Float64Array(SAT_N), SAT_M0=new Float64Array(SAT_N), SAT_RATE=new Float64Array(SAT_N);
const SAT_GROUP=new Uint8Array(SAT_N), SAT_RANK=new Float32Array(SAT_N), SAT_SCALE=new Float32Array(SAT_N), SAT_TILT=new Float32Array(SAT_N);
(()=>{ const rng=mulberry32(2100), r2=mulberry32(2101); let p=0;
  const put=(a, inc, node, gi)=>{
    const i=inc*Math.PI/180;
    SAT_A[p]=a; SAT_CI[p]=Math.cos(i); SAT_SI[p]=Math.sin(i); SAT_CO[p]=Math.cos(node); SAT_SO[p]=Math.sin(node);
    SAT_M0[p]=rng()*2*Math.PI; SAT_RATE[p]=Math.sqrt(SAT_GM/(a*a*a))*60; SAT_GROUP[p]=gi;
    SAT_RANK[p]=r2(); SAT_SCALE[p]=1; SAT_TILT[p]=gauss01(r2)*2*Math.PI/180; p++;
  };
  for(const [n, inc, alt, g] of SAT_SHELLS) for(let k=0;k<n;k++) put(SAT_RE+alt, inc, 2*Math.PI*k/n, SAT_GROUP_IX[g]);
  // The other programs: Sun-synchronous imaging and weather satellites, the high-inclination
  // orbits of the Soviet and Russian programs, the 50-56° of the stations' and many others', the
  // low ones from Cape Canaveral and Jiuquan, and polar ones; 350-1,500 km, most below 1,000; their
  // sizes a log-normal spread about the shape's (a factor of 1.6).
  for(let k=0;k<SAT_LEG_N;k++){
    const q=r2(), alt=350+1150*Math.pow(r2(), 1.4), a=SAT_RE+alt;
    const inc=q<0.25?ssoInc(a)*180/Math.PI:q<0.5?65+18*r2():q<0.75?50+6*r2():q<0.9?28+8*r2():82+8*r2();
    put(a, inc, 2*Math.PI*r2(), SAT_GROUP_IX.leg);
    SAT_SCALE[p-1]=Math.exp(gauss01(r2)*0.47);
  }
})();
const SAT_GROUP_SHAPE=SAT_GROUPS.map(g=>SAT_SHAPES[g.shape]);
// The orbital datacenters (2100 only): Boley, Lawler & Rein 2026, arXiv:2608.02757, Blue Origin's
// Sunrise, 51,600 in dawn-dusk Sun-synchronous orbits from 500 to 1,800 km, with the relaxed nodal
// spread, ±10° of the terminator, rather than the tight ring. Not the million-satellite SpaceX
// filing. The paper gives each 800 m², panels, radiators and bus together, as a diffuse sphere at
// albedo 0.2, a deliberately simple reference; here each is its shape (SAT_SHAPES.odc).
const ODC_SHELLS=[];
for(let i=0;i<30;i++) ODC_SHELLS.push([740, 500+(800-500)*i/29]);
for(let i=0;i<98;i++) ODC_SHELLS.push([300, 810+(1800-810)*i/97]);
const ODC_N=ODC_SHELLS.reduce((n,s)=>n+s[0],0);
const ODC_A=new Float64Array(ODC_N), ODC_CI=new Float64Array(ODC_N), ODC_SI=new Float64Array(ODC_N);
const ODC_CO=new Float64Array(ODC_N), ODC_SO=new Float64Array(ODC_N), ODC_M0=new Float64Array(ODC_N);
const ODC_RATE=new Float64Array(ODC_N);
(()=>{ const rng=mulberry32(2608); let p=0, even=true;
  for(const [n,alt] of ODC_SHELLS){
    const a=SAT_RE+alt, rate=Math.sqrt(SAT_GM/(a*a*a))*60, inc=ssoInc(a), ci=Math.cos(inc), si=Math.sin(inc);
    let om=(even?Math.PI/2:Math.PI/2+Math.PI)+(rng()*2-1)*10*Math.PI/180;
    even=!even;
    const co=Math.cos(om), so=Math.sin(om);
    for(let k=0;k<n;k++,p++){
      ODC_A[p]=a; ODC_CI[p]=ci; ODC_SI[p]=si; ODC_CO[p]=co; ODC_SO[p]=so;
      ODC_M0[p]=rng()*2*Math.PI; ODC_RATE[p]=rate;
    }
  }
})();
// Each datacenter's pointing error (rad), 2° on average (its own random draw, so the orbits are unchanged).
const ODC_TILT=new Float64Array(ODC_N);
(()=>{ const rng=mulberry32(2609); for(let p=0;p<ODC_N;p++) ODC_TILT[p]=gauss01(rng)*2*Math.PI/180; })();
// The stations' orbits: inclination, node and argument of latitude (°) at day number d0, mean
// motion (revolutions a day). The ISS's from its element set of 2026 Oct 13 19:43 UT (CelesTrak:
// i 51.6325°, node 73.0089°, perigee 259.3258°, mean anomaly 100.6975°, 15.48855783 a day, nearly
// circular); Mir's of its kind, at an assumed phase.
const SAT_STATIONS=[
  {shape:Y=>issShape(Y), from:1998.88, to:ISS_END, inc:51.6325, node:73.0089, u:259.3258+100.6975, n:15.48855783, d0:dayNumber(2026, 1, 1, 0)+285.82178372},
  {shape:()=>SAT_SHAPES.mir, from:1986.13, to:2001.22, inc:51.6, node:0, u:0, n:15.62, d0:dayNumber(1995, 1, 1, 0)},
];
// A station's place at day number d: node and argument of latitude (rad), with the secular drift of
// both from the Earth's oblateness (J2), in the frame that turns with the Sun's right ascension.
function stationOrbit(st, d){
  const J2=1.08262668e-3, Re=6378.137, n=st.n*2*Math.PI, a=Math.cbrt(SAT_GM*Math.pow(86400/n, 2)), i=st.inc*Math.PI/180;
  const k=1.5*n*J2*(Re/a)*(Re/a), dt=d-st.d0, ci=Math.cos(i);
  const node=st.node*Math.PI/180-k*ci*dt-sunEquatorial(d).RA*Math.PI/180+Math.PI;
  const u=st.u*Math.PI/180+(n+0.5*k*(5*ci*ci-1))*dt;
  return {a, ci, si:Math.sin(i), co:Math.cos(node), so:Math.sin(node), u};
}

// ---------- Placing them ----------
// Year Y (fractional) of the sky shown, odc whether the datacenters fly.
function placeSatellites(latDeg, tex, marks, up, Y, odc){
  const lat=latDeg*Math.PI/180, ang=minutes/1440*Math.PI*2, cl=Math.cos(lat), sl=Math.sin(lat), day=astroDay();
  // The Sun's way: along -x at the equinox, tilted toward +z by its declination.
  const dec=sunEquatorial(day).Dec*Math.PI/180, Sx=-Math.cos(dec), Sz=Math.sin(dec), Sun=[Sx, 0, Sz];
  const ox=SAT_RE*cl*Math.cos(ang), oy=SAT_RE*cl*Math.sin(ang), oz=SAT_RE*sl;
  const upx=ox/SAT_RE, upy=oy/SAT_RE, upz=oz/SAT_RE;
  let ex=-upy, ey=upx; const em=Math.hypot(ex,ey)||1; ex/=em; ey/=em;
  const nx=-upz*ey, ny=upz*ex, nz=upx*ey-upy*ex, RE2=SAT_RE*SAT_RE, hit=[];
  // A vector from the frame the orbits are in to the observer's east, north, up.
  const enu=(vx, vy, vz)=>[vx*ex+vy*ey, vx*nx+vy*ny+vz*nz, vx*upx+vy*upy+vz*upz];
  // One satellite on its orbit (r, ci, si, co, so) at argument of latitude u, of shape sh scaled by
  // scale, pointing off by tilt: its magnitude and place, if lit and above the horizon.
  const one=(r, ci, si, co, so, u, sh, scale, tilt)=>{
    // The height above the observer's horizon plane goes as r(P cos u + Q sin u). An orbit whose
    // highest point stays below the plane never rises here.
    const P=co*upx+so*upy, Q=(co*upy-so*upx)*ci+si*upz;
    if(r*r*(P*P+Q*Q)<RE2*0.999999) return;
    const cu=Math.cos(u), su=Math.sin(u);
    const x=r*(co*cu-so*su*ci), y=r*(so*cu+co*su*ci), z=r*(su*si);
    if(x*upx+y*upy+z*upz<=SAT_RE) return;
    const ds=x*Sx+z*Sz;
    if(ds<0 && r*r-ds*ds<=RE2) return;
    const sx=x-ox, sy=y-oy, sz=z-oz, dist=Math.hypot(sx,sy,sz);
    const shx=sx/dist, shy=sy/dist, shz=sz/dist, sel=shx*upx+shy*upy+shz*upz;
    if(sel<=0.02) return;
    const F=[-co*su-so*cu*ci, -so*su+co*cu*ci, cu*si], U=[x/r, y/r, z/r], N=[U[1]*F[2]-U[2]*F[1], U[2]*F[0]-U[0]*F[2], U[0]*F[1]-U[1]*F[0]];
    const cosLimb=Math.sqrt(1-RE2/(r*r)), fr=satFrames(sh, Sun, F, N, U, tilt);
    const lit=satLight(sh, scale, [-shx, -shy, -shz], Sun, U, fr, cosLimb)/(dist*dist*1e6);
    if(!(lit>0)) return;
    const el=Math.asin(sel)*180/Math.PI, mag=SAT_MSUN-2.5*Math.log10(lit)+0.15*(airmass(el)-1);
    if(mag>6.5) return;
    const az=Math.atan2(shx*ex+shy*ey, shx*nx+shy*ny+shz*nz)*180/Math.PI;
    // What its drawn shape needs (drawSatellitesVR), in the observer's frame: its shape and scale,
    // distance (km), way along its orbit, the orbit's pole, the Sun's way, its up, its pointing
    // error and where the Earth's limb lies below it.
    hit.push({mag, az:(az%360+360)%360, el, sat:{sh, scale, dist, F:enu(...F), N:enu(...N), S:enu(...Sun), U:enu(...U), tilt, cosLimb}});
  };
  const share=SAT_GROUPS.map(g=>satShare(g, Y));
  for(let i=0;i<SAT_N;i++){
    const g=SAT_GROUP[i];
    if(SAT_RANK[i]>=share[g]) continue;
    one(SAT_A[i], SAT_CI[i], SAT_SI[i], SAT_CO[i], SAT_SO[i], SAT_M0[i]+SAT_RATE[i]*minutes, SAT_GROUP_SHAPE[g], SAT_SCALE[i], SAT_TILT[i]);
  }
  if(odc) for(let i=0;i<ODC_N;i++) one(ODC_A[i], ODC_CI[i], ODC_SI[i], ODC_CO[i], ODC_SO[i], ODC_M0[i]+ODC_RATE[i]*minutes, SAT_SHAPES.odc, 1, ODC_TILT[i]);
  for(const st of SAT_STATIONS){
    if(Y<st.from||Y>=st.to) continue;
    const sh=st.shape(Y), o=stationOrbit(st, day);
    if(sh) one(o.a, o.ci, o.si, o.co, o.so, o.u, sh, 1, 0);
  }
  if(hit.length>SAT_CAP) hit.sort((a,b)=>a.mag-b.mag);
  const nDome=Math.min(hit.length, DOME_SAT_CAP), nTex=Math.min(hit.length, SAT_CAP);
  for(let k=0;k<nDome;k++){
    const s=hit[k], show=pointDisplay(s.mag), dir=horizDir(s.az, s.el);
    marks.push({az:s.az, el:s.el, px:show.px, rgb:show.rgb, mag:s.mag, sat:s.sat});
    if(k>=nTex) continue;
    const i=STAR_N+k, o=i*4;
    // Its direction is written longer by its angular size, so the sky shader can fade its point as
    // the drawn shape takes over (shader_sky.js).
    const g=1+s.sat.sh.span*s.sat.scale/(s.sat.dist*1000);
    tex[o]=dir[0]*g; tex[o+1]=dir[1]*g; tex[o+2]=dir[2]*g; tex[o+3]=show.px;
    const c=STAR_MAP_W*4+o; tex[c]=show.rgb[0]; tex[c+1]=show.rgb[1]; tex[c+2]=show.rgb[2]; tex[c+3]=s.mag;
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  }
}
// The year of the sky shown, as a fraction, for the skies on our calendar (the modern-era ones,
// 1816 and 1900, and 2100); null for the deep past's.
function satYear(key){ if(yearZero(key)!==0) return null; const [Y]=pageDate(); return Y+yearFraction()[1]; }

// ---------- Drawing them close up ----------
// Each satellite the zoom resolves, drawn as the airliners are (contrails.js drawPlanesVR): its
// parts traced four times a pixel over the few pixels it covers, lit as satLight lights them (the
// Sun above the air on the faces turned to it, the Earth below, the glints and the Earth in its
// mirrors), dimmed by the air in front, behind the clouds while they are drawn and behind the land.
const SAT_PART_MAX=16;
const SATFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex, hitInfo;
uniform vec2 res;
uniform float yaw, pitch, fov, showScn, cloudOn, trans, cosLimb, nParts, reach, earthE;
uniform vec3 rel, sunL, upS, sunS;
uniform mat3 frB, frW;
uniform vec4 pC[${SAT_PART_MAX}], pO[${SAT_PART_MAX}];
uniform vec3 pH[${SAT_PART_MAX}];
out vec4 fragColor;
${OUT_GLSL}
${VIEW_RAY_GLSL}
// Ray (o, d) against the box of half-size h about the origin: distance and the face's normal, or -1.
float boxHit(vec3 o, vec3 d, vec3 h, out vec3 n){
  vec3 m=1.0/d, q=m*o, k=abs(m)*h, t1=-q-k, t2=-q+k;
  float tN=max(max(t1.x, t1.y), t1.z), tF=min(min(t2.x, t2.y), t2.z);
  n=-sign(d)*step(t1.yzx, t1.xyz)*step(t1.zxy, t1.xyz);
  return tN>tF||tF<0.0?-1.0:tN;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec3 col=vec3(0.0); float cov=0.0;
  for(int s=0;s<4;s++){
    vec2 off=vec2(float(s&1), float(s>>1))*0.5-0.25;
    vec3 d=viewRay(fc+off, res, fov, yaw, pitch);
    // From just short of it: the box tests lose their precision from hundreds of kilometers.
    vec3 o=rel+d*max(-dot(rel, d)-reach, 0.0);
    float tB=1.0e9, mat=-1.0; vec3 nB=vec3(0.0, 0.0, 1.0), nl; bool top=false; vec2 uv=vec2(0.0);
    for(int i=0;i<${SAT_PART_MAX};i++){
      if(float(i)>=nParts) break;
      mat3 F=pC[i].w<0.5?frB:frW;
      vec3 ol=(o-frB*pC[i].xyz-F*pO[i].xyz)*F, dl=d*F, n;
      float t=boxHit(ol, dl, pH[i], n);
      if(t>0.0 && t<tB){ tB=t; nB=F*n; mat=pO[i].w; top=n.z>0.5; uv=(ol+dl*t).xy; }
    }
    if(mat<0.0) continue;
    vec3 n=nB; if(dot(n, d)>0.0) n=-n;
    // Its material (SAT_MATS): diffuse color, and its mirror (reflectance, lobe width, glass).
    vec3 alb=vec3(0.5, 0.47, 0.4); float ks=0.0, sig=1.0; bool glass=false;
    if(mat>0.5&&mat<1.5){
      if(top){ vec2 g=abs(fract(uv/vec2(2.0, 2.5))-0.5); alb=mix(vec3(0.035, 0.05, 0.10), vec3(0.14), step(0.47, max(g.x, g.y))); ks=0.04; sig=0.0175; glass=true; }
      else alb=vec3(0.12);
    }
    else if(mat>1.5&&mat<2.5) alb=vec3(0.12);
    else if(mat>2.5&&mat<3.5) alb=vec3(0.4);
    else if(mat>3.5&&mat<4.5){ alb=vec3(0.08); ks=0.88; sig=0.009; }
    else if(mat>4.5&&mat<5.5) alb=vec3(0.8);
    else if(mat>5.5&&mat<6.5){ alb=vec3(0.05, 0.05, 0.06); ks=0.8; sig=0.035; }
    else if(mat>6.5) alb=vec3(0.12);
    float sunI=max(dot(n, sunS), 0.0), no=max(dot(n, -d), 0.05);
    // The Sun's light on a face is sunI of full sunlight, the Earth's on a face turned straight
    // down earthE (satEarthE); a white Lambertian face in full sunlight shows sunL.
    vec3 L=alb*sunL*(sunI+earthE*max(-dot(n, upS), 0.0)+0.01);
    if(ks>0.0){
      // The Sun's glint in the lobe about the reflected sunlight (a white Lambertian face's light is
      // sunL, so the Sun's is π sunL), and the sunlit Earth where it reflects the line of sight.
      vec3 r=reflect(-sunS, n), m=reflect(d, n);
      float a=acos(clamp(dot(r, -d), -1.0, 1.0));
      float kS=ks*(glass?(0.04+0.96*pow(1.0-sunI, 5.0))/0.04:1.0), kE=ks*(glass?(0.04+0.96*pow(1.0-no, 5.0))/0.04:1.0);
      if(sunI>0.0) L+=sunL*3.14159*kS*sunI*exp(-0.5*a*a/(sig*sig))/(6.28318*sig*sig)/no;
      // The ground it reflects, lit by its own Sun's height (satEarthL).
      float mU=dot(m, upS);
      if(-mU>cosLimb){
        float r=inversesqrt(1.0-cosLimb*cosLimb), b=-r*mU, t=b-sqrt(max(0.0, b*b-(r*r-1.0)));
        L+=sunL*kE*0.3*max(dot(r*upS+t*m, sunS), 0.0);
      }
    }
    col+=L; cov+=0.25;
  }
  if(cov<=0.0) discard;
  vec3 c=col/(cov*4.0)*trans;
  c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
  c=pow(c, vec3(1.0/2.2));
  // Behind the clouds by their opacity, only while they are drawn: hidden, their layer keeps an
  // old frame's clouds, which would cut holes in it.
  float occ=cloudOn>0.5?1.0-texture(cloudTex, fc/res).a:1.0;
  if(showScn>0.5){ vec4 h=texture(hitInfo, fc/res); if(h.g>0.5 && h.r>0.0) occ=0.0; }
  fragColor=toOutPre(vec4(c*cov*occ, cov*occ));
}`;
const SATV={job:null, prog:null, u:null, parts:new Map()};
// A shape's parts as the shader takes them, scaled: center (body frame) and frame, offset (own
// frame) and material, half-sizes.
function satPartData(sh, scale){
  const key=sh.parts.length+'|'+sh.span+'|'+scale; let P=SATV.parts.get(sh);
  if(P&&P.key===key) return P;
  const C=new Float32Array(SAT_PART_MAX*4), O=new Float32Array(SAT_PART_MAX*4), H=new Float32Array(SAT_PART_MAX*3);
  sh.parts.slice(0, SAT_PART_MAX).forEach((p, i)=>{ C.set([...p.c.map(v=>v*scale), p.fr==='W'?1:0], i*4); O.set([...p.o.map(v=>v*scale), p.mat], i*4); H.set(p.h.map(v=>v*scale), i*3); });
  P={key, C, O, H, n:Math.min(SAT_PART_MAX, sh.parts.length)}; SATV.parts.set(sh, P);
  return P;
}
function drawSatellitesVR(gl, c, ez){
  const marks=skyNow&&skyNow.starMarks;
  if(!marks) return;
  const fovR=vrFov*Math.PI/180, H=c.height, W=c.width, fy=Math.tan(fovR/2), fx=fy*W/H, pixA=2*fy/H;
  // Resolved only zoomed in: even the ISS, 110 m across from 400 km, needs a view under 8°.
  if(110/(400e3*pixA)<1.5) return;
  if(!SATV.job){
    SATV.job=glProgramAsync(gl, vrGL.vs, SATFS);
    whenLinked(gl, [SATV.job], p=>{
      if(!p) return;
      SATV.u=uniformLocs(gl, p, ['res', 'yaw', 'pitch', 'fov', 'showScn', 'cloudOn', 'trans', 'cosLimb', 'nParts', 'reach', 'earthE', 'rel', 'sunL', 'upS', 'sunS', 'frB', 'frW', 'pC[0]', 'pO[0]', 'pH[0]']);
      gl.useProgram(p); bindSamplers(gl, p, [['cloudTex', 2], ['hitInfo', 10]]); gl.useProgram(vrGL.prog);
      SATV.prog=p; requestVR();
    });
  }
  if(!SATV.prog) return;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const u=SATV.u, k=extK(EP[dIdx].key);
  let drawn=false;
  for(const m of marks){
    if(!m.sat||m.el<=0) continue;
    const S=m.sat, dist=S.dist*1000, reach=S.sh.span*S.scale, R=reach/dist/pixA+2;
    if(R<2.6) continue;
    // Where its point is drawn: refracted as the sky shader refracts it.
    const dir=horizDir(m.az, shaderApparent(m.el).a), depth=dir[0]*sy*cp+dir[1]*cy*cp+dir[2]*sp;
    if(depth<0.05) continue;
    const X=((dir[0]*cy-dir[1]*sy)/depth/fx*0.5+0.5)*W, Y=((-dir[0]*sy*sp-dir[1]*cy*sp+dir[2]*cp)/depth/fy*0.5+0.5)*H;
    if(X+R<0||X-R>W||Y+R<0||Y-R>H) continue;
    if(!drawn){
      drawn=true;
      gl.useProgram(SATV.prog); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
      gl.uniform2f(u.res, W, H); gl.uniform1f(u.yaw, yaw); gl.uniform1f(u.pitch, pitch); gl.uniform1f(u.fov, fovR);
      gl.uniform1f(u.showScn, vrScenery&&vrGL.hitInfo?1:0);
      gl.uniform1f(u.cloudOn, vrClouds&&vrGL.cloudProg&&vrGL.noise?1:0);
      // The Sun above the air, as bright on a white face as on the airliners' sunlit sides.
      const mx=Math.max(...POINT_TINT), s=POINT_TINT.map(v=>Math.pow(v/mx, 2.2)*3.2);
      gl.uniform3f(u.sunL, s[0], s[1], s[2]);
    }
    const fr=satFrames(S.sh, S.S, S.F, S.N, S.U, S.tilt), P=satPartData(S.sh, S.scale);
    gl.uniform3f(u.rel, -dir[0]*dist, -dir[1]*dist, -dir[2]*dist);
    gl.uniformMatrix3fv(u.frB, false, fr.B.flat()); gl.uniformMatrix3fv(u.frW, false, fr.W.flat());
    gl.uniform3fv(u.upS, S.U); gl.uniform3fv(u.sunS, S.S); gl.uniform1f(u.cosLimb, S.cosLimb);
    gl.uniform1f(u.earthE, satEarthE(S.S[0]*S.U[0]+S.S[1]*S.U[1]+S.S[2]*S.U[2], S.cosLimb));
    gl.uniform4fv(u.pC, P.C); gl.uniform4fv(u.pO, P.O); gl.uniform3fv(u.pH, P.H); gl.uniform1f(u.nParts, P.n); gl.uniform1f(u.reach, reach);
    gl.uniform1f(u.trans, extinction(m.el, k));
    gl.scissor(Math.floor(X-R), Math.floor(Y-R), Math.ceil(2*R)+1, Math.ceil(2*R)+1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  if(drawn){ gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND); gl.useProgram(vrGL.prog); }
}
