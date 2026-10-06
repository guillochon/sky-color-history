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
function enterVR(fromLink){
  const root=document.getElementById('vr'); root.classList.add('on'); root.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
  vrOn=true; vrLockedOnce=false; vrX=0; vrY=0; vrHeld.clear();
  // Lock before any shader work. A long link used to expire the click, so the pointer never captured and yaw stopped at the window edge.
  vrRelock=true; lockLook();
  const fsNow=root.requestFullscreen?root.requestFullscreen():null; if(fsNow&&fsNow.catch) fsNow.catch(()=>{});
  if(!initVR()){
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
  if(!vrNav){
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
}
function lockLook(){
  if(vrTouch||!vrOn||document.pointerLockElement===document.getElementById('vrc')) return;
  const p=document.getElementById('vrc').requestPointerLock(); if(p&&p.catch) p.catch(()=>{});
}
function exitVR(){
  if(!vrOn) return; vrOn=false; stopVRMusic(); vrRelock=false; vrLinkKey=''; vrHeld.clear(); document.getElementById('sunmark').hidden=true; document.getElementById('moonmark').hidden=true; if(vrWalk){ cancelAnimationFrame(vrWalk); vrWalk=0; }
  if(!vrNav) clearVRLink();
  const root=document.getElementById('vr'); root.classList.remove('on','locked'); root.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  if(document.pointerLockElement) document.exitPointerLock();
  if(document.fullscreenElement){ const p=document.exitFullscreen(); if(p&&p.catch) p.catch(()=>{}); }
  adoptPlayRate();
  renderDay(false);
}
document.getElementById('vrbtn').addEventListener('click', ()=>enterVR(false));
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
window.addEventListener('mousemove', e=>{ if(!vrOn) return; if(!e.movementX&&!e.movementY) return; lookVR(e.movementX, e.movementY); });
window.addEventListener('pointerdown', ()=>{ if(!vrOn) return; pokeVRMusic(); if(document.pointerLockElement===vrc) return; vrRelock=true; lockLook(); setTimeout(()=>{ vrRelock=false; }, 400); });
let vrTX=0, vrTY=0;
vrc.addEventListener('touchstart', e=>{ const t=e.touches[0]; vrTX=t.clientX; vrTY=t.clientY; }, {passive:true});
vrc.addEventListener('touchmove', e=>{ if(!vrOn) return; const t=e.touches[0]; lookVR(t.clientX-vrTX, t.clientY-vrTY); vrTX=t.clientX; vrTY=t.clientY; e.preventDefault(); }, {passive:false});
window.addEventListener('resize', ()=>{ if(vrOn){ sizeVR(); paintVR(); } });
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
  if(!vrOn||!vrLockedOnce) return;
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
    if(k==='h'&&!e.repeat){ e.preventDefault(); vrScenery=!vrScenery; paintVR(); syncVRPad(); return; }
    if(k==='c'&&!e.repeat){ e.preventDefault(); vrClouds=!vrClouds; paintVR(); syncVRPad(); return; }
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
  if(document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='SELECT') return;
  if(e.key==='ArrowRight'&&tIdx<EP.length-1){tslider.value=tIdx+1;showEpoch(tIdx+1);}
  if(e.key==='ArrowLeft'&&tIdx>0){tslider.value=tIdx-1;showEpoch(tIdx-1);}
});
function syncVRPad(){
  const set=(id,on)=>{ const b=document.getElementById(id); if(b) b.setAttribute('aria-pressed', on?'true':'false'); };
  set('vrpad-scenery', vrScenery);
  set('vrpad-clouds', vrClouds);
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
    if(act==='scenery'){ vrScenery=!vrScenery; paintVR(); }
    else if(act==='clouds'){ vrClouds=!vrClouds; paintVR(); }
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
