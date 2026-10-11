// The planets, the five naked-eye ones and Uranus and Neptune, placed for the selected date and clock time like the Moon. Orbits
// are JPL's approximate Keplerian elements (Standish, "Approximate Positions of the Planets",
// table 1, J2000 ecliptic, valid 1800-2050), with the Earth-Moon barycentre standing in for
// the Earth. Older epochs reuse today's orbits on the selected date, as the Moon does, since
// where the planets were on a day millions of years ago cannot be known. Magnitudes follow
// Meeus (Astronomical Algorithms), including Saturn's ring tilt; Uranus's and Neptune's follow
// Mallama & Hilton (2018). Each is drawn as a disk of its
// true angular size, enlarged as the Sun and Moon are, lit from the Sun's side, so the inner
// planets' phases show once the view is zoomed in far enough; Jupiter's and Saturn's major moons
// are placed about them.
// Each row: name, elements (a AU, e, I, L, long. perihelion, long. node; degrees), their rates
// per Julian century, and a tint.
const PLANETS=[
  ['Mercury', [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081], [1.0, 0.94, 0.86]],
  ['Venus', [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418], [1.0, 0.99, 0.93]],
  ['Mars', [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343], [1.0, 0.68, 0.48]],
  ['Jupiter', [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106], [1.0, 0.95, 0.86]],
  ['Saturn', [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794], [1.0, 0.92, 0.72]],
  ['Uranus', [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589], [0.80, 0.95, 1.0]],
  ['Neptune', [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664], [0.66, 0.80, 1.0]],
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
  if(name==='Uranus') return -7.11+base+0.00009*i;
  if(name==='Neptune') return -7.00+base;
  return -8.88+base+0.044*i-2.60*ringSinB+1.25*ringSinB*ringSinB;
}
// Each planet's equatorial radius (km), flattening, north pole (J2000 RA, Dec; IAU WGCCRE 2015)
// and how bright its drawn disk is against the Moon's photograph (1 the Moon's brightest).
const PLANET_BODY=[
  [2439.7, 0, 281.0103, 61.4155],
  [6051.8, 0, 272.76, 67.16],
  [3396.19, 0.00589, 317.681, 52.887],
  [71492, 0.06487, 268.0566, 64.4953],
  [60268, 0.09796, 40.589, 83.537],
  [25559, 0.02293, 257.311, -15.175],
  [24764, 0.0171, 299.36, 43.46],
];
const PL_AU_KM=149597870.7, LIGHT_DAY_AU=1/173.1446;
// Each planet's prime meridian, W at J2000 and its rate (degrees, degrees a day; IAU WGCCRE 2015),
// for those drawn with longitudes: Mercury's, Mars's, and Jupiter's System II (the clouds' and the Red
// Spot's), not the IAU's System III.
const PLANET_W=[[329.5988, 6.1385108], null, [176.630, 350.89198226], [43.3, 870.270], null, null, null];
// The major moons of Jupiter and Saturn: name, host (index in PLANETS), radius (km), absolute
// magnitude H, orbit radius (km), mean longitude at J2000 TDB (degrees, in the host's equator
// from its ascending node on the J2000 equator), mean motion (degrees a day) and a tint. Fit to JPL
// Horizons over 1980-2060 as circles in the host's equator. The Galilean moons add the largest
// term of each's longitude (after Meeus, Astronomical Algorithms ch. 44: their resonance for Io
// and Europa, the eccentricity for Ganymede and Callisto), as sine and cosine amplitudes (degrees)
// of an argument at J2000 and its rate, which brings them to 0.01-0.07 degrees rms; Saturn's are
// good to about 0.2 degrees (Tethys, inclined 1 degree, to 1.5); Titan's orbit is fit with its
// eccentricity (0.0287) and its perihelion's longitude at J2000 and rate, to 0.03 degrees.
const PLANET_MOONS=[
  ['Io', 3, 1821.6, -1.68, 421768, 19.9493, 203.48895825, [1.0, 0.92, 0.66], null, [0.4728, 0, -389.1122, 204.22846878]],
  ['Europa', 3, 1560.8, -1.41, 671106, 214.5047, 101.37472438, [1.0, 0.96, 0.88], null, [1.1066, 0.0392, -14.5584, 102.11423278]],
  ['Ganymede', 3, 2631.2, -2.09, 1070438, 221.7855, 50.31760736, [0.96, 0.93, 0.88], null, [0.1885, -0.0703, 331.18, 50.310482]],
  ['Callisto', 3, 2410.3, -1.05, 1882795, 80.9713, 21.57107270, [0.86, 0.82, 0.76], null, [0.8363, -0.0103, 87.45, 21.569231]],
  ['Tethys', 4, 531.1, 0.64, 294673, 187.8645, 190.69795524, [0.98, 0.98, 0.96]],
  ['Dione', 4, 561.4, 0.84, 377416, 176.9161, 131.53493034, [0.96, 0.96, 0.94]],
  ['Rhea', 4, 763.8, 0.14, 527068, 52.1768, 79.69004576, [0.96, 0.95, 0.92]],
  ['Titan', 4, 2574.7, -1.28, 1221865, 7.5598, 22.5769764, [1.0, 0.78, 0.5], [0.028706, 204.03, 0.0014156]],
  // The rest of the round moons of Saturn, Uranus and Neptune (fit_moons.py, to JPL Horizons over
  // 1980-2060: Mimas to 0.5 degrees, its 71-year libration with Tethys taken as one term; the others
  // to 0.03-0.17). Uranus's go round backwards about its IAU north pole. Where an orbit is tilted to
  // the planet's equator, a last entry gives its plane (moonPlane): Mimas's and Miranda's turn about
  // the pole, Iapetus's about its Laplace plane's (15 degrees toward Saturn's orbit's) once in
  // 3,200 years, retrograde Triton's about Neptune's pole once in 690.
  ['Mimas', 4, 198.2, 3.25, 185536, 347.4134, 382.99398557, [0.95, 0.95, 0.94], [0.019674, 332.77, 2.0004067], [0.0140, -43.4153, 230.64, 0.01396253], [40.5890, 83.5370, 1.5758, 172.9325, -0.99949532]],
  ['Enceladus', 4, 252.1, 2.25, 238036, 182.2643, 262.73189784, [0.97, 0.99, 1.0], [0.004735, 171.51, 0.3379701], [-0.2490, -0.0670, 238.26, 0.08924991]],
  ['Iapetus', 4, 734.3, 1.45, 3560842, 303.6384, 4.53825929, [0.92, 0.86, 0.78], [0.028447, 94.87, 0.0005759], null, [288.2423, 78.6733, -7.5977, -102.9686, -0.00031139]],
  ['Miranda', 5, 235.8, 3.08, 129848, 47.8198, 254.74607387, [0.92, 0.92, 0.92], null, [1.3237, 0.5268, 296.53, 0.07855182], [257.3110, -15.1750, 175.5723, -100.8549, 0.05541318]],
  ['Ariel', 5, 578.9, 0.99, 190929, 336.8819, -142.83564848, [0.95, 0.94, 0.92], [0.001131, 117.29, -0.0196816]],
  ['Umbriel', 5, 584.7, 1.76, 265981, 288.7502, -86.86887381, [0.86, 0.85, 0.84], [0.003781, 192.97, -0.0083648]],
  ['Titania', 5, 788.9, 0.78, 436282, 258.4333, -41.35141472, [0.94, 0.92, 0.89], [0.001585, 313.44, -0.0037375]],
  ['Oberon', 5, 761.4, 0.99, 583450, 187.4367, -26.73948201, [0.93, 0.9, 0.86], null, [-0.1576, 0.0308, 183.73, 26.73763393]],
  ['Triton', 6, 1352.6, -1.24, 354759, 58.5165, 61.25869940, [0.98, 0.93, 0.88], null, null, [299.3990, 43.3851, 156.9025, 177.7673, 0.00143857]],
  // Moons only some epochs have (MOON_EPOCHS). Chrysalis (Wisdom et al. 2022, Science 377, 1285):
  // an icy moon the size of Iapetus between Titan and Iapetus, in 3:1 resonance with Titan, whose
  // break-up about 160 Myr ago would have made the rings and freed Saturn's tilt. Harmonia (named
  // here, after the daughter of Ares, sister of Phobos and Deimos): the moon some 20 times Phobos's
  // mass at 3.3 Mars radii that Cuk et al. (2020, ApJL 896, L28) find tilted Deimos's orbit, one
  // generation of Mars's cycle of rings and moons (Hesselbrock & Minton 2017); radius 30 km, H from
  // Phobos's. Kymo, Galene, Thetis and Amphitrite (Nereids, named here): Neptune's regular moons
  // before it captured Triton (Rufu & Canup 2017, AJ 154, 208, who find a system no heavier than
  // Uranus's fits best), drawn as Ariel, Umbriel, Titania and Oberon at the same distances in
  // Neptune's radii, 6% larger for Neptune's greater mass.
  ['Chrysalis', 4, 735, 0.2, 2541582, 0, 7.5256588, [0.96, 0.96, 0.95]],
  ['Harmonia', 2, 30, 9.7, 11208, 0, 863.4, [0.70, 0.64, 0.58]],
  ['Kymo', 6, 611.9, 0.87, 184987, 0, 162.682953, [0.95, 0.94, 0.92]],
  ['Galene', 6, 618.0, 1.64, 257546, 0, 99.031405, [0.86, 0.85, 0.84]],
  ['Thetis', 6, 833.9, 0.66, 422721, 0, 47.094769, [0.94, 0.92, 0.89]],
  ['Amphitrite', 6, 804.8, 0.87, 565362, 0, 30.448372, [0.93, 0.9, 0.86]],
];
// Which epochs have a moon, for those not in every one: Triton only after its capture, in the giant
// planets' instability; Neptune's first moons before it; Chrysalis from 300 Ma back; Harmonia in
// the Hadean and early Archean, after the Borealis impact (Mars's moons' first generation, about
// 4.3 Ga) and while Deimos's surface, 3.5-4 Gyr old, was being tilted.
const PRE_INSTABILITY={protoearth455:true, hadean45:true};
const LOST_NEPTUNIAN=key=>!!PRE_INSTABILITY[key];
const MOON_EPOCHS={
  Triton:key=>!PRE_INSTABILITY[key], Kymo:LOST_NEPTUNIAN, Galene:LOST_NEPTUNIAN, Thetis:LOST_NEPTUNIAN, Amphitrite:LOST_NEPTUNIAN,
  Chrysalis:key=>(PLANET_AGE_MA[key]||0)>=300, Harmonia:key=>key==='hadean44'||key==='hadean40'||key==='archean38',
};
function moonIn(m, key){ const f=MOON_EPOCHS[m[0]]; return !f||f(key); }
// Bodies that are hypothetical, or named here: the note their label's spectrum carries.
const BODY_NOTES={
  Chrysalis:'hypothetical: Wisdom et al. 2022 (Science) propose it, lost about 160 Myr ago to make the rings',
  Harmonia:'hypothetical, named here: the moon Ćuk et al. 2020 find tilted Deimos’s orbit, one of the generations of Mars’s ring–moon cycle (Hesselbrock & Minton 2017)',
  Kymo:'hypothetical, named here: one of Neptune’s first moons, scattered and destroyed when it captured Triton (Rufu & Canup 2017)',
  Oceanus:'hypothetical, named here: the fifth giant planet of Nesvorný (2011) and Nesvorný & Morbidelli (2012), thrown out of the Solar System by Jupiter in the instability',
  Theia:'the Mars-sized body thought to strike the proto-Earth and make the Moon; where its orbit lay is not known (Branco, Raymond & Machado 2025)',
};
BODY_NOTES.Galene=BODY_NOTES.Thetis=BODY_NOTES.Amphitrite=BODY_NOTES.Kymo;
// The bodies the walk-around view draws as disks at once (bodyP..bodyN in the sky shader): those on
// screen, brightest first, the planets and the moons that show.
const BODY_MAX=15;
// The moons' shadows the sky shader takes at once (rarely more than three fall together).
const SHADOW_MAX=6;
function eqVec(ra, dec){ const r=Math.PI/180, c=Math.cos(dec*r); return [c*Math.cos(ra*r), c*Math.sin(ra*r), Math.sin(dec*r)]; }
// Orbit plane of a moon: the host's equator, x toward its ascending node on the J2000 equator.
function equatorAxes(ra, dec){ const k=eqVec(ra, dec), i=vnorm([-k[1], k[0], 0]); return {i, j:vcross(k, i), k}; }
// A moon's place about its host (km, J2000 equatorial) t days after J2000.
function moonOffset(m, ax, t, dL=0){
  const r=Math.PI/180, ecc=m[8], per=m[9], g=per?(per[2]+per[3]*t)*r:0;
  const L=(m[5]+dL+m[6]*t+(per?per[0]*Math.sin(g)+per[1]*Math.cos(g):0))*r;
  let lon=L, rad=m[4];
  if(ecc){
    const [e, w0, wd]=ecc, M=L-(w0+wd*t)*r;
    let E=M; for(let k=0;k<5;k++) E=M+e*Math.sin(E);
    lon=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2), Math.sqrt(1-e)*Math.cos(E/2))+(w0+wd*t)*r; rad=m[4]*(1-e*Math.cos(E));
  }
  const c=rad*Math.cos(lon), s=rad*Math.sin(lon);
  return [c*ax.i[0]+s*ax.j[0], c*ax.i[1]+s*ax.j[1], c*ax.i[2]+s*ax.j[2]];
}
// A tilted moon's orbit plane t days after J2000 (fit_moons.py cone): its pole k tilted by inc
// from the axis (RA, Dec), its ascending node N on the axis's equator turning at Od a day; the
// moon's longitude counts from N.
function moonPlane(m, t){
  const [ra, dec, inc, O0, Od]=m[10], r=Math.PI/180, A=equatorAxes(ra, dec), O=(O0+Od*t)*r;
  const N=vadd(vscale(A.i, Math.cos(O)), vscale(A.j, Math.sin(O)), [0, 0, 0]);
  const k=vadd(vscale(A.k, Math.cos(inc*r)), vscale(vcross(A.k, N), -Math.sin(inc*r)), [0, 0, 0]);
  return {i:N, j:vcross(k, N), k};
}
// Before the giant planets' instability (Nesvorný & Morbidelli 2012's best start): Jupiter and
// Saturn in 3:2 resonance, then a third ice giant, Oceanus, in 3:2 with Saturn, Uranus in 2:1 with
// it and Neptune in 3:2 with Uranus, Jupiter a little farther out than now. Each keeps its other
// elements; its mean longitude runs at its new period.
const EARLY_A={Jupiter:5.6, Saturn:7.34, Uranus:15.27, Neptune:20.0};
function earlyOrbit(name, el, rate){
  const a=EARLY_A[name];
  return a?[[a, ...el.slice(1)], [0, rate[1], rate[2], 36000/Math.pow(a, 1.5), rate[4], rate[5]]]:[el, rate];
}
// Planets only the earliest epochs have: name, elements and rates as PLANETS, tint, body as
// PLANET_BODY, absolute magnitude, the kind it is drawn as, and its epochs. Oceanus (named here:
// the Titan, son of Uranus and brother of Saturn, the world-ocean at the edge of the world): the
// ice giant of about 15 Earth masses ejected by Jupiter (Nesvorný 2011; Nesvorný & Morbidelli 2012),
// drawn as Neptune is, whose size and brightness it would have had. Theia: Mars-sized, on an orbit
// near the Earth's (made up: any that would meet the Earth's will do), as bright as Mars at the
// same distance.
const LOST_PLANETS=[
  ['Oceanus', [9.62, 0.01, 1.0, 0, 30, 60], [0, 0, 0, 36000/Math.pow(9.62, 1.5), 0, 0], [0.62, 0.82, 1.0], [25000, 0.017, 45, 62], -7.0, 6, PRE_INSTABILITY],
  ['Theia', [0.95, 0.07, 1.5, 0, 200, 140], [0, 0, 0, 36000/Math.pow(0.95, 1.5), 0, 0], [0.80, 0.72, 0.62], [3400, 0, 300, 70], -1.5, 7, {protoearth455:true}],
];
// The same display scale as the stars, in the planet's own tint.
function planetDisplay(mag, tint){ const d=magDisplay(mag, 200); return {px:d.px, rgb:tint.map(c=>Math.min(2.4, c)*d.amp)}; }
// How many times their size the planets and moons are drawn: the Sun's and Moon's enlargement in the
// walk-around view, and on the dome its drawn Sun over the true one.
function bodyScale(dome){ return dome?(DOME_DISK/(dome.width*0.46))*90/SUN_RADIUS_DEG:DISK_SCALE; }
// Zooming in stands for looking through binoculars or a telescope: the planets and their moons
// show as the view narrows, by 2.5 magnitudes for each tenfold zoom past the walk-around view's
// usual 60 degrees, or the dome's full view: the moons, fainter than the naked-eye limit or lost
// in their planet's glare, the faint outer planets, and Mercury or Venus low in a bright twilight
// or by day, as a telescope finds them.
function moonGain(){ return vrOn?2.5*Math.log10(Math.max(1, 60/vrFov)):2.5*Math.log10(Math.max(1, domeZoom.z)); }
// A mark's magnitude for whether it shows: a planet's or moon's less the zoom's gain.
function markMag(s){ return s.planet?s.mag-moonGain():s.mag; }
// How a planet's or moon's point is drawn, at that same gain: brighter and larger as the view
// zooms, as through a telescope, so a moon that shows is not left a near-black dot.
function zoomedDisplay(o){ return o.tint?planetDisplay(o.mag-moonGain(), o.tint):o; }
// The epochs before history, and their ages in Myr. On any day of one of them, where each planet and
// moon was on its orbit cannot be known: the Solar System is chaotic, its uncertainties growing
// tenfold every ~10 Myr (Laskar 1989), and an epoch's age is uncertain by far more than any orbital
// period. Each is drawn at a place on its orbit drawn at random for the epoch (seeded by its key),
// moving on from there with the date; Jupiter's moons share one offset, keeping their resonance.
// The orbits' shapes are today's: known back to about 50 Myr (La2010; Zeebe & Lourens 2019), only
// statistically before.
const PLANET_AGE_MA={protoearth455:4550, hadean45:4500, hadean44:4400, hadean40:4000, archean38:3800, archean27thin:2700, archean27:2700, archean27vthick:2700, proterozoic22:2200, snowball07:700, ordovician466:466, carbon30:300, kpg66:66, zetaoph:1.78, geminga:0.342};
// Saturn's rings may be young: their mass and how little meteoroid dust darkens them put them at
// 100-400 Myr (Iess et al. 2019; Kempf et al. 2023), though whether they are is still argued.
// They are drawn from Chrysalis's break-up, about 160 Myr ago, on, and left out before, where
// Chrysalis is drawn.
const RINGS_MA=160, RINGS_DEBATED_MA=100;
function planetPhases(key){
  const P=planetPhases.cache||(planetPhases.cache={});
  if(P[key]!==undefined) return P[key];
  if(PLANET_AGE_MA[key]==null) return P[key]=null;
  let h=2166136261; for(const c of key) h=Math.imul(h^c.charCodeAt(0), 16777619);
  // Drawn in this order so each table's later rows leave the earlier ones' phases as they were.
  const rand=mulberry32(h>>>0), planets=PLANETS.map(()=>rand()*360), jup=rand()*360;
  const moons=PLANET_MOONS.map(m=>m[1]===3?jup:rand()*360);
  return P[key]={planets, moons, lost:LOST_PLANETS.map(()=>rand()*360)};
}
// Jupiter's Great Red Spot, from its first sure sighting in 1831 (Schwabe; Cassini's "permanent
// spot" of 1665-1713 may have been another storm) on. Its System II longitude (degrees, unwrapped)
// by year, from Project Pluto's table (grs_lon.txt: Peek's The Planet Jupiter for 1831-1952,
// JUPOS since), every half year or more, then drifting on 16 degrees a year. Its size, in degrees
// of longitude and latitude: Simon et al. (2018) fit 405.0-0.1939 Y and 107.2-0.0483 Y from 1979;
// before, it shrank 0.114 degrees a year (1943-1979, Beebe & Youngblood) from about 35 degrees
// long in the 1880s, its width near today's. The fits meet, a round spot 8.4 degrees across, in
// 2045, and it is held there: whether it shrinks on, steadies or fades is not known. Its red was
// deepest in 1879-1882 and has deepened again since 2014. Centred at 22.4 degrees south.
const GRS_LON=[1831.63,3308,1832.72,3220,1840.37,2816,1845.83,2549,1850.20,2345,1851.29,2297,1852.38,2246,1855.66,2109,1856.75,2075,1857.84,2046,1858.94,2014,1860.03,1996,1863.30,1849,1864.40,1782,1867.67,1607,1869.86,1485,1873.13,1304,1876.41,1117,1878.59,976,1880.78,848,1884.05,755,1887.33,733,1889.51,714,1891.70,714,1892.79,716,1893.88,718,1894.97,720,1896.07,727,1897.16,735,1898.25,742,1899.34,751,1900.44,760,1901.53,766,1902.62,762,1903.71,754,1904.80,745,1905.90,748,1906.99,738,1908.08,743,1909.17,737,1910.26,728,1911.36,688,1912.45,664,1913.54,621,1914.63,564,1915.72,533,1916.82,490,1917.91,439,1919.00,370,1920.09,322,1921.19,284,1922.28,256,1923.37,230,1924.46,172,1925.55,90,1926.65,21,1927.74,-16,1928.83,-45,1929.92,-76,1931.02,-103,1932.11,-131,1933.20,-157,1934.29,-180,1935.38,-201,1936.47,-218,1937.57,-221,1938.66,-213,1939.75,-194,1940.84,-187,1941.94,-191,1943.03,-188,1944.12,-177,1945.21,-148,1946.30,-143,1947.40,-130,1948.49,-126,1949.58,-119,1950.67,-110,1951.77,-104,1952.86,-89,1957.28,-52,1962.67,14,1964.73,18,1966.02,22,1967.20,28,1968.16,27,1969.34,21,1970.30,19,1971.03,16,1971.70,7,1972.44,-1,1973.79,7,1974.40,14,1975.08,29,1975.87,45,1976.77,41,1978.29,55,1979.80,61,1980.37,58,1980.93,53,1982.00,54,1983.57,39,1984.42,28,1986.50,19,1987.83,14,1988.83,16,1989.83,30,1990.92,27,1991.42,32,1992.08,34,1993.08,38,1994.25,40,1995.33,42,1996.50,51,1997.33,62,1998.83,64,1999.92,66,2000.75,74,2001.33,76,2001.83,77,2003.00,80,2003.67,84,2004.75,94,2006.17,104,2007.33,114,2008.17,121,2009.54,138,2010.77,156,2011.58,168,2012.58,182,2013.75,202,2014.25,212,2015.00,226,2015.92,236,2016.67,253,2017.58,276,2018.25,288,2018.83,296,2019.33,309,2019.83,320,2020.58,339,2021.25,357,2021.92,365,2022.83,386,2024.00,410,2024.75,421,2025.92,439];
const GRS_LAT=-22.4;
// The year whose Red Spot an epoch shows: the year it stands for, keeping the page date's time of
// year, or for today's skies the page date's own.
const GRS_YEAR={volcanic:1815, ozonehole:1990, y2100:2100};
function grsAt(Y){
  if(!(Y>=1831.6)) return null;
  const T=GRS_LON, n=T.length/2;
  let lon;
  if(Y>=T[2*n-2]) lon=T[2*n-1]+16*(Y-T[2*n-2]);
  else { let k=0; while(T[2*k+2]<=Y) k++; lon=T[2*k+1]+(T[2*k+3]-T[2*k+1])*(Y-T[2*k])/(T[2*k+2]-T[2*k]); }
  let L, W;
  if(Y>=1979){ const y=Math.min(Y, 2045.3); L=405.0-0.1939*y; W=107.2-0.0483*y; }
  else { W=11.62; L=Y>=1943?21.26+0.114*(1979-Y):Y>=1880?25.36+(35-25.36)*(1943-Y)/63:35; }
  const k=0.7+0.3*Math.max(smooth01(1876, 1879, Y)*(1-smooth01(1882, 1886, Y)), smooth01(2012, 2017, Y));
  return {lon:((lon%360)+360)%360, L, W, k, held:Y>2045.3};
}
// Whether a moon is hidden behind its host's drawn disk, in the view showing.
function markHidden(s){ return !!s.host&&s.behind&&s.rho<(vrOn?DISK_SCALE:bodyScale(dome)); }
// Where every planet and moon of the last render is, set or not, for find (find.js): true
// altitude, azimuth and angular radius, by name.
const BODY_WHERE=new Map();
// Write the planets and their moons into the marks and the walk-around view's bodies. Positions
// are J2000, precessed to the same year as the stars so they sit correctly among them; each J2000
// direction (a pole, the way to the Sun) is turned into the local horizon frame the same way.
// Each shines by the epoch's sunlight: the young Sun's fainter light dims them all alike.
function placePlanets(lat, marks, bodies, epochKey, year, LST){
  const phases=planetPhases(epochKey), ageMa=PLANET_AGE_MA[epochKey]||0, rings=ageMa<RINGS_MA;
  const dimMag=-2.5*Math.log10((EP[dIdx]&&EP[dIdx].sunL)||1);
  const T=(astroDay()-1.5)/36525, tD=T*36525;
  const earth=planetHelio(PLANET_EARTH[0], PLANET_EARTH[1], T), R=Math.hypot(...earth);
  const eps=23.43928*Math.PI/180, ce=Math.cos(eps), se=Math.sin(eps), eq=v=>[v[0], v[1]*ce-v[2]*se, v[1]*se+v[2]*ce];
  const toRaDec=v=>{ const m=Math.hypot(...v); return [(Math.atan2(v[1], v[0])*180/Math.PI+360)%360, Math.asin(v[2]/m)*180/Math.PI]; };
  const horiz=v=>{ const [ra, dec]=toRaDec(v), place=starMeanPlace([ra, dec, 0, 0, 0, 0], epochKey, year), p=raDecAltaz(lat, place.ra, place.dec, LST); return {az:p.az, alt:p.alt, ra:place.ra, dec:place.dec, dir:horizDir(p.az, p.alt)}; };
  const early=!!PRE_INSTABILITY[epochKey];
  BODY_WHERE.clear();
  PLANETS.forEach(([name, el0, rate0, tint], k)=>{
    const [Rkm, flat, pra, pdec]=PLANET_BODY[k], [el, rate]=early?earlyOrbit(name, el0, rate0):[el0, rate0];
    const h=planetHelio(phases?el.map((v, n)=>n===3?v+phases.planets[k]:v):el, rate, T), g=[h[0]-earth[0], h[1]-earth[1], h[2]-earth[2]];
    const r=Math.hypot(...h), d=Math.hypot(...g);
    const q=eq(g), qn=q.map(v=>v/d), pole=eqVec(pra, pdec);
    const i=Math.acos(Math.max(-1, Math.min(1, (r*r+d*d-R*R)/(2*r*d))))*180/Math.PI;
    const ringed=name==='Saturn'&&rings, ringSinB=ringed?Math.abs(vdot(qn, pole)):0;
    const mag=planetMag(name, r, d, i, ringSinB)+dimMag;
    const p=horiz(q);
    const radDeg=Math.atan(Rkm/(d*PL_AU_KM))*180/Math.PI, show=planetDisplay(mag, tint);
    BODY_WHERE.set(name, {az:p.az, el:p.alt, radDeg, rings:ringed, mag});
    // The Red Spot, in the epochs with a calendar, where the light now arriving left it: its
    // longitude's direction in the planet's equator (System II turns 870.270 degrees a day from
    // 43.3 at J2000; a place at west longitude lon is W-lon on from the equator's node).
    let grs=null;
    if(name==='Jupiter'&&!phases){
      const Yp=2000+(tD-d*LIGHT_DAY_AU)/365.25, s=grsAt(GRS_YEAR[epochKey]!=null?GRS_YEAR[epochKey]+Yp-Math.floor(Yp):Yp);
      if(s){
        const ax=equatorAxes(pra, pdec), w=(43.3+870.270*(tD-d*LIGHT_DAY_AU)-s.lon)*Math.PI/180;
        grs={...s, dir:horiz(vadd(vscale(ax.i, Math.cos(w)), vscale(ax.j, Math.sin(w)), [0, 0, 0])).dir};
      }
    }
    const Wk=PLANET_W[k], axk=equatorAxes(pra, pdec), Wr=Wk?(Wk[0]+Wk[1]*(tD-d*LIGHT_DAY_AU))*Math.PI/180:0;
    const meridian=horiz(vadd(vscale(axk.i, Math.cos(Wr)), vscale(axk.j, Math.sin(Wr)), [0, 0, 0])).dir;
    const body={grs, meridian, map:SURF_FILES[name]?name:null, dir:p.dir, rad:radDeg*Math.PI/180, light:vnorm(horiz(eq(h.map(v=>-v))).dir), pole:horiz(pole).dir, kind:k, px:show.px, rgb:show.rgb, mag, front:d<R, shadows:[], rings:ringed, tint};
    if(p.alt>0){
      marks.push({az:p.az, el:p.alt, px:show.px, rgb:show.rgb, planet:name, mag, ra:p.ra, dec:p.dec, radDeg, lit:(1+Math.cos(i*Math.PI/180))/2, body, kind:k, rings:ringed, unknown:!!phases, ageMa, grs, tint});
      bodies.push(body);
    }
    // Its moons, where the light now arriving left them, and the Sun's way from the host.
    const ax=equatorAxes(pra, pdec), sunFrom=vnorm(eq(h.map(v=>-v))), tM=tD-d*LIGHT_DAY_AU;
    PLANET_MOONS.forEach((m, mi)=>{
      if(m[1]!==k||!moonIn(m, epochKey)) return;
      const pl=m[10]?moonPlane(m, tM):ax, off=moonOffset(m, pl, tM, phases?phases.moons[mi]:0), along=vdot(off, qn);
      // On the Sun's side and near enough its line through the host: its shadow may fall on the
      // host. Kept in host radii in the horizon frame, with the moon's radius and the Sun's angular
      // radius there, by which the penumbra widens with distance.
      const sunSide=vdot(off, sunFrom);
      if(sunSide>0&&Math.hypot(...vadd(off, vscale(sunFrom, -sunSide), [0, 0, 0]))<Rkm/(1-flat)+1.5*m[2]){
        const om=Math.hypot(...off);
        body.shadows.push({m:vscale(horiz(off).dir, om/Rkm), rm:m[2]/Rkm, a:696000/(r*PL_AU_KM)});
      }
      // Found even while eclipsed or set.
      { const at=q.map((v, n)=>v*PL_AU_KM+off[n]), w=horiz(at), dw=Math.hypot(...at); BODY_WHERE.set(m[0], {az:w.az, el:w.alt, radDeg:Math.atan(m[2]/dw)*180/Math.PI, host:name, mag:m[3]+5*Math.log10(r*dw/PL_AU_KM)}); }
      // In the host's shadow (a cylinder of its radius away from the Sun): eclipsed.
      const sAlong=vdot(off, sunFrom), sPerp=vscale(vadd(off, vscale(sunFrom, -sAlong), [0, 0, 0]), 1/Rkm);
      if(sAlong<0&&Math.hypot(sPerp[0], sPerp[1], sPerp[2]/(1-flat))<1) return;
      // Its offset across the sky in host radii, the polar one stretched by the flattening, so 1 is the limb.
      const perp=vadd(off, vscale(qn, -along), [0, 0, 0]), pp=vdot(perp, pole), eqP=vadd(perp, vscale(pole, -pp), [0, 0, 0]);
      const rho=Math.hypot(Math.hypot(...eqP), pp/(1-flat))/Rkm;
      const pos=q.map((v, n)=>v*PL_AU_KM+off[n]), dm=Math.hypot(...pos)/PL_AU_KM;
      const mp=horiz(pos);
      if(!(mp.alt>0)) return;
      let mmag=m[3]+5*Math.log10(r*dm)+0.02*i+dimMag;
      // Iapetus's trailing side is ten times as bright as its leading one: V 10.2 at western
      // elongation, 11.9 at eastern, when it moves away from us or toward us.
      if(m[0]==='Iapetus') mmag-=0.85*vdot(qn, vnorm(vcross(pl.k, off)));
      const ms=planetDisplay(mmag, m[7]);
      const mark={az:mp.az, el:mp.alt, px:ms.px, rgb:ms.rgb, planet:m[0], host:name, mag:mmag, ra:mp.ra, dec:mp.dec, radDeg:Math.atan(m[2]/(dm*PL_AU_KM))*180/Math.PI, lit:(1+Math.cos(i*Math.PI/180))/2, behind:along>0, rho, tint:m[7], unknown:!!phases, ageMa};
      // The moons turn synchronously: longitude 0 faces the host, about their orbit's pole.
      mark.body={dir:mp.dir, meridian:horiz(vscale(off, -1)).dir, map:SURF_FILES[m[0]]?m[0]:null, rad:mark.radDeg*Math.PI/180, light:body.light, pole:m[10]?horiz(pl.k).dir:body.pole, kind:BODY_MOON, px:ms.px, rgb:ms.rgb, mag:mmag, front:false, tint:m[7], mark};
      marks.push(mark);
      if(!(mark.behind&&rho<DISK_SCALE)) bodies.push(mark.body);
    });
  });
  // The planets only the earliest epochs have, as the planets are placed but without moons or rings.
  LOST_PLANETS.forEach(([name, el, rate, tint, [Rkm, , pra, pdec], H, kind, eps], li)=>{
    if(!eps[epochKey]) return;
    const h=planetHelio(phases?el.map((v, n)=>n===3?v+phases.lost[li]:v):el, rate, T), g=[h[0]-earth[0], h[1]-earth[1], h[2]-earth[2]];
    const r=Math.hypot(...h), d=Math.hypot(...g), q=eq(g), pole=eqVec(pra, pdec);
    const i=Math.acos(Math.max(-1, Math.min(1, (r*r+d*d-R*R)/(2*r*d))))*180/Math.PI;
    // A giant's phase law (Neptune's: none), or a rocky body's (Mars's).
    const mag=H+5*Math.log10(r*d)+(kind===BODY_MOON?0.016*i:0)+dimMag, p=horiz(q);
    const radDeg=Math.atan(Rkm/(d*PL_AU_KM))*180/Math.PI, show=planetDisplay(mag, tint);
    BODY_WHERE.set(name, {az:p.az, el:p.alt, radDeg, mag});
    const body={grs:null, meridian:null, map:null, dir:p.dir, rad:radDeg*Math.PI/180, light:vnorm(horiz(eq(h.map(v=>-v))).dir), pole:horiz(pole).dir, kind, px:show.px, rgb:show.rgb, mag, front:d<R, shadows:[], rings:false, tint};
    if(p.alt>0){
      marks.push({az:p.az, el:p.alt, px:show.px, rgb:show.rgb, planet:name, mag, ra:p.ra, dec:p.dec, radDeg, lit:(1+Math.cos(i*Math.PI/180))/2, body, kind, rings:false, unknown:!!phases, ageMa, tint});
      bodies.push(body);
    }
  });
  // The walk-around view draws at most BODY_MAX bodies, the brightest on screen first.
  bodies.sort((a, b)=>a.mag-b.mag);
}
// The dome's version of the sky shader's bodyDisk, bodyAlbedo and saturnRing: the colour (before the
// air, times its coverage) of body b where the view ray is src, drawn rad radians across its radius
// and rPx pixels.
// The kinds of body: the planets in order (0-6), then any moon.
const BODY_MOON=7, BODY_FLAT=PLANET_BODY.map(b=>b[1]).concat([0]);
// How bright each kind's disk is drawn, after its albedo: Venus's clouds, lit nearer the Sun,
// are several times brighter per area than the Moon's ground, Saturn's dimmer.
const BODY_GAIN=[1.6, 2.0, 1.2, 1.0, 0.9, 1.0, 1.0, 1.0];
// Each kind's Minnaert k: near 0.5 a disk as bright to its limb as the Moon's, and a crescent
// bright (rock, and Venus's clouds, which scatter forward); near 0.9 the giants' darker limbs.
const BODY_MINN=[0.6, 0.55, 0.7, 0.9, 0.9, 0.85, 0.85, 0.6];
function bandOf(lat, a, b, w){ return smooth01(a-w, a+w, lat)-smooth01(b-w, b+w, lat); }
const mix3=(a, b, t)=>a.map((v, i)=>v+(b[i]-v)*t);
function bodyAlbedo(kind, lat, tint){
  if(kind===0) return [0.66, 0.62, 0.57];
  if(kind===1) return [1.0, 0.96, 0.84];
  if(kind===2) return mix3(mix3([0.86, 0.52, 0.33], [0.66, 0.42, 0.30], 0.6*bandOf(lat, -45, -5, 6)), [0.95, 0.95, 0.97], smooth01(68, 74, Math.abs(lat)));
  if(kind===3){
    const belt=bandOf(lat, 7, 18, 1.5)+bandOf(lat, -21, -8, 1.5)+0.55*(bandOf(lat, 24, 31, 1.5)+bandOf(lat, -33, -26, 1.5))+0.3*(bandOf(lat, 36, 42, 2)+bandOf(lat, -44, -38, 2));
    return mix3(mix3([0.95, 0.91, 0.82], [0.70, 0.53, 0.40], Math.min(1, Math.max(0, belt))), [0.62, 0.60, 0.58], smooth01(45, 70, Math.abs(lat)));
  }
  if(kind===5) return mix3([0.58, 0.84, 0.92], [0.70, 0.88, 0.92], smooth01(50, 80, Math.abs(lat)));
  if(kind===6) return mix3([0.50, 0.66, 0.95], [0.40, 0.55, 0.90], bandOf(lat, -30, -15, 4));
  if(kind===4) return mix3(mix3([0.93, 0.85, 0.64], [0.78, 0.68, 0.50], 0.5*(bandOf(lat, 18, 32, 3)+bandOf(lat, -32, -18, 3))), [0.70, 0.70, 0.64], smooth01(55, 75, Math.abs(lat)));
  const m=Math.max(...tint, 1e-4); return tint.map(c=>c/m*0.85);
}
// The Red Spot on Jupiter at surface normal nrm (pole n, planetographic latitude lat): the pale
// hollow it pushes into the South Equatorial Belt, and the spot itself.
function grsPaint(c, g, nrm, n, lat){
  const a=vnorm(vadd(nrm, vscale(n, -vdot(nrm, n)), [0, 0, 0])), d=vnorm(vadd(g.dir, vscale(n, -vdot(g.dir, n)), [0, 0, 0]));
  const dl=Math.atan2(vdot(vcross(d, a), n), vdot(d, a))*180/Math.PI, e=Math.hypot(dl/(g.L/2), (lat-GRS_LAT)/(g.W/2));
  c=mix3(c, [0.95, 0.91, 0.82], 0.85*(1-smooth01(1.2, 1.45, e)));
  return mix3(c, [0.80, 0.42, 0.30], g.k*(1-smooth01(0.8, 1.0, e))*(0.85+0.15*smooth01(0.0, 0.7, e)));
}
function saturnRing(r, w){
  const s=(e0, e1)=>smooth01(e0-w, e0+w, r)-smooth01(e1-w, e1+w, r);
  const C=s(1.239, 1.527), B=s(1.527, 1.951), D=s(1.951, 2.025), A=s(2.025, 2.267);
  return [0.18*C+(0.72+0.28*smooth01(1.55, 1.75, r))*B+0.12*D+0.62*A, 0.12*C+0.95*B+0.1*D+0.6*A];
}
// How much light reaches surface point x (host radii, horizon frame) past a moon's shadow s, the
// Sun's way L: none in the umbra, all outside the penumbra, which widens with the moon's distance.
function moonShadow(x, s, L, rPx){
  const q=[x[0]-s.m[0], x[1]-s.m[1], x[2]-s.m[2]], along=vdot(q, L);
  if(along>=0) return 1;
  const perp=Math.hypot(q[0]-along*L[0], q[1]-along*L[1], q[2]-along*L[2]), spread=-along*s.a, pw=0.7/Math.max(rPx, 1);
  return 1-0.97*(1-smooth01(Math.max(s.rm-spread, 0)-pw, s.rm+spread+pw, perp));
}
function bodyPixel(b, src, rad, rPx){
  const v=b.dir, n=b.pole, L=b.light, f=BODY_FLAT[b.kind], k=1/(1-f)-1, sr=Math.sin(rad);
  const cs=vdot(src, v), o=[(src[0]-v[0]*cs)/sr, (src[1]-v[1]*cs)/sr, (src[2]-v[2]*cs)/sr];
  const on=vdot(o, n), vnK=vdot(v, n), op=o.map((c, i)=>c+k*on*n[i]), vp=v.map((c, i)=>c+k*vnK*n[i]);
  const a=vdot(vp, vp), bh=vdot(op, vp)/a, rho2=Math.max(vdot(op, op)-bh*bh*a, 0);
  const cov=Math.min(1, Math.max(0, 0.5+(1-Math.sqrt(rho2))*rPx));
  let dc=[0, 0, 0], t=1e9, x=o;
  if(cov>0){
    t=-bh-Math.sqrt(Math.max(1-rho2, 0)/a); x=o.map((c, i)=>c+t*v[i]);
    const xn=vdot(x, n), nrm=vnorm(x.map((c, i)=>c+(1/((1-f)*(1-f))-1)*xn*n[i]));
    const mu0=vdot(nrm, L), mu=Math.max(-vdot(nrm, v), 0.05), w=1.5/Math.max(rPx, 1);
    const km=BODY_MINN[b.kind], lit=smooth01(-w, w, mu0)*Math.min(Math.pow(Math.max(mu0, 0)+0.01, km)*Math.pow(mu, km-1), 1.3);
    const lat=Math.asin(Math.max(-1, Math.min(1, vdot(nrm, n))))*180/Math.PI;
    let alb=bodyAlbedo(b.kind, lat, b.tint);
    if(b.grs) alb=grsPaint(alb, b.grs, nrm, n, lat);
    dc=alb.map(c=>c*lit*cov*BODY_GAIN[b.kind]);
    for(const s of b.shadows||[]){ const sh=moonShadow(x, s, L, rPx); dc=dc.map(c=>c*sh); }
  }
  if(b.kind===4&&b.rings&&Math.abs(vnK)>1e-4){
    if(cov>0){ const ts=-vdot(x, n)/vdot(L, n); if(ts>0){ const sh=1-0.85*saturnRing(Math.hypot(...x.map((c, i)=>c+ts*L[i])), 0.02)[1]; dc=dc.map(c=>c*sh); } }
    const tr=-on/vnK, xr=o.map((c, i)=>c+tr*v[i]), rg=saturnRing(Math.hypot(...xr), 0.8/rPx/Math.max(Math.abs(vnK), 0.03));
    if(rg[1]>0){
      const s=vdot(xr, L), sh=s<0?smooth01(0.97, 1.03, Math.hypot(...xr.map((c, i)=>c-s*L[i]))):1;
      const rb=rg[0]*sh*(vdot(L, n)*vnK<0?1:0.12), ro=rg[1]*smooth01(0, 0.03, Math.abs(vnK)), rc=[0.86*rb, 0.78*rb, 0.64*rb];
      dc=tr<t?rc.map((c, i)=>c*ro+dc[i]*(1-ro)):dc.map((c, i)=>c+rc[i]*ro*(1-cov));
    }
  }
  return dc;
}
// A planet's disk on the dome, at (x, y) with radius rPx pixels, added onto what is drawn there,
// times show (how much of it shows through the sky and how the air dims it, as a star) and the
// air's reddening low down (as the sky shader's).
function drawBodyOnDome(b, x, y, rPx, show){
  const {cx, cy, R}=domeView(), W=dome.width, H=dome.height, reach=rPx*(b.kind===4&&b.rings?2.35:1.05)+1;
  const x0=Math.max(0, Math.floor(x-reach)), y0=Math.max(0, Math.floor(y-reach)), x1=Math.min(W-1, Math.ceil(x+reach)), y1=Math.min(H-1, Math.ceil(y+reach));
  if(x1<x0||y1<y0) return;
  const bw=x1-x0+1, bh=y1-y0+1, img=dctx.getImageData(x0, y0, bw, bh), px=img.data, rad=rPx*(Math.PI/2)/R;
  for(let j=y0;j<=y1;j++) for(let i=x0;i<=x1;i++){
    const dx=i+0.5-cx, dy=j+0.5-cy, rr=Math.hypot(dx, dy); if(rr>R) continue;
    const el=90*(1-rr/R), az=Math.atan2(dx, -dy)*180/Math.PI, c=bodyPixel(b, horizDir(az, el), rad, rPx);
    if(c[0]+c[1]+c[2]<=0) continue;
    const mu=Math.max(Math.sin(Math.max(el, 0)*Math.PI/180), 0.04), T=[1, Math.exp(-0.064/mu), Math.exp(-0.184/mu)], o=((j-y0)*bw+(i-x0))*4;
    for(let q=0;q<3;q++) px[o+q]=Math.min(255, px[o+q]+c[q]*T[q]*show*255);
  }
  dctx.putImageData(img, x0, y0);
}
