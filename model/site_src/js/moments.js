// Moments: cards on the landing page, oldest first, that open the VR view at a chosen sky. Each sets the epoch,
// latitude, date and clock time, then where to look: toward the Sun (the default), a direction
// (look: [azimuth, elevation]), or the supernova (look: 'sn'). The eclipse card finds the total
// eclipse after its date as the t key does. Moments about the sky itself open with clouds off
// (c brings them back).
const MOMENTS=[
  {epoch:'hadean44', date:'2026-03-20', t:1050, title:'A Hadean evening, 4.4 Ga', sub:'Thirty bars of CO₂ under a young, faint Sun', art:'day'},
  {epoch:'archean27', date:'2026-03-20', t:930, title:'Archean afternoon, 2.7 Ga', sub:'A pale orange organic haze, like Titan’s', art:'day'},
  {epoch:'carbon30', date:'2026-07-08', t:1380, look:[180, 32], title:'The Milky Way, 300 Ma', sub:'No city lights, and stars no one has catalogued', art:'galaxy'},
  {epoch:'kpg66', date:'2026-03-20', t:720, title:'Noon after the asteroid', sub:'Soot from Chicxulub turns the sky dim amber', art:'day'},
  {epoch:'geminga', date:'2026-01-15', t:1320, look:'sn', title:'The Geminga supernova', sub:'342,000 years ago, a star in Orion as bright as the quarter Moon', art:'nova'},
  {epoch:'volcanic', date:'2026-07-08', t:1380, look:[180, 32], title:'A town night in 1815', sub:'Oil lamps light the streets but barely touch the sky', art:'stars'},
  {epoch:'modern', date:'2026-07-08', t:1380, look:[180, 32], title:'A city night, today', sub:'Sodium and LED glow hides all but the brightest stars', art:'city'},
  {epoch:'modern', date:'2029-09-01', eclipse:true, title:'Totality, September 2029', sub:'The corona, Baily’s beads, and a sunset all round the horizon', art:'eclipse'},
];
const MOMENT_ART={
  eclipse:'<defs><radialGradient id="mglow"><stop offset=".5" stop-color="#f4ecd8" stop-opacity=".6"/><stop offset="1" stop-color="#f4ecd8" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="38" r="26" fill="url(#mglow)"/><circle cx="60" cy="38" r="14.5" fill="none" stroke="#fbf3e0" stroke-width="1.6"/><circle cx="60" cy="38" r="13.6" fill="#05070c"/>',
  nova:'<g stroke="#f6f1ff" stroke-linecap="round"><path d="M60 22v32M44 38h32" stroke-width="1.6"/><path d="M50 28l20 20M70 28L50 48" stroke-width=".8" opacity=".7"/></g><circle cx="60" cy="38" r="3.2" fill="#fff"/>',
  galaxy:'<path d="M-10 70 C30 40 70 30 130 6" stroke="#cfc4a6" stroke-width="22" fill="none" opacity=".18"/><path d="M-10 70 C30 40 70 30 130 6" stroke="#e8dfc6" stroke-width="7" fill="none" opacity=".22"/>',
  city:'<path d="M0 64h10v-9h8v6h7v-13h9v16h6v-7h10v9h9v-12h7v8h9v-5h10v10h8v-6h7v13H0z" fill="#0c0b0a"/>',
  stars:'',
  day:'',
};
function momentGradient(m){
  if(m.art==='day'){
    const v=EP.find(e=>e.key===m.epoch).lat['Mid-latitude'];
    return `linear-gradient(${hex(tone(xyY2XYZ(v.z), YREF))}, ${hex(tone(xyY2XYZ(v.h), YREF))})`;
  }
  return {eclipse:'linear-gradient(#0f1a2e, #3a3442)', nova:'linear-gradient(#05060c, #141a2c)', galaxy:'linear-gradient(#06070b, #121521)',
    city:'linear-gradient(#2a1f17, #6b4527)', stars:'linear-gradient(#05060a, #10131c)'}[m.art];
}
function starsSVG(seed){
  let s='', x=seed*9301+49297;
  for(let i=0;i<26;i++){ x=(x*9301+49297)%233280; const a=x/233280; x=(x*9301+49297)%233280; const b=x/233280; x=(x*9301+49297)%233280;
    s+=`<circle cx="${(a*120).toFixed(1)}" cy="${(b*60).toFixed(1)}" r="${(0.3+0.9*(x/233280)**3).toFixed(2)}" fill="#fff" opacity="${(0.4+0.6*x/233280).toFixed(2)}"/>`; }
  return s;
}
function openMoment(m){
  setEpoch(EP.findIndex(e=>e.key===m.epoch));
  dLat='Mid-latitude';
  document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===dLat?'true':'false'));
  document.getElementById('moonDate').value=m.date;
  minutes=m.eclipse?0:m.t; hslider.value=String(minutes);
  renderDay();
  if(m.eclipse) jumpNextEclipse(true);
  vrClouds=m.art==='day';
  enterVR(false);
  syncVRPad();
  if(m.look==='sn'){ const sn=supernovaPlace(LATDEG[dLat]); if(sn){ vrYaw=sn.az; vrPitch=Math.max(5, Math.min(60, sn.el-12)); } }
  else if(m.look){ vrYaw=m.look[0]; vrPitch=m.look[1]; }
  paintVR();
}
(function(){
  const box=document.getElementById('moments');
  MOMENTS.forEach((m, i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='moment';
    const night=m.art!=='day';
    b.innerHTML=`<span class="moment-sky" style="background:${momentGradient(m)}"><svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${night&&m.art!=='eclipse'?starsSVG(i+1):''}${MOMENT_ART[m.art]}</svg></span><span class="moment-text"><b></b><small></small></span>`;
    b.querySelector('b').textContent=m.title; b.querySelector('small').textContent=m.sub;
    b.addEventListener('click', ()=>openMoment(m));
    box.appendChild(b);
  });
})();
