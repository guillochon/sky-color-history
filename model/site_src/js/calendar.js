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
  if(gregorian()) return new Date(Y, m, 0).getDate();
  return (m===12?yearLen(Y):monthStart(Y, m+1))-monthStart(Y, m);
}
function fmtDate(Y, M, D){ const p=n=>String(n).padStart(2,'0'); return String(Y).padStart(4,'0')+'-'+p(M)+'-'+p(D); }
// The page date as [Y, M, D], with the month and day held to this epoch's calendar.
function parseDate(raw){
  const p=(raw||'').split('-').map(Number);
  if(p.length!==3 || p.some(v=>!Number.isFinite(v))){ const t=new Date(); return [t.getFullYear(), t.getMonth()+1, t.getDate()]; }
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
  el.value=gregorian() ? localISODate(new Date(Y, M-1, D+days)) : fmtDate(...epochDateOf(epochDayIndex(Y, M, D)+days));
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
  if(gregorian()){ const a=dayNumber(Y,1,1,0), n=dayNumber(Y+1,1,1,0)-a; return localISODate(new Date(Y, 0, 1+Math.min(n-1, Math.round(f*n)))); }
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
// The date picker: month, day and year, with as many days in a month as this epoch has.
const dMonth=document.getElementById('dMonth'), dDay=document.getElementById('dDay'), dYear=document.getElementById('dYear');
MONTH_NAMES.forEach((n, i)=>{ const o=document.createElement('option'); o.value=String(i+1); o.textContent=n; dMonth.appendChild(o); });
function syncDateUI(){
  const [Y,M,D]=pageDate(), n=monthLen(Y, M);
  if(dDay.options.length!==n){ dDay.innerHTML=''; for(let i=1;i<=n;i++){ const o=document.createElement('option'); o.value=String(i); o.textContent=String(i); dDay.appendChild(o); } }
  dMonth.value=String(M); dDay.value=String(D); if(document.activeElement!==dYear) dYear.value=String(Y);
}
function readDateUI(){
  const Y=Math.round(+dYear.value), M=+dMonth.value;
  if(!Number.isFinite(Y) || Y<1 || Y>9999) return;
  document.getElementById('moonDate').value=fmtDate(Y, M, Math.max(1, Math.min(+dDay.value||1, monthLen(Y, M))));
  renderDay();
}
[dMonth, dDay, dYear].forEach(el=>el.addEventListener('change', readDateUI));
