function glShader(gl, type, src){ const s=gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ console.warn(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; } return s; }
function initVR(){
  if(vrGL) return vrGL.gl;
  const canvas=document.getElementById('vrc');
  const gl=canvas.getContext('webgl2',{alpha:false,depth:false,stencil:false,antialias:false,preserveDrawingBuffer:true});
  if(!gl) return null;
  const vs=glShader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}');
  const fs=glShader(gl, gl.FRAGMENT_SHADER, VRFS);
  if(!vs||!fs) return null;
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
  const u={}; for(const n of ['res','yaw','pitch','fov','sunAz','sunEl','sunRad','sunOn','sunCol','ground','eye','nr','na','sunMu','showScn','mtnSnow','moonAz','moonEl','moonRad','moonOn','latRad','starPx','cloudCov','cloudScale','cloudDrift','cloudOn']) u[n]=gl.getUniformLocation(prog, n);
  u.obj=gl.getUniformLocation(prog,'obj[0]'); u.kind=gl.getUniformLocation(prog,'kind[0]');
  gl.uniform1i(gl.getUniformLocation(prog,'sky'), 0);
  gl.uniform1i(gl.getUniformLocation(prog,'moonMap'), 1);
  gl.uniform1i(gl.getUniformLocation(prog,'weather'), 7);
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
  gl.uniform1i(gl.getUniformLocation(prog,'starMap'), 3);
  gl.uniform1i(gl.getUniformLocation(prog,'hitInfo'), 10);
  gl.uniform1i(gl.getUniformLocation(prog,'hitNrm'), 11);
  const starBinTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, starBinTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 64, 6, 0, gl.RGBA, gl.FLOAT, new Float32Array(64*6*4));
  gl.uniform1i(gl.getUniformLocation(prog,'starBin'), 4);
  const starIdxTex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, starIdxTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1024, 32, 0, gl.RGBA, gl.FLOAT, new Float32Array(1024*32*4));
  gl.uniform1i(gl.getUniformLocation(prog,'starIdx'), 5);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(u.fov, VR_FOV_DEG*Math.PI/180);
  gl.uniform1f(u.sunRad, SUN_RADIUS_DEG*DISK_SCALE*Math.PI/180);
  vrGL={gl,u,tex,prog,buf,moonTex,starTex,starBinTex,starIdxTex,starUploaded:-1};
  if(moonReady) uploadMoon();
  const hfs=glShader(gl, gl.FRAGMENT_SHADER, HITFS);
  if(hfs){
    const hp=gl.createProgram(); gl.attachShader(hp,vs); gl.attachShader(hp,hfs); gl.bindAttribLocation(hp,0,'a'); gl.linkProgram(hp);
    if(!gl.getProgramParameter(hp, gl.LINK_STATUS)) console.warn(gl.getProgramInfoLog(hp));
    else {
      const hu={}; for(const n of ['res','yaw','pitch','fov','eye','showScn','sunAz','sunEl']) hu[n]=gl.getUniformLocation(hp, n);
      hu.obj=gl.getUniformLocation(hp,'obj[0]'); hu.kind=gl.getUniformLocation(hp,'kind[0]');
      gl.useProgram(hp);
      gl.uniform1i(gl.getUniformLocation(hp,'weather'), 7);
      gl.uniform1f(hu.fov, VR_FOV_DEG*Math.PI/180);
      gl.uniform1f(gl.getUniformLocation(hp,'scnCount'), 12);
      vrGL.hitProg=hp; vrGL.hu=hu; vrGL.hitFbo=gl.createFramebuffer(); vrGL.hitFloat=!!gl.getExtension('EXT_color_buffer_float');
      gl.useProgram(prog);
    }
  }
  const cfs=glShader(gl, gl.FRAGMENT_SHADER, CLOUDFS), compFs=glShader(gl, gl.FRAGMENT_SHADER, COMPFS), tempFs=glShader(gl, gl.FRAGMENT_SHADER, TEMPFS);
  if(cfs&&compFs){
    const cp=gl.createProgram(); gl.attachShader(cp,vs); gl.attachShader(cp,cfs); gl.bindAttribLocation(cp,0,'a'); gl.linkProgram(cp);
    const pp=gl.createProgram(); gl.attachShader(pp,vs); gl.attachShader(pp,compFs); gl.bindAttribLocation(pp,0,'a'); gl.linkProgram(pp);
    let tp=null;
    if(tempFs){ tp=gl.createProgram(); gl.attachShader(tp,vs); gl.attachShader(tp,tempFs); gl.bindAttribLocation(tp,0,'a'); gl.linkProgram(tp); if(!gl.getProgramParameter(tp, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(tp)); tp=null; } }
    if(!gl.getProgramParameter(cp, gl.LINK_STATUS)||!gl.getProgramParameter(pp, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(cp)||gl.getProgramInfoLog(pp)); }
    else {
      const vols=makeCloudVolumes(gl);
      if(!vols) console.warn('cloud noise build failed');
      else {
      const names=['res','yaw','pitch','fov','eye','sunAz','sunEl','sunCol','sunMu','showScn','cloudCov','cloudScale','cloudDrift','cloudTime','cloudFrame','nr','na','cloudType','cloudBase','cloudTop','cloudCirrus','useHDR','groundCol','sunVis'];
      const cu={}; for(const n of names) cu[n]=gl.getUniformLocation(cp, n);
      cu.obj=gl.getUniformLocation(cp,'obj[0]'); cu.kind=gl.getUniformLocation(cp,'kind[0]');
      const weather=gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, weather);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, makeWeather(256));
      const hdr=!!gl.getExtension('EXT_color_buffer_float');
      gl.useProgram(cp);
      gl.uniform1i(gl.getUniformLocation(cp,'noiseBase'), 1);
      gl.uniform1i(gl.getUniformLocation(cp,'noiseDetail'), 6);
      gl.uniform1i(gl.getUniformLocation(cp,'weather'), 7);
      gl.uniform1i(gl.getUniformLocation(cp,'sky'), 0);
      gl.uniform1i(gl.getUniformLocation(cp,'hitInfo'), 10);
      gl.uniform1f(cu.fov, VR_FOV_DEG*Math.PI/180);
      gl.uniform1f(cu.useHDR, hdr?1:0);
      const compU={}; for(const n of ['res','yaw','pitch','fov','showScn']) compU[n]=gl.getUniformLocation(pp, n);
      compU.eye=gl.getUniformLocation(pp,'eye'); compU.obj=gl.getUniformLocation(pp,'obj[0]'); compU.kind=gl.getUniformLocation(pp,'kind[0]');
      gl.useProgram(pp); gl.uniform1i(gl.getUniformLocation(pp,'cloudTex'), 2); gl.uniform1i(gl.getUniformLocation(pp,'hitInfo'), 10); gl.uniform1f(compU.fov, VR_FOV_DEG*Math.PI/180);
      let tu=null;
      if(tp){
        tu={}; for(const n of ['res','yaw','pitch','prevYaw','prevPitch','fov','histValid','histW']) tu[n]=gl.getUniformLocation(tp, n);
        tu.eye=gl.getUniformLocation(tp,'eye'); tu.prevEye=gl.getUniformLocation(tp,'prevEye');
        gl.useProgram(tp);
        gl.uniform1i(gl.getUniformLocation(tp,'currTex'), 2);
        gl.uniform1i(gl.getUniformLocation(tp,'histTex'), 9);
        gl.uniform1i(gl.getUniformLocation(tp,'metaTex'), 8);
        gl.uniform1f(tu.fov, VR_FOV_DEG*Math.PI/180);
      }
      vrGL.cloudProg=cp; vrGL.compProg=pp; vrGL.tempProg=tp; vrGL.cu=cu; vrGL.compU=compU; vrGL.tu=tu;
      vrGL.noise=vols.base; vrGL.noiseDetail=vols.detail; vrGL.weather=weather;
      vrGL.cloudHDR=hdr; vrGL.cloudFbo=gl.createFramebuffer(); vrGL.accumFbo=gl.createFramebuffer(); vrGL.histFbo=gl.createFramebuffer();
      vrGL.cloudTex=null; vrGL.metaTex=null; vrGL.accumTex=null; vrGL.histTex=null; vrGL.cw=0; vrGL.ch=0; vrGL.histOk=false; vrGL.cloudTime=0; vrGL.cloudFrame=0; vrGL.cloudMRT=false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.activeTexture(gl.TEXTURE0); gl.useProgram(prog);
    }
  }
  return gl;
}
