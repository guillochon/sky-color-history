/* ---------- Lightning ---------- */
// Thunderstorms' lightning in the walk-around view, from the showers the weather already makes
// (clouds.js cloudPrecip): the flashes come from the convective cells drawn overhead, as many as
// their rain and the air's instability give, and only where the towers reach the cold air that
// charges them.
//
// How often. A storm separates its charge where graupel and ice crystals collide in supercooled
// cloud, between about −10 and −25 °C (the non-inductive charging of Takahashi 1978 and Saunders
// et al. 1991), so a tower must rise into air that cold: a warm-rain cloud makes none. The flash
// rate goes as the convective rain times the instability that drives the updrafts (CAPE times
// precipitation, Romps et al. 2014), the instability here growing 6% a degree about 22 °C, as
// the showers already do, for about 12% a degree in all. A storm over the sea flashes some ten
// times less for its rain than one over land, its updrafts weaker (Williams & Stanfill 2002), so
// the epochs with little land have less. One flash comes for every LT_YIELD kilograms of
// convective rain, set so that today's air at 45° gets about 6 flashes a square kilometer a
// year, a quarter of them to the ground, as over Europe (Christian et al. 2003; Cecil et al.
// 2014). The same weather then gives some 90 at the Equator, a land hotspot's like the Congo
// basin's, and 0.1 at 75° (run over eight years of hours at 45°, three elsewhere).
// The share to the ground follows the latitude, the cloud's charge lifted higher in the tropics
// (Prentice & Mackerras 1977): IC/CG = 4.16 + 2.16 cos 3λ, held at 2 past 60°.
//
// By epoch (LT_ERA, k: the flashes for a storm's rain and instability relative to today's, for
// the land under the storms; guess: an estimate, not a measurement). The weather itself already
// carries the rest: the Snowball's and the impact winter's cold leaves no showers, and the steam
// world after the Moon-forming impact, its surface near 90 °C, raises its clouds' freezing level
// above their tops, so their rain is warm and they have no lightning at all.
//   - The Hadean and Archean had little land above the sea, a few percent of the surface
//     (Flament et al. 2008): oceanic storms, a third to half of today's flashes. Lightning
//     then is the classic source of the fixed nitrogen early life needed (Wong et al. 2017;
//     Barth et al. 2023), its rate taken there much as today's, which this sits under.
//   - The Proterozoic to the Ordovician, the continents near today's in area, a little less.
//   - The Carboniferous's Pangaea, its interior far from the sea, a little more; its 30% oxygen
//     let the strikes light the wildfires whose smoke the epoch's air carries.
//   - A polluted city's aerosol makes more and smaller droplets, which carry more water into the
//     freezing levels and charge the cloud more: up to twice the flashes over the busiest
//     shipping lanes (Thornton et al. 2017), a quarter more here.
//   - 2100's warmer air is already in the instability and the showers, which alone would nearly
//     double today's flashes; models disagree on whether the flashes follow (CAPE times
//     precipitation gives a large rise, the flux of ice into the storms a small fall; Romps 2019,
//     Finney et al. 2018), so k takes it back to a third more.
// With the weather's own, at 45° the hothouse epochs flash six to nine times as often as today
// (the Cretaceous and the Carboniferous), the Ordovician's warm greenhouse nearly four times, the
// warm Archean half again as often, and the cooler Proterozoic a sixth as often.
const LT_ERA=aliasEpochs({
  protoearth455:{k:0.35, guess:1}, hadean45:{k:0.35, guess:1}, hadean40:{k:0.35, guess:1}, archean38:{k:0.4, guess:1},
  archean27thin:{k:0.5, guess:1}, archean27:{k:0.5, guess:1}, archean27vthick:{k:0.5, guess:1}, proterozoic22:{k:0.7, guess:1},
  snowball07:{k:0.75, guess:1}, cryogenian65:{k:0.75, guess:1}, ordovician466:{k:0.85, guess:1}, carbon30:{k:1.1, guess:1},
  kpg66:{k:1, guess:1}, cretaceous66:{k:1, guess:1}, zetaoph:{k:1}, geminga:{k:1}, volcanic:{k:1}, modern:{k:1}, ozonehole:{k:1},
  modernpoll:{k:1.25}, y2100:{k:0.65}
});
// kg of convective rain for each flash (see above), in a cell raining LT_CREF mm/h: a heavier
// cell's updraft is stronger too, and flashes more for its rain, as the square of its rate
// (lightning grows far faster than the storm, as the fifth power of its height in Price & Rind
// 1992), so the year's flashes come in a few dozen storms, tens a minute at their height, rather
// than spread through every shower. The rate is taken over the air's water (cloudPrecip's
// Clausius-Clapeyron factor), since moister air rains harder without a stronger updraft. Storms
// are counted to LT_REACH, over a grid of LT_CELL cells LT_SPAN either side of a point near the
// eye; the flashes
// of each LT_BIN seconds are made once, from a generator seeded by the epoch, the latitude, that
// point and the bin, so a moment brought back has the same flashes.
const LT_YIELD=1.52e7, LT_CREF=20, LT_CELL=2500, LT_SPAN=70000, LT_REACH=60000, LT_BIN=5, LT_R=833333;
// The eye's persistence (s): a stroke of a few tens of microseconds is seen as a flash with a
// tenth of a second's afterglow, and the strokes of one flash, 30-150 ms apart, as a flicker.
const LT_TAU=0.07;
// The light. A return stroke radiates some 870 J for each meter of its channel from 0.4 to
// 1.1 µm (Krider, Dawson & Uman 1968); about half of it in the visible, at some 200 lm/W, gives
// 8.7e4 lm·s a meter. Later strokes down the same channel are about half as bright. A flash within
// the cloud is taken at 1e8 lm·s in all, in a burst of pulses over a few tenths of a second.
const LT_QM=8.7e4, LT_QIC=1e8;
const LT={lapse:null, grids:new Map(), bins:new Map(), active:[], storm:false, lit:false, near:0, far:0, lastT:null, lastNow:0, span:0, job:null, prog:null, u:null, vao:null, buf:null, tints:{}};
// The share of flashes to the ground at latitude lat (deg).
function ltGroundShare(lat){ const a=Math.min(60, Math.abs(lat))*Math.PI/180; return 1/(1+4.16+2.16*Math.cos(3*a)); }
// The cloud tops' height (m) from the field's top (0-1), and how much of the charging zone they
// reach: none while the tops are warmer than −8 °C, all once colder than −25 °C.
function ltTopZ(f){ return 3000+11000*f.top; }
function ltIce(f){ return 1-smoothstep(-25, -8, f.T-6.5*ltTopZ(f)/1000); }
// Flashes a second over a square kilometer for each mm/h of convective rain, in field f: the
// instability, the charging zone reached, the epoch's land, and the warm rain. A cloud whose base
// lies far below its freezing level rains much of its water out before the updraft carries it to
// the ice (Williams & Stanfill 2002), so it flashes less for its rain: here e-fold for 1.5 km of
// warm cloud past the 2.2 km of a summer storm at 45° today. It tames the tropics' and the hothouse
// epochs' storms, which flash more for their rain over land than at sea.
function ltPerKm2(f, key){
  const e=tableNow(LT_ERA, key, LT_ERA.modern), cape=Math.min(2.5, Math.max(0.2, Math.exp(0.06*(f.T-22))));
  const warm=Math.max(0, 1000*f.T/6.5-f.base), wf=Math.exp(-(warm-2200)/1500);
  return 1e6/3600/LT_YIELD*cape*Math.min(2, wf)*ltIce(f)*e.k;
}
// The storms about the eye in clock minute mi (whole minutes since day 0): the flash rate (per
// second) in each cell, as a running sum for picking a cell, from that minute's own weather (the
// clouds move 88 m a minute), worked out from the date alone, so a bin's flashes don't depend on
// when it was first made. The cover is taken about the eye to the nearest 2 km, as the clouds
// drawn take it (clouds.js cloudCovHere).
function ltGrid(key, mi){
  const ax=Math.round(vrX/20000)*20000, ay=Math.round(vrY/20000)*20000, id=key+'|'+dLat+'|'+ax+'|'+ay;
  const ex=Math.round(vrX/2000)*2000, ey=Math.round(vrY/2000)*2000, gk=id+'|'+mi+'|'+ex+'|'+ey+'|'+vrScenery;
  const had=LT.grids.get(gk);
  if(had) return had;
  const k=Math.floor(mi/DAYMIN), k0=cloudDate().k;
  let f;
  cloudAt={k, m:mi-k*DAYMIN, dk:k-k0};
  try{ f=cloudField(key); f.covGL=cloudCovHere(f, ex, ey); }
  finally{ cloudAt=null; }
  const n=Math.round(2*LT_SPAN/LT_CELL), r=f.rain;
  // Flashes a second for 1 mm/h of convective rain over a cell.
  const per=(LT_CELL/1000)**2*ltPerKm2(f, key), cc=Math.min(3, Math.max(0.08, Math.exp(0.06*(f.T-15))));
  const cum=new Float64Array(n*n);
  let s=0;
  if(per>0&&r.conv>0) for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const m=rainMapAt(f, ax-LT_SPAN+(i+0.5)*LT_CELL, ay-LT_SPAN+(j+0.5)*LT_CELL);
    const c=r.conv*smoothstep(0.55, 0.85, m.th)*smoothstep(0.3, 0.6, m.cov);
    s+=c*c/(cc*LT_CREF)*per; cum[j*n+i]=s;
  }
  const G={id, ax, ay, n, cum, total:s, base:f.base, top:ltTopZ(f), cg:ltGroundShare(LATDEG[dLat]??45)};
  LT.grids.set(gk, G);
  if(LT.grids.size>6) LT.grids.delete(LT.grids.keys().next().value);
  return G;
}
// A cell picked in proportion to its rate, by u in [0, 1), and a place in it.
function ltPlace(G, u, v, w){
  const x=u*G.total, c=G.cum;
  let lo=0, hi=c.length-1;
  while(lo<hi){ const mid=(lo+hi)>>1; if(c[mid]<x) lo=mid+1; else hi=mid; }
  return [G.ax-LT_SPAN+(lo%G.n+v)*LT_CELL, G.ay-LT_SPAN+(Math.floor(lo/G.n)+w)*LT_CELL];
}
// One flash at time t0, from the generator rng: to the ground, a first stroke and, after the
// interval between strokes (log-normal about 60 ms), more down the same channel, on average 3.6
// in all, a third of them with a continuing current of a tenth of a second or more; or within the
// cloud, a burst of pulses. Each stroke is [time, lm·s, duration] (0 for a single stroke).
function ltMake(G, t0, rng, id){
  const [x, y]=ltPlace(G, rng(), rng(), rng()), cg=rng()<G.cg, st=[];
  const fl={t0, x, y, cg, id, base:G.base, top:G.top, st, dur:0};
  if(cg){
    const ground=vrScenery?landHeight(x, y):0;
    fl.ground=ground; fl.L=Math.max(300, (G.base-ground)*1.4);
    const q1=LT_QM*fl.L*Math.exp(0.7*gauss01(rng));
    let t=t0;
    st.push([t, q1, 0]);
    while(rng()<0.72&&st.length<12){
      t+=0.06*Math.exp(0.6*gauss01(rng));
      const q=0.5*q1*Math.exp(0.5*gauss01(rng));
      st.push([t, q, 0]);
      if(rng()<0.3){ const d=0.1+0.2*rng(); st.push([t, 0.3*q1, d]); t+=d; }
    }
    fl.dur=t-t0;
  }else{
    const Q=LT_QIC*Math.exp(0.8*gauss01(rng)), k=6+Math.floor(10*rng()), D=0.2+0.4*rng();
    for(let i=0;i<k;i++) st.push([t0+D*rng(), 0.5*Q/k, 0]);
    st.push([t0, 0.5*Q, D]);
    fl.dur=D;
  }
  return fl;
}
function ltBin(G, b){
  const id=G.id+'|'+b;
  let got=LT.bins.get(id);
  if(got) return got;
  got=[];
  const rng=mulberry32(metHash(id)), n=ltPoisson(rng, G.total*LT_BIN);
  for(let i=0;i<n&&i<400;i++) got.push(ltMake(G, b*LT_BIN+LT_BIN*rng(), rng, id+'|'+i));
  LT.bins.set(id, got);
  if(LT.bins.size>400){ for(const k of LT.bins.keys()){ LT.bins.delete(k); if(LT.bins.size<=200) break; } }
  return got;
}
function ltPoisson(rng, l){
  if(!(l>0)) return 0;
  if(l>40) return Math.max(0, Math.round(l+Math.sqrt(l)*gauss01(rng)));
  let n=0, p=Math.exp(-l), s=p; const u=rng();
  while(u>s&&n<400){ n++; p*=l/n; s+=p; }
  return n;
}
// The light the eye sees from flash fl at time t (cd), smoothed by its persistence: all of it,
// and the first stroke's alone (which lights the branches its leader left).
function ltSeen(fl, t){
  let I=0, I1=0;
  fl.st.forEach(([ts, q, d], i)=>{
    if(t<ts) return;
    let v;
    if(d<=0) v=q*Math.exp(-(t-ts)/LT_TAU)/LT_TAU;
    else{ const e=Math.min(t, ts+d); v=q/d*(1-Math.exp(-(e-ts)/LT_TAU))*Math.exp(-(t-e)/LT_TAU); }
    v/=4*Math.PI; I+=v; if(i===0) I1=v;
  });
  return [I, I1];
}
// The flashes lit now (LT.active). Played in real time (or paused), each is seen as it is at
// sky time T. Played faster, a frame stands for more sky time than a flash lasts, so it shows,
// at its brightest, one of the flashes struck since the last it showed: a time-lapse of the storm.
// True while any is lit; LT.storm says whether there are storms about to keep watching.
function ltTick(T){
  LT.active=[]; LT.storm=false; LT.near=LT.far=0;
  const f=vrGL&&vrGL.field;
  if(!vrOn||!f||!vrClouds||airOff()||f.covGL==null) return false;
  const now=performance.now(), key=EP[dIdx].key;
  // The sky seconds a frame has stood for lately.
  if(LT.lastT!=null&&now>LT.lastNow){ const dt=Math.max(0, T-LT.lastT); LT.span=0.7*LT.span+0.3*Math.min(dt, 1e5); }
  LT.lastT=T; LT.lastNow=now;
  // The clock minute of sky time t (a minute of the clock is dayHours × 2.5 s).
  const cd=cloudDate(), mNow=cd.k*DAYMIN+cd.m, Tnow=metSec(), minOf=t=>Math.floor(mNow+(t-Tnow)/(dayHours()*2.5));
  const G=ltGrid(key, minOf(T));
  if(!(G.total>0)) return false;
  LT.storm=true;
  // How often within 20 km of the eye and within LT_REACH, for the clock line (flashes a minute).
  for(let j=0;j<G.n;j++) for(let i=0;i<G.n;i++){
    const k=j*G.n+i, r=G.cum[k]-(k?G.cum[k-1]:0);
    if(!(r>0)) continue;
    const d=Math.hypot(G.ax-LT_SPAN+(i+0.5)*LT_CELL-vrX, G.ay-LT_SPAN+(j+0.5)*LT_CELL-vrY);
    if(d<LT_REACH){ LT.far+=r*60; if(d<20000) LT.near+=r*60; }
  }
  let out=[];
  if(LT.span>0.4&&dayPlaying){
    // A new flash no more than once in 0.4-1 s of real time, whatever the speed, so the sky never
    // strobes (flashing over three times a second can bring on seizures): the brightest of those
    // struck in the sky time since the last, fading over about a tenth of a second.
    const L=LT.lapse;
    if(!L||now>=L.next){
      const W=Math.max(LT.span, L?T-L.T:0), id=G.id+'|lapse|'+Math.floor(T), rng=mulberry32(metHash(id)), n=Math.min(6, ltPoisson(rng, G.total*W)), got=[];
      for(let i=0;i<n;i++){ const fl=ltMake(G, T, rng, id+'|'+i); const [I, I1]=ltSeen(fl, fl.t0+(fl.cg?0:0.6*fl.dur)); got.push({fl, I, I1, d:Math.hypot(fl.x-vrX, fl.y-vrY)}); }
      got.sort((a, b)=>b.I/(b.d+2000)**2-a.I/(a.d+2000)**2);
      LT.lapse={T, at:now, next:now+400+600*rng(), list:got.slice(0, 1)};
    }
    const k=Math.exp(-(now-LT.lapse.at)/120);
    if(k>0.02) out=LT.lapse.list.map(a=>({fl:a.fl, I:a.I*k, I1:a.I1*k}));
  }else{
    LT.lapse=null;
    for(let b=Math.floor((T-1.5)/LT_BIN);b<=Math.floor(T/LT_BIN);b++) for(const fl of ltBin(ltGrid(key, minOf(b*LT_BIN)), b)){
      if(T<fl.t0||T>fl.t0+fl.dur+0.5) continue;
      const [I, I1]=ltSeen(fl, T);
      if(I>1e4) out.push({fl, I, I1});
    }
  }
  for(const a of out){
    const dx=a.fl.x-vrX, dy=a.fl.y-vrY, d=Math.hypot(dx, dy);
    if(d<LT_REACH){ a.d=d; LT.active.push(a); }
  }
  LT.active.sort((a, b)=>b.I/(b.d+2000)**2-a.I/(a.d+2000)**2);
  LT.active.length=Math.min(LT.active.length, 8);
  return LT.active.length>0;
}
// The channel's color, from its spectrum (spectrum.js grid) for the epoch's air, as linear sRGB of
// unit luminance: ionized nitrogen's lines (N II 500.5 nm the strongest), oxygen's 777.4 nm, Hα
// from the water in the air, neutral nitrogen near 745 nm, from the spectra of Orville (1968)
// and Walker & Christian (2017), over the continuum of the channel as it cools, taken at 8,000 K
// and half again the lines' light over the flash: a blue-white, as lightning is seen. In
// CO₂-rich air, carbon's lines (C II 426.7 and 658 nm), CN's violet band at 388 nm and the CO
// Ångström bands, as in sparks in CO₂ and N₂: an estimate, no such lightning having been seen.
function ltTint(key){
  const id=airFor(key);
  if(LT.tints[id]) return LT.tints[id];
  const air=(key===EP[dIdx].key?airNow():EP.find(e=>e.key===key)||{}).air||{O:0.21, N:0.79, C:0};
  const Or=Math.min(1.5, (air.O||0)/0.21), Nr=Math.min(1.3, (air.N||0)/0.79), Cr=Math.min(1, (air.C||0)/0.3);
  const lines=[[399.5, 0.3*Nr], [463.0, 0.6*Nr], [500.5, 1.0*Nr], [517.9, 0.2*Nr], [567.9, 0.8*Nr], [594.2, 0.3*Nr], [648.2, 0.3*Nr], [661.1, 0.3*Nr],
    [742.4, 0.15*Nr], [744.2, 0.25*Nr], [746.8, 0.4*Nr], [777.4, 1.0*Or], [615.7, 0.15*Or], [715.7, 0.1*Or], [434.9, 0.15*Or], [441.5, 0.15*Or], [464.9, 0.2*Or],
    [656.3, 0.8], [486.1, 0.2], [426.7, 0.6*Cr], [657.8, 0.4*Cr], [658.3, 0.3*Cr], [723.6, 0.2*Cr]];
  for(const [l, w] of MET_CO) lines.push([l, 2*w*Cr]);
  if(Cr>0.05&&Nr>0.05) lines.push([388.3, 0.8*Math.min(Cr, Nr)]);
  const S=spLines(lines);
  let tot=0; for(let i=0;i<SP_N;i++) tot+=S[i];
  const C=spPlanck(8000); let ct=0; for(let i=0;i<SP_N;i++) ct+=C[i];
  for(let i=0;i<SP_N;i++) S[i]+=1.5*tot*C[i]/ct;
  const X=[0, 0, 0];
  for(let i=0;i<SP_N;i++) for(let q=0;q<3;q++) X[q]+=S[i]*SP_CMF[i][q];
  const lin=xyzLin(X).map(c=>Math.max(0, c)), y=0.2126*lin[0]+0.7152*lin[1]+0.0722*lin[2]||1;
  return LT.tints[id]=lin.map(c=>c/y);
}
// The way from the eye to a point d m off along the ground, through the air near the ground (its
// extinction at the zenith, k mag, spread over 6 km) and the rain of the storms in between (σ =
// 0.25 R^0.63 km⁻¹ for R mm/h): its transmission in linear r, g, b. The rain blurs a channel
// seen through it (img), but its drops scatter forward and absorb next to nothing, so most of
// the light still gets through, spread out: the light on the scene (light) loses a sixth as
// much, and the glow in the clouds, seen through the rain the composite draws, none (air).
function ltThrough(f, x, y, d){
  const k=extK(EP[dIdx].key), tV=0.921*k*d/6000;
  let tr=0;
  if(f.rain.conv+f.rain.strat>0) for(let i=0;i<6;i++){
    const s=(i+0.5)/6, m=rainMapAt(f, vrX+(x-vrX)*s, vrY+(y-vrY)*s);
    if(m.rain>0.05) tr+=0.25*Math.pow(m.rain, 0.63)*d/6/1000;
  }
  const air=[0.8, 1, 1.3].map(c=>Math.exp(-tV*c));
  return {air, img:air.map(c=>c*Math.exp(-Math.min(tr, 30))), light:air.map(c=>c*Math.exp(-Math.min(tr, 30)/6))};
}
// The eye-relative place of world point (x, y, z), lowered by the curve of the 833 km shell the
// passes draw the clouds and the rain on. The ground is drawn flat, so a channel's points take a
// share of the drop that runs from all of it at the cloud base (zb) to none at the ground (zg):
// it hangs from the clouds drawn and comes down on the ground drawn, its foot never dipping below
// the horizon.
function ltRel(x, y, z, ez, zg=null, zb=null){
  const dx=x-vrX, dy=y-vrY, k=zg==null?1:Math.min(1, Math.max(0, (z-zg)/Math.max(1, zb-zg)));
  return [dx, dy, z-ez-k*(dx*dx+dy*dy)/(2*LT_R)];
}
// For the paint: the brightest flash's light on the scene, as a fireball's (meteors.js
// metUniforms fire: its direction, magnitude and color), its illuminance at the eye (lux), and
// the glow of up to four flashes in the clouds, for the composite (shader_present.js): ltP, each
// place (eye-relative, m) and the glow's radius; ltC, the linear light it adds to the cloud there.
// A flash lights the cloud about it as a lamp in fog does: its light leaves the cloud spread over
// some 3 km (2 for the base above a channel), as if the cloud there took 4I/R² of illuminance,
// shown as the clouds take a fireball's light (vr_paint.js fbCloud). Through a cloud the light on
// the ground is about half what a channel in the open gives.
function ltUniforms(ez, night){
  const P=new Float32Array(16), C=new Float32Array(16), none={fire:null, E:0, glow:{n:0, P, C}};
  if(!LT.active.length||!vrGL.field) return none;
  const f=vrGL.field, key=EP[dIdx].key, tint=ltTint(key), Efull=Math.pow(10, -0.4*(MOON_V_FULL+13.99)), Esun=Math.pow(10, -0.4*(MOON_V_SUN+13.99));
  let n=0, best=null, bestE=0;
  for(const a of LT.active){
    const fl=a.fl, tr=ltThrough(f, fl.x, fl.y, a.d), lit=tint.map((c, q)=>c*tr.light[q]), Y=0.2126*lit[0]+0.7152*lit[1]+0.0722*lit[2], glo=tint.map((c, q)=>c*tr.air[q]);
    // The light on the eye's scene, from the lower channel or the cloud's base.
    const zL=fl.cg?fl.ground+0.4*(fl.base-fl.ground):fl.base, L=ltRel(fl.x, fl.y, zL, ez), dl=Math.max(200, Math.hypot(...L));
    const E=a.I*(fl.cg?1:0.5)*Y/(dl*dl);
    // From the channel's direction raised toward the zenith: the lit cloud base overhead sends
    // much of it down, as the overcast does the daylight.
    const up=[L[0]/dl, L[1]/dl, L[2]/dl+0.8], ul=Math.hypot(...up);
    if(E>bestE){ bestE=E; best={dir:up.map(v=>v/ul), mag:-13.99-2.5*Math.log10(Math.max(E, 1e-30)), rgb:lit.map(c=>255*g(Math.min(1, c/Math.max(...lit))))}; }
    if(n<4){
      const R=fl.cg?2000:3000, Ec=4*a.I/(R*R), Nv=1.5*(1-Math.exp(-0.4*Math.sqrt(Ec/Efull)))*night;
      const v=Math.pow(Math.pow(Nv, 2.2)+Ec/Esun*3.2/0.6, 1/2.2), add=0.6*Math.pow(v, 2.2);
      const G=ltRel(fl.x, fl.y, fl.cg?fl.base+200:fl.base+0.3*(fl.top-fl.base), ez);
      P.set([G[0], G[1], G[2], R], n*4); C.set([glo[0]*add, glo[1]*add, glo[2]*add, 0], n*4); n++;
    }
  }
  return {fire:best, E:bestE, glow:{n, P, C}};
}
// The channel of a flash to the ground: a walk down from the cloud base to a point up to 2 km
// aside, in steps of 40-100 m that keep a third of their heading, bend toward the target and
// wander (lightning's tortuosity, some 16° a step), with branches from the stepped leader that
// die out in the air, and theirs. Each segment is [a, b, w]: world points and the share of the
// first stroke's light it carries (1 on the main channel; the branches, lit only by the first
// stroke, fade toward their tips). Made once, from the flash's own seed.
function ltBolt(fl){
  if(fl.segs) return fl.segs;
  const rng=mulberry32(metHash(fl.id+'|bolt')), segs=[], zg=fl.ground, G=[fl.x+2000*(rng()-0.5), fl.y+2000*(rng()-0.5), zg];
  const norm=v=>{ const l=Math.hypot(...v)||1; return v.map(c=>c/l); };
  const walk=(p, dir, steps, w0, depth, target)=>{
    for(let s=0;s<steps&&segs.length<240;s++){
      const tgt=target?norm([target[0]-p[0], target[1]-p[1], target[2]-p[2]]):dir;
      let d=norm([0.35*dir[0]+0.4*tgt[0]+0.45*gauss01(rng), 0.35*dir[1]+0.4*tgt[1]+0.45*gauss01(rng), 0.35*dir[2]+0.4*tgt[2]+0.3*gauss01(rng)]);
      if(d[2]>-0.25) d=norm([d[0], d[1], -0.25-0.3*rng()]);
      const len=40+60*rng();
      let q=[p[0]+d[0]*len, p[1]+d[1]*len, p[2]+d[2]*len];
      const w=target?1:w0*(1-s/steps)*0.9+0.05;
      if(q[2]<=zg){ const k=(p[2]-zg)/Math.max(1e-6, p[2]-q[2]); q=[p[0]+(q[0]-p[0])*k, p[1]+(q[1]-p[1])*k, zg]; segs.push([p, q, w]); return; }
      segs.push([p, q, w]);
      if(depth<2&&q[2]>zg+150&&rng()<(depth?0.05:0.12)){
        const h=norm([d[0]+1.2*gauss01(rng), d[1]+1.2*gauss01(rng), -0.4-0.6*rng()]);
        walk(q, h, 4+Math.floor(12*rng()), target?0.45:w*0.6, depth+1, null);
      }
      p=q; dir=d;
    }
  };
  walk([fl.x, fl.y, fl.base], norm([G[0]-fl.x, G[1]-fl.y, zg-fl.base]), 200, 1, 0, G);
  return fl.segs=segs;
}
// The channels, in their own pass over the clouds' composite (vr_paint.js), as segments: each a
// quad about it, lit as a line source of the flash's light spread along the channel (cd/m), seen
// as a core about 1 m wide (or a pixel's width) and a glare about it carrying 4% of the light, as
// the eye's own scattering spreads a bright line, both taken through the display curve over the
// sky behind. The land in front hides them (hitInfo), and so does the ground beyond which they
// stand; the clouds hide the parts within them: only the channel below the base is drawn.
const LTVS=`#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec4 aSeg;
layout(location=2) in vec4 aW;
layout(location=3) in vec2 aD;
layout(location=4) in vec3 aC;
out vec4 vSeg; out vec4 vW; out vec2 vD; out vec3 vC;
void main(){ vSeg=aSeg; vW=aW; vD=aD; vC=aC; gl_Position=vec4(aPos, 0.0, 1.0); }`;
const LTFS=`#version 300 es
precision highp float;
uniform sampler2D sky, hitInfo;
uniform vec2 res; uniform float yaw, pitch, fov, showScn, nr, na, eyeZ;
uniform vec4 toneU;
in vec4 vSeg; in vec4 vW; in vec2 vD; in vec3 vC;
out vec4 fragColor;
${TONE_GLSL}
${VIEW_RAY_GLSL}
float erfA(float x){ float x2=x*x; return sign(x)*sqrt(1.0-exp(-x2*(1.27324+0.147*x2)/(1.0+0.147*x2))); }
// A line from A to B of unit light per pixel of its length, blurred by a Gaussian of width s, at
// p: its parts along the segment add to the whole line's, so the joints don't brighten.
float lineG(vec2 p, vec2 A, vec2 B, float s){
  vec2 ab=B-A; float L=length(ab);
  vec2 t=L>1e-4?ab/L:vec2(1.0, 0.0), q=p-A;
  float a=dot(q, t), dn=dot(q, vec2(-t.y, t.x));
  return exp(-0.5*dn*dn/(s*s))*0.5*(erfA((L-a)/(1.41421*s))+erfA(a/(1.41421*s)));
}
void main(){
  vec2 p=gl_FragCoord.xy, A=vSeg.xy, B=vSeg.zw, ab=B-A;
  float r=vW.z*lineG(p, A, B, vW.x)+vW.w*lineG(p, A, B, vW.y);
  if(r<1.0e-6) discard;
  if(showScn>0.5){
    float L2=dot(ab, ab), s=L2>1e-6?clamp(dot(p-A, ab)/L2, 0.0, 1.0):0.0;
    vec4 h=texture(hitInfo, p/res);
    if(h.g>0.5 && h.r>0.0 && h.r<mix(vD.x, vD.y, s)) discard;
  }
  vec3 rd=viewRay(p, res, fov, yaw, pitch);
  // Nor any beyond the ground in front, drawn flat.
  if(rd.z<0.0 && mix(vD.x, vD.y, clamp(dot(p-A, ab)/max(dot(ab, ab), 1e-6), 0.0, 1.0))>max(eyeZ, 0.5)/(-rd.z)*1.02+20.0) discard;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float el=asin(clamp(rd.z, -1.0, 1.0))*57.2957795;
  float rBg=el<0.0?0.0:pow(10.0, texture(sky, vec2((fract(comp/6.28318530718)*na+0.5)/(na+1.0), ((90.0-el)/90.0*nr+0.5)/(nr+1.0))).a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)});
  float t0=toneT(rBg), t1=toneT(rBg+r);
  // The light it adds takes its color, giving way to white near the display's white, as
  // overexposed light does; the sky behind keeps its own.
  vec3 c=min(vec3(1.0), t0+(t1-t0)*mix(vC, vec3(1.0), smoothstep(0.6, 1.0, t1)));
  fragColor=vec4(max(lin2s3(c)-vec3(lin2s(t0)), vec3(0.0)), 0.0);
}`;
function ltDrawVR(gl, c, ez){
  const list=LT.active.filter(a=>a.fl.cg);
  if(!list.length||!skyNow) return;
  if(!LT.job){
    const vs=glShader(gl, gl.VERTEX_SHADER, LTVS);
    if(!vs) return;
    LT.job=glProgramAsync(gl, vs, LTFS);
    whenLinked(gl, [LT.job], p=>{
      if(!p) return;
      LT.u=uniformLocs(gl, p, ['res', 'yaw', 'pitch', 'fov', 'showScn', 'nr', 'na', 'toneU', 'eyeZ']);
      gl.useProgram(p); bindSamplers(gl, p, [['sky', 0], ['hitInfo', 10]]); gl.useProgram(vrGL.prog);
      LT.vao=gl.createVertexArray(); LT.buf=gl.createBuffer();
      gl.bindVertexArray(LT.vao); gl.bindBuffer(gl.ARRAY_BUFFER, LT.buf);
      const st=15*4, at=(i, n, o)=>{ gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, st, o*4); };
      at(0, 2, 0); at(1, 4, 2); at(2, 4, 6); at(3, 2, 10); at(4, 3, 12);
      gl.bindVertexArray(null);
      LT.prog=p; requestVR();
    });
  }
  if(!LT.prog) return;
  const f=vrGL.field, W=c.width, H=c.height, fovR=vrFov*Math.PI/180, fy=Math.tan(fovR/2), fx=fy*W/H, pixA=2*fy/H;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const tint=ltTint(EP[dIdx].key), rCd=skyNow.rCd, data=[];
  // Pixel place and distance of eye-relative point v, or null behind the eye.
  const proj=v=>{
    const d=Math.hypot(...v), depth=(v[0]*sy*cp+v[1]*cy*cp+v[2]*sp)/d;
    if(depth<0.02) return null;
    return [((v[0]*cy-v[1]*sy)/d/depth/fx*0.5+0.5)*W, ((-v[0]*sy*sp-v[1]*cy*sp+v[2]*cp)/d/depth/fy*0.5+0.5)*H, d];
  };
  for(const a of list){
    const fl=a.fl, segs=ltBolt(fl), tr=ltThrough(f, fl.x, fl.y, a.d).img, col=tint.map((q, i)=>q*tr[i]/tr[1]);
    // cd per meter of the main channel, now; the branches have the first stroke's alone.
    const Jm=a.I/fl.L, Jb=a.I1/fl.L;
    for(const [A, B, w] of segs){
      const J=(w>=1?Jm:Jb*w)*tr[1];
      if(!(J>0)) continue;
      const pa=proj(ltRel(...A, ez, fl.ground, fl.base)), pb=proj(ltRel(...B, ez, fl.ground, fl.base));
      if(!pa||!pb) continue;
      const d=0.5*(pa[2]+pb[2]), sc=Math.max(0.7, 1/d/pixA), sh=Math.min(60, Math.max(4, 0.004/pixA));
      const r0=J/(d*sc*pixA*2.5066)/rCd, rh=0.04*J/(d*sh*pixA*2.5066)/rCd;
      // Unit light per pixel of length: the line integral of lineG's Gaussian across is s·√(2π).
      const pad=3*sh, dx=pb[0]-pa[0], dy=pb[1]-pa[1], L=Math.hypot(dx, dy)||1, tx=dx/L, ty=dy/L, nx=-ty, ny=tx;
      if(Math.max(pa[0], pb[0])+pad<0||Math.min(pa[0], pb[0])-pad>W||Math.max(pa[1], pb[1])+pad<0||Math.min(pa[1], pb[1])-pad>H) continue;
      const corner=(px, py, s, t)=>[px+(s*tx+t*nx)*pad, py+(s*ty+t*ny)*pad];
      const q=[corner(pa[0], pa[1], -1, -1), corner(pb[0], pb[1], 1, -1), corner(pb[0], pb[1], 1, 1), corner(pa[0], pa[1], -1, 1)];
      for(const k of [0, 1, 2, 0, 2, 3]) data.push(q[k][0]/W*2-1, q[k][1]/H*2-1, pa[0], pa[1], pb[0], pb[1], sc, sh, r0, rh, pa[2], pb[2], col[0], col[1], col[2]);
    }
  }
  if(!data.length) return;
  const u=LT.u;
  gl.useProgram(LT.prog);
  gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo||vrGL.noHitInfo);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vrGL.tex);
  gl.uniform2f(u.res, W, H); gl.uniform1f(u.yaw, yaw); gl.uniform1f(u.pitch, pitch); gl.uniform1f(u.fov, fovR);
  gl.uniform1f(u.showScn, vrScenery&&vrGL.hitInfo?1:0); gl.uniform1f(u.nr, skyNow.nr); gl.uniform1f(u.na, skyNow.na);
  gl.uniform4f(u.toneU, skyNow.toneK, skyNow.toneP, 0.95, TOE_CD); gl.uniform1f(u.eyeZ, ez);
  gl.bindVertexArray(LT.vao); gl.bindBuffer(gl.ARRAY_BUFFER, LT.buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STREAM_DRAW);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.drawArrays(gl.TRIANGLES, 0, data.length/15);
  gl.disable(gl.BLEND); gl.bindVertexArray(null);
  gl.useProgram(vrGL.prog);
}
// For the clock line: ' · thunderstorm' with flashes within 20 km more than one a minute,
// ' · lightning' with any within LT_REACH every five minutes or so.
function ltLabel(){ return LT.near>1?' · thunderstorm':LT.far>0.2?' · lightning':''; }
