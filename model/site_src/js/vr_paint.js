function sizeVR(){
  const c=document.getElementById('vrc'), dpr=Math.min(window.devicePixelRatio||1, 2);
  const w=Math.max(2, Math.round(window.innerWidth*dpr)), h=Math.max(2, Math.round(window.innerHeight*dpr));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  if(vrGL){ vrGL.gl.viewport(0,0,c.width,c.height); }
}
function mtnSnowFor(key){
  if(key==='kpg66'||key==='snowball07') return 1;
  if(key==='modern'||key==='ozonehole'||key==='geminga'||key==='zetaoph') return 1;
  if(key==='modernpoll'||key==='y2100') return 0.75;
  if(key==='carbon30') return 0.35;
  if(key==='proterozoic22'||key==='ordovician466') return 0.2;
  return 0;
}
function scRad(k, r){ return (k>0.5&&k<1.5)?r*1.28:(k>1.5&&k<2.5)?r*1.12:(k>2.5&&k<3.5)?r*1.08:r; }
const MTN_SCALE=0.67; // massif and hill heights relative to the original layout
// Zones: [bearing deg, distance m, kind, radius m]. Cities and neighbourhoods draw a building
// count instead, and their radius follows from it and the lot occupancy in lotOcc (70% of city
// lots, 77% of house lots). Woods are lot grids too; pools are drawn by the sky shader.
const WATER=[[30,350,'water',120],[95,600,'water',220],[320,500,'water',180],[60,1500,'water',400]];
const ZONES={
  hadean44:[[30,330,'magma',90],[95,520,'magma',150],[320,430,'magma',120],[255,1300,'magma',260],[40,1500,'magma',300]],
  hadean40:[[30,330,'water',100],[95,520,'magma',140],[320,430,'water',130],[255,1300,'water',280],[40,1500,'magma',260]],
  archean38:WATER, archean27thin:WATER, archean27:WATER, archean27vthick:WATER,
  proterozoic22:[[20,520,'water',180],[300,720,'water',250],[100,480,'water',120]],
  snowball07:[[30,320,'ice',120],[300,520,'ice',200],[60,700,'ice',160]],
  carbon30:[[0,560,'carb',300],[70,520,'carb',230],[140,720,'carb',350],[205,560,'carb',260],[265,860,'carb',420],[325,620,'carb',270],[105,170,'swamp',55],[235,150,'swamp',45],[350,130,'swamp',40]],
  // No land plants yet beyond mosses and crusts; shallow seas flooded the continents.
  ordovician466:[[20,600,'water',260],[110,900,'water',380],[230,480,'water',150],[300,1400,'water',420]],
  kpg66:[[20,520,'dead',260],[300,650,'dead',300],[110,300,'water',70]],
  zetaoph:[[20,520,'wood',260],[300,650,'wood',300],[80,800,'wood',280],[110,330,'water',90],[240,500,'water',130]],
  geminga:[[20,520,'wood',260],[300,650,'wood',300],[80,800,'wood',280],[110,330,'water',90],[240,500,'water',130]],
  volcanic:[[20,520,'wood',260],[80,720,'wood',300],[320,640,'wood',280],[120,330,'water',90]],
  ozonehole:[[60,3000,'city'],[190,2600,'city'],[150,620,'hood'],[230,950,'hood'],[310,1400,'hood'],[10,900,'wood',280],[100,1300,'wood',300],[270,520,'water',140]],
  modern:[[35,2800,'city'],[215,3200,'city'],[175,560,'hood'],[125,1150,'hood'],[265,1300,'hood'],[340,800,'wood',300],[70,900,'wood',260],[250,600,'water',140]],
  modernpoll:[[20,2400,'city'],[80,3100,'city'],[180,2000,'city'],[290,2900,'city'],[130,700,'hood'],[235,820,'hood'],[330,700,'wood',220],[40,750,'water',130]],
  y2100:[[0,2600,'city'],[95,2300,'city'],[220,3000,'city'],[160,620,'hood'],[275,1050,'hood'],[45,1250,'hood'],[330,650,'wood',250],[100,800,'wood',240],[215,700,'water',120]],
};
const ZONE_TYPE={city:1, hood:2, wood:3, carb:4, dead:5}, POND_KIND={water:0, magma:1, ice:2, swamp:3};
const TOWNS={ozonehole:1, modern:1, modernpoll:1, y2100:1};
const TOWN_MTNS=[[300,7500,2000,1200,1],[20,9000,2400,1400,1],[160,11000,2800,1600,1],[250,6400,1500,800,1],[70,8000,2200,1400,1],[115,5600,1300,700,1],[200,8500,2000,1100,1],[340,6200,1500,900,1]];
// t: town[16] for the hit shader (pools go in as type 0 so hills keep out). p: pond[8] for the sky.
function townsFor(key){
  const list=ZONES[key]||[], t=new Float32Array(64), p=new Float32Array(32);
  let tn=0, pn=0;
  list.forEach((s, i)=>{
    const a=s[0]*Math.PI/180, x=Math.sin(a)*s[1], y=Math.cos(a)*s[1];
    let R=s[3];
    if(s[2]==='city'||s[2]==='hood'){
      const city=s[2]==='city', r=h12xy(i*3.7+1.3, key.length*5.1+0.7);
      const n=city?80+Math.floor(r*41):250+Math.floor(r*251);
      R=(city?42:24)*Math.sqrt(n/((city?0.70:0.773)*Math.PI));
    }
    t.set([x, y, R, ZONE_TYPE[s[2]]||0], tn*4); tn++;
    if(s[2] in POND_KIND){ p.set([x, y, R, POND_KIND[s[2]]], pn*4); pn++; }
  });
  return {t, tn, p, pn};
}
const sceneCache={};
function sceneFor(key){ return sceneCache[key]||(sceneCache[key]=buildScene(key)); }
function buildScene(key){ // [bearing deg, distance m, radius m, height m, kind]; kinds 1 and 2 are procedural massifs
  const spots=list=>{ const o=new Float32Array(48), k=new Float32Array(12);
    for(let i=0;i<12;i++){ const s=list[i]; if(!s) continue; const a=s[0]*Math.PI/180; o[i*4]=Math.sin(a)*s[1]; o[i*4+1]=Math.cos(a)*s[1]; o[i*4+2]=s[2]; o[i*4+3]=s[4]<2.5?s[3]*MTN_SCALE:s[3]; k[i]=s[4]; }
    const tw=townsFor(key);
    return {o, k, ...tw, ...roadsFor(o, k, tw.t, tw.tn)}; };
  const VOLC=[[175,320,80,150,2],[205,560,130,240,2],[140,900,200,340,2],[250,3000,700,520,2],[310,5200,1400,1000,1],[350,8000,2200,1500,1],[100,9000,2500,1600,1],[160,7000,1800,1100,1],[230,11000,2800,1700,1],[40,6500,1600,900,1],[70,4200,1100,780,1],[280,4800,1000,640,1]];
  const ICE=[[165,900,350,260,3],[200,1500,500,420,3],[120,1900,600,380,3],[240,2600,800,600,3],[300,3500,1100,700,3],[30,5000,1500,900,3],[90,7000,2000,1100,3],[190,8000,1800,1000,3],[260,10000,2600,1300,3],[330,6000,1600,900,3],[60,3000,900,500,3]];
  const TREES=[[40,6000,1600,900,1],[140,8500,2200,1300,1],[230,5000,1400,750,1],[310,10000,2500,1500,1],[100,7000,1800,1000,1],[190,9000,2400,1400,1]];
  const PEAKS=[[170,380,110,190,1],[200,720,170,300,1],[140,1200,260,420,1],[55,4200,1300,800,1],[95,2200,700,420,1],[230,4500,1400,880,1],[280,2600,800,500,1],[330,3800,1100,700,1],[70,8000,2200,1400,1],[160,9500,2600,1600,1],[240,7000,1800,1100,1],[310,11000,2800,1500,1]];
  if(key==='snowball07') return spots(ICE);
  if(key==='carbon30') return spots(TREES);
  if(TOWNS[key]) return spots(TOWN_MTNS);
  if(key==='hadean44'||key==='hadean40'||key==='archean38'||key==='archean27thin'||key==='archean27'||key==='archean27vthick'||key==='volcanic') return spots(VOLC);
  return spots(PEAKS);
}
function fract(x){ return x-Math.floor(x); }
function h12xy(x, y){
  let qx=fract(x*0.1031), qy=fract(y*0.1030), qz=fract(x*0.0973);
  const d=qx*(qy+33.33)+qy*(qz+33.33)+qz*(qx+33.33);
  qx+=d; qy+=d; qz+=d;
  return fract((qx+qy)*qz);
}
function smoothstep(e0, e1, x){
  const t=Math.min(1, Math.max(0, (x-e0)/Math.max(e1-e0, 1e-6)));
  return t*t*(3-2*t);
}
function peakEnv(x, y, cx, cy, R, H){
  const u=Math.hypot(x-cx, y-cy)/R;
  if(u>=1) return 0;
  const core=Math.pow(1-smoothstep(0, 0.74, u), 1.18);
  const skirt=Math.pow(1-u, 1.9);
  return (core*0.78+skirt*0.22)*H;
}
// The hill in 1800 m cell (gx, gy), as [cx, cy, R], or null. Mirrors marchLand in the hit shader.
const HILL_CELL=1800;
function hillIn(gx, gy){
  if(h12xy(gx, gy)<0.46) return null;
  const jx=h12xy(gx+1.7, gy+1.7), jy=h12xy(gx+3.1, gy+3.1);
  return [(gx+0.5+(jx-0.5)*0.44)*HILL_CELL, (gy+0.5+(jy-0.5)*0.44)*HILL_CELL, 140+h12xy(gx+5.5, gy+5.5)*(340-140)];
}
function hillHeight(x, y){
  const gx=Math.floor(x/HILL_CELL), gy=Math.floor(y/HILL_CELL), hill=hillIn(gx, gy);
  if(!hill) return 0;
  const [cx, cy, R]=hill;
  const H=(100+h12xy(gx+8.2, gy+8.2)*(280-100))*MTN_SCALE;
  if(!hillClear(cx, cy, R)) return 0;
  const Rm=R*1.28;
  let h=0;
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4, ox=Math.cos(a), oy=Math.sin(a);
    h=Math.max(h, peakEnv(x, y, cx+ox*Rm*0.09, cy+oy*Rm*0.09, Rm*0.88, H));
    h=Math.max(h, peakEnv(x, y, cx-ox*Rm*0.36, cy-oy*Rm*0.36, Rm*0.50, H*0.74));
    h=Math.max(h, peakEnv(x, y, cx-oy*Rm*0.40, cy+ox*Rm*0.40, Rm*0.38, H*0.56));
  }
  return h*1.06;
}
function landHeight(x, y){ return hillHeight(x, y); }
// Mirrors hillClear in the hit shader.
function hillClear(cx, cy, R){ const sc=sceneFor(EP[dIdx].key); return hillClearOf(sc.t, sc.tn, cx, cy, R); }
// Whether a hill at (cx, cy) of radius R stays out of the tn towns in t.
function hillClearOf(t, tn, cx, cy, R){
  for(let i=0;i<tn;i++){ if(Math.hypot(cx-t[i*4], cy-t[i*4+1])<t[i*4+2]+R*1.28+60) return false; }
  return true;
}
function lotCell(ty){ return ty<1.5?42:ty<2.5?24:10; }
// Solid footprints on lot (gx, gy) of town i, as [x0, y0, x1, y1] boxes, buildings and tree
// trunks alike. Mirrors lotOcc, lotCorner, towerT, houseLot, forestTree, and yardTree in the
// hit shader.
function townLot(sc, i, gx, gy){
  const tx=sc.t[i*4], ty=sc.t[i*4+1], R=sc.t[i*4+2], type=sc.t[i*4+3], city=type<1.5, cell=lotCell(type);
  if(type<0.5) return [];
  const r=Math.hypot((gx+0.5)*cell-tx, (gy+0.5)*cell-ty)/R;
  if(r>=1) return [];
  const p=city?0.95+(0.45-0.95)*r*r:type<2.5?0.92+(0.70-0.92)*r:0.85+(0.3-0.85)*r*r;
  if(h12xy(gx*1.31+17, gy*1.31+17)>=p) return [];
  const trunk=(cx, cy)=>[cx-0.6, cy-0.6, cx+0.6, cy+0.6];
  if(type>2.5){
    const rc=type>4.5?0.6:2.2+2*h12xy(gx+2.1, gy+8.4);
    return [trunk(gx*cell+rc+h12xy(gx+4.2, gy+0.6)*(cell-2*rc), gy*cell+rc+h12xy(gx+0.8, gy+6.1)*(cell-2*rc))];
  }
  const corner=(g, w, pitch, h)=>{ const lo=pitch*Math.ceil((g*cell+2.5)/pitch), hi=g*cell+cell-2.5-w; return lo+pitch*Math.floor(h*(Math.floor((hi-lo)/pitch)+1)); };
  let w, pitch;
  if(city){ w=[3*Math.floor(6+6.99*h12xy(gx+2.1, gy+8.4)), 3*Math.floor(6+6.99*h12xy(gx+9.7, gy+3.3))]; pitch=3; }
  else {
    w=[3.6*(h12xy(gx+2.1, gy+8.4)>0.5?4:3), 3.6*(h12xy(gx+9.7, gy+3.3)>0.6?3:2)];
    if(h12xy(gx+7.7, gy+2.2)>0.5) w=[w[1], w[0]];
    pitch=3.6;
  }
  const x0=corner(gx, w[0], pitch, h12xy(gx+4.2, gy+0.6)), y0=corner(gy, w[1], pitch, h12xy(gx+0.8, gy+6.1));
  const out=[[x0, y0, x0+w[0], y0+w[1]]];
  if(!city && h12xy(gx+6.2, gy+1.9)<=0.6){
    const lo=[gx*cell, gy*cell], gl=[x0-lo[0], y0-lo[1]], gh=[lo[0]+cell-x0-w[0], lo[1]+cell-y0-w[1]];
    const alongX=Math.max(gl[0], gh[0])>Math.max(gl[1], gh[1]);
    const gap=alongX?Math.max(gl[0], gh[0]):Math.max(gl[1], gh[1]), rc=Math.min(3.6, gap*0.5-0.3), along=h12xy(gx+1.4, gy+5.5);
    if(rc>=1.6){
      const c=alongX?[gl[0]>gh[0]?lo[0]+gl[0]*0.5:x0+w[0]+gh[0]*0.5, lo[1]+rc+along*(cell-2*rc)]:[lo[0]+rc+along*(cell-2*rc), gl[1]>gh[1]?lo[1]+gl[1]*0.5:y0+w[1]+gh[1]*0.5];
      if(Math.min(Math.abs(c[0]-48*Math.round(c[0]/48)), Math.abs(c[1]-120*Math.round(c[1]/120)))>=3.2) out.push(trunk(c[0], c[1]));
    }
  }
  return out;
}
function townSolid(sc, x, y, pad){
  for(let i=0;i<sc.tn;i++){
    const cell=lotCell(sc.t[i*4+3]);
    for(const f of townLot(sc, i, Math.floor(x/cell), Math.floor(y/cell)))
      if(x>f[0]-pad && x<f[2]+pad && y>f[1]-pad && y<f[3]+pad) return true;
  }
  return false;
}
function eyeZ(){ return vrScenery?2+landHeight(vrX, vrY):2; }
// The ground's colour under the sky's light and sunlight mu (sunMu in paintVR).
function groundRGB(mu){
  const alb=LAND[EP[dIdx].key]||[.2,.18,.14], cg=skyNow.colgrid, NR=skyNow.nr, NA=skyNow.na;
  let ar=0,ag=0,ab=0,n=0; const ir=Math.round(NR*0.45);
  for(let ia=0; ia<=NA; ia+=8){ const c=(ir*(NA+1)+ia)*3; ar+=cg[c]; ag+=cg[c+1]; ab+=cg[c+2]; n++; }
  ar=ar/n*0.65+cg[0]*0.35; ag=ag/n*0.65+cg[1]*0.35; ab=ab/n*0.65+cg[2]*0.35;
  const s=skyNow.sunRGB, amb=[ar,ag,ab];
  return new Float32Array(alb.map((a,i)=>Math.min(255, a*(0.42*amb[i]+1.25*mu*s[i]+16))/255));
}
function ensureHitTarget(w, h){
  const gl=vrGL.gl;
  if(vrGL.hitW===w&&vrGL.hitH===h&&vrGL.hitInfo) return;
  vrGL.hitW=w; vrGL.hitH=h;
  vrGL.hitMRT=hitPair(gl, w, h, 'hitInfo', 'hitNrm', vrGL.hitFbo);
  // The land pair belongs to the old size, so make it again when next needed.
  for(const k of ['landInfo', 'landNrm']) if(vrGL[k]){ gl.deleteTexture(vrGL[k]); vrGL[k]=null; }
  if(!vrGL.hitMRT&&vrGL.hitFloat){ vrGL.hitFloat=false; vrGL.hitW=0; ensureHitTarget(w, h); }
}
// hitInfo and hitNrm hold the scenery the other passes read. With a town pass, the land pass
// draws into landInfo and landNrm, and the town pass carries them over into hitInfo and hitNrm.
function ensureLandTarget(w, h){
  if(vrGL.landInfo) return vrGL.landMRT;
  vrGL.landFbo=vrGL.landFbo||vrGL.gl.createFramebuffer();
  return vrGL.landMRT=hitPair(vrGL.gl, w, h, 'landInfo', 'landNrm', vrGL.landFbo);
}
// Make vrGL[a] and vrGL[b] at this size and attach them to fb. Says whether fb is complete.
function hitPair(gl, w, h, a, b, fb){
  const alloc=()=>{
    const t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, vrGL.hitFloat?gl.RGBA32F:gl.RGBA16F, w, h, 0, gl.RGBA, vrGL.hitFloat?gl.FLOAT:gl.HALF_FLOAT, null);
    return t;
  };
  for(const k of [a, b]){ if(vrGL[k]) gl.deleteTexture(vrGL[k]); vrGL[k]=alloc(); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL[a], 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vrGL[b], 0);
  const ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return ok;
}
// Whether a pool that moves (water, swamp, or magma) is on screen and within 6 km.
function movingPoolInView(){
  if(!vrScenery || vrPitch-vrFov*0.5>0) return false;
  const sc=sceneFor(EP[dIdx].key), c=document.getElementById('vrc');
  const half=Math.atan(Math.tan(vrFov*Math.PI/360)*c.width/Math.max(c.height, 1))*180/Math.PI;
  for(let i=0;i<sc.pn;i++){
    if(sc.p[i*4+3]===POND_KIND.ice) continue;
    const dx=sc.p[i*4]-vrX, dy=sc.p[i*4+1]-vrY, d=Math.hypot(dx, dy), R=sc.p[i*4+2]*1.3;
    if(d<R) return true;
    if(d>6000) continue;
    const off=Math.abs(((Math.atan2(dx, dy)*180/Math.PI-vrYaw)%360+540)%360-180);
    if(off<half+Math.asin(R/d)*180/Math.PI) return true;
  }
  return false;
}
// The Moon and the supernova light the scene in proportion to 0.6 times the square root of
// their brightness relative to the full Moon (see paintVR); lowAir dims them near the horizon.
function lowAir(el){ return smoothstep(-0.5, 6, el)*Math.exp(-0.25/Math.max(Math.sin(Math.max(el, 0.5)*Math.PI/180), 0.05)); }
function nightLight(rgb, rel, el, night){ const f=0.6*Math.sqrt(Math.max(rel, 0))*lowAir(el)*night; return new Float32Array([rgb[0]*f, rgb[1]*f, rgb[2]*f]); }
// Text in the VR heads-up display, written only when it changes.
function setText(el, text){ if(el.textContent!==text) el.textContent=text; }
function paintVR(){
  if(!vrOn||!vrGL||!skyNow) return;
  // This paint answers any one already asked for.
  if(vrRAF){ cancelAnimationFrame(vrRAF); vrRAF=0; }
  // A sky drawn for the page has no star cells for VR: draw it again for VR, which paints.
  if(!skyNow.starBins){ renderDay(true); return; }
  // A locked view turns with its pin first; a pin whose body has set goes.
  lockVRView();
  // A program compiled from scratch can stall the browser on its first draw. Put up a note,
  // let it reach the screen, then draw.
  pickHit(vrGL.gl);
  const firsts=[vrScenery&&vrGL.hitProg, vrScenery&&vrGL.townProg, vrClouds&&vrGL.cloudProg].filter(p=>p&&vrSlow.has(p));
  if(firsts.length){
    if(vrGL.note==='waiting') return;
    if(vrGL.note!=='shown'){
      vrGL.note='waiting';
      showVRLoad('Preparing '+andList([...new Set(firsts.map(p=>vrSlow.get(p)))])+'…');
      afterPaint(()=>{ if(vrGL&&vrGL.note==='waiting'){ vrGL.note='shown'; paintVR(); } });
      return;
    }
  }
  const {gl,u,tex}=vrGL, c=gl.canvas;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.BLEND); gl.drawBuffers([gl.BACK]);
  gl.viewport(0,0,c.width,c.height);
  gl.useProgram(vrGL.prog);
  const h=skyNow.nr+1, w=skyNow.na+1;
  if(skyUploaded!==skyNow.gen){
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    if(vrGL.skyW===w && vrGL.skyH===h) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, skyTexData(skyNow));
    else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, skyTexData(skyNow)); vrGL.skyW=w; vrGL.skyH=h; }
    skyUploaded=skyNow.gen;
  }
  gl.uniform1f(u.nr, h-1); gl.uniform1f(u.na, w-1);
  syncMoonTex();
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vrGL.moonTex);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform2f(u.res, c.width, c.height); gl.uniform1f(u.fov, vrFov*Math.PI/180);
  gl.uniform1f(u.yaw, vrYaw*Math.PI/180); gl.uniform1f(u.pitch, vrPitch*Math.PI/180);
  const ez=eyeZ();
  gl.uniform3f(u.eye, vrX, vrY, ez);
  gl.uniform1f(u.sunAz, skyNow.sunAz); gl.uniform1f(u.sunEl, 90-skyNow.sza);
  gl.uniform1f(u.moonAz, skyNow.moon.az); gl.uniform1f(u.moonEl, skyNow.moon.el);
  gl.uniform1f(u.moonRad, skyNow.moon.rad*DISK_SCALE); gl.uniform1f(u.moonOn, skyNow.moon.on?1:0);
  gl.uniform1f(u.latRad, LATDEG[dLat]*Math.PI/180);
  // The lunar eclipse's shadow table, sent once per epoch, and its place on the disk.
  // The table changes as the Moon moves through the shadow. Unit 6 also holds the clouds' 3D
  // noise, on its own target, so the table is bound each time.
  const lu=skyNow.lunar;
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, vrGL.eclTex);
  if(lu&&vrGL.eclLut!==lu.lut){
    const b=new Uint8Array(LUN_LUT_N*4);
    for(let i=0;i<LUN_LUT_N;i++){ for(let q=0;q<3;q++) b[i*4+q]=linToByte(lu.lut[i*3+q]); b[i*4+3]=255; }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, LUN_LUT_N, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
    vrGL.eclLut=lu.lut;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform4f(u.eclU, lu?lu.c[0]:0, lu?lu.c[1]:0, lu?lu.k:0, lu?1:0);
  gl.uniform1f(u.sunOn, skyNow.sunOn?1:0);
  gl.uniform1f(u.sunRad, skyNow.moon.sunRadDeg*DISK_SCALE*Math.PI/180);
  // The photosphere's spots and faculae, once the day's map is made.
  const sunPx=skyNow.moon.sunRadDeg*DISK_SCALE*Math.PI/180/(2*Math.tan(vrFov*Math.PI/360)/c.height);
  const sm=syncSunTex(sunPx), so=sm&&sunOrientation(sm.A.key, astroDay()), sT=astroDay();
  gl.uniform4f(u.sunOri, so?so.P:0, so?so.B0:0, so?so.phase:0, so?1:0);
  gl.uniform4f(u.sunDrift, sm?sT-sm.A.D:0, sm&&sm.B?sT-sm.B.D:0, sm&&sm.B?sm.f:0, sT-3650*Math.floor(sT/3650));
  gl.uniform1f(u.corona, skyNow.corona||0);
  gl.uniform1fv(u.coronaMap, skyNow.coronaMap||coronaMap(EP[dIdx].key)); gl.uniform1f(u.coronaRim, skyNow.coronaRim??1);
  // The night sky: the display curve, the Milky Way (uploaded once it is built), and limits.
  gl.uniform4f(u.toneU, skyNow.toneK, skyNow.toneP, 0.95, TOE_CD);
  gl.uniform1f(u.rCd, skyNow.rCd); gl.uniform1f(u.mwK, skyNow.extK);
  if(mwMap && !vrGL.mwTex){
    const t=gl.createTexture(), half=new Float32Array(mwMap.length);
    for(let i=0;i<half.length;i++) half[i]=mwMap[i]*1e4;
    gl.activeTexture(gl.TEXTURE13); gl.bindTexture(gl.TEXTURE_2D, t);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, MW_W, MW_H, 0, gl.RED, gl.FLOAT, half);
    gl.activeTexture(gl.TEXTURE0); vrGL.mwTex=t;
  }
  gl.uniform1f(u.mwOn, vrGL.mwTex&&skyNow.gal?1:0);
  if(vrGL.mwTex&&skyNow.gal){
    gl.uniform1f(u.mwScale, 1e-4*extZenith(EP[dIdx].key)/skyNow.rCd); gl.uniform1f(u.mwDB, skyNow.gal.db||0);
    gl.uniform3fv(u.galX, skyNow.gal[0]); gl.uniform3fv(u.galY, skyNow.gal[1]); gl.uniform3fv(u.galZ, skyNow.gal[2]);
  }
  gl.uniform4fv(u.beads, skyNow.beads||new Float32Array(24));
  // The setting Sun (sunset.js): the epoch's bands, the light at the disk's middle, the day's layers.
  const sb=EP[dIdx].sun, rd=skyNow.moon.sunRadDeg*DISK_SCALE, sl=sunsetLayers(rd);
  // Each channel's gain keeps sunCol at the disk's middle. It is held to at least the brightest
  // channel's, so a colour the display curve has dropped from sunCol (the blue at sunset) still
  // shows where it is all that is left: a blue flash.
  const app=apparentEl(90-skyNow.sza), off=Math.min(...sunTauAt(app));
  const sCen=sunBandsAt(app, off), sLin=skyNow.sunRGB.map(v=>SRGB_LIN[Math.round(v)]);
  const gAll=Math.max(...sLin)/Math.max(...sCen, 1e-30);
  gl.uniform1f(u.refK, sb.k); gl.uniform1f(u.sunOff, off); gl.uniform4fv(u.sunTau, sb.t.map(t=>t-off)); gl.uniform3fv(u.sunW, sb.w);
  gl.uniform3fv(u.sunG, sCen.map((v, q)=>Math.max(gAll, v>0?sLin[q]/v:0)));
  gl.uniform4fv(u.sunLay, sl.lay); gl.uniform4fv(u.sunMir, sl.mir);
  // The Sun's light on the ground and the ground's colour, for the sky and cloud passes.
  const sinApp=Math.max(0, Math.sin(app*Math.PI/180)), sunMu=sinApp*(skyNow.sunVis==null?1:skyNow.sunVis);
  const sunCol=new Float32Array(skyNow.sunRGB.map(v=>v/255)), ground=groundRGB(sunMu);
  gl.uniform1f(u.sunMu, sunMu);
  gl.uniform3fv(u.sunCol, sunCol);
  gl.uniform3fv(u.ground, ground);
  gl.uniform1f(u.showScn, vrScenery?1:0);
  gl.uniform1f(u.mtnSnow, mtnSnowFor(EP[dIdx].key));
  gl.uniform1f(u.snowCover, EP[dIdx].key==='snowball07'?1:0);
  gl.uniform1f(u.waterT, (performance.now()/1000)%1000);
  // Night lights: the Moon and, in the Geminga epoch, the supernova. Each lights the scene in
  // proportion to 0.6 times the square root of its brightness relative to the full Moon, a
  // perceptual scale under which the full Moon still outshines the supernova. They only
  // matter once the sky is dark, and the air dims them near the horizon.
  const night=1-smoothstep(0.0, 0.25, sinApp);
  const sn=skyNow.sn, snUp=!!sn && sn.el>-0.5;
  gl.uniform1f(u.snOn, snUp?1:0);
  if(snUp){
    vrGL.snDir=new Float32Array(horizDir(sn.az, Math.max(sn.el, 0)));
    vrGL.snLight=nightLight(sn.rgb, Math.pow(10, -0.4*(sn.mag-MOON_V_FULL)), sn.el, night);
    gl.uniform3fv(u.snDir, vrGL.snDir);
    gl.uniform3fv(u.snCol, new Float32Array(sn.rgb.map(v=>v*lowAir(sn.el))));
  }else vrGL.snLight=new Float32Array(3);
  gl.uniform3fv(u.snLight, vrGL.snLight);
  const mo=skyNow.moon, moonUp=mo.on && mo.el>-0.5;
  vrGL.mlDir=new Float32Array(horizDir(mo.az, Math.max(mo.el, 0)));
  vrGL.mlLight=moonUp?nightLight([0.82, 0.88, 1.0], skyNow.moonRel||0, mo.el, night):new Float32Array(3);
  gl.uniform3fv(u.mlDir, vrGL.mlDir); gl.uniform3fv(u.mlLight, vrGL.mlLight);
  const sc=sceneFor(EP[dIdx].key);
  gl.uniform4fv(u.pond, sc.p); gl.uniform1f(u.pondN, sc.pn);
  gl.uniform4fv(u.grid, sc.g); gl.uniform1f(u.gridN, sc.gn);
  gl.uniform4fv(u.road, sc.r); gl.uniform1f(u.roadN, sc.rn);
  gl.uniform1f(u.clockH, (minutes%DAYMIN)/60);
  gl.uniform4fv(u.obj, sc.o); gl.uniform1fv(u.kind, sc.k);
  // A star's px is the radius the page draws it at, with most of its light inside a third of
  // that; the Gaussian here takes that third as its width, in page pixels.
  gl.uniform1f(u.starPx, 0.35*(vrFov*Math.PI/180)/Math.max(window.innerHeight,1));
  uploadBodies(gl, u);
  if(skyNow.stars && vrGL.starTex && vrGL.starUploaded!==skyNow.gen){
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, vrGL.starTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, STAR_MAP_W, 2, gl.RGBA, gl.FLOAT, skyNow.stars);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, vrGL.starBinTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 64, 6, gl.RGBA, gl.FLOAT, skyNow.starBins);
    const rows=Math.max(1, Math.ceil(skyNow.starIdxCount/1024));
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, vrGL.starIdxTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 1024, rows, gl.RGBA, gl.FLOAT, skyNow.starIdx.subarray(0, 1024*rows*4));
    gl.activeTexture(gl.TEXTURE0);
    vrGL.starUploaded=skyNow.gen;
  }
  if(vrGL.weather){
    if(cloudMinPrev==null) cloudMinPrev=minutes;
    else { let dm=minutes-cloudMinPrev; if(dm<-DAYMIN/2) dm+=DAYMIN; cloudMinPrev=minutes; cloudScroll+=dm*88; vrGL.cloudTime=(vrGL.cloudTime||0)+dm*35; }
    vrGL.field=cloudField(EP[dIdx].key);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather);
    gl.uniform1f(u.cloudCov, vrGL.field.cov); gl.uniform1f(u.cloudScale, vrGL.field.scale); gl.uniform1f(u.cloudDrift, cloudScroll); gl.uniform1f(u.cloudOn, vrClouds?1:0);
    gl.activeTexture(gl.TEXTURE0);
  }
  if(vrGL.hitProg&&vrScenery){
    ensureHitTarget(c.width, c.height);
    if(vrGL.hitMRT){
      const town=!!vrGL.townProg&&ensureLandTarget(c.width, c.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, town?vrGL.landFbo:vrGL.hitFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0,0,c.width,c.height);
      gl.useProgram(vrGL.hitProg);
      const hu=vrGL.hu; gl.uniform1f(hu.fov, vrFov*Math.PI/180);
      if(vrGL.weather){ gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather); }
      gl.uniform2f(hu.res, c.width, c.height);
      gl.uniform1f(hu.yaw, vrYaw*Math.PI/180); gl.uniform1f(hu.pitch, vrPitch*Math.PI/180);
      gl.uniform3f(hu.eye, vrX, vrY, ez);
      gl.uniform1f(hu.showScn, 1);
      gl.uniform1f(hu.sunAz, skyNow.sunAz); gl.uniform1f(hu.sunEl, 90-skyNow.sza);
      gl.uniform4fv(hu.obj, sc.o); gl.uniform1fv(hu.kind, sc.k);
      gl.uniform4fv(hu.town, sc.t); gl.uniform1f(hu.townN, sc.tn);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if(town){
        gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.hitFbo);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        gl.useProgram(vrGL.townProg);
        const tu=vrGL.tu2;
        gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.landInfo);
        gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, vrGL.landNrm);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform2f(tu.res, c.width, c.height); gl.uniform1f(tu.fov, vrFov*Math.PI/180);
        gl.uniform1f(tu.yaw, vrYaw*Math.PI/180); gl.uniform1f(tu.pitch, vrPitch*Math.PI/180);
        gl.uniform3f(tu.eye, vrX, vrY, ez);
        gl.uniform4fv(tu.town, sc.t); gl.uniform1f(tu.townN, sc.tn);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]);
      gl.viewport(0,0,c.width,c.height);
      gl.useProgram(vrGL.prog);
    }
  }
  // The aurora, in its own pass, for the sky pass to add.
  const aurSt=skyNow.aur, aurOn=!!(aurSt&&aurSt.on&&vrGL.aurProg&&vrPitch+vrFov*0.5>-2);
  if(aurOn) drawAuroraVR(gl, aurSt, c);
  gl.uniform1f(u.aurOn, aurOn?1:0);
  const hl=skyNow.halo;
  gl.uniform2fv(u.haloK, hl?hl.k:new Float32Array(2));
  if(hl){ gl.uniform3fv(u.haloSunLin, hl.sun); gl.uniform3fv(u.haloMoonLin, hl.moon); }
  const rg=skyNow.ring;
  gl.uniform4f(u.ringV, rg?rg.k:0, rg?(rg.R.rOut-rg.R.rIn)/(rg.R.H/RE_KM):0, rg?1:0, 0);
  if(rg){ gl.uniform4f(u.ringU, rg.R.rIn, rg.R.rOut, rg.R.tau, 0.5*rg.R.H/RE_KM); gl.uniform3fv(u.ringP, rg.P); gl.uniform3fv(u.ringLin, RING_LIN); }
  // Meteors and lunar flashes (meteors.js), as they are this instant.
  const mu=metUniforms();
  gl.uniform1f(u.metN, mu.n); gl.uniform3fv(u.metFlash, mu.flash||[0, 0, 0]);
  if(mu.n){ gl.uniform4fv(u.metA, mu.A); gl.uniform4fv(u.metB, mu.B); gl.uniform4fv(u.metC, mu.C); }
  // Comets (comets.js).
  const cu=cometUniforms();
  gl.uniform1f(u.cometN, cu.n);
  if(cu.n){ const cl=cometLin(); gl.uniform4fv(u.cometH, cu.H); gl.uniform4fv(u.cometK, cu.K); gl.uniform4fv(u.cometS, cu.S); gl.uniform4fv(u.cometI, cu.I); gl.uniform3fv(u.cometComa, cl.coma); gl.uniform3fv(u.cometDust, cl.dust); gl.uniform3fv(u.cometIon, cl.ion); }
  gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo||vrGL.noHitInfo); gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo?vrGL.hitNrm:vrGL.noHitNrm); gl.activeTexture(gl.TEXTURE0);
  // ensureHitTarget binds new hit textures on the active unit, which can be the sky's.
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(!vrClouds||!vrLabels) vrGL.cloudAt=null;
  if(vrClouds&&vrGL.cloudProg&&vrGL.noise){
    vrGL.cloudFrame=(vrGL.cloudFrame||0)+1;
    if(vrGL.histKey!==EP[dIdx].key){ vrGL.histOk=false; vrGL.histKey=EP[dIdx].key; }
    const cw=Math.max(2,Math.round(c.width*2/3)), ch=Math.max(2,Math.round(c.height*2/3));
    const field=vrGL.field, cu=vrGL.cu;
    ensureCloudTarget(cw, ch);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
    gl.drawBuffers(vrGL.cloudMRT?[gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]:[gl.COLOR_ATTACHMENT0]);
    gl.viewport(0,0,cw,ch); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(vrGL.cloudProg); gl.uniform1f(cu.fov, vrFov*Math.PI/180);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, vrGL.noise);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_3D, vrGL.noiseDetail);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    if(vrGL.hitInfo){ gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo); gl.activeTexture(gl.TEXTURE0); }
    gl.uniform2f(cu.res, cw, ch);
    gl.uniform1f(cu.yaw, vrYaw*Math.PI/180); gl.uniform1f(cu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(cu.eye, vrX, vrY, ez);
    gl.uniform1f(cu.sunAz, skyNow.sunAz); gl.uniform1f(cu.sunEl, 90-skyNow.sza);
    gl.uniform1f(cu.sunMu, sunMu);
    gl.uniform3fv(cu.sunCol, sunCol);
    gl.uniform3fv(cu.groundCol, ground);
    gl.uniform1f(cu.nr, skyNow.nr); gl.uniform1f(cu.na, skyNow.na);
    gl.uniform1f(cu.showScn, vrScenery?1:0);
    gl.uniform1f(cu.cloudCov, field.cov); gl.uniform1f(cu.cloudScale, field.scale); gl.uniform1f(cu.cloudDrift, cloudScroll);
    gl.uniform1f(cu.cloudTime, vrGL.cloudTime||0); gl.uniform1f(cu.cloudFrame, vrGL.cloudFrame||0);
    gl.uniform1f(cu.cloudType, field.type); gl.uniform1f(cu.cloudDeck, field.deck);
    gl.uniform3fv(cu.snLight, vrGL.snLight||new Float32Array(3)); if(vrGL.snDir) gl.uniform3fv(cu.snDir, vrGL.snDir);
    gl.uniform3fv(cu.mlLight, vrGL.mlLight||new Float32Array(3)); if(vrGL.mlDir) gl.uniform3fv(cu.mlDir, vrGL.mlDir); gl.uniform1f(cu.cloudBase, field.base); gl.uniform1f(cu.cloudTop, field.top); gl.uniform1f(cu.cloudCirrus, field.cirrus);
    gl.uniform1f(cu.useHDR, vrGL.cloudHDR?1:0);
    gl.uniform1f(cu.sunVis, skyNow.sunVis==null?1:skyNow.sunVis);
    gl.uniform3fv(cu.cityUp, skyNow.cityUp||new Float32Array(3));
    gl.uniform4fv(cu.obj, sc.o); gl.uniform1fv(cu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    let shown=vrGL.cloudTex;
    // The view: while it holds still the clouds average over frames and settle.
    const viewKey=[vrYaw,vrPitch,vrFov,vrX,vrY,minutes,dIdx,dLat,cw,ch].join('|');
    if(vrGL.tempProg&&vrGL.cloudMRT){
      gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.accumFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.useProgram(vrGL.tempProg);
      const tu=vrGL.tu; gl.uniform1f(tu.fov, vrFov*Math.PI/180);
      // A zoom changes the projection, so the history can't be reprojected.
      if(vrGL.histFov!==vrFov){ vrGL.histFov=vrFov; vrGL.histOk=false; }
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, vrGL.cloudTex);
      gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_2D, vrGL.metaTex);
      gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, vrGL.histTex);
      gl.uniform2f(tu.res, cw, ch);
      gl.uniform1f(tu.yaw, vrYaw*Math.PI/180); gl.uniform1f(tu.pitch, vrPitch*Math.PI/180);
      gl.uniform1f(tu.prevYaw, vrGL.prevYaw||0); gl.uniform1f(tu.prevPitch, vrGL.prevPitch||0);
      gl.uniform3f(tu.eye, vrX, vrY, ez);
      gl.uniform3f(tu.prevEye, vrGL.prevEyeX||vrX, vrGL.prevEyeY||vrY, vrGL.prevEyeZ==null?ez:vrGL.prevEyeZ);
      gl.uniform1f(tu.histValid, vrGL.histOk?1:0);
      // 0.9 while the view moves; once it holds still, a running average up to 0.97.
      vrGL.accN=viewKey===vrGL.accKey?(vrGL.accN||9)+1:9; vrGL.accKey=viewKey;
      gl.uniform1f(tu.histW, Math.min(0.97, vrGL.accN/(vrGL.accN+1)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, vrGL.accumFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, vrGL.histFbo);
      gl.blitFramebuffer(0,0,cw,ch,0,0,cw,ch, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      vrGL.histOk=true;
      shown=vrGL.accumTex;
    }
    if(vrLabels) readCloudMask(shown===vrGL.accumTex?vrGL.accumFbo:vrGL.cloudFbo);
    vrGL.prevYaw=vrYaw*Math.PI/180; vrGL.prevPitch=vrPitch*Math.PI/180; vrGL.prevEyeX=vrX; vrGL.prevEyeY=vrY; vrGL.prevEyeZ=ez;
    // The march is jittered per frame; repaint a few times after the view settles so it converges.
    if(viewKey!==vrGL.settleKey){ vrGL.settleKey=viewKey; vrGL.settle=48; }
    if(vrGL.settle>0){ vrGL.settle--; requestVR(); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]); gl.viewport(0,0,c.width,c.height);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(vrGL.compProg);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shown);
    if(vrGL.hitInfo){ gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo); gl.activeTexture(gl.TEXTURE2); }
    const pu=vrGL.compU; gl.uniform1f(pu.fov, vrFov*Math.PI/180);
    gl.uniform2f(pu.res, c.width, c.height);
    gl.uniform1f(pu.yaw, vrYaw*Math.PI/180); gl.uniform1f(pu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(pu.eye, vrX, vrY, ez);
    gl.uniform1f(pu.showScn, vrScenery?1:0);
    gl.uniform4fv(pu.obj, sc.o); gl.uniform1fv(pu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0); gl.useProgram(vrGL.prog);
  }
  if(firsts.length||vrGL.note==='shown'){
    for(const p of firsts) vrSlow.delete(p);
    vrGL.note='drawn';
    afterPaint(()=>{ if(vrGL&&vrGL.note==='drawn'){ vrGL.note=''; hideVRLoad(); } });
  }
  const [hh, mm, ss]=clockParts(minutes);
  const lat=latLabel();
  const hud=vrGL.hud||(vrGL.hud={place:document.getElementById('vrplace'), note:document.querySelector('.vrnote'), clock:document.getElementById('vrclock')});
  setText(hud.place, EP[dIdx].name+' · '+lat);
  setText(hud.note, vrCaption());
  setText(hud.clock, dateLabel()+' · '+hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+' · '+(dayPlaying?'playing':'paused')+' · '+speedLabel()+(Math.abs(vrFov-60)>0.5?' · '+(vrFov<9.95?vrFov.toFixed(1):Math.round(vrFov))+'° view':'')+(skyNow.eclipse?' · '+skyNow.eclipse:'')+(vrClouds&&vrGL.field?' · clouds '+Math.round(vrGL.field.cov*100)+'%':'')+(vrNote?' · '+vrNote:''));
  placeBodyMarks();
  drawVRLabels();
  followVRPin();
  syncVRLink(false);
  // Water and magma move in real time, so keep painting at about 30 fps while one is in view.
  if(!vrGL.poolTimer && movingPoolInView()) vrGL.poolTimer=setTimeout(()=>{ vrGL.poolTimer=0; requestVR(); }, 33);
  // So does the aurora.
  if(!vrGL.aurTimer && aurOn) vrGL.aurTimer=setTimeout(()=>{ vrGL.aurTimer=0; requestVR(); }, 33);
}
// The aurora pass: a half-size float target (three quarters on low-density screens), since the
// march is costly and the aurora has little detail at the pixel scale. Leaves the sky program in
// use with the result on unit 9.
function drawAuroraVR(gl, st, c){
  const dpr=Math.min(window.devicePixelRatio||1, 2), s=dpr>=1.5?0.5:0.75;
  const w=Math.max(2, Math.round(c.width*s)), h=Math.max(2, Math.round(c.height*s));
  gl.activeTexture(gl.TEXTURE9);
  if(vrGL.aurW!==w||vrGL.aurH!==h){
    if(vrGL.aurTex) gl.deleteTexture(vrGL.aurTex);
    const t=vrGL.aurTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.aurFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    vrGL.aurW=w; vrGL.aurH=h;
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  const f=auroraFrame(st), au=vrGL.au;
  gl.useProgram(vrGL.aurProg);
  gl.activeTexture(gl.TEXTURE14); auroraTextures(gl, vrGL.aurStore, f.arcs, f.v);
  gl.activeTexture(gl.TEXTURE15); gl.bindTexture(gl.TEXTURE_2D, vrGL.aurStore.aurRays);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.aurFbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.viewport(0, 0, w, h);
  gl.uniform2f(au.res, w, h); gl.uniform1f(au.fov, vrFov*Math.PI/180);
  gl.uniform1f(au.yaw, vrYaw*Math.PI/180); gl.uniform1f(au.pitch, vrPitch*Math.PI/180);
  auroraSetUniforms(gl, au, st, f.t, new Float32Array(horizDir(skyNow.sunAz, 90-skyNow.sza)));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]); gl.viewport(0, 0, c.width, c.height);
  gl.useProgram(vrGL.prog);
  gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, vrGL.aurTex);
  gl.activeTexture(gl.TEXTURE0);
}
// The planets and moons (planets.js placePlanets) into the sky shader's bodies, at the Sun's and
// Moon's enlargement, and the moons' shadows on them.
const BODY_U={P:new Float32Array(BODY_MAX*4), C:new Float32Array(BODY_MAX*4), L:new Float32Array(BODY_MAX*4), N:new Float32Array(BODY_MAX*4), M:new Float32Array(SHADOW_MAX*4), K:new Float32Array(SHADOW_MAX*4)};
function uploadBodies(gl, u){
  const list=(skyNow.bodies||[]).slice(0, BODY_MAX), {P, C, L, N}=BODY_U;
  list.forEach((b, i)=>{
    const o=i*4;
    P.set(b.dir, o); P[o+3]=b.rad*DISK_SCALE;
    C.set(b.rgb, o); C[o+3]=b.px;
    L.set(b.light, o); L[o+3]=b.mag;
    N.set(b.pole, o); N[o+3]=b.kind+(b.front?8:0)+(b.kind===4&&!b.rings?16:0);
  });
  gl.uniform4fv(u.bodyP, P); gl.uniform4fv(u.bodyC, C); gl.uniform4fv(u.bodyL, L); gl.uniform4fv(u.bodyN, N);
  gl.uniform1f(u.bodyCnt, list.length); gl.uniform1f(u.moonGain, moonGain());
  let n=0;
  list.forEach((b, i)=>{ for(const s of b.shadows||[]){
    if(n>=SHADOW_MAX) return;
    BODY_U.M.set(s.m, n*4); BODY_U.M[n*4+3]=i; BODY_U.K[n*4]=s.rm; BODY_U.K[n*4+1]=s.a; n++;
  } });
  const jg=(list.find(b=>b.kind===3)||{}).grs;
  gl.uniform3fv(u.grsDir, jg?jg.dir:[1, 0, 0]); gl.uniform4f(u.grsAB, jg?jg.L:0, jg?jg.W:0, GRS_LAT, jg?jg.k:0);
  gl.uniform4fv(u.shadowM, BODY_U.M); gl.uniform4fv(u.shadowK, BODY_U.K); gl.uniform1f(u.shadowCnt, n);
}
