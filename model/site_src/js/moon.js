/* ---------- first-person view of the day sky ---------- */
const SUN_RADIUS_DEG=0.2666; // mean solar angular radius: IAU radius over one astronomical unit
const SUNANG=SUN_RADIUS_DEG; // VR disk. The fisheye enlarges the Sun and Moon together.
let vrFov=60; // VR vertical field of view in degrees: twice the angle a desktop monitor fills; the scroll wheel zooms it
const VR_FOV_MIN=10, VR_FOV_MAX=90;
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
// extend the long-term drift and stay beyond 30 Earth radii.
const MOON_RE={
  modern:60.14, modernpoll:60.14, ozonehole:60.14, y2100:60.14, volcanic:60.14, geminga:60.14, zetaoph:60.14,
  kpg66:59.93, carbon30:58.56, ordovician466:58.21, snowball07:57.71,
  proterozoic22:50.98, archean27thin:47.60, archean27:47.60, archean27vthick:47.60,
  archean38:40.4, hadean40:39.8, hadean44:38.7
};
const MOON_R_KM=1737.4, EARTH_R_KM=6378.14;
// Length of the solar day in hours, from the Moon distances above: the Earth-Moon angular
// momentum is held fixed, so a closer Moon means a faster-spinning Earth. This reproduces the
// day lengths Farhat et al. 2022 (Tables D.1, D.2) give for their Moon distances to within
// 0.1 h, and it gives 15.2 h at 3.2 Ga.
const DAY_HOURS={
  kpg66:23.8, carbon30:22.6, ordovician466:22.3, snowball07:21.9, proterozoic22:17.4,
  archean27thin:15.6, archean27:15.6, archean27vthick:15.6,
  archean38:12.8, hadean40:12.6, hadean44:12.3
};
// The page's clock runs over one solar day of the epoch, so a day has dayHours() hours. The
// variable `minutes` stays the fraction of that day times 1440, so the Sun, Moon, stars and
// calendar all keep step with it.
function dayHours(){ return DAY_HOURS[EP[dIdx].key]||24; }
// Allen 1976 phase law, as used by Krisciunas & Schaefer 1991, PASP 103, 1033.
// Full-Moon V is −12.73 and the Sun is −26.74, both at mean distance. Within 7°
// of full the Moon is up to 35% brighter than that curve (opposition surge).
const MOON_V_FULL=-12.73, MOON_V_SUN=-26.74, MOON_OPP=0.35, MOON_RE_NOW=60.14;
const MOON_SUN_FULL=Math.pow(10, -0.4*(MOON_V_FULL-MOON_V_SUN));
// The Moon's limb profile: relative change in its radius at position angle pa (radians from
// north through east), mountains and valleys from a few fixed waves. Real limb relief is about
// 0.2% of the radius; this is about three times that, so the beads show on the enlarged disk. Mirrored
// in the sky shader as limbH.
function limbH(pa){ return 0.002*Math.sin(7*pa+1.3)+0.00167*Math.sin(12*pa+4.1)+0.00133*Math.sin(19*pa+2.2)+0.001*Math.sin(29*pa+5.0)+0.00083*Math.sin(41*pa+0.7)+0.00067*Math.sin(57*pa+3.3)+0.0005*Math.sin(83*pa+1.9); }
// Apparent lunar radius at a distance of r Earth radii from the observer.
function moonRadiusAt(r){ return Math.atan(MOON_R_KM/(r*EARTH_R_KM))*180/Math.PI; }
// Apparent solar radius for the Sun's mean anomaly M: the mean radius over the Earth-Sun distance in AU,
// times the epoch's Sun over today's (gen_site.py sun_radius, from its luminosity and temperature:
// 0.90 at 4.4 Ga, 0.93 at 2.7 Ga, 0.98 at 700 Ma). SUN_RADIUS_DEG stays the drawings' scale.
function sunRadiusAt(M){ return SUN_RADIUS_DEG*((EP[dIdx]&&EP[dIdx].sunR)||1)/(1.00014-0.01671*cosd(M)-0.00014*cosd(2*M)); }
function rev(x){ x%=360; return x<0?x+360:x; }
function sind(x){ return Math.sin(x*Math.PI/180); }
function cosd(x){ return Math.cos(x*Math.PI/180); }
function dayNumber(y,m,D,ut){ const div=(a,b)=>Math.trunc(a/b); return 367*y - div(7*(y+div(m+9,12)),4) + div(275*m,9) + D - 730530 + ut/24; }
function localISODate(t){ const p=n=>String(n).padStart(2,'0'); return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()); }
function instantUT(){
  const [Y,M,D]=pageDate();
  const local=new Date(Y,M-1,D, Math.floor(minutes/60), Math.floor(minutes%60), Math.floor((minutes*60)%60));
  return { y:local.getUTCFullYear(), m:local.getUTCMonth()+1, D:local.getUTCDate(),
    ut:local.getUTCHours()+local.getUTCMinutes()/60+local.getUTCSeconds()/3600,
    lon:-local.getTimezoneOffset()/60*15 };
}
// Low-precision lunar theory, Schlyter / van Flandern & Pulkkinen, about 0.05°. The Sun's angles
// run on d. For a closer Moon (rate, its angular speed relative to today's) the mean longitude
// runs rate times faster, but the node and perigee turn more slowly: the Sun drives them, as
// (Sun's speed)²/(Moon's speed), so they run 1/rate as fast. The Sun's perturbations of the
// orbit (evection, variation and the rest) shrink with the same ratio, taken to first order.
function moonEquatorial(d, rate=1){
  const ecl=23.4393-3.563e-7*d;
  const ws=282.9404+4.70935e-5*d, Ms=rev(356.0470+0.9856002585*d);
  const dm=DN_NEW0+(d-DN_NEW0)*rate, dp=DN_NEW0+(d-DN_NEW0)/rate, kp=1/rate;
  const Nm=rev(125.1228-0.0529538083*dp), wm=rev(318.0634+0.1643573223*dp);
  const Mm=rev(115.3654+125.1228+318.0634+(13.0649929509-0.0529538083+0.1643573223)*dm-Nm-wm);
  const e=0.054900, a=60.2666, i=5.1454;
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
  return {RA:Math.atan2(ye,xg)*180/Math.PI, Dec:Math.atan2(ze,Math.hypot(xg,ye))*180/Math.PI, Ls, Ms, r};
}
// The Sun is placed for the date by sunEquatorial (calendar.js); sunGeom gives its hour angle
// from the clock. Eclipses are this Sun and the Moon.
const DN_UNIX=dayNumber(1970,1,1,0), DN_NEW0=dayNumber(2000,1,6,18.23);
// A closer Moon goes round faster: by Kepler's third law its angular speed goes as the
// distance to the power -1.5 (the 2000 new Moon is kept as the reference). The month is then
// 27.6 days of today's at 700 Ma, 22.6 at 2.2 Ga, 20.3 at 2.7 Ga and 14.7 at 4.4 Ga: 28 to 31
// of each epoch's own shorter days, and 18 months a year at 2.7 Ga, as tidal rhythmites suggest.
function moonRate(){ return Math.pow(MOON_RE_NOW/(MOON_RE[EP[dIdx].key]||MOON_RE_NOW), 1.5); }
function synodic(){ return 360/(13.17639648*moonRate()-0.98564736); }
function dayOfMs(ms){ return DN_UNIX+ms/86400000; }
function eqVec(ra, dec){ return [cosd(dec)*cosd(ra), cosd(dec)*sind(ra), sind(dec)]; }
function geoPair(d){ const eq=moonEquatorial(d, moonRate()), sun=sunEquatorial(d); return {eq, m:eqVec(eq.RA, eq.Dec), s:eqVec(sun.RA, sun.Dec)}; }
// Closest geocentric approach of the Moon to that Sun in lunation k (golden-section search
// within 2.5 days of the mean new Moon), cached per Moon speed.
const lunations=new Map();
function lunation(k){
  const id=k+'|'+moonRate(); let L=lunations.get(id); if(L) return L;
  const f=t=>{ const g=geoPair(t); return -(g.m[0]*g.s[0]+g.m[1]*g.s[1]+g.m[2]*g.s[2]); };
  const gr=(Math.sqrt(5)-1)/2; let a=DN_NEW0+k*synodic()-2.5, b=a+5, c=b-gr*(b-a), e=a+gr*(b-a), fc=f(c), fe=f(e);
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
  const sc=(MOON_RE[EP[dIdx].key]||MOON_RE_NOW)/MOON_RE_NOW, gap=Math.hypot(L.d[0], L.d[1], L.d[2]);
  const w=(1-smooth01(0.35, 0.7, Math.abs(d-L.t0)))*Math.min(1, Math.asin(1/(L.r*sc))/Math.max(gap, 1e-9));
  const v=vnorm([g.m[0]+L.d[0]*w, g.m[1]+L.d[1]*w, g.m[2]+L.d[2]*w]);
  return {v, s:g.s, RA:Math.atan2(v[1], v[0])*180/Math.PI, Dec:Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI, Ls:g.eq.Ls, Ms:g.eq.Ms, r:g.eq.r*sc};
}
// The eclipse at time ms: separation and true radii in degrees. The Moon's distance is from the
// observer, an Earth radius closer than the Earth's centre with the Moon overhead.
function eclipseAt(ms){
  const d=dayOfMs(ms), m=moonAt(d);
  const el=90-sunGeom(LATDEG[dLat], pageAt(d).min, Math.asin(Math.max(-1, Math.min(1, m.s[2])))*180/Math.PI).sza;
  const sep=Math.acos(Math.max(-1, Math.min(1, m.v[0]*m.s[0]+m.v[1]*m.s[1]+m.v[2]*m.s[2])))*180/Math.PI;
  return {sep, rS:sunRadiusAt(m.Ms), rM:moonRadiusAt(m.r-Math.max(0, sind(el))), el};
}
function altaz(lat,dec,H){
  const phi=lat*Math.PI/180, d=dec*Math.PI/180, h=H*Math.PI/180;
  const sinAlt=Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.cos(h);
  const alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)))*180/Math.PI;
  const A=Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(phi)-Math.tan(d)*Math.cos(phi));
  let az=(180+A*180/Math.PI)%360; if(az<0) az+=360;
  return {alt, az};
}
function lunarPlace(lat){
  const eq=moonAt(astroDay());
  let H=rev(localSidereal()-rev(eq.RA)); if(H>180) H-=360;
  const p=altaz(lat, eq.Dec, H), radDeg=moonRadiusAt(eq.r-Math.max(0, sind(p.alt))), sunRadDeg=sunRadiusAt(eq.Ms);
  return {az:p.az, el:p.alt, radDeg, rad:radDeg*Math.PI/180, sunRadDeg, on:apparentEl(p.alt)>-radDeg*DISK_SCALE};
}

