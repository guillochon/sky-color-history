// The Sun's corona in totality, and how it changes with the Sun's age.
//
// Today's, in millionths of the mean disk's brightness at r solar radii from the centre (Baumbach
// 1937): the K corona, sunlight scattered by free electrons, 1.425 r⁻⁷ + 2.565 r⁻¹⁷; the F corona,
// sunlight scattered by dust, the inner end of the zodiacal cloud, 0.0532 r⁻²·⁵. K is most of the
// light near the limb, F beyond about 2.3 radii. The electrons move so fast (thousands of km/s)
// that K's light has the photosphere's colour without its Fraunhofer lines; F keeps them, and is
// a little redder. The E corona, lines of highly ionized iron and calcium, adds a few percent near
// the limb: Fe XIV 530.3 nm (the green line, from gas near 1.8 MK), Fe X 637.4 nm (red, 1.0 MK) and
// Ca XV 569.4 nm (yellow, 4.5 MK, today only over strong active regions). The chromosphere, seen
// edge-on just outside the limb, is pink: Hα with Hβ, He I D3 and Ca II H and K.
//
// The young Sun spun faster and was far more active. Its X-ray luminosity goes with age τ as
// τ^-1.5 (Güdel, Guinan & Skinner 1997, ApJ 483, 947), about 140 times today's when the Sun was
// 170 Myr old (4.4 Ga), and its coronal temperature as L_X^0.26: 5 MK then, against 1.5 MK today.
// Taken here (estimates; young suns of one age differ several-fold with their starting spin):
//   - K: the electron column near the limb as the square root of L_X (the X rays go as density
//     squared), reaching further out the hotter the gas: heights above the limb stretched by
//     sqrt(T/1.5 MK), half of what a hydrostatic scale height would give, since much of an active
//     star's hot gas sits in compact loops.
//   - F: with the zodiacal cloud (debris.js zodiK).
//   - E: each line as density squared, so against K by another sqrt(L_X), and by how much of the
//     gas is near its temperature (spread 0.2 dex about the mean).
//   - Chromosphere: as L_X^0.25; chromospheric emission rises more slowly than X rays.
// The disk itself, and so all of this, is dimmer per area for a cooler Sun: luminance as T_eff^4.6.
const CORONA_GA={protoearth455:4.55, hadean45:4.5, hadean44:4.4, hadean40:4.0, archean38:3.8, archean27thin:2.7, archean27:2.7, archean27vthick:2.7, proterozoic22:2.2, snowball07:0.7, ordovician466:0.466, carbon30:0.3, kpg66:0.066};
const SUN_B0=1.87e9; // today's mean disk luminance above the air, cd/m²: 1.27e5 lux over 6.80e-5 sr
// [nm, equivalent width today near the limb (nm, against K), log T of formation, name]
const CORONA_LINES=[[530.3, 2.0, 6.25, 'Fe XIV'], [637.4, 1.0, 6.0, 'Fe X'], [569.4, 0.05, 6.65, 'Ca XV']];
const CHROMO_B=2e-5; // the pink rim's luminance today, in mean disks
const coronaStates=new Map();
function coronaState(key){
  let st=coronaStates.get(key); if(st) return st;
  // Younger than about 50 Myr the X rays saturate, near a thousandth of the Sun's light: held at
  // 1,000 times today's.
  const tau=4.57-(CORONA_GA[key]||0), lx=Math.min(1000, Math.pow(tau/4.57, -1.5)), T=1.5*Math.pow(lx, 0.26);
  const lt=Math.log10(T*1e6), lt0=Math.log10(1.5e6), w=(t, c)=>Math.exp(-0.5*(t-c)**2/(0.2*0.2+0.12*0.12));
  const ep=EP.find(e=>e.key===key), teff=ep&&ep.teff||5772;
  st={lx, T, k:Math.sqrt(lx), s:Math.sqrt(T/1.5), f:zodiK(key), chromo:Math.pow(lx, 0.25), B:SUN_B0*Math.pow(teff/5772, 4.6),
    ew:CORONA_LINES.map(([, ew, c])=>ew*Math.sqrt(lx)*w(lt, c)/w(lt0, c))};
  coronaStates.set(key, st);
  return st;
}
// K and F at r solar radii, in mean disks.
function coronaKF(st, r){
  const x=1+(Math.max(r, 1)-1)/st.s;
  return [st.k*1e-6*(1.425*Math.pow(x, -7)+2.565*Math.pow(x, -17)), st.f*0.0532e-6*Math.pow(r, -2.5)];
}
// The share of light from above the air that reaches the ground at true altitude el (day.js
// EXT_K): Hadean air at 7.6 magnitudes an airmass leaves a thousandth of it even at the zenith.
function coronaThroughAir(key, el){ const k=extK(key); return extinction(el, k)*Math.pow(10, -0.4*k)*absZenith(key); }
// The drawings keep today's corona and draw an epoch's at radius a as today's at the radius where
// today's is as bright: CORONA_MAP_N samples from 1 to CORONA_MAP_MAX drawn radii. Below 1, the
// epoch's is brighter than today's at the limb. gain is the epoch's air against today's at the
// Sun's height (the drawings already dim today's corona through today's air).
const CORONA_MAP_N=16, CORONA_MAP_MAX=12, coronaMaps=new Map();
function coronaGain(key, el){ const t0=coronaThroughAir('modern', el); return t0>0?coronaThroughAir(key, el)/t0:0; }
// The pink rim's strength in the drawings against today's: its own activity, through the air.
function coronaRimK(key, gain=1){ return Math.min(2, Math.sqrt(coronaState(key).chromo*gain)); }
function coronaMap(key, gain=1){
  const id=key+'|'+gain.toPrecision(2);
  let m=coronaMaps.get(id); if(m) return m;
  if(coronaMaps.size>400) coronaMaps.clear();
  const st=coronaState(key), st0=coronaState('modern'), tot=(s, r)=>{ const [K, F]=coronaKF(s, r); return K+F; };
  // Today's below the limb carries on its own law, so the inverse has room below 1.
  const today=r=>r>=1?tot(st0, r):tot(st0, 1)*Math.pow(r, -17);
  m=new Float32Array(CORONA_MAP_N);
  for(let i=0;i<CORONA_MAP_N;i++){
    const a=1+(CORONA_MAP_MAX-1)*i/(CORONA_MAP_N-1), B=tot(st, a)*st.B/st0.B*(+gain.toPrecision(2));
    let lo=0.8, hi=200;
    for(let j=0;j<50;j++){ const mid=Math.sqrt(lo*hi); if(today(mid)>B) lo=mid; else hi=mid; }
    m[i]=Math.sqrt(lo*hi);
  }
  coronaMaps.set(id, m);
  return m;
}
function coronaRemap(map, a){
  const t=(a-1)/(CORONA_MAP_MAX-1)*(CORONA_MAP_N-1);
  if(t<=0) return map[0]*a;
  if(t>=CORONA_MAP_N-1) return map[CORONA_MAP_N-1]*a/CORONA_MAP_MAX;
  const i=Math.floor(t), f=t-i;
  return map[i]+(map[i+1]-map[i])*f;
}
// Today's drawn corona, as the dome's gradient: opacity at r solar radii (1 at and inside the limb).
const CORONA_DRAW=[[1, 1], [1.5, 0.5], [2, 0.28], [3, 0.12], [4.5, 0.04], [6, 0]];
function coronaAlpha(r){
  if(r<=1) return 1;
  for(let i=1;i<CORONA_DRAW.length;i++){ const [r1, a1]=CORONA_DRAW[i]; if(r<=r1){ const [r0, a0]=CORONA_DRAW[i-1]; return a0+(a1-a0)*(r-r0)/(r1-r0); } }
  return 0;
}
// How far out an epoch's drawn corona reaches, in solar radii: where it is as faint as today's at 6.
function coronaOuter(map){ let a=1.05; while(a<CORONA_MAP_MAX&&coronaRemap(map, a)<6) a+=0.05; return a; }
