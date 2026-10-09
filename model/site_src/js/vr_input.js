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
  if(!vrOn) return; if(momentClouds!==null){ vrClouds=momentClouds; momentClouds=null; } hideVRLoad(); if(vrGL&&vrGL.note) vrGL.note=''; if(vrInspect) setInspect(false, true); vrPin=null; hideVRTip(); clearInterval(vrInspectTimer); vrInspectTimer=0; vrHoldEsc(false); vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); document.getElementById('sunmark').hidden=true; document.getElementById('moonmark').hidden=true; document.getElementById('snmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
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
  if(vrPin||(vrInspect&&vrInspectAt)) refreshVRTip();
  requestVR();
}, {passive:false});
window.addEventListener('mousemove', e=>{ if(!vrOn) return; if(vrInspect){ vrInspectAt=[e.clientX, e.clientY]; if(!vrPin) refreshVRTip(); if(!vrEdgeRAF) vrEdgeRAF=requestAnimationFrame(edgeScroll); return; } if(!e.movementX&&!e.movementY) return; lookVR(e.movementX, e.movementY); });
window.addEventListener('pointerdown', e=>{ if(!vrOn) return; pokeVRMusic(); if(vrInspect){ if(e.button===0) pinVRTip(e.clientX, e.clientY); return; } if(document.pointerLockElement===vrc) return; vrRelock=true;
  const root=document.getElementById('vr'); if(!document.fullscreenElement&&root.requestFullscreen){ const p=root.requestFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
  lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); });
let vrTX=0, vrTY=0;
vrc.addEventListener('touchstart', e=>{ const t=e.touches[0]; vrTX=t.clientX; vrTY=t.clientY; }, {passive:true});
vrc.addEventListener('touchmove', e=>{ if(!vrOn) return; const t=e.touches[0]; lookVR(t.clientX-vrTX, t.clientY-vrTY); vrTX=t.clientX; vrTY=t.clientY; e.preventDefault(); }, {passive:false});
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
    if(e.key==='Escape'){ e.preventDefault(); if(vrInspect) setInspect(false); else exitVR(); return; }
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
// pixel's colour and the spectrum of the sky in that direction; a click pins it (pinVRTip).
// q again leaves inspect, and so does Esc where VR can hold it (vrHoldEsc). A pinned tooltip stays
// after inspect ends, until VR does.
let vrInspect=false, vrInspectAt=null, vrInspectTimer=0, vrEdgeRAF=0, vrEdgeT=0;
function setInspect(on, leaving){
  vrInspect=on; vrInspectAt=null;
  document.getElementById('vr').classList.toggle('inspect', on);
  if(!vrPin) hideVRTip();
  clearInterval(vrInspectTimer); vrInspectTimer=0;
  if(on||vrPin) vrInspectTimer=setInterval(refreshVRTip, 250);
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
document.addEventListener('mouseout', e=>{ if(vrInspect&&!e.relatedTarget){ vrInspectAt=null; if(!vrPin) hideVRTip(); } });
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
function vrProbe(cx, cy, throughCloud){
  const gl=vrGL.gl, c=gl.canvas, W=window.innerWidth, H=Math.max(window.innerHeight, 1);
  const x=Math.min(c.width-1, Math.max(0, Math.floor(cx*c.width/W))), y=Math.min(c.height-1, Math.max(0, c.height-1-Math.floor(cy*c.height/H)));
  const d=vrRayAt(cx, cy, vrYaw, vrPitch);
  const app=Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI, el=trueAltDeg(app);
  let az=Math.atan2(d[0], d[1])*180/Math.PI; if(az<0) az+=360;
  const P={x, y, d, app, el, az};
  const hit=vrScenery&&vrGL.hitInfo&&vrGL.hitMRT?vrReadPixel(vrGL.hitFbo, x, y, true):null;
  if(app<0||(hit&&hit[0]>0)){ P.ground=true; return P; }
  if(vrClouds&&vrGL.accumFbo&&vrGL.cw&&!throughCloud){
    const a=vrReadPixel(vrGL.accumFbo, Math.floor(x*vrGL.cw/c.width), Math.floor(y*vrGL.ch/c.height), !!vrGL.cloudHDR), s=vrGL.cloudHDR?1:1/255;
    if(a){ P.cloudPx={a:a[3]*s, rgb:[a[0]*s, a[1]*s, a[2]*s]}; P.cloud=P.cloudPx.a>0.35; }
  }
  const sep=(bAz, bEl)=>Math.acos(Math.max(-1, Math.min(1, vdot(d, horizDir(bAz, apparentEl(bEl))))))*180/Math.PI, mo=skyNow.moon;
  P.lit=!P.cloud&&mo.on?moonLitAt(horizDir(az, el), mo.radDeg*DISK_SCALE):null;
  P.disk=P.cloud?null:(P.lit!=null?'moon':(skyNow.sunOn&&skyNow.sunVis>0.01&&sep(skyNow.sunAz, 90-skyNow.sza)<mo.sunRadDeg*DISK_SCALE?'sun':null));
  // Within about 18 page pixels of a star, twice that of the supernova and its glare.
  P.sn=P.cloud||P.disk?null:snNear(horizDir(az, el), 36*vrFov/H);
  P.star=P.cloud||P.disk||P.sn?null:starNear(horizDir(az, el), 18*vrFov/H);
  return P;
}
// A click in inspect pins the tooltip to what was under it. The sky keeps its direction; the Sun
// and Moon keep the clicked spot on their disks, and a star, planet, satellite or supernova is
// followed as it moves. Another click pins it to whatever is there instead.
let vrPin=null;
function pinVRTip(cx, cy){
  if(!vrGL||!skyNow) return;
  const P=vrProbe(cx, cy, true), s=P.star;
  const onDisk=(b, d)=>({ox:vdot(d, b.east), oy:vdot(d, b.north)});
  if(P.sn) vrPin={kind:'sn'};
  else if(s&&(s.star||s.planet)) vrPin={kind:'mark', star:s.star, planet:s.planet};
  else if(s) vrPin={kind:'sat', az:s.az, el:s.el};
  else if(P.disk==='moon') vrPin={kind:'moon', ...onDisk(moonBasis(skyNow.moon), horizDir(P.az, P.el))};
  else if(P.disk==='sun') vrPin={kind:'sun', ...onDisk(vrSunBasis(), P.d)};
  else vrPin={kind:'sky', d:P.d};
  refreshVRTip();
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
// Where the pinned thing is on the page now, or null when it is out of view, set or gone.
function vrPinPoint(){
  const p=vrPin;
  if(!p||!skyNow) return null;
  const fromDisk=(b, trueFrame)=>{
    const d=vnorm(vadd(b.md, vscale(b.east, p.ox), vscale(b.north, p.oy)));
    return trueFrame?vrPointAt(Math.atan2(d[0], d[1])*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, d[2])))*180/Math.PI):vrPointOf(d);
  };
  if(p.kind==='sky') return vrPointOf(p.d);
  if(p.kind==='sun') return skyNow.sunOn?fromDisk(vrSunBasis(), false):null;
  if(p.kind==='moon') return skyNow.moon.on?fromDisk(moonBasis(skyNow.moon), true):null;
  if(p.kind==='sn'){ const sn=skyNow.sn; return sn&&sn.el>0?vrPointAt(sn.az, sn.el):null; }
  const marks=skyNow.starMarks||[];
  let m=null;
  if(p.kind==='mark') m=marks.find(s=>p.star?s.star===p.star:s.planet===p.planet)||null;
  else{
    // A satellite has no name to find it by: the nearest one to where it was last.
    let best=Math.cos(10*Math.PI/180);
    const was=horizDir(p.az, p.el);
    for(const s of marks){ if(s.star||s.planet) continue; const c=vdot(was, horizDir(s.az, s.el)); if(c>best){ best=c; m=s; } }
    if(m){ p.az=m.az; p.el=m.el; }
  }
  return m&&m.el>0?vrPointAt(m.az, m.el):null;
}
function hideVRTip(){ document.getElementById('vrtip').style.display='none'; document.getElementById('vrpin').style.display='none'; }
function refreshVRTip(){
  const tip=document.getElementById('vrtip');
  const at=vrOn&&vrGL&&skyNow?(vrPin?vrPinPoint():vrInspect?vrInspectAt:null):null;
  if(!at){ hideVRTip(); return; }
  const gl=vrGL.gl, [cx, cy]=at, P=vrProbe(cx, cy), {el, az, app}=P;
  const col=vrReadPixel(null, P.x, P.y, false);
  if(!col) return;
  const cur=hex([col[0], col[1], col[2]]);
  if(!tip.querySelector('.tline')) tip.innerHTML='<span class="tline"></span><div class="spbox"></div>';
  tip.querySelector('.tline').innerHTML=`<i style="background:${cur}"></i>${cur} · ${app.toFixed(1)}° up, ${Math.round(az)}°`;
  const box=tip.querySelector('.spbox');
  if(P.ground) spectrumHTML(box, el, az, {note:'Ground and scenery are not part of the model, so they have no spectrum.'});
  else {
    const {sn, star, disk, lit}=P;
    let aurora=null;
    if(!star&&disk!=='sun'&&skyNow.aur&&skyNow.aur.on){ aurora=auroraProbe(gl, vrGL.aurStore||(vrGL.aurStore={}), skyNow.aur, horizDir(az, el)); vrRestoreGL(gl); }
    if(sn) spectrumHTML(box, sn.el, sn.az, {sn});
    else if(star) spectrumHTML(box, star.el, star.az, {star});
    else spectrumHTML(box, el, az, {disk, aurora, cloud:P.cloudPx, lit});
  }
  tip.style.display='block';
  placeVRTip(cx, cy);
}
function placeVRTip(cx, cy){
  const tip=document.getElementById('vrtip'), mark=document.getElementById('vrpin'), W=window.innerWidth, H=window.innerHeight;
  const w=tip.offsetWidth, h=tip.offsetHeight;
  tip.style.left=Math.min(cx+16, W-w-8)+(cx+16+w>W-8?-(w+32):0)+'px';
  tip.style.top=Math.max(8, Math.min(H-h-8, cy-h/2))+'px';
  tip.style.transform='none';
  mark.style.display=vrPin?'block':'none';
  if(vrPin){ mark.style.left=cx+'px'; mark.style.top=cy+'px'; }
}
// Each frame, a pinned tooltip moves with what it is pinned to; its spectrum follows every 250 ms.
function followVRPin(){
  if(!vrOn||!vrPin) return;
  const at=vrPinPoint();
  if(!at){ hideVRTip(); return; }
  if(document.getElementById('vrtip').style.display==='none') refreshVRTip(); else placeVRTip(at[0], at[1]);
}
// Apparent altitude (degrees) to true (Bennett 1982), as the sky shader's trueAlt.
function trueAltDeg(a){ return a>80?a:a-1/Math.tan((a+7.31/(a+4.4))*Math.PI/180)/60; }
