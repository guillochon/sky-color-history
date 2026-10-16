// Noctilucent clouds: ice at the summer mesopause, about 83 km up, where the air over the summer
// pole is the coldest on Earth (some 130 K). They form from late May to mid August in the north
// (late November to mid February in the south), poleward of about 50° today, and show only in the
// twilight with the Sun 6° to 16° down: still sunlit up there, against a sky gone dark below. So
// from 45° they are a rare, low display in the northern sky; from 75° the midsummer Sun never sets
// far enough to show them; and they are drawn wherever the twilight lets them, not placed.
//
// Their color and brightness come from nlc.py: the sunlight that reaches them grazing past the
// Earth's shadow through each epoch's air (ozone's Chappuis band takes the red, which makes them
// silvery blue; with no ozone, before 2.4 Ga, they are whiter), the grains' scattering, and the
// way down to the eye. The light is the grains' optical depth at 550 nm times the Sun's
// illuminance over 4π, a Rayleigh-like phase function, and the slant through the thin layer.
//
// How often, how far toward the Equator and how thick, by epoch (NLC_ERA), from what the clouds
// need: a cold mesopause, which more CO₂ makes colder still, and water there, most of it made from
// methane, which the industrial era's has raised by about 40% (Lübken et al. 2018). occ: the share
// of the season's nights with a display at 60°; lat: the latitude they reach toward the Equator
// (their edge, a few degrees wide); tau: a display's typical optical depth at 550 nm (a bright one
// is some 1e-4; Fogle & Rees 1972). Today and 2100 follow model studies (Lübken et al. 2018, 2021,
// 2024; Yu et al. 2023): before the twentieth century they were faint and seldom seen, and by 2100
// they are brighter and reach lower latitudes. The rest are estimates, marked guess: in the high
// methane of the Cretaceous and Paleogene they spread to mid-latitudes (Dutta et al. 2024), the
// Archean's cold, ozone-free middle atmosphere and its methane may have made them common, and the
// Hadean's hot, wet air, once the surface was over 350 K, warmed the upper air past freezing
// (Kasting et al. 2015), so none.
const NLC=__NLC__;
const NLC_ERA={
  protoearth455:{occ:0, lat:90, tau:0, guess:1}, hadean45:{occ:0, lat:90, tau:0, guess:1},
  hadean40:{occ:0.3, lat:50, tau:3e-5, guess:1}, archean38:{occ:0.6, lat:42, tau:6e-5, guess:1},
  archean27clear:{occ:0.6, lat:42, tau:6e-5, guess:1}, archean27thin:{occ:0.6, lat:42, tau:6e-5, guess:1},
  archean27:{occ:0.5, lat:44, tau:5e-5, guess:1}, archean27vthick:{occ:0.5, lat:44, tau:5e-5, guess:1},
  proterozoic22:{occ:0.4, lat:46, tau:4e-5, guess:1}, snowball07:{occ:0.4, lat:46, tau:3e-5, guess:1},
  cryogenian65:{occ:0.35, lat:48, tau:3e-5, guess:1}, ordovician466:{occ:0.3, lat:48, tau:3e-5, guess:1},
  carbon30:{occ:0.1, lat:54, tau:1.5e-5, guess:1}, cretaceous66:{occ:0.45, lat:36, tau:5e-5, guess:1},
  kpg66:{occ:0.45, lat:36, tau:5e-5, guess:1}, zetaoph:{occ:0.06, lat:55, tau:1.5e-5, guess:1},
  geminga:{occ:0.06, lat:55, tau:1.5e-5, guess:1}, volcanic:{occ:0.06, lat:55, tau:1.5e-5},
  modern:{occ:0.25, lat:50, tau:4e-5}, modernpoll:{occ:0.25, lat:50, tau:4e-5}, ozonehole:{occ:0.22, lat:50, tau:3.5e-5},
  y2100:{occ:0.4, lat:44, tau:8e-5}
};
// Tonight's display, from the date (the night's own: the evening's date until noon the next day):
// none, or its optical depth and a seed for its shape. The season peaks about three weeks after the
// summer solstice, from five weeks before it to eight after.
function nlcTonight(key){
  const e=NLC_ERA[key]||NLC_ERA.modern, lat=LATDEG[dLat]??45;
  if(!(e.occ>0) || Math.abs(lat)<20) return null;
  const {k, m}=cloudDate(), night=k-(m<DAYMIN/2?1:0);
  const d=/^(-?\d+)-(\d+)-(\d+)$/.exec(document.getElementById('moonDate').value||'');
  const Y=d?+d[1]:2026, sol=utcDay(Y, lat<0?12:6, 21);
  let ds=night-sol; ds-=365.2422*Math.round(ds/365.2422);
  const season=smoothstep(-36, -20, ds)*(1-smoothstep(42, 58, ds))*(0.6+0.4*Math.exp(-(((ds-20)/25)**2)));
  const h1=h12xy(night, metHash(key)%997+0.37), h2=h12xy(night, metHash(key)%991+5.1);
  if(!(h1<e.occ*season)) return null;
  // Brighter or fainter by a factor of three either way, as displays are; the south's fainter.
  return {tau:e.tau*Math.exp(1.1*probit(Math.min(0.999, Math.max(0.001, h2))))*(lat<0?0.6:1), lat:e.lat, seed:(night%1000)*0.731, guess:!!e.guess};
}
// The pass: each pixel's light, in cd/m² times 1000, into the aurora's target (drawAuroraVR), added to
// the aurora's when it is on; the sky shader mixes it in under the display curve (auroraMix). That
// curve levels off in the twilight, where a display a hundred times the dark sky's light would
// show barely brighter than it; so, as for the nebulae (color.js toneDso), the light is raised
// until the pixel is at least DSO_STEP of sRGB over the sky for each tenfold of light over it:
// the eye sees the contrast of a field like this, not the light's absolute level.
const NLCFS=`#version 300 es
precision highp float;
uniform vec2 res; uniform float yaw, pitch, fov;
uniform vec3 sd;
// x tonight's optical depth, y the observer's latitude (deg, south negative), z their reach
// toward the Equator (deg), w a seed for their shape.
uniform vec4 nlcP;
// Their drift (km), carried by the mesopause's wind.
uniform vec2 nlcDrift;
uniform sampler2D nlcTab, sky;
uniform float nr, na, rCd;
uniform vec4 toneU;
${TONE_GLSL}
${VIEW_RAY_GLSL}
out vec4 fragColor;
float nh(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); q+=dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float nN(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(nh(i), nh(i+vec2(1.0, 0.0)), u.x), mix(nh(i+vec2(0.0, 1.0)), nh(i+vec2(1.0, 1.0)), u.x), u.y);
}
float nF(vec2 p){ return nN(p)*0.5+nN(p*2.03+7.1)*0.3+nN(p*4.11+3.7)*0.2; }
// A family of filaments along k: ridges of noise drawn out st times along it, thin and bright,
// in four octaves from width L down; each octave finer than a pixel's footprint (pix, km) goes to
// its mean, as fine structure does to the eye near the horizon.
float strands(vec2 p, vec2 k, float L, float st, float pix, float seed){
  vec2 r=vec2(dot(p, k), dot(p, vec2(-k.y, k.x)));
  float acc=0.0, wsum=0.0, amp=1.0;
  for(int o=0;o<4;o++){
    float rg=1.0-abs(2.0*nN(vec2(r.x/(st*L), r.y/L)+seed+float(o)*17.3)-1.0);
    rg*=rg*rg;
    acc+=amp*mix(0.25, rg, 1.0-smoothstep(0.25*L, 0.8*L, pix)); wsum+=amp;
    L*=0.45; amp*=0.75;
  }
  return acc/wsum;
}
void main(){
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch);
  fragColor=vec4(0.0);
  if(rd.z<=0.0) return;
  // The point on the layer, about the true Earth, and the Sun's cosine there.
  const float R=6371000.0, H=${NLC.h*1000}.0;
  float b=R*rd.z, t=-b+sqrt(b*b+2.0*R*H+H*H);
  vec3 P=rd*t, n=normalize(vec3(P.xy, P.z+R));
  float muP=dot(n, sd), muh=-sqrt(1.0-(R/(R+H))*(R/(R+H))), u=(muP-muh)/(1.0-muh);
  if(u<=0.0) return;
  // Poleward of their edge.
  float latP=nlcP.y+P.y/111195.0, pole=nlcP.y<0.0?-latP:latP;
  float edge=smoothstep(nlcP.z-3.0, nlcP.z+6.0, pole);
  if(edge<=0.0) return;
  // Their shape, in km on the layer: a web of fine filaments, long streaks drawn out along the
  // wind (bands) crossed by shorter ones (billows), bent by the gravity waves that make them, in
  // soft-edged fields a few hundred km across that brighten and fade, all drifting with the wind.
  vec2 q=P.xy/1000.0+nlcDrift+nlcP.w*vec2(131.0, 77.0);
  float muv=max(dot(rd, n), 0.03), pix=t*2.0*(fov<2e-3?0.5*fov:tan(fov*0.5))/res.y/1000.0/muv;
  float clump=smoothstep(0.35, 0.75, nF(q/380.0)*0.6+nF(q/120.0+6.1)*0.4+0.08);
  if(clump<=0.0) return;
  vec2 w=q+70.0*(vec2(nF(q/260.0), nF(q/260.0+9.1))-0.5)+18.0*(vec2(nF(q/60.0+3.3), nF(q/60.0+7.7))-0.5);
  vec2 kA=normalize(vec2(0.8+0.3*sin(nlcP.w), 0.6)), kB=vec2(-kA.y, kA.x)*0.87+kA*0.5;
  vec2 kC=vec2(-kA.y, kA.x)*0.6-kA*0.8;
  float sA=strands(w, kA, 24.0, 4.0, pix, 1.7), sB=strands(w, kB, 10.0, 2.5, pix, 5.3), sC=strands(w, kC, 14.0, 3.0, pix, 9.1);
  float web=0.45*sA+0.25*sB+0.2*sC+1.4*sA*sB+1.0*sA*sC+0.8*sB*sC;
  // Between the filaments the sky is nearly clear.
  float fil=smoothstep(0.25, 1.2, web);
  float shape=clump*(0.35+1.3*nF(q/140.0+2.2))*fil*fil*5.0;
  // The tropospheric cloud tops that screen the grazing sunlight (nlc.py) differ from place to
  // place by several km, so the Earth's shadow on the layer has a ragged, uneven edge: u, the
  // Sun's place, moved by up to about 15 km of screening height (0.017 in u) over the layer.
  u+=0.012*(2.0*nF(q/300.0+4.4)-1.0)+0.005*(2.0*nF(q/60.0+8.8)-1.0);
  if(u<=0.0) return;
  // And the layer is a km or two deep, its grains caught by the shadow at different heights:
  // the edge softens over a few km more.
  shape*=smoothstep(0.0, 0.03, u);
  float tau=nlcP.x*edge*shape;
  // The table (nlc.py): by the view's elevation and the Sun's place at the cloud.
  float el=asin(clamp(rd.z, 0.0, 1.0))*57.2957795;
  float iu=sqrt(min(u, 0.25)/0.25)*${NLC.nu-1}.0, ie=sqrt(el/90.0)*${NLC.ne-1}.0;
  vec3 Q=pow(vec3(10.0), ${NLC.lo.toFixed(1)}+${NLC.span.toFixed(1)}*texture(nlcTab, vec2((iu+0.5)/${NLC.nu}.0, (ie+0.5)/${NLC.ne}.0)).rgb);
  float c=dot(rd, sd), ph=0.75*(1.0+c*c);
  // The Sun's illuminance above the air (lux), the share each steradian takes, the slant.
  vec3 L=133100.0*tau*ph/12.566371*Q/muv;
  float Y=dot(L, vec3(0.2126, 0.7152, 0.0722));
  if(!(Y>0.0)) return;
  // The sky behind (its luminance ratio, as the sky shader reads it) and the light raised to show.
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float a=texture(sky, vec2((fract(comp/6.28318530718)*na+0.5)/(na+1.0), ((90.0-el)/90.0*nr+0.5)/(nr+1.0))).a;
  float rBg=pow(10.0, a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)}), rA=Y/rCd, ref=max(rBg, ${DSO_REF_CD.toExponential(3)}/rCd);
  float tBg=toneT(rBg), tWant=max(toneT(rBg+rA), s2lin(min(lin2s(tBg)+${DSO_STEP.toFixed(5)}*log((ref+rA)/ref)*0.4342945, 1.0)));
  float lo=log(rA), hi=lo+18.0;
  if(toneT(rBg+exp(lo))<tWant){
    for(int i=0;i<20;i++){ float mid=0.5*(lo+hi); if(toneT(rBg+exp(mid))<tWant) lo=mid; else hi=mid; }
    L*=exp(hi)/rA; Y*=exp(hi)/rA;
  }
  fragColor=vec4(L, Y)*1000.0;
}`;
// Whether any of tonight's clouds nt can be in view, the Sun toward sd: the shader's tests for the
// layer's point along a ray, poleward of the clouds' edge (with 2° to spare) and in sunlight (with
// more than the ragged shadow's 0.017), at each ray of a grid across the view (viewGridRays).
function nlcInView(nt, sd){
  const R=6371000, H=NLC.h*1000, lat=LATDEG[dLat]??45, muh=-Math.sqrt(1-(R/(R+H))**2);
  for(const rd of viewGridRays()){
    if(rd[2]<=0) continue;
    const b=R*rd[2], t=-b+Math.sqrt(b*b+2*R*H+H*H), P=[rd[0]*t, rd[1]*t, rd[2]*t], l=Math.hypot(P[0], P[1], P[2]+R);
    const u=((P[0]*sd[0]+P[1]*sd[1]+(P[2]+R)*sd[2])/l-muh)/(1-muh), latP=lat+P[1]/111195, pole=lat<0?-latP:latP;
    if(u>-0.03&&pole>nt.lat-5) return true;
  }
  return false;
}
// Draws tonight's clouds into the aurora's target, after the aurora if it was drawn (aur), else
// over a cleared one. True when there are any to show; leaves the sky program in use with the
// target on unit 9.
function drawNlcVR(gl, c, aur){
  if(!vrGL.hitFloat || airOff()) return false;
  const sunEl=90-skyNow.sza;
  if(sunEl>-2 || sunEl<-20) return false;
  const key=EP[dIdx].key, nt=nlcTonight(key);
  if(!nt) return false;
  // None where no ray across the view meets the layer poleward of their edge and in sunlight.
  const sd=horizDir(skyNow.sunAz, sunEl), gk=[vrYaw, vrPitch, vrFov, sunEl, skyNow.sunAz, nt.lat, dLat].join('|');
  if(vrGL.nlcGateKey!==gk){ vrGL.nlcGateKey=gk; vrGL.nlcGate=nlcInView(nt, sd); }
  if(!vrGL.nlcGate) return false;
  if(!vrGL.nlcProg){
    if(!vrGL.nlcJob){
      vrGL.nlcJob=true;
      whenLinked(gl, [glProgramAsync(gl, vrGL.vs, NLCFS)], p=>{
        if(!vrGL || !p) return;
        vrGL.nlcProg=p; vrGL.nlcU=uniformLocs(gl, p, ['res','yaw','pitch','fov','sd','nlcP','nlcDrift','nr','na','rCd','toneU']);
        gl.useProgram(p); bindSamplers(gl, p, [['nlcTab', 21], ['sky', 0]]);
        vrRestoreGL(gl); requestVR();
      });
    }
    return false;
  }
  // The epoch's table on unit 21.
  const tk=NLC.epochs[key]?key:NLC.epochs[airFor(key)]?airFor(key):'modern';
  gl.activeTexture(gl.TEXTURE21);
  if(vrGL.nlcTabKey!==tk){
    if(!vrGL.nlcTab){ vrGL.nlcTab=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, vrGL.nlcTab); texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE); }
    else gl.bindTexture(gl.TEXTURE_2D, vrGL.nlcTab);
    const b=atob(NLC.epochs[tk]), n=NLC.nu*NLC.ne, px=new Uint8Array(n*4);
    for(let i=0;i<n;i++){ for(let q=0;q<3;q++) px[i*4+q]=b.charCodeAt(i*3+q); px[i*4+3]=255; }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, NLC.nu, NLC.ne, 0, gl.RGBA, gl.UNSIGNED_BYTE, px);
    vrGL.nlcTabKey=tk;
  } else gl.bindTexture(gl.TEXTURE_2D, vrGL.nlcTab);
  // The target, the aurora's size (drawAuroraVR).
  const dpr=Math.min(window.devicePixelRatio||1, 2), s=dpr>=1.5?0.5:0.75;
  const w=Math.max(2, Math.round(c.width*s)), h=Math.max(2, Math.round(c.height*s));
  if(!vrGL.aurFbo) vrGL.aurFbo=gl.createFramebuffer();
  gl.activeTexture(gl.TEXTURE9);
  if(vrGL.aurW!==w||vrGL.aurH!==h||!vrGL.aurTex){
    if(vrGL.aurTex) gl.deleteTexture(vrGL.aurTex);
    const t=vrGL.aurTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.aurFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    vrGL.aurW=w; vrGL.aurH=h;
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.aurFbo); gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.viewport(0, 0, w, h);
  if(!aur){ gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  const p=vrGL.nlcProg, nu=vrGL.nlcU;
  gl.useProgram(p);
  gl.uniform2f(nu.res, w, h); gl.uniform1f(nu.fov, vrFov*Math.PI/180);
  gl.uniform1f(nu.yaw, vrYaw*Math.PI/180); gl.uniform1f(nu.pitch, vrPitch*Math.PI/180);
  gl.uniform3fv(nu.sd, new Float32Array(horizDir(skyNow.sunAz, sunEl)));
  gl.uniform4f(nu.nlcP, nt.tau, LATDEG[dLat]??45, nt.lat, nt.seed);
  // About 40 m/s toward the south-west, from the clock's minutes into the night.
  const sec=((cloudDate().m+DAYMIN/2)%DAYMIN)*60;
  gl.uniform2f(nu.nlcDrift, 0.03*sec, 0.02*sec);
  gl.uniform1f(nu.nr, skyNow.nr); gl.uniform1f(nu.na, skyNow.na); gl.uniform1f(nu.rCd, skyNow.rCd);
  gl.uniform4f(nu.toneU, skyNow.toneK, skyNow.toneP, 0.95, TOE_CD);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vrGL.tex);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawBuffers([gl.BACK]); gl.viewport(0, 0, c.width, c.height);
  gl.useProgram(vrGL.prog);
  gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, vrGL.aurTex);
  gl.activeTexture(gl.TEXTURE0);
  return true;
}
