/* ---------- first-person view of the day sky ---------- */
const SUN_RADIUS_DEG=0.2666; // mean solar angular radius: IAU radius over one astronomical unit
const SUNANG=SUN_RADIUS_DEG; // VR disk. The fisheye enlarges the Sun and Moon together.
const VR_FOV_DEG=60; // twice the angle a desktop monitor fills
const DISK_SCALE=4; // Sun and Moon are drawn at four times their angular size
const DOME_DISK=11; // fisheye solar radius in pixels, half the previous enlargement
// Sæmundsson 1986: true altitude (degrees) to apparent altitude. Matches Bennett in the shader.
function apparentEl(h){ if(h>80) return h; const u=h+10.3/(h+5.11); if(u<0.25) return h; return h+(1.02/Math.tan(u*Math.PI/180))/60; }
// Mean Earth-Moon distance in Earth radii. Younger than 3.2 Ga the values are
// interpolated from Farhat, Auclair-Desrotour, Boué & Laskar 2022, A&A 665, L1,
// Table 2 (and the Williams Elatina point in Table 3). 3.2 Ga is 70% of the
// present distance, from Eulenfeld & Heubeck 2023, JGR Planets. Older ages
// extend the long-term drift and stay beyond 30 Earth radii.
const MOON_RE={
  modern:60.14, modernpoll:60.14, ozonehole:60.14, y2100:60.14, volcanic:60.14, geminga:60.14, zetaoph:60.14,
  kpg66:59.93, carbon30:58.56, snowball07:57.71,
  proterozoic22:50.98, archean27thin:47.60, archean27:47.60, archean27vthick:47.60,
  archean38:40.4, hadean40:39.8, hadean44:38.7
};
const MOON_R_KM=1737.4, EARTH_R_KM=6378.14;
// Allen 1976 phase law, as used by Krisciunas & Schaefer 1991, PASP 103, 1033.
// Full-Moon V is −12.73 and the Sun is −26.74, both at mean distance. Within 7°
// of full the Moon is up to 35% brighter than that curve (opposition surge).
const MOON_V_FULL=-12.73, MOON_V_SUN=-26.74, MOON_OPP=0.35, MOON_RE_NOW=60.14;
const MOON_SUN_FULL=Math.pow(10, -0.4*(MOON_V_FULL-MOON_V_SUN));
function moonRadiusDeg(key){ return Math.atan(MOON_R_KM/((MOON_RE[key]||60.14)*EARTH_R_KM))*180/Math.PI; }
function rev(x){ x%=360; return x<0?x+360:x; }
function sind(x){ return Math.sin(x*Math.PI/180); }
function cosd(x){ return Math.cos(x*Math.PI/180); }
function dayNumber(y,m,D,ut){ const div=(a,b)=>Math.trunc(a/b); return 367*y - div(7*(y+div(m+9,12)),4) + div(275*m,9) + D - 730530 + ut/24; }
function localISODate(t){ const p=n=>String(n).padStart(2,'0'); return t.getFullYear()+'-'+p(t.getMonth()+1)+'-'+p(t.getDate()); }
function shiftMoonDate(days){
  const el=document.getElementById('moonDate');
  const raw=el.value||localISODate(new Date());
  const [Y,M,D]=raw.split('-').map(Number);
  el.value=localISODate(new Date(Y, M-1, D+days));
}
function instantUT(){
  const raw=(document.getElementById('moonDate').value)||localISODate(new Date());
  const [Y,M,D]=raw.split('-').map(Number);
  const local=new Date(Y,M-1,D, Math.floor(minutes/60), Math.floor(minutes%60), Math.floor((minutes*60)%60));
  return { y:local.getUTCFullYear(), m:local.getUTCMonth()+1, D:local.getUTCDate(),
    ut:local.getUTCHours()+local.getUTCMinutes()/60+local.getUTCSeconds()/3600,
    lon:-local.getTimezoneOffset()/60*15 };
}
// Low-precision lunar theory, Schlyter / van Flandern & Pulkkinen, about 0.05°.
function moonEquatorial(d){
  const ecl=23.4393-3.563e-7*d;
  const ws=282.9404+4.70935e-5*d, Ms=rev(356.0470+0.9856002585*d);
  const Nm=rev(125.1228-0.0529538083*d), wm=rev(318.0634+0.1643573223*d), Mm=rev(115.3654+13.0649929509*d);
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
  lonecl+=-1.274*sind(Mm-2*Dm)+0.658*sind(2*Dm)-0.186*sind(Ms)-0.059*sind(2*Mm-2*Dm)-0.057*sind(Mm-2*Dm+Ms)+0.053*sind(Mm+2*Dm)+0.046*sind(2*Dm-Ms)+0.041*sind(Mm-Ms)-0.035*sind(Dm)-0.031*sind(Mm+Ms)-0.015*sind(2*F-2*Dm)+0.011*sind(Mm-4*Dm);
  latecl+=-0.173*sind(F-2*Dm)-0.055*sind(Mm-F-2*Dm)-0.046*sind(Mm+F-2*Dm)+0.033*sind(F+2*Dm)+0.017*sind(2*Mm+F);
  const r=r0-0.58*cosd(Mm-2*Dm)-0.46*cosd(2*Dm);
  const xg=r*cosd(lonecl)*cosd(latecl), yg=r*sind(lonecl)*cosd(latecl), zg=r*sind(latecl);
  const ye=yg*cosd(ecl)-zg*sind(ecl), ze=yg*sind(ecl)+zg*cosd(ecl);
  return {RA:Math.atan2(ye,xg)*180/Math.PI, Dec:Math.atan2(ze,Math.hypot(xg,ye))*180/Math.PI, Ls};
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
  const ins=instantUT(), eq=moonEquatorial(dayNumber(ins.y,ins.m,ins.D,ins.ut));
  const GMST=rev(eq.Ls+180+ins.ut*15), LST=rev(GMST+ins.lon);
  let H=rev(LST-rev(eq.RA)); if(H>180) H-=360;
  const p=altaz(lat, eq.Dec, H), radDeg=moonRadiusDeg(EP[dIdx].key);
  return {az:p.az, el:p.alt, radDeg, rad:radDeg*Math.PI/180, on:apparentEl(p.alt)>-radDeg*DISK_SCALE};
}

