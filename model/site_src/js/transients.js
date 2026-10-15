/* ---------- transients: supernovae, novae and stellar eruptions, by date ---------- */
// Every known star that flared brighter than magnitude 3, each at its date on the timeline, shown
// in whatever epoch's sky holds that date (and in the one chosen, with auto-select off). The
// date picker lists them under "Extended events" and stars their days in the month.
//
// Each has a date: the day it was first seen, or for the ones before history a day chosen in the
// year its remnant's or pulsar's age gives. Records before the Gregorian reform are in the Julian
// calendar; their dates here are converted (the page counts Gregorian years back to −3000).
// Each light curve is a list of knots, magnitude against time, joined by straight lines and
// continued past the last at a fixed rate (mag/day); a star is gone once fainter than 7.
// Positions are J2000, remnants' centers for the supernovae, held still: a remnant's star moved
// a few arcminutes at most since. Betelgeuse's is the catalog star's, with its proper motion.
//
// Supernova peaks are a Type II-P's (M_V −16.75, Richardson et al. 2014) at the distance given,
// unless the records give one. Light curves:
//  II-P (Anderson et al. 2014): two weeks to peak, a plateau falling half a magnitude in 86 days,
//   2 magnitudes in the month after, then cobalt-56's 0.98 mag per 100 days.
//  Ia (V band; Phillips 1993, Leibundgut 2000): 18 days to peak, 0.7 mag in 15 days, 2.2 by day
//   40, 4.9 by day 150, then 1.5 mag per 100 days.
//  Ib/c (Drout et al. 2011): 15 days to peak, 2 mag by day 40, then 2 mag per 100 days.
//  Classical novae (Strope, Schaefer & Henden 2010): a rise of a day or two, t2 and t3 the days
//   to fade 2 and 3 magnitudes, then a power-law tail: 4.9 mag down at 3 t3, 7 at 10 t3.
const TR_TYPES={sn:{label:'supernova', color:'#8cc4ff'}, nova:{label:'nova', color:'#ffd257'}, erupt:{label:'stellar eruption', color:'#ff8a62'}, comet:{label:'comet', color:'#6fe0b8'}, tde:{label:'tidal disruption', color:'#e98cff'},
  veil:{label:'volcanic sky', color:'#c9a3ff'}, aurora:{label:'great aurora', color:'#9dff6a'}, storm:{label:'meteor storm', color:'#f4a6c4'}, impact:{label:'impact', color:'#ff5a45'}};
const TR_GROUPS=[['hist', 'Supernovae in history'], ['pre', 'Supernovae before history'], ['nova', 'Novae'], ['erupt', 'Stellar eruptions'], ['comet', 'Comets'], ['veil', 'Volcanic skies'], ['aurora', 'Great aurorae'], ['storm', 'Meteor storms'], ['impact', 'Impacts'], ['future', 'To come']];
const TR_CURVE={
  IIP:{k:[[-14, 3], [-10, 1.6], [-6, 0.7], [0, 0], [86, 0.52], [101, 1.52], [116, 2.52]], tail:0.0098},
  Ia:{k:[[-18, 3.5], [-10, 1.2], [-5, 0.3], [0, 0], [15, 0.7], [40, 2.2], [150, 4.9]], tail:0.015},
  Ibc:{k:[[-15, 3], [-7, 0.9], [0, 0], [40, 2]], tail:0.02},
  // The Crab's: seen by day for 23 days, then 653 days by night (Song huiyao).
  crab:{k:[[-10, 3], [-3, 0.5], [0, 0], [23, 2]], tail:0.016},
  // A star torn apart by a 6×10⁵ M☉ black hole: its most bound debris returns after ~32 days
  // (41 d × (M/10⁶ M☉)^½) and the fallback peaks ~50 days after the disruption at ~140 times the
  // Eddington rate, then falls as t^(−5/3). The light, held near Eddington, goes as 1 + ln ṁ while
  // ṁ > 1 (a slim disc) and as ṁ after, ṁ the fallback over Eddington's: down 0.24 mag at twice
  // the peak time, 1.1 at ten times, 1.9 at nineteen, when ṁ reaches 1 (2.5 years), then 5/3 as fast
  // as t^(-1) fades. The color (its temperature) is held.
  // M31's (above, with the event): the fallback peaks ~300 days after the disruption, near the
  // Eddington rate, so the light goes as the fallback, t^(−5/3) from the disruption: 1.25 mag down
  // at twice the peak time, 2.5 at four times, 4.2 at ten, 5.4 at twenty, then 0.0003 mag a day.
  tdeM31:{k:[[-300, 9], [-250, 4], [-150, 1.2], [-60, 0.25], [0, 0], [300, 1.25], [900, 2.5], [2700, 4.17], [5700, 5.4]], tail:0.0003},
  tde:{k:[[-50, 9], [-35, 4], [-20, 1.2], [-8, 0.25], [0, 0], [50, 0.24], [200, 0.65], [450, 1.11], [900, 1.93], [1950, 3.3], [4950, 5.0]], tail:0.0004},
  // SN 1987A (Hamuy & Suntzeff 1990): about 5 on discovery, 4.5 the next day, a slow rise to 2.9 on
  // 20 May as the blue supergiant's compact envelope let the cobalt's heat out, then the tail.
  sn87a:{k:[[-86, 9], [-85.5, 2.4], [-85, 1.9], [-84, 1.6], [-78, 1.8], [-54, 1.0], [-24, 0.35], [0, 0], [16, 0.3], [36, 1.1], [51, 1.7]], tail:0.0098},
};
// pre: days from discovery to the peak, when it was found on the rise.
function novaCurve(t2, t3, pre){
  const rise=pre>1?[[-pre-2, 9], [-pre-1, 3], [-pre, 1.3]]:[[-3, 9], [-1, 1.5]];
  return {k:[...rise, [0, 0], [t2, 2], [t3, 3], [3*t3, 4.9], [10*t3, 7]], tail:0.002};
}
// Spectra (spectrum.js snSpectrum): the photosphere's temperature, the ejecta's speed, lines
// as [nm, emission, absorption, label] in P Cygni profiles, and the words for the tooltip.
// 'a' or 'an' before a number of kelvin: an 8,000, an 11,000, an 18,000.
const trA=T=>/^(8|11|18)\b/.test(T)?'an':'a';
const TR_SPEC={
  IIP:{T:11000, V:10000, lines:[[656.28, 1.8, 0.3, 'Hα'], [486.13, 0.5, 0.35, 'Hβ'], [434.05, 0.2, 0.3, 'Hγ'], [587.56, 0.25, 0.25, 'He I']],
    text:(T, V)=>`a Type II-P near peak: ${trA(T)} ${T} K photosphere, its hydrogen and helium in P Cygni lines from ejecta at ${V} km/s`},
  Ia:{T:10000, V:11000, lines:[[635.5, 0.15, 0.5, 'Si II'], [393.4, 0.1, 0.55, 'Ca II'], [545.4, 0, 0.2, 'S II'], [564.0, 0, 0.25, 'S II'], [777.4, 0, 0.2, 'O I']],
    text:(T, V)=>`a Type Ia near peak, a white dwarf blown apart: about ${T} K, no hydrogen, silicon, sulfur and calcium absorbed in ejecta at ${V} km/s`},
  Ibc:{T:9000, V:9000, lines:[[587.56, 0.3, 0.45, 'He I'], [667.8, 0.2, 0.3, 'He I'], [706.5, 0.2, 0.3, 'He I'], [393.4, 0.1, 0.5, 'Ca II'], [777.4, 0, 0.4, 'O I']],
    text:(T, V)=>`a stripped star’s supernova (Type Ib/c) near peak: about ${T} K, helium but no hydrogen, in lines from ejecta at ${V} km/s`},
  sn87a:{T:5500, V:6000, lines:[[656.28, 1.5, 0.4, 'Hα'], [486.13, 0.4, 0.5, 'Hβ'], [589.3, 0.3, 0.4, 'Na I'], [393.4, 0.1, 0.6, 'Ca II']],
    text:(T, V)=>`a blue supergiant’s supernova: about ${T} K at its slow peak, hydrogen, sodium and calcium in P Cygni lines from ejecta at ${V} km/s`},
  nova:{T:8500, V:1500, lines:[[656.28, 6, 0.3, 'Hα'], [486.13, 2, 0.3, 'Hβ'], [434.05, 1, 0.3, 'Hγ'], [516.9, 0.8, 0.3, 'Fe II'], [777.4, 0.6, 0.3, 'O I']],
    text:(T, V)=>`a classical nova near peak: hydrogen burning on a white dwarf throws off a shell at ${V} km/s, ${trA(T)} ${T} K fireball with broad Balmer and Fe II emission`},
  lbv:{T:8000, V:500, lines:[[656.28, 3, 0.4, 'Hα'], [486.13, 1, 0.4, 'Hβ'], [434.05, 0.4, 0.3, 'Hγ'], [587.56, 0.2, 0.2, 'He I']],
    text:(T, V)=>`a luminous blue variable in eruption: ${trA(T)} ${T} K wind at ${V} km/s, its hydrogen in P Cygni lines`},
  tde:{T:30000, V:10000, lines:[[656.28, 1.0, 0, 'Hα'], [486.13, 0.35, 0, 'Hβ'], [468.6, 0.8, 0, 'He II']],
    text:(T, V)=>`a star torn apart by a black hole: its debris falling back far faster than the black hole can swallow it, ${trA(T)} ${T} K photosphere with broad hydrogen and He II emission at ${V} km/s`},
  red:{T:4000, V:300, lines:[[656.28, 1, 0, 'Hα'], [589.3, 0, 0.5, 'Na I']],
    text:T=>`a red transient, about ${T} K: an outburst now thought to be two stars merging`},
};
// The events. date: first seen (Gregorian, proleptic before 1582), or for the prehistoric ones the
// year on the timeline (year) and a day in it (md). peak: days from that date to the peak.
// knots: [date, magnitude] for a light curve of its own.
const TRANSIENTS=[
  // Hou Hanshu: a guest star in Nanmen, 7 December 185 (Julian), gone eight months later. RCW 86,
  // a Type Ia's remnant (Williams et al. 2011) at 2.5 kpc; the peak, from −2 to −8 in the
  // estimates, taken at −6.
  {id:'sn185', name:'SN 185', type:'sn', group:'hist', date:'0185-12-06', ra:220.75, dec:-62.5, mag:-6, curve:'Ia', spec:'Ia', note:'Recorded by Han astronomers in Centaurus; seen for eight months.'},
  // Jin shu: a guest star in Nandou, April–May 386 (Julian), three months. Perhaps G11.2−0.3,
  // a core-collapse remnant with a pulsar, though its dust makes the link doubtful.
  {id:'sn386', name:'SN 386 (?)', type:'sn', group:'hist', date:'0386-04-16', ra:272.87, dec:-19.42, mag:0, curve:'IIP', spec:'IIP', note:'A guest star in Sagittarius for three months; its remnant is uncertain.'},
  // Song shu: a guest star in Wei, in the second month of 393 (Julian), eight months. Perhaps
  // RX J1713.7−3946, a core-collapse remnant about 1 kpc away.
  {id:'sn393', name:'SN 393 (?)', type:'sn', group:'hist', date:'0393-03-02', ra:258.39, dec:-39.77, mag:-1, curve:'Ibc', spec:'Ibc', note:'A guest star in the tail of Scorpius for eight months; perhaps RX J1713.7−3946.'},
  // 30 April 1006 (Julian), seen from Egypt to Japan, bright enough to read by: the brightest
  // star on record, about −7.5 (Winkler et al. 2003), a Type Ia at 2.2 kpc.
  {id:'sn1006', name:'SN 1006', type:'sn', group:'hist', date:'1006-05-06', ra:225.72, dec:-41.94, mag:-7.5, curve:'Ia', spec:'Ia', note:'The brightest star in recorded history, low in Lupus; seen for about three years.'},
  // 4 July 1054 (Julian), the Crab: by day for 23 days, by night for 653.
  {id:'sn1054', name:'SN 1054 (the Crab)', type:'sn', group:'hist', date:'1054-07-10', ra:83.633, dec:22.015, mag:-6, curve:'crab', spec:'IIP', note:'Song astronomers saw it by day for 23 days, in Taurus; it left the Crab Nebula and its pulsar.'},
  // 6 August 1181 (Julian), in Chuanshe, 185 days: now taken to be Pa 30, the remnant of a Type
  // Iax at 2.3 kpc (Ritter et al. 2021).
  {id:'sn1181', name:'SN 1181', type:'sn', group:'hist', date:'1181-08-13', ra:13.296, dec:67.501, mag:0, curve:'Ia', spec:'Ia', note:'Recorded in China and Japan in Cassiopeia for six months; its remnant is Pa 30.'},
  // Tycho's: first seen about 6 November 1572 (Julian), Tycho's own sighting the 11th; as bright
  // as Venus, gone in March 1574. A Type Ia (Krause et al. 2008).
  {id:'sn1572', name:'Tycho’s supernova (SN 1572)', type:'sn', group:'hist', date:'1572-11-16', peak:5, ra:6.329, dec:64.138, mag:-4, curve:'Ia', spec:'Ia', note:'In Cassiopeia, as bright as Venus; Tycho Brahe’s measures showed it lay beyond the Moon.'},
  // Kepler's: 9 October 1604 (Gregorian, from Italy), at its brightest late in the month.
  {id:'sn1604', name:'Kepler’s supernova (SN 1604)', type:'sn', group:'hist', date:'1604-10-09', peak:8, ra:262.675, dec:-21.483, mag:-2.5, curve:'Ia', spec:'Ia', note:'In Ophiuchus, beside Jupiter and Saturn; the last supernova seen in our galaxy.'},
  // 23 February 1987, in the Large Magellanic Cloud; Ian Shelton found it the next night.
  {id:'sn1987a', name:'SN 1987A', type:'sn', group:'hist', date:'1987-02-24', peak:85, ra:83.867, dec:-69.27, mag:2.9, curve:'sn87a', spec:'sn87a', note:'In the Large Magellanic Cloud, 51 kpc away; its neutrinos reached Earth hours before its light.'},

  // Before history. A hypothetical supernova at about 20 pc ending the Devonian (Fields et al.
  // 2020): about −15.2. Where, and in which stars, cannot be known; the place is invented, near
  // that sky's equator, overhead at midnight on the day at the equator, so both hemispheres see it.
  {id:'devonian', name:'A supernova at the end of the Devonian (?)', type:'sn', group:'pre', year:2000-359e6, md:'07-01', ra:125, dec:40, mag:-15.2, curve:'IIP', spec:'IIP', note:'Hypothetical: one at about 20 pc may have stripped the ozone layer at the end-Devonian extinction (Fields et al. 2020). Place invented.'},
  // The older pulse of iron-60 in the deep-sea crust, 6.5–8.7 Ma (Wallner et al. 2016), from a
  // supernova about 100 pc away (−11.75); where is not known, so it is put toward Tucana–Horologium.
  {id:'fe60old', name:'An iron-60 supernova, 7 Ma', type:'sn', group:'pre', year:2000-7e6, md:'10-01', ra:15, dec:-60, mag:-11.75, curve:'IIP', spec:'IIP', note:'Its iron-60 lies in the deep-sea crust (Wallner et al. 2016); about 100 pc away, place assumed.'},
  // The younger pulse, 1.7–3.2 Ma: Breitschwerdt et al. (2016) trace the nearest of its
  // supernovae, in the Scorpius–Centaurus groups, to 2.3 Ma at about 90 pc (−12.0).
  {id:'fe60', name:'An iron-60 supernova, 2.3 Ma', type:'sn', group:'pre', year:2000-2.3e6, md:'05-01', ra:210, dec:-50, mag:-12, curve:'IIP', spec:'IIP', note:'One of the Scorpius–Centaurus supernovae whose iron-60 reached Earth (Breitschwerdt et al. 2016); about 90 pc away, place assumed.'},
  // Geminga's supernova, at the birthplace Pellizza et al. (2005) trace the pulsar back to:
  // Galactic l 198°, b -12°, which is J2000 RA 85.25°, Dec +7.44°, in Orion. Peak V about -10.9:
  // a Type II-P supernova (M -16.75, Richardson et al. 2014) at 147 pc, the geometric middle
  // of their 90-240 pc. Early on a II-P is hot, so it is drawn blue-white.
  //
  // The supernova that ejected the runaway zeta Oph and PSR B1706-16, 1.78 Myr ago at 107 pc
  // (Neuhauser et al. 2020). Peak V about -11.6 for a Type II-P at 107 pc. Their abstract gives no
  // position; RA 242.4, Dec -21.0 is where a straight-line trace of zeta Oph's Hipparcos motion
  // (RV -9 to -15 km/s) puts it 1.78 Myr ago, in Scorpius about 7 degrees NW of Antares.
  // Each explodes on 24 December of the year before its epoch's year 0, at peak on 7 January.
  {id:'zetaoph', name:'The supernova that launched ζ Oph', type:'sn', group:'pre', year:2000-1.78e6, md:'01-07', ra:242.4, dec:-21.0, mag:-11.6, rgb:[0.86, 0.92, 1.0], curve:'IIP', spec:'IIP', note:'1.78 Ma, 107 pc away in Scorpius: it flung ζ Oph and a pulsar apart (Neuhäuser et al. 2020).'},
  {id:'geminga', name:'Geminga’s supernova', type:'sn', group:'pre', year:2000-342000, md:'01-07', ra:85.25, dec:7.44, mag:-10.9, rgb:[0.86, 0.92, 1.0], curve:'IIP', spec:'IIP', note:'342 ka, about 147 pc away in Orion; it left the Geminga pulsar (Pellizza et al. 2005).'},
  // The Monogem Ring: 86 ka (Thorsett et al. 2003) at PSR B0656+14's 288 pc: −9.5.
  {id:'monogem', name:'The Monogem Ring supernova', type:'sn', group:'pre', year:2000-86000, md:'01-15', ra:104.94, dec:14.35, mag:-9.5, curve:'IIP', spec:'IIP', note:'About 86 ka and 288 pc away in Gemini; its remnant, the Monogem Ring, spans 25° of sky.'},
  // The Cygnus Loop: 10–20 ka at 735 pc (Fesen et al. 2018): −7.
  {id:'cygloop', name:'The Cygnus Loop supernova', type:'sn', group:'pre', year:2000-15000, md:'08-15', ra:312.75, dec:30.67, mag:-7, curve:'IIP', spec:'IIP', note:'10,000 to 20,000 years ago, 735 pc away; the Veil Nebula is its shell. Date assumed.'},
  // Vela: the pulsar's 11 kyr age at 287 pc (Dodson et al. 2003): −9.5.
  {id:'vela', name:'The Vela supernova', type:'sn', group:'pre', year:2000-11000, md:'02-10', ra:128.836, dec:-45.176, mag:-9.5, curve:'IIP', spec:'IIP', note:'About 11,000 years ago, 287 pc away; it left the Vela pulsar. Date assumed.'},
  // Puppis A: 4.4 kyr from its neutron star's motion (Becker et al. 2012), 1.3 kpc, two
  // magnitudes of dust: −4.5.
  {id:'puppisa', name:'The Puppis A supernova', type:'sn', group:'pre', year:2000-4400, md:'02-01', ra:126.03, dec:-42.99, mag:-4.5, curve:'IIP', spec:'IIP', note:'About 4,400 years ago, 1.3 kpc away behind the Vela remnant. Date assumed.'},
  // Vela Jr (RX J0852.0−4622): 2.4–5.1 kyr at about 750 pc (Allen et al. 2015): −6.
  {id:'velajr', name:'The Vela Jr supernova', type:'sn', group:'pre', year:2000-3700, md:'01-20', ra:133.0, dec:-46.33, mag:-6, curve:'IIP', spec:'IIP', note:'2,400 to 5,100 years ago, about 750 pc away; age and distance uncertain. Date assumed.'},

  // Novae brighter than magnitude 3 (Strope et al. 2010; Duerbeck 1987), at their discovery.
  {id:'v841oph', name:'V841 Oph (Nova Ophiuchi 1848)', type:'nova', group:'nova', date:'1848-04-27', peak:-55, ra:254.877, dec:-12.891, mag:2.0, curve:[20, 40], spec:'nova', note:'Found by J. R. Hind at 5.6, well after a peak that may have reached 2.'},
  {id:'tcrb1866', name:'T CrB (1866)', type:'nova', group:'nova', date:'1866-05-12', ra:239.876, dec:25.92, mag:2.0, curve:[4, 7], spec:'nova', note:'The Blaze Star’s first recorded eruption, found by John Birmingham; a recurrent nova.'},
  {id:'qcyg', name:'Q Cyg (Nova Cygni 1876)', type:'nova', group:'nova', date:'1876-11-24', ra:325.433, dec:42.841, mag:3.0, curve:[5, 11], spec:'nova', note:'Found by Julius Schmidt at Athens.'},
  {id:'gkper', name:'GK Per (Nova Persei 1901)', type:'nova', group:'nova', date:'1901-02-21', peak:2, ra:52.8, dec:43.904, mag:0.2, curve:[6, 13], spec:'nova', note:'Found by Thomas Anderson in Edinburgh; its light echo was the first seen.'},
  {id:'v603aql', name:'V603 Aql (Nova Aquilae 1918)', type:'nova', group:'nova', date:'1918-06-08', peak:1, ra:282.2275, dec:0.584, mag:-0.5, curve:[4, 9], spec:'nova', note:'The brightest nova since Kepler’s supernova, outshone only by Sirius.'},
  {id:'v476cyg', name:'V476 Cyg (Nova Cygni 1920)', type:'nova', group:'nova', date:'1920-08-20', peak:3, ra:299.602, dec:53.619, mag:2.0, curve:[6, 16], spec:'nova', note:'Found by W. F. Denning.'},
  {id:'rrpic', name:'RR Pic (Nova Pictoris 1925)', type:'nova', group:'nova', date:'1925-05-25', ra:98.9, dec:-62.64, mag:1.2, spec:'nova',
    knots:[['1925-05-15', 7.5], ['1925-05-25', 2.3], ['1925-06-09', 1.2], ['1925-07-10', 2.0], ['1925-08-15', 3.0], ['1925-12-01', 4.0], ['1926-06-01', 5.0], ['1928-01-01', 6.5], ['1929-01-01', 7.5]],
    note:'Found by Hendrik Watson in South Africa; a slow nova, at its brightest two weeks later.'},
  // DQ Her: slow, then in April 1935 hidden by the dust it made, falling by ten magnitudes.
  {id:'dqher', name:'DQ Her (Nova Herculis 1934)', type:'nova', group:'nova', date:'1934-12-13', ra:271.876, dec:45.859, mag:1.4, spec:'nova',
    knots:[['1934-11-30', 7.5], ['1934-12-13', 3.4], ['1934-12-22', 1.4], ['1935-01-20', 2.8], ['1935-03-01', 3.5], ['1935-04-01', 4.3], ['1935-04-15', 7.5]],
    note:'Found by J. P. M. Prentice; in April 1935 the dust it made hid it.'},
  {id:'cplac', name:'CP Lac (Nova Lacertae 1936)', type:'nova', group:'nova', date:'1936-06-18', peak:1, ra:333.921, dec:55.617, mag:2.1, curve:[5, 10], spec:'nova', note:'Found by Kazuaki Gomi in Tokyo.'},
  {id:'cppup', name:'CP Pup (Nova Puppis 1942)', type:'nova', group:'nova', date:'1942-11-08', peak:2, ra:122.942, dec:-35.351, mag:0.3, curve:[5, 8], spec:'nova', note:'Found by Bernhard Dawson in Argentina; one of the fastest and brightest.'},
  {id:'tcrb1946', name:'T CrB (1946)', type:'nova', group:'nova', date:'1946-02-09', ra:239.876, dec:25.92, mag:3.0, curve:[4, 7], spec:'nova', note:'The Blaze Star’s second recorded eruption, eighty years after the first.'},
  {id:'v446her', name:'V446 Her (Nova Herculis 1960)', type:'nova', group:'nova', date:'1960-03-07', peak:-3, ra:284.34, dec:13.241, mag:2.8, curve:[3, 16], spec:'nova', note:'Found by Olaf Hassel, three days past its peak.'},
  {id:'v533her', name:'V533 Her (Nova Herculis 1963)', type:'nova', group:'nova', date:'1963-02-06', peak:-7, ra:273.585, dec:41.856, mag:3.0, curve:[26, 44], spec:'nova', note:'Found by Leslie Peltier and Elis Dahlgren, after its peak.'},
  {id:'v1500cyg', name:'V1500 Cyg (Nova Cygni 1975)', type:'nova', group:'nova', date:'1975-08-29', peak:1, ra:317.903, dec:48.151, mag:1.7, curve:[2.9, 4], spec:'nova', note:'The fastest bright nova known: it faded three magnitudes in four days.'},
  {id:'v382vel', name:'V382 Vel (Nova Velorum 1999)', type:'nova', group:'nova', date:'1999-05-22', peak:1, ra:161.202, dec:-52.425, mag:2.6, curve:[6, 13], spec:'nova', note:'Found by Peter Williams in Australia.'},

  // Stellar eruptions. P Cygni: Willem Blaeu's new star of 18 August 1600, at 3 for six years,
  // gone by 1626, back in 1655 (de Groot 1969); today's 4.8 is the catalog's.
  {id:'pcyg', name:'P Cygni (1600)', type:'erupt', group:'erupt', date:'1600-08-18', ra:304.447, dec:38.033, mag:3.0, spec:'lbv', T:18000, V:200,
    knots:[['1600-08-08', 7.5], ['1600-08-18', 3.0], ['1606-12-31', 3.0], ['1615-01-01', 4.5], ['1626-01-01', 6.0], ['1630-01-01', 7.5], ['1654-12-01', 7.5], ['1655-06-01', 3.5], ['1660-01-01', 5.0], ['1662-01-01', 6.0], ['1665-01-01', 7.5]],
    note:'A luminous blue variable’s eruption: a new third-magnitude star in Cygnus for six years.'},
  // CK Vul: Père Dom Anthelme's star of 20 June 1670, back in March 1671 at 2.6, and in 1672
  // (Shara et al. 1985); perhaps two stars merging (Kamiński et al. 2015).
  {id:'ckvul', name:'CK Vul (Nova Vulpeculae 1670)', type:'erupt', group:'erupt', date:'1670-06-20', ra:296.909, dec:27.313, mag:2.6, spec:'red',
    knots:[['1670-06-10', 7.5], ['1670-06-20', 3.0], ['1670-08-15', 5.5], ['1670-10-10', 7.5], ['1671-03-10', 7.5], ['1671-03-17', 3.5], ['1671-04-30', 2.6], ['1671-06-15', 4.0], ['1671-08-31', 7.5], ['1672-03-10', 7.5], ['1672-03-25', 5.5], ['1672-05-15', 7.5]],
    note:'Seen by Anthelme and Hevelius, three times over two years; perhaps two stars merging.'},
  // η Carinae's Great Eruption (Smith & Frew 2011): bright since the 1820s, a flare to 0.2 at
  // New Year 1838, −0.8 in March 1843, second only to Sirius, then fading in the late 1850s.
  {id:'etacar', name:'η Carinae’s Great Eruption', type:'erupt', group:'erupt', date:'1843-03-14', ra:161.265, dec:-59.685, mag:-0.8, spec:'lbv', T:7000, V:600,
    knots:[['1820-01-01', 4.0], ['1827-01-01', 2.0], ['1837-12-01', 1.0], ['1838-01-02', 0.2], ['1838-04-01', 1.0], ['1842-01-01', 0.5], ['1843-03-14', -0.8], ['1844-06-01', 0.0], ['1850-01-01', 0.5], ['1856-01-01', 1.0], ['1858-01-01', 3.0], ['1860-01-01', 5.0], ['1866-01-01', 7.5]],
    note:'Ten solar masses thrown off in two decades; at its peak second only to Sirius.'},

  // Betelgeuse, a red supergiant 168 pc away (Joyce et al. 2020), due to explode within about
  // 100,000 years: a Type II-P at −10.6. The year is assumed. Its star goes out (stars.js starsAt).
  // A tidal disruption by the LMC's black hole: 10^5.8 M☉ (Han et al. 2025, from the hypervelocity
  // stars it has thrown into the Milky Way's halo), at the mean place Chisholm et al. (2026) predict,
  // RA 80.23°, Dec −69.55°. A Sun-like star's debris returns at ~140 times the Eddington rate, so the
  // light is near Eddington's: at 3 L_Edd (2.3×10⁴⁴ erg/s) and 3×10⁴ K, as optical TDEs show, at the
  // LMC's 49.6 kpc (Pietrzyński et al. 2019) through A_V ≈ 0.3, V ≈ −0.6 (−3 to +1 over 1–5 L_Edd and
  // 2–4×10⁴ K). The LMC has no nuclear star cluster, which in loss-cone models puts the rate near
  // 10⁻⁶–10⁻⁵ a year (Pfister et al. 2020), but it has thrown out about as many hypervelocity stars as
  // the Milky Way's center, whose disruptions run near 10⁻⁴ a year: taken here as 3×10⁻⁵ a year, so
  // the median wait for the next is about 23,000 years. The day is assumed.
  {id:'lmctde', name:'A star torn apart by the LMC’s black hole', type:'tde', group:'future', year:25000, md:'12-15', ra:80.23, dec:-69.55, mag:-0.6, curve:'tde', spec:'tde', note:'Predicted: a 6×10⁵ M☉ black hole in the Large Magellanic Cloud disrupting a star, as bright as Canopus for months and visible for decades. Year and day assumed.'},
  // A tidal disruption by M31's black hole, 1.4×10⁸ M☉ (Bender et al. 2005), at its nucleus. A
  // Sun-like star must pass deep, round a fast-spinning hole, to be torn apart rather than swallowed;
  // its debris returns over ~300 days at 0.3–1 M☉ a year, near Eddington's rate, and a spin of 0.9 or
  // more turns 16–32% of it to light: ~10⁴⁶ erg/s, reprocessed at 2–4×10⁴ K as optical TDEs are, at
  // 765 kpc through A_V ≈ 0.2: V ≈ 1 (−0.7 to 5). It rises over most of a year and fades as the
  // fallback, t^(−5/3) from the disruption, visible for over a decade. M31's disruptions of
  // Sun-like stars, needing such deep passages, come perhaps once in 10⁵–10⁶ years: at one in
  // 3×10⁵ the median wait is about 210,000 years. Andromeda's 110 km/s approach brings it closer by
  // only 24 pc by then. The day is assumed.
  {id:'m31tde', name:'A star torn apart by Andromeda’s black hole', type:'tde', group:'future', year:210000, md:'10-15', ra:10.6847, dec:41.269, mag:1.0, curve:'tdeM31', spec:'tde', V:15000, note:'Predicted: M31’s 1.4×10⁸ M☉ black hole tearing apart a star on a deep plunge, a first-magnitude star in Andromeda’s core for most of a year, visible for over a decade. Year and day assumed.'},
  {id:'betelgeuse', name:'Betelgeuse’s supernova', type:'sn', group:'future', year:100000, md:'01-10', star:'Betelgeuse', mag:-10.6, curve:'IIP', spec:'IIP', note:'Due within about 100,000 years, 168 pc away; the year is assumed.'},
];
// A date's place on the timeline: the year and how far through it, by the Gregorian calendar.
function trYearFrac(Y, M, D){ const a=utcDay(Y, 1, 1); return (utcDay(Y, M, D)-a)/(utcDay(Y+1, 1, 1)-a); }
function trParse(s){ const p=/^(-?\d+)-(\d+)-(\d+)$/.exec(s).slice(1).map(Number); return p[0]+trYearFrac(...p); }
// Each event's year (Y), fraction (f) and time on the timeline (A), its light curve as knots
// [timeline year, magnitude], and when it is last brighter than 7.
for(const ev of TRANSIENTS){
  const [Y, M, D]=ev.date?/^(-?\d+)-(\d+)-(\d+)$/.exec(ev.date).slice(1).map(Number):[ev.year, ...ev.md.split('-').map(Number)];
  ev.Y=Y; ev.f=trYearFrac(Y, M, D); ev.A=Y+ev.f;
  if(ev.knots){ ev.K=ev.knots.map(([d, m])=>[trParse(d), m]); ev.tail=0; }
  else {
    const C=Array.isArray(ev.curve)?novaCurve(...ev.curve, ev.peak||0):TR_CURVE[ev.curve], A0=ev.A+(ev.peak||0)/TROPICAL_YEAR;
    ev.K=C.k.map(([t, dm])=>[A0+t/TROPICAL_YEAR, ev.mag+dm]); ev.tail=C.tail;
  }
  const L=ev.K[ev.K.length-1];
  ev.end=ev.tail>0?L[0]+Math.max(0, 7-L[1])/ev.tail/TROPICAL_YEAR:L[0];
}
// The stars that have exploded by year A, by name, for the catalog to drop.
const TR_GONE=new Map(TRANSIENTS.filter(ev=>ev.star).map(ev=>[ev.star, ev.Y+1]));
// Magnitude at timeline time A, or null when not shown.
function transientMag(ev, A){
  const K=ev.K, n=K.length;
  if(!(A>=K[0][0] && A<=ev.end)) return null;
  let m;
  if(A>=K[n-1][0]) m=K[n-1][1]+ev.tail*(A-K[n-1][0])*TROPICAL_YEAR;
  else { let i=0; while(K[i+1][0]<A) i++; const [a0, m0]=K[i], [a1, m1]=K[i+1]; m=m0+(m1-m0)*(A-a0)/(a1-a0); }
  return m>7?null:m;
}
// The instant shown on the timeline, to the minute.
function transientNow(){ return eventTime()+minutes/DAYMIN/yearLen(pageDate()[0]); }
function transientRow(ev){
  if(ev.star) return STARS.find(s=>s[7]===ev.star);
  return ev.row||(ev.row=[ev.ra, ev.dec, ev.mag, 0, 0, 0]);
}
// How bright the glare drawn round it is (day.js, the sky shader): none to magnitude −2, full
// from −9. Fainter, the point the stars are drawn with is all of it.
function transientGlare(mag){ return smooth01(2, 9, -mag); }
function transientSpec(ev){ return TR_SPEC[ev.spec||'IIP']; }
// Its color as a star's (stars.js starTint), and as the glare's, the brightest channel 1.
function transientTint(ev){ return ev.tint||(ev.tint=starTint(ev.T||transientSpec(ev).T).map(c=>Math.min(2.4, c))); }
function transientRGB(ev){ if(ev.rgb) return ev.rgb; const t=transientTint(ev), mx=Math.max(...t); return t.map(c=>c/mx); }
// One event's place at latitude lat and sidereal time LST, at timeline time A; null when not shown.
function transientPlace(ev, lat, A=transientNow(), LST=localSidereal()){
  const mag=transientMag(ev, A);
  if(mag==null) return null;
  const key=EP[dIdx].key, place=starMeanPlace(transientRow(ev), key, pageDate()[0]), p=raDecAltaz(lat, place.ra, place.dec, LST);
  return {az:p.az, el:p.alt, mag, rgb:transientRGB(ev), name:ev.name, ev, glare:transientGlare(mag)};
}
// Every one shown now, brightest first.
function transientPlaces(lat){
  const A=transientNow(), LST=localSidereal(), out=[];
  for(const ev of TRANSIENTS){ const p=transientPlace(ev, lat, A, LST); if(p) out.push(p); }
  return out.sort((a, b)=>a.mag-b.mag);
}
// Up to TR_CAP of them as points among the stars, after the satellites in the star map (stars.js).
function placeTransients(lat, LST, tex, marks, up){
  const list=transientPlaces(lat).filter(p=>p.el>0).slice(0, TR_CAP);
  list.forEach((p, k)=>{
    const d=magDisplay(p.mag, 200), rgb=transientTint(p.ev).map(c=>c*d.amp), dir=horizDir(p.az, p.el);
    marks.push({az:p.az, el:p.el, px:d.px, rgb, mag:p.mag, transient:p.ev});
    const i=STAR_N+SAT_CAP+k, o=i*4;
    tex[o]=dir[0]; tex[o+1]=dir[1]; tex[o+2]=dir[2]; tex[o+3]=d.px;
    const c=STAR_MAP_W*4+o; tex[c]=rgb[0]; tex[c+1]=rgb[1]; tex[c+2]=rgb[2]; tex[c+3]=p.mag;
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  });
}
// The brightest shown now, which lights the scene (vr_paint.js), or null.
function supernovaPlace(lat){ return transientPlaces(lat)[0]||null; }

// The date picker lists every event: these, and the comets' apparitions (comets.js addEvents).
// The events on the days of month M of page year Y, in this epoch's calendar: a map from day to events.
const EVENTS=TRANSIENTS.slice();
function transientDays(Y, M){
  const A0=Y+epochShift(), len=yearLen(Y), m0=monthStart(Y, M), n=monthLen(Y, M), out=new Map();
  for(const ev of EVENTS){
    if(ev.Y!==A0) continue;
    const d=Math.min(len-1, Math.round(ev.f*len))-m0+1;
    if(d>=1 && d<=n){ if(!out.has(d)) out.set(d, []); out.get(d).push(ev); }
  }
  return out;
}
// Where an event is now: a nova's or supernova's place, a comet's head (comets.js), or for the
// others their own test (ev.place: an aurora's storm, a meteor storm's radiant), {el} or null.
function eventPlace(ev, lat){ return ev.place?ev.place(ev, lat):ev.comet?cometEventPlace(ev, lat):transientPlace(ev, lat); }
// The clock time on the day shown when ev stands highest in the darkest sky (full night before
// astronomical twilight, then nautical, civil, day), or null when it never rises at this latitude that day.
function transientBestMinute(ev, lat){ const b=transientBestView(ev, lat); return b?b.m:null; }
// The same as {m, s}: s scores the view, the height in degrees plus 400 in full night, 200 in
// astronomical twilight, 100 nautical, 50 civil. An event at a set time (ev.minute: a meteor storm's
// peak) is scored at that time alone.
function transientBestView(ev, lat){
  const keep=minutes, dec=sunEquatorial(astroDay()).Dec;
  let best=null;
  try{
    for(let m=ev.minute??0; m<DAYMIN; m+=ev.minute!=null?DAYMIN:10){
      minutes=m;
      const p=eventPlace(ev, lat);
      if(!p||p.el<3) continue;
      const sunEl=90-sunGeom(lat, m, dec).sza, s=p.el+(sunEl<-18?400:sunEl<-12?200:sunEl<-6?100:sunEl<0?50:0);
      if(!best||s>best.s) best={s, m};
    }
  }finally{ minutes=keep; }
  return best;
}
// The latitude an event is best seen from: of the equator and the two mid-latitudes, where most
// people live, the one that sees it highest in the darkest sky; the polar ones only when none of
// those sees it at least 10° up at night (astronomical twilight or darker).
const TR_LATS=['Mid-latitude', 'Mid-latitude S', 'Equator'], TR_POLAR=['Polar', 'Polar S'];
function transientBestLat(ev){
  if(ev.lat) return ev.lat;
  const pick=names=>names.map(n=>[n, transientBestView(ev, LATDEG[n])]).filter(([, b])=>b).reduce((a, b)=>!a||b[1].s>a[1].s?b:a, null);
  const near=pick(TR_LATS);
  if(near && near[1].s>=210) return near[0];
  const far=pick(TR_POLAR);
  return far&&(!near||far[1].s>near[1].s)?far[0]:near?near[0]:dLat;
}
// Go to ev's day: its epoch's sky (auto-select on) or the one shown, at the hour it shows best. A
// comet shows only in the skies with real comets, so with auto-select off it still takes its own.
function goToTransient(ev){
  const keep=!autoEpoch && !(ev.comet && !COMET_REAL_EPOCHS.has(EP[dIdx].key));
  const i=keep?dIdx:epochIndexAt(ev.A), date=()=>dateInYear(ev.Y-epochShift(EP[i].key), ev.f);
  if(i===dIdx) document.getElementById('moonDate').value=date();
  else setEpoch(i, date);
  // From the latitude it is best seen from, at that hour.
  dLat=transientBestLat(ev);
  document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===dLat?'true':'false'));
  // An impact as it comes in, a meteor storm at its peak, a volcanic sky at dusk, the rest at
  // their best hour.
  // A time worked out from the sky (an impact's) needs the day's sky drawn first.
  if(typeof ev.at==='function') renderDay();
  const at=typeof ev.at==='function'?ev.at():ev.at, m=at!=null?at:ev.dusk?duskMinute(LATDEG[dLat]):transientBestMinute(ev, LATDEG[dLat]);
  if(m!=null){ minutes=m; hslider.value=String(minutes); }
  datePopDrawn=''; renderDay(); warm();
}
// The clock time on the day shown when the Sun has set 4° in the evening, where the twilight
// colors are deepest.
function duskMinute(lat){
  const dec=sunEquatorial(astroDay()).Dec;
  for(let m=720; m<DAYMIN; m+=2) if(90-sunGeom(lat, m, dec).sza<-4) return m;
  return 1200;
}
// The note under the days: the day's events, and whether each rises here.
function transientNote(Y, M, D){
  const evs=transientDays(Y, M).get(D);
  if(!evs) return '';
  return evs.map(ev=>`★ ${ev.name}: ${ev.note}`+(ev.at==null&&!ev.dusk&&transientBestMinute(ev, LATDEG[dLat])==null?' '+(ev.unseen||'It does not rise at this latitude today.'):'')).join(' ');
}
// The menu, by group, oldest first in each, and the color key under it. The ones before history
// are listed by age, the others by year.
function transientWhen(ev){ const a=2000-ev.Y; return ev.group!=='pre'&&ev.Y>-8000?fmtYear(ev.Y):a<1e6?`${+(a/1e3).toPrecision(3)} ka`:`${+(a/1e6).toPrecision(3)} Ma`; }
const dpEvents=document.getElementById('dpEvents');
function buildEventMenu(){
  dpEvents.replaceChildren(new Option('Go to a supernova, nova, eruption or comet…', ''));
  for(const [g, label] of TR_GROUPS){
    const og=document.createElement('optgroup'); og.label=label;
    EVENTS.map((ev, i)=>[ev, i]).filter(([ev])=>ev.group===g).sort((a, b)=>a[0].A-b[0].A)
      .forEach(([ev, i])=>og.appendChild(new Option(`${transientWhen(ev)} · ${ev.name}`, String(i))));
    if(og.children.length) dpEvents.appendChild(og);
  }
  document.getElementById('dpEvKey').innerHTML=Object.values(TR_TYPES).map(t=>`<span><i style="color:${t.color}">★</i> ${t.label}</span>`).join('');
}
// More events, each with a date (YYYY-MM-DD, Gregorian), placed on the timeline as the others.
function addEvents(list){
  for(const ev of list){ const [Y, M, D]=/^(-?\d+)-(\d+)-(\d+)$/.exec(ev.date).slice(1).map(Number); ev.Y=Y; ev.f=trYearFrac(Y, M, D); ev.A=Y+ev.f; EVENTS.push(ev); }
  buildEventMenu();
}
buildEventMenu();
dpEvents.addEventListener('change', ()=>{ const ev=EVENTS[+dpEvents.value]; dpEvents.value=''; if(ev) goToTransient(ev); });
// The volcanic skies (air_time.js AIR_VEILS) as events: their most vivid evenings, at dusk.
addEvents([
  {id:'laki', name:'The Laki haze', date:'1783-06-24', note:'The Icelandic fissure’s sulfur fog over the Northern Hemisphere all summer: a dim, red Sun at noon and blood-red sunsets. Northern skies only.'},
  {id:'krakatoa', name:'Krakatoa’s twilights', date:'1883-11-27', note:'Krakatoa’s veil had circled the world: twilights so red that fire engines were called out in New York and Connecticut.'},
  {id:'pinatubo', name:'Pinatubo’s twilights', date:'1991-12-15', note:'Pinatubo’s veil: purple twilights and paler days worldwide through 1992.'},
].map(ev=>({...ev, type:'veil', group:'veil', lat:'Mid-latitude', dusk:true})));
