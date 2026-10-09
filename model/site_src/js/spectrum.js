/* ---------- The spectrum under the pointer ---------- */
// A direction's light is the sum of its sources, each with the luminance the sky drawing already
// gives it (cd/m²) and a spectrum of its own, from 380 to 780 nm in 1 nm steps:
//   - Sunlight and moonlight scattered by the air: the model's own spectra (spectra.py, its
//     native 10 nm), read from spectra.bin at the nearest stored Sun heights and directions.
//   - The Sun's and Moon's disks: the model's direct sunlight, the Moon's a little redder (its
//     reflectance rises by about half from 400 to 750 nm).
//   - The natural night sky: zodiacal light and faint stars (sunlight), and airglow: the
//     557.7 nm and 630/636 nm oxygen lines, the sodium D lines and the OH bands, with the O2
//     Herzberg bands and a blue-green continuum set so the total has the colour the sky drawing
//     uses (xy 0.294, 0.324). Without oxygen, the O2 Herzberg II band from split CO2 instead.
//   - City light: high-pressure sodium (broadened, self-absorbed D lines) and white LEDs
//     (a 452 nm chip under a broad phosphor), mixed to each epoch's glow colour, or 1815's oil
//     flames (1850 K).
//   - The Milky Way: old starlight, as a 4800 K body.
//   - The aurora: its four emissions at that point, as aurora.js lists their lines.
//   - In totality, the corona and the chromosphere (corona.js): the electrons' light, sunlight
//     without the Fraunhofer lines; the dust's, with them; the coronal iron and calcium lines;
//     and the chromosphere's hydrogen, helium and calcium lines.
//   - A cloud in front (VR): the light falling on it, over the sky it lets through (cloudLight).
// Narrow features the 10 nm model does not resolve are drawn on top: the Sun's Fraunhofer lines
// on everything that is sunlight, and the O2 A and B bands and the 720 nm water band of the air
// along the way, scaled by each epoch's O2 and water. Too narrow to move the colour; drawn so
// the plot shows them.
const SP_L0=380, SP_N=401;
const SP_LAM=Float32Array.from({length:SP_N}, (_, i)=>SP_L0+i);
function spG(x, mu, s1, s2){ const s=x<mu?s1:s2; return Math.exp(-0.5*((x-mu)/s)**2); }
// CIE 1931 (the Wyman, Sloan & Shirley 2013 fit, as skymodel.py).
const SP_CMF=Array.from(SP_LAM, l=>[1.056*spG(l,599.8,37.9,31.0)+0.362*spG(l,442.0,16.0,26.7)-0.065*spG(l,501.1,20.4,26.2),
  0.821*spG(l,568.8,46.9,40.5)+0.286*spG(l,530.9,16.3,31.1), 1.217*spG(l,437.0,11.8,36.0)+0.681*spG(l,459.0,26.0,13.8)]);
function spY(S){ let y=0; for(let i=0;i<SP_N;i++) y+=S[i]*SP_CMF[i][1]; return y; }
function spXYZ(S){ let X=0, Y=0, Z=0; for(let i=0;i<SP_N;i++){ X+=S[i]*SP_CMF[i][0]; Y+=S[i]*SP_CMF[i][1]; Z+=S[i]*SP_CMF[i][2]; } return [X, Y, Z]; }
function spNorm(S){ const y=spY(S); return y>0?S.map(v=>v/y):S; }
const spGauss=(c, s)=>Float32Array.from(SP_LAM, l=>Math.exp(-0.5*((l-c)/s)**2));
// Lines [nm, photons] as 0.6 nm Gaussians, in energy.
function spLines(list){ const S=new Float32Array(SP_N); for(const [c, r] of list){ const g=spGauss(c, 0.6); for(let i=0;i<SP_N;i++) S[i]+=r/c*g[i]/1.504; } return S; }
function spAdd(...parts){ const S=new Float32Array(SP_N); for(const [k, P] of parts) for(let i=0;i<SP_N;i++) S[i]+=k*P[i]; return S; }
function spPlanck(T){ return Float32Array.from(SP_LAM, l=>1/Math.pow(l, 5)/(Math.exp(1.4388e7/(l*T))-1)); }
const SP_FRAUN=[[393.37, 0.6, 0.8, 'Ca II K'], [396.85, 0.55, 0.8, 'Ca II H'], [410.17, 0.25, 0.5, 'Hδ'], [430.8, 0.3, 0.6, 'G band'], [434.05, 0.25, 0.5, 'Hγ'],
  [486.13, 0.3, 0.5, 'Hβ'], [517.3, 0.25, 1.0, 'Mg b'], [527.0, 0.15, 0.5, 'Fe'], [589.3, 0.35, 0.6, 'Na D'], [656.28, 0.35, 0.5, 'Hα']];
const SP_FRAUN_T=Float32Array.from(SP_LAM, l=>SP_FRAUN.reduce((t, [c, d, s])=>t*(1-d*Math.exp(-0.5*((l-c)/s)**2)), 1));
// Telluric optical depth per airmass at full strength: O2 A (R-branch head at 759.6 nm, P branch
// to 770), O2 B (686.9–694), H2O (718–735).
const SP_TAU_O2=Float32Array.from(SP_LAM, l=>(l>=759&&l<=770?2.0*(l<762?1:0.25+0.75*(770-l)/8):0)+(l>=686.5&&l<=694?0.55*(l<689?1:(694-l)/5):0));
const SP_TAU_H2O=Float32Array.from(SP_LAM, l=>0.25*Math.exp(-0.5*((l-725)/5)**2));
// O2 relative to today's 21%, and the water column relative to today's.
const SP_O2={hadean44:0, hadean40:0, archean38:0, archean27thin:0, archean27:0, archean27vthick:0, proterozoic22:0.01, snowball07:0.1, ordovician466:0.81, carbon30:1.57};
const SP_H2O={hadean44:4, snowball07:0.2};
// The night's sources, each to unit luminance.
const SP_SUN5772=spNorm(spPlanck(5772));
const SP_AIRGLOW=spNorm(spAdd([1, spLines([[557.7, 250], [589.0, 40], [589.6, 25], [630.0, 50], [636.4, 16]])],
  [1, Float32Array.from(SP_LAM, l=>[[632, 80], [655, 150], [700, 300], [735, 350], [775, 300]].reduce((s, [c, r])=>s+r/c*Math.exp(-0.5*((l-c)/7)**2)/(7*2.5066), 0))],
  [1, Float32Array.from(SP_LAM, l=>l<=490?5.8/l*Math.exp(-0.5*((l-420)/30)**2):0)],
  [1, Float32Array.from(SP_LAM, l=>4.03/l*Math.exp(-0.5*((l-510)/55)**2))]));
const SP_HERZ=spNorm(Float32Array.from(SP_LAM, l=>Math.exp(-0.5*((l-450)/45)**2)/l));
const SP_HPS=spNorm(spAdd([1, Float32Array.from(SP_LAM, l=>(0.9*Math.exp(-0.5*((l-583)/5)**2)/5+Math.exp(-0.5*((l-596)/6)**2)/6+1.6*Math.exp(-0.5*((l-589)/22)**2)/22)/l)],
  [0.4, spLines([[568.8, 0.06], [615.4, 0.05], [498.3, 0.02], [466.5, 0.015]])]));
const SP_LED=spNorm(Float32Array.from(SP_LAM, l=>(0.13*Math.exp(-0.5*((l-452)/10)**2)/10+Math.exp(-0.5*((l-575)/50)**2)/50)/l));
const SP_OIL=spNorm(spPlanck(1850)), SP_MW=spNorm(spPlanck(4800));
// The chromosphere's flash spectrum, by energy: Balmer lines, helium D3, and calcium H and K.
const SP_CHROMO=spNorm(spLines([[656.3, 1], [486.1, 0.25], [434.0, 0.1], [587.6, 0.15], [393.4, 0.3], [396.8, 0.25]].map(([l, e])=>[l, e*l])));
// Aurora emissions per kR, with their photopic luminance (aurora.js).
const SP_AUR=[[[557.7, 1]], [[630.0, 0.76], [636.4, 0.24]], [[391.4, 3.0], [427.8, 1.0], [470.9, 0.28], [423.6, 0.25], [380.5, 0.4], [399.8, 0.2], [405.9, 0.1]],
  [[687.5, .15], [678.9, .22], [670.5, .25], [662.4, .2], [654.5, .12], [646.9, .06], [595, .08], [606, .06]]].map(spLines).map(spNorm);
const SP_AUR_Y=[1.927e-4, 4.271e-5, 9.359e-6, 2.335e-5];
// Each lamp mix by luminance share of sodium, matching the glow's x (day.js SKYGLOW), found once per epoch.
const SP_GLOW={};
function spGlow(key){
  const g=SKYGLOW[key]; if(!g) return null;
  if(key==='volcanic') return SP_OIL;
  if(SP_GLOW[key]) return SP_GLOW[key];
  const xOf=S=>{ const [X, Y, Z]=spXYZ(S); return X/(X+Y+Z); };
  let lo=0, hi=1;
  for(let k=0;k<30;k++){ const w=(lo+hi)/2; if(xOf(spAdd([w, SP_HPS], [1-w, SP_LED]))<g[1]) lo=w; else hi=w; }
  return SP_GLOW[key]=spAdd([lo, SP_HPS], [1-lo, SP_LED]);
}
// The Moon's reflectance, relative, rising by about half from 400 to 750 nm.
const SP_MOON_RED=Array.from(SP_LAM, l=>0.8+0.0014*(l-450));
// The Sun's strongest lines, and the air's O2 and water bands along X airmasses as o2 and h2o.
const SP_SUN_MARKS=[{l:393.4, t:'Ca II H&K'}, {l:486.1, t:'Hβ'}, {l:517.3, t:'Mg b'}, {l:656.3, t:'Hα'}];
function spAirMarks(marks, o2, h2o){
  if(o2>0.05) marks.push({l:760.5, t:'O₂ A'}, {l:687.5, t:'O₂ B'});
  if(SP_TAU_H2O[345]*h2o>0.15) marks.push({l:725, t:'H₂O'});
}
// Whether the epoch's air has the ozone of the Chappuis band.
function spOzone(key){ return (!(key in SP_O2)||SP_O2[key]>=0.01)&&key!=='proterozoic22'; }
// The model's sky spectra, loaded the first time they are wanted.
let spData=null, spLoading=null;
function spLoad(){
  if(spData||spLoading) return spLoading;
  spLoading=fetch('spectra.bin').then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(buf=>{
    const n=new DataView(buf).getUint32(0, true), head=JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
    spData={...head, bytes:new Uint8Array(buf, 4+n), nl:head.lam.length, slots:head.vz.length*head.az.length+1};
    // Redraw whichever tooltip is waiting on them, without waiting for the pointer to move.
    refreshDomeTip(); refreshGlobeTip(); refreshVRTip(); refreshBarTip(); refreshNoonTip();
  }).catch(()=>{ spLoading=null; });
  return spLoading;
}
// The stored epoch for key: 2100 and the supernova epochs have today's air.
function spEpoch(key){ return spData.epochs.indexOf(spData.epochs.includes(key)?key:'modern'); }
// log10 shape at (sza index si, slot), 10 nm grid.
function spRaw(e, lat, si, slot){
  const D=spData;
  return spDecode(((((e*D.lats.length+lat)*D.szas.length+si)*D.slots)+slot)*D.nl);
}
// The stored shape at byte offset o.
function spDecode(o){
  const D=spData, out=new Float32Array(D.nl);
  for(let i=0;i<D.nl;i++) out[i]=D.lo*(1-D.bytes[o+i]/255);
  return out;
}
// The scattered-light spectrum for Sun zenith angle sza, view zenith angle vz and azimuth from
// the Sun azr, interpolated in log between the stored samples, on the 1 nm grid, unit luminance.
function spSky(key, lat, sza, vz, azr){
  const D=spData, e=spEpoch(key), li=D.lats.indexOf(lat);
  const [si, st]=bracket(D.szas, sza), [vi, vt]=bracket(D.vz, vz), [ai, at]=bracket(D.az, azr), na=D.az.length;
  const acc=new Float32Array(D.nl);
  for(const [s, ws] of [[si, 1-st], [si+1, st]]) for(const [v, wv] of [[vi, 1-vt], [vi+1, vt]]) for(const [a, wa] of [[ai, 1-at], [ai+1, at]]){
    const w=ws*wv*wa; if(!(w>0)) continue;
    const r=spRaw(e, li, s, v*na+a); for(let i=0;i<D.nl;i++) acc[i]+=w*r[i];
  }
  return spNorm(spTo1nm(acc));
}
function spSunDisk(key, lat, sza){
  const D=spData, e=spEpoch(key), li=D.lats.indexOf(lat), i=Math.max(0, D.szas.findIndex(z=>z>=Math.min(sza, 89)));
  return spTo1nm(spRaw(e, li, i, D.slots-1));
}
// 10 nm log grid to the 1 nm linear grid.
function spTo1nm(lg){
  const D=spData, out=new Float32Array(SP_N);
  for(let i=0;i<SP_N;i++){ const x=(SP_LAM[i]-D.lam[0])/(D.lam[1]-D.lam[0]), k=Math.min(D.nl-2, Math.floor(x)), f=x-k; out[i]=Math.pow(10, lg[k]*(1-f)+lg[k+1]*f); }
  return out;
}
function spAirmass(el){ return airmass(Math.max(el, 0)); }
// A cloud is a near-grey scatterer, so its light is the light that falls on it. The cloud pass
// adds its lights in display-linear light, each drawn as the display shows its source. Its
// spectrum is the mix of the lights that can reach it (the sky's light, direct sunlight while it
// can reach a cloud, moonlight, and the city's light from below) whose colour matches the drawn
// one, by non-negative least squares on linear RGB. Each light's share of the pixel (premultiplied,
// display-encoded, with a soft shoulder over 0.6) is then taken to cd/m² against its own source:
// the city's against the city light the pass is given (six times the clear-sky glow, cityUplight),
// the rest against the skylight (0.45 of the zenith, 0.55 of the sky 36° up opposite the Sun, as
// drawn and in cd/m²). Linear, where taking the pixel back through the display curve would not
// be: the curve is nearly flat through twilight.
function spRGB(S){
  const [X, Y, Z]=spXYZ(S);
  return M.map(r=>(r[0]*X+r[1]*Y+r[2]*Z)/Y);
}
// Least squares for the columns cols of A (3 rows) against u, or null if singular.
function spLSQ(A, cols, u){
  const m=cols.length, G=cols.map(i=>cols.map(j=>A[i][0]*A[j][0]+A[i][1]*A[j][1]+A[i][2]*A[j][2]).concat([A[i][0]*u[0]+A[i][1]*u[1]+A[i][2]*u[2]]));
  for(let c=0;c<m;c++){
    let piv=c; for(let r=c+1;r<m;r++) if(Math.abs(G[r][c])>Math.abs(G[piv][c])) piv=r;
    if(Math.abs(G[piv][c])<1e-12) return null;
    [G[c], G[piv]]=[G[piv], G[c]];
    for(let r=0;r<m;r++) if(r!==c){ const f=G[r][c]/G[c][c]; for(let k=c;k<=m;k++) G[r][k]-=f*G[c][k]; }
  }
  return G.map((row, c)=>row[m]/row[c]);
}
function cloudLight(px, key, lat){
  const a=px.a;
  if(!(a>0.02)) return null;
  const un=v=>{ let c=Math.pow(Math.max(v/a, 0), 2.2); if(c>0.6) c=0.6-0.4*Math.log(Math.max(1e-4, 1-(c-0.6)/0.4)); return c; };
  const rgb=px.rgb.map(un), t=0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2];
  if(!(t>0)) return null;
  const k=skyNow.toneK, p=skyNow.toneP, sza=skyNow.sza, mo=skyNow.moon, antiAz=(skyNow.sunAz+180)%360;
  const rZ=skyRAt(skyNow.rgrid, 90, 0), rM=skyRAt(skyNow.rgrid, 36, antiAz);
  const tRef=0.45*toneT(rZ, k, p, 0.95)+0.55*toneT(rM, k, p, 0.95);
  if(!(tRef>0)) return null;
  const zen=skySpectrum(90, 0), mid=skySpectrum(36, antiAz), perSky=(0.45*zen.Y+0.55*mid.Y)/tRef;
  const cu=skyNow.cityUp, tCity=cu?0.2126*cu[0]+0.7152*cu[1]+0.0722*cu[2]:0, perCity=tCity>0&&SKYGLOW[key]?6*SKYGLOW[key][0]/tCity:perSky;
  const lights=[['cloud, lit by the sky', spNorm(spAdd([0.45, zen.S], [0.55, mid.S])), 'post']];
  // Direct sunlight reaches a cloud a few km up until the Sun is about 3° down.
  if(skyNow.sunVis>0&&sza<93) lights.push(['cloud, sunlit', spNorm(spSunDisk(key, lat, Math.min(sza, 89))), true]);
  if(sza>=90&&mo.el>0&&skyNow.mScale>0) lights.push(['cloud, moonlit', spNorm(spSunDisk(key, lat, 90-mo.el).map((v, i)=>v*SP_MOON_RED[i])), true]);
  if(sza>=90&&SKYGLOW[key]) lights.push([key==='volcanic'?'cloud, lit by oil lamps':'cloud, lit by the city', spGlow(key), false, true]);
  if(!lights.length) return null;
  const A=lights.map(l=>spRGB(l[1])), u=rgb.map(v=>v/t), n=lights.length;
  let best=null, bestR=Infinity;
  for(let mask=1;mask<(1<<n);mask++){
    const cols=[]; for(let i=0;i<n;i++) if(mask&(1<<i)) cols.push(i);
    if(cols.length>3) continue;
    const w=spLSQ(A, cols, u);
    if(!w||w.some(v=>v<0)) continue;
    let r=0; for(let c=0;c<3;c++){ let s=-u[c]; cols.forEach((i, j)=>{ s+=w[j]*A[i][c]; }); r+=s*s; }
    if(r<bestR-1e-12){ bestR=r; best=cols.map((i, j)=>[i, w[j]]); }
  }
  if(!best) best=[[0, 1]];
  const sum=best.reduce((s, [, w])=>s+w, 0)||1;
  const Ys=best.map(([i, w])=>w/sum*t*(lights[i][3]?perCity:perSky)), Y=Ys.reduce((s, v)=>s+v, 0);
  if(!(Y>0)) return null;
  return {a, Y, comps:best.map(([i], j)=>[lights[i][0], Ys[j]/Y, lights[i][1], lights[i][2]])};
}
// The light toward true altitude el, azimuth az. disk is 'sun', 'moon' or null; aurora the
// four emissions there (kR) or null; litHere, on the Moon, how sunlit that point of it is (0–1),
// and on the Sun how far out from its centre (0–1, for limb darkening);
// cloudPx the cloud pass's pixel there ({a, rgb}) or null, its cloud in front of the sky; cr how
// far from the Sun's centre, in drawn solar radii, for the corona (null leaves it out). Returns {S (1 nm, cd/m² per nm-ish units), Y (cd/m²),
// parts: [[name, Y]], marks: annotations}.
function skySpectrum(el, az, disk, aurora, litHere=1, cloudPx=null, cr=null){
  const key=EP[dIdx].key, lat=dLat, cdu=cdPerUnit(), vz=Math.min(90-el, 88), parts=[], marks=[];
  const S=new Float32Array(SP_N), sunlit=new Float32Array(SP_N), coronaEW=[];
  // sun: true for sunlight (it gets the Sun's lines), 'post' for light already through the air.
  const post=new Float32Array(SP_N);
  const add=(name, Y, shape, sun)=>{ if(!(Y>0)) return; parts.push([name, Y]); const T=sun==='post'?post:sun?sunlit:S; for(let i=0;i<SP_N;i++) T[i]+=Y*shape[i]; };
  const sunSrc=skySource(skyNow.sza, skyNow.sunAz), azr=a=>{ let d=Math.abs(az-a)%360; return d>180?360-d:d; };
  if(disk==='sun'){ const mu=limbMu(litHere); add('Sun’s disk', 1, spNorm(spSunDisk(key, lat, skyNow.sza).map((v, i)=>{ const a=sunLimbAlpha(SP_LAM[i]); return v*(a+2)/2*Math.pow(mu, a); })), true); }
  else{
    if(disk==='moon'){
      // The Moon's surface: its brightness per lit area (the full Moon's 2,500 cd/m², by the
      // phase law and the Moon's size then), dimmed by the air. Its night side has only
      // earthshine, sunlight off the Earth's day side (bluer), about 2e-4 of its day side when
      // the Earth looks full from the Moon. The air in front adds its own light below.
      const mo=skyNow.moon, frac=Math.max(moonLit(mo, skyNow.sunAz, 90-skyNow.sza), 0.02);
      const day=2500*(skyNow.moonRel||0)/frac/Math.pow(mo.radDeg/0.259, 2)*extinction(el, extK(key));
      const red=spSunDisk(key, lat, 90-mo.el).map((v, i)=>v*SP_MOON_RED[i]);
      add('the Moon, sunlit', day*litHere, spNorm(red), true);
      add('the Moon, earthshine', day*2e-4*(1-frac)*(1-litHere), spNorm(red.map((v, i)=>v*550/SP_LAM[i])), true);
    }
    if(sunSrc.fade>0){ const X=domeXYZ(key, lat, sunSrc.si, sunSrc.st, vz, azr(skyNow.sunAz)); add('sunlit air', X[1]*sunSrc.fade*skyNow.sunVis*skyNow.sunFlux*cdu, spSky(key, lat, skyNow.sza, vz, azr(skyNow.sunAz)), true); }
    const mo=skyNow.moon, mSrc=skySource(90-mo.el, mo.az);
    if(mSrc.fade>0&&skyNow.mScale>0){ const X=domeXYZ(key, lat, mSrc.si, mSrc.st, vz, azr(mo.az)); add('moonlit air', X[1]*mSrc.fade*skyNow.mScale*cdu, spNorm(spSky(key, lat, 90-mo.el, vz, azr(mo.az)).map((v, i)=>v*SP_MOON_RED[i])), true); }
    // The corona and the chromosphere around the hidden Sun, as far as the drawing shows them.
    if(disk!=='moon'&&cr!=null&&cr>=1&&skyNow.corona>0){
      const st=coronaState(key), [K, F]=coronaKF(st, cr), ex=skyNow.corona*st.B*coronaThroughAir(key, el);
      const sunS=spNorm(spSunDisk(key, lat, skyNow.sza));
      add('corona, electrons (K)', K*ex, sunS);
      add('corona, dust (F)', F*ex, spNorm(sunS.map((v, i)=>v*Math.pow(SP_LAM[i]/550, 0.3))), true);
      // Each line its equivalent width of K's continuum there; against K it falls as the density.
      const fall=K/coronaKF(st, 1)[0], E=new Float32Array(SP_N);
      CORONA_LINES.forEach(([l], j)=>{ coronaEW[j]=st.ew[j]*fall; const g=spGauss(l, 0.6), w=coronaEW[j]*sunS[Math.round(l-SP_L0)]/(0.6*2.5066); for(let i=0;i<SP_N;i++) E[i]+=w*g[i]; });
      add('corona, iron and calcium lines', K*ex*spY(E), spNorm(E));
      add('chromosphere', CHROMO_B*st.chromo*ex*(1-smooth01(1, 1.06, cr)), SP_CHROMO);
    }
    // The natural night sky and city light, as nightRows draws them.
    const q=6371/6471, sz=Math.sin(vz*Math.PI/180), f=absZenith(key)*(0.4+0.6*extinction(el, extK(key)))/Math.sqrt(1-q*q*sz*sz);
    const fo=AIRGLOW_O[key]??1, fc=AIRGLOW_CO2[key]||0;
    add('zodiacal light and stars', (1-AIRGLOW_SHARE)*NIGHT_NATURAL*f, SP_SUN5772, true);
    // Debris (debris.js): the extra zodiacal light, the ring, and the ring's light in the air.
    if(skyNow.ecl&&zodiK(key)>1) add(`zodiacal light, ${zodiK(key)}× today’s`, zodiExtra(key, horizDir(az, el), skyNow.ecl)*absZenith(key)*(0.4+0.6*extinction(el, extK(key))), SP_SUN5772, true);
    // Comets: each part's light here, with its own spectrum.
    for(const C of skyNow.comets||[]){
      const pc=cometAt(C, horizDir(az, el), Math.PI/180*90/domeView().R, {}), ex=extinction(el, extK(key))*absZenith(key), nm=C.c.name;
      add(`${nm}, coma dust`, pc.coma*(1-C.gas)*ex, SP_COMET_DUST, true);
      add(`${nm}, coma gas`, pc.coma*C.gas*ex, cometGasSpectrum(C.sodium));
      add(`${nm}, dust tail`, pc.dust*ex, SP_COMET_DUST, true);
      add(`${nm}, ion tail`, pc.ion*ex, SP_COMET_ION);
    }
    const rg=skyNow.ring;
    if(rg){
      const sd=horizDir(skyNow.sunAz, 90-skyNow.sza), pw=Math.PI/180*90/domeView().R;
      add('the ring, sunlit', ringAt(rg.R, horizDir(az, el), sd, rg.P, pw, skyNow.sunFlux)*extinction(el, extK(key))*absZenith(key), SP_RING, true);
      add('ring-lit air', 0.027*ringIlluminance(rg.R, sd, rg.P, skyNow.sunFlux, extK(key)), SP_RINGSKY, true);
    }
    add('airglow', AIRGLOW_SHARE*fo*NIGHT_NATURAL*f, SP_AIRGLOW);
    add('violet O₂ airglow', AIRGLOW_SHARE*fc*NIGHT_NATURAL*f, SP_HERZ);
    const glow=SKYGLOW[key];
    if(glow) add(key==='volcanic'?'oil lamps':'city light', glow[0]*(1+2.2*Math.exp(-el/12)), spGlow(key));
    if(mwMap&&skyNow.gal){ const L=mwAt(skyNow.gal, horizDir(az, el))*extinction(el, extK(key))*extZenith(key); add('Milky Way', L, SP_MW); }
    if(aurora) aurora.forEach((I, k)=>add(['aurora, oxygen green', 'aurora, oxygen red', 'aurora, nitrogen violet', 'aurora, nitrogen red'][k], I*SP_AUR_Y[k], SP_AUR[k]));
  }
  // A cloud in front: its own light, over what of the sky shows through it.
  const cl=cloudPx&&disk!=='sun'?cloudLight(cloudPx, key, lat):null;
  if(cl){
    const f=1-cl.a;
    for(let i=0;i<SP_N;i++){ S[i]*=f; sunlit[i]*=f; }
    for(const p of parts) p[1]*=f;
    for(const [name, w, shape, sun] of cl.comps) add(name, cl.a*cl.Y*w, shape, sun);
  }
  // Air along the way.
  const X=Math.min(spAirmass(el)+(disk==='sun'?0:(sunSrc.fade>0?spAirmass(90-skyNow.sza)*0.5:0)), 40), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X;
  for(let i=0;i<SP_N;i++){ const T=Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o); S[i]=(S[i]+sunlit[i]*SP_FRAUN_T[i])*T+post[i]; }
  const Y=parts.reduce((s, p)=>s+p[1], 0);
  // What to label: the strongest sources' own features.
  const share=n=>parts.filter(p=>p[0].startsWith(n)).reduce((s, p)=>s+p[1], 0)/Math.max(Y, 1e-30);
  const sun=share('sunlit')+share('moonlit')+share('Sun')+share('the Moon')+share('zodiacal')+share('cloud, sunlit')+share('cloud, lit by the sky')+share('cloud, moonlit');
  if(share('sunlit')+share('moonlit')+share('cloud, lit by the sky')>0.3){
    if(spOzone(key)) marks.push({a:500, b:680, t:'O₃ Chappuis', band:true});
    if(key.startsWith('archean27')) marks.push({a:380, b:480, t:'organic haze', band:true});
    if(key==='kpg66') marks.push({a:380, b:780, t:'soot dims all colours', band:true});
  }
  if(sun>0.3){ marks.push(...SP_SUN_MARKS); if(share('Sun')+share('sunlit')<0.5) marks.push({l:589.3, t:'Na D'}); }
  spAirMarks(marks, o2, h2o);
  if(share('airglow')>0.1){ marks.push({l:557.7, t:'[O I] 557.7', em:true}, {l:589.3, t:'Na D', em:true}, {l:630, t:'[O I] 630', em:true}, {l:735, t:'OH', em:true}); }
  if(share('violet')>0.1) marks.push({l:450, t:'O₂ Herzberg II', em:true});
  const shareHas=s=>parts.filter(p=>p[0].includes(s)).reduce((a, p)=>a+p[1], 0)/Math.max(Y, 1e-30);
  if(shareHas(', coma gas')>0.08){ marks.push({l:516.5, t:'C₂ Swan', em:true}, {l:473.7, t:'C₂', em:true}, {l:563.5, t:'C₂', em:true}, {l:405, t:'C₃', em:true}, {l:388.3, t:'CN', em:true}); if((skyNow.comets||[]).some(C=>C.sodium)) marks.push({l:589.3, t:'Na D', em:true}); }
  if(shareHas(', ion tail')>0.08) marks.push({l:425.2, t:'CO⁺', em:true}, {l:391.4, t:'N₂⁺', em:true}, {l:619.4, t:'H₂O⁺', em:true});
  if(share('city')+share('cloud, lit by the city')>0.15){ if(key==='y2100') marks.push({l:452, t:'LED', em:true}); else marks.push({l:589.3, t:'Na (sodium lamps)', em:true}, {l:452, t:'LED', em:true}); }
  if(share('oil')+share('cloud, lit by oil')>0.15) marks.push({l:700, t:'flames, 1850 K', em:true});
  if(share('corona')>0.3) CORONA_LINES.forEach(([l, , , n], j)=>{ if(coronaEW[j]>0.2) marks.push({l, t:`${n} ${l}`, em:true}); });
  if(share('chromosphere')>0.2) marks.push({l:656.3, t:'Hα', em:true}, {l:587.6, t:'He I D3', em:true}, {l:486.1, t:'Hβ', em:true}, {l:393.4, t:'Ca II H&K', em:true});
  if(share('aurora, oxygen green')>0.05) marks.push({l:557.7, t:'[O I] 557.7', em:true});
  if(share('aurora, oxygen red')>0.03) marks.push({l:630, t:'[O I] 630', em:true});
  if(share('aurora, nitrogen violet')>0.02) marks.push({l:391.4, t:'N₂⁺ 391', em:true}, {l:427.8, t:'N₂⁺ 428', em:true});
  if(share('aurora, nitrogen red')>0.05) marks.push({l:670, t:'N₂ 1P', em:true});
  return {S, Y, parts, marks};
}
// The plot: the spectrum filled with the colour of each wavelength, linear, normalized to the
// continuum so a bright line runs off the top (marked with a caret) rather than flattening the rest.
// Past 690 nm the fit's tails turn the hue back toward green, so the deep red holds from there.
const SP_RGB=SP_CMF.map((c, i)=>SP_CMF[Math.min(i, 310)]).map(([x, y, z])=>{ const r=3.2406*x-1.5372*y-0.4986*z, gr=-0.9689*x+1.8758*y+0.0415*z, b=0.0557*x-0.2040*y+1.0570*z, m=Math.max(r, gr, b, 1e-6);
  return `rgb(${[r, gr, b].map(v=>Math.round(255*g(Math.max(0, v/m)*0.75+0.08))).join(',')})`; });
function drawSpectrum(cv, sp){
  const dpr=Math.min(window.devicePixelRatio||1, 2), W=264, H=118;
  if(cv.width!==W*dpr){ cv.width=W*dpr; cv.height=H*dpr; cv.style.width=W+'px'; cv.style.height=H+'px'; }
  const c=cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const L=6, R=W-6, T=30, B=H-16, X=l=>L+(l-SP_L0)/(SP_N-1)*(R-L);
  const S=sp.S, sorted=Array.from(S).sort((a, b)=>a-b), cont=sorted[Math.floor(SP_N*0.9)]||1, mx=Math.max(...S), top=Math.max(mx>3*cont?2.2*cont:mx, 1e-30);
  const Yv=v=>B-(B-T)*Math.min(v/top, 1);
  c.globalAlpha=0.55;
  for(let i=0;i<SP_N-1;i++){ const x0=X(SP_LAM[i]), x1=X(SP_LAM[i+1]); c.fillStyle=SP_RGB[i];
    const y=Yv(Math.min(S[i], S[i+1])); c.fillRect(x0, y, x1-x0+0.5, B-y); }
  c.globalAlpha=1; c.strokeStyle='#fff'; c.lineWidth=1.1; c.beginPath();
  for(let i=0;i<SP_N;i++){ const x=X(SP_LAM[i]), y=Yv(S[i]); if(i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
  for(let i=1;i<SP_N-1;i++) if(S[i]>top&&S[i]>=S[i-1]&&S[i]>=S[i+1]){ const x=X(SP_LAM[i]); c.fillStyle='#fff'; c.beginPath(); c.moveTo(x-3, T-1); c.lineTo(x+3, T-1); c.lineTo(x, T-5); c.fill(); }
  c.strokeStyle='rgba(255,255,255,.45)'; c.beginPath(); c.moveTo(L, B+0.5); c.lineTo(R, B+0.5); c.stroke();
  c.fillStyle='rgba(255,255,255,.7)'; c.font='9px system-ui, sans-serif'; c.textAlign='center';
  for(const l of [400, 500, 600, 700]){ c.fillRect(X(l), B, 1, 3); c.fillText(String(l), X(l), B+12); }
  c.textAlign='right'; c.fillText('nm', R, B+12);
  // Annotations: bands as a bracket along the top; lines as a tick and a label, staggered over two
  // rows and dropped when they would collide. A band's label sits over its middle, narrowest band
  // first; one that would collide slides along its band to the nearest free place.
  const rows=[[], []], fits=(row, a, b)=>rows[row].every(([p, q])=>b<p-2||a>q+2);
  for(const m of sp.marks.filter(m=>m.band).sort((p, q)=>(p.b-p.a)-(q.b-q.a))){
    const a=X(m.a), b=X(m.b); c.strokeStyle='rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(a, 26); c.lineTo(a, 23); c.lineTo(b, 23); c.lineTo(b, 26); c.stroke();
    const w=c.measureText(m.t).width, lo=Math.max(a, L)+w/2, hi=Math.min(b, R)-w/2;
    let mid=(a+b)/2;
    for(let d=0;d<=b-a;d+=2){ const l=mid-d, r=mid+d;
      if(r<=hi&&fits(1, r-w/2, r+w/2)){ mid=r; break; } if(l>=lo&&fits(1, l-w/2, l+w/2)){ mid=l; break; } }
    c.fillStyle='rgba(255,255,255,.85)'; c.textAlign='center'; c.fillText(m.t, mid, 20); rows[1].push([mid-w/2, mid+w/2]);
  }
  const seen=new Set();
  for(const m of sp.marks.filter(m=>!m.band)){
    if(seen.has(m.t)) continue; seen.add(m.t);
    const x=X(m.l), w=c.measureText(m.t).width, a=Math.max(L, Math.min(R-w, x-w/2)), b=a+w, row=fits(0, a, b)?0:(fits(1, a, b)?1:-1);
    if(row<0) continue;
    rows[row].push([a, b]);
    const ty=row?20:9;
    c.fillStyle=m.em?'#ffe08a':'#9fd0ff'; c.textAlign='left'; c.fillText(m.t, a, ty);
    c.strokeStyle=m.em?'rgba(255,224,138,.55)':'rgba(159,208,255,.55)'; c.beginPath(); c.moveTo(x+0.5, ty+2); c.lineTo(x+0.5, Math.max(Yv(S[Math.round(m.l-SP_L0)]||0)-2, ty+3)); c.stroke();
  }
}
// A tooltip's spectrum box: its plot and caption, made on first use. With note, the caption alone.
function spBox(box, note){
  let cv=box.querySelector('canvas.spc'), src=box.querySelector('.spsrc');
  if(!cv){ cv=document.createElement('canvas'); cv.className='spc'; src=document.createElement('div'); src.className='spsrc'; box.append(cv, src); }
  if(note){ cv.style.display='none'; src.textContent=note; }
  return {cv, src};
}
// Says whether the spectra are in; until they are, the box says they are loading.
function spReady(b){ if(spData) return true; spLoad(); spBox(b, 'Loading the spectrum…'); return false; }
function spShow(b, sp, note){ const {cv, src}=spBox(b); cv.style.display='block'; drawSpectrum(cv, sp); src.textContent=note; }
// The tooltip body for a direction: the swatch line is the caller's; this adds the plot and the
// sources. el is true altitude in degrees.
function spectrumHTML(box, el, az, opts={}){
  if(opts.note){ spBox(box, opts.note); return; }
  if(!spReady(box)) return;
  if(opts.meteor){ const st=meteorSpectrumTip(opts.meteor); spShow(box, st, st.note); return; }
  if(opts.sn||opts.star){ const s=opts.star, st=opts.sn?snSpectrum(opts.sn):s.star?starSpectrum(s, el):reflectedSpectrum(s); spShow(box, st, st.note); return; }
  const sp=skySpectrum(el, az, opts.disk||null, opts.aurora||null, opts.disk==='sun'?opts.r||0:opts.lit??1, opts.cloud||null, opts.cr??null);
  const fmt=Y=>Y>=1?Y.toPrecision(3)+' cd/m²':(Y>=1e-3?(Y*1e3).toPrecision(3)+' mcd/m²':skyMagArcsec(Y).toFixed(1)+' mag/arcsec²');
  // The strongest sources, and on the Moon its own light however faint (earthshine against a
  // day or twilight sky is well under a percent).
  const isMoon=p=>p[0].startsWith('the Moon'), ranked=sp.parts.slice().sort((a, b)=>b[1]-a[1]).filter(p=>isMoon(p)||p[1]>sp.Y*0.02);
  const keep=new Set(ranked.filter(isMoon).concat(ranked.filter(p=>!isMoon(p))).slice(0, 4));
  const top=ranked.filter(p=>keep.has(p)).map(p=>{ const f=100*p[1]/sp.Y; return `${p[0]} ${f<1?'<1':Math.round(f)}%`; });
  spShow(box, sp, opts.disk==='sun'?(opts.r>0.5?'The Sun’s disk near its edge, dimmer and redder (limb darkening): sunlight through the air':'The Sun’s disk: sunlight through the air')
    :fmt(sp.Y)+' · '+top.join(' · '));
}
// The dome's tooltip: the direction under canvas pixel (x, y), and whether it is on the Sun or Moon.
function domeSpectrum(x, y, box){
  if(!skyNow) return;
  const {cx, cy, R, z}=domeView(), dx=x-cx, dy=y-cy, r=Math.hypot(dx, dy);
  let az=Math.atan2(dx, -dy)*180/Math.PI; if(az<0) az+=360;
  const el=90-90*r/R, at=(bAz, bEl)=>{ const rr=R*(90-bEl)/90, a=bAz*Math.PI/180; return Math.hypot(x-(cx+rr*Math.sin(a)), y-(cy-rr*Math.cos(a))); };
  const mo=skyNow.moon, sunR=DOME_DISK*z*mo.sunRadDeg/SUN_RADIUS_DEG;
  const lit=mo.on&&mo.el>-mo.radDeg?moonLitAt(horizDir(az, el), DOME_DISK*z*mo.radDeg/SUN_RADIUS_DEG*90/R):null;
  const disk=lit!=null?'moon':(skyNow.sunOn&&skyNow.sunVis>0.01&&at(skyNow.sunAz, 90-skyNow.sza)<sunR?'sun':null);
  const met=meteorNearDome(x, y);
  if(met){ spectrumHTML(box, met.el, met.az, {meteor:met}); return; }
  const sn=disk?null:snNear(horizDir(az, el), 14*90/R);
  if(sn){ spectrumHTML(box, sn.el, sn.az, {sn}); return; }
  const star=disk?null:starNear(horizDir(az, el), 7*90/R);
  if(star){ spectrumHTML(box, star.el, star.az, {star}); return; }
  const st=skyNow.aur, aurora=disk!=='sun'&&st&&st.on&&domeAur.gl?auroraProbe(domeAur.gl, domeAur.store, st, horizDir(az, el)):null;
  const cr=at(skyNow.sunAz, 90-skyNow.sza)/sunR;
  spectrumHTML(box, el, az, {disk, aurora, lit, r:disk==='sun'?cr:0, cr});
}
// How sunlit the Moon is at direction dir, with the disk drawn radDeg degrees in radius, or
// null off the disk: the surface normal there against the Sun, as the sky shader does.
function moonLitAt(dir, radDeg){
  const mo=skyNow.moon, b=moonBasis(mo), c=vdot(dir, b.md), s=Math.sin(radDeg*Math.PI/180);
  if(c<0) return null;
  const v=vadd(dir, vscale(b.md, -c), [0, 0, 0]), x=vdot(v, b.east)/s, y=vdot(v, b.north)/s, r2=x*x+y*y;
  if(r2>1) return null;
  const n=vnorm(vadd(vscale(b.east, x), vscale(b.north, y), vscale(b.md, -Math.sqrt(1-r2))));
  return smooth01(-0.02, 0.05, vdot(n, horizDir(skyNow.sunAz, 90-skyNow.sza)));
}
// The globe: the limb at tangent height h (km) or, with h null, the disk, at latitude lat; the
// latitude is the Sun's zenith angle there (limb_grid.py). The model's spectra, with the Sun's
// lines and the air's O2 and water bands along a path of airmass X.
function globeSpectrum(key, lat, h){
  const G=spData.limb, D=spData, e=G.epochs.indexOf(G.epochs.includes(key)?key:'modern'), na=G.alts.length+1;
  const off=D.epochs.length*D.lats.length*D.szas.length*D.slots*D.nl;
  const raw=(i, j)=>spDecode(off+((e*G.lats.length+i)*na+j)*D.nl);
  const [li, lt]=bracket(G.lats, lat), acc=new Float32Array(D.nl);
  const cells=h==null?[[na-1, 1]]:(([j, u])=>[[j, 1-u], [j+1, u]])(bracket(G.alts, h));
  for(const [i, wi] of [[li, 1-lt], [li+1, lt]]) for(const [j, wj] of cells){ const r=raw(i, j); for(let k=0;k<D.nl;k++) acc[k]+=wi*wj*r[k]; }
  const S=spTo1nm(acc), mu=Math.max(Math.cos(lat*Math.PI/180), 0.05);
  // A tangent path holds about 38 vertical columns of the air above its lowest point (8 km
  // scale height), counted down the Sun's side and up again; the disk, down and back up. Water
  // stays low (2 km scale height).
  const X=Math.min(h==null?2/mu:76*Math.exp(-h/8), 60), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X*(h==null?1:Math.exp(-h/2));
  for(let i=0;i<SP_N;i++) S[i]*=SP_FRAUN_T[i]*Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o);
  const marks=[...SP_SUN_MARKS];
  if(spOzone(key)) marks.unshift({a:500, b:680, t:'O₃ Chappuis', band:true});
  if(key.startsWith('archean27')) marks.unshift({a:380, b:480, t:'organic haze', band:true});
  spAirMarks(marks, o2, h2o);
  return {S, Y:1, parts:[], marks};
}
// The globe's tooltip under canvas pixel (x, y), as renderGlobe lays it out.
function globeSpectrumTip(x, y, box){
  if(!spReady(box)) return;
  const ep=EP[Math.round(tPos)], W=globe.width, R=W*0.30, EX=0.5, hmax=ep.limb.alts[ep.limb.alts.length-1];
  const dx=x-W/2, dy=y-globe.height/2, r=Math.hypot(dx, dy), disk=r<R;
  const lat=Math.min(82.5, Math.abs(Math.asin(Math.max(-1, Math.min(1, dy/(disk?R:r)))))*180/Math.PI), h=disk?null:(r/R-1)/EX*hmax;
  spShow(box, globeSpectrum(ep.key, lat, h), disk?`The disk at ${Math.round(lat)}° latitude: sunlight off the ground and back out through the air`
    :`The limb ${Math.round(h)} km up at ${Math.round(lat)}° latitude: sunlight scattered along the line of sight`);
}
// A star's light as it reaches the ground: the star's own spectrum (a body at its colour
// temperature with the absorption of its class) through the air in front of it, nothing taken
// out. The air's transmission comes from the model's direct sunlight overhead and at 60°: their
// ratio is one more airmass of that epoch's air (Rayleigh, ozone, haze), raised to the star's
// airmass. The O2 and water bands are added as for the sky.
// The nearest star, planet or satellite drawn within tolDeg of dir that shows against the sky
// there, or null.
function starNear(dir, tolDeg){
  if(!skyNow||!skyNow.starMarks) return null;
  const key=EP[dIdx].key;
  let best=null, bestC=Math.cos(tolDeg*Math.PI/180);
  for(const s of skyNow.starMarks){
    if(s.comet) continue;
    const c=vdot(dir, horizDir(s.az, s.el)); if(c<bestC) continue;
    const m=starThroughAir(s.mag, s.el, key), dim=Math.pow(10, -0.2*(m-s.mag));
    if(starVisible(m, skyRAt(skyNow.rgrid, s.el, s.az)*skyNow.rCd)*dim<0.3) continue;
    best=s; bestC=c;
  }
  return best;
}
// Planets and satellites: sunlight above the air (a 5772 K body with the Sun's lines) times the
// body's reflectance, then through the air as a star. Reflectance shapes, 380-780 nm, are rough
// fits to the planets' disk-integrated colours (the methane band depths after Karkoschka 1994);
// a satellite's aluminium, panels and white paint reflect sunlight nearly grey, a little red.
// Each: nodes [nm, relative reflectance], methane bands [nm, depth, width], and a caption.
const REFL={
  Mercury:{n:[[380, 0.55], [500, 0.75], [600, 0.88], [780, 1]], note:'sunlight off bare rock, reddened by space weathering'},
  Venus:{n:[[380, 0.5], [430, 0.7], [500, 0.9], [600, 0.98], [780, 1]], note:'sunlight off sulfuric-acid clouds, dimmed in the violet by their unknown absorber', band:[380, 470, 'UV absorber']},
  Mars:{n:[[380, 0.15], [450, 0.2], [500, 0.27], [550, 0.45], [600, 0.76], [650, 0.9], [700, 0.96], [780, 1]], note:'sunlight off iron-oxide dust, dark in the blue', band:[400, 560, 'Fe³⁺']},
  Jupiter:{n:[[380, 0.6], [450, 0.75], [500, 0.85], [550, 0.94], [600, 1], [780, 1]], ch4:[[543, 0.06, 3], [619, 0.18, 4], [727, 0.42, 5]], note:'sunlight off ammonia clouds, with the bands of the methane above them'},
  Saturn:{n:[[380, 0.45], [450, 0.6], [500, 0.75], [550, 0.9], [600, 1], [780, 1]], ch4:[[543, 0.06, 3], [619, 0.2, 4], [727, 0.48, 5]], note:'sunlight off its yellower haze and its rings, with methane bands'},
  sat:{n:[[380, 0.85], [780, 1]], note:'sunlight off its metal, panels and paint'},
};
function reflectedSpectrum(s){
  const key=EP[dIdx].key, r=REFL[s.planet||'sat'], S=spPlanck(5772), n=r.n;
  for(let i=0;i<SP_N;i++){
    const l=SP_LAM[i], k=Math.max(0, n.findIndex(([x])=>x>=l)-1), [x0, y0]=n[k], [x1, y1]=n[Math.min(k+1, n.length-1)];
    let t=x1>x0?y0+(y1-y0)*(l-x0)/(x1-x0):y0;
    for(const [c, d, w] of r.ch4||[]) t*=1-d*Math.exp(-0.5*((l-c)/w)**2);
    S[i]*=SP_FRAUN_T[i]*t;
  }
  const marks=[{l:393.4, t:'Ca II H&K'}, {l:589.3, t:'Na D'}, {l:656.3, t:'Hα'}];
  if(r.band) marks.unshift({a:r.band[0], b:r.band[1], t:r.band[2], band:true});
  for(const [c, d] of r.ch4||[]) if(d>0.1) marks.push({l:c, t:'CH₄'});
  const X=Math.min(spAirmass(s.el), 40);
  spThroughAir(S, marks, key, X);
  const m=starThroughAir(s.mag, s.el, key);
  const note=`${s.planet||'A satellite'} · ${r.note} · V ${s.mag.toFixed(1)} above the air, ${m.toFixed(1)} through ${X.toFixed(1)} airmass${X>=1.05?'es':''}`;
  return {S, Y:1, parts:[], marks, note};
}
// The supernova, if it is up within tolDeg of dir.
function snNear(dir, tolDeg){
  const sn=skyNow&&skyNow.sn;
  return sn&&sn.el>0&&vdot(dir, horizDir(sn.az, sn.el))>=Math.cos(tolDeg*Math.PI/180)?sn:null;
}
// A Type II-P supernova near its peak: the hot early photosphere, about 11,000 K (its drawn
// blue-white), with the hydrogen and He I lines in P Cygni profiles, broad emission at rest
// and absorption blueshifted by the ejecta's 10,000 km/s (Filippenko 1997).
const SN_T=11000, SN_V=10000;
function snSpectrum(sn){
  const key=EP[dIdx].key, S=spPlanck(SN_T), b=SN_V/2.998e5;
  const lines=[[656.28, 1.8, 0.3, 'Hα'], [486.13, 0.5, 0.35, 'Hβ'], [434.05, 0.2, 0.3, 'Hγ'], [587.56, 0.25, 0.25, 'He I']];
  for(let i=0;i<SP_N;i++){
    const l=SP_LAM[i];
    let t=1;
    for(const [l0, em, ab] of lines){ const s=l0*b*0.5; t*=(1+em*Math.exp(-0.5*((l-l0)/s)**2))*(1-ab*Math.exp(-0.5*((l-l0*(1-b))/(0.5*s))**2)); }
    S[i]*=t;
  }
  const marks=lines.map(([l, , , t])=>({l, t, em:true})), X=Math.min(spAirmass(sn.el), 40);
  spThroughAir(S, marks, key, X);
  const m=starThroughAir(sn.mag, sn.el, key);
  const note=`${sn.name||'A supernova'} · a Type II-P near peak: an ${SN_T.toLocaleString('en-US')} K photosphere, its hydrogen and helium in `
    +`P Cygni lines from ejecta at ${SN_V.toLocaleString('en-US')} km/s · V ${sn.mag.toFixed(1)} above the air, ${m.toFixed(1)} through ${X.toFixed(1)} airmass${X>=1.05?'es':''}`;
  return {S, Y:1, parts:[], marks, note};
}
const spRamp=(lo, hi, x)=>Math.max(0, Math.min(1, (x-lo)/(hi-lo)));
function starClass(T){ return T>=30000?'O':T>=10500?'B':T>=7300?'A':T>=6000?'F':T>=5200?'G':T>=3700?'K':'M'; }
// The star above the air at colour temperature T, with the lines of its class: hydrogen strongest
// near 9,500 K and broad there, helium in the hot stars, the metals (Ca II H and K, the G band,
// Mg b, Na D, Ca I 423) growing toward the cool ones with their crowd of lines dimming the blue,
// and TiO bands, sharp on the blue side, in the M stars.
function starAbove(T){
  const S=spPlanck(T), hyd=Math.exp(-0.5*((Math.log10(T)-Math.log10(9500))/0.11)**2);
  const met=spRamp(9500, 4500, T), cool=spRamp(6500, 4000, T), he=spRamp(10000, 22000, T), tio=Math.min(1.2, spRamp(4100, 3200, T));
  const lines=[[656.28, 1], [486.13, 1], [434.05, 0.95], [410.17, 0.9], [397.01, 0.8], [388.9, 0.7], [383.5, 0.6]].map(([l, k])=>[l, (0.12+0.6*hyd)*k, 0.4+3.2*hyd]);
  lines.push([393.37, 0.1+0.75*met, 0.4+1.6*met], [396.85, 0.08+0.7*met, 0.4+1.6*met], [422.67, 0.55*cool, 0.6+0.6*cool],
    [430.8, 0.4*met*spRamp(3300, 4200, T), 1.0], [517.3, 0.45*met, 0.6+0.8*met], [527.0, 0.25*met, 0.6], [589.3, 0.15+0.5*cool, 0.5+0.6*cool],
    [447.15, 0.25*he, 0.6], [402.62, 0.2*he, 0.6], [587.56, 0.15*he, 0.5], [667.8, 0.12*he, 0.5]);
  const heads=[[476.1, 0.3], [495.4, 0.4], [516.7, 0.45], [544.8, 0.4], [559.8, 0.35], [615.9, 0.4], [666.2, 0.3], [705.5, 0.55]];
  for(let i=0;i<SP_N;i++){
    const l=SP_LAM[i];
    let t=1-0.4*met*Math.exp(-(l-380)/45);
    for(const [c, d, w] of lines) if(d>0) t*=1-Math.min(d, 0.95)*Math.exp(-0.5*((l-c)/w)**2);
    if(tio>0) for(const [h, d] of heads) if(l>=h) t*=1-tio*d*Math.exp(-(l-h)/14);
    S[i]*=Math.max(t, 0.02);
  }
  const marks=[];
  if(tio>0.3) marks.push({a:476, b:720, t:'TiO bands', band:true});
  if(hyd>0.25) marks.push({l:656.3, t:'Hα'}, {l:486.1, t:'Hβ'}, {l:434.0, t:'Hγ'}, {l:410.2, t:'Hδ'});
  else if(T>5000) marks.push({l:656.3, t:'Hα'}, {l:486.1, t:'Hβ'});
  if(met>0.2) marks.push({l:393.4, t:'Ca II H&K'});
  if(met>0.45&&tio<0.3) marks.push({l:430.8, t:'G band'}, {l:517.3, t:'Mg b'});
  if(cool>0.3) marks.push({l:589.3, t:'Na D'}, {l:422.7, t:'Ca I'});
  if(he>0.3) marks.push({l:447.1, t:'He I'});
  return {S, marks};
}
// One airmass of the epoch's air, up to a constant, on the log grid: the direct Sun at 60° over
// the Sun overhead.
function spAirPerMass(key){
  const D=spData, e=spEpoch(key), li=D.lats.indexOf(dLat), lo=spRaw(e, li, D.szas.indexOf(60), D.slots-1), hi=spRaw(e, li, D.szas.indexOf(0), D.slots-1);
  return spTo1nm(lo.map((v, i)=>Math.max(v-hi[i], D.lo)));
}
// A point source's light S through X airmasses of the epoch's air, with the O2 and water bands.
function spThroughAir(S, marks, key, X){
  const air=spAirPerMass(key), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X;
  for(let i=0;i<SP_N;i++) S[i]*=Math.pow(air[i], X)*Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o);
  spAirMarks(marks, o2, h2o);
}
function starSpectrum(s, el){
  const key=EP[dIdx].key, T=s.star[6]||10000, {S, marks}=starAbove(T), X=Math.min(spAirmass(el), 40);
  spThroughAir(S, marks, key, X);
  const cls=starClass(T), m=starThroughAir(s.mag, s.el, key);
  const note=`${s.star[7]||'A star'} · ${cls==='O'||cls==='A'?'an':'a'} ${cls} star, ${Math.round(T/50)*50} K · V ${s.mag.toFixed(1)} above the air, `
    +`${m.toFixed(1)} through ${X.toFixed(1)} airmass${X>=1.05?'es':''} of it, whose imprint is left in`;
  return {S, Y:1, parts:[], marks, note};
}
// The swatch bar under the dome: swatch sw is the sky vz° from the zenith toward the Sun's
// azimuth, or away from it.
function barSpectrumTip(sw, box){
  if(!skyNow) return;
  const vz=+sw.dataset.vz, az=(skyNow.sunAz+(+sw.dataset.azr)+360)%360;
  spectrumHTML(box, 90-vz, az);
}
// The noon skies (run_epochs.py): the Sun 15°, 45° and 75° from the zenith, the gradient running
// from the zenith at the top to the horizon 90° round from the Sun at the bottom. Height f (0 at
// the top, 1 at the bottom) is taken as the view zenith angle 88f; the model's spectra there,
// with the Sun's lines and the air's O2 and water bands along the light's path.
const NOON_SZA={'Equator':15, 'Mid-latitude':45, 'Polar summer':75};
function noonSpectrum(key, L, f){
  const sza=NOON_SZA[L], vz=88*Math.max(0, Math.min(1, f)), S=spSky(key, L==='Polar summer'?'Polar':L, sza, vz, 90);
  const X=Math.min(spAirmass(90-vz)+spAirmass(90-sza)*0.5, 40), o2=(SP_O2[key]??1)*X, h2o=(SP_H2O[key]??1)*X;
  for(let i=0;i<SP_N;i++) S[i]*=SP_FRAUN_T[i]*Math.exp(-SP_TAU_O2[i]*o2-SP_TAU_H2O[i]*h2o);
  const marks=[...SP_SUN_MARKS];
  if(spOzone(key)) marks.unshift({a:500, b:680, t:'O₃ Chappuis', band:true});
  if(key.startsWith('archean27')) marks.unshift({a:380, b:480, t:'organic haze', band:true});
  if(key==='kpg66') marks.unshift({a:380, b:780, t:'soot dims all colours', band:true});
  spAirMarks(marks, o2, h2o);
  return {S, Y:1, parts:[], marks, vz, sza};
}
function noonSpectrumTip(sky, f, box){
  if(!spReady(box)) return;
  const L=sky.dataset.lat, sp=noonSpectrum(EP[tIdx].key, L, f), el=Math.round(90-sp.vz);
  spShow(box, sp, `${el>=89?'The zenith':el+'° above the horizon'}, 90° round from the Sun (${90-sp.sza}° up): sunlight scattered by the air`);
}

// The ring's light: sunlight off L-chondrite rubble (debris.js), and the same scattered by the air
// (bluer, as the moonlit sky is). Its display colour for the dome and VR.
const SP_RING=spNorm(spPlanck(5772).map((v, i)=>v*RING_REFL(SP_LAM[i])));
const SP_RINGSKY=spNorm(SP_RING.map((v, i)=>v*Math.pow(550/SP_LAM[i], 3)));
RING_LIN=(()=>{ const X=[0, 0, 0]; for(let i=0;i<SP_N;i++) for(let q=0;q<3;q++) X[q]+=SP_RING[i]*SP_FRAUN_T[i]*SP_CMF[i][q]; return xyzLin(X).map(c=>Math.max(0, c)/X[1]); })();
// A meteor's spectrum as it reaches the ground (meteors.js metEmission, through the air), or a
// lunar impact flash's, with a caption.
function metFmtMass(g){ return g<1e-3?`${+(g*1e3).toPrecision(2)} mg`:g<1e3?`${+g.toPrecision(2)} g`:g<1e6?`${+(g/1e3).toPrecision(2)} kg`:`${(+(g/1e6).toPrecision(2)).toLocaleString('en-US')} tonnes`; }
function metFmtSize(cm){ return cm<0.1?`${+(cm*10).toPrecision(2)} mm`:cm<100?`${+cm.toPrecision(2)} cm`:`${+(cm/100).toPrecision(2)} m`; }
const MET_SRC={apex:'from the apex of Earth’s motion: cometary dust met head-on', helion:'from the helion source, near the Sun', antihelion:'from the antihelion source, opposite the Sun',
  toroidal:'from a toroidal source, high above the ecliptic', iso:'from no particular direction', aster:'from the asteroid belt, slow', ring:'falling from the ring'};
function meteorSpectrumTip(h){
  const key=EP[dIdx].key, air=EP[dIdx].air||{O:0.21, N:0.79, C:0, O2:0.21}, X=Math.min(spAirmass(h.el), 40);
  if(h.kind==='lava'){
    const S=spPlanck(h.f.temp), marks=[];
    spThroughAir(S, marks, key, X);
    return {S, Y:1, parts:[], marks, note:`Lava erupting in ${h.f.mare==='Procellarum'?'Oceanus':'Mare'} ${h.f.mare}, on the Moon’s night side · basalt fountaining from a fissure at about ${Math.round(h.f.temp/50)*50} K as the mare floods · V ${h.mag.toFixed(1)}`};
  }
  if(h.kind==='flash'){
    const f=h.f, S=spPlanck(f.temp), na=spLines([[589.0, 1], [589.6, 0.5]]), y=spY(S)||1;
    for(let i=0;i<SP_N;i++) S[i]+=0.08*y*na[i]/(spY(na)||1);
    const marks=[{l:589.3, t:'Na D', em:true}];
    spThroughAir(S, marks, key, X);
    return {S, Y:1, parts:[], marks, note:`An impact flash on the Moon’s night side · rock vapour and melt glowing at about ${Math.round(f.temp/100)*100} K, for a fraction of a second · V ${h.mag.toFixed(1)}`};
  }
  const m=h.m, k=extK(key), S=metEmission(m.v, air, m.src==='ring'), marks=[];
  const Or=(air.O||0)/0.21, Nr=(air.N||0)/0.79, Cr=Math.min(1, (air.C||0)/0.3), hot=m.v>35, fast=m.v>30;
  marks.push({l:589.3, t:'Na D', em:true}, {l:517.3, t:'Mg I', em:true}, {l:438.4, t:'Fe I', em:true}, {l:527, t:'Fe I', em:true});
  if(hot) marks.push({l:393.4, t:'Ca II', em:true}, {l:448.1, t:'Mg II', em:true});
  else marks.push({l:385.9, t:'Fe I', em:true}, {l:422.7, t:'Ca I', em:true});
  if(fast&&Or>0.1) marks.push({l:777.4, t:'O I', em:true});
  if(fast&&Nr>0.1) marks.push({l:650, t:'N₂ 1P', em:true});
  if(fast&&Cr>0.1) marks.push({l:483.5, t:'CO Ångström', em:true});
  if(hot&&m.v>30) marks.push({l:656.3, t:'Hα', em:true});
  spThroughAir(S, marks, key, X);
  let peak=99; for(let i=0;i<=20;i++){ const a=metApparent(m, i/20, k); if(a.mag<peak) peak=a.mag; }
  const comp=m.rho>3?'stone':m.rho<1?'fluffy cometary dust':'grain';
  const ago=h.ago>0.05?` · went by ${h.ago.toFixed(1)} s ago`:'';
  const big=m.he<35?' · deep enough that part of it may fall as meteorites':'';
  return {S, Y:1, parts:[], marks, note:`A meteor ${key==='ordovician466'&&m.src==='aster'?'from the shattered L-chondrite parent body':(MET_SRC[m.src]||'')} · ${Math.round(m.v)} km/s · a ${metFmtMass(m.mass)} ${comp} about ${metFmtSize(m.diam)} across · `
    +`glowing from ${Math.round(m.hb)} to ${Math.round(m.he)} km up, ${m.T.toFixed(1)} s · peak V ${peak.toFixed(1)}${big}${ago}`};
}
