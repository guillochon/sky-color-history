const EP = __EP__;
// An epoch that keeps today's air names the modern limb rather than carrying a copy.
for(const e of EP) if(typeof e.limb==='string') e.limb=EP.find(x=>x.key===e.limb).limb;
// The day-cycle colors: the grid here, each epoch's samples in its own file (see gen_site.py
// for the coding), fetched the first time the epoch is drawn. Epochs that keep today's air
// share the modern file.
const DAY = __DAY__;
DAY.epochs={};
const dayLoads={};
let Y_OF_CODE=null;
function decodeDay(buf){
  const c=new Uint16Array(buf), nv=DAY.vz.length, na=DAY.az.length, per=nv*na+1, n=DAY.lats.length*DAY.szas.length*per;
  if(!Y_OF_CODE){ Y_OF_CODE=new Float64Array(65536); for(let k=1;k<65536;k++){ const e=Math.floor((k-1)/900)+DAY.yEmin, m=(k-1)%900+100; Y_OF_CODE[k]=parseFloat(m+'e'+e); } }
  const rec={}; let o=0;
  for(const lat of DAY.lats){
    const dome=[], sun=[];
    for(let s=0;s<DAY.szas.length;s++,o+=per){
      const grid=[];
      for(let v=0;v<nv;v++){
        const row=[], p=o+v*na; let x=0, y=0, L=0;
        for(let a=0;a<na;a++){
          x=a?(x+c[p+a])&0xFFFF:c[p]; y=a?(y+c[n+p+a])&0xFFFF:c[n+p]; L=a?(L+c[2*n+p+a])&0xFFFF:c[2*n+p];
          row.push([x/1e4, y/1e4, Y_OF_CODE[L]]);
        }
        grid.push(row);
      }
      const q=o+per-1; dome.push(grid); sun.push([c[q]/1e4, c[n+q]/1e4, Y_OF_CODE[c[2*n+q]]]);
    }
    rec[lat]={dome, sun};
  }
  return rec;
}
function loadDay(key){
  const file=DAY.files[key];
  if(!dayLoads[file]) dayLoads[file]=fetch(file).then(r=>{ if(!r.ok) throw new Error(file+': '+r.status); return r.arrayBuffer(); })
    .then(buf=>{ const rec=decodeDay(buf); for(const k in DAY.files) if(DAY.files[k]===file) DAY.epochs[k]=rec; })
    .catch(err=>{ dayLoads[file]=null; console.error(err); });
  return dayLoads[file];
}
// True when every epoch named has its colors. Otherwise starts loading them, draws the day
// again once they arrive, and returns false.
function dayReady(...keys){
  const miss=keys.filter(k=>!DAY.epochs[k]);
  if(!miss.length) return true;
  Promise.all(miss.map(loadDay)).then(()=>{ if(miss.every(k=>DAY.epochs[k])) renderDay(); });
  return false;
}
function dayPending(){ return EP.some(e=>dayLoads[DAY.files[e.key]] && !DAY.epochs[e.key]); }
const YREF = __YREF__;
const M = [[3.2406,-1.5372,-0.4986],[-0.9689,1.8758,0.0415],[0.0557,-0.2040,1.0570]];
const g = v => v<=0.0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-0.055;
function xyY2XYZ(c){ const [x,y,Y]=c; if(y<=0||Y<=0) return [0,0,0]; return [x*Y/y, Y, (1-x-y)*Y/y]; }
function XYZ2rgb(X, expo){ // linear rgb 0..1, soft hue-preserving clip
  let r=M[0][0]*X[0]+M[0][1]*X[1]+M[0][2]*X[2], gg=M[1][0]*X[0]+M[1][1]*X[1]+M[1][2]*X[2], b=M[2][0]*X[0]+M[2][1]*X[1]+M[2][2]*X[2];
  r=Math.max(0,r*expo); gg=Math.max(0,gg*expo); b=Math.max(0,b*expo);
  const mx=Math.max(r,gg,b); if(mx>1){r/=mx;gg/=mx;b/=mx;} return [r,gg,b];
}
const ginv = s => s<=0.04045 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4);
// Display curve, as linear light t for luminance r=Y/Yref. In daylight and twilight it is
// k·r^p. A dark-adapted eye sees far more at night than that curve shows, so a second branch
// gives the sRGB value as TOE_A − TOE_B·exp(−log10 L / TOE_W) for luminance L in cd/m²: black
// at 8e-5 cd/m², the natural night sky (1.7e-4) a very dark grey at 13/255, the Milky Way on it
// up to about 26, deep twilight and city skies near 32–35, a full-Moon sky 37, nautical
// twilight about 41. Its slope eases with brightness, so the Milky Way keeps its contrast on a
// dark sky while every step of twilight still darkens. The branches meet in a soft maximum
// TOE_W2 wide, leaving the day curve unchanged above about 1 cd/m². TOE_CD converts r to cd/m²
// with day.js's calibration of 969.5 cd/m² per model unit. Mirrored in the sky shader as toneT.
const TOE_A=0.1674, TOE_B=0.002276, TOE_W=0.957, TOE_W2=0.012, TOE_CD=YREF*969.5;
// A nebula or galaxy is a small patch, and the eye judges it against the sky round it, by the
// ratio of their light: its pixels are drawn at least DSO_STEP of sRGB brighter than the sky's for
// each tenfold of light over it (20 levels a decade, about the curve's own step just above a dark
// sky), where the curve alone, levelling off toward 43, would crush M42's 16-19 mag/arcsec² into
// six levels. Rods and cones see contrast, not the light's absolute level, over so small a field.
const DSO_STEP=20/255;
// sRGB value of the sky (display linear light tBg) with a nebula or galaxy over it, its light
// raising the luminance ratio from rBg to rNew, given the curve's own value tNew for rNew.
function toneDso(tBg, rBg, rNew, tNew){
  return rBg>0?Math.max(tNew, ginv(Math.min(1, g(tBg)+DSO_STEP*Math.log10(rNew/rBg)))):tNew;
}
// The same curve in GLSL, for shaders that declare uniform vec4 toneU (k, p, cap, TOE_CD), with
// sRGB encoding and decoding.
const TONE_GLSL=`
float lin2s(float v){ return v<=0.0031308?12.92*v:1.055*pow(v, 1.0/2.4)-0.055; }
float s2lin(float v){ return v<=0.04045?v/12.92:pow((v+0.055)/1.055, 2.4); }
vec3 s2lin3(vec3 c){ return vec3(s2lin(c.r), s2lin(c.g), s2lin(c.b)); }
vec3 lin2s3(vec3 c){ return vec3(lin2s(c.r), lin2s(c.g), lin2s(c.b)); }
// Display linear light for luminance ratio r (color.js toneT).
float toneT(float r){
  if(r<=0.0) return 0.0;
  float su=lin2s(min(toneU.z, toneU.x*pow(r, toneU.y))), sl=${TOE_A}-${TOE_B}*exp(-log(r*toneU.w)/(2.302585*${TOE_W}));
  float m=max(su, sl), s=m+${TOE_W2}*log(1.0+exp(-abs(su-sl)/${TOE_W2}));
  return s2lin(clamp(s, 0.0, 1.0));
}`;
function toneT(r, k=0.85, p=0.4, cap=0.92){
  if(!(r>0)) return 0;
  const su=g(Math.min(cap, k*Math.pow(r, p))), sl=TOE_A-TOE_B*Math.exp(-Math.log10(r*TOE_CD)/TOE_W);
  const m=Math.max(su, sl), s=m+TOE_W2*Math.log(1+Math.exp(-Math.abs(su-sl)/TOE_W2));
  return ginv(Math.max(0, Math.min(1, s)));
}
function tone(X, Yref, k=0.85, p=0.4, cap=0.92, floor=0){ // returns sRGB 0..255
  // Non-positive luminance has no color. A hard floor above that cut a contour
  // into moonlight, so anything dimmer follows the same curve down to black.
  if(!(X[1]>0)) return [0,0,0];
  const t=Math.max(toneT(X[1]/Yref, k, p, cap), floor);
  const rgb=XYZ2rgb(X, t/X[1]); return rgb.map(v=>Math.round(255*g(v)));
}
// Sky luminance r=Y/Yref stored in a byte (the VR sky texture's alpha): log10 r from -12 to 0.5.
const LOGR_LO=-12, LOGR_SPAN=12.5;
function encodeLogR(r){ return Math.round(255*Math.max(0, Math.min(1, (Math.log10(Math.max(r, 1e-13))-LOGR_LO)/LOGR_SPAN))); }
// Faintest star visible against a sky of L cd/m² (the usual conversion to naked-eye limit, via the
// sky's V surface brightness in mag/arcsec²).
function skyMagArcsec(L){ return -2.5*Math.log10(Math.max(L, 1e-12)/10.8e4); }
function nakedEyeLimit(L){ return 7.93-5*Math.log10(Math.pow(10, 4.316-skyMagArcsec(L)/5)+1); }
function cct(x,y){ const n=(x-0.3320)/(0.1858-y); return Math.round(449*n**3+3525*n**2+6823.3*n+5520.33); }
const hex = a => '#'+a.map(v=>v.toString(16).padStart(2,'0')).join('');
// Where x falls in the ascending samples xs: [i, t] with x at xs[i]+t·(xs[i+1]-xs[i]), held to the ends.
function bracket(xs,x){ if(x<=xs[0]) return [0,0]; for(let i=0;i<xs.length-1;i++) if(x<xs[i+1]) return [i,(x-xs[i])/(xs[i+1]-xs[i])]; return [xs.length-2,1]; }
// The VR passes' view ray through pixel frag, for a camera at yaw and pitch with vertical field fov.
const VIEW_RAY_GLSL=`
vec3 viewRay(vec2 frag, vec2 res, float fov, float yaw, float pitch){
  float fy=tan(fov*0.5), fx=fy*(res.x/max(res.y,1.0));
  float u=((frag.x/res.x)*2.0-1.0)*fx, v=((frag.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  return normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
}`;
// WebGL: filtering and wrapping for the texture bound to target (default TEXTURE_2D; wrapR for 3D).
function texParams(gl, min, mag, wrapS, wrapT, target=gl.TEXTURE_2D, wrapR=null){
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, min); gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, mag);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS); gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);
  if(wrapR!=null) gl.texParameteri(target, gl.TEXTURE_WRAP_R, wrapR);
}
// Uniform locations of program p by name, added to into; an array's first element 'x[0]' is kept as x.
function uniformLocs(gl, p, names, into={}){ for(const n of names) into[n.replace('[0]', '')]=gl.getUniformLocation(p, n); return into; }
// Point p's samplers at texture units: pairs of [name, unit]. p must be in use.
function bindSamplers(gl, p, pairs){ for(const [n, unit] of pairs) gl.uniform1i(gl.getUniformLocation(p, n), unit); }

