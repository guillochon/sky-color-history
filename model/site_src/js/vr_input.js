const vrTouch=window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 820px) and (pointer: coarse)').matches;
let musicMuted=true, music=null; // off until the viewer turns it on with m
const MUSIC_BPM=74;
const MUSIC_CHORDS=[[50,57,64,69],[55,62,67,71],[47,54,62,66],[52,57,64,69]];
const MUSIC_LEAD=[74,0,0,78,0,76,0,0,81,0,78,0,76,0,0,74,0,0,83,0,81,0,78,0,76,0,0,74,0,0,0,0];
function playTone(midi, when, dur, type, level, dest){
  const ctx=music.ctx, freq=440*Math.pow(2,(midi-69)/12), g=ctx.createGain();
  const a=Math.min(0.6, dur*0.2), r=Math.min(1.2, dur*0.24), hold=Math.max(when+a, when+dur-r);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(level, when+a);
  g.gain.setValueAtTime(level, hold);
  g.gain.exponentialRampToValueAtTime(0.0001, when+dur);
  g.connect(dest);
  const n=type==='sine'?1:2;
  for(let i=0;i<n;i++){
    const o=ctx.createOscillator();
    o.type=type; o.frequency.value=freq*(i?1.007:0.997);
    o.connect(g); o.start(when); o.stop(when+dur+0.02);
  }
}
function scheduleVRMusic(){
  if(!music||music.ctx.state!=='running') return;
  const ctx=music.ctx, eighth=60/MUSIC_BPM/2;
  if(music.next<ctx.currentTime-0.05) music.next=ctx.currentTime+0.05;
  while(music.next<ctx.currentTime+0.35){
    const step=music.step, when=music.next+(step%2?eighth*0.16:0);
    const chord=MUSIC_CHORDS[Math.floor(step/32)%MUSIC_CHORDS.length];
    if(step%32===0){ for(let i=0;i<chord.length;i++) playTone(chord[i], when, eighth*33, 'sawtooth', 0.03, music.filter); }
    if(step%8===0) playTone(chord[0]-12, when, eighth*7.2, 'sine', 0.08, music.master);
    const lead=MUSIC_LEAD[step%32];
    if(lead) playTone(lead, when, eighth*2.4, 'triangle', 0.05, music.filter);
    music.step++; music.next+=eighth;
  }
}
function applyMusicGain(){
  if(!music) return;
  const now=music.ctx.currentTime, level=(vrOn&&!musicMuted)?0.9:0.0001;
  music.master.gain.cancelScheduledValues(now);
  music.master.gain.setValueAtTime(Math.max(music.master.gain.value, 0.0001), now);
  music.master.gain.exponentialRampToValueAtTime(level, now+((musicMuted||!vrOn)?0.28:0.9));
}
function pokeVRMusic(){
  if(!music||!vrOn) return;
  if(music.ctx.state!=='suspended') return;
  const p=music.ctx.resume();
  const go=()=>{ if(!music||!vrOn) return; if(music.next<music.ctx.currentTime) music.next=music.ctx.currentTime+0.06; applyMusicGain(); };
  if(p&&p.then) p.then(go); else go();
}
function startVRMusic(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  if(!music){
    const ctx=new AC(), master=ctx.createGain();
    master.gain.value=0.0001;
    const filter=ctx.createBiquadFilter();
    filter.type='lowpass'; filter.frequency.value=640; filter.Q.value=0.4;
    const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
    lfo.frequency.value=0.055; lfoG.gain.value=70;
    lfo.connect(lfoG); lfoG.connect(filter.frequency); lfo.start();
    const smear=ctx.createDelay(0.08), sg=ctx.createGain();
    smear.delayTime.value=0.024; sg.gain.value=0.28;
    filter.connect(smear); smear.connect(sg); sg.connect(master);
    filter.connect(master); master.connect(ctx.destination);
    music={ctx, master, filter, step:0, next:0, timer:0};
  }
  if(!music.timer) music.timer=setInterval(scheduleVRMusic, 120);
  pokeVRMusic(); applyMusicGain();
}
function stopVRMusic(){
  applyMusicGain();
  if(music&&music.timer){ clearInterval(music.timer); music.timer=0; }
  setTimeout(()=>{ if(music&&!vrOn) music.ctx.suspend(); }, 700);
}
function toggleVRMusic(){
  musicMuted=!musicMuted;
  syncVRPad();
  if(!vrOn) return;
  if(!music) startVRMusic();
  pokeVRMusic(); applyMusicGain();
}
let vrEntry=0;
function enterVR(fromLink){
  const root=document.getElementById('vr'); root.classList.add('on'); root.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  vrOn=true; vrLockedOnce=false; vrX=0; vrY=0; vrHeld.clear();
  // Lock before any shader work. A long link used to expire the click, so the pointer never captured and yaw stopped at the window edge.
  vrRelock=true; lockLook();
  const fsNow=root.requestFullscreen?root.requestFullscreen():null; if(fsNow&&fsNow.catch) fsNow.catch(()=>{});
  // The shaders take a moment, and the first compile can hold up the browser, so say so first.
  const nav=vrNav, first=!vrGL, entry=++vrEntry;
  if(first) showVRLoad('Loading VR…');
  const open=ok=>{
    if(!vrOn||entry!==vrEntry) return;
    if(!ok){
      hideVRLoad();
      vrOn=false; vrRelock=false;
      root.classList.remove('on','locked'); root.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      if(document.pointerLockElement) document.exitPointerLock();
      if(document.fullscreenElement){ const p=document.exitFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
      return;
    }
    const g=sunGeom(LATDEG[dLat], minutes); vrYaw=g.az; const elev=90-g.sza; vrPitch=Math.max(-8, Math.min(15, elev-8));
    sizeVR(); root.tabIndex=-1; root.focus();
    if(!dayPlaying){ dayPlaying=true; if(minutes>=DAYMIN){ minutes-=DAYMIN; shiftMoonDate(1); } hplay.textContent='Pause'; hplay.setAttribute('aria-pressed','true'); }
    if(!nav){
      const url=vrLinkURL();
      if(fromLink===true) history.replaceState({vr:1},'',url);
      else history.pushState({vr:1},'',url);
      vrLinkKey=EP[dIdx].key+'|'+dLat+'|'+Math.floor(minutes);
    }
    renderDay(false);
    adoptPlayRate();
    setTimeout(()=>{ vrRelock=false; }, 700);
    if(!musicMuted) startVRMusic();
    syncVRPad();
    if(first) afterPaint(()=>{ if(document.getElementById('vrload').textContent==='Loading VR…') hideVRLoad(); });
  };
  if(first) afterPaint(()=>initVR(open)); else open(true);
}
function lockLook(){
  if(vrTouch||!vrOn||document.pointerLockElement===document.getElementById('vrc')) return;
  const p=document.getElementById('vrc').requestPointerLock(); if(p&&p.catch) p.catch(()=>{});
}
function exitVR(){
  if(!vrOn) return; if(momentClouds!==null){ vrClouds=momentClouds; momentClouds=null; } hideVRLoad(); if(vrGL&&vrGL.note) vrGL.note=''; if(vrInspect) setInspect(false, true); vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); document.getElementById('sunmark').hidden=true; document.getElementById('moonmark').hidden=true; document.getElementById('snmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
  if(!vrNav) clearVRLink();
  const root=document.getElementById('vr'); root.classList.remove('on','locked'); root.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  if(document.pointerLockElement) document.exitPointerLock();
  if(document.fullscreenElement){ const p=document.exitFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
  adoptPlayRate();
  renderDay(false);
}
document.querySelectorAll('#vrbtn, #vrbtn2').forEach(b=>b.addEventListener('click', ()=>enterVR(false)));
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ if(vrOn) syncVRLink(true); return; }
  if(vrOn&&dayPlaying) adoptPlayRate();
});
window.addEventListener('popstate',()=>{
  const want=new URLSearchParams(location.search).has('vr');
  vrNav=true;
  if(want&&!vrOn) enterVR(true);
  else if(!want&&vrOn) exitVR();
  vrNav=false;
});
const vrc=document.getElementById('vrc');
// The view ray through page point (cx, cy), as the sky shader builds it.
function vrRayAt(cx, cy, yawDeg, pitchDeg){
  const W=window.innerWidth, H=Math.max(window.innerHeight, 1), fy=Math.tan(vrFov*Math.PI/360), fx=fy*W/H, u=((cx/W)*2-1)*fx, v=(1-(cy/H)*2)*fy;
  const yaw=yawDeg*Math.PI/180, pitch=pitchDeg*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cyw=Math.cos(yaw), syw=Math.sin(yaw);
  return vnorm([syw*cp+u*cyw-v*syw*sp, cyw*cp-u*syw-v*cyw*sp, sp+v*cp]);
}
// The scroll wheel zooms between a 10° and a 90° field of view, by the same factor per notch,
// about the pointer: the sky under it stays under it. With the look locked the pointer is the
// middle of the view.
window.addEventListener('wheel', e=>{
  if(!vrOn) return;
  e.preventDefault();
  const px=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*400:e.deltaY;
  const locked=document.pointerLockElement===vrc, cx=locked?window.innerWidth/2:e.clientX, cy=locked?window.innerHeight/2:e.clientY;
  const want=vrRayAt(cx, cy, vrYaw, vrPitch), azEl=d=>[Math.atan2(d[0], d[1])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI];
  vrFov=Math.max(VR_FOV_MIN, Math.min(VR_FOV_MAX, vrFov*Math.exp(px*0.0015)));
  // Turn the view until the ray under the pointer is the one that was there.
  const [wAz, wEl]=azEl(want);
  for(let i=0;i<6;i++){
    const [az, el]=azEl(vrRayAt(cx, cy, vrYaw, vrPitch));
    let dAz=wAz-az; dAz-=360*Math.round(dAz/360);
    vrYaw=((vrYaw+dAz)%360+360)%360; vrPitch=Math.max(-80, Math.min(85, vrPitch+wEl-el));
  }
  if(vrInspect&&vrInspectAt) refreshVRTip();
  requestVR();
}, {passive:false});
window.addEventListener('mousemove', e=>{ if(!vrOn) return; if(vrInspect){ vrInspectAt=[e.clientX, e.clientY]; refreshVRTip(); return; } if(!e.movementX&&!e.movementY) return; lookVR(e.movementX, e.movementY); });
window.addEventListener('pointerdown', ()=>{ if(!vrOn) return; pokeVRMusic(); if(vrInspect||document.pointerLockElement===vrc) return; vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); });
let vrTX=0, vrTY=0;
vrc.addEventListener('touchstart', e=>{ const t=e.touches[0]; vrTX=t.clientX; vrTY=t.clientY; }, {passive:true});
vrc.addEventListener('touchmove', e=>{ if(!vrOn) return; const t=e.touches[0]; lookVR(t.clientX-vrTX, t.clientY-vrTY); vrTX=t.clientX; vrTY=t.clientY; e.preventDefault(); }, {passive:false});
window.addEventListener('resize', ()=>{ if(vrOn){ sizeVR(); requestVR(); } });
document.addEventListener('fullscreenchange', ()=>{
  if(!vrOn) return;
  if(!document.fullscreenElement){ exitVR(); return; }
  vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400);
});
let vrLockedOnce=false;
document.addEventListener('pointerlockchange', ()=>{
  const locked=document.pointerLockElement===vrc;
  document.getElementById('vr').classList.toggle('locked', locked);
  if(locked){ vrLockedOnce=true; return; }
  if(!vrOn||!vrLockedOnce||vrInspect) return;
  if(vrRelock){ lockLook(); return; }
  exitVR();
});
document.addEventListener('keyup',e=>{ if(e.key==='Shift') vrHeld.delete('shift'); else vrHeld.delete(e.key.length===1?e.key.toLowerCase():e.key); });
window.addEventListener('blur',()=>vrHeld.clear());
document.addEventListener('keydown',e=>{
  if(vrOn){
    pokeVRMusic();
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    if(k==='m'&&!e.repeat){ e.preventDefault(); toggleVRMusic(); return; }
    if(k==='w'||k==='a'||k==='s'||k==='d'){ e.preventDefault(); vrHeld.add(k); if(e.shiftKey) vrHeld.add('shift'); if(!dayPlaying) pumpWalk(); return; }
    if(e.key==='Shift'){ vrHeld.add('shift'); return; }
    if(k==='h'&&!e.repeat){ e.preventDefault(); vrScenery=!vrScenery; requestVR(); syncVRPad(); return; }
    if(k==='c'&&!e.repeat){ e.preventDefault(); vrClouds=!vrClouds; momentClouds=null; requestVR(); syncVRPad(); return; }
    if(k==='l'&&!e.repeat){ e.preventDefault(); vrLabels=!vrLabels; requestVR(); syncVRPad(); return; }
    if(k==='q'&&!e.repeat&&!vrTouch){ e.preventDefault(); setInspect(!vrInspect); return; }
    if(e.key==='Escape'){ exitVR(); return; }
    if(e.key===' ' && !e.repeat){ e.preventDefault(); hplay.click(); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); stepMinutes(5); return; }
    if(e.key==='ArrowLeft'){ e.preventDefault(); stepMinutes(-5); return; }
    if(e.key==='ArrowUp'||e.key===']'){ e.preventDefault(); stepEpoch(1); return; }
    if(e.key==='ArrowDown'||e.key==='['){ e.preventDefault(); stepEpoch(-1); return; }
    if(k==='e'&&!e.repeat){ e.preventDefault(); jumpNextEclipse(false); return; }
    if(k==='t'&&!e.repeat){ e.preventDefault(); jumpNextEclipse(true); return; }
    return;
  }
  // The page has VR's keys for time and eras: space plays or pauses the day, ← and → step it by
  // five minutes, ↑ and ↓ (or [ and ]) change era, e and t jump to the next eclipse. Not while
  // typing, or on a control that uses the key itself; with a modifier, the browser's own.
  const t=document.activeElement, tag=t&&t.tagName;
  if(e.ctrlKey||e.metaKey||e.altKey||tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||(t&&t.isContentEditable)) return;
  if(e.key===' '&&(tag==='BUTTON'||tag==='A'||tag==='SUMMARY')) return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  const act={' ':()=>{ if(!e.repeat) hplay.click(); }, ArrowRight:()=>stepMinutes(5), ArrowLeft:()=>stepMinutes(-5),
    ArrowUp:()=>stepEpoch(1), ']':()=>stepEpoch(1), ArrowDown:()=>stepEpoch(-1), '[':()=>stepEpoch(-1),
    e:()=>{ if(!e.repeat) jumpNextEclipse(false); }, t:()=>{ if(!e.repeat) jumpNextEclipse(true); }}[k];
  if(act){ e.preventDefault(); act(); }
});
function syncVRPad(){
  const set=(id,on)=>{ const b=document.getElementById(id); if(b) b.setAttribute('aria-pressed', on?'true':'false'); };
  set('vrpad-scenery', vrScenery);
  set('vrpad-clouds', vrClouds);
  set('vrpad-labels', vrLabels);
  set('vrpad-music', !musicMuted);
  const play=document.getElementById('vrpad-play');
  if(play){ play.setAttribute('aria-pressed', dayPlaying?'true':'false'); play.setAttribute('aria-label', dayPlaying?'Pause':'Play'); }
  const el=document.getElementById('vrmusiclabel');
  if(el) el.textContent=musicMuted?'muted':'music';
}
document.querySelectorAll('.vrpad button, .vrplay').forEach(b=>{
  b.addEventListener('pointerdown', e=>e.stopPropagation());
  b.addEventListener('click', e=>{
    e.preventDefault(); e.stopPropagation();
    const act=b.dataset.act;
    if(act==='scenery'){ vrScenery=!vrScenery; requestVR(); }
    else if(act==='clouds'){ vrClouds=!vrClouds; momentClouds=null; requestVR(); }
    else if(act==='labels'){ vrLabels=!vrLabels; requestVR(); }
    else if(act==='music'){ toggleVRMusic(); return; }
    else if(act==='play') hplay.click();
    else if(act==='time') stepMinutes(+b.dataset.dir);
    else if(act==='era') stepEpoch(+b.dataset.dir);
    else if(act==='eclipse') jumpNextEclipse(false);
    else if(act==='central') jumpNextEclipse(true);
    syncVRPad();
  });
});
syncVRPad();
// Inspect (q): the camera holds still, the pointer comes back, and a tooltip under it gives the
// pixel's colour and the spectrum of the sky in that direction.
let vrInspect=false, vrInspectAt=null, vrInspectTimer=0;
function setInspect(on, leaving){
  vrInspect=on; vrInspectAt=null;
  document.getElementById('vr').classList.toggle('inspect', on);
  document.getElementById('vrtip').style.display='none';
  clearInterval(vrInspectTimer); vrInspectTimer=0;
  if(on){
    if(document.pointerLockElement) document.exitPointerLock();
    vrInspectTimer=setInterval(refreshVRTip, 250);
  }else if(!leaving){ vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); }
}
// One pixel of a framebuffer as numbers, or null.
function vrReadPixel(fb, x, y, float){
  const gl=vrGL.gl;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
  if(fb) gl.readBuffer(gl.COLOR_ATTACHMENT0);
  const px=float?new Float32Array(4):new Uint8Array(4);
  gl.readPixels(x, y, 1, 1, gl.RGBA, float?gl.FLOAT:gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  return gl.getError()?null:px;
}
function refreshVRTip(){
  const tip=document.getElementById('vrtip');
  if(!vrOn||!vrInspect||!vrInspectAt||!vrGL||!skyNow){ tip.style.display='none'; return; }
  const gl=vrGL.gl, c=gl.canvas, [cx, cy]=vrInspectAt, W=window.innerWidth, H=window.innerHeight;
  const x=Math.min(c.width-1, Math.max(0, Math.floor(cx*c.width/W))), y=Math.min(c.height-1, Math.max(0, c.height-1-Math.floor(cy*c.height/H)));
  // The view ray under the pointer, as the sky shader builds it.
  const fy=Math.tan(vrFov*Math.PI/360), fx=fy*c.width/c.height, u=((cx/W)*2-1)*fx, v=(1-(cy/H)*2)*fy;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cyw=Math.cos(yaw), syw=Math.sin(yaw);
  const d=vnorm([syw*cp+u*cyw-v*syw*sp, cyw*cp-u*syw-v*cyw*sp, sp+v*cp]);
  const app=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI, el=trueAltDeg(app);
  let az=Math.atan2(d[0], d[1])*180/Math.PI; if(az<0) az+=360;
  const col=vrReadPixel(null, x, y, false);
  if(!col) return;
  const cur=hex([col[0], col[1], col[2]]);
  if(!tip.querySelector('.tline')) tip.innerHTML='<span class="tline"></span><div class="spbox"></div>';
  tip.querySelector('.tline').innerHTML=`<i style="background:${cur}"></i>${cur} · ${app.toFixed(1)}° up, ${Math.round(az)}°`;
  const box=tip.querySelector('.spbox');
  const hit=vrScenery&&vrGL.hitInfo&&vrGL.hitMRT?vrReadPixel(vrGL.hitFbo, x, y, true):null;
  if(app<0||(hit&&hit[0]>0)) spectrumHTML(box, el, az, {note:'Ground and scenery are not part of the model, so they have no spectrum.'});
  else {
    let cloud=false;
    if(vrClouds&&vrGL.accumFbo&&vrGL.cw){ const a=vrReadPixel(vrGL.accumFbo, Math.floor(x*vrGL.cw/c.width), Math.floor(y*vrGL.ch/c.height), !!vrGL.cloudHDR); cloud=!!a&&(vrGL.cloudHDR?a[3]:a[3]/255)>0.35; }
    const sep=(bAz, bEl)=>Math.acos(Math.max(-1, Math.min(1, vdot(d, horizDir(bAz, apparentEl(bEl))))))*180/Math.PI, mo=skyNow.moon;
    const lit=!cloud&&mo.on?moonLitAt(horizDir(az, el), mo.radDeg*DISK_SCALE):null;
    const disk=cloud?null:(lit!=null?'moon':(skyNow.sunOn&&skyNow.sunVis>0.01&&sep(skyNow.sunAz, 90-skyNow.sza)<mo.sunRadDeg*DISK_SCALE?'sun':null));
    // Within about 18 page pixels of a star, twice that of the supernova and its glare.
    const sn=cloud||disk?null:snNear(horizDir(az, el), 36*vrFov/H), star=cloud||disk||sn?null:starNear(horizDir(az, el), 18*vrFov/H);
    let aurora=null;
    if(!star&&disk!=='sun'&&skyNow.aur&&skyNow.aur.on){ aurora=auroraProbe(gl, vrGL.aurStore||(vrGL.aurStore={}), skyNow.aur, horizDir(az, el)); vrRestoreGL(gl); }
    if(sn) spectrumHTML(box, sn.el, sn.az, {sn});
    else if(star) spectrumHTML(box, star.el, star.az, {star});
    else spectrumHTML(box, el, az, {disk, aurora, cloud, lit});
  }
  tip.style.display='block';
  const w=tip.offsetWidth, h=tip.offsetHeight;
  tip.style.left=Math.min(cx+16, W-w-8)+(cx+16+w>W-8?-(w+32):0)+'px';
  tip.style.top=Math.max(8, Math.min(H-h-8, cy-h/2))+'px';
  tip.style.transform='none';
}
// Apparent altitude (degrees) to true (Bennett 1982), as the sky shader's trueAlt.
function trueAltDeg(a){ return a>80?a:a-1/Math.tan((a+7.31/(a+4.4))*Math.PI/180)/60; }
