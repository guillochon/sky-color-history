const VRFS=`#version 300 es
precision highp float;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform sampler2D weather; uniform sampler2D hitInfo; uniform sampler2D hitNrm; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn,mtnSnow;
uniform float moonAz,moonEl,moonRad,moonOn,latRad,starPx,cloudCov,cloudScale,cloudDrift,cloudOn;
uniform vec3 sunCol,ground,eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
float h12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973));
  q+=dot(q, q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float vN(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(h12(i), h12(i+vec2(1.0,0.0)), u.x), mix(h12(i+vec2(0.0,1.0)), h12(i+vec2(1.0,1.0)), u.x), u.y);
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
float massifRad(float R, float volc){ return R*mix(1.28, 1.12, volc); }
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
  if(showScn>0.5 && hit.r>0.0){
    tBest=hit.r; kBest=hit.g; nBest=hn.rgb; pBest=ro+rd*hit.r;
    qBest=obj[int(hit.a+0.5)]; hBest=qBest.w;
  }
  if(showScn>0.5 && hn.a>0.0 && hn.a<tBest){
    tLand=hn.a; kBest=0.0; tBest=hn.a; pBest=ro+rd*hn.a; nBest=hn.rgb;
  }
  vec3 col;
  if(showScn<0.5){ kBest=0.0; tLand=-1.0; }
  if(kBest>0.5&&kBest<2.5){
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
    }
  }
  if(kBest>0.5){
    float volc=step(1.5, kBest);
    vec3 albedo=vec3(0.46,0.38,0.31);
    vec3 emit=vec3(0.0);
    if(kBest>4.5) albedo=vec3(0.10,0.26,0.08);
    else if(kBest>3.5) albedo=vec3(0.74,0.71,0.66);
    else if(kBest>2.5) albedo=vec3(0.86,0.90,0.94);
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
      float snow=mtnSnow*step(volc, 0.5)*smoothstep(450.0, 1000.0, hBest);
      snow*=smoothstep(snowLine, snowLine+0.12, hh)*smoothstep(0.36, 0.74, steep);
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
    float sh=kBest<2.5?shBest:1.0;
    float ao=mix(0.58, 1.0, clamp(nBest.z,0.0,1.0));
    float lit=(0.40*ao+0.95*ndl*sh)*(0.42+0.58*sunMu);
    if(kBest>2.5&&kBest<3.5) lit=(0.78+0.35*ndl)*(0.85+0.15*sunMu);
    col=albedo*lit+emit;
    if(kBest<2.5){
      float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
      float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
      vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
      float fog=1.0-exp(-tBest/16000.0);
      col=mix(col, skyC, clamp(fog, 0.0, 0.8));
      float hh=pBest.z/max(hBest,1.0);
      col=mix(gcol, col, smoothstep(0.0, 0.035, hh));
    }
  }else if(tLand>0.0){
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
    float fog=1.0-exp(-tLand/18000.0);
    col=mix(gcol, skyC, clamp(fog, 0.0, 0.82));
  }else{
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec3 skyC=texture(sky, vec2(uTex,vTex)).rgb;
    float skyL=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
    float te=trueAlt(elevDeg), teR=te*0.01745329252, cth=cos(teR);
    vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
    bool inSun=sunOn>0.5&&te>-1.0&&dot(src,sd)>cos(sunRad);
    bool onBody=inSun;
    if(inSun) skyC=sunCol;
    if(moonOn>0.5&&te>-1.2){
      float mA=moonAz*0.01745329252, mZ=(90.0-moonEl)*0.01745329252;
      vec3 md=normalize(vec3(sin(mA)*sin(mZ), cos(mA)*sin(mZ), cos(mZ)));
      if(dot(src,md)>cos(moonRad)){
        onBody=true;
        if(inSun) skyC=vec3(0.0);
        else {
        vec3 ncp=vec3(0.0, cos(latRad), sin(latRad));
        vec3 north=ncp-md*dot(ncp,md);
        if(dot(north,north)<1e-6) north=vec3(1.0,0.0,0.0);
        north=normalize(north);
        vec3 east=normalize(cross(north, md));
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
    if(!onBody && te>0.0){
      float night=1.0-smoothstep(0.05, 0.22, skyL);
      if(night>0.02){
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
          skyC+=texelFetch(starMap, ivec2(si, 1), 0).rgb*wgt*night;
        }
      }
    }
    float w=max(fwidth(elevDeg),0.04);
    col=mix(gcol, skyC, smoothstep(-w,w,elevDeg));
  }
  fragColor=vec4(col,1.0);
}`;

