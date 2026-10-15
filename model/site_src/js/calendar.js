/* ---------- the epoch's calendar, and the Sun through the year ---------- */
// The year is the same length in seconds in every epoch: the Earth's orbit is set by the Sun's
// mass, and the planets do not drift. (The Sun has lost well under 1% of its mass to its wind
// since the Archean, which would make the year then at most 2% shorter; that is left out.) A
// year of shorter days holds more of them: 368 at 66 Ma, 562 at 2.7 Ga, 1,486 in the Early Hadean.
// Epochs with 24-hour days keep the Gregorian calendar from year −3000 to 7000, so their dates and
// eclipses are real; there its solstices stay within a few days of today's dates. Beyond, the
// Gregorian year (365.2425 days) would drift from the seasons by a day every 3,200 years,
// so the months keep their Gregorian lengths but the leap days fall where they keep step with the
// seasons (365.24219 days a year on average), going on from where the Gregorian years leave off.
// The other epochs count twelve equal months of 30 to 124 days; year lengths alternate in the
// same way, and year 2000 starts where the Gregorian 2000 does.
// The tropical year (365.24219 days) exactly as the Sun's mean longitude runs in sunEquatorial, so
// the seasons keep their dates over billions of years.
const TROPICAL_YEAR=360/(0.9856002585+4.70935e-5);
const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_DAYS=[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const GREG_LO=-3000, GREG_HI=7000;
function pageYear(){ const m=/^(-?\d+)-/.exec(document.getElementById('moonDate').value||''); return m?+m[1]:new Date().getFullYear(); }
// The year on the timeline that the sky's physics is worked out for (epoch_time.js): the page
// year's, read straight from the date so the calendar can ask it for the day's length.
let timeMemo=['', -1, 0];
function physTime(){
  const v=document.getElementById('moonDate').value;
  if(v!==timeMemo[0] || dIdx!==timeMemo[1]) timeMemo=[v, dIdx, pageYear()+epochShift()];
  return timeMemo[2];
}
function gregorian(Y=pageYear()){ return dayHours()===24 && Y>=GREG_LO && Y<=GREG_HI; }
function yearDays(){ return TROPICAL_YEAR*24/dayHours(); }
// Days near 24 hours (365 to 366 of them a year) keep the Gregorian months and the week.
function gregMonths(){ const n=yearDays(); return n>=365 && n<366; }
// Day index (days of the epoch since 2000 Jan 1) where year Y starts, and its length.
function gregDays(Y){ return Math.round(utcDay(Y, 1, 1)-utcDay(2000, 1, 1)); }
function yearStart(Y){
  if(dayHours()!==24) return Math.floor((Y-2000)*yearDays());
  if(Y>=GREG_LO && Y<=GREG_HI+1) return gregDays(Y);
  const b=Y>GREG_HI?GREG_HI+1:GREG_LO;
  return gregDays(b)+Math.floor((Y-b)*TROPICAL_YEAR+0.5);
}
function yearLen(Y){ return yearStart(Y+1)-yearStart(Y); }
// Day within the year where month m (1–12) starts, and its length.
function monthStart(Y, m){
  if(!gregMonths()) return Math.round((m-1)*yearLen(Y)/12);
  let s=0; for(let i=1;i<m;i++) s+=monthLen(Y, i);
  return s;
}
function monthLen(Y, m){
  if(gregMonths()) return MONTH_DAYS[m-1]+(m===2?yearLen(Y)-365:0);
  return (m===12?yearLen(Y):monthStart(Y, m+1))-monthStart(Y, m);
}
// Day of the week (0 Sunday) where there are weeks: 2000 Jan 1 was a Saturday.
function weekday(Y, M, D){ return ((epochDayIndex(Y, M, D)+6)%7+7)%7; }
function fmtDate(Y, M, D){ const p=n=>String(n).padStart(2,'0'); return (Y<0?'-':'')+String(Math.abs(Y)).padStart(4,'0')+'-'+p(M)+'-'+p(D); }
// The page date as [Y, M, D], with the month and day held to this epoch's calendar.
function parseDate(raw){
  const p=/^(-?\d+)-(\d+)-(\d+)$/.exec(raw||'')?.slice(1).map(Number);
  if(!p){ const t=new Date(); return [t.getFullYear(), t.getMonth()+1, t.getDate()]; }
  const Y=Math.round(p[0]), M=Math.max(1, Math.min(12, Math.round(p[1])));
  return [Y, M, Math.max(1, Math.min(monthLen(Y, M), Math.round(p[2])))];
}
function pageDate(){ return parseDate(document.getElementById('moonDate').value); }
function epochDayIndex(Y, M, D){ return yearStart(Y)+monthStart(Y, M)+D-1; }
function epochDateOf(k){
  let Y=2000+Math.floor(k/yearDays());
  while(yearStart(Y)>k) Y--;
  while(yearStart(Y+1)<=k) Y++;
  const off=k-yearStart(Y); let M=12;
  while(M>1 && monthStart(Y, M)>off) M--;
  return [Y, M, off-monthStart(Y, M)+1];
}
function shiftMoonDate(days){
  const el=document.getElementById('moonDate'), [Y,M,D]=pageDate();
  el.value=fmtDate(...epochDateOf(epochDayIndex(Y, M, D)+days));
  autoEpochCheck();
}
// The instant shown, as a day number of today's 24-hour days for the ephemerides. In the other
// calendars time runs from local midnight starting 2000 Jan 1, on standard time.
const DN_2000=dayNumber(2000,1,1,0), TZ_STD=-new Date(2000,0,1).getTimezoneOffset()/60;
function astroDay(){
  if(gregorian()){ const ins=instantUT(); return dayNumber(ins.y, ins.m, ins.D, ins.ut); }
  const [Y,M,D]=pageDate();
  return DN_2000-TZ_STD/24+(epochDayIndex(Y, M, D)+minutes/DAYMIN)*dayHours()/24;
}
// The page date and clock at day number d.
function pageAt(d){
  if(gregorian(2000+Math.floor((d-DN_2000)/365.2425))){ const t=new Date((d-DN_UNIX)*86400000); return {date:localISODate(t), min:t.getHours()*60+t.getMinutes()+t.getSeconds()/60+t.getMilliseconds()/60000}; }
  const E=(d-DN_2000+TZ_STD/24)*24/dayHours(), k=Math.floor(E);
  return {date:fmtDate(...epochDateOf(k)), min:(E-k)*DAYMIN};
}
function pageMs(){ return (astroDay()-DN_UNIX)*86400000; }
// Moving between calendars keeps the season: the same year and fraction of it.
function yearFraction(){
  const [Y,M,D]=pageDate();
  return [Y, (monthStart(Y, M)+D-1)/yearLen(Y)];
}
function dateAtFraction(Y, f){
  return fmtDate(...epochDateOf(yearStart(Y)+Math.min(yearLen(Y)-1, Math.round(f*yearLen(Y)))));
}
// Earth's axis: long-term precession (Vondrák, Capitaine & Wallace 2011, A&A 534, A22; as in
// ERFA's eraLtp), good to a few arcseconds over a thousand years and to a degree or so over
// ±200,000 years. The poles of the ecliptic (P_A, Q_A) and of the equator (X_A, Y_A) are
// polynomials in centuries since J2000 plus periodic terms (period in centuries, then the cosine
// and sine amplitudes, arcseconds). Each sky's year 0 has today's axis, and the years either side
// of it turn and tilt it as they have around today: the obliquity runs between about 22° and 25°.
// Beyond ±200,000 years the series no longer holds, and the axis goes on from where it left off:
// the equator's pole turning about the ecliptic's (held where the series leaves it), and the tilt
// rocking between 22.1° and 24.5° every 41,040 years, joined to the series' tilt and its trend
// there. It turns at today's 50.29″ a year scaled to the year on the timeline (precScale).
const LTP_PQ=[[5851.607687, -0.1189000, -0.00028913, 0.000000101], [-1600.886300, 1.1689818, -0.00000020, -0.000000437]];
const LTP_PQ_PER=[[708.15, -5486.751211, -684.661560, 667.666730, -5523.863691], [2309.00, -17.127623, 2446.283880, -2354.886252, -549.747450],
  [1620.00, -617.517403, 399.671049, -428.152441, -310.998056], [492.20, 413.442940, -356.652376, 376.202861, 421.535876],
  [1183.00, 78.614193, -186.387003, 184.778874, -36.776172], [622.00, -180.732815, -316.800070, 335.321713, -145.278396],
  [882.00, -87.676083, 198.296701, -185.138669, -34.744450], [547.00, 46.140315, 101.135679, -120.972830, 22.885731]];
const LTP_XY=[[5453.282155, 0.4252841, -0.00037173, -0.000000152], [-73750.930350, -0.7675452, -0.00018725, 0.000000231]];
const LTP_XY_PER=[[256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853], [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.20, 2600.009459, 1251.136893, 1251.296102, -2219.534038], [241.45, 2755.175630, -1102.212834, -1257.950837, -2523.969396],
  [2309.00, -167.659835, -2660.664980, -2966.799730, 247.850422], [492.20, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.10, 44.769698, 153.167220, 131.600209, -1393.124055], [288.90, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.10, -819.415595, 499.754645, 584.522874, 749.045012], [1610.00, -538.071099, -145.188210, -89.756563, 444.704518],
  [620.00, -189.793622, 558.116553, 524.429630, 235.934465], [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.30, 179.516345, -165.405086, -210.157124, -171.330180], [1200.00, -9.814756, 9.344131, -44.919798, -22.899655]];
function ltpPair(t, pol, per){
  let u=0, v=0;
  for(const [P, cu, cv, su, sv] of per){ const a=2*Math.PI*t/P, c=Math.cos(a), s=Math.sin(a); u+=c*cu+s*su; v+=c*cv+s*sv; }
  for(let i=0, w=1; i<4; i++, w*=t){ u+=pol[0][i]*w; v+=pol[1][i]*w; }
  const arc=Math.PI/180/3600; return [u*arc, v*arc];
}
// The poles of the ecliptic and of the equator of year, in J2000 coordinates, from the series.
function ltpPoles(year){
  const t=(year-2000)/100, [p, q]=ltpPair(t, LTP_PQ, LTP_PQ_PER), [x, y]=ltpPair(t, LTP_XY, LTP_XY_PER);
  const e0=84381.406*Math.PI/180/3600, wp=Math.sqrt(Math.max(0, 1-p*p-q*q));
  return {ecl:[p, -q*Math.cos(e0)-wp*Math.sin(e0), -q*Math.sin(e0)+wp*Math.cos(e0)], equ:[x, y, Math.sqrt(Math.max(0, 1-x*x-y*y))]};
}
const vdot3=(a, b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2], vcross3=(a, b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const LTP_SPAN=200000, OBL_MEAN=23.3, OBL_AMP=1.2, OBL_PERIOD=41040, PREC_RATE=50.29/3600*Math.PI/180;
// Where the series ends (side ±1): its poles, the tilt's phase in the rocking that goes on from
// there, and the two directions across the ecliptic's pole that the equator's turns in.
const LTP_EDGE={};
function ltpEdge(side){
  if(LTP_EDGE[side]) return LTP_EDGE[side];
  const b=2000+side*LTP_SPAN, {ecl, equ}=ltpPoles(b), tilt=y=>{ const P=ltpPoles(y); return Math.acos(vdot3(P.ecl, P.equ)); };
  const eb=Math.acos(vdot3(ecl, equ))*180/Math.PI, rising=tilt(b+50)>tilt(b-50);
  const ph=Math.acos(Math.max(-1, Math.min(1, (eb-OBL_MEAN)/OBL_AMP)))*(rising?-1:1);
  const k=vdot3(equ, ecl), u=equ.map((c, i)=>c-k*ecl[i]), m=Math.hypot(...u), e1=u.map(c=>c/m);
  return LTP_EDGE[side]={b, ecl, ph, e1, e2:vcross3(ecl, e1)};
}
// The precession rate at year A over today's. The pull of the Sun and the Moon on the Earth's
// equatorial bulge turns the axis at a rate that goes as the bulge (the flattening, as the spin
// squared) over the spin, times the pulls: the Moon's, 2.17 times the Sun's today, goes as its
// distance cubed, and is gone when the Moon lies in the equator's plane or is not there.
function precScale(A){
  const moon=noMoon()||moonInEquatorAt(A)?0:2.17*Math.pow(MOON_RE_NOW/moonDistAt(A), 3);
  return 24/dayHoursAt(A)*(1+moon)/3.17;
}
// The rotation from J2000 to the mean equator and equinox of year (the epoch's own year): its
// rows are the equinox, the point 90° east of it, and the pole, in J2000 coordinates; eps is the
// obliquity (degrees).
const LTP_CACHE=new Map();
function precessionMatrix(year){
  const inSeries=Math.abs(year-2000)<=LTP_SPAN, id=inSeries?year:year+'|'+dIdx;
  let R=LTP_CACHE.get(id);
  if(R) return R;
  let ecl, equ;
  if(inSeries) ({ecl, equ}=ltpPoles(year));
  else {
    const E=ltpEdge(Math.sign(year-2000)), dt=year-E.b, th=-PREC_RATE*precScale(year+epochShift())*dt;
    const eps=(OBL_MEAN+OBL_AMP*Math.cos(2*Math.PI*dt/OBL_PERIOD+E.ph))*Math.PI/180;
    ecl=E.ecl; equ=ecl.map((c, i)=>Math.cos(eps)*c+Math.sin(eps)*(Math.cos(th)*E.e1[i]+Math.sin(th)*E.e2[i]));
  }
  const n=vcross3(equ, ecl), m=Math.hypot(...n), eqx=n.map(c=>c/m);
  R=[eqx, vcross3(equ, eqx), equ];
  R.eps=Math.acos(vdot3(equ, ecl))*180/Math.PI;
  if(LTP_CACHE.size>64) LTP_CACHE.clear();
  LTP_CACHE.set(id, R); return R;
}
// The obliquity at day number d (default: the instant shown), to the nearest year.
function obliquity(d=astroDay()){ return precessionMatrix(Math.round(2000+(d-DN_2000)/TROPICAL_YEAR)).eps; }
// The Sun for day number d (Schlyter's elements, with the equation of center): right ascension,
// declination, ecliptic longitude, mean anomaly, and distance in AU, in the equator and ecliptic
// of date (below).
function sunEquatorial(d){
  const Ms=rev(356.0470+0.9856002585*d), lam=rev(282.9404+4.70935e-5*d+Ms+1.9148*sind(Ms)+0.0200*sind(2*Ms)), eps=obliquity(d);
  return {RA:rev(Math.atan2(cosd(eps)*sind(lam), cosd(lam))*180/Math.PI), Dec:Math.asin(sind(eps)*sind(lam))*180/Math.PI,
    lam, Ms, au:1.00014-0.01671*cosd(Ms)-0.00014*cosd(2*Ms)};
}
// The clock is sundial time: the Sun crosses the meridian at 12:00. Local sidereal time follows
// from the Sun's right ascension and its hour angle.
function localSidereal(){ return rev(sunEquatorial(astroDay()).RA+(minutes/60-12)*15); }
// Each epoch's own years. The modern-era skies count them as we do, and move to their own year
// when chosen (today's for the clean and polluted skies, 1990 for the ozone hole, 1816, the year
// without a summer under Tambora's veil, and 2100).
// The others count from a year 0 of their own, 2000 underneath (where their calendars start, with
// today's Moon and eclipses for those with 24-hour days), at the epoch's age on the timeline
// (epoch_time.js), which is what the page shows.
const EPOCH_YEAR={modern:'now', modernpoll:'now', ozonehole:1990, y1900:1900, volcanic:1816, y2100:2100};
function yearZero(key=EP[dIdx].key){ return key in EPOCH_YEAR?0:2000; }
function epochYear(key){ const y=EPOCH_YEAR[key]; return y===undefined?2000:y==='now'?new Date().getFullYear():y; }
function fmtYear(y){ const a=Math.abs(y); return (y<0?'−':'')+(a>=10000?a.toLocaleString('en-US'):String(a)); }
// The year to four figures (epoch_time.js fmtTimeRound); the date picker gives it in full.
function dateLabel(){ const [,M,D]=pageDate(); return `${MONTH_NAMES[M-1]} ${D}, ${fmtTimeRound(pageTime())}`; }
// A new epoch keeps the season. It keeps the year on the timeline too when that year shows it
// (the polluted city at today's year, an event's background just after the event), and otherwise
// takes its own year: one chosen from the menu, a tick or the arrow keys is shown at its own time,
// whatever year the last one had reached, so the next day does not take it somewhere else.
function epochDate(prevKey, yf){
  const A=yf[0]+epochShift(prevKey), key=EP[dIdx].key;
  return dateInYear(epochIndexAt(A+yf[1], key)===dIdx?A-epochShift(key):epochYear(key), yf[1]);
}
// The date at fraction f through year Y of the epoch shown, in that year's calendar: the page is
// moved into the year first, since its day length (and so its months) goes with the year.
function dateInYear(Y, f){ document.getElementById('moonDate').value=fmtDate(Y, 1, 1); return dateAtFraction(Y, f); }
// The date picker: a button with the date, opening a dialog with the year on the timeline (typed
// as a year or an age, or stepped by a year up to a billion), a bookmark for each epoch, the
// twelve months and the month's days, as many as this epoch's calendar gives it; laid out in
// weeks for the 24-hour days, in rows of ten for the others, which have no weeks.
const dateBtn=document.getElementById('dateBtn'), datePop=document.getElementById('datePop'), dpYear=document.getElementById('dpYear'),
  dpMonths=document.getElementById('dpMonths'), dpDays=document.getElementById('dpDays'), dpNote=document.getElementById('dpNote'), dpBack=document.getElementById('dpBack'),
  dpMonthSel=document.getElementById('dpMonthSel'), dpDaySel=document.getElementById('dpDaySel'), datePopHome=datePop.parentNode,
  dpStep=document.getElementById('dpStep'), dpEpochs=document.getElementById('dpEpochs'), dpEpochSel=document.getElementById('dpEpochSel'),
  dpAuto=document.getElementById('dpAuto');
MONTH_NAMES.forEach((n, i)=>{ const b=document.createElement('button'); b.type='button'; b.dataset.m=String(i+1); b.textContent=n; dpMonths.appendChild(b); dpMonthSel.add(new Option(n, String(i+1))); });
const DP_STEPS=[[1, '1 year'], [10, '10 years'], [100, '100 years'], [1e3, '1,000 years'], [1e4, '10,000 years'], [1e5, '100,000 years'],
  [1e6, '1 million years'], [1e7, '10 million years'], [1e8, '100 million years'], [1e9, '1 billion years']];
DP_STEPS.forEach(([n, label])=>dpStep.add(new Option(label, String(n))));
function labelSteps(){ const t=dpStep.selectedOptions[0].text; document.getElementById('dpPrev').setAttribute('aria-label', `Back ${t}`); document.getElementById('dpNext').setAttribute('aria-label', `On ${t}`); }
labelSteps(); dpStep.addEventListener('change', labelSteps);
EP.forEach((ep, i)=>{
  const b=document.createElement('button'); b.type='button'; b.dataset.e=String(i); b.title=ep.name;
  b.innerHTML='<b></b><span></span>'; b.querySelector('b').textContent=ep.age; b.querySelector('span').textContent=ep.short;
  dpEpochs.appendChild(b); dpEpochSel.add(new Option(`${ep.age} · ${ep.short}`, String(i)));
});
// The month's length is taken in the new year's calendar, so the page goes to its first day first.
function setPageDate(Y, M, D){
  const el=document.getElementById('moonDate');
  el.value=fmtDate(Y, M, 1); el.value=fmtDate(Y, M, Math.max(1, Math.min(D, monthLen(Y, M)))); autoEpochCheck(); renderDay();
}
let datePopDrawn='';
// The calendar's small icons: each day's weather where the eye starts (clouds.js dayWeather), in
// its top-left corner, and the Moon's phase at noon in its bottom-left.
const DP_WX={
  clear:'<circle cx="8" cy="8" r="3.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  partly:'<circle cx="6" cy="6" r="2.6"/><path d="M6 1v1.4M1 6h1.4M2.5 2.5l1 1M9.5 2.5l-1 1"/><path class="f" d="M5.5 14h7a2.6 2.6 0 0 0 0-5.2 3.6 3.6 0 0 0-6.9 1A2.1 2.1 0 0 0 5.5 14z"/>',
  cloudy:'<path class="f" d="M4.5 13h8a3 3 0 0 0 0-6 4 4 0 0 0-7.7 1.2A2.4 2.4 0 0 0 4.5 13z"/>',
  rain:'<path class="f" d="M4.5 9.5h8a2.8 2.8 0 0 0 0-5.6 3.8 3.8 0 0 0-7.3 1.1A2.25 2.25 0 0 0 4.5 9.5z"/><path d="M5.5 11.5l-1 3M8.5 11.5l-1 3M11.5 11.5l-1 3"/>',
  snow:'<path class="f" d="M4.5 9.5h8a2.8 2.8 0 0 0 0-5.6 3.8 3.8 0 0 0-7.3 1.1A2.25 2.25 0 0 0 4.5 9.5z"/><circle class="f" cx="5" cy="12.5" r=".9"/><circle class="f" cx="8.5" cy="14" r=".9"/><circle class="f" cx="12" cy="12.5" r=".9"/>'
};
const DP_WX_NAME={clear:'clear', partly:'partly cloudy', cloudy:'cloudy', rain:'rain', snow:'snow'};
// The Moon lit at phase x (0 new, 0.5 full), waxing on the right as seen from the north and on the
// left from the south.
function dpMoonSVG(x){
  const c=Math.cos(2*Math.PI*x), r=6, ex=Math.abs(c)*r, wax=x<0.5;
  // The lit limb is a half circle on the sunward side; the terminator an ellipse of half-width ex.
  const limb=wax?1:0, term=(x<0.25||x>=0.75)?(wax?0:1):(wax?1:0);
  const d=`M8 2A${r} ${r} 0 0 ${limb} 8 14A${ex.toFixed(2)} ${r} 0 0 ${term} 8 2z`;
  const flip=(LATDEG[dLat]??45)<0?' transform="matrix(-1 0 0 1 16 0)"':'';
  return `<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="dk" cx="8" cy="8" r="${r}"/><path class="f" d="${d}"${flip}/></svg>`;
}
function dpPhaseName(x){
  const n=['new Moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full Moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  return n[Math.round(x*8)%8];
}
function drawDatePop(){
  const [Y,M,D]=pageDate(), key=EP[dIdx].key, z=yearZero(), greg=gregorian(Y), weeks=gregMonths(), id=[key, Y, M, D, dLat].join('|');
  dpAuto.checked=autoEpoch;
  if(document.activeElement!==dpYear){ dpYear.value=fmtTime(pageTime()); dpYear.removeAttribute('aria-invalid'); }
  if(id===datePopDrawn) return;
  datePopDrawn=id;
  dpEpochs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.e===dIdx)));
  dpEpochSel.value=String(dIdx);
  dpMonths.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.m===M)));
  let html='';
  if(weeks){
    for(const w of ['Su','Mo','Tu','We','Th','Fr','Sa']) html+=`<span class="dp-wd" aria-hidden="true">${w}</span>`;
    for(let i=weekday(Y, M, 1); i>0; i--) html+='<span></span>';
  }
  // A day with a nova, supernova or eruption (transients.js) has a star in its corner, in the color of its kind.
  const evDays=transientDays(Y, M), evLabel=d=>evDays.get(d).map(ev=>ev.name).join(', ');
  // Noon of day d as a day number, from the page's own instant.
  const k0=epochDayIndex(Y, M, D), dNoon=d=>astroDay()+(epochDayIndex(Y, M, d)-k0+(DAYMIN/2-minutes)/DAYMIN)*dayHours()/24;
  const moon=!noMoon();
  for(let d=1, n=monthLen(Y, M); d<=n; d++){
    const ev=evDays.get(d), wx=dayWeather(key, Y, M, d), ph=moon?moonPhaseAt(dNoon(d)):null;
    const mm=v=>v<10?v.toFixed(1):Math.round(v);
    const said=[DP_WX_NAME[wx.kind]+(wx.kind==='rain'?' '+mm(wx.rain)+' mm':wx.kind==='snow'?' '+mm(wx.snow)+' mm':''), ph===null?'':dpPhaseName(ph), ev?evLabel(d):''].filter(Boolean).join(', ');
    const icons=`<i class="dp-wx dp-wx-${wx.kind}" aria-hidden="true"><svg viewBox="0 0 16 16">${DP_WX[wx.kind]}</svg></i>`+(ph===null?'':`<i class="dp-moon" aria-hidden="true">${dpMoonSVG(ph)}</i>`)
      +(ev?`<i class="dp-ev" style="color:${TR_TYPES[ev[0].type].color}" aria-hidden="true">★</i>`:'');
    html+=`<button type="button" data-d="${d}" aria-pressed="${d===D}" title="${said}" aria-label="${d}, ${said}">${d}${icons}</button>`;
  }
  dpDays.className='dp-days '+(weeks?'dp-week':'dp-ten'); dpDays.innerHTML=html;
  dpMonthSel.value=String(M);
  const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  dpDaySel.replaceChildren(...Array.from({length:monthLen(Y, M)}, (_, i)=>new Option((weeks?`${i+1} ${WD[weekday(Y, M, i+1)]}`:String(i+1))+(evDays.has(i+1)?' ★':''), String(i+1))));
  dpDaySel.value=String(D);
  const lens=MONTH_NAMES.map((_, i)=>monthLen(Y, i+1)), lo=Math.min(...lens), hi=Math.max(...lens);
  const sh=epochShift(key), [from, to]=epochSpan(key, pageTime()), ep=EP[dIdx];
  dpNote.textContent=(greg?(z?'Today’s 24-hour days and calendar.':'The Gregorian calendar.')
    :dayHours()===24?`Gregorian months, with leap days set to keep step with the seasons outside ${fmtTime(GREG_LO+sh)} to ${fmtTime(GREG_HI+sh)}: ${yearLen(Y)} days this year.`
    :weeks?`${dayHoursLabel()}-hour days: Gregorian months, with leap days set to keep step with the seasons: ${yearLen(Y)} days this year.`
    :`${dayHoursLabel()}-hour days: twelve months of ${lo===hi?lo:lo+'–'+hi} days, ${yearLen(Y)} this year.`)
    +(autoEpoch?(EVENT_KEYS.has(key)?` This sky (${ep.short}, ${ep.age}) is an event: it holds for ${fmtDuration(to-from)} from ${fmtTime(Math.floor(from))}.`
      :` This sky (${ep.short}, ${ep.age}) holds from ${fmtTime(from)} to ${fmtTime(to)}.`)
      :` This sky (${ep.short}, ${ep.age}) stays at every year while auto-select is off; the Sun, the Moon and the day follow the year.`)
    +(evDays.has(D)?' '+transientNote(Y, M, D):'');
  dpBack.textContent=EPOCH_YEAR[key]==='now'?'Today':`Back to ${ep.age}`;
}
function syncDateUI(){ dateBtn.textContent=dateLabel(); if(datePop.open) drawDatePop(); }
// In VR the dialog goes inside the view, the full-screen element, and on a touch screen it is the
// compact one, with drop-downs for the month and day. The look lets go of the pointer while it is
// open (vr_input.js), and takes it back when it closes.
function openDatePop(){
  if(datePop.open) return;
  const host=vrOn?document.getElementById('vr'):datePopHome;
  if(datePop.parentNode!==host) host.append(datePop);
  const compact=vrOn&&vrTouch;
  datePop.classList.toggle('compact', compact);
  if(vrOn) vrHeld.clear();
  datePopDrawn=''; drawDatePop(); datePop.showModal();
  if(vrOn&&document.pointerLockElement) document.exitPointerLock();
  if(!compact) (dpDays.querySelector('[aria-pressed="true"]')||dpYear).focus();
}
dateBtn.addEventListener('click', openDatePop);
datePop.addEventListener('close', ()=>{
  if(!vrOn) return;
  vrModalShut=performance.now();
  document.getElementById('vr').focus();
  if(!vrInspect){ vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); }
});
// The walk-around view's own pointer and wheel handlers leave the dialog alone.
datePop.addEventListener('pointerdown', e=>{ if(vrOn) e.stopPropagation(); });
datePop.addEventListener('wheel', e=>{ if(vrOn) e.stopPropagation(); });
dpMonthSel.addEventListener('change', ()=>{ const [Y,,D]=pageDate(); setPageDate(Y, +dpMonthSel.value, D); });
dpDaySel.addEventListener('change', ()=>{ const [Y,M]=pageDate(); setPageDate(Y, M, +dpDaySel.value); });
// A click on the dimmed page outside the dialog closes it.
datePop.addEventListener('click', e=>{ if(e.target===datePop) datePop.close(); });
dpMonths.addEventListener('click', e=>{ const b=e.target.closest('[data-m]'); if(!b) return; const [Y,,D]=pageDate(); setPageDate(Y, +b.dataset.m, D); });
dpDays.addEventListener('click', e=>{ const b=e.target.closest('[data-d]'); if(!b) return; const [Y,M]=pageDate(); setPageDate(Y, M, +b.dataset.d); dpDays.querySelector('[aria-pressed="true"]')?.focus(); });
// The year is checked as it is typed and taken on Enter or on leaving the field.
function typedTime(){ const A=parseTime(dpYear.value); return A!==null && A>=TIME_MIN && A<=TIME_MAX?A:null; }
dpYear.addEventListener('input', ()=>{ if(typedTime()===null) dpYear.setAttribute('aria-invalid', 'true'); else dpYear.removeAttribute('aria-invalid'); });
function takeTypedTime(){ const A=typedTime(); if(A!==null && A!==pageTime()) goToYear(A); }
dpYear.addEventListener('change', takeTypedTime);
dpYear.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); takeTypedTime(); dpYear.value=fmtTime(pageTime()); dpYear.removeAttribute('aria-invalid'); } });
for(const [id, sign] of [['dpPrev', -1], ['dpNext', 1]]) document.getElementById(id).addEventListener('click', ()=>goToYear(pageTime()+sign*(+dpStep.value)));
dpEpochs.addEventListener('click', e=>{ const b=e.target.closest('[data-e]'); if(b) goToEpoch(+b.dataset.e); });
dpEpochSel.addEventListener('change', ()=>goToEpoch(+dpEpochSel.value));
dpBack.addEventListener('click', ()=>goToEpoch(dIdx));
// Turned on, it brings the epoch nearest the year shown at once.
dpAuto.addEventListener('change', ()=>{
  autoEpoch=dpAuto.checked;
  try{ localStorage.setItem('autoEpoch', autoEpoch?'1':'0'); }catch(e){}
  if(autoEpoch) goToYear(pageTime());
  datePopDrawn=''; drawDatePop();
});
document.getElementById('dpDone').addEventListener('click', ()=>datePop.close());
// y, which opened it, closes it (and goes no further, or the page's y would open it again), and so
// does Enter, but in the year box Enter takes the year typed.
datePop.addEventListener('keydown', e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat) return;
  const typing=e.target===dpYear;
  if((e.key==='Enter'&&!typing)||(!typing&&e.key.toLowerCase()==='y')){ e.preventDefault(); e.stopPropagation(); datePop.close(); }
});
