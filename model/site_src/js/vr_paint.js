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
function scRad(k, r){ return (k>0.5&&k<1.5)?r*1.28:(k>1.5&&k<2.5)?r*1.12:r; }
function sceneFor(key){ // [bearing deg, distance m, radius m, height m, kind]; kinds 1 and 2 are procedural massifs
  const spots=list=>{ const o=new Float32Array(48), k=new Float32Array(12);
    for(let i=0;i<12;i++){ const s=list[i], a=s[0]*Math.PI/180; o[i*4]=Math.sin(a)*s[1]; o[i*4+1]=Math.cos(a)*s[1]; o[i*4+2]=s[2]; o[i*4+3]=s[3]; k[i]=s[4]; }
    return {o,k}; };
  const VOLC=[[175,320,80,150,2],[205,560,130,240,2],[140,900,200,340,2],[250,3000,700,520,2],[310,5200,1400,1000,1],[350,8000,2200,1500,1],[100,9000,2500,1600,1],[160,7000,1800,1100,1],[230,11000,2800,1700,1],[40,6500,1600,900,1],[70,4200,1100,780,1],[280,4800,1000,640,1]];
  const ICE=[[165,220,70,36,3],[195,420,130,60,3],[120,700,220,90,3],[240,1100,300,120,3],[210,1900,900,200,3],[260,3400,1600,280,3],[320,2100,1000,220,3],[30,7000,2000,900,3],[100,9000,2400,1100,3],[190,8000,1800,800,3],[250,11000,2600,1200,3],[330,6000,1600,700,3]];
  const TREES=[[10,70,5,24,5],[35,120,7,32,5],[60,85,4,20,5],[95,160,8,36,5],[140,95,6,28,5],[180,200,9,42,5],[220,110,5,26,5],[270,150,7,34,5],[40,6000,1600,900,1],[140,8500,2200,1300,1],[230,5000,1400,750,1],[310,10000,2500,1500,1]];
  const PEAKS=[[170,380,110,190,1],[200,720,170,300,1],[140,1200,260,420,1],[55,4200,1300,800,1],[95,2200,700,420,1],[230,4500,1400,880,1],[280,2600,800,500,1],[330,3800,1100,700,1],[70,8000,2200,1400,1],[160,9500,2600,1600,1],[240,7000,1800,1100,1],[310,11000,2800,1500,1]];
  const city=(dk,hk)=>[[8,45*dk,10,18*hk,4],[25,70*dk,14,36*hk,4],[48,55*dk,9,14*hk,4],[70,100*dk,16,55*hk,4],[110,80*dk,12,28*hk,4],[150,60*dk,11,22*hk,4],[190,130*dk,18,72*hk,4],[230,90*dk,13,40*hk,4],[300,7500,2000,1200,1],[20,9000,2400,1400,1],[160,11000,2800,1600,1],[250,6000,1500,800,1]].map(s=>s[4]===4?[s[0],s[1],s[2]*0.5,s[3]*0.5,s[4]]:s);
  if(key==='snowball07') return spots(ICE);
  if(key==='carbon30') return spots(TREES);
  if(key==='modern') return spots(city(2.2,1));
  if(key==='modernpoll') return spots(city(1.5,1.55));
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
function domeH(x, y, cell, thresh, r0, r1, h0, h1, seed){
  const gx=Math.floor(x/cell), gy=Math.floor(y/cell);
  if(h12xy(gx+seed, gy+seed)<thresh) return 0;
  const jx=h12xy(gx+seed+1.7, gy+seed+1.7), jy=h12xy(gx+seed+3.1, gy+seed+3.1);
  const cx=(gx+0.5+(jx-0.5)*0.44)*cell, cy=(gy+0.5+(jy-0.5)*0.44)*cell;
  const R=r0+h12xy(gx+seed+5.5, gy+seed+5.5)*(r1-r0);
  const H=h0+h12xy(gx+seed+8.2, gy+seed+8.2)*(h1-h0);
  const u=Math.hypot(x-cx, y-cy)/R;
  if(u>=1) return 0;
  return Math.sqrt(Math.max(0, 1-u*u))*H;
}
function landHeight(x, y){
  return Math.max(domeH(x, y, 1500, 0.42, 220, 400, 46, 155, 0), domeH(x, y, 2800, 0.0, 520, 760, 16, 40, 19));
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
