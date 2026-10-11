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
// Where to look on entering, in place of toward the Sun: applied once the view is open, which the
// first time waits for the shaders.
let vrEntryLook=null;
function enterVR(fromLink){
  const root=document.getElementById('vr'); root.classList.add('on'); root.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  vrOn=true; vrLockedOnce=false; vrX=0; vrY=0; vrHeld.clear(); endStick();
  // Lock before any shader work. A long link used to expire the click, so the pointer never captured and yaw stopped at the window edge.
  vrRelock=true; lockLook();
  const fsNow=root.requestFullscreen?root.requestFullscreen():null; if(fsNow&&fsNow.catch) fsNow.catch(()=>{});
  // The shaders take a moment, and the first compile can hold up the browser, so say so first.
  const nav=vrNav, first=!vrGL, entry=++vrEntry;
  if(first) showVRLoad('Loading VR…');
  const open=ok=>{
    if(!vrOn||entry!==vrEntry) return;
    if(!ok){
      vrEntryLook=null;
      hideVRLoad();
      vrOn=false; vrRelock=false;
      root.classList.remove('on','locked'); root.setAttribute('aria-hidden','true');
      document.body.style.overflow='';
      if(document.pointerLockElement) document.exitPointerLock();
      if(document.fullscreenElement){ const p=document.exitFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
      return;
    }
    const g=sunGeom(LATDEG[dLat], minutes); vrYaw=g.az; const elev=90-g.sza; vrPitch=Math.max(-8, Math.min(15, elev-8));
    if(vrEntryLook){ vrEntryLook(); vrEntryLook=null; }
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
  if(!vrOn) return; if(momentClouds!==null){ vrClouds=momentClouds; momentClouds=null; } aurActive=false; hideVRLoad(); if(vrGL&&vrGL.note) vrGL.note=''; if(vrInspect) setInspect(false, true); vrFind=null; closeFind(); clearVRPins(); hideVRTip(); clearInterval(vrInspectTimer); vrInspectTimer=0; vrHoldEsc(false); vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); endStick(); document.getElementById('sunmark').hidden=true; document.getElementById('moonmark').hidden=true; document.getElementById('snmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
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
// Zoom between a 0.004° and a 90° field of view about page point (cx, cy): the sky under that
// point stays under it. The wheel uses the same factor per notch. A pinch uses the fingers'
// spread. With the look locked the wheel's point is the middle of the view.
function zoomVRAbout(factor, cx, cy){
  if(!(factor>0)||factor===1) return;
  const want=vrRayAt(cx, cy, vrYaw, vrPitch), azEl=d=>[Math.atan2(d[0], d[1])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI];
  vrFov=Math.max(VR_FOV_MIN, Math.min(VR_FOV_MAX, vrFov*factor));
  const [wAz, wEl]=azEl(want);
  for(let i=0;i<6;i++){
    const [az, el]=azEl(vrRayAt(cx, cy, vrYaw, vrPitch));
    let dAz=wAz-az; dAz-=360*Math.round(dAz/360);
    vrYaw=((vrYaw+dAz)%360+360)%360; vrPitch=Math.max(-80, Math.min(85, vrPitch+wEl-el));
  }
  if(vrPins.length||(vrInspect&&vrInspectAt)) refreshVRTip();
  requestVR();
}
window.addEventListener('wheel', e=>{
  if(!vrOn) return;
  e.preventDefault();
  const px=e.deltaMode===1?e.deltaY*33:e.deltaMode===2?e.deltaY*400:e.deltaY;
  const locked=document.pointerLockElement===vrc||!!vrLockPin, cx=locked?window.innerWidth/2:e.clientX, cy=locked?window.innerHeight/2:e.clientY;
  zoomVRAbout(Math.exp(px*0.0015), cx, cy);
}, {passive:false});
window.addEventListener('mousemove', e=>{ if(!vrOn) return; if(vrInspect){ vrInspectAt=[e.clientX, e.clientY]; vrOverPin=!!(e.target.closest&&e.target.closest('.vrpintip')); if(vrOverPin) hideVRHoverTip(); else askVRHoverTip(); if(!vrEdgeRAF) vrEdgeRAF=requestAnimationFrame(edgeScroll); return; } if(!e.movementX&&!e.movementY) return; lookVR(e.movementX, e.movementY); });
window.addEventListener('pointerdown', e=>{ if(!vrOn) return; pokeVRMusic(); if(e.target.closest&&e.target.closest('.vrpintip')) return; if(vrInspect){ if(e.button===0) pinVRTip(e.clientX, e.clientY); return; } if(document.pointerLockElement===vrc) return; vrRelock=true;
  const root=document.getElementById('vr'); if(!document.fullscreenElement&&root.requestFullscreen){ const p=root.requestFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
  lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); });
let vrTX=0, vrTY=0, vrPinch=null;
function pinchSpan(touches){
  const a=touches[0], b=touches[1];
  return {d:Math.hypot(b.clientX-a.clientX, b.clientY-a.clientY), x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2};
}
// One finger turns the view. Two fingers pinch to zoom about the point between them, and sliding
// both turns the view the way one finger does. Spreading the fingers narrows the field.
vrc.addEventListener('touchstart', e=>{
  if(e.touches.length>=2) vrPinch=pinchSpan(e.touches);
  else { vrPinch=null; const t=e.touches[0]; vrTX=t.clientX; vrTY=t.clientY; }
}, {passive:true});
vrc.addEventListener('touchmove', e=>{
  if(!vrOn) return;
  e.preventDefault();
  if(e.touches.length>=2){
    const p=pinchSpan(e.touches);
    if(vrPinch){
      lookVR(p.x-vrPinch.x, p.y-vrPinch.y);
      if(vrPinch.d>12&&p.d>12) zoomVRAbout(Math.max(0.5, Math.min(2, vrPinch.d/p.d)), p.x, p.y);
    }
    vrPinch=p;
    return;
  }
  vrPinch=null;
  const t=e.touches[0];
  lookVR(t.clientX-vrTX, t.clientY-vrTY);
  vrTX=t.clientX; vrTY=t.clientY;
}, {passive:false});
vrc.addEventListener('touchend', e=>{
  if(e.touches.length>=2) vrPinch=pinchSpan(e.touches);
  else if(e.touches.length===1){ vrPinch=null; vrTX=e.touches[0].clientX; vrTY=e.touches[0].clientY; }
  else vrPinch=null;
}, {passive:true});
vrc.addEventListener('touchcancel', ()=>{ vrPinch=null; }, {passive:true});
['gesturestart','gesturechange'].forEach(n=>document.addEventListener(n, e=>{ if(vrOn) e.preventDefault(); }, {passive:false}));
window.addEventListener('resize', ()=>{ if(vrOn){ sizeVR(); requestVR(); } });
// A screenshot (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5) takes the focus or the OS keys, and
// the browser drops the pointer lock, and sometimes the full screen, with it. That is not the
// viewer leaving: VR stays, and the next click takes the look (and the full screen) back. Only a
// loss with the page still in focus and no OS key just pressed, as Esc gives, leaves VR.
let vrAwayAt=-1e9;
const vrAway=()=>{ vrAwayAt=performance.now(); };
const vrOSKey=e=>e.key==='Meta'||e.key==='OS'||e.key==='PrintScreen'||e.code==='PrintScreen'||e.metaKey;
window.addEventListener('blur', vrAway);
document.addEventListener('keydown', e=>{ if(vrOSKey(e)) vrAway(); }, true);
document.addEventListener('keyup', e=>{ if(vrOSKey(e)) vrAway(); }, true);
function vrLeaveUnlessAway(stillLost){
  setTimeout(()=>{
    if(!vrOn||!stillLost()) return;
    if(!document.hasFocus()||performance.now()-vrAwayAt<1500) return;
    exitVR();
  }, 250);
}
document.addEventListener('fullscreenchange', ()=>{
  if(!vrOn) return;
  // Where the page can't hold Esc (Firefox and Safari have no keyboard lock; see vrHoldEsc), Esc
  // takes the full screen whatever the page does, so there it leaves VR, inspecting or not; q is
  // the way out of inspect everywhere, and the key bar says so while inspecting.
  if(!document.fullscreenElement){ vrLeaveUnlessAway(()=>!document.fullscreenElement); return; }
  vrHoldEsc(true);
  if(vrInspect) return;
  vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400);
});
let vrLockedOnce=false;
document.addEventListener('pointerlockchange', ()=>{
  const locked=document.pointerLockElement===vrc;
  document.getElementById('vr').classList.toggle('locked', locked);
  if(locked){ vrLockedOnce=true; return; }
  if(!vrOn||!vrLockedOnce||vrInspect) return;
  if(vrRelock){ lockLook(); return; }
  vrLeaveUnlessAway(()=>document.pointerLockElement!==vrc&&!vrInspect);
});
document.addEventListener('keyup',e=>{ if(e.key==='Shift') vrHeld.delete('shift'); else vrHeld.delete(e.key.length===1?e.key.toLowerCase():e.key); });
window.addEventListener('blur',()=>{ vrHeld.clear(); endStick(); });
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
    if(k==='f'&&!e.repeat){ e.preventDefault(); openFind(); return; }
    if(k==='q'&&!e.repeat&&!vrTouch){ e.preventDefault(); setInspect(!vrInspect); return; }
    if(e.key==='Escape'){ e.preventDefault(); if(vrInspect) setInspect(false); else exitVR(); return; }
    if(e.key===' ' && !e.repeat){ e.preventDefault(); hplay.click(); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); stepMinutes(5); return; }
    if(e.key==='ArrowLeft'){ e.preventDefault(); stepMinutes(-5); return; }
    if(e.key==='ArrowUp'||e.key===']'){ e.preventDefault(); stepEpoch(1); return; }
    if(e.key==='ArrowDown'||e.key==='['){ e.preventDefault(); stepEpoch(-1); return; }
    if(k==='e'&&!e.repeat){ e.preventDefault(); jumpNextEclipse(false); return; }
    if(k==='t'&&!e.repeat){ e.preventDefault(); jumpNextEclipse(true); return; }
    if(k==='u'&&!e.repeat){ e.preventDefault(); jumpNextLunarEclipse(false); return; }
    if(k==='b'&&!e.repeat){ e.preventDefault(); jumpNextLunarEclipse(true); return; }
    if(k==='n'&&!e.repeat){ e.preventDefault(); jumpNextShower(); return; }
    if((k==='1'||k==='2'||k==='3')&&!e.repeat){ e.preventDefault(); setPlaySpeed(SPEED_KEYS[k]); return; }
    return;
  }
  // The page has VR's keys for time and eras: space plays or pauses the day, ← and → step it by
  // five minutes, ↑ and ↓ (or [ and ]) change era, e and t jump to the next eclipse, u and b to the next
  // lunar one, n to the next meteor shower, f finds something in the sky (find.js). Not while
  // typing, with the date picker open, or on a control that uses the key itself; with a modifier,
  // the browser's own.
  const t=document.activeElement, tag=t&&t.tagName;
  if(datePop.open) return;
  if(e.ctrlKey||e.metaKey||e.altKey||tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||(t&&t.isContentEditable)) return;
  if(e.key===' '&&(tag==='BUTTON'||tag==='A'||tag==='SUMMARY')) return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  const act={' ':()=>{ if(!e.repeat) hplay.click(); }, ArrowRight:()=>stepMinutes(5), ArrowLeft:()=>stepMinutes(-5),
    ArrowUp:()=>stepEpoch(1), ']':()=>stepEpoch(1), ArrowDown:()=>stepEpoch(-1), '[':()=>stepEpoch(-1),
    e:()=>{ if(!e.repeat) jumpNextEclipse(false); }, t:()=>{ if(!e.repeat) jumpNextEclipse(true); },
    u:()=>{ if(!e.repeat) jumpNextLunarEclipse(false); }, b:()=>{ if(!e.repeat) jumpNextLunarEclipse(true); }, n:()=>{ if(!e.repeat) jumpNextShower(); },
    f:()=>{ if(!e.repeat) openFind(); },
    1:()=>setPlaySpeed('real'), 2:()=>setPlaySpeed('default'), 3:()=>setPlaySpeed('fast')}[k];
  if(act){ e.preventDefault(); act(); }
});
const SPEED_KEYS={1:'real', 2:'default', 3:'fast'};
function syncVRPad(){
  const set=(id,on)=>{ const b=document.getElementById(id); if(b) b.setAttribute('aria-pressed', on?'true':'false'); };
  set('vrpad-scenery', vrScenery);
  set('vrpad-clouds', vrClouds);
  set('vrpad-labels', vrLabels);
  set('vrpad-music', !musicMuted);
  set('vrpad-run', vrRun);
  const walk=document.getElementById('vrwalk');
  if(walk) walk.classList.toggle('fast', vrRun);
  const play=document.getElementById('vrpad-play');
  if(play){ play.setAttribute('aria-pressed', dayPlaying?'true':'false'); play.setAttribute('aria-label', dayPlaying?'Pause':'Play'); }
  const ui=document.getElementById('vrpad-ui');
  if(ui){
    const shown=!document.getElementById('vr').classList.contains('ui-off');
    ui.setAttribute('aria-pressed', shown?'true':'false');
    ui.setAttribute('aria-label', shown?'Hide controls':'Show controls');
  }
  const el=document.getElementById('vrmusiclabel');
  if(el) el.textContent=musicMuted?'muted':'music';
}
document.querySelectorAll('.vrpad button, .vrplay, .vrwalk button, #vrpad-ui').forEach(b=>{
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
    else if(act==='lunar') jumpNextLunarEclipse(false);
    else if(act==='run') vrRun=!vrRun;
    else if(act==='ui'){ document.getElementById('vr').classList.toggle('ui-off'); if(document.getElementById('vr').classList.contains('ui-off')) endStick(); }
    syncVRPad();
  });
});
// Drag on the stick walks: up is forward, and how far it is pushed sets the pace. The run
// button, handled with the other pad buttons, matches Shift.
let vrStickId=null;
function endStick(){
  const stick=document.getElementById('vrstick');
  if(stick&&vrStickId!==null){ try{ stick.releasePointerCapture(vrStickId); }catch(err){} }
  vrStickId=null; vrMove=null;
  if(stick) stick.classList.remove('drag');
  const knob=document.getElementById('vrstick-knob');
  if(knob) knob.style.transform='';
  if(stick){ stick.setAttribute('aria-valuenow','0'); stick.setAttribute('aria-valuetext','Still'); }
}
function moveStick(e){
  const stick=document.getElementById('vrstick'), knob=document.getElementById('vrstick-knob');
  const b=stick.getBoundingClientRect(), max=b.width*0.36;
  if(!(max>8)){ vrMove=null; return; }
  let dx=e.clientX-(b.left+b.width/2), dy=e.clientY-(b.top+b.height/2), len=Math.hypot(dx, dy);
  if(len>max){ dx*=max/len; dy*=max/len; }
  knob.style.transform=`translate(${dx}px, ${dy}px)`;
  const dead=max*0.16, mag=len<=dead?0:Math.min(1, (Math.min(len, max)-dead)/(max-dead));
  if(!mag){ vrMove=null; stick.setAttribute('aria-valuenow','0'); stick.setAttribute('aria-valuetext','Still'); return; }
  const clen=Math.hypot(dx, dy)||1;
  vrMove={f:-dy/clen*mag, s:dx/clen*mag};
  stick.setAttribute('aria-valuenow', mag.toFixed(2));
  stick.setAttribute('aria-valuetext', vrRun?'Running':'Walking');
  if(!dayPlaying) pumpWalk();
}
const vrStick=document.getElementById('vrstick');
vrStick.addEventListener('pointerdown', e=>{
  if((e.button!==0&&e.button!==undefined)||vrStickId!==null) return;
  e.preventDefault(); e.stopPropagation();
  pokeVRMusic();
  vrStick.setPointerCapture(e.pointerId);
  vrStickId=e.pointerId;
  vrStick.classList.add('drag');
  moveStick(e);
});
vrStick.addEventListener('pointermove', e=>{ if(e.pointerId!==vrStickId) return; moveStick(e); });
vrStick.addEventListener('pointerup', e=>{ if(e.pointerId===vrStickId) endStick(); });
vrStick.addEventListener('pointercancel', e=>{ if(e.pointerId===vrStickId) endStick(); });
syncVRPad();
// Inspect (q): the camera holds still, the pointer comes back, and a tooltip under it gives the
// pixel's colour and the spectrum of the sky in that direction; each click pins one (pinVRTip).
// q again leaves inspect, and so does Esc where VR can hold it (vrHoldEsc). Pinned tooltips stay
// after inspect ends, until VR does.
let vrInspect=false, vrInspectAt=null, vrInspectTimer=0, vrEdgeRAF=0, vrEdgeT=0;
function setInspect(on, leaving){
  vrInspect=on; vrInspectAt=null;
  document.getElementById('vr').classList.toggle('inspect', on);
  hideVRHoverTip(); vrOverPin=false;
  clearInterval(vrInspectTimer); vrInspectTimer=0;
  if(on||vrPins.length) vrInspectTimer=setInterval(refreshVRTip, 250);
  cancelAnimationFrame(vrEdgeRAF); vrEdgeRAF=0; vrEdgeT=0;
  if(on){ if(document.pointerLockElement) document.exitPointerLock(); }
  else if(!leaving){ vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); }
}
// In full screen the browser takes Esc for itself. Where there is a keyboard lock (Chrome, Edge)
// VR holds Esc for as long as it is in full screen (a long press still leaves); releasing it
// while Esc is down let that same press take the full screen too. Elsewhere see fullscreenchange.
function vrHoldEsc(on){
  const kb=navigator.keyboard;
  if(!kb) return;
  if(!on){ if(kb.unlock) kb.unlock(); return; }
  if(kb.lock&&document.fullscreenElement){ const p=kb.lock(['Escape']); if(p&&p.catch) p.catch(()=>{}); }
}
// On a Mac, Chrome's keyboard lock turns off all the system's shortcuts, not just Esc, and the
// pointer lock keeps the cursor where it is, so Cmd+Shift+4 (and Cmd+Ctrl+Shift+4) gave a
// crosshair that would not move. Both are let go while Cmd is down, before the rest of the
// shortcut is pressed. The Esc hold comes back when Cmd comes up or, if the shortcut took the
// focus, when the focus returns; the look comes back when Cmd comes up, or else on the next click.
let vrMetaFreed=false;
const vrEscBack=()=>{ if(vrOn&&document.fullscreenElement) vrHoldEsc(true); };
document.addEventListener('keydown', e=>{
  if(!vrOn||(e.key!=='Meta'&&e.key!=='OS')) return;
  vrHoldEsc(false);
  if(document.pointerLockElement===vrc){ vrMetaFreed=true; document.exitPointerLock(); }
}, true);
document.addEventListener('keyup', e=>{
  if(e.key!=='Meta'&&e.key!=='OS') return;
  vrEscBack();
  if(vrMetaFreed&&vrOn&&!vrInspect&&document.hasFocus()){ vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); }
  vrMetaFreed=false;
}, true);
window.addEventListener('focus', vrEscBack);
// Edge scrolling, in inspect only: with the pointer in the outer band of the view, the view turns
// that way, faster the nearer the edge, up to 0.7 of the field of view a second.
function edgeScroll(t){
  vrEdgeRAF=0;
  if(!vrOn||!vrInspect||!vrInspectAt){ vrEdgeT=0; return; }
  const W=window.innerWidth, H=Math.max(window.innerHeight, 1), m=Math.max(24, Math.min(W, H)*0.06), [x, y]=vrInspectAt;
  const push=(p, L)=>p<m?-(1-Math.max(p, 0)/m):p>L-1-m?1-Math.max(L-1-p, 0)/m:0;
  const dx=push(x, W), dy=push(y, H);
  if(!dx&&!dy){ vrEdgeT=0; return; }
  const dt=vrEdgeT?Math.min(0.05, (t-vrEdgeT)/1000):0; vrEdgeT=t;
  const rate=0.7*H*dt;
  if(dt) lookVR(dx*Math.abs(dx)*rate, dy*Math.abs(dy)*rate);
  vrEdgeRAF=requestAnimationFrame(edgeScroll);
}
// A pointer that leaves the window stops the turning.
document.addEventListener('mouseout', e=>{ if(vrInspect&&!e.relatedTarget){ vrInspectAt=null; hideVRHoverTip(); } });
// The canvas pixel under page point (cx, cy).
function vrCanvasPx(cx, cy){
  const c=vrGL.gl.canvas, W=window.innerWidth, H=Math.max(window.innerHeight, 1);
  return {x:Math.min(c.width-1, Math.max(0, Math.floor(cx*c.width/W))), y:Math.min(c.height-1, Math.max(0, c.height-1-Math.floor(cy*c.height/H)))};
}
// Reads that do not wait for the GPU: vrReadAsync copies a pixel into a buffer, vrProbeAsk queues
// all a tooltip needs (the drawn colour, scenery hit, clouds, aurora) behind one fence, and
// vrAskPoll hands them over once the GPU has got there, a frame or so later. Waiting on readPixels
// instead stalls the page until everything drawn so far is finished.
const VR_PBOS=[];
let vrAsks=[], vrAskRAF=0;
// Each tooltip's reads share one buffer, 16 bytes apiece, and come back in one call.
function vrReadAsync(ask, fb, x, y, float){
  const gl=vrGL.gl, off=ask.n++*16;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
  if(fb) gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.readPixels(x, y, 1, 1, gl.RGBA, float?gl.FLOAT:gl.UNSIGNED_BYTE, off);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  return {off, float};
}
// done(px, view) is called with the pixels; it may return {show, measure, place}, each run for all
// the tooltips answered together in turn, so writes and reads of the layout are not interleaved
// and the page is laid out once.
function vrProbeAsk(cx, cy, done){
  const gl=vrGL.gl, c=gl.canvas, {x, y}=vrCanvasPx(cx, cy), ask={n:0, buf:VR_PBOS.pop()||gl.createBuffer()};
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ask.buf);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, 64, gl.STREAM_READ);
  const reads={col:vrReadAsync(ask, null, x, y, false)};
  if(vrScenery&&vrGL.hitInfo&&vrGL.hitMRT) reads.hit=vrReadAsync(ask, vrGL.hitFbo, Math.floor(x*vrGL.hitW/c.width), Math.floor(y*vrGL.hitH/c.height), true);
  if(vrClouds&&vrGL.accumFbo&&vrGL.cw) reads.accum=vrReadAsync(ask, vrGL.accumFbo, Math.floor(x*vrGL.cw/c.width), Math.floor(y*vrGL.ch/c.height), !!vrGL.cloudHDR);
  if(skyNow.aur&&skyNow.aur.on){
    const d=vrRayAt(cx, cy, vrYaw, vrPitch), app=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    const fb=auroraProbeDraw(gl, vrGL.aurStore||(vrGL.aurStore={}), skyNow.aur, horizDir(Math.atan2(d[0], d[1])*180/Math.PI, trueAltDeg(app)));
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ask.buf);
    if(fb) reads.aur=vrReadAsync(ask, fb, 0, 0, true);
    vrRestoreGL(gl);
  }
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  Object.assign(ask, {reads, done, view:[vrYaw, vrPitch], sync:gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)});
  gl.flush();
  vrAsks.push(ask);
  if(!vrAskRAF) vrAskRAF=requestAnimationFrame(vrAskPoll);
}
// Tooltips whose pixels are in are filled one or two a frame (each takes 1-2 ms), so several due
// together do not all land in one frame.
const VR_ASK_BUDGET=1.5;
function vrAskPoll(){
  vrAskRAF=0;
  if(!vrGL){ vrAsks=[]; return; }
  perfBeg('tooltips');
  const gl=vrGL.gl, t0=performance.now(), after=[];
  for(let i=0;i<vrAsks.length;){
    const a=vrAsks[i];
    if(after.length&&performance.now()-t0>VR_ASK_BUDGET) break;
    if(gl.getSyncParameter(a.sync, gl.SYNC_STATUS)!==gl.SIGNALED){ i++; continue; }
    vrAsks.splice(i, 1);
    gl.deleteSync(a.sync);
    const ab=new ArrayBuffer(a.n*16), px={};
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, a.buf); gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, new Uint8Array(ab)); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    VR_PBOS.push(a.buf);
    for(const k in a.reads){ const r=a.reads[k]; px[k]=r.float?new Float32Array(ab, r.off, 4):new Uint8Array(ab, r.off, 4); }
    if(px.aur) px.aur=Array.from(px.aur, v=>Math.max(0, v));
    const r=a.done(px, a.view);
    if(r) after.push(r);
  }
  for(const ph of ['show', 'measure', 'place']) for(const r of after) if(r[ph]) r[ph]();
  perfEnd('tooltips');
  if(vrAsks.length&&!vrAskRAF) vrAskRAF=requestAnimationFrame(vrAskPoll);
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
// What lies under page point (cx, cy): the view ray, the pixel, and the Sun, Moon, supernova,
// star or planet there, or the bare sky, cloud or ground. With throughCloud, a body behind a
// cloud still counts.
// The Sun's image under the view ray at azimuth comp (radians) and apparent altitude app (degrees),
// found as the sky shader's sunDiskAt finds it, from the same bands, refraction, inversion layers
// and mirage: the fraction of the disk's radius in the nearest band image that reaches the ray (r,
// 2 off the disk) and the ray's offset from the Sun's centre in that image (off), so a low,
// squeezed Sun is read where it is drawn.
function sunImageAt(comp, app){
  const sb=EP[dIdx].sun, rd=skyNow.moon.sunRadDeg*DISK_SCALE, sunRad=rd*Math.PI/180, {lay, mir}=sunsetLayers(rd);
  const H=vrGL.gl.canvas.height, fov=vrFov*Math.PI/180, px=2*Math.tan(fov/2)/H, wT=(performance.now()/1000)%1000;
  let ap=app+mir[3]*(0.6*Math.sin(comp*1432.4+wT*2.1)+0.4*Math.sin(comp*3610-wT*3.3))*Math.exp(-Math.max(app, 0)/rd);
  if(mir[0]>0&&ap<mir[0]) ap=mir[0]+(mir[0]-ap)*mir[1];
  let bend=sb.k*(ap>80?0:1/Math.tan((ap+7.31/(ap+4.4))*Math.PI/180)/60);
  for(let i=0;i<4;i++){
    if(lay[i*4+1]<=0) continue;
    const w=Math.max(lay[i*4+1], Math.tan(fov/2)/H*180/Math.PI);
    bend+=lay[i*4+2]*smooth01(lay[i*4]-w, lay[i*4]+w, ap);
  }
  const dispX=DISK_SCALE*(1+5*Math.exp(-Math.max(ap, 0)/0.6)), sd=horizDir(skyNow.sunAz, 90-skyNow.sza);
  let r=2, off=[0, 0, 0];
  for(let b=0;b<SUN_DISP.length;b++){
    const te=(ap-(1+dispX*(SUN_DISP[b]-1))*bend)*Math.PI/180, rv=[Math.sin(comp)*Math.cos(te), Math.cos(comp)*Math.cos(te), Math.sin(te)];
    const c=vdot(rv, sd), d=Math.acos(Math.max(-1, Math.min(1, c)));
    const gap=Math.max(dispX*Math.abs(SUN_DISP[b]-SUN_DISP[Math.min(b+1, SUN_DISP.length-1)])*bend*Math.PI/180, px);
    if(0.5+(sunRad-d)/gap<=0) continue;
    if(d/sunRad<r){ r=d/sunRad; off=[rv[0]-sd[0]*c, rv[1]-sd[1]*c, rv[2]-sd[2]*c]; }
  }
  return {r, off};
}
// With px, the pixels were read already (vrProbeAsk), under the view's yaw and pitch then (view).
function vrProbe(cx, cy, throughCloud, px, view){
  const gl=vrGL.gl, c=gl.canvas, W=window.innerWidth, H=Math.max(window.innerHeight, 1), {x, y}=vrCanvasPx(cx, cy);
  const d=view?vrRayAt(cx, cy, view[0], view[1]):vrRayAt(cx, cy, vrYaw, vrPitch);
  const app=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI, el=trueAltDeg(app);
  let az=Math.atan2(d[0], d[1])*180/Math.PI; if(az<0) az+=360;
  const P={x, y, d, app, el, az};
  const hit=px?px.hit:vrScenery&&vrGL.hitInfo&&vrGL.hitMRT?vrReadPixel(vrGL.hitFbo, Math.floor(x*vrGL.hitW/c.width), Math.floor(y*vrGL.hitH/c.height), true):null;
  if(app<0||(hit&&hit[0]>0)){ P.ground=true; return P; }
  if(vrClouds&&vrGL.accumFbo&&vrGL.cw&&!throughCloud){
    const a=px?px.accum:vrReadPixel(vrGL.accumFbo, Math.floor(x*vrGL.cw/c.width), Math.floor(y*vrGL.ch/c.height), !!vrGL.cloudHDR), s=vrGL.cloudHDR?1:1/255;
    if(a){ P.cloudPx={a:a[3]*s, rgb:[a[0]*s, a[1]*s, a[2]*s]}; P.cloud=P.cloudPx.a>0.35; }
  }
  const sep=(bAz, bEl)=>Math.acos(Math.max(-1, Math.min(1, vdot(d, horizDir(bAz, apparentEl(bEl))))))*180/Math.PI, mo=skyNow.moon;
  P.lit=!P.cloud&&mo.on?moonLitAt(horizDir(az, el), mo.radDeg*DISK_SCALE):null;
  P.moonXY=P.lit!=null?moonDiskXY(horizDir(az, el), mo.radDeg*DISK_SCALE):null;
  P.cr=sep(skyNow.sunAz, 90-skyNow.sza)/(mo.sunRadDeg*DISK_SCALE);
  // On the Sun: the image the shader draws there, its east and north from celestial north at the
  // Sun's true place, as the shader orients the spots.
  const im=!P.cloud&&P.lit==null&&skyNow.sunOn&&skyNow.sunVis>0.01&&P.cr<3?sunImageAt(Math.atan2(d[0], d[1]), app):null;
  P.disk=P.cloud?null:(P.lit!=null?'moon':(im&&im.r<1?'sun':null));
  if(P.disk==='sun'){
    P.r=im.r;
    const b=moonBasis({az:skyNow.sunAz, el:90-skyNow.sza}), sr=Math.sin(mo.sunRadDeg*DISK_SCALE*Math.PI/180);
    P.sunXY=[vdot(im.off, b.east)/sr, vdot(im.off, b.north)/sr];
  }
  // Within about 18 page pixels of a star, twice that of the supernova and its glare.
  // A meteor (or a lunar flash) within about 18 page pixels, in front of all but the clouds.
  P.meteor=P.cloud?null:metNearDir(d, 18*vrFov/H);
  if(P.meteor&&P.meteor.kind!=='flash'&&P.meteor.kind!=='lava'&&P.disk) P.meteor=null;
  P.sn=P.cloud||P.disk||P.meteor?null:snNear(horizDir(az, el), 36*vrFov/H);
  P.star=P.cloud||P.disk||P.sn||P.meteor?null:starNear(horizDir(az, el), 18*vrFov/H);
  return P;
}
// A click in inspect pins a tooltip to what was under it, and each further click pins another.
// The sky keeps its direction; the Sun and Moon keep the clicked spot on their disks, and a star,
// planet, satellite or supernova is followed as it moves. A new tooltip takes the side of its pin
// that overlaps the others least (vrPinSide), and keeps it.
// A pinned tooltip's lock turns the view with what it is pinned to (vrLockPin, applied by
// lockVRView before each paint; one pin at a time), and its close drops it. A body more than
// PIN_SET_DEG below the horizon drops its pin and any lock on it: the view is free again.
let vrPins=[], vrLockPin=null;
const PIN_SET_DEG=3;
const VR_LOCK_ICON=shut=>`<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor"/><path d="${shut?'M5 7V5a3 3 0 0 1 6 0v2':'M5 7V5a3 3 0 0 1 5.8-1.1'}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
function pinVRTip(cx, cy){
  if(!vrGL||!skyNow) return;
  const P=vrProbe(cx, cy, true), s=P.star;
  const onDisk=(b, d)=>({ox:vdot(d, b.east), oy:vdot(d, b.north)});
  let pin;
  if(P.sn) pin={kind:'sn'};
  else if(s&&(s.star||s.planet)) pin={kind:'mark', star:s.star, planet:s.planet, ra:s.ra, dec:s.dec};
  else if(s) pin={kind:'sat', az:s.az, el:s.el};
  else if(P.disk==='moon') pin={kind:'moon', ...onDisk(moonBasis(skyNow.moon), horizDir(P.az, P.el))};
  else if(P.disk==='sun') pin={kind:'sun', ...onDisk(vrSunBasis(), P.d)};
  else pin={kind:'sky', d:P.d};
  const root=document.getElementById('vr'), tip=document.createElement('div'), mark=document.createElement('div');
  tip.className='tip vrpintip'; mark.className='vrpinmark'; tip.style.display='none'; mark.setAttribute('aria-hidden', 'true');
  tip.innerHTML=`<div class="tbar"><button type="button" data-act="lock" aria-pressed="false" title="Lock the view to this" aria-label="Lock the view to this">${VR_LOCK_ICON(false)}</button><button type="button" data-act="close" title="Close" aria-label="Close">✕</button></div><span class="tline"></span><div class="spbox"></div>`;
  root.append(mark, tip);
  Object.assign(pin, {tip, mark, side:-1, size:[0, 0], sideFor:[0, 0]});
  tip.querySelector('[data-act=lock]').addEventListener('click', ()=>{ vrLockPin=vrLockPin===pin?null:pin; syncVRLockBtns(); requestVR(); });
  tip.querySelector('[data-act=close]').addEventListener('click', ()=>{ unpinVRTip(pin); requestVR(); });
  vrPins.push(pin);
  hideVRHoverTip();
  if(!vrInspectTimer) vrInspectTimer=setInterval(refreshVRTip, 250);
  refreshPin(pin);
}
function unpinVRTip(pin){
  vrPins=vrPins.filter(p=>p!==pin);
  pin.tip.remove(); pin.mark.remove();
  if(vrLockPin===pin){ vrLockPin=null; syncVRLockBtns(); }
  if(!vrInspect&&!vrPins.length){ clearInterval(vrInspectTimer); vrInspectTimer=0; }
}
function clearVRPins(){ for(const p of vrPins.slice()) unpinVRTip(p); }
function syncVRLockBtns(){
  for(const p of vrPins){
    const b=p.tip.querySelector('[data-act=lock]'), on=vrLockPin===p, was=b.getAttribute('aria-pressed')==='true';
    if(on===was) continue;
    b.setAttribute('aria-pressed', on?'true':'false'); b.innerHTML=VR_LOCK_ICON(on);
    const t=on?'Unlock the view':'Lock the view to this'; b.title=t; b.setAttribute('aria-label', t);
  }
}
function vrSunBasis(){ return moonBasis({az:skyNow.sunAz, el:apparentEl(90-skyNow.sza)}); }
// Page point of a view-frame direction (as vrRayAt's), or null off the view.
function vrPointOf(d){
  const W=window.innerWidth, H=Math.max(window.innerHeight, 1), fy=Math.tan(vrFov*Math.PI/360), fx=fy*W/H;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cyw=Math.cos(yaw), syw=Math.sin(yaw);
  const depth=d[0]*syw*cp+d[1]*cyw*cp+d[2]*sp;
  if(depth<0.02) return null;
  const u=(d[0]*cyw-d[1]*syw)/depth/fx, v=(-d[0]*syw*sp-d[1]*cyw*sp+d[2]*cp)/depth/fy;
  const cx=(u+1)/2*W, cy=(1-v)/2*H;
  return cx>=0&&cx<W&&cy>=0&&cy<H?[cx, cy]:null;
}
// The same for a direction given by azimuth and true altitude.
function vrPointAt(az, el){ return vrPointOf(horizDir(az, apparentEl(el))); }
// Where a pinned thing is: its direction in the view's frame (as vrRayAt's), its true altitude,
// and whether it shows, or null when it is gone. A star or planet below the horizon is no longer
// among the marks, so it is placed from its right ascension and declination.
function vrPinDir(p){
  if(!p||!skyNow) return null;
  const fromDisk=(b, trueFrame)=>{
    const d=vnorm(vadd(b.md, vscale(b.east, p.ox), vscale(b.north, p.oy)));
    if(!trueFrame) return d;
    const el=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI;
    return horizDir(Math.atan2(d[0], d[1])*180/Math.PI, apparentEl(el));
  };
  const at=(az, el, on)=>({d:horizDir(az, apparentEl(el)), el, on});
  if(p.kind==='sky') return {d:p.d, el:90, on:true};
  if(p.kind==='sun') return {d:fromDisk(vrSunBasis(), false), el:90-skyNow.sza, on:skyNow.sunOn};
  if(p.kind==='moon') return {d:fromDisk(moonBasis(skyNow.moon), true), el:skyNow.moon.el, on:skyNow.moon.on};
  if(p.kind==='sn'){ const sn=skyNow.sn; return sn?at(sn.az, sn.el, sn.el>0):null; }
  const marks=skyNow.starMarks||[];
  let m=null;
  if(p.kind==='mark'){
    m=marks.find(s=>p.star?s.star===p.star:s.planet===p.planet)||null;
    if(m){ p.ra=m.ra; p.dec=m.dec; }
    else if(p.ra!=null){ const q=raDecAltaz(LATDEG[dLat], p.ra, p.dec, localSidereal()); return at(q.az, q.alt, false); }
  }
  else{
    // A satellite has no name to find it by: the nearest one to where it was last.
    let best=Math.cos(10*Math.PI/180);
    const was=horizDir(p.az, p.el);
    for(const s of marks){ if(s.star||s.planet) continue; const c=vdot(was, horizDir(s.az, s.el)); if(c>best){ best=c; m=s; } }
    if(m){ p.az=m.az; p.el=m.el; }
    // Lost low down, it has set.
    else if(p.el<2) return {d:horizDir(p.az, p.el), el:-90, on:false};
  }
  return m?at(m.az, m.el, m.el>0):null;
}
// Where a pinned thing is on the page now, or null when it is out of view, set or gone.
function vrPinPoint(p){ const q=vrPinDir(p); return q&&q.on?vrPointOf(q.d):null; }
// Before each paint: drop the pins whose bodies have set, turn a view flying to or following
// something found to it (find.js), and turn a locked view to its pin.
function lockVRView(){
  for(const p of vrPins.slice()){ const q=vrPinDir(p); if(q&&q.el<-PIN_SET_DEG) unpinVRTip(p); }
  findStep();
  const q=vrLockPin&&vrPinDir(vrLockPin);
  if(!q) return;
  vrYaw=(Math.atan2(q.d[0], q.d[1])*180/Math.PI+360)%360;
  vrPitch=Math.max(-80, Math.min(85, Math.asin(Math.max(-1, Math.min(1, q.d[2])))*180/Math.PI));
}
function hideVRHoverTip(){ document.getElementById('vrtip').style.display='none'; }
function hideVRTip(){ hideVRHoverTip(); for(const p of vrPins){ p.tip.style.display='none'; p.mark.style.display='none'; } }
// The tooltip under the pointer in inspect (unless it is over a pinned one), and every pinned one.
// Each is filled when its pixels arrive (vrProbeAsk); one asked again while its pixels are on the
// way is asked once more when they come, at wherever it is then.
let vrOverPin=false;
function refreshVRTip(){
  if(vrOn&&vrGL&&skyNow&&vrInspect&&!vrOverPin&&vrInspectAt) askVRHoverTip(); else hideVRHoverTip();
  for(const p of vrPins) refreshPin(p);
}
const vrHover={asking:false, again:false};
function askVRHoverTip(){
  if(!vrOn||!vrGL||!skyNow) return;
  if(vrHover.asking){ vrHover.again=true; return; }
  const at=vrInspectAt;
  if(!at) return;
  vrHover.asking=true; vrHover.again=false;
  vrProbeAsk(at[0], at[1], (px, view)=>{
    vrHover.asking=false;
    if(vrHover.again) askVRHoverTip();
    const tip=document.getElementById('vrtip');
    if(!vrOn||!vrInspect||vrOverPin||!vrInspectAt){ hideVRHoverTip(); return null; }
    fillVRTip(tip, at[0], at[1], px, view);
    let size;
    return {show:()=>{ tip.style.display='block'; }, measure:()=>{ size=[tip.offsetWidth, tip.offsetHeight]; }, place:()=>placeVRHoverTip(at[0], at[1], size)};
  });
}
function refreshPin(p){
  if(!vrOn||!vrGL||!skyNow) return;
  if(p.asking){ p.again=true; return; }
  const at=vrPinPoint(p);
  if(!at){ p.tip.style.display='none'; p.mark.style.display='none'; return; }
  p.asking=true; p.again=false;
  vrProbeAsk(at[0], at[1], (px, view)=>{
    p.asking=false;
    if(!vrPins.includes(p)) return null;
    if(p.again) refreshPin(p);
    fillVRTip(p.tip, at[0], at[1], px, view);
    return {
      show:()=>{
        p.now=vrPinPoint(p);
        const v=p.now?'block':'none';
        p.tip.style.display=v; p.mark.style.display=v;
      },
      measure:()=>{ if(p.now) p.size=[p.tip.offsetWidth, p.tip.offsetHeight]; },
      place:()=>{
        if(!p.now) return;
        // The side is chosen once the tooltip has its size, and again if it grows or shrinks much (its
        // spectrum arriving, say).
        if(p.side<0||Math.abs(p.size[0]-p.sideFor[0])>24||Math.abs(p.size[1]-p.sideFor[1])>24){ p.side=vrPinSide(p, p.now); p.sideFor=p.size; }
        placePin(p, p.now);
      }};
  });
}
// Fill a tooltip with the colour and spectrum at page point (cx, cy), from pixels px read under view.
function fillVRTip(tip, cx, cy, px, view){
  const P=vrProbe(cx, cy, false, px, view), {el, az, app}=P, col=px.col;
  const cur=hex([col[0], col[1], col[2]]);
  if(!tip.querySelector('.tline')) tip.innerHTML='<span class="tline"></span><div class="spbox"></div>';
  // Written only when it changes, so an unchanged tooltip does not have to be laid out again.
  const line=tip.querySelector('.tline'), html=`<i style="background:${cur}"></i>${cur} · ${app.toFixed(1)}° up, ${Math.round(az)}°`;
  if(line._html!==html){ line.innerHTML=html; line._html=html; }
  const box=tip.querySelector('.spbox');
  if(P.ground) spectrumHTML(box, el, az, {note:'Ground and scenery are not part of the model, so they have no spectrum.'});
  else {
    const {sn, star, disk, lit}=P;
    const aurora=!star&&disk!=='sun'&&px.aur?px.aur:null;
    if(P.meteor) spectrumHTML(box, P.meteor.el, P.meteor.az, {meteor:P.meteor});
    else if(sn) spectrumHTML(box, sn.el, sn.az, {sn});
    else if(star) spectrumHTML(box, star.el, star.az, {star});
    else spectrumHTML(box, el, az, {disk, aurora, cloud:P.cloudPx, lit, r:P.r, cr:P.cr, moonXY:P.moonXY, sunXY:P.sunXY});
  }
}
// The hover tooltip takes the side of the pointer that overlaps the pinned tooltips least, as a
// new pin's does, keeping its last side while that does as well, so it does not flit about.
let vrHoverSide=0;
function placeVRHoverTip(cx, cy, size){
  const tip=document.getElementById('vrtip'), [w, h]=size;
  vrHoverSide=vrBestSide(w, h, [cx, cy], null, vrHoverSide);
  const [x, y]=pinBox(vrHoverSide, w, h, cx, cy);
  tip.style.left=x+'px'; tip.style.top=y+'px'; tip.style.transform='none';
}
// A pinned tooltip's box beside its pin at page point (cx, cy): to the right, left, above, below,
// or at a corner (side 0-7), kept on the page.
const VR_PIN_SIDES=[[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]];
function pinBox(side, w, h, cx, cy){
  const W=window.innerWidth, H=window.innerHeight, g=16, [sx, sy]=VR_PIN_SIDES[side];
  let x=sx>0?cx+g:sx<0?cx-g-w:cx-w/2, y=sy>0?cy+g:sy<0?cy-g-h:cy-h/2;
  x=Math.max(8, Math.min(W-w-8, x)); y=Math.max(8, Math.min(H-h-8, y));
  return [x, y, w, h];
}
// The side that overlaps the other pinned tooltips (and their pins) least, the first such in order.
function vrPinSide(p, at){ return vrBestSide(p.size[0], p.size[1], at, p, -1); }
// The same for a w by h box at page point at, beside every pinned tooltip but skip; side keep wins
// any tie it is in.
function vrBestSide(w, h, at, skip, keep){
  const others=[];
  for(const o of vrPins){
    // One answered in the same batch is shown before it is placed: until it is, it is nowhere.
    if(o===skip||o.tip.style.display==='none'||!o.tip.style.left) continue;
    others.push([parseFloat(o.tip.style.left), parseFloat(o.tip.style.top), o.size[0], o.size[1]]);
    const m=parseFloat(o.mark.style.left), n=parseFloat(o.mark.style.top);
    others.push([m-10, n-10, 20, 20]);
  }
  const lap=(a, b)=>Math.max(0, Math.min(a[0]+a[2], b[0]+b[2])-Math.max(a[0], b[0]))*Math.max(0, Math.min(a[1]+a[3], b[1]+b[3])-Math.max(a[1], b[1]));
  const mine=[at[0]-10, at[1]-10, 20, 20];
  // Its own point under its box counts too, as clamping to the page can push the box over it.
  const cost=s=>{ const box=pinBox(s, w, h, at[0], at[1]); return others.reduce((t, o)=>t+lap(box, o), 0)+lap(box, mine); };
  let best=0, bestLap=Infinity;
  for(let s=0;s<VR_PIN_SIDES.length;s++){ const L=cost(s); if(L<bestLap-0.5){ bestLap=L; best=s; } }
  return keep>=0&&cost(keep)<=bestLap+0.5?keep:best;
}
function placePin(p, at){
  const [x, y]=pinBox(p.side, p.size[0], p.size[1], at[0], at[1]);
  p.tip.style.left=x+'px'; p.tip.style.top=y+'px'; p.tip.style.transform='none';
  p.mark.style.left=at[0]+'px'; p.mark.style.top=at[1]+'px';
}
// Each frame, a pinned tooltip moves with what it is pinned to; its spectrum follows every 250 ms.
function followVRPin(){
  if(!vrOn) return;
  for(const p of vrPins){
    const at=vrPinPoint(p);
    if(!at){ p.tip.style.display='none'; p.mark.style.display='none'; continue; }
    // Not shown, or not yet given its side: it is shown and placed when its pixels are in.
    if(p.tip.style.display==='none'||p.side<0) refreshPin(p); else placePin(p, at);
  }
}
// Apparent altitude (degrees) to true (Bennett 1982, times refK), as the sky shader's trueAlt.
function trueAltDeg(a){ return a>80?a:a-refK()/Math.tan((a+7.31/(a+4.4))*Math.PI/180)/60; }
