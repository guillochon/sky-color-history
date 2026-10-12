/* ---------- the time shown: one timeline through all the epochs ---------- */
// The time shown is a year on one timeline, numbered as we number years (year 0 is 1 BC). Ages
// count back from 2000: "66 Ma" is the year 2000 − 66,000,000. Each epoch is a fixed point on the
// timeline: the modern-era skies at their own years, the others at their ages. For now the sky at
// any other time is the nearest fixed point's: each epoch's sky holds from halfway back to the one
// before it to halfway on to the next. Some epochs are alternatives at another's time rather than
// times of their own (the polluted city, the ozone hole, 1815 and 2100 beside today's clean air;
// the thin and very thick hazes beside 2.7 Ga's thick one), and one stays chosen through its main
// epoch's span. Underneath, each epoch keeps its own calendar years (pageDate): the modern-era
// skies number them as we do, the others count from a year 0 of their own at 2000 (calendar.js).
const EPOCH_PARENT={modernpoll:'modern', ozonehole:'modern', volcanic:'modern', y2100:'modern', archean27thin:'archean27', archean27vthick:'archean27'};
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
// Where epoch key sits on the timeline, and the timeline year less the epoch's own year.
function epochAnchor(key){ return key in EPOCH_YEAR?epochYear(key):parseTime(EP.find(e=>e.key===key).age); }
function epochShift(key=EP[dIdx].key){ return key in EPOCH_YEAR?0:epochAnchor(key)-2000; }
function pageTime(){ return pageDate()[0]+epochShift(); }
// The main epochs in time order, and the span of each (shared by its alternatives).
const MAIN_EPOCHS=EP.map(e=>e.key).filter(k=>!(k in EPOCH_PARENT)).sort((a, b)=>epochAnchor(a)-epochAnchor(b));
function epochSpan(key){
  const k=EPOCH_PARENT[key]||key, i=MAIN_EPOCHS.indexOf(k), A=epochAnchor(k);
  return [i>0?(A+epochAnchor(MAIN_EPOCHS[i-1]))/2:TIME_MIN, i<MAIN_EPOCHS.length-1?(A+epochAnchor(MAIN_EPOCHS[i+1]))/2:TIME_MAX];
}
// The epoch shown at year A: the nearest main epoch, or the one shown now if it is that one's alternative.
function epochIndexAt(A, cur=EP[dIdx].key){
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
  const i=autoEpoch?epochIndexAt(A):dIdx, [,M,D]=pageDate();
  if(i===dIdx){ setPageDate(A-epochShift(), M, D); return; }
  const f=yearFraction()[1];
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

/* ---------- the sky's physics through time ---------- */
// The Sun, the Moon and the day, the Sun's place in the Galaxy, and the rates of comets, meteors
// and dust follow the year shown (physTime), whichever epoch's sky is drawn: each is set at the
// epochs that give it a value, and runs between them along a curve suited to it. An alternative
// epoch takes its main epoch's values. An event (ζ Oph's comet shower, the Ordovician break-up's
// dust and meteors) keeps its value through its epoch's span until events have durations of
// their own. What is drawn from tables made for each epoch (the air's colours, the maps and the
// star lists) is still the epoch's own.
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
// A rate through time from its values at the epochs and today's 1: geometric between them (the
// long declines of the bombardment), and an event epoch's own value through its span.
function rateCurve(table, events=[]){
  let P=null;
  return A=>{
    for(const k of events){ const [lo, hi]=epochSpan(k); if(A>=lo && A<hi) return table[k]; }
    P=P||epochPoints(Object.fromEntries(Object.entries(table).filter(([k])=>!events.includes(k))), 1);
    return alongTime(P, A, Math.log, Math.exp);
  };
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
