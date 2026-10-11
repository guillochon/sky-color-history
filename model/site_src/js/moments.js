// Moments: cards on the landing page, oldest first, that open the VR view at a chosen sky. Each sets the epoch,
// latitude, date and clock time, then where to look: toward the Sun (the default), a direction
// (look: [azimuth, elevation]), the supernova (look: 'sn'), the Moon (look: 'moon') or a planet
// (look: {planet: name}); lat picks the latitude (Mid-latitude unless given). The eclipse
// card finds the next total eclipse from today with the Sun up, as the t key does but passing over
// annular ones, and the lunar one the next total lunar eclipse with the Moon up, as b does. The
// storm card opens the Leonid storm of 1966, 1999, 2001 or 2002 whose peak came in the darkest sky,
// with the radiant highest, at the visitor's own longitude (showers.js openStorm). Moments
// that show one feature (clear: the eclipse, the supernova, an aurora, the Milky Way, the
// satellites) open with clouds off, and the visitor's own setting returns on leaving VR; c or the
// pad during the moment makes that the setting. Dates are in each epoch's own year (calendar.js
// EPOCH_YEAR): year 0 (2000 underneath) for the older skies, 1815 and 2100 for theirs.
const MOMENTS=[
  // Theia's closest pass to the proto-Earth, at its brightest, in the epoch's random-phase orbits
  // (planets.js LOST_PLANETS). Every 25 years or so the two come within a few hundredths of an AU;
  // over 10,000 years either side of the epoch's year 0 Theia is brightest, magnitude -8.5, about
  // 1,180 years before it: 0.0121 AU away (1.8 million km), half lit, 88 degrees from the Sun (its
  // nearest passes, 0.011 AU, show it a thinner crescent, a little fainter). At that moment it
  // stands 47 degrees up in the south-east in the middle of the night at southern mid-latitudes.
  {epoch:'protoearth455', date:'0821-08-50', t:178, lat:'Mid-latitude S', look:{planet:'Theia'}, clear:true, title:'Theia’s closest pass, 4.55 Ga', sub:'The world that will make the Moon, half lit, magnitude −8.5, lighting the night', art:'theia'},
  {epoch:'hadean45', date:'2000-02-110', t:1015, look:[240, 14], title:'A Hadean evening, 4.5 Ga', sub:'Thirty bars of CO₂ under a young, faint Sun, and the molten newborn Moon', art:'hadean'},
  {epoch:'archean38', date:'2000-01-38', t:1410, look:[0, 30], clear:true, aurora:true, title:'Aurora over the young Earth, 3.8 Ga', sub:'All night under the young Sun’s stronger wind: nitrogen glowing violet and pink in air with no oxygen', art:'aurora'},
  {epoch:'archean27', date:'2000-03-07', t:913, title:'Archean afternoon, 2.7 Ga', sub:'A pale orange organic haze, like Titan’s', art:'day'},
  {epoch:'ordovician466', date:'2000-10-09', t:1324, look:[200, 18], clear:true, title:'Meteor storm and ring, 466 Ma', sub:'A shattered asteroid’s fragments, and perhaps a ring across the sky', art:'meteors'},
  {epoch:'carbon30', date:'2000-06-31', t:1417, look:[180, 32], clear:true, title:'The Milky Way, 300 Ma', sub:'No city lights, and stars no one has catalogued', art:'galaxy'},
  {epoch:'kpg66', date:'2000-04-01', t:720, title:'Noon after the asteroid', sub:'Soot from Chicxulub turns the sky dim amber', art:'day'},
  {epoch:'geminga', date:'2000-01-07', t:1358, look:'sn', clear:true, title:'The Geminga supernova', sub:'342,000 years ago, a star in Orion as bright as the quarter Moon', art:'nova'},
  {epoch:'volcanic', date:'1815-07-06', t:1392, look:[180, 32], title:'A town night in 1815', sub:'Oil lamps light the streets but barely touch the sky', art:'stars'},
  {epoch:'modern', date:'2026-07-08', t:1380, look:[180, 32], title:'A city night, today', sub:'Sodium and LED glow hides all but the brightest stars', art:'city'},
  {epoch:'modern', date:null, t:0, storm:true, clear:true, title:'A Leonid meteor storm', sub:'Over a thousand an hour from one point in Leo, even through city glow', art:'storm'},
  {epoch:'modern', date:null, eclipse:true, clear:true, title:'The next total eclipse', sub:'The corona, Baily’s beads, and a sunset all round the horizon', art:'eclipse'},
  {epoch:'modern', date:null, lunar:true, look:'moon', clear:true, title:'The next total lunar eclipse', sub:'A copper Moon, lit by every sunrise and sunset on Earth', art:'lunar'},
  {epoch:'y2100', date:'2100-03-12', t:1167, look:[300, 28], clear:true, title:'Satellites at dusk, 2100', sub:'Megaconstellations and orbital datacenters still in sunlight', art:'sats'},
];
const MOMENT_ART={
  theia:'<circle cx="62" cy="30" r="11" fill="#3a3430"/><path d="M62 19a11 11 0 0 1 0 22z" fill="#b8aa98"/>',
  lunar:'<defs><radialGradient id="mblood" cx=".35" cy=".3"><stop offset="0" stop-color="#b8653a"/><stop offset=".75" stop-color="#6e2a17"/><stop offset="1" stop-color="#4a1c12"/></radialGradient></defs><circle cx="60" cy="34" r="13" fill="url(#mblood)"/>',
  eclipse:'<defs><radialGradient id="mglow"><stop offset=".5" stop-color="#f4ecd8" stop-opacity=".6"/><stop offset="1" stop-color="#f4ecd8" stop-opacity="0"/></radialGradient></defs><circle cx="60" cy="38" r="26" fill="url(#mglow)"/><circle cx="60" cy="38" r="14.5" fill="none" stroke="#fbf3e0" stroke-width="1.6"/><circle cx="60" cy="38" r="13.6" fill="#05070c"/>',
  nova:'<g stroke="#f6f1ff" stroke-linecap="round"><path d="M60 22v32M44 38h32" stroke-width="1.6"/><path d="M50 28l20 20M70 28L50 48" stroke-width=".8" opacity=".7"/></g><circle cx="60" cy="38" r="3.2" fill="#fff"/>',
  galaxy:'<path d="M-10 70 C30 40 70 30 130 6" stroke="#cfc4a6" stroke-width="22" fill="none" opacity=".18"/><path d="M-10 70 C30 40 70 30 130 6" stroke="#e8dfc6" stroke-width="7" fill="none" opacity=".22"/>',
  city:'<path d="M0 64h10v-9h8v6h7v-13h9v16h6v-7h10v9h9v-12h7v8h9v-5h10v10h8v-6h7v13H0z" fill="#0c0b0a"/>',
  aurora:`<defs><linearGradient id="maur" gradientUnits="userSpaceOnUse" x1="0" y1="52" x2="0" y2="0"><stop offset="0" stop-color="#ff7aa2" stop-opacity=".9"/><stop offset=".12" stop-color="#a98bff" stop-opacity=".7"/><stop offset=".7" stop-color="#7a66ff" stop-opacity=".15"/><stop offset="1" stop-color="#6b5cff" stop-opacity="0"/></linearGradient><clipPath id="mcur"><path d="M-5 50 C20 44 40 49 62 43 C84 37 102 45 125 40 V0 H-5Z"/></clipPath></defs><g clip-path="url(#mcur)"><rect x="-5" y="0" width="130" height="52" fill="url(#maur)" opacity=".35"/><g stroke="url(#maur)" fill="none">${[[4,1.4,8],[9,.7,18],[17,2.2,4],[23,.8,14],[31,1.6,10],[34,.6,22],[42,2.6,2],[50,1,12],[55,.7,20],[63,1.9,6],[70,.8,16],[76,2.4,3],[85,1,11],[91,.6,19],[98,1.8,7],[107,1.2,13],[114,2,5]].map(([x,w,t])=>`<path d="M${x} 52V${t}" stroke-width="${w}"/>`).join('')}</g></g><path d="M-5 50 C20 44 40 49 62 43 C84 37 102 45 125 40" stroke="#ff7aa2" stroke-width="1.4" fill="none" opacity=".75"/>`,
  // Trains of satellites crossing the sky, a few bright datacenters among them.
  sats:[[-4,30,124,10,.55],[-4,46,124,24,.45],[-4,58,124,40,.35]].map(([x0,y0,x1,y1,o])=>Array.from({length:23},(_, k)=>{ const t=k/22, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t-6*Math.sin(Math.PI*t);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${k%7===3?1.3:0.7}" fill="#fff6e8" opacity="${k%7===3?0.95:o}"/>`; }).join('')).join(''),
  // Meteors falling from upper right, under the arc of a ring.
  meteors:'<path d="M-10 58 Q60 20 130 58" stroke="#c9a585" stroke-width="5" fill="none" opacity=".22"/><path d="M-10 58 Q60 20 130 58" stroke="#e6c7a6" stroke-width="1.2" fill="none" opacity=".35"/>'
    +[[96,6,80,22,1],[70,4,58,16,.8],[112,24,100,36,.7],[40,10,30,20,.6],[86,30,78,38,.5]].map(([x0,y0,x1,y1,o])=>`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#fff3d9" stroke-width="${0.5+o*0.6}" stroke-linecap="round" opacity="${o}"/><circle cx="${x1}" cy="${y1}" r="${0.6+o*0.7}" fill="#fffbe9" opacity="${o}"/>`).join(''),
  // Streaks radiating from one point, as in a storm.
  storm:Array.from({length:22}, (_, k)=>{ const a=k*2.4+0.3, r0=6+(k*7)%13, r1=r0+5+(k*5)%9, o=0.35+0.6*((k*37)%10)/10;
    const x0=78+r0*Math.cos(a), y0=20+r0*Math.sin(a)*0.8, x1=78+r1*Math.cos(a), y1=20+r1*Math.sin(a)*0.8;
    return `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#f3f6ff" stroke-width="${(0.4+o*0.6).toFixed(2)}" stroke-linecap="round" opacity="${o.toFixed(2)}"/>`; }).join(''),
  stars:'',
  day:'',
  // The low Sun's glow on the right, and the newborn Moon above: a dark disk, glowing cracks all
  // over it, a thin crescent lit toward the Sun, and its red aureole.
  hadean:'<defs><radialGradient id="msun"><stop offset="0" stop-color="#fff0c8" stop-opacity=".95"/><stop offset=".25" stop-color="#ffc37a" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a50" stop-opacity="0"/></radialGradient>'
    +'<radialGradient id="mhalo"><stop offset=".5" stop-color="#ff6a1e" stop-opacity=".6"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>'
    +'<radialGradient id="mcrust" cx=".62" cy=".66"><stop offset="0" stop-color="#5a2412"/><stop offset="1" stop-color="#2a0f08"/></radialGradient>'
    +'<clipPath id="mdisk"><circle cx="48" cy="24" r="14"/></clipPath></defs>'
    +'<circle cx="100" cy="46" r="20" fill="url(#msun)"/><g transform="translate(15.44 13.72) scale(.72)"><circle cx="48" cy="24" r="27" fill="url(#mhalo)"/>'
    +'<g clip-path="url(#mdisk)"><circle cx="48" cy="24" r="14" fill="#ffcf8a"/><circle cx="45.4" cy="21.8" r="14" fill="url(#mcrust)"/>'
    +'<path d="M41 28c2-1 4 0 4 2s-3 3-5 2-1-3 1-4zM55 16c1.5-.5 3 .5 2.5 2s-2.5 1.5-3.2.4.2-2 .7-2.4z" fill="#ff8a2a"/>'
    +'<g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    // Wide cracks between the great rafts, then narrower ones within them.
    +['M33 17l3 1.5 2.5-.5 1.5 2 2.5-1 1.5-3.5 1-2.5-.5-3M40.5 20l.5 3-1 2 1.5 2.5-3 2-2.5 3M41.5 27.5l3 .5 2-1.5 3 .5 2.5-3 1.5-4 2-2.5-1-3.5-1.5-2M52 26l.5 3 2 2.5-1.5 3-3 2.5-2 3M55 31.5l3-1.5 2.5.5 1-3-.5-3 1.5-3',
      'M44 14.5l2.5-1.5 3 .5 2-1M36 31l-1 2.5.5 3M58 30l1.5 3-.5 3M48 37.5l-3-.5-2.5 1M55 19l3-1 2 1.5 2-.5M45 22l2 1 1.5 2.5M37.5 24l-2 1.5-2 0']
      .map((d, k)=>`<path d="${d}" stroke="#ff6a1a" stroke-width="${k?1.0:2.0}" opacity=".95"/><path d="${d}" stroke="#ffd27a" stroke-width="${k?0.3:0.7}"/>`).join('')
    +'</g></g></g>'
    +'<path d="M0 64V44C8 42 14 39 22 43C30 46 38 42 46 44C56 46 64 40 74 44C84 47 94 44 104 46C110 47 116 45 120 46V64Z" fill="#1c120d"/>',
};
function momentGradient(m){
  // The Hadean evening: the whole dome dimmed to orange as the Sun sets in the 30-bar air.
  if(m.art==='hadean') return 'linear-gradient(#3e2a22, #8a5a3c 55%, #d3874a)';
  if(m.art==='day'){
    const v=EP.find(e=>e.key===m.epoch).lat['Mid-latitude'];
    return `linear-gradient(${hex(tone(xyY2XYZ(v.z), YREF))}, ${hex(tone(xyY2XYZ(v.h), YREF))})`;
  }
  return {theia:'linear-gradient(#04050a, #1a1622)', aurora:'linear-gradient(#06050f, #151027)', eclipse:'linear-gradient(#0f1a2e, #3a3442)', lunar:'linear-gradient(#05060c, #161625)', nova:'linear-gradient(#05060c, #141a2c)', galaxy:'linear-gradient(#06070b, #121521)',
    city:'linear-gradient(#2a1f17, #6b4527)', sats:'linear-gradient(#0c0b0f, #2e2620)', storm:'linear-gradient(#04050b, #121626)', meteors:'linear-gradient(#07070c, #1d1a1c)', stars:'linear-gradient(#05060a, #10131c)'}[m.art];
}
function starsSVG(seed){
  let s='', x=seed*9301+49297;
  for(let i=0;i<26;i++){ x=(x*9301+49297)%233280; const a=x/233280; x=(x*9301+49297)%233280; const b=x/233280; x=(x*9301+49297)%233280;
    s+=`<circle cx="${(a*120).toFixed(1)}" cy="${(b*60).toFixed(1)}" r="${(0.3+0.9*(x/233280)**3).toFixed(2)}" fill="#fff" opacity="${(0.4+0.6*x/233280).toFixed(2)}"/>`; }
  return s;
}
// The visitor's cloud setting while a clear moment has them off, to restore on leaving VR. The
// aurora moment's active night (aurActive) ends on leaving VR too.
let momentClouds=null;
function openMoment(m){
  setEpoch(EP.findIndex(e=>e.key===m.epoch));
  aurStorm=false; aurBtn.setAttribute('aria-pressed', 'false'); aurActive=!!m.aurora;
  dLat=m.lat||'Mid-latitude';
  document.querySelectorAll('[data-lat]').forEach(x=>x.setAttribute('aria-pressed', x.dataset.lat===dLat?'true':'false'));
  document.getElementById('moonDate').value=m.date||localISODate(new Date());
  minutes=m.eclipse||m.lunar?0:m.t; hslider.value=String(minutes);
  renderDay();
  if(m.eclipse) jumpNextEclipse(true, true);
  if(m.lunar) jumpNextLunarEclipse(true);
  const storm=m.storm?openStorm():null;
  if(momentClouds!==null) vrClouds=momentClouds;
  momentClouds=m.clear?vrClouds:null;
  if(m.clear) vrClouds=false;
  vrEntryLook=()=>{
    if(m.look==='moon') lookAtMoon();
    else if(m.look&&m.look.planet){ const s=placeStars(LATDEG[dLat]).marks.find(x=>x.planet===m.look.planet); if(s){ vrYaw=s.az; vrPitch=Math.max(5, Math.min(60, s.el-8)); } }
    else if(m.look==='sn'){ const sn=supernovaPlace(LATDEG[dLat]); if(sn){ vrYaw=sn.az; vrPitch=Math.max(5, Math.min(60, sn.el-12)); } }
    else if(m.look){ vrYaw=m.look[0]; vrPitch=m.look[1]; }
    else if(storm){ vrYaw=storm.az; vrPitch=Math.max(12, Math.min(50, storm.alt-18)); }
  };
  enterVR(false);
  syncVRPad();
  paintVR();
}
(function(){
  const box=document.getElementById('moments');
  MOMENTS.forEach((m, i)=>{
    const b=document.createElement('button');
    b.type='button'; b.className='moment';
    const night=m.art!=='day'&&m.art!=='hadean';
    b.innerHTML=`<span class="moment-sky" style="background:${momentGradient(m)}"><svg viewBox="0 0 120 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${night&&m.art!=='eclipse'?starsSVG(i+1):''}${MOMENT_ART[m.art]}</svg></span><span class="moment-text"><b></b><small></small></span>`;
    b.querySelector('b').textContent=m.title; b.querySelector('small').textContent=m.sub;
    b.addEventListener('click', ()=>openMoment(m));
    box.appendChild(b);
  });
})();
