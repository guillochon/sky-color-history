/* ---------- first-person view of the day sky ---------- */
const SUN_RADIUS_DEG=0.2666; // mean solar angular radius: IAU radius over one astronomical unit
let vrFov=60; // VR vertical field of view in degrees: twice the angle a desktop monitor fills; the scroll wheel or a pinch zooms it
// Down to 0.004° (14 arcseconds), where Titan's drawn disk is about a fifth of the view and the
// Galilean moons' a third to a half; past 0.4° the drawn Sun is already finer than its spot map.
// Deeper while a smaller body is on screen (vr_input.js vrFovMin), till it spans VR_FILL_MIN of the
// view's narrower side.
const VR_FOV_MIN=0.004, VR_FOV_MAX=90, VR_FILL_MIN=0.25;
const DISK_SCALE=4; // Sun and Moon are drawn at four times their angular size
const DOME_DISK=11; // fisheye solar radius in pixels, half the previous enlargement
// Limb darkening: toward its edge the Sun is seen through higher, cooler photosphere, so the edge is
// dimmer and redder than the centre. Hestroffer & Magnan 1998 (A&A 333, 338) fit the intensity at
// mu (the cosine of the angle from the line of sight to the surface normal there) as mu^alpha, with
// alpha=-0.023+0.292/lambda (µm). In linear sRGB that is mu^SUN_LD_FULL per channel, to under 1% for a
// Sun of 5,560 to 5,772 K and any epoch's air, which only multiplies the spectrum. The model's direct
// sunlight is the whole disk's, mean over centre (alpha+2)/2, so the centre is a little bluer still.
function sunLimbAlpha(lam){ return -0.023+292/lam; }
const SUN_LD_FULL=[0.434, 0.513, 0.641];
// The drawing keeps a fifth of it, so the edge only hints at it: the real contrast, on a disk drawn
// near white, reads as a dark rim. The spectrum (sunLimbAlpha) keeps the full law.
const SUN_LD_DRAW=0.2, SUN_LD=SUN_LD_FULL.map(a=>a*SUN_LD_DRAW), SUN_LD_C=SUN_LD.map(a=>(a+2)/(SUN_LD[1]+2));
// mu at fraction r of the disk's radius, held at 0.1 at the very edge (about what its last pixel averages).
function limbMu(r){ return Math.sqrt(Math.max(0.01, 1-r*r)); }
// The disk's drawn colour (sRGB bytes, the whole disk's) at fraction r of its radius, as sRGB bytes;
// the centre keeps the drawn colour's brightest channel.
function sunLimbRGB(rgb, r){
  const lin=rgb.map(v=>SRGB_LIN[Math.round(v)]), c=lin.map((v, i)=>v*SUN_LD_C[i]), k=Math.max(...lin)/Math.max(...c, 1e-9), mu=limbMu(r);
  return c.map((v, i)=>linToByte(v*k*Math.pow(mu, SUN_LD[i])));
}
// Sæmundsson 1986: true altitude (degrees) to apparent altitude, scaled by the epoch's refraction
// (sunset.js refK). Matches Bennett in the shader.
function apparentEl(h){ if(h>80) return h; const u=h+10.3/(h+5.11); if(u<0.25) return h; return h+refK()*(1.02/Math.tan(u*Math.PI/180))/60; }
// Mean Earth-Moon distance in Earth radii. Younger than 3.2 Ga the values are
// interpolated from Farhat, Auclair-Desrotour, Boué & Laskar 2022, A&A 665, L1,
// Table 2 (and the Williams Elatina point in Table 3). 3.2 Ga is 70% of the
// present distance, from Eulenfeld & Heubeck 2023, JGR Planets. Older ages
// extend the long-term drift and stay beyond 30 Earth radii. At 4.50 Ga, some ten million years
// after the giant impact, the Moon is still at about 8 Earth radii: the solidifying magma ocean
// raised little tide, and it had receded only to 7-9 by the time the ocean froze (Korenaga 2023,
// Icarus 400, 115564).
const MOON_RE=aliasEpochs({
  modern:60.14, modernpoll:60.14, ozonehole:60.14, y2100:60.14, volcanic:60.14, geminga:60.14, zetaoph:60.14,
  kpg66:59.93, carbon30:58.56, ordovician466:58.21, snowball07:57.71, cryogenian65:57.82,
  proterozoic22:50.98, archean27thin:47.60, archean27:47.60, archean27vthick:47.60,
  archean38:40.4, hadean40:39.8, hadean45:8.0
});
// Before the giant impact there is no Moon: the proto-Earth of 4.55 Ga.
// No Moon before the impact that made it (epoch_time.js T_IMPACT).
function noMoon(){ return ageMaOf(EP[dIdx].key)>(2000-T_IMPACT)/1e6; }
// Inside the Laplace radius the Moon's orbit precesses about the Earth's equator, not the
// ecliptic (Tremaine, Touma & Namouni 2009, eq. 24). For the present Earth that radius is 8.4
// Earth radii. A fluid Earth on a 5.9-hour day has J2 larger by (24/5.9)^2, and the radius
// larger by (24/5.9)^(2/5), about 15 Earth radii: the 4.5 Ga Moon, at 8, is drawn in the equator.
function moonInEquatorAt(A){ return moonDistAt(A)<8.4*Math.pow(24/dayHoursAt(A), 0.4); }
// The orbit's tilt to the ecliptic in degrees (lunar_inclination.py): today's 5.145° taken back
// along the distances above with the tidal model of Ćuk, Hamilton, Lock & Stewart 2016 (Nature
// 539, 402). Earth's tides tilt the orbit less as the Moon recedes, and tides raised in the Moon
// damp it, most strongly near 33 Earth radii, where the Moon's own tilt swings large: so the
// orbit was a little steeper then, 5.5° at 2.7 Ga and 5.8° at 4.0 Ga (a little more for a Moon
// stiffer or more dissipative). The 17–30° and more those papers find for the young
// Moon belong to before 33 Earth radii, older than any epoch here but 4.5 Ga, whose Moon is in
// the equator's plane (MOON_EQUATORIAL).
const MOON_INC_NOW=5.1454;
const MOON_INC=aliasEpochs({
  carbon30:5.18, ordovician466:5.19, snowball07:5.20, cryogenian65:5.20, proterozoic22:5.37,
  archean27thin:5.46, archean27:5.46, archean27vthick:5.46, archean38:5.75, hadean40:5.80
});
// The orbit's eccentricity. Run back in time with tides in the Moon included, it grows: from
// today's 0.0549 to 0.09 (0.07–0.11) by the time the Moon is 45.6 Earth radii out (Daher et al.
// 2021, JGR Planets 126, e2021JE006875, Table 8), here in step with the distance, 0.0025 more
// for each Earth radius closer; Zahnle et al. (2015, EPSL 427, 74) also expect it to have grown
// while the Moon was 20–40 Earth radii out, by how much they cannot say. At 4.5 Ga the Moon has
// been through the evection resonance, which in the Ćuk & Stewart 2012 example (Science 338,
// 1047, Fig. 3) holds e near 0.45 from about 9 to 68 kyr, and ten million years on,
// tides raised in it at 8 Earth radii (damping e in 10³–10⁵ years) have made the orbit nearly
// round again. The Moon keeps one face to the Earth, but turns at a steady rate while it goes
// round faster at perigee: it rocks east and west by about 2e radians each month, ±6.3° today
// and ±12° at 4 Ga.
const MOON_ECC_NOW=0.0549;
const MOON_ECC=aliasEpochs({
  kpg66:0.0557, carbon30:0.0592, ordovician466:0.0601, snowball07:0.0613, cryogenian65:0.0610, proterozoic22:0.0781,
  archean27thin:0.0866, archean27:0.0866, archean27vthick:0.0866, archean38:0.1046, hadean40:0.1061, hadean45:0.01
});
// The Moon's obliquity to its orbit, θ (lunar_inclination.py, Cassini state 2: its pole tilted
// from the orbit's, beyond the ecliptic's): it rocks north and south by θ each month, 6.7° today,
// and more as the Moon nears the Cassini-state transition at about 33 Earth radii. At 4.5 Ga it
// is inside the transition, in Cassini state 1 about the Earth's equator, and its pole is the
// orbit's (Ward 1975, Science 189, 377).
const MOON_OBL_NOW=6.68;
const MOON_OBL=aliasEpochs({
  kpg66:6.74, carbon30:6.93, ordovician466:6.99, snowball07:7.06, cryogenian65:7.05, proterozoic22:8.68,
  archean27thin:10.24, archean27:10.24, archean27vthick:10.24, archean38:20.83, hadean40:22.88, hadean45:0
});
const MOON_R_KM=1737.4, EARTH_R_KM=6378.14;
// Length of the solar day in hours, from the Moon distances above: the Earth-Moon angular
// momentum is held fixed, so a closer Moon means a faster-spinning Earth. This reproduces the
// day lengths Farhat et al. 2022 (Tables D.1, D.2) give for their Moon distances to within
// 0.1 h, and it gives 15.2 h at 3.2 Ga.
const DAY_HOURS=aliasEpochs({
  kpg66:23.8, carbon30:22.6, ordovician466:22.3, snowball07:21.9, cryogenian65:22.0, proterozoic22:17.4,
  archean27thin:15.6, archean27:15.6, archean27vthick:15.6,
  archean38:12.8, hadean40:12.6, hadean45:5.9,
  // How fast the proto-Earth turned before the impact cannot be known; half a day is a guess.
  protoearth455:12
});
// The Moon and the day through time (epoch_time.js): the values above at the epochs, and between
// them the Moon's history from lunar_inclination.py (moon_history.js), worked out once.
const once=f=>{ let v; return ()=>v||(v=f()); };
// The Moon's distance at year A: through the nodes of that history (the epochs' MOON_RE, and 3.2
// and 4.4 Ga), linearly in time between them as that model takes it; from 4.4 Ga back to the 4.50
// Ga Moon at 8 Earth radii it recedes under a constant tidal response (da/dt as a^-5.5, so a^6.5
// runs linearly in time); older than that epoch, it is that epoch's.
const moonPts=once(()=>MOON_HIST.a.map(([ma, a])=>[2000-ma*1e6, a]).concat([[epochAnchor('hadean45'), MOON_RE.hadean45]]).sort((p, q)=>p[0]-q[0]));
function moonDistAt(A){ const P=moonPts(); return A<P[1][0]?alongTime(P.slice(0, 2), A, a=>a**6.5, x=>x**(1/6.5)):alongTime(P, A); }
// Between epochs, something that follows the Moon runs in step with the square root of its distance
// (the orbit's angular momentum) rather than with time.
function alongMoon(P, A, to=x=>x, from=x=>x){
  const [i, u]=timeBracket(P, A);
  if(u===0) return P[i][1]; if(u===1) return P[i+1][1];
  const s0=Math.sqrt(moonDistAt(P[i][0])), s1=Math.sqrt(moonDistAt(P[i+1][0])), f=Math.abs(s1-s0)>1e-12?(Math.sqrt(moonDistAt(A))-s0)/(s1-s0):u;
  return f===0?P[i][1]:from(to(P[i][1])*(1-f)+to(P[i+1][1])*f);
}
// The day at year A: DAY_HOURS at the epochs that give it and 24 hours now; between them, with
// the Earth–Moon angular momentum held, the spin rate (1/day) runs in step with the Moon. Older
// than the 4.50 Ga epoch its 5.9 hours, and before the giant impact (the proto-Earth's span) that
// epoch's guess.
const dayPts=once(()=>epochPoints({...DAY_HOURS, protoearth455:undefined}, 24));
function dayHoursAt(A){ return A<epochSpan('hadean45')[0]?DAY_HOURS.protoearth455:alongMoon(dayPts(), A, h=>1/h, x=>1/x); }
// The orbit's tilt and the Moon's obliquity: the history's (MOON_HIST.it, by age) scaled to meet
// MOON_INC and MOON_OBL (and today's) exactly at the epochs. Older than 4.4 Ga the tilt holds, and
// inside the Cassini-state transition at 33 Earth radii the obliquity is 0 (state 1).
function moonHistAt(A, col){
  const H=MOON_HIST.it, ma=Math.max(0, (2000-A)/1e6);
  if(ma>=H[H.length-1][0]) return H[H.length-1][col];
  let lo=0, hi=H.length-1;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(H[m][0]<=ma) lo=m; else hi=m; }
  const u=(ma-H[lo][0])/(H[hi][0]-H[lo][0]); return H[lo][col]*(1-u)+H[hi][col]*u;
}
const incScale=once(()=>epochPoints(MOON_INC, MOON_INC_NOW).map(([A, v])=>[A, v/moonHistAt(A, 1)]));
const oblScale=once(()=>epochPoints({...MOON_OBL, hadean45:undefined}, MOON_OBL_NOW).map(([A, v])=>[A, v/moonHistAt(A, 2)]));
function moonIncAt(A){ return moonHistAt(A, 1)*alongTime(incScale(), A); }
function moonOblAt(A){ return moonDistAt(A)<33?0:moonHistAt(A, 2)*alongTime(oblScale(), A); }
// The eccentricity: MOON_ECC at the epochs and today's now, in step with the Moon between them.
const eccPts=once(()=>epochPoints(MOON_ECC, MOON_ECC_NOW));
function moonEccAt(A){ return alongMoon(eccPts(), A); }
// At the year shown.
const moonDistNow=byTime(moonDistAt), dayHoursNow=byTime(dayHoursAt), moonIncNow=byTime(moonIncAt), moonOblNow=byTime(moonOblAt),
  moonEccNow=byTime(moonEccAt), moonInEquatorNow=byTime(moonInEquatorAt);
function moonDist(){ return moonDistNow(); }
function moonInc(){ return moonIncNow(); }
function moonObl(){ return moonOblNow(); }
function moonInEquator(){ return moonInEquatorNow(); }
// The page's clock runs over one solar day of the year shown, so a day has dayHours() hours. The
// variable `minutes` stays the fraction of that day times 1440, so the Sun, Moon, stars and
// calendar all keep step with it.
function dayHours(){ return dayHoursNow(); }
function dayHoursLabel(){ const h=dayHours(); return h===24?'24':h.toFixed(2).replace(/\.?0+$/, ''); }
// Allen 1976 phase law, as used by Krisciunas & Schaefer 1991, PASP 103, 1033.
// Full-Moon V is −12.73 and the Sun is −26.74, both at mean distance. Within 7°
// of full the Moon is up to 35% brighter than that curve (opposition surge).
const MOON_V_FULL=-12.73, MOON_V_SUN=-26.74, MOON_OPP=0.35, MOON_RE_NOW=60.14;
const MOON_SUN_FULL=Math.pow(10, -0.4*(MOON_V_FULL-MOON_V_SUN));
// The Moon's limb profile: relative change in its radius at position angle pa (radians from
// north through east), from its heights as it is turned now (moon_surface.js moonLimbSync), read
// between the profile's points; the sky shader reads the same profile as limbH.
function limbH(pa){
  const x=((pa/(2*Math.PI))%1+1)%1*LIMB_N, i=Math.floor(x), f=x-i;
  return moonLimbProf[i%LIMB_N]*(1-f)+moonLimbProf[(i+1)%LIMB_N]*f;
}
// Until the heights are in, and for the molten Moon, mountains and valleys from a few fixed waves:
// real limb relief is about 0.2% of the radius, and this is about three times that (moon_surface.js
// scales it to LIMB_X, as the real profile is drawn).
function limbFake(pa){ return 0.002*Math.sin(7*pa+1.3)+0.00167*Math.sin(12*pa+4.1)+0.00133*Math.sin(19*pa+2.2)+0.001*Math.sin(29*pa+5.0)+0.00083*Math.sin(41*pa+0.7)+0.00067*Math.sin(57*pa+3.3)+0.0005*Math.sin(83*pa+1.9); }
// Apparent lunar radius at a distance of r Earth radii from the observer.
function moonRadiusAt(r){ return Math.atan(MOON_R_KM/(r*EARTH_R_KM))*180/Math.PI; }
// Apparent solar radius for the Sun's mean anomaly M: the mean radius over the Earth-Sun distance in AU,
// times the Sun's then over today's (epoch_time.js sunRadiusRel, from its luminosity and temperature:
// 0.90 at 4.5 Ga, 0.93 at 2.7 Ga, 0.98 at 700 Ma). SUN_RADIUS_DEG stays the drawings' scale.
function sunRadiusAt(M){ return SUN_RADIUS_DEG*sunRadiusRel()/(1.00014-0.01671*cosd(M)-0.00014*cosd(2*M)); }
function rev(x){ x%=360; return x<0?x+360:x; }
function sind(x){ return Math.sin(x*Math.PI/180); }
function cosd(x){ return Math.cos(x*Math.PI/180); }
// Dates in the proleptic Gregorian calendar for any year, negative ones too: Date takes years 0–99
// as 1900–1999 unless they are set with setFullYear.
// Date reaches only 271,821 years either side of 1970; further out, whole 400-year Gregorian
// cycles of 146,097 days are counted off first.
function utcDay(Y, M, D){
  const k=Math.abs(Y-2000)>200000?Math.trunc((Y-2000)/400):0, t=new Date(0);
  t.setUTCFullYear(Y-400*k, M-1, D); return t.getTime()/86400000+146097*k;
}
function localDate(Y, M0, D, h=0, mi=0, s=0, ms=0){ const t=new Date(2000, 0, 1, h, mi, s, ms); t.setFullYear(Y, M0, D); return t; }
// Days from 2000 Jan 0.0 UT (Schlyter's day number), exact in every century.
function dayNumber(y,m,D,ut){ return utcDay(y, m, 1)+D-1-10956+ut/24; }
function localISODate(t){ return fmtDate(t.getFullYear(), t.getMonth()+1, t.getDate()); }
function instantUT(){
  const [Y,M,D]=pageDate();
  // To the millisecond, so the meteors (meteors.js) play smoothly in real time.
  const local=localDate(Y,M-1,D, Math.floor(minutes/60), Math.floor(minutes%60), Math.floor((minutes*60)%60), Math.floor((minutes*60000)%1000));
  return { y:local.getUTCFullYear(), m:local.getUTCMonth()+1, D:local.getUTCDate(),
    ut:local.getUTCHours()+local.getUTCMinutes()/60+(local.getUTCSeconds()+local.getUTCMilliseconds()/1000)/3600,
    lon:-local.getTimezoneOffset()/60*15 };
}
// Low-precision lunar theory, Schlyter / van Flandern & Pulkkinen, about 0.05°. The Sun's angles
// run on d. For a closer Moon (rate, its angular speed relative to today's) the mean longitude
// runs rate times faster, but the node and perigee turn more slowly: the Sun drives them, as
// (Sun's speed)²/(Moon's speed), so they run 1/rate as fast. The Sun's perturbations of the
// orbit (evection, variation and the rest) shrink with the same ratio, taken to first order.
// inc is the orbit's tilt to the ecliptic (MOON_INC), e its eccentricity (MOON_ECC).
// With eqPlane the orbit lies in the equator instead: tilted by the obliquity, its ascending node on
// the ecliptic held at the autumnal equinox.
function moonEquatorial(d, rate=1, inc=MOON_INC_NOW, eqPlane=false, e=MOON_ECC_NOW){
  const ecl=obliquity(d);
  const ws=282.9404+4.70935e-5*d, Ms=rev(356.0470+0.9856002585*d);
  const dm=DN_NEW0+(d-DN_NEW0)*rate, dp=DN_NEW0+(d-DN_NEW0)/rate, kp=1/rate;
  if(eqPlane) inc=ecl;
  const Nm=eqPlane?180:rev(125.1228-0.0529538083*dp), wm=rev(318.0634+0.1643573223*dp);
  const Mm=rev(115.3654+125.1228+318.0634+(13.0649929509-0.0529538083+0.1643573223)*dm-Nm-wm);
  const a=60.2666, i=inc;
  let E=Mm+e*(180/Math.PI)*sind(Mm)*(1+e*cosd(Mm));
  E=E-(E-e*(180/Math.PI)*sind(E)-Mm)/(1-e*cosd(E));
  const xv=a*(cosd(E)-e), yv=a*(Math.sqrt(1-e*e)*sind(E));
  const v=Math.atan2(yv,xv)*180/Math.PI, r0=Math.hypot(xv,yv);
  const xh=r0*(cosd(Nm)*cosd(v+wm)-sind(Nm)*sind(v+wm)*cosd(i));
  const yh=r0*(sind(Nm)*cosd(v+wm)+cosd(Nm)*sind(v+wm)*cosd(i));
  const zh=r0*(sind(v+wm)*sind(i));
  let lonecl=Math.atan2(yh,xh)*180/Math.PI, latecl=Math.atan2(zh,Math.hypot(xh,yh))*180/Math.PI;
  const Ls=rev(Ms+ws), Lm=rev(Mm+wm+Nm), Dm=Lm-Ls, F=Lm-Nm;
  lonecl+=kp*(-1.274*sind(Mm-2*Dm)+0.658*sind(2*Dm)-0.186*sind(Ms)-0.059*sind(2*Mm-2*Dm)-0.057*sind(Mm-2*Dm+Ms)+0.053*sind(Mm+2*Dm)+0.046*sind(2*Dm-Ms)+0.041*sind(Mm-Ms)-0.035*sind(Dm)-0.031*sind(Mm+Ms)-0.015*sind(2*F-2*Dm)+0.011*sind(Mm-4*Dm));
  latecl+=kp*(-0.173*sind(F-2*Dm)-0.055*sind(Mm-F-2*Dm)-0.046*sind(Mm+F-2*Dm)+0.033*sind(F+2*Dm)+0.017*sind(2*Mm+F));
  const r=r0-kp*(0.58*cosd(Mm-2*Dm)+0.46*cosd(2*Dm));
  const xg=r*cosd(lonecl)*cosd(latecl), yg=r*sind(lonecl)*cosd(latecl), zg=r*sind(latecl);
  const ye=yg*cosd(ecl)-zg*sind(ecl), ze=yg*sind(ecl)+zg*cosd(ecl);
  return {RA:Math.atan2(ye,xg)*180/Math.PI, Dec:Math.atan2(ze,Math.hypot(xg,ye))*180/Math.PI, Ls, Ms, r, Nm, i, F, ecl};
}
// The Moon's axes at day d, in the equatorial frame: its pole P, and the directions of its prime
// meridian M (0°, 0°, the middle of the near side) and of 90° E, E. It turns at a steady rate, so
// its prime meridian points at the Earth's mean place, the mean argument of latitude F along its
// equator from the orbit's node; its pole is tilted from the orbit's by θ (MOON_OBL) toward the
// ecliptic's, the three in one plane (Cassini's laws). Where the Moon truly is against that mean
// place, and where the viewer stands, is its libration: the sky shader and the dome draw the
// globe on these axes.
function moonAxesEq(d){
  const eq=moonEquatorial(d, moonRate(), moonInc(), moonInEquator(), moonEcc());
  const th=moonObl(), n=[cosd(eq.Nm), sind(eq.Nm), 0];
  const h=[sind(eq.i)*sind(eq.Nm), -sind(eq.i)*cosd(eq.Nm), cosd(eq.i)], q=vcross(h, n);
  const P=vnorm(vadd(vscale(h, cosd(th)), vscale(q, sind(th)), [0, 0, 0])), e2=vcross(P, n);
  const M=vscale(vadd(vscale(n, cosd(eq.F)), vscale(e2, sind(eq.F)), [0, 0, 0]), -1), E=vcross(P, M);
  const eqf=v=>[v[0], v[1]*cosd(eq.ecl)-v[2]*sind(eq.ecl), v[1]*sind(eq.ecl)+v[2]*cosd(eq.ecl)];
  return {P:eqf(P), M:eqf(M), E:eqf(E)};
}
// Those axes in the horizon frame (dome_bodies.js horizDir) at latitude lat.
function moonAxes(lat){
  const a=moonAxesEq(astroDay()), lst=localSidereal();
  const h=v=>{ const p=raDecAltaz(lat, Math.atan2(v[1], v[0])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI, lst); return horizDir(p.az, p.alt); };
  return {P:h(a.P), M:h(a.M), E:h(a.E)};
}
// The Sun is placed for the date by sunEquatorial (calendar.js); sunGeom gives its hour angle
// from the clock. Eclipses are this Sun and the Moon.
const DN_UNIX=dayNumber(1970,1,1,0), DN_NEW0=dayNumber(2000,1,6,18.23);
// A closer Moon goes round faster: by Kepler's third law its angular speed goes as the
// distance to the power -1.5 (the 2000 new Moon is kept as the reference). The month is then
// 27.6 days of today's at 700 Ma, 22.6 at 2.2 Ga, 20.3 at 2.7 Ga and 15.3 at 4.0 Ga: 28 to 31
// of each epoch's own shorter days, and 18 months a year at 2.7 Ga, as tidal rhythmites suggest.
// At 4.5 Ga, 8 Earth radii out, it is 1.33 days, 5.4 of that epoch's own.
function moonRate(){ return Math.pow(MOON_RE_NOW/moonDist(), 1.5); }
function synodic(){ return 360/(13.17639648*moonRate()-0.98564736); }
function dayOfMs(ms){ return DN_UNIX+ms/86400000; }
function eqVec(ra, dec){ return [cosd(dec)*cosd(ra), cosd(dec)*sind(ra), sind(dec)]; }
function moonEcc(){ return moonEccNow(); }
function geoPair(d){ const eq=moonEquatorial(d, moonRate(), moonInc(), moonInEquator(), moonEcc()), sun=sunEquatorial(d); return {eq, m:eqVec(eq.RA, eq.Dec), s:eqVec(sun.RA, sun.Dec)}; }
// A Moon this close shifts by several degrees from where the Earth's centre sees it (7° at 8 Earth
// radii): it is placed as seen from the ground, and the best seat below is left out.
function moonNear(){ return moonDist()<20; }
// Closest geocentric approach of the Moon to that Sun in lunation k (golden-section search
// within 2.5 days of the mean new Moon), cached per Moon speed and tilt.
const lunations=new Map();
function lunation(k){
  const id=k+'|'+moonRate()+'|'+moonInc()+'|'+moonEcc(); let L=lunations.get(id); if(L) return L;
  if(lunations.size>4000) lunations.clear();
  const f=t=>{ const g=geoPair(t); return -(g.m[0]*g.s[0]+g.m[1]*g.s[1]+g.m[2]*g.s[2]); };
  const P=synodic(), w=Math.min(2.5, 0.2*P), gr=(Math.sqrt(5)-1)/2; let a=DN_NEW0+k*P-w, b=a+2*w, c=b-gr*(b-a), e=a+gr*(b-a), fc=f(c), fe=f(e);
  for(let i=0;i<40;i++){
    if(fc<fe){ b=e; e=c; fe=fc; c=b-gr*(b-a); fc=f(c); }
    else { a=c; c=e; fc=fe; e=a+gr*(b-a); fe=f(e); }
  }
  const t0=(a+b)/2, g=geoPair(t0);
  L={t0, d:[g.s[0]-g.m[0], g.s[1]-g.m[1], g.s[2]-g.m[2]], r:g.eq.r};
  lunations.set(id, L); return L;
}
// The best seat. Seen from the Earth's surface the Moon shifts by up to its horizontal parallax
// (about 1°) against the Sun, so around each new Moon the page stands where that shift brings
// it closest to the Sun: at the moment of closest geocentric approach the Moon is moved toward
// the Sun by the parallax, or all the way if the gap is smaller. The offset is held fixed through
// the eclipse, so the Moon still crosses the Sun at its true speed, and fades out from 8 to 17
// hours away, when the Moon is far from the Sun.
function moonAt(d){
  const g=geoPair(d), k=Math.round((d-DN_NEW0)/synodic()), L=lunation(k);
  const sc=moonDist()/MOON_RE_NOW, gap=Math.hypot(L.d[0], L.d[1], L.d[2]);
  const w=moonNear()?0:(1-smooth01(0.35, 0.7, Math.abs(d-L.t0)))*Math.min(1, Math.asin(1/(L.r*sc))/Math.max(gap, 1e-9));
  const v=vnorm([g.m[0]+L.d[0]*w, g.m[1]+L.d[1]*w, g.m[2]+L.d[2]*w]);
  return {v, s:g.s, RA:Math.atan2(v[1], v[0])*180/Math.PI, Dec:Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI, Ls:g.eq.Ls, Ms:g.eq.Ms, r:g.eq.r*sc};
}
// The eclipse at time ms: separation and true radii in degrees. The Moon's distance is from the
// observer, an Earth radius closer than the Earth's centre with the Moon overhead.
function eclipseAt(ms){
  const d=dayOfMs(ms), m=moonAt(d);
  const el=90-sunGeom(LATDEG[dLat], pageAt(d).min, Math.asin(Math.max(-1, Math.min(1, m.s[2])))*180/Math.PI).sza;
  if(noMoon()) return {sep:180, rS:sunRadiusAt(m.Ms), rM:0, el};
  if(moonNear()){
    // From the ground: the Moon's and Sun's places in the horizon frame, the Moon's parallax taken out.
    const pg=pageAt(d), lst=rev(sunEquatorial(d).RA+(pg.min/60-12)*15), lat=LATDEG[dLat];
    const mp=topoMoon(raDecAltaz(lat, m.RA, m.Dec, lst), m.r), sp=raDecAltaz(lat, Math.atan2(m.s[1], m.s[0])*180/Math.PI, Math.asin(m.s[2])*180/Math.PI, lst);
    const sep=Math.acos(Math.max(-1, Math.min(1, vdot(horizDir(mp.az, mp.alt), horizDir(sp.az, sp.alt)))))*180/Math.PI;
    return {sep, rS:sunRadiusAt(m.Ms), rM:moonRadiusAt(mp.r), el};
  }
  const sep=Math.acos(Math.max(-1, Math.min(1, m.v[0]*m.s[0]+m.v[1]*m.s[1]+m.v[2]*m.s[2])))*180/Math.PI;
  return {sep, rS:sunRadiusAt(m.Ms), rM:moonRadiusAt(m.r-Math.max(0, sind(el))), el};
}
// The Moon seen from the ground at geocentric altitude p.alt and distance r (Earth radii): the
// observer stands an Earth radius from the centre, straight up.
function topoMoon(p, r){
  const g=horizDir(p.az, p.alt), v=[g[0]*r, g[1]*r, g[2]*r-1], n=Math.hypot(...v);
  return {az:(Math.atan2(v[0], v[1])*180/Math.PI+360)%360, alt:Math.asin(v[2]/n)*180/Math.PI, r:n};
}
function altaz(lat,dec,H){
  const phi=lat*Math.PI/180, d=dec*Math.PI/180, h=H*Math.PI/180;
  const sinAlt=Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.cos(h);
  const alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)-Math.tan(d)*Math.cos(phi));
  let az=(180+A*180/Math.PI)%360; if(az<0) az+=360;
  return {alt, az};
}
// altaz for right ascension ra at local sidereal time LST, the hour angle taken from -180 to 180.
function raDecAltaz(lat, ra, dec, LST){ let H=rev(LST-rev(ra)); if(H>180) H-=360; return altaz(lat, dec, H); }
function lunarPlace(lat){
  const eq=moonAt(astroDay());
  // No Moon: kept far below the horizon, where nothing draws or lights it.
  if(noMoon()){ const sunRadDeg=sunRadiusAt(eq.Ms); return {az:0, el:-90, radDeg:1e-4, rad:1e-4*Math.PI/180, sunRadDeg, on:false, none:true}; }
  let p=raDecAltaz(lat, eq.RA, eq.Dec, localSidereal()), radDeg;
  if(moonNear()){ p=topoMoon(p, eq.r); radDeg=moonRadiusAt(p.r); }
  else radDeg=moonRadiusAt(eq.r-Math.max(0, sind(p.alt)));
  const sunRadDeg=sunRadiusAt(eq.Ms);
  return {az:p.az, el:p.alt, radDeg, rad:radDeg*Math.PI/180, sunRadDeg, on:apparentEl(p.alt)>-radDeg*DISK_SCALE, ax:moonAxes(lat)};
}

