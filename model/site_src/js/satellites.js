// Lawler, Boley & Rein 2022, AJ 163, 21: every filed shell of Starlink, OneWeb,
// Kuiper, and StarNet/GW, 65,262 satellites. Brightness is their Lambertian sphere
// with effective area 0.8 m², plus 0.5 mag of fixed scatter and Kasten & Young
// airmass. Magnitude is V, the same scale as the star catalog. Equinox geometry
// matches the dome: local midnight puts the observer on the anti-sun axis, and a
// satellite in Earth's shadow is dark.
const SAT_SHELLS=[[7178,30,328],[7178,40,334],[7178,53,345],[2000,96.9,360],[1998,75,373],[4000,53,499],[144,148,604],[324,115.7,614],[2547,53,346],[2478,48,341],[2493,42,336],[1600,53,550],[1584,53.2,540],[720,70,570],[348,97.6,560],[172,97.6,560],[720,87.9,1200],[1764,87.9,1200],[2304,40,1200],[2304,55,1200],[480,85,590],[2000,50,600],[3600,55,508],[1728,30,1145],[1728,40,1145],[1728,50,1145],[1728,60,1145],[1156,51.9,630],[1296,42,610],[784,33,509]];
const SAT_RE=6371, SAT_GM=398600.4418, SAT_AU=149597870.7, SAT_MSUN=-26.77;
const SAT_PREF=(2/(3*Math.PI*Math.PI))*(0.8/((SAT_AU*1000)*(SAT_AU*1000)));
// Boley, Lawler & Rein 2026, arXiv:2608.02757. Midway optimistic case: the middle
// of the three filed designs (Sunrise, 51,600), the paper's conservative 800 m²
// panels at albedo 0.2, and nodes relaxed ±10° of the terminator rather than a
// single tight ring. Not the million-satellite SpaceX filing, and not panels of
// several thousand square meters.
const ODC_PREF=SAT_PREF*(160/0.8);
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15, 1|a); t=t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function gauss01(rng){ let u=0, v=0; while(u===0) u=rng(); while(v===0) v=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function ssoInc(aKm){
  const mmot=Math.sqrt(SAT_GM/(aKm*aKm*aKm));
  const c=-2*1.99096871e-7*Math.pow(aKm/6378.137,2)/(3*1.08262668e-3*mmot);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}
const SAT_N=SAT_SHELLS.reduce((n,s)=>n+s[0],0);
const SAT_A=new Float64Array(SAT_N), SAT_CI=new Float64Array(SAT_N), SAT_SI=new Float64Array(SAT_N);
const SAT_CO=new Float64Array(SAT_N), SAT_SO=new Float64Array(SAT_N), SAT_M0=new Float64Array(SAT_N);
const SAT_RATE=new Float64Array(SAT_N), SAT_DV=new Float64Array(SAT_N);
(()=>{ const rng=mulberry32(2100); let p=0;
  for(const [n,incDeg,alt] of SAT_SHELLS){
    const a=SAT_RE+alt, rate=Math.sqrt(SAT_GM/(a*a*a))*60, inc=incDeg*Math.PI/180, ci=Math.cos(inc), si=Math.sin(inc);
    for(let k=0;k<n;k++,p++){
      const node=2*Math.PI*k/n;
      SAT_A[p]=a; SAT_CI[p]=ci; SAT_SI[p]=si; SAT_CO[p]=Math.cos(node); SAT_SO[p]=Math.sin(node);
      SAT_M0[p]=rng()*2*Math.PI; SAT_RATE[p]=rate; SAT_DV[p]=gauss01(rng)*0.5;
    }
  }
})();
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
function placeSatellites(latDeg, tex, marks, up){
  const lat=latDeg*Math.PI/180, ang=minutes/1440*Math.PI*2, cl=Math.cos(lat), sl=Math.sin(lat);
  const ox=SAT_RE*cl*Math.cos(ang), oy=SAT_RE*cl*Math.sin(ang), oz=SAT_RE*sl;
  const upx=ox/SAT_RE, upy=oy/SAT_RE, upz=oz/SAT_RE;
  let ex=-upy, ey=upx; const em=Math.hypot(ex,ey)||1; ex/=em; ey/=em;
  const nx=-upz*ey, ny=upz*ex, nz=upx*ey-upy*ex, RE2=SAT_RE*SAT_RE, hit=[];
  const scan=(n, pref, scatter, A, CI, SI, CO, SO, M0, RATE, DV)=>{
    for(let i=0;i<n;i++){
      const ci=CI[i], si=SI[i], co=CO[i], so=SO[i], r=A[i];
      // The height above the observer's horizon plane goes as r(P cos u + Q sin u). An orbit
      // whose highest point stays below the plane never rises here, so skip it unplaced.
      const P=co*upx+so*upy, Q=(co*upy-so*upx)*ci+si*upz;
      if(r*r*(P*P+Q*Q)<RE2*0.999999) continue;
      const u=M0[i]+RATE[i]*minutes, cu=Math.cos(u), su=Math.sin(u);
      const x=r*(co*cu-so*su*ci), y=r*(so*cu+co*su*ci), z=r*(su*si);
      // Below the horizon plane: dark to this observer whatever else holds.
      if(x*upx+y*upy+z*upz<=SAT_RE) continue;
      if(x>=0 && y*y+z*z<=RE2) continue;
      const sx=x-ox, sy=y-oy, sz=z-oz, dist=Math.hypot(sx,sy,sz);
      const shx=sx/dist, shy=sy/dist, shz=sz/dist, sel=shx*upx+shy*upy+shz*upz;
      if(sel<=0.02) continue;
      const phi=Math.acos(Math.max(-1, Math.min(1, shx)));
      const phase=(Math.PI-phi)*Math.cos(phi)+Math.sin(phi);
      if(phase<=1e-8) continue;
      const el=Math.asin(sel)*180/Math.PI;
      const air=1/(Math.sin(el*Math.PI/180)+0.50572*Math.pow(el+6.07995,-1.6364));
      const mag=SAT_MSUN-2.5*Math.log10(pref*phase)+5*Math.log10(dist/SAT_AU)+(scatter?DV[i]:0)+0.15*(air-1);
      if(mag>6.5) continue;
      const az=Math.atan2(shx*ex+shy*ey, shx*nx+shy*ny+shz*nz)*180/Math.PI;
      hit.push({mag, az:(az%360+360)%360, el});
    }
  };
  scan(SAT_N, SAT_PREF, true, SAT_A, SAT_CI, SAT_SI, SAT_CO, SAT_SO, SAT_M0, SAT_RATE, SAT_DV);
  scan(ODC_N, ODC_PREF, false, ODC_A, ODC_CI, ODC_SI, ODC_CO, ODC_SO, ODC_M0, ODC_RATE, null);
  if(hit.length>SAT_CAP) hit.sort((a,b)=>a.mag-b.mag);
  const nDome=Math.min(hit.length, DOME_SAT_CAP), nTex=Math.min(hit.length, SAT_CAP);
  for(let k=0;k<nDome;k++){
    const s=hit[k], show=pointDisplay(s.mag), dir=horizDir(s.az, s.el);
    marks.push({az:s.az, el:s.el, px:show.px, rgb:show.rgb, mag:s.mag});
    if(k>=nTex) continue;
    const i=STAR_N+PLANET_N+k, o=i*4;
    tex[o]=dir[0]; tex[o+1]=dir[1]; tex[o+2]=dir[2]; tex[o+3]=show.px;
    const c=STAR_MAP_W*4+o; tex[c]=show.rgb[0]; tex[c+1]=show.rgb[1]; tex[c+2]=show.rgb[2]; tex[c+3]=s.mag;
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  }
}
