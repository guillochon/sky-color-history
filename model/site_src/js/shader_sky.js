const VRFS=`#version 300 es
precision highp float;
// VRFS_BOOT sets this to 0: sky and plain ground only, which compiles fast enough to show
// while the full program compiles in the background.
#define SCENERY 1
uniform sampler2D noiseTex;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform sampler2D weather; uniform sampler2D hitInfo; uniform sampler2D hitNrm; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn,mtnSnow;
uniform float moonAz,moonEl,moonRad,moonOn,latRad,starPx,cloudCov,cloudScale,cloudDrift,cloudOn,clockH,snowCover,waterT,snOn;
uniform vec3 snDir,snCol,snLight,mlDir,mlLight;
uniform vec3 sunCol,ground,eye;
uniform float corona;
uniform sampler2D mwTex;
uniform vec4 toneU; // display curve: k, p, cap, cd/m² per unit r (color.js toneT)
uniform float rCd,mwOn,mwScale,mwK,mwDB;
uniform vec3 galX,galY,galZ;
// The aurora, from its own pass (aurora.js) at reduced size, in cd/m² times 1000.
uniform sampler2D aurTex; uniform float aurOn;
${TONE_GLSL}
${AUR_MIX_GLSL}
// Naked-eye limiting magnitude against a sky of L cd/m² (color.js nakedEyeLimit).
float nakedEyeLimit(float L){
  float msky=-2.5*log(max(L, 1e-12)/10.8e4)/2.302585;
  return 7.93-5.0*log(pow(10.0, 4.316-msky/5.0)+1.0)/2.302585;
}
// Extinction toward true altitude el (degrees), k magnitudes per airmass (milkyway.js).
${AIRMASS_GLSL}
float extinctionAt(float el, float k){
  return pow(10.0, -0.4*k*(airmass(max(el, 0.0))-1.0));
}
uniform vec4 beads[6];
float limbH(float pa){ return 0.002*sin(7.0*pa+1.3)+0.00167*sin(12.0*pa+4.1)+0.00133*sin(19.0*pa+2.2)+0.001*sin(29.0*pa+5.0)+0.00083*sin(41.0*pa+0.7)+0.00067*sin(57.0*pa+3.3)+0.0005*sin(83.0*pa+1.9); } // moon.js limbH
uniform vec4 obj[12];
uniform vec4 pond[8];
uniform float pondN;
uniform float kind[12];
out vec4 fragColor;
float h12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973));
  q+=dot(q, q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
// Value noise from a 128x128 texture of random values. Sampling at the lattice point plus the
// smoothstepped fraction makes the bilinear filter do the smooth interpolation in one fetch,
// which keeps the compiled shader far smaller than hashing four corners per call.
float vN(vec2 p){
  vec2 i=floor(p), f=fract(p);
  return textureLod(noiseTex, (i+f*f*(3.0-2.0*f)+0.5)/128.0, 0.0).r;
}
float rollAt(vec2 p){
  return vN(p*0.00028)*16.0+vN(p*0.0001+vec2(3.0, 1.2))*12.0;
}
vec3 rollN(vec2 p){
  float e=90.0;
  float hx=rollAt(p+vec2(e,0.0))-rollAt(p-vec2(e,0.0));
  float hy=rollAt(p+vec2(0.0,e))-rollAt(p-vec2(0.0,e));
  return normalize(vec3(-hx, -hy, 2.0*e));
}
vec3 vNd(vec2 p){ // value noise and its gradient
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f), du=6.0*f*(1.0-f);
  float a=textureLod(noiseTex, (i+0.5)/128.0, 0.0).r, b=textureLod(noiseTex, (i+vec2(1.5, 0.5))/128.0, 0.0).r;
  float c=textureLod(noiseTex, (i+vec2(0.5, 1.5))/128.0, 0.0).r, d=textureLod(noiseTex, (i+1.5)/128.0, 0.0).r, k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y, du*vec2(b-a+k*u.y, c-a+k*u.x));
}
// Metre-scale relief on the open ground: xy is the height gradient, z the height in metres.
// Octaves finer than the pixel footprint fade out so the far field doesn't shimmer.
vec3 groundRelief(vec2 p, float foot){
  const mat2 rot=mat2(0.8, 0.6, -0.6, 0.8);
  mat2 R=mat2(1.0);
  vec2 g=vec2(0.0); float h=0.0, wl=34.0, amp=1.8;
  for(int i=0;i<6;i++){
    float f=1.0/wl, fade=1.0-smoothstep(0.15, 0.45, foot*f);
    if(fade<=0.0) break;
    vec3 n=vNd(R*p*f+float(i)*7.31);
    h+=(n.x-0.5)*amp*fade;
    g+=(n.yz*R)*f*amp*fade;
    R=rot*R; wl*=0.36; amp*=0.40;
  }
  return vec3(g, h);
}
float groundMottle(vec2 p, float foot){
  float m=0.0, wl=22.0, amp=0.5;
  for(int i=0;i<5;i++){
    float fade=1.0-smoothstep(0.15, 0.45, foot/wl);
    if(fade<=0.0) break;
    m+=(vN(p/wl+float(i)*4.13+11.0)-0.5)*amp*fade;
    wl*=0.32; amp*=0.8;
  }
  return m;
}
float massifRad(float R, float volc){ return volc>1.5?R*1.08:R*mix(1.28, 1.12, volc); }
float apparentEl(float h){ // Saemundsson 1986, true altitude (deg) to apparent
  if(h>80.0) return h;
  float u=h+10.3/(h+5.11);
  if(u<0.25) return h;
  return h+(1.02/tan(u*0.01745329252))/60.0;
}
float trueAlt(float app){ // Bennett 1982, apparent altitude (deg) to true
  if(app>80.0) return app;
  return app-(1.0/tan((app+7.31/(app+4.4))*0.01745329252))/60.0;
}
int starCubeCell(vec3 d){
  float ax=abs(d.x), ay=abs(d.y), az=abs(d.z);
  int face; float u, v, s;
  if(ax>=ay && ax>=az){
    s=ax;
    if(d.x>=0.0){ face=0; u=d.y/s; }
    else { face=1; u=-d.y/s; }
    v=d.z/s;
  }else if(ay>=ax && ay>=az){
    s=ay;
    if(d.y>=0.0){ face=2; u=d.x/s; }
    else { face=3; u=-d.x/s; }
    v=d.z/s;
  }else{
    s=az;
    if(d.z>=0.0){ face=4; u=d.x/s; }
    else { face=5; u=-d.x/s; }
    v=d.y/s;
  }
  int iu=clamp(int(floor((u+1.0)*4.0)), 0, 7);
  int iv=clamp(int(floor((v+1.0)*4.0)), 0, 7);
  return (face*8+iv)*8+iu;
}
// Window lights. Each window switches on at its own point as the sun goes from 3 degrees above
// the horizon to 5 below, and off at its own time within an hour of offAt (local hours). One in
// twelve stays on all night. dark runs 0 to 1 over that dusk.
float windowOn(vec2 id, float seed, float frac, float offAt, float dark){
  float pick=h12(id+seed*97.0), a=h12(id+seed*31.0+5.1), b=h12(id+seed*13.0+9.7);
  float on=(b>0.92 || (clockH>=12.0 && clockH<offAt-1.0+2.0*b))?1.0:0.0;
  return step(pick, frac)*step(a*0.8+0.1, dark)*on;
}
// The average of windowOn over many windows, for buildings too far away to resolve them.
float windowMean(float frac, float offAt, float dark){
  float pOn=0.08+(clockH>=12.0?clamp(0.92-(clockH-offAt+1.0)*0.5, 0.0, 0.92):0.0);
  return frac*clamp((dark-0.1)/0.8, 0.0, 1.0)*pOn;
}
// Light at night from the Moon (ml) and a supernova (sn), on a surface with normal n.
vec3 nightLit(vec3 n){ return snLight*max(dot(n, snDir), 0.0)+mlLight*max(dot(n, mlDir), 0.0); }
vec3 skyLook(vec3 d){
  float c=atan(d.x, d.y); if(c<0.0) c+=6.28318530718;
  float el=asin(clamp(d.z, -1.0, 1.0))*57.2957795;
  return texture(sky, vec2((fract(c/6.28318530718)*na+0.5)/(na+1.0), ((90.0-max(el, 0.0))/90.0*nr+0.5)/(nr+1.0))).rgb;
}
void main(){
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
  float compDeg=comp*57.2957795;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  vec4 hit=texelFetch(hitInfo, ivec2(gl_FragCoord.xy), 0);
  vec4 hn=texelFetch(hitNrm, ivec2(gl_FragCoord.xy), 0);
  float tBest=1e8, kBest=0.0, hBest=1.0, tLand=-1.0, shBest=hit.b;
  vec3 nBest=vec3(0.0,0.0,1.0), pBest=ro; vec4 qBest=vec4(0.0);
  bool hill=showScn>0.5 && hit.g>0.5 && hit.g<1.5 && hit.a>40.0;
  if(hill){
    tBest=hit.r; kBest=1.0; nBest=hn.rgb; pBest=ro+rd*hit.r;
    hBest=hn.a; qBest=vec4(pBest.xy, hit.a, hn.a);
  }else if(showScn>0.5 && hit.r>0.0){
    tBest=hit.r; kBest=hit.g; nBest=hn.rgb; pBest=ro+rd*hit.r;
    if(kBest>5.5){ hBest=hit.a; qBest=vec4(0.0, 0.0, hit.a, hn.a); } // towns: height or eave, and a seed
    else { qBest=obj[int(hit.a+0.5)]; hBest=qBest.w; }
  }
  vec3 col;
  if(showScn<0.5){ kBest=0.0; tLand=-1.0; }
  if(kBest>0.5&&kBest<3.5){
    float wl=clamp(tBest*0.034, 8.0, 220.0);
    float a=vN(pBest.xy/wl), b=vN(pBest.xy/wl+vec2(0.5,0.15)), c=vN(pBest.xy/wl+vec2(0.15,0.5));
    nBest=normalize(nBest+vec3(a-b, a-c, 0.0)*0.28);
  }
  float hlen=length(rd.xy);
  float toward=hlen>1e-4?dot(rd.xy/hlen, vec2(sin(sunA),cos(sunA))):0.0;
  vec3 gcol=showScn>0.5?ground*mix(0.9,1.08,clamp(toward*0.5+0.5,0.0,1.0)):vec3(0.02,0.025,0.04);
  if(showScn>0.5&&(tLand>0.0||rd.z<0.0)){
    float tG=tLand>0.0?tLand:-ro.z/rd.z;
    vec3 gp3=ro+rd*tG; vec2 gp=gp3.xy;
    vec3 nG=tLand>0.0?nBest:rollN(gp);
    gcol*=mix(0.90, 1.06, texture(weather, gp*0.00028+0.12).b);
    gcol*=mix(0.84, 1.10, vN(gp*0.00115+3.0));
#if SCENERY
    float foot=tG*2.0*fy/res.y/sqrt(max(abs(rd.z), 0.002));
    vec3 relief=groundRelief(gp, foot);
    if(tLand<0.0) nG=normalize(nG+vec3(-relief.xy, 0.0));
    // Bare and grassy patches, scaled by how colourful the ground is so snow stays white.
    float gmx=max(gcol.r, max(gcol.g, gcol.b)), chroma=(gmx-min(gcol.r, min(gcol.g, gcol.b)))/max(gmx, 1e-4);
    float patchy=smoothstep(0.38, 0.66, vN(gp/120.0+7.7)+(vN(gp/31.0+2.3)-0.5)*0.55-relief.z*0.12);
    float colourful=clamp(chroma*1.6, 0.0, 1.0);
    gcol*=mix(vec3(1.0), mix(vec3(0.88, 1.04, 0.94), vec3(1.24, 1.06, 0.72), patchy), colourful);
    gcol*=1.0+groundMottle(gp, foot)*mix(0.3, 0.8, colourful);
    gcol*=1.0+clamp(relief.z*0.18, -0.14, 0.08);
#endif
    gcol=mix(gcol, gcol*vec3(0.84, 0.78, 0.70), (1.0-smoothstep(0.55, 0.92, nG.z))*0.5);
    gcol=mix(gcol, gcol*vec3(1.06, 1.02, 0.95), smoothstep(28.0, 130.0, gp3.z)*0.4);
    if(cloudOn>0.5){
      vec2 wind=vec2(cloudDrift, cloudDrift*0.42);
      float c0=texture(weather, (gp+wind)*cloudScale*0.33).r;
      vec3 sp=gp3+sd*(1800.0/max(sd.z, 0.2));
      float c1=texture(weather, (sp.xy+wind)*cloudScale*0.33).r;
      float cov=clamp(cloudCov+(max(c0, c1)-0.56)/0.09*0.26, 0.0, 1.0);
      gcol*=mix(1.0, 0.5, smoothstep(0.3, 0.8, cov));
    }
    if(kBest<0.5){
      float ndl=max(dot(nG, sd), 0.0);
      float rel=clamp((0.20+ndl)/(0.20+max(sd.z, 0.05)), 0.32, 1.9);
      gcol*=rel*mix(0.80, 1.0, nG.z);
      gcol*=mix(0.58, 1.0, shBest);
      gcol+=nightLit(nG)*0.16;
    }
#if SCENERY
    // Pools: pond[i] is (centre, radius, kind) with kind 0 water, 1 magma, 2 ice, 3 swamp.
    // The shore wanders with two octaves of noise. Hills are kept out of them by the hit pass.
    if(tLand<0.0 && kBest<0.5){
      float pk=-1.0, edge=0.0, shore=0.0;
      for(int i=0;i<int(pondN);i++){
        vec4 q=pond[i];
        float d=length(gp-q.xy)/q.z;
        if(d>1.5) continue;
        d+=(vN(gp/(q.z*0.3)+q.xy*0.013)-0.5)*0.45+(vN(gp/(q.z*0.08)+5.0)-0.5)*0.1;
        if(d<1.0){ pk=q.w; edge=(1.0-d)*q.z; break; }
        shore=max(shore, 1.0-smoothstep(1.0, 1.0+5.0/q.z, d));
        if(shore>0.0) pk=q.w-10.0;
      }
      float light=0.42+0.58*sunMu, detail=1.0-smoothstep(0.3, 1.5, foot);
      if(pk>-0.5 && (pk<0.5 || pk>2.5)){
        // Two ripple layers drifting different ways over a slow swell. waterT is real seconds;
        // swamp water moves at a third of the speed.
        float wt=waterT*(pk>2.5?0.3:1.0);
        vec3 r1=vNd(gp*0.45+vec2(0.31, 0.17)*wt), r2=vNd(gp*1.3+7.0-vec2(0.22, 0.41)*wt), r3=vNd(gp*0.12+vec2(-0.05, 0.04)*wt);
        vec3 wn=normalize(vec3(-((r1.yz*0.45+r2.yz*0.35)*detail+r3.yz*0.25)*0.12, 1.0));
        vec3 refl=reflect(rd, wn);
        float fres=0.02+0.98*pow(1.0-clamp(-dot(rd, wn), 0.0, 1.0), 5.0);
        vec3 deep=pk>2.5?vec3(0.035, 0.045, 0.02):vec3(0.012, 0.035, 0.05);
        vec3 wc=mix(deep*light, skyLook(refl), fres);
        wc+=sunCol*pow(max(dot(refl, sd), 0.0), 300.0)*step(0.0, sd.z)*2.0;
        wc+=snLight*pow(max(dot(refl, snDir), 0.0), 300.0)*6.0+mlLight*pow(max(dot(refl, mlDir), 0.0), 120.0)*4.0;
        if(pk>2.5) wc=mix(wc, vec3(0.10, 0.16, 0.05)*light, smoothstep(0.55, 0.72, vN(gp/7.0+vec2(0.02, 0.01)*waterT))*0.75);
        gcol=mix(gcol*0.55, wc, smoothstep(0.0, 3.0, edge));
      }else if(pk>0.5 && pk<1.5){
        // The crust and its cracks creep together at about 3.5 cm/s, the open melt churns,
        // and the glow pulses.
        vec2 creep=vec2(0.035, 0.018)*waterT;
        float crust=vN((gp-creep)/9.0)*0.6+vN((gp-creep)/3.1)*0.4;
        float crack=mix(0.1, 1.0-smoothstep(0.0, 0.05, abs(vN((gp-creep)/5.0+3.3)-0.5)), detail);
        float pool=smoothstep(6.0, 40.0, edge)*smoothstep(0.45, 0.7, vN(gp/30.0+9.1+vec2(0.013, -0.009)*waterT));
        float glow=max(pool, crack*0.8)*(0.75+0.25*crust)*smoothstep(0.0, 3.0, edge);
        glow*=0.82+0.18*sin(waterT*1.3+vN(gp/12.0)*12.0);
        gcol=gcol*0.3*(0.8+0.4*crust)+vec3(1.9, 0.55, 0.08)*glow*(0.6+0.6*pool);
      }else if(pk>1.5 && pk<2.5){
        vec3 refl=reflect(rd, vec3(0.0, 0.0, 1.0));
        float fres=0.02+0.98*pow(1.0-clamp(-rd.z, 0.0, 1.0), 5.0);
        float crack=(1.0-smoothstep(0.0, 0.03, abs(vN(gp/12.0)-0.5)))*detail;
        vec3 ice=gcol*vec3(0.55, 0.74, 0.92)*(0.9+0.2*vN(gp/40.0));
        gcol=mix(ice, skyLook(refl), fres*0.7)+gcol*0.25*crack;
      }else if(pk<-5.0){
        float k=pk+10.0;
        gcol*=k>0.5&&k<1.5?vec3(mix(1.0, 0.35, shore)):(k>1.5&&k<2.5?vec3(1.0):mix(vec3(1.0), vec3(0.62, 0.6, 0.56), shore));
      }
    }
#endif
  }
#if SCENERY
  if(kBest>7.5){
    // Trees (8). hBest is style*2+part: part 0 trunk, 1 crown. Leaf clumps bump the crown
    // normal at metre scale and fade with distance; foliage wraps light a little.
    float sty=floor(hBest*0.5+0.25), part=hBest-sty*2.0, seed=qBest.w, foot=tBest*2.0*fy/res.y;
    vec3 n=nBest, albedo;
    if(part<0.5){
      albedo=sty>4.5?vec3(0.05, 0.045, 0.04):(sty>1.5&&sty<2.5?vec3(0.30, 0.29, 0.21):vec3(0.27, 0.21, 0.15));
      float ang=atan(n.y, n.x), detail=1.0-smoothstep(0.05, 0.2, foot);
      float bark=sty>1.5&&sty<2.5
        ?step(0.32, abs(fract(ang*1.6+pBest.z*0.8)-0.5)+abs(fract(ang*1.6-pBest.z*0.8)-0.5))
        :step(0.3, fract(ang*3.0+vN(vec2(ang*3.0, pBest.z*0.5))*0.6));
      albedo*=mix(1.0, 0.75+0.25*bark, detail);
    }else{
      vec3 leaf=sty<0.5?vec3(0.16, 0.27, 0.07):(sty<1.5?vec3(0.07, 0.16, 0.07):(sty<2.5?vec3(0.13, 0.21, 0.06):(sty<3.5?vec3(0.15, 0.29, 0.07):vec3(0.16, 0.25, 0.09))));
      leaf*=mix(0.8, 1.2, fract(seed*13.1));
      float detail=1.0-smoothstep(0.15, 0.6, foot);
      vec3 q=pBest*1.3;
      float a=vN(q.xy+q.z*1.7), b=vN(q.yz*1.1+3.1), c=vN(q.zx*1.2+7.3);
      n=normalize(n+(vec3(a, b, c)-0.5)*1.4*detail);
      albedo=leaf*mix(1.0, 0.7+0.6*a, detail);
    }
    float wrap=part>0.5?clamp(dot(n, sd)*0.65+0.35, 0.0, 1.0):max(dot(n, sd), 0.0);
    float ao=mix(0.5, 1.0, n.z*0.5+0.5)*mix(0.7, 1.0, smoothstep(0.0, 2.0, pBest.z));
    col=albedo*(0.45*ao+0.9*wrap)*(0.42+0.58*sunMu)+albedo*(snLight*max(dot(n, snDir)*0.65+0.35, 0.0)+mlLight*max(dot(n, mlDir)*0.65+0.35, 0.0));
    col=mix(col, skyLook(rd), clamp(1.0-exp(-tBest/16000.0), 0.0, 0.8));
  }else if(kBest>5.5){
    // Towers (6) and houses (7). Wall coordinates are world x or y, which line up with the bays
    // because footprints sit on the bay grid. Window detail fades to its average once a bay
    // spans only a few pixels.
    float seed=qBest.w, foot=tBest*2.0*fy/res.y, z=pBest.z;
    vec3 n=nBest;
    float u=abs(n.x)>0.5?pBest.y:pBest.x;
    float night=1.0-smoothstep(0.03, 0.25, sunMu), dark=clamp((3.0-sunEl)/8.0, 0.0, 1.0);
    vec3 refl=reflect(rd, n);
    vec3 env=refl.z>0.0?skyLook(refl):ground*0.7;
    vec3 glass=mix(vec3(0.035, 0.045, 0.055), env, 0.25+0.6*pow(1.0-abs(dot(rd, n)), 4.0));
    vec3 albedo; float win=0.0, lit=0.0;
    if(kBest<6.5){
      float sty=fract(seed*7.13);
      albedo=sty<0.35?vec3(0.60, 0.59, 0.56):(sty<0.6?vec3(0.50, 0.34, 0.26):(sty<0.8?vec3(0.72, 0.70, 0.64):vec3(0.26, 0.30, 0.34)));
      vec2 ws=sty<0.8?vec2(0.55, 0.5):vec2(0.92, 0.8);
      if(abs(n.z)<0.3){
        float bx=u/3.0, bz=z/3.5;
        float m=step(abs(fract(bx)-0.5), ws.x*0.5)*step(abs(fract(bz)-0.55), ws.y*0.5)*step(0.5, z);
        float detail=1.0-smoothstep(0.5, 1.4, foot);
        win=mix(ws.x*ws.y, m, detail);
        float litFrac=mix(0.2, 0.55, fract(seed*3.71));
        lit=mix(windowMean(litFrac, 22.0, dark), windowOn(vec2(floor(bx), floor(bz)), seed, litFrac, 22.0, dark), detail);
      }else albedo=vec3(0.36, 0.36, 0.35);
    }else{
      float pa=fract(seed*5.31), pb=fract(seed*11.7);
      vec3 siding=pa<0.2?vec3(0.86, 0.85, 0.80):(pa<0.4?vec3(0.80, 0.72, 0.58):(pa<0.55?vec3(0.62, 0.70, 0.76):(pa<0.7?vec3(0.84, 0.78, 0.56):(pa<0.85?vec3(0.56, 0.32, 0.24):vec3(0.66, 0.66, 0.62)))));
      vec3 roof=pb<0.4?vec3(0.20, 0.20, 0.21):(pb<0.65?vec3(0.32, 0.24, 0.18):(pb<0.85?vec3(0.55, 0.27, 0.18):vec3(0.30, 0.34, 0.36)));
      if(n.z>0.3){
        float detail=1.0-smoothstep(0.08, 0.3, foot);
        albedo=roof*mix(1.0, 0.82+0.18*step(0.18, fract(z/0.32)), detail);
      }else{
        albedo=siding;
        // One row of windows per storey, centred in each 3.6 m bay, none in the gable.
        float bx=u/3.6, sill=z<3.0?z-0.95:z-3.7;
        float m=step(abs(fract(bx)-0.5), 0.17)*step(0.0, sill)*step(sill, 1.25)*step(z, hBest-0.25);
        float detail=1.0-smoothstep(0.25, 0.7, foot);
        win=mix(0.13, m, detail);
        lit=mix(windowMean(0.5, 22.5, dark), windowOn(vec2(floor(bx), floor(z/2.8)), seed, 0.5, 22.5, dark), detail);
      }
    }
    float ndl=max(dot(n, sd), 0.0);
    float ao=mix(0.62, 1.0, clamp(n.z, 0.0, 1.0))*mix(0.7, 1.0, smoothstep(0.0, 2.5, z));
    col=mix(albedo*((0.40*ao+0.95*ndl)*(0.42+0.58*sunMu)+nightLit(n)), glass, win);
    col+=vec3(1.0, 0.74, 0.42)*win*lit*0.9;
    col=mix(col, skyLook(rd), clamp(1.0-exp(-tBest/16000.0), 0.0, 0.8));
  }else if(kBest>0.5){
    float volc=step(1.5, kBest);
    vec3 albedo=vec3(0.46,0.38,0.31);
    vec3 emit=vec3(0.0);
    if(kBest>4.5) albedo=vec3(0.10,0.26,0.08);
    else if(kBest>3.5) albedo=vec3(0.74,0.71,0.66);
    else if(kBest>2.5){
      // Glacier: white snow on the flats, blue ice on the cliffs, banded by its layers.
      // Layers are hBest*0.022 thick, warped, and dip gently across the massif. Each layer has
      // one band of its own width, position, and colour (deep blue, turquoise, pale blue, grey
      // debris, or near-white), with faint fine lines between. Far away it fades to the mean.
      float sp=hBest*0.022;
      vec2 dip=vec2(cos(qBest.x*0.013), sin(qBest.y*0.017))*0.03;
      float lay=pBest.z/sp+(vN(pBest.xy/90.0)-0.5)*2.5+vN(pBest.xy/25.0)*0.6+dot(pBest.xy-qBest.xy, dip)/sp;
      float detail=1.0-smoothstep(1.0, 4.0, tBest*2.0*fy/res.y/max(sp, 1.0));
      float li=floor(lay), lf=fract(lay);
      float r1=h12(vec2(li, 3.7)), r2=h12(vec2(li, 9.1)), r3=h12(vec2(li, 5.3));
      float wd=mix(0.06, 0.85, r2*r2), ctr=mix(wd*0.5, 1.0-wd*0.5, r3);
      float m=(1.0-smoothstep(wd*0.5-0.03, wd*0.5+0.03, abs(lf-ctr)))*mix(0.55, 0.95, fract(r1*7.3));
      vec3 bc=r1<0.3?vec3(0.18, 0.42, 0.75):(r1<0.5?vec3(0.32, 0.66, 0.84):(r1<0.7?vec3(0.62, 0.80, 0.93):(r1<0.85?vec3(0.46, 0.53, 0.60):vec3(0.90, 0.95, 0.99))));
      float thin=1.0-smoothstep(0.0, 0.05, abs(fract(lay*3.1+r3)-0.5));
      vec3 base=vec3(0.80, 0.89, 0.96);
      vec3 face=mix(base, bc, m)*(1.0-0.12*thin);
      face=mix(mix(base, vec3(0.5, 0.68, 0.85), 0.3), face, detail);
      face*=0.92+0.16*vN(pBest.xy/6.0+pBest.z*0.3);
      albedo=mix(face, vec3(0.94, 0.96, 0.99), smoothstep(0.55, 0.85, nBest.z));
      emit=vec3(0.06, 0.13, 0.22)*(1.0-smoothstep(0.4, 0.8, nBest.z))*(0.42+0.58*sunMu);
    }
    else {
      float hh=clamp(pBest.z/max(hBest,1.0), 0.0, 1.6);
      float steep=clamp(nBest.z, 0.0, 1.0);
      float R=massifRad(qBest.z, volc);
      float u=length(pBest.xy-qBest.xy)/max(R, 1.0);
      float grit=vN(pBest.xy/max(18.0, R*0.09));
      vec3 rock=mix(vec3(0.42,0.37,0.33), vec3(0.24,0.18,0.15), clamp(1.0-mtnSnow,0.0,1.0)*0.9);
      if(volc>0.5) rock=vec3(0.22,0.16,0.14);
      vec3 scree=rock*vec3(1.16, 1.10, 1.04);
      albedo=mix(rock, scree, smoothstep(0.22, 0.70, steep));
      albedo*=mix(0.88, 1.04, grit);
      albedo=mix(mix(ground, rock, 0.4), albedo, smoothstep(0.02, 0.18, hh));
      if(volc>0.5) albedo=mix(albedo, vec3(0.40,0.13,0.05), (1.0-smoothstep(0.06, 0.32, u))*0.85);
      float snowLine=mix(0.88, 0.56, clamp(mtnSnow,0.0,1.0));
      float snow=mtnSnow*step(volc, 0.5)*smoothstep(300.0, 670.0, hBest);
      snow*=smoothstep(snowLine, snowLine+0.12, hh)*smoothstep(0.36, 0.74, steep);
      // snowCover (Snowball Earth) buries every slope but the steep rock faces, whatever the height.
      snow=max(snow, snowCover*step(volc, 0.5)*smoothstep(0.3, 0.6, steep));
      albedo=mix(albedo, vec3(0.94,0.95,0.97), snow);
      if(volc>0.5){
        float seed=texture(weather, qBest.xy*0.00041+0.13).r;
        float erupt=smoothstep(0.32, 0.66, seed);
        float bowl=(1.0-smoothstep(0.035, 0.16, u))*smoothstep(0.20, 0.50, hh);
        float da=atan(pBest.y-qBest.y, pBest.x-qBest.x)-seed*6.2831853;
        da=abs(mod(da+3.14159265, 6.2831853)-3.14159265);
        float streak=(1.0-smoothstep(0.04, 0.28, da))*(1.0-smoothstep(0.14, 0.62, u))*smoothstep(0.03, 0.12, u);
        float hot=max(bowl, streak*0.75)*erupt;
        albedo=mix(albedo, vec3(0.08,0.07,0.07), hot*0.65);
        emit=vec3(1.15, 0.36, 0.04)*hot*(0.55+0.85*(1.0-sunMu));
      }
    }
    float ndl=max(dot(nBest,sd),0.0);
    float sh=kBest<3.5?shBest:1.0;
    float ao=mix(0.58, 1.0, clamp(nBest.z,0.0,1.0));
    float lit=(0.40*ao+0.95*ndl*sh)*(0.42+0.58*sunMu);
    if(kBest>2.5&&kBest<3.5) lit=(0.62+0.6*ndl*sh)*(0.42+0.58*sunMu); // ice scatters light into its shade
    col=albedo*(lit+nightLit(nBest))+emit;
    if(kBest<3.5){
      float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
      float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
      vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
      float fog=1.0-exp(-tBest/16000.0);
      col=mix(col, skyC, clamp(fog, 0.0, 0.8));
      float hh=pBest.z/max(hBest,1.0);
      col=mix(gcol, col, smoothstep(0.0, 0.035, hh));
    }
  }else
#endif
  if(tLand>0.0){
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
    float fog=1.0-exp(-tLand/18000.0);
    col=mix(gcol, skyC, clamp(fog, 0.0, 0.82));
  }else{
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec4 skyT=texture(sky, vec2(uTex,vTex));
    vec3 skyC=skyT.rgb;
    float skyL=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
    // Sky luminance as a fraction of the reference, carried in the texture's alpha as a log.
    float rBg=pow(10.0, skyT.a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)});
    float te=trueAlt(elevDeg), teR=te*0.01745329252, cth=cos(teR);
    vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
    bool inSun=sunOn>0.5&&te>-1.0&&dot(src,sd)>cos(sunRad);
    bool onBody=inSun;
    vec3 skyBase=skyC;
    if(inSun) skyC=sunCol;
    if(moonOn>0.5&&te>-1.2){
      float mA=moonAz*0.01745329252, mZ=(90.0-moonEl)*0.01745329252;
      vec3 md=normalize(vec3(sin(mA)*sin(mZ), cos(mA)*sin(mZ), cos(mZ)));
      vec3 ncp=vec3(0.0, cos(latRad), sin(latRad));
      vec3 north=ncp-md*dot(ncp,md);
      if(dot(north,north)<1e-6) north=vec3(1.0,0.0,0.0);
      north=normalize(north);
      vec3 east=normalize(cross(north, md));
      // The limb has mountains and valleys; sunlight through the valleys makes Baily's beads.
      float cm=dot(src,md);
      bool inMoon=cm>cos(moonRad*1.01)&&acos(clamp(cm, -1.0, 1.0))<moonRad*(1.0+limbH(atan(dot(src,east), dot(src,north))));
      if(inMoon){
        onBody=true;
        {
        // In front of the Sun the Moon is drawn like the rest of its disk: the sky in front of it
        // plus its own dim light.
        skyC=skyBase;
        float s=sin(moonRad);
        float x=dot(src,east)/s, y=dot(src,north)/s, rr=sqrt(x*x+y*y);
        if(rr>1.0){ x/=rr; y/=rr; rr=1.0; }
        vec3 alb=texture(moonMap, vec2(x*0.5+0.5, y*0.5+0.5)).rgb;
        vec3 nrm=normalize(east*x+north*y-md*sqrt(max(1.0-rr*rr,0.0)));
        float lit=smoothstep(-0.02, 0.05, dot(nrm,sd));
        // The air in front of the Moon extincts it (blue first) and the sky
        // already drawn is that same air, so a bright sky veils the disk.
        float mu=max(sin(max(te,0.0)*0.01745329252), 0.04);
        vec3 T=exp(-vec3(0.12, 0.22, 0.48)/mu);
        vec3 moonC=alb*(0.06+0.94*lit)*T;
        float skyY=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
        skyC+=moonC*(1.0-smoothstep(0.0, 1.15, skyY));
        }
      }
    }
    if(mwOn>0.5 && !onBody && te>-1.0 && rBg<6e-6){
      // The Milky Way, behind the air: its light dimmed by extinction and added to the sky's
      // under the same display curve, coloured by its share.
      vec3 gq=vec3(dot(src, galX), dot(src, galY), dot(src, galZ));
      float gb=asin(clamp(gq.z, -1.0, 1.0))*57.2957795-mwDB;
      if(abs(gb)<${MW_BMAX.toFixed(1)}){
        float gl=atan(gq.y, gq.x)*57.2957795;
        float rMw=texture(mwTex, vec2((gl+180.0)/360.0, (gb+${MW_BMAX.toFixed(1)})/${(2*MW_BMAX).toFixed(1)})).r*mwScale*extinctionAt(te, mwK);
        if(rMw>rBg*0.003){
          float rNew=rBg+rMw, tBg=toneT(rBg), tNew=toneT(rNew);
          vec3 mwLin=vec3(${mwLinGLSL()});
          vec3 lin=s2lin3(skyC)*(tBg>0.0?(tNew/tBg)*(rBg/rNew):0.0)+mwLin*tNew*(rMw/rNew);
          skyC=lin2s3(clamp(lin, 0.0, 1.0));
        }
      }
    }
    if(aurOn>0.5 && !onBody && te>-0.5) skyC=auroraMix(skyC, rBg, texture(aurTex, gl_FragCoord.xy/res)*0.001);
    if(corona>0.001 && !onBody && te>-1.0){
      // The corona around the hidden Sun: a bright inner glow falling off steeply, and fainter
      // streamers, strongest toward the solar equator, out to about six solar radii. A thin pink
      // rim (chromosphere) with a few prominences shows where the Moon's edge is close.
      vec3 cn=vec3(0.0, cos(latRad), sin(latRad)), nn=cn-sd*dot(cn, sd);
      nn=dot(nn, nn)<1e-6?vec3(1.0, 0.0, 0.0):normalize(nn);
      vec3 ee=normalize(cross(nn, sd));
      float a=acos(clamp(dot(src, sd), -1.0, 1.0))/sunRad;
      float pa=atan(dot(src, ee), dot(src, nn));
      vec2 ring=vec2(cos(pa), sin(pa));
      float streak=vN(ring*3.0+vec2(17.0, 5.0))*0.7+vN(ring*9.0+vec2(3.0, 11.0))*0.3;
      float streamer=(0.25+1.6*streak*streak)*(0.5+0.5*abs(ring.y));
      float I=(1.0*pow(a, -6.0)+0.9*pow(a, -2.2)*streamer)*(1.0-smoothstep(3.5, 6.5, a));
      float prom=smoothstep(0.62, 0.86, vN(ring*7.0+vec2(29.0, 2.0)));
      float rim=1.0-smoothstep(1.0, 1.03+0.07*prom, a);
      float mu=max(sin(max(te, 0.0)*0.01745329252), 0.04);
      vec3 T=exp(-vec3(0.12, 0.22, 0.48)/mu);
      skyC+=corona*T*(I*vec3(1.0, 0.97, 0.92)+rim*vec3(1.0, 0.3, 0.42)*1.5);
    }
    if(beads[0].w>0.0 && te>-1.0){
      // Baily's beads and the diamond ring: glare around each piece of photosphere still
      // showing through the limb valleys.
      float px=2.0*fy/res.y;
      for(int i=0;i<6;i++){
        vec4 b=beads[i];
        if(b.w<=0.0) break;
        float a=acos(clamp(dot(src, b.xyz), -1.0, 1.0)), g=a/(px*2.5*sqrt(b.w));
        skyC+=sunCol*b.w*(2.5/(1.0+g*g)+0.35*exp(-a/(sunRad*0.3)));
      }
    }
    if(snOn>0.5 && te>0.0){
      // The supernova: unresolved, so a core of a couple of pixels and a glare halo, plus the
      // light the air scatters back over the whole dome at night.
      float a=acos(clamp(dot(src, snDir), -1.0, 1.0)), px=2.0*fy/res.y;
      float dark=1.0-smoothstep(0.05, 0.4, skyL);
      float g=a/(px*2.5);
      skyC+=snCol*((1.0-smoothstep(px*1.2, px*3.2, a))*3.0+0.7/(1.0+g*g)*(0.5+0.5*dark)+0.45*exp(-a/0.012)*(0.35+0.65*dark)
        +dark*(0.14*exp(-a/0.05)+0.035*exp(-a/0.3)+0.012));
    }
    if(!onBody && te>0.0){
      // Each star shows when brighter than the naked-eye limit for the sky around it.
      float lim=nakedEyeLimit(rBg*rCd);
      if(lim>-5.0){
        int cell=starCubeCell(src);
        vec4 info=texelFetch(starBin, ivec2(cell- (cell/64)*64, cell/64), 0);
        int start=int(info.r+0.5), count=int(info.g+0.5);
        for(int k=0;k<96;k++){
          if(k>=count) break;
          int id=start+k;
          int si=int(texelFetch(starIdx, ivec2(id- (id/1024)*1024, id/1024), 0).r+0.5);
          vec4 sp=texelFetch(starMap, ivec2(si, 0), 0);
          float sig=sp.w*starPx;
          if(sig<=0.0) continue;
          float c=dot(src, sp.xyz);
          if(c<1.0-8.0*sig*sig) continue;
          float wgt=exp(-0.5*max(0.0, 2.0*(1.0-c))/(sig*sig));
          vec4 sc=texelFetch(starMap, ivec2(si, 1), 0);
          // Through the air (mwK magnitudes per airmass) the star is fainter: less of it shows,
          // and what shows is dimmer (day.js starThroughAir).
          float m=sc.a-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25);
          skyC+=sc.rgb*wgt*(1.0-smoothstep(lim-0.8, lim+0.2, m))*pow(10.0, -0.2*(m-sc.a));
        }
      }
    }
    float w=max(fwidth(elevDeg),0.04);
    col=mix(gcol, skyC, smoothstep(-w,w,elevDeg));
  }
  fragColor=vec4(col,1.0);
}`;
const VRFS_BOOT=VRFS.replace('#define SCENERY 1', '#define SCENERY 0');
