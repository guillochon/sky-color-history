// Meteor showers: meteoroids shed by one comet (or a rock like Phaethon) along its orbit, met by
// the Earth on the same date each year, all coming from one radiant at one speed.
//
// The modern-era skies (today's air, the polluted city, the ozone-hole years, 1815 and 2100)
// have the real annual showers of the IMO's working list (Rendtel, IMO Meteor Shower Calendar
// 2027, Tables 5 and 6): the solar longitude of maximum (J2000), the radiant there and its drift
// per degree of solar longitude, the speed V∞, the population index r and the peak ZHR ('Var'
// showers taken as 2 between outbursts). The antihelion source is already one of the sporadic
// sources (meteors.js). Activity rises and falls about the maximum as ZHR = ZHRmax 10^(−B|λ − λmax|),
// with B before and after the peak from Jenniskens 1994 (A&A 287, 990, Tables 3b and 3c), and for
// the Quadrantids, Perseids, Leonids, Geminids and Ursids a sharp peak over a broad background as
// he fits them; for the showers he does not cover, B is an estimate, 1/(half the activity period),
// so the rate is down tenfold toward its ends. All fade out over the last two degrees of the
// listed period. Parents as the IAU Meteor Data Center has them; meteoroid densities 1 g/cm³,
// the Quadrantids' 1.9 and the Geminids' and Daytime Sextantids' (from asteroids) 2.9.
// Their outbursts and storms (SHOWER_STORMS) fall on their real dates, at the hour recorded.
//
// How many meteors: the ZHR is what one observer counts in an hour under a 6.5 sky with the
// radiant overhead. A Monte Carlo of this code, with the radiant overhead and the eye as
// meteors.js has it, gives 11/8 of the ZHR over the whole sky (as the sporadics' 11 an hour over
// the whole sky are about 8 for one observer) from showerQ(r) meteors of absolute magnitude 1 or
// brighter per hour per unit of ZHR over the disc meteors are placed on. As the radiant sinks,
// fewer meteors cross the air (the sine of its height, as for the sporadic sources).
//
// Through time. Showers last thousands to tens of thousands of years, so the deeper epochs have
// showers of their own, drawn at random but the same for an epoch: their radiants placed about
// the Sun and their speeds, profiles and population indices resampled from today's list (with
// scatter), so the geometry that sets a shower's speed (head-on from the apex, or overtaking
// from near the Sun) is kept; their dates anywhere in the year. Their number goes as the comets
// that make them. Most of today's come from Jupiter-family and Halley-type comets, fed from the
// scattered disk, and roughly a quarter of the IMO list from long-period comets (the Lyrids,
// Aurigids and Monocerotids among them), fed from the Oort cloud; an estimate, since only about a
// fifth of known streams have an identified parent (Ye & Jenniskens 2022). So the count is
// 0.75 J + 0.25 C, where C is the long-period comet rate (comets.js) and J the short-period one,
// taken as C after the giant planets' instability (both reservoirs were filled by it and drained
// after it; an estimate), falling to today's by 2 Ga. Nothing in the literature puts a number on
// showers in the early Solar System. Storms come with them:
// today about 0.5 outbursts a year reach ZHR 100 (SHOWER_STORMS since 1980) and one in 45 years
// 10,000 (since 1799), so N(≥Z) = 0.5 (Z/100)^−0.68 a year, which gives 0.1 a year at 1,000 (the
// record since 1799 has 0.06, but it misses outbursts by day and over the oceans).

const SHOWERS=[
  ['QUA', 'Quadrantids', 'Quadrantid', 283.15, 230, 49, 0.6, -0.2, 41, 2.1, 80, 2.5, 2.5, 7.9, 8.9, 'asteroid 2003 EH1', 1.9, 0.85, 0.37, 0.45],
  ['GUM', 'γ-Ursae Minorids', 'γ-Ursae Minorid', 298, 228, 67, 0.8, -0.4, 31, 3, 3, 0.145, 0.145, 8.9, 4.9, null, null],
  ['ACE', 'α-Centaurids', 'α-Centaurid', 319.4, 211, -58, 1.25, -0.3, 58, 2, 6, 0.18, 0.18, 8.9, 12.8, null, null],
  ['LYR', 'April Lyrids', 'Lyrid', 32.32, 271, 34, 1.07, 0, 49, 2.1, 18, 0.22, 0.22, 9.9, 7.9, 'comet C/1861 G1 (Thatcher)', null],
  ['PPU', 'π-Puppids', 'π-Puppid', 33.5, 110, -45, 0.5, -0.1, 18, 2, 2, 0.135, 0.135, 9.9, 4.9, 'comet 26P/Grigg–Skjellerup', null],
  ['ETA', 'η-Aquariids', 'η-Aquariid', 45.5, 338, -1, 0.85, 0.4, 66, 2.4, 50, 0.08, 0.08, 17.8, 22.7, 'comet 1P/Halley', null],
  ['ELY', 'η-Lyrids', 'η-Lyrid', 50, 291, 43, 1, 0.1, 43, 3, 3, 0.184, 0.184, 6.9, 4, null, null],
  ['ARI', 'Daytime Arietids', 'Daytime Arietid', 76.7, 43, 24, 1, 0, 38, 2.8, 30, 0.1, 0.1, 25.6, 16.8, 'the Machholz complex (comet 96P/Machholz)', null],
  ['JBO', 'June Bootids', 'June Bootid', 90.3, 221, 48, 0.2, -0.2, 18, 2.2, 2, 0.169, 0.169, 1, 10.9, 'comet 7P/Pons–Winnecke', null],
  ['JPE', 'July Pegasids', 'July Pegasid', 108, 347, 11, 0.85, 0.2, 63, 3, 3, 0.096, 0.096, 9.9, 10.9, null, null],
  ['GDR', 'July γ-Draconids', 'July γ-Draconid', 125.13, 280, 51, 1, 0, 27, 3, 5, 0.253, 0.253, 4, 4, null, null],
  ['CAP', 'α-Capricornids', 'α-Capricornid', 128, 307, -10, 0.9, 0.3, 23, 2.5, 5, 0.041, 0.041, 28.6, 15.8, 'comet 169P/NEAT', null],
  ['SDA', 'Southern δ-Aquariids', 'Southern δ-Aquariid', 128, 340, -16, 0.75, 0.25, 41, 2.5, 25, 0.091, 0.091, 19.7, 23.7, 'the Machholz complex (comet 96P/Machholz)', null],
  ['ERI', 'η-Eridanids', 'η-Eridanid', 135, 41, -11, 0.9, 0.35, 64, 3, 3, 0.096, 0.096, 8.9, 11.8, null, null],
  ['PER', 'Perseids', 'Perseid', 140, 48, 58, 1.35, 0.2, 59, 2.2, 110, 0.35, 0.35, 27.6, 11.8, 'comet 109P/Swift–Tuttle', null, 0.75, 0.05, 0.092],
  ['KCG', 'κ-Cygnids', 'κ-Cygnid', 144, 286, 59, 0.4, 0.7, 23, 3, 3, 0.069, 0.069, 14.8, 11.8, null, null],
  ['AUR', 'Aurigids', 'Aurigid', 158.6, 91, 39, 1.1, -0.1, 66, 2.5, 6, 0.19, 0.19, 4.9, 4.9, 'comet C/1911 N1 (Kiess)', null],
  ['SPE', 'September ε-Perseids', 'September ε-Perseid', 166.7, 48, 40, 1.05, 0.05, 64, 2.5, 8, 0.113, 0.113, 5.9, 11.8, null, null],
  ['SLY', 'September Lyncids', 'September Lyncid', 170, 113, 56, 1.35, -0.2, 60, 3, 3, 0.068, 0.068, 4, 25.6, null, null],
  ['DSX', 'Daytime Sextantids', 'Daytime Sextantid', 188, 156, -2, 0.8, 0, 32, 2.5, 5, 0.113, 0.113, 11.8, 5.9, 'asteroid 2005 UD', 2.9],
  ['OCT', 'October Camelopardalids', 'October Camelopardalid', 192.58, 164, 79, 0, 0, 47, 2.5, 5, 0.67, 0.67, 2, 1, null, null],
  ['DRA', 'Draconids', 'Draconid', 195.4, 263, 56, 0, 0, 20, 2.6, 5, 0.337, 0.337, 4, 2, 'comet 21P/Giacobini–Zinner', null],
  ['EGE', 'ε-Geminids', 'ε-Geminid', 205, 102, 27, 1, 0, 70, 3, 3, 0.135, 0.135, 5.9, 8.9, null, null],
  ['ORI', 'Orionids', 'Orionid', 208, 95, 16, 0.65, 0.1, 66, 2.5, 20, 0.12, 0.12, 20.7, 16.8, 'comet 1P/Halley', null],
  ['LMI', 'Leonis Minorids', 'Leonis Minorid', 211, 162, 37, 1, -0.4, 62, 3, 2, 0.202, 0.202, 6.9, 3, null, null],
  ['STA', 'Southern Taurids', 'Southern Taurid', 223, 52, 15, 0.8, 0.2, 27, 2.3, 7, 0.026, 0.026, 47.3, 14.8, 'comet 2P/Encke', null],
  ['NTA', 'Northern Taurids', 'Northern Taurid', 230, 58, 22, 0.9, 0.2, 29, 2.3, 5, 0.026, 0.026, 24.7, 27.6, 'comet 2P/Encke', null],
  ['LEO', 'Leonids', 'Leonid', 235.27, 152, 22, 0.6, -0.25, 71, 2.5, 15, 0.55, 0.55, 12.8, 12.8, 'comet 55P/Tempel–Tuttle', null, 0.83, 0.025, 0.15],
  ['AMO', 'α-Monocerotids', 'α-Monocerotid', 239.32, 117, 1, 0.8, -0.2, 65, 2.4, 2, 0.169, 0.169, 7.9, 4, null, null],
  ['NOO', 'November Orionids', 'November Orionid', 246, 91, 16, 0.7, 0, 43, 3, 3, 0.084, 0.084, 14.8, 8.9, null, null],
  ['PHO', 'Phoenicids', 'Phoenicid', 249.5, 8, -27, 0.6, -0.1, 15, 2.8, 2, 0.3, 0.3, 12.8, 4, 'comet 289P/Blanpain', null],
  ['AND', 'Andromedids', 'Andromedid', 254, 25, 51, 0, 0, 18, 3, 5, 0.068, 0.068, 24.7, 4.9, 'comet 3D/Biela', null],
  ['PUP', 'Puppid-Velids', 'Puppid-Velid', 255, 123, -45, 0.6, 0, 44, 2.9, 10, 0.034, 0.034, 6.9, 8.9, null, null],
  ['MON', 'Monocerotids', 'Monocerotid', 257, 100, 8, 0.7, -0.1, 41, 3, 3, 0.25, 0.25, 8.9, 10.9, 'comet C/1917 F1 (Mellish)', null],
  ['HYD', 'σ-Hydrids', 'σ-Hydrid', 257, 125, 2, 0.8, -0.2, 58, 3, 7, 0.1, 0.1, 6.9, 11.8, null, null],
  ['GEM', 'Geminids', 'Geminid', 262.2, 112, 33, 1, 0, 35, 2.6, 150, 0.59, 0.81, 10.9, 6.9, 'asteroid 3200 Phaethon', 2.9, 0.8, 0.09, 0.31],
  ['URS', 'Ursids', 'Ursid', 270.7, 217, 76, 0, -0.4, 33, 2.8, 10, 0.9, 0.9, 6.9, 4, 'comet 8P/Tuttle', null, 0.83, 0.08, 0.2],
  ['COM', 'Comae Berenicids', 'Comae Berenicid', 271, 164, 29, 0.9, -0.3, 65, 3, 3, 0.034, 0.034, 19.7, 38.5, null, null],
];
// Outbursts and storms: shower, date and hour of peak (UT), peak ZHR, FWHM in hours, r (or null for
// the shower's), radiant and speed if not the shower's, and for one not on the list its names.
// Jenniskens 1995 (A&A 295, 206; J95) for those before 1995, its B1950 solar longitudes turned to
// UT and its slopes B to FWHM = 14.6/B hours; later ones from the IMO's analyses (Leonids 1999–2002,
// Draconids 2011 and 2018, Aurigids 2007 and 2019, α-Monocerotids 1995 and 2019, η-Aquariids 2013,
// Perseids 2016 from video) and Jenniskens (CBET 5126, τ-Herculids 2022). Where only a peak rate is
// known the FWHM is a guess (marked ~). J95 gives 1799 and 1833 only as above 5,000; 1833's 30,000 is
// an estimate, from observers' counts of many tens of thousands an hour. The two 2034 Leonid
// peaks are predictions (Abe 2026, from the 1932 and 1733 trails of 55P/Tempel–Tuttle).
const SHOWER_STORMS=[
  ['LEO', 1799, 11, 12, 8.0, 5000, 0.5, null],
  ['LEO', 1833, 11, 13, 9.6, 30000, 0.5, null],
  ['LEO', 1866, 11, 14, 0.88, 17000, 0.49, 2.5],
  ['LEO', 1867, 11, 14, 9.08, 6000, 0.49, null],
  ['LEO', 1966, 11, 17, 12.08, 15000, 0.49, 2.9],
  ['LEO', 1999, 11, 18, 2.08, 5000, 0.65, null],
  ['LEO', 2001, 11, 18, 10.58, 1600, 1.0, null],                  // ~
  ['LEO', 2001, 11, 18, 18.3, 3500, 1.0, null],                   // ~
  ['LEO', 2002, 11, 19, 4.17, 2350, 0.7, 2.0],                    // ~
  ['LEO', 2002, 11, 19, 10.83, 2660, 0.7, 2.0],                   // ~
  ['LEO', 2034, 11, 18, 3.5, 1400, 1.0, null, null, null, null, {pred:true}],   // ~
  ['LEO', 2034, 11, 18, 23.75, 1200, 1.0, null, null, null, null, {pred:true}], // ~
  ['AND', 1872, 11, 27, 19.5, 7400, 1.4, null],
  ['AND', 1885, 11, 27, 18.75, 6400, 1.54, 3.6],
  ['DRA', 1933, 10, 9, 20.0, 10000, 0.61, 3.6],
  ['DRA', 1946, 10, 10, 3.75, 12000, 0.86, 3.2],
  ['DRA', 1985, 10, 8, 9.67, 700, 1.13, 3.4],
  ['DRA', 1998, 10, 8, 13.0, 720, 1.0, null],                     // ~
  ['DRA', 2011, 10, 8, 20.2, 300, 1.5, null],                     // ~
  ['DRA', 2018, 10, 8, 23.0, 150, 3.0, null],
  ['AMO', 1925, 11, 21, 4.0, 2300, 0.13, null],
  ['AMO', 1935, 11, 21, 18.92, 1200, 0.21, null],
  ['AMO', 1985, 11, 21, 11.67, 600, 0.07, 2.7],
  ['AMO', 1995, 11, 22, 1.47, 420, 0.3, null],
  ['AMO', 2019, 11, 22, 4.92, 130, 0.25, null],
  ['JBO', 1916, 6, 29, 1.0, 300, 1.83, 1.7],
  ['JBO', 1998, 6, 27, 12.5, 100, 8, null],
  ['PER', 1991, 8, 12, 16.0, 500, 0.59, null],
  ['PER', 1992, 8, 11, 19.67, 400, 0.67, null],
  ['PER', 1993, 8, 12, 2.75, 230, 2.44, null],
  ['PER', 2016, 8, 11, 23.37, 190, 0.5, null],
  ['AUR', 1935, 9, 1, 2.83, 100, 0.42, 2.2],
  ['AUR', 1986, 9, 1, 1.33, 250, 0.44, null],
  ['AUR', 2007, 9, 1, 11.25, 130, 0.33, null],
  ['AUR', 2019, 8, 31, 21.37, 63, 0.5, null],                     // ~
  ['LYR', 1803, 4, 20, 7.0, 860, 1.0, null],                      // ~
  ['LYR', 1922, 4, 21, 19.42, 800, 0.42, null],
  ['LYR', 1982, 4, 22, 6.58, 250, 0.44, 2.9],
  ['URS', 1945, 12, 22, 18.0, 120, 0.86, null],
  ['URS', 1986, 12, 22, 21.5, 160, 0.86, 2.8],
  ['PHO', 1956, 12, 5, 16.5, 50, 7.7, 2.9],
  ['ETA', 2013, 5, 6, 3.75, 130, 8, null],                        // ~
  ['TAH', 2022, 5, 31, 4.7, 35, 1.5, 2.5, 209, 28, 12, {name:'τ-Herculids', member:'τ-Herculid', parent:'comet 73P/Schwassmann–Wachmann 3'}], // ~
];

// Meteors of magnitude 1 or brighter an hour over the disc per unit of ZHR, for population index r
// (the Monte Carlo above: 6.8 at r = 2.0, 5.9 at 2.5, 5.2 at 3.0).
function showerQ(r){ return Math.max(4, 6.75-1.6*(r-2)); }
// Solar longitude (J2000) at day number d: the Sun's longitude of date less the precession since.
function solarLonJ2000(d){ return rev(sunEquatorial(d).lam-1.39697*d/36525); }
// The day number nearest d0 at which the solar longitude (J2000) is lam.
function dayOfSolarLon(lam, d0){
  let d=d0;
  for(let i=0;i<4;i++){ let x=lam-solarLonJ2000(d); x-=360*Math.round(x/360); d+=x/0.98565; }
  return d;
}
const wrap180=x=>x-360*Math.round(x/360);
// Ecliptic (longitude, latitude) to equatorial (right ascension, declination), and back, degrees.
function eclToEq(l, b){
  const e=OBLIQUITY*Math.PI/180, L=l*Math.PI/180, B=b*Math.PI/180;
  const dec=Math.asin(Math.sin(B)*Math.cos(e)+Math.cos(B)*Math.sin(e)*Math.sin(L));
  return [rev(Math.atan2(Math.sin(L)*Math.cos(e)-Math.tan(B)*Math.sin(e), Math.cos(L))*180/Math.PI), dec*180/Math.PI];
}
function eqToEcl(ra, dec){
  const e=OBLIQUITY*Math.PI/180, A=ra*Math.PI/180, D=dec*Math.PI/180;
  const b=Math.asin(Math.sin(D)*Math.cos(e)-Math.cos(D)*Math.sin(e)*Math.sin(A));
  return [rev(Math.atan2(Math.sin(A)*Math.cos(e)+Math.tan(D)*Math.sin(e), Math.cos(A))*180/Math.PI), b*180/Math.PI];
}

// Each shower as the engine uses it: name and member (Perseids, a Perseid) or null for the deep
// epochs' unnamed ones, parent, solar longitude of maximum, radiant at maximum and drift per degree
// (real), or the radiant's ecliptic longitude from the Sun and latitude (deep), speed, r, peak
// ZHR, B before and after, the activity period in degrees before and after the maximum, the
// meteoroids' bulk density (g/cm³), and for a shower with a broad background under its peak, the
// peak's share f of the ZHR at maximum and the background's B before and after.
function showerFromRow(row){
  const [code, name, member, lmax, ra, dec, dra, ddec, v, r, Z, Bm, Bp, a0, a1, parent, rho, f, Bbm, Bbp]=row;
  const [el, beta]=eqToEcl(ra, dec);
  return {code, name, member, parent, lmax, ra, dec, dra, ddec, v, r, Z, Bm, Bp, f:f||1, Bbm:Bbm||0, Bbp:Bbp||0, a0, a1, rho:rho||1.0, dl:wrap180(el-lmax), beta};
}
let SHOWER_LIST=null;
function showerList(){ return SHOWER_LIST||(SHOWER_LIST=SHOWERS.map(showerFromRow)); }
// The short-period comets relative to today's (see above).
const SHOWER_J={protoearth455:30, hadean45:30, hadean44:30, hadean40:5, archean38:4, archean27thin:1.5, archean27:1.5, archean27vthick:1.5, proterozoic22:1.2};
function showerFactor(key){ return 0.75*(SHOWER_J[key]??1)+0.25*(COMET_RATE[key]??1); }
// The showers of epoch key: today's list in the modern-era skies, or the epoch's own.
const SHOWER_SETS={};
function showerSet(key){
  if(COMET_REAL_EPOCHS.has(key)) return showerList();
  if(SHOWER_SETS[key]) return SHOWER_SETS[key];
  const T=showerList(), rng=mulberry32(metHash('showers|'+key)), G=()=>gauss01(rng), out=[];
  const pois=l=>{ if(l>40) return Math.max(0, Math.round(l+Math.sqrt(l)*G())); let n=0, p=Math.exp(-l), s=p; const u=rng(); while(u>s){ n++; p*=l/n; s+=p; } return n; };
  const n=Math.min(pois(T.length*showerFactor(key)), 2500);
  for(let i=0;i<n;i++){
    const t=T[Math.floor(rng()*T.length)];
    out.push({code:null, name:null, member:null, parent:null, lmax:360*rng(), dl:t.dl+8*G(), beta:Math.max(-89, Math.min(89, t.beta+8*G())),
      v:Math.max(11.5, Math.min(72, t.v*(1+0.08*G()))), r:t.r, Z:Math.max(1, t.Z*Math.pow(10, 0.3*G())), Bm:t.Bm, Bp:t.Bp, f:t.f, Bbm:t.Bbm, Bbp:t.Bbp, a0:t.a0, a1:t.a1, rho:t.rho});
  }
  return SHOWER_SETS[key]=out;
}
// A shower's ZHR at solar longitude lam, and its radiant there.
function showerZHR(sh, lam){
  const x=wrap180(lam-sh.lmax);
  if(x<=-sh.a0||x>=sh.a1) return 0;
  const ax=Math.abs(x), main=Math.pow(10, -(x<0?sh.Bm:sh.Bp)*ax), bg=sh.f<1?Math.pow(10, -(x<0?sh.Bbm:sh.Bbp)*ax):0;
  return sh.Z*(sh.f*main+(1-sh.f)*bg)*smooth01(-sh.a0, -sh.a0+2, x)*(1-smooth01(sh.a1-2, sh.a1, x));
}
function showerRadiant(sh, lam, lamSun){
  if(sh.code){ const x=wrap180(lam-sh.lmax); return [rev(sh.ra+sh.dra*x), Math.max(-90, Math.min(90, sh.dec+sh.ddec*x))]; }
  return eclToEq(lamSun+sh.dl, sh.beta);
}
// Outbursts and storms near day number d: the real ones in the modern-era skies, otherwise the
// epoch's own, drawn year by year: N(≥Z) = 0.5 (Z/100)^−0.68 a year times the epoch's factor,
// each on one of its showers within a few degrees of its maximum, lasting (FWHM) 3 hours at ZHR 100
// and less for the stronger, as (Z/100)^−0.3.
let SHOWER_STORM_LIST=null;
function stormList(){
  if(SHOWER_STORM_LIST) return SHOWER_STORM_LIST;
  const byCode={}; for(const s of showerList()) byCode[s.code]=s;
  return SHOWER_STORM_LIST=SHOWER_STORMS.map(([code, y, m, D, ut, Z, fwhm, r, ra, dec, v, x])=>{
    x=x||{};
    const sh=byCode[code]||{code, name:x.name, member:x.member, parent:x.parent, rho:1.0, r:r, v};
    const lam=solarLonJ2000(dayNumber(y, m, D, ut)), [ra0, dec0]=ra==null?showerRadiant(sh, lam, lam):[ra, dec];
    return {sh, d:dayNumber(y, m, D, ut), Z, fwhm, r:r||sh.r, ra:ra0, dec:dec0, v:v||sh.v, year:y, pred:!!x.pred};
  });
}
const STORM_YEARS={};
function stormsOfYear(key, yi){
  const id=key+'|'+yi;
  if(STORM_YEARS[id]) return STORM_YEARS[id];
  const set=showerSet(key), rng=mulberry32(metHash('storms|'+id)), out=[];
  let n=0; const l=0.5*showerFactor(key); let p=Math.exp(-l), s=p; const u=rng(); while(u>s&&n<50){ n++; p*=l/n; s+=p; }
  for(let i=0;i<n&&set.length;i++){
    const sh=set[Math.floor(rng()*set.length)], Z=Math.min(2e5, 100*Math.pow(Math.max(rng(), 1e-9), -1/0.68));
    const lam=rev(sh.lmax+2*gauss01(rng)), d=dayOfSolarLon(lam, DN_2000+(yi+0.5)*TROPICAL_YEAR);
    out.push({sh, d, Z, fwhm:3*Math.pow(Z/100, -0.3)*(0.6+0.8*rng()), r:sh.r, v:sh.v, year:null});
  }
  return STORM_YEARS[id]=out;
}
function stormsNear(key, d, span){
  if(COMET_REAL_EPOCHS.has(key)) return stormList().filter(s=>Math.abs(s.d-d)<span);
  const yi=Math.floor((d-DN_2000)/TROPICAL_YEAR), out=[];
  for(let y=yi-1;y<=yi+1;y++) for(const s of stormsOfYear(key, y)) if(Math.abs(s.d-d)<span) out.push(s);
  return out;
}
function stormZHR(st, d){ return st.Z*Math.pow(10, -0.602*Math.abs(d-st.d)*24/st.fwhm); }
// What is active at day number d: each shower or storm with its ZHR, radiant, speed and r.
function showersAt(key, d){
  const lam=solarLonJ2000(d), lamSun=sunEquatorial(d).lam, out=[];
  for(const sh of showerSet(key)){
    const Z=showerZHR(sh, lam);
    if(Z>0.05){ const [ra, dec]=showerRadiant(sh, lam, lamSun); out.push({sh, Z, ra, dec, v:sh.v, r:sh.r, storm:null}); }
  }
  for(const st of stormsNear(key, d, 1)){
    const Z=stormZHR(st, d);
    if(Z>0.5){ const [ra, dec]=st.sh&&!st.sh.code?showerRadiant(st.sh, lam, lamSun):[st.ra, st.dec]; out.push({sh:st.sh, Z, ra, dec, v:st.v, r:st.r, storm:st}); }
  }
  return out;
}
// The shower meteors of second b in stream s (meteors.js metBin), magnitudes lo to hi, added to
// got after the sporadics so those stay as they were. Each comes from near its radiant (spread
// 1.5°, a storm's 0.4°) at its shower's speed.
function showerBin(got, b, s, lo, hi, E, ctx, F, id){
  for(const a of showersAt(ctx.key, b/86400)){
    const p=altaz(F.lat, a.dec, rev(F.lst-a.ra));
    if(p.alt<-11) continue;
    const Es={F:1, rf:a.r, rb:a.r, mix:{}, dh:E.dh, ring:0, flash:0};
    const rate=showerQ(a.r)*a.Z*(metCum(Es, hi)-(s?0:metCum(Es, lo)))/3600, n=Math.min(metPoisson(rate), 20000);
    if(!n) continue;
    const rd=horizDir(p.az, p.alt), sd=a.storm?0.4:1.5, tag=a.storm?'t':'s';
    for(let i=0;i<n;i++){
      const sg=MET_D*Math.sqrt(metRand()), az=2*Math.PI*metRand(), th=sg/MET_RE;
      const nn=[Math.sin(th)*Math.sin(az), Math.sin(th)*Math.cos(az), Math.cos(th)];
      const d=metScatter(rd, sd), sinH=vdot(d, nn);
      if(!(sinH>0.02)||metRand()>sinH) continue;
      const m=metPath(metDrawM(Es, lo, hi, metRand()), a.v*(1+0.015*metGauss()), d, nn, Es, ctx, 'shower');
      if(!m) continue;
      const rho=a.sh?a.sh.rho:1.0;
      m.rho=rho; m.diam=Math.cbrt(6*m.mass/(Math.PI*rho)); m.shower={sh:a.sh, storm:a.storm};
      m.t0=b+metRand(); m.id=id+'|'+tag+i+'_'+got.met.length; got.met.push(m);
    }
  }
}
// The tooltip's opening for a shower meteor.
function showerWho(x){
  const sh=x.sh, st=x.storm, fmtZ=Z=>Math.round(Z).toLocaleString('en-US');
  if(sh&&sh.code){
    const of=st?` of the ${st.pred?'predicted ':''}${st.year} ${st.Z>=1000?'storm':'outburst'} (ZHR about ${fmtZ(st.Z)})`:'';
    return `${/^[aeiou]/i.test(sh.member)?'An':'A'} ${sh.member}${of}${sh.parent?`, dust from ${sh.parent}`:''}`;
  }
  return st?`A meteor of a ${st.Z>=1000?'storm':'outburst'} (ZHR about ${fmtZ(st.Z)}) from one of this epoch’s showers, the dust trail of a comet long gone`
    :`A meteor of one of this epoch’s showers (ZHR ${fmtZ(sh.Z)} at its peak), the dust of a comet long gone`;
}
// The showers' share of the readout: meteors an hour over the whole sky for a zenith limit lim
// (ZHR × 11/8 × the sine of the radiant's height × r^(lim − 6.5)), and the strongest active
// showers by ZHR, named.
function showerReadout(key, lim){
  const d=astroDay(), lat=LATDEG[dLat], lst=localSidereal(), act=showersAt(key, d);
  let hr=0;
  for(const a of act){ const p=altaz(lat, a.dec, rev(lst-a.ra)); hr+=a.Z*11/8*Math.max(0, Math.sin(p.alt*Math.PI/180))*Math.pow(a.r, lim-6.5); }
  const fmtZ=Z=>Z<10?Z.toFixed(1):Math.round(Z).toLocaleString('en-US');
  const named=act.filter(a=>a.Z>=(a.storm?20:2)).sort((a, b)=>b.Z-a.Z).slice(0, 2).map(a=>{
    const nm=a.sh&&a.sh.code?a.sh.name:'a shower';
    if(a.storm) return `${a.sh&&a.sh.code?a.sh.member:'a'} ${a.storm.Z>=1000?'storm':'outburst'}, ZHR ${fmtZ(a.Z)}`;
    return `${nm}, ZHR ${fmtZ(a.Z)}`;
  });
  return {hr, text:named.length?' · '+named.join(', '):''};
}
// The radiant's and the Sun's heights at day number d, as the page reckons them (its clock is
// sundial time: localSidereal).
function showerAltsAt(d, ra, dec, lat){
  const sun=sunEquatorial(d), ha=(pageAt(d).min/60-12)*15, lst=rev(sun.RA+ha);
  return {rad:altaz(lat, dec, rev(lst-ra)), sun:altaz(lat, sun.Dec, rev(ha)).alt};
}
// Jump to the next shower maximum (ZHR 10 or more) or outburst: for a maximum, to the hour of
// that night when the radiant stands highest in a dark sky, weighted by the activity; for an
// outburst, to 15 minutes before its peak. The view turns to the radiant.
function jumpNextShower(){
  if(dayPlaying){ dayPlaying=false; adoptPlayRate(); hplay.textContent='Play'; hplay.setAttribute('aria-pressed','false'); syncVRPad(); }
  const key=EP[dIdx].key, d0=astroDay(), lat=LATDEG[dLat], ev=[];
  for(const sh of showerSet(key)) if(sh.Z>=10){
    let d=dayOfSolarLon(sh.lmax, d0+0.6+180/0.98565);
    while(d<=d0+0.6) d+=TROPICAL_YEAR;
    while(d-TROPICAL_YEAR>d0+0.6) d-=TROPICAL_YEAR;
    ev.push({d, sh, storm:null});
  }
  for(const st of stormsNear(key, d0+TROPICAL_YEAR, TROPICAL_YEAR)) if(st.d>d0+0.5/24) ev.push({d:st.d, sh:st.sh, storm:st});
  if(!ev.length) return;
  ev.sort((a, b)=>a.d-b.d);
  const e=ev[0], sh=e.sh;
  let at=e.d, ra, dec;
  if(e.storm){
    at=e.d-15/1440;
    [ra, dec]=sh&&!sh.code?showerRadiant(sh, solarLonJ2000(at), sunEquatorial(at).lam):[e.storm.ra, e.storm.dec];
  }else{
    let best=-1;
    for(let i=-48;i<=48;i++){
      const d=e.d+i/96, lam=solarLonJ2000(d), [r, c]=showerRadiant(sh, lam, sunEquatorial(d).lam), h=showerAltsAt(d, r, c, lat);
      const score=(h.sun<-15?1:0.001)*Math.max(0.02, Math.sin(h.rad.alt*Math.PI/180))*showerZHR(sh, lam);
      if(score>best){ best=score; at=d; ra=r; dec=c; }
    }
  }
  const pg=pageAt(at);
  document.getElementById('moonDate').value=pg.date;
  minutes=pg.min;
  hslider.value=minutes;
  renderDay();
  const p=altaz(lat, dec, rev(localSidereal()-ra));
  vrYaw=p.az; vrPitch=Math.max(10, Math.min(55, p.alt-20));
  if(vrOn) paintVR();
}
// The storm card (moments.js): of the Leonid storms since 1966, the one whose peak came with the
// radiant highest in a dark sky here (the longitude is the visitor's time zone's, at 45° N), set
// 10 minutes before its peak. Returns where the radiant is.
function openStorm(){
  const lat=LATDEG[dLat];
  let best=null, bs=-Infinity;
  for(const st of stormList()) if(st.sh&&st.sh.code==='LEO'&&st.year>=1966&&st.Z>=1000){
    const h=showerAltsAt(st.d, st.ra, st.dec, lat), sc=(h.sun<-12?1:-1)+Math.sin(h.rad.alt*Math.PI/180);
    if(sc>bs){ bs=sc; best=st; }
  }
  if(!best) return null;
  const pg=pageAt(best.d-10/1440);
  document.getElementById('moonDate').value=pg.date;
  minutes=pg.min; hslider.value=String(minutes);
  renderDay();
  const p=altaz(lat, best.dec, rev(localSidereal()-best.ra));
  return {az:p.az, alt:p.alt};
}
// The radiants to mark with the labels (vr_hud.js): up to four active showers or outbursts with a
// ZHR of 3 or more now, strongest first, with their radiant above the horizon: "Perseids radiant",
// or in the older epochs, whose showers have no names, "Meteor shower radiant".
function radiantMarks(){
  if(!skyNow) return [];
  const key=EP[dIdx].key, lat=LATDEG[dLat], lst=localSidereal(), out=[];
  for(const a of showersAt(key, astroDay()).filter(a=>a.Z>=3).sort((a, b)=>b.Z-a.Z).slice(0, 4)){
    const p=altaz(lat, a.dec, rev(lst-a.ra));
    if(p.alt<=0) continue;
    const named=a.sh&&a.sh.code, kind=a.storm?(a.storm.Z>=1000?' storm':' outburst'):'';
    out.push({el:p.alt, az:p.az, Z:a.Z, text:named?`${a.storm?a.sh.member:a.sh.name}${kind} radiant`:`Meteor shower${kind} radiant`});
  }
  return out;
}
