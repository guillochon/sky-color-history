function glShader(gl, type, src){ const s=gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; } return s; }
// Start a compile and link without asking for the result. Asking blocks until the driver is done.
// The job's cold says whether the program was compiled from scratch rather than taken from the
// browser's shader cache: a cached program is ready a tenth of a second in, a fresh one is not.
function glProgramAsync(gl, vs, src){
  const fs=gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, src); gl.compileShader(fs);
  const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.bindAttribLocation(p,0,'a'); gl.linkProgram(p);
  const job={p, fs, t0:performance.now()}, ext=gl.getExtension('KHR_parallel_shader_compile');
  if(ext) setTimeout(()=>{ if(job.cold===undefined) job.cold=!gl.getProgramParameter(p, ext.COMPLETION_STATUS_KHR); }, 100);
  return job;
}
// Call done with each linked program (null if it failed) once all of them are ready.
// With KHR_parallel_shader_compile the wait doesn't block. Without it, the first status query
// blocks, so wait long enough for the sky to paint first.
function whenLinked(gl, list, done){
  const ext=gl.getExtension('KHR_parallel_shader_compile');
  const poll=()=>{
    if(ext && !list.every(x=>gl.getProgramParameter(x.p, ext.COMPLETION_STATUS_KHR))){ setTimeout(poll, 30); return; }
    done(...list.map(x=>{
      if(x.cold===undefined) x.cold=performance.now()-x.t0>400;
      if(gl.getProgramParameter(x.p, gl.LINK_STATUS)){ gl.deleteShader(x.fs); return x.p; }
      console.warn(gl.getShaderInfoLog(x.fs)||gl.getProgramInfoLog(x.p)); return null;
    }));
  };
  setTimeout(poll, ext?0:150);
}
// Programs whose first draw will stall, mapped to what the VR note calls them. A program that
// came out of the browser's shader cache links in a moment. One that took a while was compiled
// from scratch, and on Windows ANGLE compiles the big ones a second time on their first draw,
// which can freeze the browser for seconds. paintVR puts up a note before that draw.
const vrSlow=new Map();
function markSlow(job, prog, label){ if(prog && job.cold) vrSlow.set(prog, label); }
// Run fn once the browser has put the current frame on screen, so a note shown just before
// stays up through a stall that follows.
function afterPaint(fn){
  let done=false; const go=()=>{ if(!done){ done=true; fn(); } };
  requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(go, 30)));
  setTimeout(go, 500);
}
function ensureWeather(gl){
  if(vrGL.weather) return vrGL.weather;
  const weather=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, weather);
  texParams(gl, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeWeather(256));
  return vrGL.weather=weather;
}
// Leave the context as paintVR expects it after setting up a program.
function vrRestoreGL(gl){
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.activeTexture(gl.TEXTURE0); gl.useProgram(vrGL.prog);
}
// Uniform locations, texture units, and fixed values for a sky program (boot or full).
function setupSkyProg(gl, prog){
  gl.useProgram(prog);
  const u=uniformLocs(gl, prog, ['res','yaw','pitch','fov','sunAz','sunEl','sunRad','sunOn','sunCol','ground','eye','nr','na','sunMu','showScn','mtnSnow','moonAz','moonEl','moonRad','moonOn','latRad','starPx','cloudCov','cloudScale','cloudDrift','cloudOn','clockH','pondN','snowCover','waterT','snOn','snDir','snCol','snLight','mlDir','mlLight','corona','coronaMap[0]','coronaRim','sunOri','sunDrift','toneU','rCd','mwOn','mwScale','mwK','mwDB','galX','galY','galZ','aurOn','haloK','haloSunLin','haloMoonLin','eclU','ringU','ringV','ringP','ringLin','metA[0]','metB[0]','metC[0]','metN','metFlash','cometH[0]','cometK[0]','cometS[0]','cometI[0]','cometN','cometComa','cometDust','cometIon','beads[0]','bodyP[0]','bodyC[0]','bodyL[0]','bodyN[0]','bodyCnt','moonGain','shadowM[0]','shadowK[0]','shadowCnt','refK','sunOff','sunTau[0]','sunW[0]','sunG','sunLay[0]','sunMir','pond[0]','gridN','roadN','grid[0]','road[0]','obj[0]','kind[0]']);
  bindSamplers(gl, prog, [['sky',0],['moonMap',1],['sunMap',2],['sunMap2',8],['starMap',3],['starBin',4],['starIdx',5],['weather',7],['hitInfo',10],['hitNrm',11],['noiseTex',12],['mwTex',13],['aurTex',9],['eclTex',6]]);
  gl.uniform1f(u.fov, vrFov*Math.PI/180);
  gl.uniform1f(u.sunRad, SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180);
  return u;
}
// Set up the VR context, then call ready(true), or ready(false) if WebGL 2 or the boot sky
// program isn't available. Nothing here waits on the shader compiler: the boot program, which
// compiles fast, goes first, and the full sky, hills, and clouds take over when they're ready.
let vrBoot=null;
function initVR(ready){
  if(vrGL){ ready(true); return; }
  if(vrBoot){ vrBoot.push(ready); return; }
  const canvas=document.getElementById('vrc');
  const gl=canvas.getContext('webgl2',{alpha:false,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:true});
  const vs=gl&&glShader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}');
  if(!vs){ ready(false); return; }
  const boot=glProgramAsync(gl, vs, VRFS_BOOT);
  const skyJob=glProgramAsync(gl, vs, VRFS);
  const cloudJobs=[CLOUDFS, COMPFS, TEMPFS, NOISEFS].map(src=>glProgramAsync(gl, vs, src));
  vrBoot=[ready];
  whenLinked(gl, [boot], prog=>{
    const waiting=vrBoot; vrBoot=null;
    if(prog) setupVR(gl, vs, prog, skyJob, cloudJobs);
    for(const f of waiting) f(!!prog);
  });
}
function setupVR(gl, vs, prog, skyJob, cloudJobs){
  gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const locA=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(locA); gl.vertexAttribPointer(locA,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const u=setupSkyProg(gl, prog);
  // Random values for vN in the sky shader, on unit 12, which nothing else uses.
  const noiseTex=gl.createTexture(), nd=new Uint8Array(128*128);
  let seed=12345; for(let i=0;i<nd.length;i++){ seed=(Math.imul(seed, 1103515245)+12345)>>>0; nd[i]=seed>>>24; }
  gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  texParams(gl, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 128, 128, 0, gl.RED, gl.UNSIGNED_BYTE, nd);
  gl.activeTexture(gl.TEXTURE0);
  const moonTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, moonTex);
  texParams(gl, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([180,180,180,255]));
  gl.generateMipmap(gl.TEXTURE_2D);
  // The photosphere's maps (sunspots.js), the day's on unit 2 and the next day's on unit 8:
  // repeating round in longitude.
  const sunTexAt=unit=>{
    const t=gl.createTexture(); gl.activeTexture(unit); gl.bindTexture(gl.TEXTURE_2D, t);
    texParams(gl, gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR, gl.REPEAT, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255,255,255,0]));
    gl.generateMipmap(gl.TEXTURE_2D); return t;
  };
  const sunTex=sunTexAt(gl.TEXTURE2), sunTex2=sunTexAt(gl.TEXTURE8);
  const starTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, starTex);
  texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, STAR_MAP_W, 2, 0, gl.RGBA, gl.FLOAT, new Float32Array(STAR_MAP_W*8));
  const starBinTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, starBinTex);
  texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 6, 0, gl.RGBA, gl.FLOAT, new Float32Array(64*6*4));
  const starIdxTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, starIdxTex);
  texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, 32, 0, gl.RGBA, gl.FLOAT, new Float32Array(1024*32*4));
  const eclTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, eclTex);
  texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LUN_LUT_N, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(LUN_LUT_N*4).fill(255));
  gl.activeTexture(gl.TEXTURE0);
  vrGL={gl,u,tex,prog,buf,moonTex,sunTex,sunTex2,eclTex,eclLut:null,starTex,starBinTex,starIdxTex,noiseTex,starUploaded:-1,
    vs, hits:{}, hitFbo:gl.createFramebuffer(), hitFloat:!!gl.getExtension('EXT_color_buffer_float')};
  // Stand-in hit buffers that say "nothing here, unshadowed" until the hit pass runs.
  const noHit=px=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(px)); return t; };
  vrGL.noHitInfo=noHit([-1,0,1,0]); vrGL.noHitNrm=noHit([0,0,1,-1]);
  vrRestoreGL(gl);
  whenLinked(gl, [skyJob], fp=>{
    if(!fp||!vrGL) return;
    const boot=vrGL.prog;
    vrGL.u=setupSkyProg(gl, fp); vrGL.prog=fp; gl.deleteProgram(boot);
    skyUploaded=-1;
    vrRestoreGL(gl); requestVR();
  });
  const hk=hitKeys(EP[dIdx].key);
  compileHit(gl, hk.land); if(hk.town) compileHit(gl, hk.town);
  // The aurora pass needs a float target.
  if(vrGL.hitFloat) whenLinked(gl, [glProgramAsync(gl, vs, AURFS)], ap=>{
    if(!ap||!vrGL) return;
    vrGL.aurProg=ap; vrGL.au=auroraUniforms(gl, ap, 14, 15);
    uniformLocs(gl, ap, ['res','yaw','pitch','fov'], vrGL.au);
    vrGL.aurFbo=gl.createFramebuffer(); vrGL.aurStore={};
    vrRestoreGL(gl); requestVR();
  });
  whenLinked(gl, cloudJobs, (cp, pp, tp, np)=>{ if(cp&&pp&&np&&vrGL){ setupCloudProgs(gl, cp, pp, tp, np); markSlow(cloudJobs[0], cp, 'the clouds'); vrRestoreGL(gl); requestVR(); } });
  // Last: when the moon image is already loaded this paints, so vrGL has to be complete.
  if(moonReady) uploadMoon();
}
// The programs an epoch's scenery needs: the land pass ('land' and a glacier digit) and, if it
// has towns or woods, the town pass ('town' and digits for towns and trees).
const hitKeyCache={};
function hitKeys(key){
  if(hitKeyCache[key]) return hitKeyCache[key];
  const z=ZONES[key]||[], k=sceneFor(key).k, has=(...kinds)=>z.some(s=>kinds.includes(s[2]));
  const tr=(has('city', 'hood')?'1':'0')+(has('hood', 'wood', 'carb', 'dead')?'1':'0');
  return hitKeyCache[key]={land:'land'+(Array.from(k).some(v=>v>2.5&&v<3.5)?'1':'0'), town:tr==='00'?null:'town'+tr};
}
// Compile a land or town program in the background. Once the current epoch's are ready, the
// other epochs' variants compile one at a time, so switching later is quick.
function compileHit(gl, key){
  if(vrGL.hits[key]) return;
  vrGL.hits[key]='pending';
  const land=key.startsWith('land'), job=glProgramAsync(gl, vrGL.vs, land?hitVariant(key[4]):townVariant(key.slice(4)));
  whenLinked(gl, [job], hp=>{
    if(!vrGL) return;
    if(!hp){ vrGL.hits[key]='failed'; return; }
    vrGL.hits[key]={prog:hp, hu:land?setupHitProg(gl, hp):setupTownProg(gl, hp)};
    markSlow(job, hp, 'the landscape');
    vrRestoreGL(gl); requestVR();
    if(Object.values(vrGL.hits).includes('pending')) return;
    const next=EP.flatMap(e=>{ const k=hitKeys(e.key); return k.town?[k.land, k.town]:[k.land]; }).find(k=>!vrGL.hits[k]);
    if(next) compileHit(gl, next);
  });
}
// Point paintVR at the current epoch's programs, or keep the last ones until they're ready.
function pickHit(gl){
  const k=hitKeys(EP[dIdx].key);
  compileHit(gl, k.land);
  const v=vrGL.hits[k.land];
  if(v && v.prog){ vrGL.hitProg=v.prog; vrGL.hu=v.hu; }
  if(!k.town){ vrGL.townProg=null; return; }
  compileHit(gl, k.town);
  const t=vrGL.hits[k.town];
  if(t && t.prog){ vrGL.townProg=t.prog; vrGL.tu2=t.hu; }
}
function setupTownProg(gl, tp){
  const tu=uniformLocs(gl, tp, ['res','yaw','pitch','fov','eye','town[0]','townN']);
  gl.useProgram(tp);
  bindSamplers(gl, tp, [['landInfo',10],['landNrm',11]]);
  gl.uniform1i(gl.getUniformLocation(tp,'loopPad'), 0);
  return tu;
}
function setupHitProg(gl, hp){
  const hu=uniformLocs(gl, hp, ['res','yaw','pitch','fov','eye','showScn','sunAz','sunEl','obj[0]','kind[0]','town[0]','townN']);
  ensureWeather(gl);
  gl.useProgram(hp);
  bindSamplers(gl, hp, [['weather',7]]);
  gl.uniform1f(hu.fov, vrFov*Math.PI/180);
  gl.uniform1f(gl.getUniformLocation(hp,'scnCount'), 12);
  gl.uniform1f(gl.getUniformLocation(hp,'hillN'), 8);
  gl.uniform1i(gl.getUniformLocation(hp,'loopPad'), 0);
  return hu;
}
function setupCloudProgs(gl, cp, pp, tp, np){
  const vols=makeCloudVolumes(gl, np);
  if(!vols){ console.warn('cloud noise build failed'); return; }
  const names=['res','yaw','pitch','fov','eye','sunAz','sunEl','sunCol','sunMu','showScn','cloudCov','cloudScale','cloudDrift','cloudTime','cloudFrame','nr','na','cloudType','cloudBase','cloudTop','cloudCirrus','useHDR','groundCol','sunVis','cityUp','cloudDeck','snDir','snLight','mlDir','mlLight'];
  const cu=uniformLocs(gl, cp, [...names, 'obj[0]', 'kind[0]']);
  const weather=ensureWeather(gl);
  const hdr=!!gl.getExtension('EXT_color_buffer_float');
  gl.useProgram(cp);
  bindSamplers(gl, cp, [['noiseBase',1],['noiseDetail',6],['weather',7],['sky',0],['hitInfo',10]]);
  gl.uniform1f(cu.fov, vrFov*Math.PI/180);
  gl.uniform1f(cu.useHDR, hdr?1:0);
  const compU=uniformLocs(gl, pp, ['res','yaw','pitch','fov','showScn','eye','obj[0]','kind[0]']);
  gl.useProgram(pp); bindSamplers(gl, pp, [['cloudTex',2],['hitInfo',10]]); gl.uniform1f(compU.fov, vrFov*Math.PI/180);
  let tu=null;
  if(tp){
    tu=uniformLocs(gl, tp, ['res','yaw','pitch','prevYaw','prevPitch','fov','histValid','histW','eye','prevEye']);
    gl.useProgram(tp);
    bindSamplers(gl, tp, [['currTex',2],['histTex',9],['metaTex',8]]);
    gl.uniform1f(tu.fov, vrFov*Math.PI/180);
  }
  vrGL.cloudProg=cp; vrGL.compProg=pp; vrGL.tempProg=tp; vrGL.cu=cu; vrGL.compU=compU; vrGL.tu=tu;
  vrGL.noise=vols.base; vrGL.noiseDetail=vols.detail; vrGL.weather=weather;
  vrGL.cloudHDR=hdr; vrGL.cloudFbo=gl.createFramebuffer(); vrGL.accumFbo=gl.createFramebuffer(); vrGL.histFbo=gl.createFramebuffer();
  vrGL.cloudTex=null; vrGL.metaTex=null; vrGL.accumTex=null; vrGL.histTex=null; vrGL.cw=0; vrGL.ch=0; vrGL.histOk=false; vrGL.cloudTime=0; vrGL.cloudFrame=0; vrGL.cloudMRT=false;
}
