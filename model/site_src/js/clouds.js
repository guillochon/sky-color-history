function makeWeather(n){
  const data=new Uint8Array(n*n*4);
  const h=(i,j,s)=>{ let x=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)+Math.imul(s|0,1274126177); x=(x^(x>>>13))>>>0; x=Math.imul(x,1274126177); return ((x^(x>>>16))>>>0)/4294967295; };
  const octave=(u,v,cells,seed)=>{
    const x=u*cells, y=v*cells, x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0;
    const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), w=i=>((i%cells)+cells)%cells;
    const s=(ix,iy)=>h(w(ix), w(iy), seed);
    return s(x0,y0)*(1-sx)*(1-sy)+s(x0+1,y0)*sx*(1-sy)+s(x0,y0+1)*(1-sx)*sy+s(x0+1,y0+1)*sx*sy;
  };
  const fbm=(u,v,seed)=>{ let a=0.5, cells=2, s=0, w=0; for(let i=0;i<5;i++){ s+=a*octave(u,v,cells,seed+i*19); w+=a; a*=0.5; cells*=2; } return s/w; };
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const u=x/n, v=y/n, o=(y*n+x)*4;
    data[o]=Math.round(Math.min(1, Math.max(0, fbm(u, v, 1)))*255);
    data[o+1]=Math.round(Math.min(1, Math.max(0, fbm(u+0.17, v+0.41, 2)))*255);
    data[o+2]=Math.round(Math.min(1, Math.max(0, fbm(u+0.63, v+0.11, 3)))*255);
    data[o+3]=Math.round(Math.min(1, Math.max(0, fbm(u+0.29, v+0.73, 4)))*255);
  }
  return data;
}
// prog is the linked NOISEFS program. It is deleted once the volumes are filled.
function makeCloudVolumes(gl, prog){
  const uLayer=gl.getUniformLocation(prog,'layer'), uKind=gl.getUniformLocation(prog,'kind'), uSide=gl.getUniformLocation(prog,'side');
  const fbo=gl.createFramebuffer();
  const fill=(tex, side, kind)=>{
    gl.bindTexture(gl.TEXTURE_3D, tex);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, side, side, side, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.useProgram(prog); gl.uniform1f(uKind, kind); gl.uniform1f(uSide, side);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, side, side);
    for(let z=0;z<side;z++){
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, z);
      gl.uniform1f(uLayer, (z+0.5)/side);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
  const base=gl.createTexture(), detail=gl.createTexture();
  fill(base, 128, 0); fill(detail, 32, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteProgram(prog); gl.deleteFramebuffer(fbo);
  return {base, detail};
}
// Coverage, type, base altitude, and how tall the tops run, by era.
// Type 0 is a thin stratiform deck, 0.5 is fair-weather cumulus, 1 is cumulonimbus.
const CLOUD_ERA={
  hadean44:{cov:0.88,type:0.12,base:1900,top:0.55,cirrus:0.05},
  hadean40:{cov:0.74,type:0.16,base:1800,top:0.50,cirrus:0.08},
  archean38:{cov:0.48,type:0.35,base:1600,top:0.45,cirrus:0.15},
  archean27thin:{cov:0.42,type:0.38,base:1600,top:0.40,cirrus:0.20},
  archean27:{cov:0.30,type:0.42,base:1550,top:0.45,cirrus:0.25},
  archean27vthick:{cov:0.16,type:0.20,base:1700,top:0.30,cirrus:0.10},
  proterozoic22:{cov:0.58,type:0.40,base:1550,top:0.50,cirrus:0.30},
  snowball07:{cov:0.22,type:0.04,base:1400,top:0.20,cirrus:0.15},
  carbon30:{cov:0.82,type:0.78,base:1500,top:0.90,cirrus:0.45},
  kpg66:{cov:0.08,type:0.02,base:2200,top:0.15,cirrus:0.05},
  volcanic:{cov:0.52,type:0.22,base:1700,top:0.40,cirrus:0.70},
  modern:{cov:0.50,type:0.50,base:1600,top:0.55,cirrus:0.55},
  modernpoll:{cov:0.56,type:0.42,base:1450,top:0.50,cirrus:0.40},
  ozonehole:{cov:0.50,type:0.50,base:1600,top:0.55,cirrus:0.55},
  y2100:{cov:0.50,type:0.50,base:1600,top:0.55,cirrus:0.55}
};
function cloudField(key){
  const e=CLOUD_ERA[key]||CLOUD_ERA.modern;
  return {cov:e.cov, type:e.type, base:e.base, top:e.top, cirrus:e.cirrus, scale:1/32000};
}
function vrCaption(){
  if(vrScenery&&vrClouds) return 'The ground, the shapes, and the clouds are scenery. The sky is the model.';
  if(vrScenery) return 'Clouds are hidden. The ground and the shapes are scenery. The sky is the model.';
  if(vrClouds) return 'The shapes are hidden. The clouds are scenery. The sky is the model.';
  return 'Scenery and clouds are hidden. The sky is the model.';
}
function allocCloudTex(gl, w, h, hdr){
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if(hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return tex;
}
function ensureCloudTarget(w, h){
  const gl=vrGL.gl;
  if(vrGL.cw===w&&vrGL.ch===h) return;
  vrGL.cw=w; vrGL.ch=h; vrGL.histOk=false;
  const hdr=!!vrGL.cloudHDR;
  for(const key of ['cloudTex','metaTex','accumTex','histTex']){ if(vrGL[key]) gl.deleteTexture(vrGL[key]); }
  vrGL.cloudTex=allocCloudTex(gl, w, h, hdr);
  vrGL.accumTex=allocCloudTex(gl, w, h, hdr);
  vrGL.histTex=allocCloudTex(gl, w, h, hdr);
  vrGL.metaTex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, vrGL.metaTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if(hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, w, h, 0, gl.RED, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.cloudTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vrGL.metaTex, 0);
  vrGL.cloudMRT=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;
  if(!vrGL.cloudMRT) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.accumFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.accumTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.histFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.histTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
