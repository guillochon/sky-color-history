function glShader(gl, type, src){ const s=gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; } return s; }
// Start a compile and link without asking for the result. Asking blocks until the driver is done.
function glProgramAsync(gl, vs, src){
  const fs=gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, src); gl.compileShader(fs);
  const p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.bindAttribLocation(p,0,'a'); gl.linkProgram(p);
  return {p, fs};
}
// Call done with each linked program (null if it failed) once all of them are ready.
// With KHR_parallel_shader_compile the wait doesn't block. Without it, the first status query
// blocks, so wait long enough for the sky to paint first.
function whenLinked(gl, list, done){
  const ext=gl.getExtension('KHR_parallel_shader_compile');
  const poll=()=>{
    if(ext && !list.every(x=>gl.getProgramParameter(x.p, ext.COMPLETION_STATUS_KHR))){ setTimeout(poll, 30); return; }
    done(...list.map(x=>{
      if(gl.getProgramParameter(x.p, gl.LINK_STATUS)){ gl.deleteShader(x.fs); return x.p; }
      console.warn(gl.getShaderInfoLog(x.fs)||gl.getProgramInfoLog(x.p)); return null;
    }));
  };
  setTimeout(poll, ext?0:150);
}
function ensureWeather(gl){
  if(vrGL.weather) return vrGL.weather;
  const weather=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, weather);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
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
  const u={}; for(const n of ['res','yaw','pitch','fov','sunAz','sunEl','sunRad','sunOn','sunCol','ground','eye','nr','na','sunMu','showScn','mtnSnow','moonAz','moonEl','moonRad','moonOn','latRad','starPx','cloudCov','cloudScale','cloudDrift','cloudOn','clockH','pondN','snowCover','waterT','snOn','snDir','snCol','snLight','mlDir','mlLight','corona','bead']) u[n]=gl.getUniformLocation(prog, n);
  u.pond=gl.getUniformLocation(prog,'pond[0]');
  u.obj=gl.getUniformLocation(prog,'obj[0]'); u.kind=gl.getUniformLocation(prog,'kind[0]');
  for(const [n, unit] of [['sky',0],['moonMap',1],['starMap',3],['starBin',4],['starIdx',5],['weather',7],['hitInfo',10],['hitNrm',11],['noiseTex',12]]) gl.uniform1i(gl.getUniformLocation(prog, n), unit);
  gl.uniform1f(u.fov, vrFov*Math.PI/180);
  gl.uniform1f(u.sunRad, SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180);
  return u;
}
function initVR(){
  if(vrGL) return vrGL.gl;
  const canvas=document.getElementById('vrc');
  const gl=canvas.getContext('webgl2',{alpha:false,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl) return null;
  const vs=glShader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}');
  if(!vs) return null;
  // Only the boot sky program blocks. The full sky, hills, and clouds compile meanwhile and
  // take over when they're ready.
  const skyJob=glProgramAsync(gl, vs, VRFS);
  const cloudJobs=[CLOUDFS, COMPFS, TEMPFS, NOISEFS].map(src=>glProgramAsync(gl, vs, src));
  const fs=glShader(gl, gl.FRAGMENT_SHADER, VRFS_BOOT);
  if(!fs) return null;
  const prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.bindAttribLocation(prog,0,'a'); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(prog)); return null; }
  gl.useProgram(prog);
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const locA=gl.getAttribLocation(prog,'a'); gl.enableVertexAttribArray(locA); gl.vertexAttribPointer(locA,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const u=setupSkyProg(gl, prog);
  // Random values for vN in the sky shader, on unit 12, which nothing else uses.
  const noiseTex=gl.createTexture(), nd=new Uint8Array(128*128);
  let seed=12345; for(let i=0;i<nd.length;i++){ seed=(Math.imul(seed, 1103515245)+12345)>>>0; nd[i]=seed>>>24; }
  gl.activeTexture(gl.TEXTURE12); gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 128, 128, 0, gl.RED, gl.UNSIGNED_BYTE, nd);
  gl.activeTexture(gl.TEXTURE0);
  const moonTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, moonTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([180,180,180,255]));
  gl.generateMipmap(gl.TEXTURE_2D);
  const starTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, starTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, STAR_MAP_W, 2, 0, gl.RGBA, gl.FLOAT, new Float32Array(STAR_MAP_W*8));
  const starBinTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, starBinTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 6, 0, gl.RGBA, gl.FLOAT, new Float32Array(64*6*4));
  const starIdxTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, starIdxTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, 32, 0, gl.RGBA, gl.FLOAT, new Float32Array(1024*32*4));
  gl.activeTexture(gl.TEXTURE0);
  vrGL={gl,u,tex,prog,buf,moonTex,starTex,starBinTex,starIdxTex,noiseTex,starUploaded:-1,
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
  compileHit(gl, hitFlags(EP[dIdx].key));
  whenLinked(gl, cloudJobs, (cp, pp, tp, np)=>{ if(cp&&pp&&np&&vrGL){ setupCloudProgs(gl, cp, pp, tp, np); vrRestoreGL(gl); requestVR(); } });
  // Last: when the moon image is already loaded this paints, so vrGL has to be complete.
  if(moonReady) uploadMoon();
  return gl;
}
// Which scenery an epoch's hit program needs: towns, trees, glaciers, as '0'/'1' digits.
const hitFlagCache={};
function hitFlags(key){
  if(hitFlagCache[key]) return hitFlagCache[key];
  const z=ZONES[key]||[], k=sceneFor(key).k, has=(...kinds)=>z.some(s=>kinds.includes(s[2]));
  const f=(has('city', 'hood')?'1':'0')+(has('hood', 'wood', 'carb', 'dead')?'1':'0')+(Array.from(k).some(v=>v>2.5&&v<3.5)?'1':'0');
  return hitFlagCache[key]=f;
}
// Compile the hit program for these flags in the background. Once the current epoch's program
// is ready, the other epochs' variants compile one at a time, so switching later is instant.
function compileHit(gl, flags){
  if(vrGL.hits[flags]) return;
  vrGL.hits[flags]='pending';
  whenLinked(gl, [glProgramAsync(gl, vrGL.vs, hitVariant(flags))], hp=>{
    if(!vrGL) return;
    if(!hp){ vrGL.hits[flags]='failed'; return; }
    vrGL.hits[flags]={prog:hp, hu:setupHitProg(gl, hp)};
    vrRestoreGL(gl); requestVR();
    if(Object.values(vrGL.hits).includes('pending')) return;
    const next=EP.map(e=>hitFlags(e.key)).find(f=>!vrGL.hits[f]);
    if(next) compileHit(gl, next);
  });
}
// Point paintVR at the current epoch's hit program, or keep the last one until it's ready.
function pickHit(gl){
  const f=hitFlags(EP[dIdx].key);
  compileHit(gl, f);
  const v=vrGL.hits[f];
  if(v && v.prog){ vrGL.hitProg=v.prog; vrGL.hu=v.hu; }
}
function setupHitProg(gl, hp){
  const hu={}; for(const n of ['res','yaw','pitch','fov','eye','showScn','sunAz','sunEl']) hu[n]=gl.getUniformLocation(hp, n);
  hu.obj=gl.getUniformLocation(hp,'obj[0]'); hu.kind=gl.getUniformLocation(hp,'kind[0]');
  hu.town=gl.getUniformLocation(hp,'town[0]'); hu.townN=gl.getUniformLocation(hp,'townN');
  ensureWeather(gl);
  gl.useProgram(hp);
  gl.uniform1i(gl.getUniformLocation(hp,'weather'), 7);
  gl.uniform1f(hu.fov, vrFov*Math.PI/180);
  gl.uniform1f(gl.getUniformLocation(hp,'scnCount'), 12);
  gl.uniform1f(gl.getUniformLocation(hp,'hillN'), 8);
  gl.uniform1i(gl.getUniformLocation(hp,'loopPad'), 0);
  return hu;
}
function setupCloudProgs(gl, cp, pp, tp, np){
  const vols=makeCloudVolumes(gl, np);
  if(!vols){ console.warn('cloud noise build failed'); return; }
  const names=['res','yaw','pitch','fov','eye','sunAz','sunEl','sunCol','sunMu','showScn','cloudCov','cloudScale','cloudDrift','cloudTime','cloudFrame','nr','na','cloudType','cloudBase','cloudTop','cloudCirrus','useHDR','groundCol','sunVis','cloudDeck','snDir','snLight','mlDir','mlLight'];
  const cu={}; for(const n of names) cu[n]=gl.getUniformLocation(cp, n);
  cu.obj=gl.getUniformLocation(cp,'obj[0]'); cu.kind=gl.getUniformLocation(cp,'kind[0]');
  const weather=ensureWeather(gl);
  const hdr=!!gl.getExtension('EXT_color_buffer_float');
  gl.useProgram(cp);
  gl.uniform1i(gl.getUniformLocation(cp,'noiseBase'), 1);
  gl.uniform1i(gl.getUniformLocation(cp,'noiseDetail'), 6);
  gl.uniform1i(gl.getUniformLocation(cp,'weather'), 7);
  gl.uniform1i(gl.getUniformLocation(cp,'sky'), 0);
  gl.uniform1i(gl.getUniformLocation(cp,'hitInfo'), 10);
  gl.uniform1f(cu.fov, vrFov*Math.PI/180);
  gl.uniform1f(cu.useHDR, hdr?1:0);
  const compU={}; for(const n of ['res','yaw','pitch','fov','showScn']) compU[n]=gl.getUniformLocation(pp, n);
  compU.eye=gl.getUniformLocation(pp,'eye'); compU.obj=gl.getUniformLocation(pp,'obj[0]'); compU.kind=gl.getUniformLocation(pp,'kind[0]');
  gl.useProgram(pp); gl.uniform1i(gl.getUniformLocation(pp,'cloudTex'), 2); gl.uniform1i(gl.getUniformLocation(pp,'hitInfo'), 10); gl.uniform1f(compU.fov, vrFov*Math.PI/180);
  let tu=null;
  if(tp){
    tu={}; for(const n of ['res','yaw','pitch','prevYaw','prevPitch','fov','histValid','histW']) tu[n]=gl.getUniformLocation(tp, n);
    tu.eye=gl.getUniformLocation(tp,'eye'); tu.prevEye=gl.getUniformLocation(tp,'prevEye');
    gl.useProgram(tp);
    gl.uniform1i(gl.getUniformLocation(tp,'currTex'), 2);
    gl.uniform1i(gl.getUniformLocation(tp,'histTex'), 9);
    gl.uniform1i(gl.getUniformLocation(tp,'metaTex'), 8);
    gl.uniform1f(tu.fov, vrFov*Math.PI/180);
  }
  vrGL.cloudProg=cp; vrGL.compProg=pp; vrGL.tempProg=tp; vrGL.cu=cu; vrGL.compU=compU; vrGL.tu=tu;
  vrGL.noise=vols.base; vrGL.noiseDetail=vols.detail; vrGL.weather=weather;
  vrGL.cloudHDR=hdr; vrGL.cloudFbo=gl.createFramebuffer(); vrGL.accumFbo=gl.createFramebuffer(); vrGL.histFbo=gl.createFramebuffer();
  vrGL.cloudTex=null; vrGL.metaTex=null; vrGL.accumTex=null; vrGL.histTex=null; vrGL.cw=0; vrGL.ch=0; vrGL.histOk=false; vrGL.cloudTime=0; vrGL.cloudFrame=0; vrGL.cloudMRT=false;
}
