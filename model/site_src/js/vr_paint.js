function sizeVR(){
  const c=document.getElementById('vrc'), dpr=Math.min(window.devicePixelRatio||1, 2);
  const w=Math.max(2, Math.round(window.innerWidth*dpr)), h=Math.max(2, Math.round(window.innerHeight*dpr));
  if(c.width!==w||c.height!==h){ c.width=w; c.height=h; }
  if(vrGL){ vrGL.gl.viewport(0,0,c.width,c.height); }
}
function mtnSnowFor(key){
  if(key==='kpg66'||key==='snowball07') return 1;
  if(key==='modern'||key==='ozonehole') return 1;
  if(key==='modernpoll'||key==='y2100') return 0.75;
  if(key==='carbon30') return 0.35;
  if(key==='proterozoic22') return 0.2;
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
  kpg66:[[20,520,'dead',260],[300,650,'dead',300],[110,300,'water',70]],
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
    return {o, k, ...townsFor(key)}; };
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
function hillHeight(x, y){
  const cell=1800, gx=Math.floor(x/cell), gy=Math.floor(y/cell);
  if(h12xy(gx, gy)<0.46) return 0;
  const jx=h12xy(gx+1.7, gy+1.7), jy=h12xy(gx+3.1, gy+3.1);
  const cx=(gx+0.5+(jx-0.5)*0.44)*cell, cy=(gy+0.5+(jy-0.5)*0.44)*cell;
  const R=140+h12xy(gx+5.5, gy+5.5)*(340-140);
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
function hillClear(cx, cy, R){
  const sc=sceneFor(EP[dIdx].key);
  for(let i=0;i<sc.tn;i++){ if(Math.hypot(cx-sc.t[i*4], cy-sc.t[i*4+1])<sc.t[i*4+2]+R*1.28+60) return false; }
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
      if(alongX) out.push(trunk(gl[0]>gh[0]?lo[0]+gl[0]*0.5:x0+w[0]+gh[0]*0.5, lo[1]+rc+along*(cell-2*rc)));
      else out.push(trunk(lo[0]+rc+along*(cell-2*rc), gl[1]>gh[1]?lo[1]+gl[1]*0.5:y0+w[1]+gh[1]*0.5));
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
function groundRGB(){
  const alb=LAND[EP[dIdx].key]||[.2,.18,.14], cg=skyNow.colgrid, NR=cg.length-1, NA=cg[0].length-1;
  let ar=0,ag=0,ab=0,n=0; const ir=Math.round(NR*0.45);
  for(let ia=0; ia<=NA; ia+=8){ const c=cg[ir][ia]; ar+=c[0]; ag+=c[1]; ab+=c[2]; n++; }
  const z=cg[0][0]; ar=ar/n*0.65+z[0]*0.35; ag=ag/n*0.65+z[1]*0.35; ab=ab/n*0.65+z[2]*0.35;
  const mu=Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis), s=skyNow.sunRGB, amb=[ar,ag,ab];
  return new Float32Array(alb.map((a,i)=>Math.min(255, a*(0.42*amb[i]+1.25*mu*s[i]+16))/255));
}
function ensureHitTarget(w, h){
  const gl=vrGL.gl;
  if(vrGL.hitW===w&&vrGL.hitH===h&&vrGL.hitInfo) return;
  vrGL.hitW=w; vrGL.hitH=h;
  const alloc=()=>{
    const t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, vrGL.hitFloat?gl.RGBA32F:gl.RGBA16F, w, h, 0, gl.RGBA, vrGL.hitFloat?gl.FLOAT:gl.HALF_FLOAT, null);
    return t;
  };
  if(vrGL.hitInfo) gl.deleteTexture(vrGL.hitInfo);
  if(vrGL.hitNrm) gl.deleteTexture(vrGL.hitNrm);
  vrGL.hitInfo=alloc(); vrGL.hitNrm=alloc();
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.hitFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.hitInfo, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vrGL.hitNrm, 0);
  vrGL.hitMRT=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if(!vrGL.hitMRT&&vrGL.hitFloat){ vrGL.hitFloat=false; vrGL.hitW=0; ensureHitTarget(w, h); }
}
function paintVR(){
  if(!vrOn||!vrGL||!skyNow) return;
  const {gl,u,tex}=vrGL, c=gl.canvas;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.BLEND); gl.drawBuffers([gl.BACK]);
  gl.viewport(0,0,c.width,c.height);
  if(skyUploaded!==skyNow.gen){
    const cg=skyNow.colgrid, h=cg.length, w=cg[0].length, data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const p=cg[y][x], o=(y*w+x)*4; data[o]=p[0]; data[o+1]=p[1]; data[o+2]=p[2]; data[o+3]=255; }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.uniform1f(u.nr, h-1); gl.uniform1f(u.na, w-1); skyUploaded=skyNow.gen;
  }
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vrGL.moonTex);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.useProgram(vrGL.prog);
  gl.uniform2f(u.res, c.width, c.height);
  gl.uniform1f(u.yaw, vrYaw*Math.PI/180); gl.uniform1f(u.pitch, vrPitch*Math.PI/180);
  const ez=eyeZ();
  gl.uniform3f(u.eye, vrX, vrY, ez);
  gl.uniform1f(u.sunAz, skyNow.sunAz); gl.uniform1f(u.sunEl, 90-skyNow.sza);
  gl.uniform1f(u.moonAz, skyNow.moon.az); gl.uniform1f(u.moonEl, skyNow.moon.el);
  gl.uniform1f(u.moonRad, skyNow.moon.rad*DISK_SCALE); gl.uniform1f(u.moonOn, skyNow.moon.on?1:0);
  gl.uniform1f(u.latRad, LATDEG[dLat]*Math.PI/180);
  gl.uniform1f(u.sunOn, skyNow.sunOn?1:0);
  gl.uniform1f(u.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis));
  gl.uniform3fv(u.sunCol, new Float32Array(skyNow.sunRGB.map(v=>v/255)));
  gl.uniform3fv(u.ground, groundRGB());
  gl.uniform1f(u.showScn, vrScenery?1:0);
  gl.uniform1f(u.mtnSnow, mtnSnowFor(EP[dIdx].key));
  { const sz=sceneFor(EP[dIdx].key); gl.uniform4fv(u.pond, sz.p); gl.uniform1f(u.pondN, sz.pn); }
  gl.uniform1f(u.clockH, (minutes%DAYMIN)/60);
  const sc=sceneFor(EP[dIdx].key); gl.uniform4fv(u.obj, sc.o); gl.uniform1fv(u.kind, sc.k);
  gl.uniform1f(u.starPx, (VR_FOV_DEG*Math.PI/180)/Math.max(window.innerHeight,1));
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
      gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.hitFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      gl.viewport(0,0,c.width,c.height);
      gl.useProgram(vrGL.hitProg);
      const hu=vrGL.hu;
      if(vrGL.weather){ gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather); }
      gl.uniform2f(hu.res, c.width, c.height);
      gl.uniform1f(hu.yaw, vrYaw*Math.PI/180); gl.uniform1f(hu.pitch, vrPitch*Math.PI/180);
      gl.uniform3f(hu.eye, vrX, vrY, ez);
      gl.uniform1f(hu.showScn, 1);
      gl.uniform1f(hu.sunAz, skyNow.sunAz); gl.uniform1f(hu.sunEl, 90-skyNow.sza);
      gl.uniform4fv(hu.obj, sc.o); gl.uniform1fv(hu.kind, sc.k);
      gl.uniform4fv(hu.town, sc.t); gl.uniform1f(hu.townN, sc.tn);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]);
      gl.viewport(0,0,c.width,c.height);
      gl.useProgram(vrGL.prog);
    }
  }
  gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo||vrGL.noHitInfo); gl.activeTexture(gl.TEXTURE11); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo?vrGL.hitNrm:vrGL.noHitNrm); gl.activeTexture(gl.TEXTURE0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  if(vrClouds&&vrGL.cloudProg&&vrGL.noise){
    vrGL.cloudFrame=(vrGL.cloudFrame||0)+1;
    if(vrGL.histKey!==EP[dIdx].key){ vrGL.histOk=false; vrGL.histKey=EP[dIdx].key; }
    const cw=Math.max(2,Math.round(c.width*2/3)), ch=Math.max(2,Math.round(c.height*2/3));
    const field=vrGL.field, cu=vrGL.cu;
    ensureCloudTarget(cw, ch);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
    gl.drawBuffers(vrGL.cloudMRT?[gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]:[gl.COLOR_ATTACHMENT0]);
    gl.viewport(0,0,cw,ch); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(vrGL.cloudProg);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, vrGL.noise);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_3D, vrGL.noiseDetail);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    if(vrGL.hitInfo){ gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo); gl.activeTexture(gl.TEXTURE0); }
    gl.uniform2f(cu.res, cw, ch);
    gl.uniform1f(cu.yaw, vrYaw*Math.PI/180); gl.uniform1f(cu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(cu.eye, vrX, vrY, ez);
    gl.uniform1f(cu.sunAz, skyNow.sunAz); gl.uniform1f(cu.sunEl, 90-skyNow.sza);
    gl.uniform1f(cu.sunMu, Math.max(0, Math.sin(apparentEl(90-skyNow.sza)*Math.PI/180))*(skyNow.sunVis==null?1:skyNow.sunVis));
    gl.uniform3fv(cu.sunCol, new Float32Array(skyNow.sunRGB.map(v=>v/255)));
    gl.uniform3fv(cu.groundCol, groundRGB());
    const cg=skyNow.colgrid;
    gl.uniform1f(cu.nr, cg.length-1); gl.uniform1f(cu.na, cg[0].length-1);
    gl.uniform1f(cu.showScn, vrScenery?1:0);
    gl.uniform1f(cu.cloudCov, field.cov); gl.uniform1f(cu.cloudScale, field.scale); gl.uniform1f(cu.cloudDrift, cloudScroll);
    gl.uniform1f(cu.cloudTime, vrGL.cloudTime||0); gl.uniform1f(cu.cloudFrame, vrGL.cloudFrame||0);
    gl.uniform1f(cu.cloudType, field.type); gl.uniform1f(cu.cloudBase, field.base); gl.uniform1f(cu.cloudTop, field.top); gl.uniform1f(cu.cloudCirrus, field.cirrus);
    gl.uniform1f(cu.useHDR, vrGL.cloudHDR?1:0);
    gl.uniform1f(cu.sunVis, skyNow.sunVis==null?1:skyNow.sunVis);
    gl.uniform4fv(cu.obj, sc.o); gl.uniform1fv(cu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    let shown=vrGL.cloudTex;
    if(vrGL.tempProg&&vrGL.cloudMRT){
      gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.accumFbo);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
      gl.useProgram(vrGL.tempProg);
      const tu=vrGL.tu;
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
      const ak=[vrYaw,vrPitch,vrX,vrY,minutes,dIdx,dLat,cw,ch].join('|');
      vrGL.accN=ak===vrGL.accKey?(vrGL.accN||9)+1:9; vrGL.accKey=ak;
      gl.uniform1f(tu.histW, Math.min(0.97, vrGL.accN/(vrGL.accN+1)));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, vrGL.accumFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, vrGL.histFbo);
      gl.blitFramebuffer(0,0,cw,ch,0,0,cw,ch, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      vrGL.histOk=true;
      shown=vrGL.accumTex;
    }
    vrGL.prevYaw=vrYaw*Math.PI/180; vrGL.prevPitch=vrPitch*Math.PI/180; vrGL.prevEyeX=vrX; vrGL.prevEyeY=vrY; vrGL.prevEyeZ=ez;
    // The march is jittered per frame; repaint a few times after the view settles so it converges.
    const sk=[vrYaw,vrPitch,vrX,vrY,minutes,dIdx,dLat,cw,ch].join('|');
    if(sk!==vrGL.settleKey){ vrGL.settleKey=sk; vrGL.settle=48; }
    if(vrGL.settle>0){ vrGL.settle--; requestVR(); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]); gl.viewport(0,0,c.width,c.height);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(vrGL.compProg);
    gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, vrGL.weather);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, shown);
    if(vrGL.hitInfo){ gl.activeTexture(gl.TEXTURE10); gl.bindTexture(gl.TEXTURE_2D, vrGL.hitInfo); gl.activeTexture(gl.TEXTURE2); }
    const pu=vrGL.compU;
    gl.uniform2f(pu.res, c.width, c.height);
    gl.uniform1f(pu.yaw, vrYaw*Math.PI/180); gl.uniform1f(pu.pitch, vrPitch*Math.PI/180);
    gl.uniform3f(pu.eye, vrX, vrY, ez);
    gl.uniform1f(pu.showScn, vrScenery?1:0);
    gl.uniform4fv(pu.obj, sc.o); gl.uniform1fv(pu.kind, sc.k);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disable(gl.BLEND);
    gl.activeTexture(gl.TEXTURE0); gl.useProgram(vrGL.prog);
  }
  const hh=minutes>=DAYMIN?24:Math.floor(minutes/60), mm=minutes>=DAYMIN?0:Math.floor(minutes%60), ss=minutes>=DAYMIN?0:Math.floor((minutes%1)*60);
  const lat=dLat==='Polar'?'75°':dLat==='Mid-latitude'?'45°':'equator';
  document.getElementById('vrplace').textContent=EP[dIdx].name+' · '+lat;
  document.querySelector('.vrnote').textContent=vrCaption();
  document.getElementById('vrclock').textContent=(document.getElementById('moonDate').value||'')+' · '+hh+':'+String(mm).padStart(2,'0')+':'+String(ss).padStart(2,'0')+' · '+(dayPlaying?'playing':'paused')+(vrNote?' · '+vrNote:'');
  placeBodyMarks();
  syncVRLink(false);
}
