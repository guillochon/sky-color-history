// Dust and debris in Earth's neighbourhood: a brighter zodiacal light, and the Ordovician ring.
//
// Zodiacal light. Today's is part of the natural night sky (day.js, 22.0 mag/arcsec² in all at the
// zenith). Where the inner Solar System held more dust, the excess over today's is drawn as its
// own glow along the ecliptic, brightest toward the Sun, with the gegenschein opposite it.
//   - 466 Ma: the L-chondrite parent body (about 150 km, most likely the Massalia family's) broke
//     up in the main belt. The finest extraterrestrial dust reaching the sea floor rose 3–4 orders
//     of magnitude for over 2 Myr (Schmitz et al. 2019, Sci. Adv. 5, eaax4184). That is the flux at
//     Earth, fed by fresh dust spiralling in, not the cross-section along every line of sight, so
//     the cloud is taken to be 30 times today's (an estimate; 10 to 1000 is defensible), with a
//     narrow band of fresh family dust in the ecliptic like today's 1.4° Massalia band.
//   - 3.8–4.4 Ga: leftover planetesimals ground down to dust, and perhaps comets. A comet-rich
//     bombardment would have made the inner zodiacal cloud over 10⁴ times brighter (Nesvorný et
//     al. 2010, ApJ 713, 816). Taken here as 1000 at 4.4 Ga, 300 at 4.0 and 50 at 3.8 Ga
//     (estimates), and 1.5 at 2.7 Ga, in the long tail of the bombardment.
// The pattern, in S10 (tenth-magnitude solar stars per square degree) against elongation from
// the Sun along the ecliptic and ecliptic latitude, is a fit to Leinert et al. 1998 (A&AS 127, 1):
// 60 at the ecliptic poles, about 1,800 at 30°, 220 at 90°, 150 at 150°, 200 in the gegenschein.
const ZODI={hadean44:1000, hadean40:300, archean38:50, archean27thin:1.5, archean27:1.5, archean27vthick:1.5, ordovician466:30};
const ZODI_BAND={ordovician466:0.6};
const S10_CD=8.35e-7; // one S10 in cd/m² (27.78 mag/arcsec²)
function zodiK(key){ return ZODI[key]||1; }
// Today's zodiacal light toward direction v (unit, horizon frame), in S10. F holds the Sun's
// direction s and the ecliptic pole N.
function zodiS10(v, F, band=0){
  const sb=Math.max(-1, Math.min(1, vdot(v, F.N))), beta=Math.asin(sb)*180/Math.PI;
  // Longitude from the Sun, measured in the ecliptic.
  const px=v[0]-F.N[0]*sb, py=v[1]-F.N[1]*sb, pz=v[2]-F.N[2]*sb, pm=Math.hypot(px, py, pz);
  const lam=pm>1e-6?Math.acos(Math.max(-1, Math.min(1, (px*F.se[0]+py*F.se[1]+pz*F.se[2])/pm)))*180/Math.PI:90;
  const E=lam<90?220*Math.pow(90/Math.max(lam, 12), 1.9):140+80*Math.exp(-(lam-90)/25)+60*Math.exp(-Math.pow((180-lam)/8, 2));
  const ab=Math.abs(beta), w=12+0.15*lam;
  return 60+(E-60)*Math.exp(-ab/w)+band*E*Math.exp(-0.5*(beta/2.5)*(beta/2.5));
}
// The Sun, the ecliptic pole and the apex of the Earth's motion (the point on the ecliptic 90°
// west of the Sun) in the horizon frame, at latitude lat now, with the local sidereal time.
function eclipticFrame(lat){
  const lst=localSidereal(), sun=sunEquatorial(astroDay());
  const at=(ra, dec)=>{ const p=altaz(lat, dec, rev(lst-ra)); return horizDir(p.az, p.alt); };
  const N=at(270, 90-OBLIQUITY), s=at(sun.RA, sun.Dec);
  // The Sun's direction in the ecliptic (it is on it, up to rounding).
  const se=vnorm(vadd(s, vscale(N, -vdot(s, N)), [0, 0, 0]));
  return {N, s, se, apex:vnorm(vcross(se, N)), pole:[0, Math.cos(lat*Math.PI/180), Math.sin(lat*Math.PI/180)], lst, lat};
}
// The excess zodiacal light of epoch key toward v, in cd/m² above the air.
function zodiExtra(key, v, F){
  const K=zodiK(key);
  return K>1?(K-1)*zodiS10(v, F, ZODI_BAND[key]||0)*S10_CD:0;
}

// The Ordovician ring. Tomkins, Martin & Cawood 2024 (EPSL 646, 118991) found all 21 known
// Ordovician impact craters within 30° of the palaeo-equator, though most crust that could have
// kept one lay outside that band, and proposed that a 10–12 km L-chondrite asteroid passing within
// the Roche limit about 466 Ma broke up into a ring in the equatorial plane, which lasted tens of
// millions of years and rained debris onto the low latitudes. It is speculative (the cluster may
// be a preservation bias, Lagain et al. 2022), and its size and opacity are not given. Here it lies
// between 1.55 and 2.75 Earth radii from the centre, inside the Roche limit for rock (about 2.9
// fluid, 1.5 rigid), two kilometres thick, with ringlets and a gap. Its normal optical depth,
// 1.5e-4 at most (about 1e14 kg of centimetre grains), makes the sunlit ring about as bright as
// the Moon's light in total: plain at night, lost in a blue day sky. Its grains are L-chondrite
// rubble, albedo 0.25, scattering as Lambert spheres. Earth's shadow takes a bite out of it
// around midnight. Taken in today's equatorial plane, as Earth's axis keeps today's tilt here.
const RING={ordovician466:{rIn:1.55, rOut:2.75, tau:1.5e-4, H:2, alb:0.25, sunL:0.962}};
const RE_KM=6371;
function ringOf(key){ return RING[key]||null; }
// The ring's optical depth at rho Earth radii from the centre.
function ringTau(R, rho){
  if(rho<R.rIn||rho>R.rOut) return 0;
  const e=smooth01(R.rIn, R.rIn+0.08, rho)*(1-smooth01(R.rOut-0.15, R.rOut, rho));
  const lets=0.72+0.28*Math.cos(2*Math.PI*(rho-R.rIn)/0.17)*Math.cos(2*Math.PI*(rho-R.rIn)/0.061);
  const gap=1-0.9*Math.exp(-Math.pow((rho-2.2)/0.035, 2));
  return R.tau*e*lets*gap*(0.6+0.4*smooth01(R.rIn, 2.1, rho));
}
// The ring's luminance (cd/m², above the air) toward unit v, with the Sun at s, pole P (horizon
// frame), and pw the angle a pixel spans (radians), to resolve the edge-on ring at the equator.
// Sun luminous flux: 1.27e5 lux today at 1 AU, times the epoch's luminosity and sunFlux.
function ringAt(R, v, s, P, pw, sunFlux){
  const dp=v[0]*P[0]+v[1]*P[1]+v[2]*P[2], cp=-P[2]; // (C·P)/R_E, Earth's centre C=(0,0,−1) R_E
  const half=0.5*R.H/RE_KM;
  let t;
  if(Math.abs(cp)<1e-6){
    // In the plane (the equator): the ring is a line; t where the ray reaches the inner edge.
    if(Math.abs(dp)>half/R.rIn+pw) return 0;
  }
  if(Math.abs(dp)<1e-9) t=null; else t=cp/dp;
  // Point in the plane, or for the edge-on case the nearest approach along the ray.
  let x, y, z;
  if(t!=null&&t>0){ x=v[0]*t; y=v[1]*t; z=v[2]*t+1; }
  else if(Math.abs(cp)<1e-6){
    // Along the plane: from the observer outward the ray crosses rho from 1 to beyond the ring;
    // take the middle of the annulus it crosses.
    const b=v[2], tm=-b+Math.sqrt(b*b-1+((R.rIn+R.rOut)/2)**2); x=v[0]*tm; y=v[1]*tm; z=v[2]*tm+1;
  }else return 0;
  const rho=Math.hypot(x, y, z), tau=ringTau(R, rho);
  if(!(tau>0)) return 0;
  // Earth's shadow, a cylinder down-Sun.
  const xs=x*s[0]+y*s[1]+z*s[2];
  if(xs<0){ const qx=x-s[0]*xs, qy=y-s[1]*xs, qz=z-s[2]*xs; if(qx*qx+qy*qy+qz*qz<1) return 0; }
  // Slant optical depth: 1/μ, but no more than across the annulus edge-on.
  const mu=Math.max(Math.abs(dp), 1e-6), across=(R.rOut-R.rIn)/(R.H/RE_KM);
  let teff=tau*Math.min(1/mu, across);
  // A line thinner than a pixel spreads over it.
  if(Math.abs(cp)<1e-6) teff*=Math.min(1, (2*half/R.rIn)/Math.max(pw, 1e-9));
  const ca=Math.max(-1, Math.min(1, -(v[0]*s[0]+v[1]*s[1]+v[2]*s[2]))), a=Math.acos(ca);
  const phase=8/(3*Math.PI)*(Math.sin(a)+(Math.PI-a)*ca);
  return 1.27e5*R.sunL*sunFlux*R.alb*phase*(1-Math.exp(-teff))/(4*Math.PI);
}
// The ring's light on the ground in lux, by a coarse sum over the sky, for the glow it lends the
// air (as moonlight does: about 0.027 cd/m² of sky per lux, from the full-Moon sky).
function ringIlluminance(R, s, P, sunFlux, k){
  let E=0;
  const nE=18, nA=48, dE=Math.PI/2/nE, dA=2*Math.PI/nA;
  for(let i=0;i<nE;i++){ const el=(i+0.5)*dE, ce=Math.cos(el), se=Math.sin(el), ext=extinction(el*180/Math.PI, k);
    for(let j=0;j<nA;j++){ const a=(j+0.5)*dA, v=[Math.sin(a)*ce, Math.cos(a)*ce, se];
      E+=ringAt(R, v, s, P, dE, sunFlux)*ext*se*ce*dE*dA; } }
  return E;
}
// The ring's colour: sunlight off L-chondrite rubble (an S-type spectrum, redder with wavelength),
// as linear sRGB of unit luminance, set by spectrum.js once it loads.
let RING_LIN=[1, 0.93, 0.82];
const RING_REFL=l=>0.8+0.4*Math.max(0, Math.min(1, (l-400)/380))-0.08*Math.exp(-0.5*((l-500)/40)**2);
// The ring on the dome, per pixel, mixed under the display curve like the halos.
function domeRingPixel(px, o, j, c, tr, ta, H){
  const d=H.dir, v=H.v; v[0]=d[j*4]; v[1]=d[j*4+1]; v[2]=d[j*4+2];
  if(v[2]<-0.02) return;
  // Most pixels miss the ring; only those that meet it need the extinction.
  const L0=ringAt(H.R, v, H.s, H.P, H.pw, H.sunFlux);
  if(!(L0>0)) return;
  const L=L0*extinction(Math.max(d[j*4+3], 0), H.k)*H.extZ;
  if(!(L>0)) return;
  const rH=L/H.rCd;
  domeMixLight(px, o, c, tr, ta, H, rH, RING_LIN, rH);
}
// The same in GLSL for the walk-around view: ringU = (rIn, rOut, tau, half-thickness in Earth
// radii), ringV = (albedo × flux factor / rCd, across, on, unused), with the pole ringP.
const RING_GLSL=`
uniform vec4 ringU, ringV; uniform vec3 ringP, ringLin;
float ringTauG(float rho){
  if(rho<ringU.x||rho>ringU.y) return 0.0;
  float e=smoothstep(ringU.x, ringU.x+0.08, rho)*(1.0-smoothstep(ringU.y-0.15, ringU.y, rho));
  float lets=0.72+0.28*cos(6.2831853*(rho-ringU.x)/0.17)*cos(6.2831853*(rho-ringU.x)/0.061);
  float gq=(rho-2.2)/0.035, gap=1.0-0.9*exp(-gq*gq);
  return ringU.z*e*lets*gap*(0.6+0.4*smoothstep(ringU.x, 2.1, rho));
}
// The ring's luminance over the sky reference toward v, sun direction s, pixel angle pw.
float ringAtG(vec3 v, vec3 s, float pw){
  float dp=dot(v, ringP), cp=-ringP.z, half_=ringU.w;
  vec3 X;
  if(abs(cp)<1e-6){
    if(abs(dp)>half_/ringU.x+pw) return 0.0;
    float b=v.z, rm=(ringU.x+ringU.y)*0.5, tm=-b+sqrt(b*b-1.0+rm*rm); X=v*tm+vec3(0.0, 0.0, 1.0);
  }else{
    if(abs(dp)<1e-9) return 0.0;
    float t=cp/dp; if(t<=0.0) return 0.0;
    X=v*t+vec3(0.0, 0.0, 1.0);
  }
  float tau=ringTauG(length(X));
  if(tau<=0.0) return 0.0;
  float xs=dot(X, s);
  if(xs<0.0 && dot(X-s*xs, X-s*xs)<1.0) return 0.0;
  float mu=max(abs(dp), 1e-6), teff=tau*min(1.0/mu, ringV.y);
  if(abs(cp)<1e-6) teff*=min(1.0, (2.0*half_/ringU.x)/max(pw, 1e-9));
  float ca=clamp(-dot(v, s), -1.0, 1.0), a=acos(ca);
  return ringV.x*0.8488264*(sin(a)+(3.14159265-a)*ca)*(1.0-exp(-teff));
}`;
