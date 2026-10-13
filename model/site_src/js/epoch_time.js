/* ---------- the time shown: one timeline through all the epochs ---------- */
// The time shown is a year on one timeline, numbered as we number years (year 0 is 1 BC). Ages
// count back from 2000: "66 Ma" is the year 2000 − 66,000,000. Each epoch is a fixed point on the
// timeline: the modern-era skies at their own years, the others at their ages. The main epochs
// are the sky's long-lived states: each one's sky holds from halfway back to the main epoch
// before it to halfway on to the next. Events interrupt them for a while (EPOCH_EVENTS below): the
// Neoarchean's haze episodes, the K-Pg impact winter, the volcanic year, the ozone-hole years.
// Some epochs are alternatives at another's time rather than times of their own (the polluted
// city and 2100 beside today's clean air), and one stays chosen through its main epoch's span.
// Underneath, each epoch keeps its own calendar years (pageDate): the modern-era skies number
// them as we do, the others count from a year 0 of their own at 2000 (calendar.js).
const EPOCH_PARENT={modernpoll:'modern', y2100:'modern'};
const TIME_MIN=2000-4.567e9, TIME_MAX=250000;   // the Solar System's birth; as far ahead as before
// A year typed or labelled: "1815", "−3000", "3000 BCE", "250,000 years ago", "342 ka", "66 Ma",
// "2.7 Ga", "today". Returns the year on the timeline, or null.
const AGE_UNIT={ka:1e3, kyr:1e3, kya:1e3, ky:1e3, ma:1e6, myr:1e6, mya:1e6, ga:1e9, gyr:1e9, gya:1e9};
function parseTime(s){
  s=String(s||'').trim().toLowerCase().replace(/[−–]/g, '-').replace(/(\d)[,\s](?=\d{3}\b)/g, '$1');
  if(s==='today'||s==='now') return new Date().getFullYear();
  const m=/^(-?\d+(?:\.\d+)?)\s*(ka|kyr|kya|ky|ma|myr|mya|ga|gyr|gya|years?|yrs?|y)?\s*(ago|bp|bce|bc|ce|ad)?$/.exec(s);
  if(!m) return null;
  const n=+m[1], unit=AGE_UNIT[m[2]], era=m[3];
  if(unit||era==='ago'||era==='bp') return n<0?null:Math.round(2000-n*(unit||1));
  if(era==='bce'||era==='bc') return n>=1&&Number.isInteger(n)?1-n:null;
  return Number.isInteger(n)?n:null;
}
// A year on the timeline in words: as we number years from 10,000 years ago on, and before that
// as an age: years ago, then Ma and Ga, with as many decimals as the year needs.
function fmtTime(A){
  if(A>-8000) return fmtYear(A);
  const age=2000-A, dec=(x, n)=>x.toFixed(n).replace(/\.?0+$/, '');
  if(age<1e6) return `${age.toLocaleString('en-US')} years ago`;
  return age<1e9?`${dec(age/1e6, 6)} Ma`:`${dec(age/1e9, 9)} Ga`;
}
// A length of time in words: about 1.7 years, about 1.1 million years.
function fmtDuration(d){ const r=(x, u)=>`about ${+x.toPrecision(2)} ${u}`; return d<1e3?r(d, 'years'):d<1e6?r(d/1e3, 'thousand years'):r(d/1e6, 'million years'); }
// Where epoch key sits on the timeline, and the timeline year less the epoch's own year.
function epochAnchor(key){ return key in EPOCH_YEAR?epochYear(key):parseTime(EP.find(e=>e.key===key).age); }
function epochShift(key=EP[dIdx].key){ return key in EPOCH_YEAR?0:epochAnchor(key)-2000; }
function pageTime(){ return pageDate()[0]+epochShift(); }
// The time shown to within the year, for events lasting years: the page year and how far through it.
function eventTime(){ return physTime()+yearFraction()[1]; }
// An event and the epoch whose sky it interrupts share everything but the air: the stars, the
// Moon, the planets, the rates. The two backgrounds added for them, the clear Neoarchean and the
// Late Cretaceous, take the tables of their events' epochs (aliasEpochs fills in a table's
// missing entries; dataKey names the epoch whose seeded features, star lists and maps to use).
function aliasEpochs(T){
  for(const [k, src] of [['archean27clear', 'archean27'], ['cretaceous66', 'kpg66']]) if(!(k in T) && src in T) T[k]=T[src];
  return T;
}
function dataKey(key){ return {archean27clear:'archean27', archean27thin:'archean27', archean27vthick:'archean27', cretaceous66:'kpg66'}[key]||key; }
// Events. Each rises from `start` over `rise` years (smoothly), holds for `hold`, then falls over
// `fall` or decays with e-folding time `efold`; its sky is shown while it is at least half on.
//   - Neoarchean haze episodes: three in the 2.65–2.5 Ga Ghaap Group (Zerkle et al. 2012, at
//     about 1400, 1100 and 800 m in core GKF01, dated here by spacing the core's ~2.65 and ~2.5 Ga
//     ends evenly: about 2.63, 2.58 and 2.52 Ga, uncertain by tens of Myr). The youngest, the one
//     Izon et al. (2017) resolved, set in within 0.3 ± 0.1 Myr and lasted 1.4 ± 0.4 Myr in all;
//     each is given that shape, falling as fast as it rose. The two older are the thin haze
//     Zerkle et al. model as the stable hazy state; the youngest is drawn as the thick one.
//   - The K-Pg impact winter: soot cut sunlight to almost nothing for about a year and the sky
//     came back over the next few (Bardeen et al. 2017): held a year after the impact, then
//     decaying with a year's e-folding time, so its sky lasts about 1.7 years.
//   - The volcanic year: Tambora erupted on 10 April 1815; its sulfate veil spread through the
//     stratosphere over months, stayed through 1816, and cleared in 1817 (e-folding ~0.7 years).
//   - The ozone-hole years, 1980 to 2000 as the epoch has them: the Antarctic springs when the
//     hole opened and deepened. (It still opens each spring and is not expected to close before
//     the 2060s, but past 2000 the page keeps today's clean air.)
const MYR=1e6;
function hazeEpisode(key, c){ return {key, start:c-0.7*MYR, rise:0.3*MYR, hold:0.8*MYR, fall:0.3*MYR}; }
const EPOCH_EVENTS=[
  hazeEpisode('archean27thin', 2000-2.63e9), hazeEpisode('archean27thin', epochAnchor('archean27thin')), hazeEpisode('archean27', epochAnchor('archean27')),
  {key:'kpg66', start:epochAnchor('kpg66'), rise:0.02, hold:1, efold:1},
  {key:'volcanic', start:1815.28, rise:0.3, hold:1.32, efold:0.7},
  {key:'ozonehole', start:1979.995, rise:0.01, hold:21, fall:0.01},
];
// How far on an event (or any such shape) is at year A, 0 to 1.
function eventLevel(ev, A){
  let t=A-ev.start;
  if(t<0) return 0;
  if(t<ev.rise) return smooth01(0, ev.rise, t);
  t-=ev.rise+ev.hold;
  if(t<0) return 1;
  return ev.efold?Math.exp(-t/ev.efold):1-smooth01(0, ev.fall, t);
}
// The years an event's sky holds, where it is at least half on.
function eventWindow(ev){ return [ev.start+ev.rise/2, ev.start+ev.rise+ev.hold+(ev.efold?ev.efold*Math.LN2:ev.fall/2)]; }
function eventAt(A){ return EPOCH_EVENTS.find(ev=>{ const [a, b]=eventWindow(ev); return A>=a && A<b; })||null; }
const EVENT_KEYS=new Set(EPOCH_EVENTS.map(ev=>ev.key));
// The main epochs in time order, and the span of each (shared by its alternatives); an event's is
// its window nearest year A.
const MAIN_EPOCHS=EP.map(e=>e.key).filter(k=>!(k in EPOCH_PARENT) && !EVENT_KEYS.has(k)).sort((a, b)=>epochAnchor(a)-epochAnchor(b));
function epochSpan(key, A=epochAnchor(key)){
  if(EVENT_KEYS.has(key)){
    const W=EPOCH_EVENTS.filter(ev=>ev.key===key).map(eventWindow);
    return W.reduce((b, w)=>Math.abs((w[0]+w[1])/2-A)<Math.abs((b[0]+b[1])/2-A)?w:b);
  }
  const k=EPOCH_PARENT[key]||key, i=MAIN_EPOCHS.indexOf(k), A0=epochAnchor(k);
  return [i>0?(A0+epochAnchor(MAIN_EPOCHS[i-1]))/2:TIME_MIN, i<MAIN_EPOCHS.length-1?(A0+epochAnchor(MAIN_EPOCHS[i+1]))/2:TIME_MAX];
}
// The epoch shown at year A: an event's while one holds, else the nearest main epoch, or the one
// shown now if it is that one's alternative.
function epochIndexAt(A, cur=EP[dIdx].key){
  const ev=eventAt(A);
  if(ev) return EP.findIndex(e=>e.key===ev.key);
  let best=MAIN_EPOCHS[0];
  for(const k of MAIN_EPOCHS) if(Math.abs(A-epochAnchor(k))<Math.abs(A-epochAnchor(best))) best=k;
  return EP.findIndex(e=>e.key===((EPOCH_PARENT[cur]||cur)===best?cur:best));
}
// Whether a new year brings the epoch nearest it (the picker's "Auto-select epoch"): on unless
// the viewer has turned it off. Off, the epoch shown stays at any year.
let autoEpoch=true;
try{ autoEpoch=localStorage.getItem('autoEpoch')!=='0'; }catch(e){}
// Go to year A on the timeline, changing the epoch when A is in another's span. Within the same
// epoch the month and day stay; into another, the season does (its calendar may differ).
function goToYear(A){
  A=Math.round(Math.max(TIME_MIN, Math.min(TIME_MAX, A)));
  const f=yearFraction()[1], i=autoEpoch?epochIndexAt(A+f):dIdx, [,M,D]=pageDate();
  if(i===dIdx){ setPageDate(A-epochShift(), M, D); return; }
  setEpoch(i, ()=>dateInYear(A-epochShift(EP[i].key), f));
}
// Go to epoch i at its own year (today for today's skies), keeping the season.
function goToEpoch(i){
  const key=EP[i].key;
  if(EPOCH_YEAR[key]==='now' && i===dIdx){ document.getElementById('moonDate').value=localISODate(new Date()); renderDay(); return; }
  if(i===dIdx){ const [,M,D]=pageDate(); setPageDate(epochYear(key), M, D); return; }
  const f=yearFraction()[1];
  setEpoch(i, ()=>dateInYear(epochYear(key), f));
}
// After the date moves (by the picker or a day at a time), auto-select brings the epoch the new
// date belongs to: into an event's sky or back out of it. The date stays the same day on the
// timeline.
let autoChecking=false;
function autoEpochCheck(){
  if(!autoEpoch || autoChecking) return;
  const i=epochIndexAt(eventTime());
  if(i===dIdx) return;
  const [Y,M,D]=pageDate(), Y2=Y+epochShift()-epochShift(EP[i].key);
  autoChecking=true;
  try{ setEpoch(i, ()=>fmtDate(Y2, M, D)); }finally{ autoChecking=false; }
}

/* ---------- the sky's physics through time ---------- */
// The Sun, the Moon and the day, the Sun's place in the Galaxy, and the rates of comets, meteors
// and dust follow the year shown (physTime), whichever epoch's sky is drawn: each is set at the
// main epochs that give it a value, and runs between them along a curve suited to it; events
// (ζ Oph's comet shower, the Ordovician break-up's dust, meteors and ring, the supernovae) add
// their own rise and fall on top. What is drawn from tables made for each epoch (the air's
// colours, the maps and the star lists) is still the epoch's own.
// [year, value] at each main epoch that table gives a value for, and today's (now) if given, in time order.
function epochPoints(table, now){
  const P=MAIN_EPOCHS.filter(k=>table[k]!=null).map(k=>[epochAnchor(k), table[k]]);
  if(now!=null && table.modern==null) P.push([epochAnchor('modern'), now]);
  return P.sort((a, b)=>a[0]-b[0]);
}
// Where year A falls among points P: the point before it, and how far on to the next (0–1),
// held at either end.
function timeBracket(P, A){
  const n=P.length-1;
  if(n<1 || A<=P[0][0]) return [0, 0];
  if(A>=P[n][0]) return [n-1, 1];
  let lo=0, hi=n;
  while(hi-lo>1){ const m=(lo+hi)>>1; if(P[m][0]<=A) lo=m; else hi=m; }
  return [lo, (A-P[lo][0])/(P[lo+1][0]-P[lo][0])];
}
// The value at year A along points P, running linearly in time in the space `to` maps it into.
function alongTime(P, A, to=x=>x, from=x=>x){
  const [i, u]=timeBracket(P, A);
  return u===0?P[i][1]:u===1?P[i+1][1]:from(to(P[i][1])*(1-u)+to(P[i+1][1])*u);
}
// A rate through time from its values at the main epochs (less those in `leave`, an event's) and
// today's 1: geometric between them, as the long declines of the bombardment run.
function rateCurve(table, leave=[]){
  let P=null;
  return A=>alongTime(P=P||epochPoints(Object.fromEntries(Object.entries(table).filter(([k])=>!leave.includes(k))), 1), A, Math.log, Math.exp);
}
// fn of the year shown, worked out once for each year.
function byTime(fn){ let A0=NaN, v; return ()=>{ const A=physTime(); if(A!==A0){ A0=A; v=fn(A); } return v; }; }
// The Sun: its luminosity and temperature at each epoch with a Sun of its own (epochs.py; EP own);
// between them the luminosity grows as the young-Sun law of Gough 1981 has it (1/L linear in
// time), the temperature linearly, and the radius follows from both, as gen_site.py sun_radius.
const SUN_OWN=EP.filter(e=>e.own), SUN_L_PTS=epochPoints(Object.fromEntries(SUN_OWN.map(e=>[e.key, e.sunL]))),
  SUN_T_PTS=epochPoints(Object.fromEntries(SUN_OWN.map(e=>[e.key, e.teff])));
function sunLumAt(A){ return alongTime(SUN_L_PTS, A, x=>1/x, x=>1/x); }
function sunTeffAt(A){ return alongTime(SUN_T_PTS, A); }
const sunLum=byTime(sunLumAt), sunTeff=byTime(sunTeffAt), sunRadiusRel=byTime(A=>Math.sqrt(sunLumAt(A))/(sunTeffAt(A)/5772)**2);
