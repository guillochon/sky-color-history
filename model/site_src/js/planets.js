// The five naked-eye planets, placed for the selected date and clock time like the Moon. Orbits
// are JPL's approximate Keplerian elements (Standish, "Approximate Positions of the Planets",
// table 1, J2000 ecliptic, valid 1800-2050), with the Earth-Moon barycentre standing in for
// the Earth. Older epochs reuse today's orbits on the selected date, as the Moon does, since
// where the planets were on a day millions of years ago cannot be known. Magnitudes follow
// Meeus (Astronomical Algorithms), including Saturn's ring tilt.
// Each row: name, elements (a AU, e, I, L, long. perihelion, long. node; degrees), their rates
// per Julian century, and a tint.
const PLANETS=[
  ['Mercury', [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081], [1.0, 0.94, 0.86]],
  ['Venus', [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418], [1.0, 0.99, 0.93]],
  ['Mars', [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343], [1.0, 0.68, 0.48]],
  ['Jupiter', [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106], [1.0, 0.95, 0.86]],
  ['Saturn', [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794], [1.0, 0.92, 0.72]],
];
const PLANET_EARTH=[[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]];
const PLANET_N=PLANETS.length;
// Heliocentric J2000 ecliptic position (AU) from elements at T Julian centuries after J2000.
function planetHelio(el, rate, T){
  const r=Math.PI/180, [a, e, I, L, wbar, node]=el.map((v, i)=>v+rate[i]*T);
  const M=((L-wbar)%360+540)%360-180, w=wbar-node;
  let E=M*r+e*Math.sin(M*r);
  for(let k=0;k<8;k++) E-=(E-e*Math.sin(E)-M*r)/(1-e*Math.cos(E));
  const xp=a*(Math.cos(E)-e), yp=a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w*r), sw=Math.sin(w*r), cn=Math.cos(node*r), sn=Math.sin(node*r), ci=Math.cos(I*r), si=Math.sin(I*r);
  return [(cw*cn-sw*sn*ci)*xp+(-sw*cn-cw*sn*ci)*yp, (cw*sn+sw*cn*ci)*xp+(-sw*sn+cw*cn*ci)*yp, sw*si*xp+cw*si*yp];
}
// Apparent V magnitude (Meeus) from heliocentric distance r, geocentric distance d, phase angle i (deg).
function planetMag(name, r, d, i, ringSinB){
  const base=5*Math.log10(r*d);
  if(name==='Mercury') return -0.42+base+0.0380*i-0.000273*i*i+0.000002*i*i*i;
  if(name==='Venus') return -4.40+base+0.0009*i+0.000239*i*i-0.00000065*i*i*i;
  if(name==='Mars') return -1.52+base+0.016*i;
  if(name==='Jupiter') return -9.40+base+0.005*i;
  return -8.88+base+0.044*i-2.60*ringSinB+1.25*ringSinB*ringSinB;
}
// The same display scale as the stars and satellites, in the planet's own tint.
function planetDisplay(mag, tint){ const d=magDisplay(mag, 200); return {px:d.px, rgb:tint.map(c=>Math.min(2.4, c)*d.amp)}; }
// Write the planets into slots STAR_N to STAR_N+PLANET_N-1 of the star texture. Positions are
// J2000, precessed to the same year as the stars so they sit correctly among them.
function placePlanets(lat, tex, marks, up, epochKey, year, LST){
  const T=(astroDay()-1.5)/36525;
  const earth=planetHelio(PLANET_EARTH[0], PLANET_EARTH[1], T), R=Math.hypot(...earth);
  const eps=23.43928*Math.PI/180, ce=Math.cos(eps), se=Math.sin(eps);
  // Saturn's ring-plane pole, J2000 equatorial (RA 40.589, Dec 83.537).
  const pr=40.589*Math.PI/180, pd=83.537*Math.PI/180, pole=[Math.cos(pd)*Math.cos(pr), Math.cos(pd)*Math.sin(pr), Math.sin(pd)];
  PLANETS.forEach(([name, el, rate, tint], k)=>{
    const h=planetHelio(el, rate, T), g=[h[0]-earth[0], h[1]-earth[1], h[2]-earth[2]];
    const r=Math.hypot(...h), d=Math.hypot(...g);
    const q=[g[0], g[1]*ce-g[2]*se, g[1]*se+g[2]*ce];
    const ra=(Math.atan2(q[1], q[0])*180/Math.PI+360)%360, dec=Math.asin(q[2]/d)*180/Math.PI;
    const i=Math.acos(Math.max(-1, Math.min(1, (r*r+d*d-R*R)/(2*r*d))))*180/Math.PI;
    const ringSinB=name==='Saturn'?Math.abs(q[0]*pole[0]+q[1]*pole[1]+q[2]*pole[2])/d:0;
    const mag=planetMag(name, r, d, i, ringSinB);
    const place=starMeanPlace([ra, dec, mag, 0, 0, 0], epochKey, year);
    const p=raDecAltaz(lat, place.ra, place.dec, LST);
    const slot=STAR_N+k, o=slot*4, c=STAR_MAP_W*4+o;
    tex[o+3]=0; tex[c+3]=0;
    if(!(p.alt>0)) return;
    const show=planetDisplay(mag, tint), dir=horizDir(p.az, p.alt);
    tex[o]=dir[0]; tex[o+1]=dir[1]; tex[o+2]=dir[2]; tex[o+3]=show.px;
    tex[c]=show.rgb[0]; tex[c+1]=show.rgb[1]; tex[c+2]=show.rgb[2]; tex[c+3]=mag;
    marks.push({az:p.az, el:p.alt, px:show.px, rgb:show.rgb, planet:name, mag});
    up.push({i:slot, x:dir[0], y:dir[1], z:dir[2]});
  });
}
