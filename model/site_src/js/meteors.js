// Meteors: each one a meteoroid entering the air along a straight path, drawn as it would be seen
// from the ground, tied to the sky's time (metBin) so a moment always has the same ones.
//
// Today (dark site, naked eye): about 8 sporadic meteors an hour averaged over the night, 2–5 in
// the evening and about 10 before dawn, when the apex of the Earth's motion is up (Dubietis & Arlt
// 2010). Brightness: N(<m) ∝ r^m with r = 3.0 for ordinary meteors (the IMO's sporadic value) and
// r = 2.3 brighter than magnitude 1 (s ≈ 1.9, Brown et al. 2002 for metre bodies). The scale is
// set by the fireballs, which are not lost to inattention: one of magnitude −4 or brighter per
// observer about every 25 hours (AMS fireball FAQ; Suggs et al. 2014's lunar flash flux agrees).
// The eye misses faint meteors, so the fireball rate, carried down the distribution, gives far more
// than are seen. A meteor is drawn in full 4.2 magnitudes brighter than the faintest star seen
// around it, fading out 1.8 magnitudes fainter than that, which leaves about 11 an hour over the
// whole of a dark sky (one observer, watching part of it, sees about 8).
// Radiants are the sporadic sources (Jones & Brown 1993): the apex (about 56 km/s), helion and
// antihelion 70° either side of it in the ecliptic (about 30 km/s), the toroidal sources 58° north
// and south of the apex, and a few from anywhere; plus slow asteroidal meteoroids (below 17 km/s
// mostly asteroidal, Do, Brown & Pokorný 2026) radiating broadly from near the helion and
// antihelion. Only radiants above the meteor's horizon give meteors, in proportion to the sine of
// their height, so the morning sky has the most.
// Brightness, mass and speed: Jacchia, Verniani & Briggs 1967, M = 55.34 − 8.75 log v − 2.25 log m
// (v in cm/s, m in g): magnitude 0 is about a gram at 20 km/s, 0.06 g at 40 and 0.01 g at 70. Begin heights 85 + 0.6(v − 12) km up to 125 (Ceplecha et al.
// 1998), end heights near 80 km for faint meteors and down to 20–60 km for fireballs.
//
// Through time (meteor rate relative to today at the same brightness):
//   - The bombardment: Neukum et al. 2001's lunar chronology gives 7,900 times today at 4.4 Ga,
//     490 at 4.0 and 124 at 3.8 Ga; whether the flux fell steadily from the Moon's birth
//     (Morbidelli et al. 2018) or rose again near 4.1 Ga, those are the rates. Taken as 500
//     and 120 at 4.0 and 3.8 Ga. The impactors then had a main-belt-like size distribution (Strom et al. 2015),
//     richer in large bodies, so fireballs make up more of them; and before 4.15 Ga they hit at
//     about 16 km/s (Marchi et al. 2014), so most meteors were slow and yellow-orange.
//   - 2.7 Ga: twice today, from the long tail of leftovers and the E-belt (Bottke et al. 2012);
//     2.2 Ga 1.3 times.
//   - 700 and 300 Ma: lunar craters were made at 0.4 of today's rate before 290 Ma (Mazrouei et al.
//     2019; disputed by Lagain et al. 2022): taken as 0.6 at 700 Ma (the tail of the Eulalia
//     shower, Bottke et al. 2026) and 0.5 at 300 Ma.
//   - 466 Ma: the L-chondrite parent body's break-up (Schmitz et al. 2019). Decimetre meteoroids,
//     the fireballs, rose about 100 times, and millimetre grains 100–1000 times, so the
//     distribution steepens: here 100 times today's fireballs and r = 3.4 for faint meteors. The
//     fragments came from the inner main belt on low orbits, so they were slow (15–20 km/s) and
//     yellow with sodium. And if Earth had a ring (debris.js), its grains fell back too: at the
//     equator, at about 8 km/s, long grazing fireballs crossing the sky from west to east.
//   - 4.55 and 4.50 Ga: the leftovers of the planets' growth, and after the giant impact its debris:
//     the chronology run back past 4.4 Ga, taken as 30,000 and 10,000 times today.
// Heights: in the Early Hadean's 30 bar of CO₂ every density level sits higher, so meteors burn
// about 22 km higher up (in the proto-Earth's guessed 4 bar, 9 km); elsewhere the difference is a few kilometres and is left out.
const MET_EPOCH={
  protoearth455:{F:30000, rf:3.0, rb:2.0, mix:{aster:0.9, iso:0.1}, dh:9, flash:1},
  hadean45:{F:10000, rf:3.0, rb:2.0, mix:{aster:0.85, iso:0.15}, dh:22, flash:1},
  hadean40:{F:500, rf:3.0, rb:2.1, mix:{aster:0.6, apex:0.15, iso:0.25}, flash:1},
  archean38:{F:120, rf:3.0, rb:2.15, mix:{aster:0.6, apex:0.15, helion:0.1, antihelion:0.1, iso:0.05}, flash:1},
  archean27thin:{F:2, mix:{aster:0.3}}, archean27:{F:2, mix:{aster:0.3}}, archean27vthick:{F:2, mix:{aster:0.3}},
  proterozoic22:{F:1.3}, snowball07:{F:0.6}, carbon30:{F:0.5},
  ordovician466:{F:100, rf:3.4, rb:2.3, mix:{aster:0.8, apex:0.07, helion:0.05, antihelion:0.05, iso:0.03}, ring:0.25, flash:1},
};
// Today's mix of sources, by number among naked-eye meteors.
const MET_MIX_TODAY={apex:0.28, helion:0.2, antihelion:0.2, toroidal:0.12, iso:0.08, aster:0.12};
function metEpoch(key){
  const e=MET_EPOCH[key]||{};
  const mix=Object.assign({}, e.mix&&Object.keys(e.mix).length>1?{}:MET_MIX_TODAY, e.mix||{});
  return {F:e.F??1, rf:e.rf??3.0, rb:e.rb??2.3, mix, dh:e.dh||0, ring:e.ring||0, flash:e.flash||0};
}
const MET_D=1100, MET_RE=6371;           // km: the ground radius meteors are placed over, Earth's radius
const MET_PERCEPT=3.4;                    // the limit for meteors, this much brighter than for stars
// Meteors an hour with absolute magnitude M ≤ 1 placed over the disc today (before the cut for
// radiants below the horizon), set by a Monte Carlo of this code to give 0.04 fireballs of
// apparent magnitude −4 or brighter an hour, and the whole dark sky's visible count that leaves.
const MET_Q1=128, MET_VIS_TODAY=11;
// Cumulative number with absolute magnitude ≤ M, relative to M ≤ 1.
function metCum(E, M){ return M>=1?Math.pow(E.rf, M-1):Math.pow(E.rb, M-1); }
// Magnitude between lo and hi (lo may be −Infinity) from uniform U.
function metDrawM(E, lo, hi, U){
  const c0=lo===-Infinity?0:metCum(E, lo), n=c0+Math.max(U, 1e-9)*(metCum(E, hi)-c0);
  return n>=1?1+Math.log(n)/Math.log(E.rf):1+Math.log(n)/Math.log(E.rb);
}
// Mass in grams from absolute magnitude and speed (Jacchia, Verniani & Briggs 1967).
function metMass(M, v){ return Math.pow(10, (55.34-8.75*Math.log10(v*1e5)-M)/2.25); }
// Every random draw comes from metRng, seeded per second of sky time (metBin), so the same
// moment always has the same meteors.
let metRng=Math.random;
function metRand(){ return metRng(); }
function metHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h, 16777619); } return h>>>0; }
function metGauss(){ return gauss01(metRng); }
// A direction near d, scattered by about sd degrees.
function metScatter(d, sd){
  const a=Math.abs(d[2])<0.9?[0, 0, 1]:[1, 0, 0], e1=vnorm(vcross(a, d)), e2=vcross(d, e1), s=sd*Math.PI/180;
  return vnorm(vadd(d, vscale(e1, metGauss()*s), vscale(e2, metGauss()*s)));
}
function metPick(mix){ let u=metRand()*Object.values(mix).reduce((a, b)=>a+b, 0); for(const k in mix){ u-=mix[k]; if(u<=0) return k; } return 'iso'; }
// Radiant (unit vector the meteoroid comes from) and speed for a source.
function metRadiant(src, F){
  const c70=Math.cos(70*Math.PI/180), s70=Math.sin(70*Math.PI/180), c58=Math.cos(58*Math.PI/180), s58=Math.sin(58*Math.PI/180);
  const clamp=(v, a, b)=>Math.max(a, Math.min(b, v));
  switch(src){
    case 'apex': return {d:metScatter(vnorm(vadd(F.apex, vscale(F.N, (metRand()<0.5?-1:1)*0.25), [0, 0, 0])), 12), v:clamp(56+7*metGauss(), 38, 72)};
    case 'helion': return {d:metScatter(vnorm(vadd(vscale(F.apex, c70), vscale(F.se, s70), [0, 0, 0])), 11), v:clamp(30+6*metGauss(), 15, 50)};
    case 'antihelion': return {d:metScatter(vnorm(vadd(vscale(F.apex, c70), vscale(F.se, -s70), [0, 0, 0])), 11), v:clamp(30+6*metGauss(), 15, 50)};
    case 'toroidal': return {d:metScatter(vnorm(vadd(vscale(F.apex, c58), vscale(F.N, metRand()<0.5?s58:-s58), [0, 0, 0])), 10), v:clamp(36+6*metGauss(), 20, 55)};
    case 'aster': { const side=metRand()<0.5?1:-1; return {d:metScatter(vnorm(vadd(vscale(F.apex, 0.5), vscale(F.se, side*0.87), [0, 0, 0])), 32), v:Math.min(11.6+Math.abs(5.5*metGauss()), 30)}; }
    default: { let d; do{ d=[metGauss(), metGauss(), metGauss()]; }while(Math.hypot(...d)<1e-6); return {d:vnorm(d), v:15+55*metRand()}; }
  }
}
// Brighter than this, a stony or asteroidal meteoroid (tens of metres across) is not stopped by the
// air: it keeps its speed and strikes the ground, as Meteor Crater's iron did; smaller ones break up
// and burst in the air, as Chelyabinsk did at about 30 km.
const MET_GROUND=-24;
// Begin and end heights, km.
function metHeights(M, v, dh){
  const hb=Math.min(125, 85+0.6*(v-12))+Math.min(10, 1.5*Math.max(0, -M));
  const he=Math.max(22, 82+0.15*(v-12)-5*Math.max(0, 2-M)*(1-0.006*(v-12)));
  return [hb+dh, Math.min(he, hb-6)+dh];
}
// The observer is at the origin of the horizon frame (x east, y north, z up), Earth's centre at
// (0, 0, −R). A meteor runs from B along unit u for L km.
function metMake(E, F, lo, hi, ctx){
  const src=metPick(E.mix), rad=metRadiant(src, F);
  // Where: uniform over the disc of ground radius MET_D.
  const sg=MET_D*Math.sqrt(metRand()), az=2*Math.PI*metRand(), th=sg/MET_RE;
  const n=[Math.sin(th)*Math.sin(az), Math.sin(th)*Math.cos(az), Math.cos(th)];
  // Flux through the local horizontal goes as the sine of the radiant's height there.
  const sinH=vdot(rad.d, n);
  if(!(sinH>0.02) || metRand()>sinH) return null;
  const M=metDrawM(E, lo, hi, metRand());
  return metPath(M, rad.v, rad.d, n, E, ctx, src);
}
function metPath(M, v, radDir, n, E, ctx, src){
  const rho=src==='aster'||src==='ring'?3.3:(src==='apex'||src==='toroidal'?0.8:1.5), ground=M<=MET_GROUND&&rho>=1.5;
  const hh=metHeights(M, v, E.dh), hb=hh[0], he=ground?0:hh[1], u=vscale(radDir, -1), R=MET_RE;
  const B=[n[0]*(R+hb), n[1]*(R+hb), n[2]*(R+hb)-R];
  const bp=(R+hb)*vdot(n, u), c=(R+hb)*(R+hb)-(R+he)*(R+he);
  let L=bp*bp>c?-bp-Math.sqrt(bp*bp-c):-bp;
  L=Math.max(3, Math.min(L, ground?2000:600));
  const T=L/v;
  // Peak point, for a first look at whether it can be seen at all.
  const P=vadd(B, vscale(u, L*0.65), [0, 0, 0]), d=Math.hypot(...P), el=Math.asin(P[2]/d)*180/Math.PI;
  if(el<-0.5) return null;
  const mPeak=M+5*Math.log10(d/100)-2.5*Math.log10(Math.max(extinction(el, ctx.k), 1e-9))+(ctx.k-0.25);
  if(mPeak>ctx.mShow+0.5) return null;
  const flares=[];
  if(M<-1||metRand()<0.25){ const nf=1+Math.floor(metRand()*(M<-4?3:2)); for(let i=0;i<nf;i++) flares.push([0.45+0.5*metRand(), 0.6+metRand()*(M<-3?5:2), 0.015+0.03*metRand()]); }
  // The impact: a flash as the body meets the ground.
  if(ground) flares.push([0.99, 8, 0.008]);
  const mass=metMass(M, v);
  const air=ctx.air, o2=air.O2||0;
  // Persistent trains need the air's oxygen and ozone (FeO and Na chemiluminescence).
  const tr=(o2>0.001&&((v>35&&M<-1)||M<-4)&&metRand()<0.75)?Math.min(150, 2*Math.pow(10, 0.13*(-M-1)))*Math.min(1, Math.sqrt(o2/0.21)):0;
  return {id:0, t0:0, T, B, u, L, v, M, mass, diam:Math.cbrt(6*mass/(Math.PI*rho)), rho, hb, he, src, flares, train:tr, ground,
    wake:Math.min(1.2, 0.08+0.04*Math.max(0, -M)), tint:metTint(v, ctx.key, src==='ring')};
}
// Light curve: rises to its peak 65% of the way along, then falls, with any flares on top. One
// that reaches the ground keeps brightening down into the thicker air until it strikes.
function metCurve(m, x){
  if(x<0||x>1) return 0;
  let f=m.ground?Math.pow(Math.min(x, 0.65)/0.65, 1.3)*(1+0.8*Math.max(0, x-0.65)/0.35):Math.pow(x/0.65, 1.3)*Math.pow((1-x)/0.35, 0.7);
  for(const [c, a, w] of m.flares) f+=a*Math.exp(-0.5*((x-c)/w)**2)*Math.pow(x/0.65, 0.5);
  return f;
}
function metPoint(m, x){ return vadd(m.B, vscale(m.u, m.L*x), [0, 0, 0]); }
// Apparent magnitude at fraction x along, through the air (as starThroughAir does).
function metApparent(m, x, k){
  const P=metPoint(m, x), d=Math.hypot(...P), el=Math.asin(P[2]/d)*180/Math.PI;
  const f=metCurve(m, x);
  if(!(f>0)||el<-0.5) return {mag:99, el, dir:[P[0]/d, P[1]/d, P[2]/d]};
  return {mag:m.M-2.5*Math.log10(f)+5*Math.log10(d/100)-2.5*Math.log10(Math.max(extinction(el, k), 1e-9))+(k-0.25), el, dir:[P[0]/d, P[1]/d, P[2]/d]};
}
// The emission, 380–780 nm on spectrum.js's 1 nm grid: the meteoroid's metals at about 4,500 K
// (Na, Mg, Fe, Ca, Cr, Mn, K), the hot second component at about 10,000 K that grows with speed
// (Ca II, Mg II, Si II, Fe II, and Hα from cometary grains), the air's own atoms and molecules,
// also growing with speed, and a warm continuum (Borovička 1993, 1994). Slow meteors are rich in
// sodium: at 10 km/s the D lines are boosted tens of times (Matlovič et al. 2020). The air's
// part follows its atoms: O I 777 and 616 nm, N I near 745 nm and the N₂ first positive bands
// with the nitrogen, and, in CO₂-rich air, CO Ångström bands and, with nitrogen too, CN at 388 nm.
// No spectrum of a meteor in CO₂ air has been measured, so that part is an estimate.
const MET_MAIN=[[589.0, 1.0], [589.6, 0.5], [516.7, 0.25], [517.3, 0.6], [518.4, 1.0], [382.0, 0.5], [382.6, 0.2], [385.6, 0.25], [385.9, 0.35], [388.6, 0.2],
  [404.6, 0.45], [406.4, 0.3], [407.2, 0.2], [426.0, 0.25], [427.2, 0.15], [430.8, 0.2], [432.6, 0.25], [438.4, 0.45], [440.5, 0.3], [495.8, 0.1], [527.0, 0.35],
  [532.8, 0.3], [537.1, 0.2], [540.6, 0.12], [422.7, 0.35], [425.4, 0.12], [427.5, 0.1], [429.0, 0.07], [403.1, 0.12], [766.5, 0.12], [769.9, 0.06]];
const MET_HOT=[[393.4, 1.2], [396.8, 0.8], [448.1, 0.5], [634.7, 0.25], [637.1, 0.15], [492.4, 0.08], [501.8, 0.1], [516.9, 0.1]];
const MET_N2=[575.5, 580.4, 585.4, 590.6, 595.9, 601.4, 607.0, 612.7, 618.7, 625.3, 632.3, 639.5, 646.9, 654.5, 662.4, 670.5, 678.9, 687.5, 704.4, 716.3, 738.7, 750.4, 762.6, 775.3];
const MET_CO=[[451.1, 0.15], [483.5, 0.25], [519.8, 0.2], [561.0, 0.15], [607.9, 0.08], [662.0, 0.04]];
function metEmission(v, air, ring){
  const clamp01=x=>Math.max(0, Math.min(1, x)), Or=(air.O||0)/0.21, Nr=(air.N||0)/0.79, Cr=Math.min(1, (air.C||0)/0.3);
  const naBoost=1+4*clamp01((25-v)/14)+(ring?3:0), hot=1.2*Math.pow(clamp01((v-20)/45), 1.3), aw=1.5*Math.pow(clamp01((v-18)/50), 1.5);
  const lines=MET_MAIN.map(([l, w])=>[l, w*(l>588&&l<590?naBoost:1)]);
  for(const [l, w] of MET_HOT) lines.push([l, w*hot]);
  if(v>30) lines.push([656.3, 0.2*hot]);
  lines.push([777.4, 1.2*aw*Or], [615.7, 0.12*aw*Or], [742.4, 0.08*aw*Nr], [744.2, 0.12*aw*Nr], [746.8, 0.18*aw*Nr]);
  for(const [l, w] of MET_CO) lines.push([l, w*aw*Cr*2]);
  if(Cr>0.05&&Nr>0.05) lines.push([388.3, 0.3*aw*Math.min(Cr, Nr)*2]);
  const S=spLines(lines);
  // N₂ first positive: bands degraded to the blue, about 4 nm wide.
  if(Nr>0.01) for(const c of MET_N2) for(let i=0;i<SP_N;i++){ const x=SP_LAM[i]-c; if(x<1&&x>-12) S[i]+=0.08*aw*Nr/c*(x>0?Math.exp(-x/0.6):Math.exp(x/4))/4.6; }
  let tot=0; for(let i=0;i<SP_N;i++) tot+=S[i];
  const C=spPlanck(4500); let ct=0; for(let i=0;i<SP_N;i++) ct+=C[i];
  for(let i=0;i<SP_N;i++) S[i]+=0.25*tot*C[i]/ct;
  return S;
}
// Each meteor's colour, as stars have theirs (starTint: sRGB-like values over their luminance),
// from the emission, by speed in 2 km/s steps.
const metTints={};
function metTint(v, key, ring){
  const vb=Math.round(v/2)*2, id=key+'|'+vb+(ring?'r':'');
  if(metTints[id]) return metTints[id];
  const air=(EP.find(e=>e.key===key)||{}).air||{O:0.21, N:0.79, C:0, O2:0.21};
  const S=metEmission(vb, air, ring), X=[0, 0, 0];
  for(let i=0;i<SP_N;i++) for(let q=0;q<3;q++) X[q]+=S[i]*SP_CMF[i][q];
  const lin=xyzLin(X).map(c=>Math.max(0, c)), mx=Math.max(...lin)||1, s=lin.map(c=>255*g(c/mx));
  const y=0.2126*s[0]+0.7152*s[1]+0.0722*s[2]||1;
  return metTints[id]=s.map(c=>c/y*0.75+0.25);
}
// Display size and brightness for apparent magnitude m, as pointDisplay does for stars, but
// growing further for the brightest fireballs.
function metDisplay(m){ const d=magDisplay(m, 1e6, 0.2); return {px:d.px, amp:Math.min(1, 0.62*Math.sqrt(Math.max(d.flux, 0)))}; }
// How fully a meteor of apparent magnitude m shows against sky luminance L (cd/m²).
function metVisible(m, L){ const lim=nakedEyeLimit(L)-MET_PERCEPT; return 1-smooth01(lim-0.8, lim+1.0, m); }

// Lunar impact flashes: a meteoroid hitting the Moon's night side flashes for a tenth of a second
// to a few seconds. Today about 0.5 an hour reach magnitude 10 on the night side (Suggs et al.
// 2014; NELIOTA, Liakos et al. 2024), and N ∝ E^−0.9 gives a naked-eye one (≤ 5) once in about
// 100 hours. The flash is impact vapour and melt at 2,000–4,500 K, reddish. In the bombardment
// they come with the epoch's rate, and a closer Moon makes each brighter.
const FLASH_Q10=0.5, FLASH_R=2.5;
// The engine: active meteors, those just gone (for the tooltip), and the clock.
// The engine. Sky time T is in seconds (the page's day number times 86,400). The meteors of each
// second of it, [b, b+1), come from a generator seeded by the epoch, the latitude and b, in two
// streams: ordinary meteors (absolute magnitude above −1), looked back over the last 60 s for any
// still glowing, and the bright ones, rarer but with trains that can last minutes, over 160 s.
// Scrubbing back to a moment brings back its meteors, and pausing freezes them. Played in real
// time they fall at their true pace; faster, each frame is a snapshot of whatever is in the air.
// A third stream, made a minute at a time and looked back over 90 minutes, holds the superbolides
// (brighter than CT_BOLIDE), whose dust trails stay in the sky long after them (contrails.js).
const MET={list:[], gone:[], flashes:[], bolides:[], now:0, Tpage:0, drawnT:null, last:0, raf:0, timer:0, hover:null, ptr:null, cache:new Map(), dark:{}};
const MET_SPLIT=-1, MET_LOOK=[60, 160, 5400], MET_BIN=[1, 1, 60];
// The faintest meteor worth making, for the darkest sky the epoch has (no Moon, no Sun): its zenith
// limit for meteors, and the faintest absolute magnitude that could reach it from overhead.
function metDark(key){
  if(MET.dark[key]) return MET.dark[key];
  const k=extK(key), z=zodiK(key);
  const L=nightNatural(key)[1]*absZenith(key)+(SKYGLOW[key]?SKYGLOW[key][0]:0)+(z>1?(z-1)*60*S10_CD:0);
  const mShow=nakedEyeLimit(L)-MET_PERCEPT+1.0;
  return MET.dark[key]={mShow, Mcut:Math.min(8, mShow+0.5-(k-0.25)), lim:nakedEyeLimit(L)};
}
// The ecliptic frame at sky time T: the page's clock moved by T − Tpage seconds (a minute of the
// clock is dayHours × 2.5 s).
function metFrameAt(T){
  const save=minutes;
  minutes=save+(T-MET.Tpage)/(dayHours()*2.5);
  try{ return eclipticFrame(LATDEG[dLat]); } finally{ minutes=save; }
}
function metPoisson(l){ if(!(l>0)) return 0; if(l>40) return Math.max(0, Math.round(l+Math.sqrt(l)*metGauss())); let n=0, p=Math.exp(-l), s=p; const u=metRand(); while(u>s&&n<200){ n++; p*=l/n; s+=p; } return n; }
// The meteors (and lunar flashes) of bin b in stream s (a second, or a minute in stream 2), made once and kept.
function metBin(s, b){
  const ep=EP[dIdx], key=ep.key, id=key+'|'+dLat+'|'+s+'|'+b;
  let got=MET.cache.get(id);
  if(got) return got;
  got={met:[], fl:[]};
  const E=metEpoch(key), D=metDark(key), lo=[MET_SPLIT, CT_BOLIDE, -Infinity][s], hi=[D.Mcut, Math.min(MET_SPLIT, D.Mcut), CT_BOLIDE][s];
  const T0=b*MET_BIN[s], dT=MET_BIN[s];
  metRng=mulberry32(metHash(id));
  try{
    if(hi>lo||s){
      const F=metFrameAt(T0), ctx={key, k:extK(key), mShow:D.mShow, air:ep.air||{O:0.21, N:0.79, C:0, O2:0.21}};
      const rate=MET_Q1*E.F*(metCum(E, hi)-(lo===-Infinity?0:metCum(E, lo)))/3600*dT;
      const keep=(m, i)=>{ if(m){ m.t0=T0+dT*metRand(); m.id=id+'|'+i; got.met.push(m); } };
      const n=Math.min(metPoisson(rate), 2000);
      for(let i=0;i<n;i++) keep(metMake(E, F, lo, hi, ctx), i);
      // Ring debris, at the equator only: very slow, nearly horizontal, from the west.
      if(E.ring&&dLat==='Equator'&&ringOf(key)){
        const nr=metPoisson(rate*E.ring);
        for(let i=0;i<nr;i++){
          const M=metDrawM(E, lo, hi, metRand()), sg=MET_D*Math.sqrt(metRand()), az=2*Math.PI*metRand(), th=sg/MET_RE;
          const nn=[Math.sin(th)*Math.sin(az), Math.sin(th)*Math.cos(az), Math.cos(th)];
          // Eastward along the ring plane, dipping 1–4° into the air: the radiant is to the west.
          const east=vnorm(vcross(F.pole, nn)), dip=(1+3*metRand())*Math.PI/180;
          const u=vnorm(vadd(vscale(east, Math.cos(dip)), vscale(nn, -Math.sin(dip)), [0, 0, 0]));
          keep(metPath(M, 7.6+0.6*metRand(), vscale(u, -1), nn, E, ctx, 'ring'), 'r'+i);
        }
      }
      if(E.flash&&!s) flashBin(got, b, E, key, D, id);
      // Showers (showers.js), last, so the sporadics of the second stay as they were.
      if(s<2) showerBin(got, b, s, lo, hi, E, ctx, F, id);
    }
  }finally{ metRng=Math.random; }
  MET.cache.set(id, got);
  return got;
}
// Lunar flashes of second b, anywhere on the disc; the lit part of the Moon, or a Moon below the
// horizon, hides them when they are drawn.
function flashBin(got, b, E, key, D, id){
  // A closer Moon: the same impacts look brighter by 5 log of the distance ratio.
  const dm=5*Math.log10((MOON_RE[key]||MOON_RE_NOW)/MOON_RE_NOW);
  const mc=Math.min(10, D.lim-1+0.6-dm+0.5-(extK(key)-0.25));
  const n=metPoisson(FLASH_Q10*E.F*Math.pow(FLASH_R, mc-10)/3600);
  for(let i=0;i<n;i++){
    const mag=10+Math.log(metRand()*Math.pow(FLASH_R, mc-10))/Math.log(FLASH_R)+dm;
    let x=0, y=0; do{ x=2*metRand()-1; y=2*metRand()-1; }while(x*x+y*y>0.9);
    got.fl.push({id:id+'|f'+i, t0:b+metRand(), T:0.08+0.25*Math.pow(10, -0.2*(mag-5))*metRand()+0.05, x, y, mag, temp:2200+2200*metRand(), kind:'flash'});
  }
}
// A flash's direction: (x, y) on the disc in the Moon's east/north basis, for a disc radDeg wide.
function flashDir(f, radDeg){
  const mo=skyNow.moon, b=moonBasis(mo), s=Math.tan(radDeg*Math.PI/180);
  return vnorm(vadd(b.md, vscale(b.east, f.x*s), vscale(b.north, f.y*s)));
}
function flashLit(f, radDeg){ const l=moonLitAt(flashDir(f, radDeg), radDeg); return l==null?1:l; }
// One step: the sky time now, and what is in the air at it.
function metTick(now){
  MET.last=now;
  MET.Tpage=astroDay()*86400;
  const t=MET.now=MET.Tpage, list=[], gone=[], flashes=[], bolides=[];
  for(let s=0;s<3;s++) for(let b=Math.floor((t-MET_LOOK[s])/MET_BIN[s]);b<=Math.floor(t/MET_BIN[s]);b++){
    const got=metBin(s, b);
    for(const m of got.met){
      if(m.t0>t) continue;
      const end=m.t0+m.T;
      if(t<=end+Math.max(m.wake, m.train)) list.push(m);
      if(t>end&&t-end<3) gone.push(m);
      if(s===2) bolides.push(m);
    }
    for(const f of got.fl) if(f.t0<=t&&t<f.t0+f.T+0.4) flashes.push(f);
  }
  MET.list=list; MET.gone=gone; MET.flashes=flashes; MET.bolides=bolides;
  // Keep about the last few minutes' seconds (and the bolides' 90 minutes), wherever the clock has been.
  if(MET.cache.size>3000){ for(const [k, v] of MET.cache){ const q=k.split('|'), s=+q[q.length-2], b=+q[q.length-1]*MET_BIN[s]; if(b<t-400-MET_LOOK[s]||b>t+400) MET.cache.delete(k); } if(MET.cache.size>3000) MET.cache.clear(); }
}
// What is lit now, in the horizon frame, for both views: streaks (head, a wake behind it, with
// display colour and size), trains and flashes. pxScale turns display pixels into the view's.
function metScene(){
  const out=[], t=MET.now, k=extK(EP[dIdx].key), g0=skyNow.rgrid, rCd=skyNow.rCd;
  for(const m of MET.list){
    const x=(t-m.t0)/m.T;
    if(x<=1.05){
      const xh=Math.min(x, 1), a=metApparent(m, xh, k);
      if(a.el<0) continue;
      const vis=metVisible(a.mag, skyRAt(g0, a.el, Math.atan2(a.dir[0], a.dir[1])*180/Math.PI)*rCd);
      if(vis>0.01){
        // The streak the eye keeps: the wake's own glow, or a third of the path or more, as the
        // after-image of a meteor trails behind it.
        const xt=Math.max(0, xh-Math.max(m.wake/m.T, 0.32+0.12*Math.min(1, Math.max(0, -m.M)/4)));
        const d=metDisplay(a.mag);
        out.push({kind:0, m, head:a.dir, tail:metApparent(m, xt, k).dir, xt, xh, px:d.px, amp:d.amp*vis, mag:a.mag, rgb:m.tint});
      }
    }
    if(m.train>0&&x>0.3){
      // The train glows where the meteor has been, greenish then dull orange, fading and
      // drifting in the wind.
      const age=Math.max(0, t-(m.t0+m.T*0.6)), A=Math.exp(-age/(m.train/3))*Math.min(1, (x-0.3)/0.3);
      const mid=metApparent(m, 0.65, k), mtr=m.M+4.5-2.5*Math.log10(Math.max(A, 1e-6))+(mid.mag<90?mid.mag-m.M:0);
      const vis=metVisible(mtr, skyRAt(g0, Math.max(mid.el, 0), Math.atan2(mid.dir[0], mid.dir[1])*180/Math.PI)*rCd);
      if(vis>0.01&&mid.el>0){
        const f=Math.min(1, age/(m.train*0.4)), rgb=[0.55+0.6*f, 1.25-0.5*f, 0.45-0.2*f], d=metDisplay(mtr);
        // The wiggle's phase comes from the meteor's start within its second (m.id is a string).
        const ph=(m.t0-Math.floor(m.t0))*20*Math.PI;
        const x1=Math.min(1, x), pts=[]; for(let i=0;i<=8;i++){ const xi=0.3+(x1-0.3)*i/8, P=metPoint(m, xi), w=age*0.06*Math.sin(xi*9+ph);
          const Q=vadd(P, [w, 0.6*w, 0], [0, 0, 0]), q=Math.hypot(...Q); pts.push([Q[0]/q, Q[1]/q, Q[2]/q]); }
        out.push({kind:1, m, pts, px:Math.min(d.px, 2.5)+age*0.02, amp:Math.min(0.6, d.amp)*vis, rgb});
      }
    }
  }
  const mo=skyNow.moon;
  // Lava on the Moon (moon_surface.js) is drawn as a flash that does not end.
  for(const f of mo.on?MET.flashes.concat(lunarLava(EP[dIdx].key)):MET.flashes){
    const age=f.lava?0:t-f.t0; if(age<0) continue;
    const I=f.lava||age<f.T?1:Math.exp(-(age-f.T)/0.12), mag=f.mag-2.5*Math.log10(Math.max(I, 1e-6));
    const mm=starThroughAir(mag, mo.el, EP[dIdx].key);
    // Someone watching the Moon catches a flash 1 magnitude above the star limit.
    const vis=metVisible(mm-(MET_PERCEPT-1), skyRAt(g0, mo.el, mo.az)*rCd);
    if(vis>0.01) out.push({kind:2, f, mag:mm, amp:metDisplay(mm).amp*vis, px:Math.min(3, metDisplay(mm).px), rgb:starTint(f.temp).map(c=>Math.min(2.4, c))});
  }
  return out;
}

// The dome: an overlay canvas, cleared and drawn each frame while anything is lit.
const domeMet=document.getElementById('domeMet'), mctx=domeMet.getContext('2d');
let metDrawn=false, domeMetVisible=true;
if(window.IntersectionObserver) new IntersectionObserver(es=>{ domeMetVisible=es[es.length-1].isIntersecting; metKick(); }).observe(domeMet);
function domeXY(d){
  const {cx, cy, R}=domeView(), el=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI, a=Math.atan2(d[0], d[1]), rr=R*(90-el)/90;
  return [cx+rr*Math.sin(a), cy-rr*Math.cos(a)];
}
const rgba=(c, a)=>`rgba(${Math.min(255, Math.round(c[0]))},${Math.min(255, Math.round(c[1]))},${Math.min(255, Math.round(c[2]))},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
function drawDomeMeteors(scene){
  const W=domeMet.width, H=domeMet.height, {cx, cy, R, z}=domeView();
  mctx.clearRect(0, 0, W, H);
  if(!scene.length){ metDrawn=false; return; }
  mctx.save(); mctx.beginPath(); mctx.arc(cx, cy, R, 0, Math.PI*2); mctx.clip();
  mctx.globalCompositeOperation='lighter'; mctx.lineCap='round';
  let flash=0, flashRGB=null;
  const k=extK(EP[dIdx].key);
  for(const s of scene){
    if(s.kind===0){
      const m=s.m, c=s.rgb.map(v=>Math.min(255, v*255*Math.min(1, s.amp))), n=8;
      // The wake: one smooth line along the (curved) path, fading from the head back to the tail,
      // a soft wide glow under a narrow bright core.
      const pts=[]; for(let i=0;i<=n;i++) pts.push(domeXY(metApparent(m, s.xt+(s.xh-s.xt)*i/n, k).dir));
      const [tx, ty]=pts[0], [hx0, hy0]=pts[n];
      for(const [wd, al] of [[1.0, 0.35], [0.4, 0.95]]){
        const gr=mctx.createLinearGradient(tx, ty, hx0, hy0);
        gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.55, rgba(c, al*0.3)); gr.addColorStop(1, rgba(c, al));
        mctx.strokeStyle=gr; mctx.lineWidth=Math.max(0.7, s.px*wd*Math.min(2, z));
        mctx.beginPath(); pts.forEach(([x, y], i)=>{ if(i) mctx.lineTo(x, y); else mctx.moveTo(x, y); }); mctx.stroke();
      }
      const [hx, hy]=domeXY(s.head), r=Math.max(1.2, s.px*1.6);
      const gr=mctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      const ch=c.map(v=>v*0.6+255*0.4*Math.min(1, s.amp));
      gr.addColorStop(0, rgba(ch, 1)); gr.addColorStop(0.3, rgba(c, 0.6)); gr.addColorStop(1, rgba(c, 0));
      mctx.fillStyle=gr; mctx.beginPath(); mctx.arc(hx, hy, r, 0, Math.PI*2); mctx.fill();
      // A fireball lights the whole sky. Its light on the ground, in lux, makes about 0.027 cd/m²
      // of sky per lux (as the full Moon's light does).
      if(s.mag<-5){ const E=Math.pow(10, -0.4*(s.mag+13.99)); if(E>flash){ flash=E; flashRGB=s.rgb; } }
    }else if(s.kind===1){
      const c=s.rgb.map(v=>Math.min(255, v*255*s.amp));
      mctx.strokeStyle=rgba(c, 0.85); mctx.lineWidth=Math.max(0.8, s.px*Math.min(2, z));
      mctx.beginPath(); s.pts.forEach((d, i)=>{ const p=domeXY(d); if(i) mctx.lineTo(p[0], p[1]); else mctx.moveTo(p[0], p[1]); }); mctx.stroke();
    }else{
      const mo=skyNow.moon, rad=mo.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG)*90/R;
      if(flashLit(s.f, rad)>0.1) continue;
      const [x, y]=domeXY(flashDir(s.f, rad)), c=s.rgb.map(v=>Math.min(255, v*255*s.amp)), r=Math.max(1.4, s.px*1.4);
      const gr=mctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(1, rgba(c, 0));
      mctx.fillStyle=gr; mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI*2); mctx.fill();
    }
  }
  const fl=metFlash(flash, flashRGB);
  if(fl){ mctx.fillStyle=`rgb(${fl.map(v=>Math.round(v*255)).join(',')})`; mctx.fillRect(0, 0, W, H); }
  mctx.restore();
  metDrawn=true;
}
// A fireball's glow over the sky, as sRGB to add, or null: the display's step from the sky's
// brightness at the zenith to that plus 0.027 cd/m² per lux.
function metFlash(E, tint){
  if(!(E>0)||!skyNow) return null;
  const rB=skyNow.rgrid[0], rA=0.027*E/skyNow.rCd;
  if(rA<rB*0.02) return null;
  const tB=toneT(rB, skyNow.toneK, skyNow.toneP, 0.95), tN=toneT(rB+rA, skyNow.toneK, skyNow.toneP, 0.95), y=0.2126*tint[0]+0.7152*tint[1]+0.0722*tint[2]||1;
  // Near the display's white the tint gives way to white, as overexposed light does.
  const wt=smooth01(0.7, 1, tN);
  return tint.map(c=>Math.max(0, g(Math.min(1, tB+(tN-tB)*(c/y*(1-wt)+wt)))-g(tB)));
}
// The walk-around view: up to MET_GL entries as uniforms.
const MET_GL=24;
function metUniforms(){
  const A=new Float32Array(MET_GL*4), B=new Float32Array(MET_GL*4), C=new Float32Array(MET_GL*4);
  const scene=MET.scene||[], pxRad=0.35*(vrFov*Math.PI/180)/Math.max(window.innerHeight, 1), pix=1.2*Math.tan(vrFov*Math.PI/360)/Math.max(window.innerHeight, 1);
  let n=0, flash=0, flashRGB=null, fire=null;
  const put=(h, t, sig, kind, rgb, amp)=>{ if(n>=MET_GL) return; A.set([h[0], h[1], h[2], Math.max(sig, pix)], n*4); B.set([t[0], t[1], t[2], kind], n*4); C.set([rgb[0]*amp, rgb[1]*amp, rgb[2]*amp, 0], n*4); n++; };
  const sorted=scene.slice().sort((a, b)=>b.amp-a.amp);
  for(const s of sorted){
    if(s.kind===0){ put(s.head, s.tail, s.px*pxRad, 0, s.rgb, Math.min(1, s.amp)); if(s.mag<-5){ const E=Math.pow(10, -0.4*(s.mag+13.99)); if(E>flash){ flash=E; flashRGB=s.rgb; fire={dir:s.head, mag:s.mag, rgb:s.rgb}; } } }
    else if(s.kind===1){ for(let i=0;i<s.pts.length-1;i+=2) put(s.pts[Math.min(i+2, s.pts.length-1)], s.pts[i], s.px*pxRad*0.6, 1, s.rgb, s.amp*0.7); }
    else{ const rad=skyNow.moon.radDeg*DISK_SCALE; if(flashLit(s.f, rad)<=0.1){ const d=flashDir(s.f, rad); put(d, d, s.px*pxRad, 2, s.rgb, s.amp); } }
  }
  // Comet heads (comets.js), as stars are drawn: kind 3, a point hidden by the Sun and Moon.
  for(const C of (skyNow.comets||[])){
    if(C.el<0) continue;
    const m=starThroughAir(cometHeadMag(C), C.el, EP[dIdx].key), vis=starVisible(m, skyRAt(skyNow.rgrid, C.el, C.az)*skyNow.rCd), d=pointDisplay(m);
    if(vis>0.02) put(C.dir, C.dir, d.px*pxRad, 3, starTint(5200).map(v=>Math.min(2.4, v)), Math.min(1, 0.62*Math.sqrt(Math.pow(10, -0.4*(m-STAR_VANCHOR))))*vis);
  }
  return {A, B, C, n, flash:metFlash(flash, flashRGB), fire};
}
const MET_GLSL=`
uniform vec4 metA[${MET_GL}], metB[${MET_GL}], metC[${MET_GL}]; uniform float metN; uniform vec3 metFlash;
// The meteors over the sky colour c toward src: a streak from tail to head, brightening toward
// the head (kind 0), an even line (a train, kind 1), or a point (a lunar flash, kind 2, drawn
// on the Moon).
vec3 meteorsAt(vec3 c, vec3 src, bool onBody){
  for(int i=0;i<${MET_GL};i++){
    if(float(i)>=metN) break;
    vec4 A=metA[i], B=metB[i];
    if(onBody && abs(B.w-2.0)>0.5) continue;
    vec3 ht=A.xyz-B.xyz; float L2=dot(ht, ht), s=L2>1e-12?clamp(dot(src-B.xyz, ht)/L2, 0.0, 1.0):1.0;
    vec3 dq=src-(B.xyz+ht*s); float d2=dot(dq, dq), sg=A.w, I;
    if(B.w<0.5){
      float w=sg*(0.35+0.4*s); I=0.9*s*s*exp(-0.5*d2/(w*w));
      vec3 dh=src-A.xyz; I+=exp(-0.5*dot(dh, dh)/(sg*sg*2.56));
    }else if(B.w<1.5) I=0.85*exp(-0.5*d2/(sg*sg));
    else { vec3 dh=src-A.xyz; I=exp(-0.5*dot(dh, dh)/(sg*sg*(B.w>2.5?1.0:1.96))); }
    c+=metC[i].rgb*I;
  }
  return c;
}`;

// The meteor clock runs while the dome is on screen or the walk-around view is open.
function metLoop(now){
  MET.raf=0; MET.timer=0;
  const showDome=!vrOn&&domeMetVisible&&!document.hidden;
  if(!(showDome||vrOn)||document.hidden||!skyNow){ MET.last=now; return; }
  metTick(now);
  const scene=metScene(); MET.scene=scene;
  if(showDome) drawDomeMeteors(scene); else if(metDrawn) drawDomeMeteors([]);
  // VR is drawn again only when the sky's time has moved and something is or was lit.
  const moved=MET.now!==MET.drawnT; MET.drawnT=MET.now;
  if(vrOn&&moved&&(scene.length||MET.vrLit)){ MET.vrLit=scene.length>0; requestVR(); }
  metHoverCheck();
  // Every frame while the clock runs and something is in the air; otherwise a few times a second
  // (renderDay kicks it at once when the clock or the view changes).
  if(moved&&(scene.length||MET.list.length||MET.flashes.length)) MET.raf=requestAnimationFrame(metLoop);
  else MET.timer=setTimeout(()=>metLoop(performance.now()), 250);
}
function metKick(){ if(MET.raf) return; if(MET.timer){ clearTimeout(MET.timer); MET.timer=0; } MET.last=performance.now(); MET.raf=requestAnimationFrame(metLoop); }
document.addEventListener('visibilitychange', metKick);

// Hovering: the meteor (or train, or flash) under the pointer, including one that has just gone
// by, so it can be caught. Returns {m or f, kind, el, az, ago}.
function metNearDir(dir, tolDeg){
  if(!skyNow) return null;
  const k=extK(EP[dIdx].key), t=MET.now, cmin=Math.cos(tolDeg*Math.PI/180);
  let best=null, bc=cmin;
  const test=(m, xEnd)=>{ for(let i=0;i<=16;i++){ const a=metApparent(m, xEnd*i/16, k), c=vdot(a.dir, dir); if(c>bc&&a.el>0){ bc=c; best={m, kind:m.src==='ring'?'ring':'meteor', el:a.el, az:(Math.atan2(a.dir[0], a.dir[1])*180/Math.PI+360)%360, ago:Math.max(0, t-(m.t0+m.T))}; } } };
  for(const s of MET.scene||[]) if(s.kind!==2) test(s.m, Math.min(1, (t-s.m.t0)/s.m.T));
  for(const m of MET.gone) if(m.M<6) test(m, 1);
  for(const s of MET.scene||[]) if(s.kind===2){ const rad=vrOn?skyNow.moon.radDeg*DISK_SCALE:skyNow.moon.radDeg*(DOME_DISK*domeView().z/SUN_RADIUS_DEG)*90/domeView().R;
    const d=flashDir(s.f, rad), c=vdot(d, dir); if(c>Math.cos(tolDeg*2*Math.PI/180)) best={f:s.f, kind:s.f.lava?'lava':'flash', el:skyNow.moon.el, az:skyNow.moon.az, mag:s.mag, ago:0}; }
  return best;
}
// On the dome, within about 9 canvas pixels.
function meteorNearDome(x, y){
  const {cx, cy, R}=domeView(), dx=x-cx, dy=y-cy, r=Math.hypot(dx, dy);
  const az=Math.atan2(dx, -dy)*180/Math.PI, el=90-90*r/R;
  return metNearDir(horizDir(az, el), 9*90/R);
}
// While the pointer rests on the dome or the VR view is inspecting, a meteor arriving under it,
// or leaving, refreshes the tooltip.
dome.addEventListener('mousemove', e=>{ const b=dome.getBoundingClientRect(); MET.ptr=[(e.clientX-b.left)*dome.width/b.width, (e.clientY-b.top)*dome.height/b.height]; });
dome.addEventListener('mouseleave', ()=>{ MET.ptr=null; });
function metHoverCheck(){
  let h=null;
  if(vrOn){ if(typeof vrInspect!=='undefined'&&vrInspect&&vrInspectAt&&!vrOverPin&&vrGL){ const d=vrRayAt(vrInspectAt[0], vrInspectAt[1], vrYaw, vrPitch); h=metNearDir(d, 18*vrFov/Math.max(window.innerHeight, 1)); } }
  else if(MET.ptr) h=meteorNearDome(MET.ptr[0], MET.ptr[1]);
  const id=h?(h.m||h.f).id:null;
  if(id!==MET.hover){ MET.hover=id; if(vrOn) refreshVRTip(); else refreshDomeTip(); }
}
// The readout: how many meteors an hour show at the zenith's darkness now, and the epoch's rate,
// with the showers active (showers.js).
function meteorReadout(){
  if(!skyNow) return '';
  const key=EP[dIdx].key, E=metEpoch(key), k=extK(key);
  const lim=nakedEyeLimit(skyNow.rgrid[0]*skyNow.rCd);
  // Calibrated: about 8 an hour where the zenith shows stars to 6.5 in clean air, today.
  const sh=showerReadout(key, lim-(k-0.25));
  const per=MET_VIS_TODAY*E.F*metCum(E, lim-(k-0.25)-MET_PERCEPT+0.3)/metCum(metEpoch('modern'), 6.5-MET_PERCEPT+0.3)+sh.hr;
  const rate=per<0.05?'almost none':per<1?`about one every ${per>0.1?Math.round(1/per)+' hours':'day of watching'}`:per<120?`about ${Math.round(per)} an hour`:per<7200?`about ${Math.round(per/60)} a minute`:`about ${Math.round(per/3600)} a second`;
  const x=E.F===1?'':` · sporadics ${E.F>=10?Math.round(E.F).toLocaleString('en-US'):E.F}× today`;
  return rate+x+sh.text+(E.ring&&ringOf(key)?(dLat==='Equator'?' · ring debris overhead':''):'');
}
