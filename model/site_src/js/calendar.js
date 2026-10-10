/* ---------- the epoch's calendar, and the Sun through the year ---------- */
// The year is the same length in seconds in every epoch: the Earth's orbit is set by the Sun's
// mass, and the planets do not drift. (The Sun has lost well under 1% of its mass to its wind
// since the Archean, which would make the year then at most 2% shorter; that is left out.) A
// year of shorter days holds more of them: 368 at 66 Ma, 562 at 2.7 Ga, 713 in the Early Hadean.
// Epochs with 24-hour days keep the Gregorian calendar, so their dates and eclipses are real.
// The others count twelve equal months of 30 to 60 days; year lengths alternate so the calendar
// keeps step with the seasons, and year 2000 starts where the Gregorian 2000 does.
const TROPICAL_YEAR=365.24219;
const MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function gregorian(){ return dayHours()===24; }
function yearDays(){ return TROPICAL_YEAR*24/dayHours(); }
// Day index (days of the epoch since 2000 Jan 1) where year Y starts, and its length.
function yearStart(Y){ return Math.floor((Y-2000)*yearDays()); }
function yearLen(Y){ return yearStart(Y+1)-yearStart(Y); }
// Day within the year where month m (1–12) starts, and its length.
function monthStart(Y, m){ return Math.round((m-1)*yearLen(Y)/12); }
function monthLen(Y, m){
  if(gregorian()) return localDate(Y, m, 0).getDate();
  return (m===12?yearLen(Y):monthStart(Y, m+1))-monthStart(Y, m);
}
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
  el.value=gregorian() ? localISODate(localDate(Y, M-1, D+days)) : fmtDate(...epochDateOf(epochDayIndex(Y, M, D)+days));
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
  if(gregorian()){ const t=new Date((d-DN_UNIX)*86400000); return {date:localISODate(t), min:t.getHours()*60+t.getMinutes()+t.getSeconds()/60+t.getMilliseconds()/60000}; }
  const E=(d-DN_2000+TZ_STD/24)*24/dayHours(), k=Math.floor(E);
  return {date:fmtDate(...epochDateOf(k)), min:(E-k)*DAYMIN};
}
function pageMs(){ return (astroDay()-DN_UNIX)*86400000; }
// Moving between calendars keeps the season: the same year and fraction of it.
function yearFraction(){
  const [Y,M,D]=pageDate();
  if(gregorian()){ const a=dayNumber(Y,1,1,0); return [Y, (dayNumber(Y,M,D,0)-a)/(dayNumber(Y+1,1,1,0)-a)]; }
  return [Y, (monthStart(Y, M)+D-1)/yearLen(Y)];
}
function dateAtFraction(Y, f){
  if(gregorian()){ const a=dayNumber(Y,1,1,0), n=dayNumber(Y+1,1,1,0)-a; return localISODate(localDate(Y, 0, 1+Math.min(n-1, Math.round(f*n)))); }
  return fmtDate(...epochDateOf(yearStart(Y)+Math.min(yearLen(Y)-1, Math.round(f*yearLen(Y)))));
}
// The Sun for day number d (Schlyter's elements, with the equation of centre): right ascension,
// declination, ecliptic longitude, mean anomaly, and distance in AU. The axis keeps today's tilt
// in every epoch; the Moon has held it between about 22° and 24.5°.
const OBLIQUITY=23.44;
function sunEquatorial(d){
  const Ms=rev(356.0470+0.9856002585*d), lam=rev(282.9404+4.70935e-5*d+Ms+1.9148*sind(Ms)+0.0200*sind(2*Ms));
  return {RA:rev(Math.atan2(cosd(OBLIQUITY)*sind(lam), cosd(lam))*180/Math.PI), Dec:Math.asin(sind(OBLIQUITY)*sind(lam))*180/Math.PI,
    lam, Ms, au:1.00014-0.01671*cosd(Ms)-0.00014*cosd(2*Ms)};
}
// The clock is sundial time: the Sun crosses the meridian at 12:00. Local sidereal time follows
// from the Sun's right ascension and its hour angle.
function localSidereal(){ return rev(sunEquatorial(astroDay()).RA+(minutes/60-12)*15); }
// The years. The modern-era skies count them as we do, and move to their own year when chosen
// (today's for the clean and polluted skies, 1990 for the ozone hole, 1815, 2100). The others
// count from a year 0 of their own, 2000 underneath (where their calendars start, with today's
// Moon and eclipses for those with 24-hour days), and years before it are negative.
const EPOCH_YEAR={modern:'now', modernpoll:'now', ozonehole:1990, volcanic:1815, y2100:2100};
const YEAR_SPAN=250000;   // years either side of the epoch's year 0, within the reach of Date
function yearZero(key=EP[dIdx].key){ return key in EPOCH_YEAR?0:2000; }
function epochYear(key){ const y=EPOCH_YEAR[key]; return y===undefined?2000:y==='now'?new Date().getFullYear():y; }
function fmtYear(y){ const a=Math.abs(y); return (y<0?'−':'')+(a>=10000?a.toLocaleString('en-US'):String(a)); }
function dateLabel(){ const [Y,M,D]=pageDate(), z=yearZero(); return `${MONTH_NAMES[M-1]} ${D}, ${z?'year ':''}${fmtYear(Y-z)}`; }
// A new epoch keeps the season, and takes its own year when that differs from the last one's.
function epochDate(prevKey, yf){
  const Yp=epochYear(prevKey), Yn=epochYear(EP[dIdx].key);
  return dateAtFraction(Yn!==Yp?Yn:yf[0], yf[1]);
}
// The date picker: a button with the date, opening a dialog with the year (typed or stepped),
// the twelve months and the month's days, as many as this epoch's calendar gives it; laid out in
// weeks for the Gregorian calendar, in rows of ten for the others, which have no weeks.
const dateBtn=document.getElementById('dateBtn'), datePop=document.getElementById('datePop'), dpYear=document.getElementById('dpYear'),
  dpMonths=document.getElementById('dpMonths'), dpDays=document.getElementById('dpDays'), dpNote=document.getElementById('dpNote'), dpBack=document.getElementById('dpBack');
MONTH_NAMES.forEach((n, i)=>{ const b=document.createElement('button'); b.type='button'; b.dataset.m=String(i+1); b.textContent=n; dpMonths.appendChild(b); });
dpYear.min=String(-YEAR_SPAN); dpYear.max=String(YEAR_SPAN);
function setPageDate(Y, M, D){ document.getElementById('moonDate').value=fmtDate(Y, M, Math.max(1, Math.min(D, monthLen(Y, M)))); renderDay(); }
let datePopDrawn='';
function drawDatePop(){
  const [Y,M,D]=pageDate(), key=EP[dIdx].key, z=yearZero(), greg=gregorian(), id=[key, Y, M, D].join('|');
  if(document.activeElement!==dpYear){ dpYear.value=String(Y-z); dpYear.removeAttribute('aria-invalid'); }
  if(id===datePopDrawn) return;
  datePopDrawn=id;
  dpMonths.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', String(+b.dataset.m===M)));
  let html='';
  if(greg){
    for(const w of ['Su','Mo','Tu','We','Th','Fr','Sa']) html+=`<span class="dp-wd" aria-hidden="true">${w}</span>`;
    for(let i=localDate(Y, M-1, 1).getDay(); i>0; i--) html+='<span></span>';
  }
  for(let d=1, n=monthLen(Y, M); d<=n; d++) html+=`<button type="button" data-d="${d}" aria-pressed="${d===D}">${d}</button>`;
  dpDays.className='dp-days '+(greg?'dp-week':'dp-ten'); dpDays.innerHTML=html;
  const lens=MONTH_NAMES.map((_, i)=>monthLen(Y, i+1)), lo=Math.min(...lens), hi=Math.max(...lens);
  dpNote.textContent=greg?(z?'Today’s 24-hour days and calendar; years count from this sky’s year 0.':'The Gregorian calendar.')
    :`${dayHours()}-hour days: twelve months of ${lo===hi?lo:lo+'–'+hi} days, ${yearLen(Y)} this year. Years count from this sky’s year 0.`;
  const back=epochYear(key);
  dpBack.textContent=EPOCH_YEAR[key]==='now'?'Today':`Back to ${z?'year 0':fmtYear(back)}`;
}
function syncDateUI(){ dateBtn.textContent=dateLabel(); if(datePop.open) drawDatePop(); }
dateBtn.addEventListener('click', ()=>{
  datePopDrawn=''; drawDatePop(); datePop.showModal();
  (dpDays.querySelector('[aria-pressed="true"]')||dpYear).focus();
});
// A click on the dimmed page outside the dialog closes it.
datePop.addEventListener('click', e=>{ if(e.target===datePop) datePop.close(); });
dpMonths.addEventListener('click', e=>{ const b=e.target.closest('[data-m]'); if(!b) return; const [Y,,D]=pageDate(); setPageDate(Y, +b.dataset.m, D); });
dpDays.addEventListener('click', e=>{ const b=e.target.closest('[data-d]'); if(!b) return; const [Y,M]=pageDate(); setPageDate(Y, M, +b.dataset.d); datePop.close(); });
dpYear.addEventListener('input', ()=>{
  const v=dpYear.value.trim(), ok=/^-?\d+$/.test(v) && Math.abs(+v)<=YEAR_SPAN;
  if(!ok){ dpYear.setAttribute('aria-invalid', 'true'); return; }
  dpYear.removeAttribute('aria-invalid');
  const [,M,D]=pageDate(); setPageDate(+v+yearZero(), M, D);
});
for(const [id, dy] of [['dpPrev', -1], ['dpNext', 1]]) document.getElementById(id).addEventListener('click', ()=>{
  const [Y,M,D]=pageDate(), y=Y-yearZero()+dy; if(Math.abs(y)>YEAR_SPAN) return; setPageDate(Y+dy, M, D);
});
dpBack.addEventListener('click', ()=>{
  const key=EP[dIdx].key;
  if(EPOCH_YEAR[key]==='now'){ document.getElementById('moonDate').value=localISODate(new Date()); renderDay(); }
  else { const [,M,D]=pageDate(); setPageDate(epochYear(key), M, D); }
});
document.getElementById('dpDone').addEventListener('click', ()=>datePop.close());
