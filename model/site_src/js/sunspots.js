/* ---------- the Sun's face: sunspots and faculae through time ---------- */
// The photosphere is drawn from a map in heliographic coordinates, made fresh for each epoch and
// day and turned with the Sun's rotation: a 1024-texel placeholder with plain spots while the disk
// is small, and the full 4096 by 2048 (about 1,070 km a texel) once it is drawn large. The
// first-person sky projects it onto the disk in the shader (sunSurface); the dome samples it here.
//
// How much of the Sun is spotted follows its age. Young solar analogs are spotted over 1 to 10%
// of their surface, falling with age about as t^-0.4 (Morris 2020, ApJ 893, 67; Nichols-Fleming &
// Blackman 2020, MNRAS 491, 2706), and much faster once the rotation period passes about 15 days.
// Stars more active than about Rossby number 1 (younger than about 2.5 Gyr for the Sun) are
// spot-dominated: they dim when they are active. Older ones, the Sun among them, are dominated by
// bright faculae (Reinhold et al. 2019, A&A 621, A21; Shapiro et al. 2014, A&A 569, A38), because
// spot area grows faster with activity than facular area does (Nemec et al. 2022, ApJL 934, L23).
// Fast rotators carry large polar spots and spots at high latitude (Doppler images: Barnes et al.
// 2005, MNRAS 357, L1; Brown et al. 2014, IAU S302; flux tubes deflected poleward by the Coriolis
// force, Holzwarth 2007). A regular cycle sets in at about 0.2 to 0.6 Gyr (Katsova 2020).
// Rotation from gyrochronology, P ∝ t^0.5 through today's 25.4 days (the slow-rotator sequence the
// Sun most likely followed; Gallet & Bouvier 2013, A&A 556, A36).
//
// The spot model, self-contained so the same source also runs in a worker (sunWorkerGet): making
// a map takes from a fraction of a second today to a few seconds for the young Sun.
function sunspotLib(){
  const smooth01=(e0, e1, x)=>{ const t=Math.max(0, Math.min(1, (x-e0)/(e1-e0))); return t*t*(3-2*t); };
  // Per epoch: the Sun's age (Gyr), sidereal equatorial rotation (days), mean spot coverage (spots
  // and their penumbrae, fraction of the surface), the share of it in the polar caps, the latitudes
  // where groups emerge (an even spread, or a butterfly from lat0 for a cyclic Sun), the cycle
  // length (years; 0 for none) and how deep it swings, the median peak area of a group (MSH), the
  // facular area per unit spot area, and the share of groups at two active longitudes.
  const SUN_ACT={
    hadean44:      {age:0.17, prot:4.9,  cover:0.08,   cap:0.35, lat:[20, 72], cyc:0,    depth:0.25, size:900, fac:1.5, alon:0.6},
    hadean40:      {age:0.57, prot:9.0,  cover:0.04,   cap:0.20, lat:[15, 65], cyc:5,    depth:0.3,  size:500, fac:2.5, alon:0.4},
    archean38:     {age:0.77, prot:10.4, cover:0.03,   cap:0.10, lat:[10, 60], cyc:6,    depth:0.4,  size:400, fac:3,   alon:0.3},
    archean27thin: {age:1.87, prot:16.2, cover:0.01,   cap:0,    lat0:40,      cyc:8,    depth:0.7,  size:200, fac:6,   alon:0.1},
    proterozoic22: {age:2.37, prot:18.3, cover:0.005,  cap:0,    lat0:34,      cyc:9,    depth:0.85, size:120, fac:10,  alon:0},
    snowball07:    {age:3.87, prot:23.4, cover:0.0025, cap:0,    lat0:30,      cyc:10.5, depth:1,    size:75,  fac:14,  alon:0},
    ordovician466: {age:4.10, prot:24.1, cover:0.002,  cap:0,    lat0:29,      cyc:10.8, depth:1,    size:70,  fac:15,  alon:0},
    carbon30:      {age:4.27, prot:24.6, cover:0.0017, cap:0,    lat0:28,      cyc:11,   depth:1,    size:65,  fac:15,  alon:0},
    kpg66:         {age:4.50, prot:25.2, cover:0.0014, cap:0,    lat0:28,      cyc:11,   depth:1,    size:60,  fac:16,  alon:0},
    modern:        {age:4.57, prot:25.38, real:true,   cap:0,    lat0:28,                            size:60,  fac:16,  alon:0},
  };
  SUN_ACT.archean27=SUN_ACT.archean27vthick=SUN_ACT.archean27thin;
  for(const k of ['volcanic','ozonehole','modernpoll','y2100']) SUN_ACT[k]=SUN_ACT.modern;
  function sunAct(key){ return SUN_ACT[key]||SUN_ACT.modern; }

  // The solar cycle, each cycle's sunspot number (version 2) as R(t)=A·F((t−t0)/b), Hathaway,
  // Wilson & Reichmann's (1994) shape F(x)=x³/(exp(x²)−0.71), held to a peak of 1. Strong cycles
  // rise faster (the Waldmeier effect). The table is SILSO's: each cycle's starting minimum and
  // smoothed maximum, cycles 1 to 25. Before 1755 the cycles are 11 years long at an amplitude of
  // 100, with the Maunder Minimum (1645–1715) almost spotless; after cycle 25 they keep 11 years at
  // amplitudes from the date, with a grand minimum about a sixth of the time, as in the Holocene
  // record from cosmogenic isotopes (Usoskin, Solanki & Kovaltsov 2007, A&A 471, 301).
  const SOLAR_CYCLES=[[1755.2,144.1],[1766.5,193.0],[1775.5,264.3],[1784.7,235.3],[1798.3,82.0],[1810.6,81.2],[1823.3,119.2],
    [1833.9,244.9],[1843.5,219.9],[1855.9,186.2],[1867.2,234.0],[1878.9,124.4],[1890.2,146.5],[1902.0,107.1],[1913.6,175.7],
    [1923.6,130.2],[1933.8,198.6],[1944.2,218.7],[1954.3,285.0],[1964.9,156.6],[1976.5,232.9],[1986.8,212.5],[1996.4,180.3],
    [2008.9,116.4],[2019.9,160.9]];
  const HATH_C=0.71, HATH_XP=(()=>{ let best=0, xb=0; for(let x=0.01;x<4;x+=0.001){ const f=x*x*x/(Math.exp(x*x)-HATH_C); if(f>best){ best=f; xb=x; } } return xb; })();
  const HATH_FP=HATH_XP**3/(Math.exp(HATH_XP*HATH_XP)-HATH_C);
  function hathaway(x){ return x<=0?0:x*x*x/(Math.exp(x*x)-HATH_C)/HATH_FP; }
  function spotHash(...a){ let h=0x9e3779b9; for(const v of a){ h=Math.imul(h^(v|0), 0x85ebca6b); h^=h>>>13; h=Math.imul(h, 0xc2b2ae35); h^=h>>>16; } return (h>>>0)/4294967296; }
  function strHash(s){ let h=7; for(let i=0;i<s.length;i++) h=Math.imul(h, 31)+s.charCodeAt(i)|0; return h; }
  // The cycles around year t: [{t0, amp, rise}], each starting at its minimum.
  function realCycles(t){
    const out=[], first=SOLAR_CYCLES[0][0], last=SOLAR_CYCLES[SOLAR_CYCLES.length-1][0];
    const rise=A=>Math.max(3.2, 7.0-0.012*A);
    if(t>=first-12 && t<=last+24) SOLAR_CYCLES.forEach(([t0, A])=>{ if(t0<=t+1 && t0>t-24) out.push({t0, amp:A, rise:rise(A)}); });
    // Extrapolated cycles: 11 years from the table's ends.
    for(let k=-3;k<=1;k++){
      let t0, A;
      if(t<first){ const n=Math.floor((t-first)/11)+k; t0=first+11*n; if(t0>=first) continue; A=(t0>=1645&&t0<1715)?5:100; }
      else if(t>last){ const n=Math.floor((t-last)/11)+k; if(n<=0) continue; t0=last+11*n; const blk=Math.floor(n/7); A=spotHash(blk, 991)<0.17?5:90+110*spotHash(n, 17); }
      else continue;
      if(t0<=t+1 && t0>t-24) out.push({t0, amp:A, rise:rise(A)});
    }
    return out;
  }
  // Mean latitude of new groups t years into a cycle (Spörer's law; Hathaway 2011, Solar Phys. 273, 221).
  function butterflyLat(lat0, tau){ return lat0*Math.exp(-tau/7.5); }
  // Spot coverage (fraction of the surface) and the cycles feeding it, at day number d.
  function spotCoverage(key, d){
    const a=sunAct(key), yr=2000+d/365.25;
    if(a.real){
      const cyc=realCycles(yr).map(c=>({...c, w:c.amp*hathaway((yr-c.t0)/(c.rise/HATH_XP))}));
      const R=cyc.reduce((s, c)=>s+c.w, 0);
      // Total sunspot area is about 11 millionths of a hemisphere per unit of sunspot number.
      return {cover:Math.max(R, 0.5)*11e-6, cyc, lat0:a.lat0};
    }
    // Epoch cycles start at a phase of the epoch's own; an acyclic young Sun still wanders by
    // its depth over a few years.
    const ph=spotHash(strHash(key), 5);
    if(!a.cyc){
      const w=1+a.depth*(0.6*Math.sin(2*Math.PI*(yr/3.1+ph))+0.4*Math.sin(2*Math.PI*(yr/7.3+2*ph)));
      return {cover:a.cover*w, cyc:[]};
    }
    const P=a.cyc, rise=0.4*P, n=Math.floor(yr/P-ph), cyc=[];
    // The cycles' summed strength averaged over one period, so the cover is the epoch's mean.
    let mean=0; for(let i=0;i<300;i++){ const t=i/300*P; mean+=(hathaway(t/(rise/HATH_XP))+hathaway((t+P)/(rise/HATH_XP)))/300; }
    for(let k=n-2;k<=n;k++){ const t0=(k+ph)*P; cyc.push({t0, amp:1, rise, w:hathaway((yr-t0)/(rise/HATH_XP))}); }
    const s=cyc.reduce((v, c)=>v+c.w, 0)/mean;
    return {cover:a.cover*(1-a.depth+a.depth*s), cyc, lat0:a.lat0};
  }

  // Temperatures of the features against the photosphere's (K): umbral cores 3,700 to 4,600 K,
  // darker the larger the umbra (Mathew et al. 2007; Solanki 2003, A&ARv 11, 153), penumbrae
  // 250 to 650 K below the photosphere between their bright and dark filaments, pores 500 to
  // 1,200 K. Intensity in each linear sRGB channel is the Planck ratio at its effective wavelength,
  // so spots are redder as well as darker.
  const SPOT_LAM=[610, 545, 465];
  function planckRatio(lam, T, T0){ const c=1.4388e7/lam; return Math.expm1(c/T0)/Math.expm1(c/Math.max(T, 1500)); }
  function spotLUT(teff){ const L=new Float32Array(301*3); for(let i=0;i<=300;i++) for(let q=0;q<3;q++) L[i*3+q]=planckRatio(SPOT_LAM[q], teff-i*10, teff); return L; }

  // Value noise for the map, in 2D and 3D, on integer lattices.
  function h4(x, y, z, s){
    let h=Math.imul(x, 0x27d4eb2d)^Math.imul(y, 0x165667b1)^Math.imul(z, 0x9e3779b1)^Math.imul(s, 0x85ebca77);
    h=Math.imul(h^(h>>>15), 0x2c1b3c6d); h=Math.imul(h^(h>>>12), 0x297a2d39); h^=h>>>15;
    return (h>>>0)/4294967296;
  }
  function vn3(x, y, z, s){
    const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z), xf=x-xi, yf=y-yi, zf=z-zi;
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf), w=zf*zf*(3-2*zf), x1=xi+1, y1=yi+1, z1=zi+1;
    const a0=h4(xi, yi, zi, s), a1=h4(x1, yi, zi, s), b0=h4(xi, y1, zi, s), b1=h4(x1, y1, zi, s);
    const c0=h4(xi, yi, z1, s), c1=h4(x1, yi, z1, s), e0=h4(xi, y1, z1, s), e1=h4(x1, y1, z1, s);
    const a=a0+(a1-a0)*u, b=b0+(b1-b0)*u, c=c0+(c1-c0)*u, e=e0+(e1-e0)*u;
    return (a+(b-a)*v)*(1-w)+(c+(e-c)*v)*w;
  }
  function fbm3(x, y, z, s, n=3){ let f=0, a=0.5, t=0; for(let i=0;i<n;i++){ f+=a*vn3(x, y, z, s+i*101); t+=a; x*=2.03; y*=2.03; z*=2.03; a*=0.5; } return f/t; }
  // A tileable fBm tile (three octaves of value noise, 8 cells across at the first), made once and
  // read bilinearly: the plages and polar caps need noise over millions of texels.
  const NT_N=256;
  let noiseTileArr=null;
  function noiseTile(){
    if(noiseTileArr) return noiseTileArr;
    const T=new Float32Array(NT_N*NT_N);
    for(let o=0, per=8, amp=0.5;o<3;o++, per*=2, amp*=0.5){
      const c=NT_N/per;
      for(let j=0;j<NT_N;j++) for(let i=0;i<NT_N;i++){
        const x=i/c, y=j/c, xi=Math.floor(x), yi=Math.floor(y), u=x-xi, v=y-yi, su=u*u*(3-2*u), sv=v*v*(3-2*v);
        const h=(a, b)=>h4(((xi+a)%per+per)%per, ((yi+b)%per+per)%per, o, 977);
        T[j*NT_N+i]+=amp/0.875*((h(0,0)*(1-su)+h(1,0)*su)*(1-sv)+(h(0,1)*(1-su)+h(1,1)*su)*sv);
      }
    }
    return noiseTileArr=T;
  }
  // The tile at (x, y) in its first octave's cells, repeating every 8.
  function tileN(x, y){
    const T=noiseTile(), fx=x*NT_N/8, fy=y*NT_N/8, i=Math.floor(fx), j=Math.floor(fy), u=fx-i, v=fy-j, m=NT_N-1;
    const i0=i&m, i1=(i+1)&m, j0=(j&m)*NT_N, j1=((j+1)&m)*NT_N;
    return (T[j0+i0]*(1-u)+T[j0+i1]*u)*(1-v)+(T[j1+i0]*(1-u)+T[j1+i1]*u)*v;
  }
  // Two copies of the tile at 37° to each other, so thresholds don't follow the lattice.
  function tileR(x, y){ const n=0.5*(tileN(x, y)+tileN(0.8*x-0.6*y+3.3, 0.6*x+0.8*y+1.7)); return 0.5+(n-0.5)*1.5; }
  // Noise round a circle: periodic in angle th, k cells round it.
  function ringNoise(th, k, s, z=0){ const r=k/(2*Math.PI); return vn3(r*Math.cos(th)+50, r*Math.sin(th)+50, z, s); }

  // Groups' peak areas are lognormal (Baumann & Solanki 2005, A&A 443, 1061) about the epoch's
  // median, 20 times smaller to 60 times larger. A group grows in a few days and then decays
  // linearly, losing W millionths of a hemisphere a day (the Gnevyshev–Waldmeier rule), W larger
  // for the young Sun's bigger, longer-lived regions.
  const LN_Q=Array.from({length:64}, (_, i)=>{ // standard normal quantiles for the expectation below
    const p=(i+0.5)/64, t=Math.sqrt(-2*Math.log(Math.min(p, 1-p))), z=t-(2.515517+0.802853*t+0.010328*t*t)/(1+1.432788*t+0.189269*t*t+0.001308*t*t*t);
    return p<0.5?-z:z;
  });
  function groupLaw(a){
    const W=10*Math.pow(a.size/60, 0.7), lo=a.size/20, hi=a.size*60;
    const area=g=>Math.min(hi, Math.max(lo, a.size*Math.exp(1.0*g)));
    // Spot area a group holds over its life, in MSH·days, on average: half its peak times its life.
    let m=0; for(const g of LN_Q){ const A=area(g); m+=0.5*A*(A/W+1)/LN_Q.length; }
    return {W, area, perGroup:m, Tmax:hi/W+1};
  }
  function normal(r1, r2){ return Math.sqrt(-2*Math.log(Math.max(r1, 1e-9)))*Math.cos(2*Math.PI*r2); }
  // Differential rotation (deg/day) against the equator's (Snodgrass 1983, the same shear at any rate).
  function diffRot(lat){ const s=Math.sin(lat*Math.PI/180)**2; return -2.39*s-1.78*s*s; }

  // The groups alive on day D (integer day number), each a list of spots and a plage.
  function spotGroups(key, D){
    const a=sunAct(key), law=groupLaw(a), kh=strHash(key), groups=[];
    const span=Math.ceil(law.Tmax*2);
    for(let b=D-span;b<=D;b++){
      const cov=spotCoverage(key, b), S=cov.cover*(1-a.cap)*2e6, rate=S/law.perGroup;
      // Poisson count of groups born on day b.
      let n=0, p=Math.exp(-rate), u=spotHash(kh, b, 1), c=p; while(u>c && n<200){ n++; p*=rate/n; c+=p; }
      for(let k=0;k<n;k++){
        const R=i=>spotHash(kh, b, k, i);
        const A=law.area(normal(R(2), R(3))), T=A/law.W+1, age=D-b+R(4);
        if(age>2*T) continue;
        // Latitude: from the cycle feeding it (weighted by each cycle's strength then), or the band.
        let lat;
        if(cov.cyc&&cov.cyc.length&&a.lat0!==undefined){
          const tot=cov.cyc.reduce((s, q)=>s+q.w, 0)||1, yr=2000+b/365.25; let pick=R(5)*tot, q=cov.cyc[0];
          for(const z of cov.cyc){ pick-=z.w; if(pick<=0){ q=z; break; } }
          const mu=butterflyLat(cov.lat0, Math.max(0, yr-q.t0)); lat=mu+(2+0.15*mu)*normal(R(6), R(7));
        }else lat=a.lat[0]+(a.lat[1]-a.lat[0])*R(5);
        lat=Math.max(2, Math.min(80, Math.abs(lat)))*(R(8)<0.5?-1:1);
        let lon=360*R(9);
        if(R(10)<a.alon) lon=(R(11)<0.5?0:180)+40*(R(12)-0.5)+30*Math.sin(b/400); // active longitudes
        lon+=diffRot(lat)*age;
        groups.push(makeGroup(A, T, age, lat, lon, R));
      }
    }
    return groups;
  }
  // MSH to angular radius on the Sun (radians) for a round feature.
  function mshRad(A){ return Math.sqrt(2e-6*Math.max(A, 0)); }
  // A bipolar group: the leading spot ahead in the rotation and nearer the equator by Joy's law
  // (tilt about half the latitude), large and round with a full penumbra; the following polarity
  // broken into a few irregular spots, often with partial penumbrae, decaying first; pores and small
  // spots between. Separations grow with the group (about 4° for 10 MSH, 14° for 1,000).
  function makeGroup(A, T, age, lat, lon, R){
    const Tr=Math.min(4, 0.15*T), s=age<Tr?age/Tr:Math.max(0, 1-(age-Tr)/(T-Tr));
    const plage=age<T?Math.min(1, age/Tr):Math.max(0, 1-(age-T)/T);
    const sep=1.8*Math.pow(A, 0.3)*(0.4+0.6*Math.min(1, age/Tr)), tilt=(0.5*Math.abs(lat)+8*normal(R(20), R(21)))*Math.PI/180;
    const hs=lat<0?-1:1, ax=Math.cos(tilt), ay=-hs*Math.sin(tilt); // unit vector to the leader (west, toward the equator)
    const cl=Math.cos(lat*Math.PI/180), at=(dx, dy)=>[lat+dy, lon+dx/Math.max(cl, 0.05)];
    const spots=[], P=(x, y, area, kind, i)=>{ if(area>0.4) spots.push(makeSpot(...at(x, y), area, kind, i, R)); };
    if(s>0){
      // A leader bigger than the largest spots seen (about 4,000 MSH) is a cluster of them.
      const AL=0.45*A*s, nL=Math.ceil(AL/2500);
      for(let i=0;i<nL;i++){
        const r=i?mshRad(AL/nL)*57.3*1.7:0, th=2*Math.PI*(i/(nL-1||1)+R(31));
        P(ax*sep/2+r*Math.cos(th), ay*sep/2+r*Math.sin(th), AL/nL, 'lead', 30+i*9);
      }
      const nf=1+Math.floor(R(40)*(A>200?4:A>40?3:2)), fa=0.3*A*s*s;
      for(let i=0;i<nf;i++){
        const w=i===0?0.5+0.3*R(41):(0.5-0.15*R(42+i))/(nf-1||1), r=sep*0.18*Math.sqrt(R(50+i)), th=2*Math.PI*R(60+i);
        P(-ax*sep/2+r*Math.cos(th), -ay*sep/2+r*Math.sin(th), fa*w, 'follow', 70+i*3);
      }
      const np=Math.min(24, 2+Math.floor(Math.pow(A, 0.35)*s)), pa=0.25*A*Math.max(s, 0.2);
      for(let i=0;i<np;i++){
        const t=R(100+i)-0.5, off=0.22*sep*normal(R(150+i), R(200+i));
        P(ax*sep*t-ay*off, ay*sep*t+ax*off, pa/np*(0.3+1.4*R(250+i)), 'small', 300+i*3);
      }
    }
    // The plage: around both polarities and the line between, outlasting the spots.
    const fA=A*Math.max(plage, 0), pr=mshRad(fA*FAC_PER_GROUP/2)*180/Math.PI;
    return {lat, lon, spots, plage:fA>0?{a:at(ax*sep/2, ay*sep/2), b:at(-ax*sep/2, -ay*sep/2), r:Math.max(pr, sep*0.25), k:plage}:null, seed:R(13)};
  }
  let FAC_PER_GROUP=16; // set per epoch before groups are made (SUN_ACT fac)
  // A spot: outer (penumbral) radius, umbral radius and temperature, shape and penumbra.
  function makeSpot(lat, lon, area, kind, i, R){
    const rho=mshRad(area), km=rho*695700, pore=area<6;
    const q=pore?1:0.38+0.1*R(i);
    const ruKm=km*q;
    const Tcore=pore?0:3700+950*Math.exp(-ruKm/3500), nfil=Math.max(14, Math.min(110, 2*Math.PI*km/1400));
    return {lat, lon, rho, pore, q, Tcore, ruKm, dTpore:Math.min(1200, 500+120*area),
      el:kind==='lead'?1+0.15*R(i+1):1+0.6*R(i+1), ang:Math.PI*R(i+2), amp:kind==='lead'?0.07:kind==='follow'?0.16:0.12,
      // Followers often have penumbra on one side only.
      pen:kind==='follow'&&R(i+3)<0.6?{dir:2*Math.PI*R(i+4), half:0.9+1.6*R(i+5)}:null,
      bridges:!pore&&ruKm>3500&&R(i+6)<0.35?(ruKm>6500&&R(i+7)<0.4?2:1):0,
      seed:Math.floor(R(i+8)*1e6), nfil, nf8:Math.max(2, Math.round(nfil/8)), edges:null};
  }
  // The spot's boundaries round its centre, tabulated once: the penumbra's ragged outer edge and
  // the umbra's, as fractions of its radius.
  const SPOT_NTH=128;
  function spotEdges(sp){
    if(sp.edges) return sp.edges;
    const O=new Float32Array(SPOT_NTH+1), I=new Float32Array(SPOT_NTH+1), sd=sp.seed;
    for(let k=0;k<=SPOT_NTH;k++){
      const th=k/SPOT_NTH*2*Math.PI;
      if(sp.pore){ O[k]=1+sp.amp*(ringNoise(th, 5, sd)-0.5)*2; continue; }
      let o=1+sp.amp*(fbm3(Math.cos(th)*1.3+9, Math.sin(th)*1.3+9, 0, sd, 2)-0.5)*2.4;
      const i=sp.q*(1+0.1*(ringNoise(th, 6, sd+3)-0.5)*2);
      if(sp.pen){ const d=Math.abs(((th-sp.pen.dir)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI); o=Math.max(i+(o-i)*(1-smooth01(sp.pen.half*0.7, sp.pen.half, d)), i*1.06); }
      O[k]=o; I[k]=i;
    }
    return sp.edges={O, I};
  }
  // Temperature deficit (K) at local position (x west, y north; radians on the sphere) from a spot.
  // Penumbra: radial filaments of mixed width and brightness, bright grains at their inner heads
  // intruding into the umbra, dark-cored, slightly curved, ending in a comb against the granulation
  // (Solanki 2003; Borrero & Ichimoto 2011, LRSP 8, 4). Umbra: a dark nucleus, a fine sprinkling of
  // umbral dots, densest toward its edge, and granular light bridges across the larger umbrae.
  function spotDT(sp, x, y, teff){
    const c=Math.cos(sp.ang), s=Math.sin(sp.ang), u=(x*c+y*s)/sp.el, v=-x*s+y*c;
    const r=Math.sqrt(u*u+v*v)/sp.rho; if(r>1.35) return 0;
    const th=Math.atan2(v, u)+Math.PI, E=spotEdges(sp), fk=th/(2*Math.PI)*SPOT_NTH, k=Math.min(SPOT_NTH-1, Math.floor(fk)), w=fk-k;
    let o=E.O[k]*(1-w)+E.O[k+1]*w;
    if(sp.pore) return sp.dTpore*(1-smooth01(0.6*o, 1.05*o, r));
    if(r>o*1.12) return 0;
    const sx=sp.seed%89, sy=sp.seed%83, ang=th/(2*Math.PI)*8*sp.nf8;
    let inner=E.I[k]*(1-w)+E.I[k+1]*w;
    // Penumbral filaments: three scales, bent a little, their heads poking into the umbra and their
    // tails past the outer edge.
    const bend=0.25*(tileN(ang*0.25+sy, r*0.8+sx)-0.5);
    const fil=0.5*tileN(ang+bend+sx, r*0.35+sy)+0.3*tileN(ang*2.3+bend*2.3+sy, r*0.7+sx)+0.2*tileN(ang*5.1+sx, r*1.6+sy);
    const f=Math.min(1, Math.max(0, (fil-0.5)*2.2+0.5));
    inner*=1-0.12*(f-0.5);
    o*=1+0.06*(f-0.45);
    if(r>o) return 0;
    if(r>inner){
      const t=(r-inner)/(o-inner), head=1-smooth01(0, 0.28, t);
      // Bright filaments about 150 K below the photosphere, dark ones 650 K; the heads of the bright
      // ones (penumbral grains) nearly photospheric. Dark cores run along the brightest.
      let dT=650-500*f-120*head*smooth01(0.5, 0.8, f);
      const core=0.5+0.5*Math.cos((ang*2.3+bend*2.3)*Math.PI*2); if(f>0.7) dT+=180*smooth01(0.85, 1, core)*(1-head);
      dT=dT*(1-0.35*smooth01(0.8, 1, t));
      return Math.max(40, dT);
    }
    // Umbra.
    const tu=r/inner, Tedge=Math.min(sp.Tcore+650, teff-1000), ur=u/sp.rho/sp.q, vr=v/sp.rho/sp.q;
    let T=sp.Tcore+(Tedge-sp.Tcore)*tu*tu*(0.8+0.4*tileN(ur*1.1+sy, vr*1.1+sx));
    const kd=Math.max(2, sp.ruKm/2400), ud=tileR(ur*kd+sx, vr*kd+sy);
    T+=500*Math.max(0, ud-0.62)/0.38*(0.35+0.65*tu);
    for(let k2=0;k2<sp.bridges;k2++){
      const a=Math.PI*spotHash(sp.seed, k2, 1), off=(spotHash(sp.seed, k2, 2)-0.5)*0.7*inner, w2=(0.06+0.05*spotHash(sp.seed, k2, 3))*inner;
      const along=u/sp.rho*Math.cos(a)+v/sp.rho*Math.sin(a), d=Math.abs(-u/sp.rho*Math.sin(a)+v/sp.rho*Math.cos(a)-off-0.12*inner*Math.sin(along/inner*3+k2));
      if(d<w2*1.3){
        const g=tileR(along/inner*kd*1.6+k2*3.1, d/w2+sx), wd=w2*(0.75+0.5*g);
        T=Math.max(T, teff-(800-450*g)-600*smooth01(0.35*wd, wd, d));
      }
    }
    return teff-T;
  }

  // A spot's placeholder: its umbra at the core's temperature and a uniform penumbra.
  function spotDTPlain(sp, x, y, teff){
    const c=Math.cos(sp.ang), s=Math.sin(sp.ang), u=(x*c+y*s)/sp.el, v=-x*s+y*c, r=Math.sqrt(u*u+v*v)/sp.rho;
    if(sp.pore) return r<0.85?sp.dTpore:0;
    return r<sp.q?teff-sp.Tcore-150:r<1?380:0;
  }
  // The map for an epoch and day, with its mip levels (each halving the last) for the dome.
  // W texels round the equator: 4096 (about 1,070 km each) for the full map. Narrower maps are
  // placeholders for a small disk: the same spots and plages, but each spot a plain umbra in a
  // plain penumbra, with no filaments, dots or bridges to compute.
  function buildSunMap(key, D, teff, W=4096){
    const a=sunAct(key), lut=spotLUT(teff);
    FAC_PER_GROUP=a.fac;
    const H=W/2, px=new Uint8Array(W*H*4), sc=W/4096, detail=W>=4096;
    const capRows=Math.max(1, Math.round(2*sc)), plSt=Math.max(1, Math.round(3*sc));
    new Uint32Array(px.buffer).fill(0x00ffffff);
    const groups=spotGroups(key, D), d2r=Math.PI/180;
    const rowLat=j=>-90+(j+0.5)*180/H, colLon=i=>(i+0.5)*360/W;
    // Each texel within ext degrees of (lat, lon) in turn, with its local offsets in radians. With
    // st>1, every st-th row and about every st-th texel's width along the row (wider toward the
    // poles), fn filling the block (st rows by stc columns).
    const SINL=new Float64Array(W), COSL=new Float64Array(W);
    for(let i=0;i<W;i++){ SINL[i]=Math.sin(colLon(i)*d2r); COSL[i]=Math.cos(colLon(i)*d2r); }
    const visit=(lat, lon, ext, fn, st=1)=>{
      const j0=Math.max(0, Math.floor((lat-ext+90)/180*H)), j1=Math.min(H-1, Math.ceil((lat+ext+90)/180*H));
      const sc=Math.sin(lat*d2r), cc=Math.cos(lat*d2r), sL=Math.sin(lon*d2r), cL=Math.cos(lon*d2r);
      for(let j=j0;j<=j1;j+=st){
        const la=rowLat(j)*d2r, cl=Math.cos(la), sl=Math.sin(la), hw=Math.min(180, ext/Math.max(cl, 1e-3));
        const stc=Math.max(st, Math.min(64, Math.round(st/Math.max(cl, 0.02))));
        const i0=Math.floor((lon-hw)/360*W), i1=Math.ceil((lon+hw)/360*W);
        for(let ii=i0;ii<=i1;ii+=stc){
          const i=((ii%W)+W)%W, sd=SINL[i]*cL-COSL[i]*sL, cd=COSL[i]*cL+SINL[i]*sL;
          fn((j*W+i)*4, cl*sd, sl*cc-cl*sc*cd, j, ii, stc);
        }
      }
    };
    const setDT=(o, dT, cover)=>{ // dT averaged as intensity; cover = share of the texel spotted
      for(let q=0;q<3;q++) px[o+q]=Math.min(px[o+q], Math.round(255*dT[q]));
      px[o+3]=Math.round(px[o+3]*(1-cover));
    };
    // Polar caps: cool, porous, ragged-edged caps poleward of about 70°, with arms reaching lower,
    // turning at the polar rate and slowly changing shape.
    if(a.cap>0){
      const cov=spotCoverage(key, D).cover, Acap=a.cap*cov*2e6/2, lb=Math.asin(Math.max(0.3, 1-Acap/0.7e6))*180/Math.PI;
      for(const hs of [1, -1]){
        const j0=hs>0?Math.floor((lb-14+90)/180*H):0, j1=hs>0?H-1:Math.ceil((-lb+14+90)/180*H);
        for(let j=j0;j<=j1;j+=capRows){
          const la=rowLat(j), cl=Math.cos(la*d2r), stride=Math.max(capRows, Math.min(64, Math.floor(1.2*sc/Math.max(cl, 1e-3))));
          for(let i=0;i<W;i+=stride){
            const lo=colLon(i)*d2r+diffRot(80)*D*d2r, x=cl*Math.cos(lo), y=cl*Math.sin(lo), z=hs*Math.sin(la*d2r);
            const sh=D/90+hs*3.3, edge=lb+6*(tileN(x*2+sh, y*2+hs)-0.5)*2-12*smooth01(0.62, 0.8, tileN(x*1.2+1.7, y*1.2+sh*0.5));
            const h=hs*la-edge; if(h<-2) continue;
            const por=tileR(x*14+sh*0.3, y*14+2.1), dT=h<0?380*(1+h/2):h<1.5?400+(1000*h/1.5)*por:500+900*smooth01(0.35, 0.6, por);
            const k=Math.min(300, Math.round(dT/10)), I=[lut[k*3], lut[k*3+1], lut[k*3+2]];
            for(let b=0;b<capRows&&j+b<H;b++) for(let s=0;s<stride&&i+s<W;s++) setDT(((j+b)*W+i+s)*4, I, 1);
          }
        }
      }
    }
    // Plages, with a mottled filling (store: alpha, the facular filling factor).
    for(const g of groups){
      if(!g.plage) continue;
      const {a:pa, b:pb, r, k}=g.plage, mid=[(pa[0]+pb[0])/2, (pa[1]+pb[1])/2], ext=r*1.9+Math.hypot(pa[0]-pb[0], (pa[1]-pb[1])*Math.cos(mid[0]*d2r))/2;
      const sc=Math.sin(mid[0]*d2r), cc=Math.cos(mid[0]*d2r);
      const loc=p=>{ const dl=((p[1]-mid[1])%360+540)%360-180; return [Math.cos(p[0]*d2r)*Math.sin(dl*d2r), Math.sin(p[0]*d2r)*cc-Math.cos(p[0]*d2r)*sc*Math.cos(dl*d2r)]; };
      const A=loc(pa), B=loc(pb), rr=r*d2r, sd=Math.floor(g.seed*1e5);
      visit(mid[0], mid[1], ext, (o, x, y, j, ii, stc)=>{
        // Distance to the segment between the polarities.
        const vx=B[0]-A[0], vy=B[1]-A[1], L2=vx*vx+vy*vy||1e-12, t=Math.max(0, Math.min(1, ((x-A[0])*vx+(y-A[1])*vy)/L2));
        const ex=x-A[0]-t*vx, ey=y-A[1]-t*vy, d=Math.sqrt(ex*ex+ey*ey)/rr;
        if(d>1.9) return;
        const n=tileR(x/rr*3+sd%61, y/rr*3+sd%53), f=k*(1-smooth01(0.5, 1.4+0.5*n, d))*smooth01(0.38, 0.62, n+0.15*(1-d));
        if(f<=0) return;
        const v=Math.round(255*Math.min(1, f));
        for(let b=0;b<plSt&&j+b<H;b++) for(let c=0;c<stc;c++){ const q=((j+b)*W+((ii+c)%W+W)%W)*4+3; if(px[q]<v) px[q]=v; }
      }, plSt);
    }
    // Spots, supersampled 2×2 where they are, darkest wins where they overlap; each clears faculae
    // from itself and its moat (the ring of outflow round a mature spot, free of magnetic elements).
    const tex=360/W*d2r, I=[0, 0, 0], J=[0, 0, 0];
    const SUB=[[-0.33, -0.17], [0.33, 0.17], [-0.17, 0.33], [0.17, -0.33]];
    for(const g of groups) for(const sp of g.spots){
      const ext=sp.rho*(sp.pore?1.4:1.7)*sp.el/d2r, cs=Math.cos(sp.ang), sn=Math.sin(sp.ang);
      visit(sp.lat, sp.lon, ext, (o, x, y, j, ii, stc)=>{
        const pu=(x*cs+y*sn)/sp.el, pv=-x*sn+y*cs, r=Math.sqrt(pu*pu+pv*pv)/sp.rho, rm=Math.sqrt(x*x+y*y)/(sp.rho*sp.el);
        let cov=sp.pore?0:1-smooth01(1.25, 1.7, rm);
        if(r<1.45){
          const wx=tex*Math.max(Math.cos(rowLat(j)*d2r), 1e-3)*stc;
          // Two samples, and two more where they disagree (edges, filaments).
          let n=0, c=0, last=-1, spread=0;
          I[0]=I[1]=I[2]=0;
          for(let k=0;k<4;k++){
            if(k===2&&spread<60) break;
            const dT=(detail?spotDT:spotDTPlain)(sp, x+SUB[k][0]*wx, y+SUB[k][1]*tex, teff), q=Math.min(300, Math.round(dT/10))*3;
            I[0]+=lut[q]; I[1]+=lut[q+1]; I[2]+=lut[q+2]; if(dT>0) c++; n++;
            if(last>=0) spread=Math.abs(dT-last); last=dT;
          }
          J[0]=I[0]/n; J[1]=I[1]/n; J[2]=I[2]/n; cov=Math.max(cov, c/n);
          for(let k=0;k<stc;k++) setDT((j*W+(((ii+k)%W)+W)%W)*4, J, cov);
        }else if(cov>0) for(let k=0;k<stc;k++){ const q=(j*W+(((ii+k)%W)+W)%W)*4+3; px[q]=Math.round(px[q]*(1-cov)); }
      });
    }
    const levels=[{w:W, h:H, px}];
    for(let n=1;levels[n-1].w>16;n++){
      const s=levels[n-1], w=s.w>>1, h=s.h>>1, p=new Uint8Array(w*h*4);
      for(let j=0;j<h;j++) for(let i=0;i<w;i++) for(let q=0;q<4;q++){
        const a=((2*j)*s.w+2*i)*4+q, b=a+s.w*4;
        p[(j*w+i)*4+q]=(s.px[a]+s.px[a+4]+s.px[b]+s.px[b+4]+2)>>2;
      }
      levels.push({w, h, px:p});
    }
    return {key, D, W, H, px, levels};
  }
  return {sunAct, spotCoverage, spotGroups, buildSunMap, planckRatio};
}
const SS=sunspotLib();
// The maps for the epoch and day shown, made in a worker: first the placeholder (SUN_LO texels
// round), then the full map (SUN_HI) once a disk more than SUN_HI_PX pixels in radius asks for it.
// sunMap(rad) returns the best one ready for a disk of rad pixels, or the epoch's previous day's
// placeholder meanwhile, or null; each new map redraws the page.
const SUN_LO=1024, SUN_HI=4096, SUN_HI_PX=150;
let sunMaps={lo:null, hi:null}, sunQueue=[], sunBusy=false, sunGenN=0, sunWorker;
function sunMapDay(){ return Math.floor(astroDay()); }
function sunMap(rad=0){
  const ep=EP[dIdx], key=ep.key, D=sunMapDay(), at=m=>m&&m.key===key&&m.D===D;
  const lo=sunMaps.lo, hi=sunMaps.hi, wantHi=rad>SUN_HI_PX;
  if(!at(lo)) requestSunMap(key, D, ep.teff||5772, SUN_LO);
  if(wantHi&&!at(hi)) requestSunMap(key, D, ep.teff||5772, SUN_HI);
  if(wantHi&&at(hi)) return hi;
  if(at(lo)) return lo;
  return lo&&lo.key===key?lo:null;
}
function requestSunMap(key, D, teff, W){
  if(sunQueue.some(q=>q.key===key&&q.D===D&&q.W===W)) return;
  // Requests for another epoch or day are stale.
  sunQueue=sunQueue.filter(q=>q.key===key&&q.D===D&&!q.sent);
  sunQueue.push({key, D, teff, W}); sunQueue.sort((a, b)=>a.W-b.W);
  pumpSunJobs();
}
function sunWorkerGet(){
  if(sunWorker!==undefined) return sunWorker;
  try{
    const src=`const sunspotLib=${sunspotLib.toString()};const SS=sunspotLib();`+
      'onmessage=e=>{const w=e.data, m=SS.buildSunMap(w.key, w.D, w.teff, w.W); postMessage(m, m.levels.map(l=>l.px.buffer));};';
    sunWorker=new Worker(URL.createObjectURL(new Blob([src], {type:'text/javascript'})));
  }catch(e){ sunWorker=null; }
  return sunWorker;
}
function pumpSunJobs(){
  if(sunBusy||!sunQueue.length) return;
  const w=sunQueue[0]; w.sent=true; sunBusy=true;
  const done=m=>{
    sunBusy=false; sunQueue=sunQueue.filter(q=>q!==w);
    m={...m, gen:++sunGenN};
    if(m.W>=SUN_HI) sunMaps.hi=m;
    else{ sunMaps.lo=m; if(sunMaps.hi&&(sunMaps.hi.key!==m.key||sunMaps.hi.D!==m.D)) sunMaps.hi=null; }
    pumpSunJobs();
    renderDay(); if(vrOn) paintVR();
    if(m.W>=SUN_HI){ if(vrOn) refreshVRTip(); else refreshDomeTip(); }
  };
  const wk=sunWorkerGet();
  if(wk){
    wk.onmessage=e=>done(e.data);
    wk.onerror=()=>{ sunWorker=null; done(SS.buildSunMap(w.key, w.D, w.teff, w.W)); };
    wk.postMessage({key:w.key, D:w.D, teff:w.teff, W:w.W});
  }else setTimeout(()=>done(SS.buildSunMap(w.key, w.D, w.teff, w.W)), 0);
}
// Orientation at day number d: the position angle P of the Sun's north pole from celestial north
// (toward east) and B0, the latitude of the disk's centre (Meeus, Astronomical Algorithms ch. 29;
// the solar equator tilted 7.25° to the ecliptic), and the rotation phase in turns. The map's
// longitudes turn with the equator's synodic rate.
function sunOrientation(key, d){
  const s=sunEquatorial(d), JD=d+2451543.5, K=73.6667+1.3958333*(JD-2396758)/36525, lam=s.lam;
  const x=Math.atan(-cosd(lam)*Math.tan(OBLIQUITY*Math.PI/180)), y=Math.atan(-cosd(lam-K)*Math.tan(7.25*Math.PI/180));
  const B0=Math.asin(sind(lam-K)*Math.sin(7.25*Math.PI/180)), a=SS.sunAct(key), syn=360/a.prot-0.9856;
  const turns=d*syn/360;
  return {P:x+y, B0, phase:turns-Math.floor(turns)};
}
// Facular contrast at mu, as a multiple of its peak (near mu 1/4, about a fifth of that at mu 0.7,
// nothing at the limb; white-light faculae are seen only toward the limb), and the peak contrast in linear R, G, B for a fully filled texel: brighter in the blue
// (Yeo, Solanki & Krivova 2013, A&A 550, A95; Norris et al. 2023, MNRAS).
const FAC_PEAK=[0.10, 0.13, 0.18];
// The disk is drawn as a white-light photograph is shown, the photosphere's intensity mapped to
// the display linearly rather than through its gamma: the map holds each feature's true intensity
// ratio, and the drawing scales the disk's (gamma-coded) value by it, so an umbra at 13% of the
// photosphere reads as near-black and a penumbra at 80% as mid-gray, as in observatory images
// (multiplying linear light instead would show them a pale gray on a near-white disk).
const SPOT_GAMMA=2.2;
function facMu(mu){ const w=1-mu; return 9.48*mu*w*w*w; }
// The map at disk position (u east, v north, in disk radii), bilinear at mip level n: the raw
// intensity ratios in R, G, B (I), the facular filling (a), and mu there.
function sunMapSample(m, o, u, v, n){
  const cP=Math.cos(o.P), sP=Math.sin(o.P), cB=Math.cos(o.B0), sB=Math.sin(o.B0);
  const X=u*cP-v*sP, Y=u*sP+v*cP, Z=Math.sqrt(Math.max(0, 1-X*X-Y*Y));
  const lat=Math.asin(Math.max(-1, Math.min(1, Y*cB+Z*sB))), cmd=Math.atan2(-X, Z*cB-Y*sB);
  let tu=cmd/(2*Math.PI)-o.phase; tu-=Math.floor(tu);
  const L=m.levels[Math.min(n, m.levels.length-1)], x=tu*L.w-0.5, y=(lat/Math.PI+0.5)*L.h-0.5, i0=Math.floor(x), j0=Math.max(0, Math.min(L.h-2, Math.floor(y))), fx=x-i0, fy=Math.max(0, Math.min(1, y-j0));
  const i1=((i0+1)%L.w+L.w)%L.w, ia=((i0%L.w)+L.w)%L.w, mu=Z, c=facMu(mu);
  const g=q=>{ const a=L.px[(j0*L.w+ia)*4+q]*(1-fx)+L.px[(j0*L.w+i1)*4+q]*fx, b=L.px[((j0+1)*L.w+ia)*4+q]*(1-fx)+L.px[((j0+1)*L.w+i1)*4+q]*fx; return (a*(1-fy)+b*fy)/255; };
  return {I:[g(0), g(1), g(2)], a:g(3), mu};
}
// Light at disk position (u, v) as multipliers of linear R, G, B (out), sampled at mip level n.
function sunSurfaceAt(m, o, u, v, n, out){
  const s=sunMapSample(m, o, u, v, n), c=facMu(s.mu);
  for(let q=0;q<3;q++) out[q]=Math.pow(s.I[q], SPOT_GAMMA)+s.a*c*FAC_PEAK[q];
  return out;
}
// What the spectrum tooltip sees at disk position (u, v), from the most detailed map ready: the
// temperature there (the map's green ratio taken back through Planck's law), the photosphere's,
// the facular filling and mu, and what it is; or null without a map.
function sunFeatureAt(u, v){
  const ep=EP[dIdx], D=sunMapDay(), m=[sunMaps.hi, sunMaps.lo].find(x=>x&&x.key===ep.key&&x.D===D);
  // Pointing at the Sun asks for the full map, if it isn't made yet; the tooltip is redrawn
  // when it arrives.
  if(m!==sunMaps.hi) sunMap(Infinity);
  if(!m||u*u+v*v>=1) return null;
  const s=sunMapSample(m, sunOrientation(m.key, astroDay()), u, v, 0), teff=ep.teff||5772;
  let lo=1500, hi=teff;
  if(s.I[1]>=0.995) lo=teff;
  else for(let i=0;i<40;i++){ const T=(lo+hi)/2; if(SS.planckRatio(545, T, teff)<s.I[1]) lo=T; else hi=T; }
  const T=lo, dT=teff-T, fac=s.a*facMu(s.mu)*FAC_PEAK[1];
  const kind=dT>1000?'umbra':dT>120?'penumbra':fac>0.01?'facula':'photosphere';
  return {T, teff, a:s.a, mu:s.mu, I:s.I[1], fac, kind};
}
// The feature's light over the photosphere's at wavelength lam (nm): the Planck ratio, the
// faculae's contrast (through the three channels' values, held above 3% in the red), and in umbrae
// cooler than about 4,400 K the red bands of TiO's γ system (heads near 665, 705 and 759 nm,
// shading to the red), as umbral spectra show them. Their depths are estimates, up to 15% at 3,700 K.
const TIO_HEADS=[665.1, 705.4, 758.9];
function tioDepth(T){ return 0.15*smooth01(4400, 3700, T); }
function sunFeatureRatio(f, lam){
  const fk=lam<=545?FAC_PEAK[2]+(FAC_PEAK[1]-FAC_PEAK[2])*(lam-465)/80:FAC_PEAK[1]+(FAC_PEAK[0]-FAC_PEAK[1])*(lam-545)/65;
  let r=SS.planckRatio(lam, f.T, f.teff)+f.a*facMu(f.mu)*Math.max(0.03, fk);
  const D=tioDepth(f.T);
  if(D>0) for(const h of TIO_HEADS) if(lam>=h&&lam<h+12) r*=1-D*(1-(lam-h)/12);
  return r;
}
// Canvas angle of celestial north at the dome's Sun, drawn at (sx, sy) for azimuth az, elevation el.
function domeSunAngle(sx, sy, az, el){
  const {cx, cy, R}=domeView(), b=moonBasis({az, el}), step=vnorm(vadd(b.md, vscale(b.north, 0.02), [0, 0, 0]));
  const el2=Math.asin(Math.max(-1, Math.min(1, step[2])))*180/Math.PI, az2=Math.atan2(step[0], step[1]), rr2=R*(90-el2)/90;
  return Math.atan2(cx+rr2*Math.sin(az2)-sx, -(cy-rr2*Math.cos(az2)-sy));
}
// Where canvas pixel (x, y) falls on the dome's Sun, in its radii along east and north.
function domeSunXY(x, y){
  const {cx, cy, R, z}=domeView(), rad=DOME_DISK*z*skyNow.moon.sunRadDeg/SUN_RADIUS_DEG, rr=R*skyNow.sza/90, a=skyNow.sunAz*Math.PI/180;
  const sx=cx+rr*Math.sin(a), sy=cy-rr*Math.cos(a), ang=domeSunAngle(sx, sy, skyNow.sunAz, 90-skyNow.sza), qx=x-sx, qy=y-sy;
  return [(qx*Math.cos(ang)+qy*Math.sin(ang))/rad, (qx*Math.sin(ang)-qy*Math.cos(ang))/rad];
}
// The dome's Sun: the drawn disk at (sx, sy), radius rad pixels, at azimuth az and elevation el,
// multiplied by the photosphere's features, oriented as the Moon is (drawMoonOnDome). Pixels
// inside the Moon (moonC: x, y, radius) or outside the dome are left alone.
function drawSunSurfaceOnDome(sx, sy, rad, az, el, moonC){
  if(rad<4) return;
  const m=sunMap(rad); if(!m) return;
  const o=sunOrientation(m.key, astroDay());
  const {cx, cy, R}=domeView(), W=dome.width, H=dome.height;
  const x0=Math.max(0, Math.floor(sx-rad-1)), y0=Math.max(0, Math.floor(sy-rad-1)), x1=Math.min(W-1, Math.ceil(sx+rad+1)), y1=Math.min(H-1, Math.ceil(sy+rad+1));
  if(x1<x0||y1<y0) return;
  const ang=domeSunAngle(sx, sy, az, el);
  const n=Math.max(0, Math.min(8, Math.round(Math.log2(m.W/(2*Math.PI)/rad)))), ca=Math.cos(ang), sa=Math.sin(ang);
  const bw=x1-x0+1, bh=y1-y0+1, img=dctx.getImageData(x0, y0, bw, bh), px=img.data, f=[1, 1, 1];
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy>R*R) continue;
    if(moonC&&(x-moonC[0])**2+(y-moonC[1])**2<moonC[2]*moonC[2]) continue;
    const qx=x-sx, qy=y-sy, lx=qx*ca+qy*sa, ly=-qx*sa+qy*ca, u=lx/rad, v=-ly/rad;
    if(u*u+v*v>=0.995) continue;
    sunSurfaceAt(m, o, u, v, n, f);
    const k=((y-y0)*bw+(x-x0))*4;
    for(let q=0;q<3;q++) px[k+q]=linToByte(SRGB_LIN[px[k+q]]*f[q]);
  }
  dctx.putImageData(img, x0, y0);
}
// The walk-around view's copy of the map for a disk of rad pixels, sent when it changes; the map,
// or null.
function syncSunTex(rad){
  if(!vrGL||!vrGL.sunTex) return null;
  const m=sunMap(rad); if(!m) return null;
  if(vrGL.sunGen===m.gen) return m;
  const gl=vrGL.gl; gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, vrGL.sunTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, m.W, m.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, m.px);
  gl.generateMipmap(gl.TEXTURE_2D); gl.activeTexture(gl.TEXTURE0);
  vrGL.sunGen=m.gen;
  return m;
}
