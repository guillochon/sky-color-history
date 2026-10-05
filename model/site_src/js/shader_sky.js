const VRFS=`#version 300 es
precision highp float;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform sampler2D weather; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn,mtnSnow;
uniform float moonAz,moonEl,moonRad,moonOn,latRad,starPx,cloudCov,cloudScale,cloudDrift,cloudOn;
uniform vec3 sunCol,ground,eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
${TERR}
float scnShadow(vec3 p, vec3 sd){
  if(sd.z<=0.04) return 1.0;
  float sh=1.0;
  vec2 dir=sd.xy; float hl=length(dir);
  if(hl<1e-3) return 1.0;
  dir/=hl; float rise=sd.z/hl;
  for(int i=0;i<12;i++){
    float kk=kind[i];
    if(kk<0.5||kk>=2.5) continue;
    vec4 q=obj[i]; float volc=step(1.5, kk);
    float R=massifRad(q.z, volc);
    if(length(p.xy-q.xy)>R+q.w*min(5.5, 1.15/max(sd.z, 0.04))) continue;
    for(int s=1;s<=5;s++){
      float dist=R*(0.04*float(s)+0.018*float(s*s));
      float h=massifH(p.xy+dir*dist, q, volc);
      float pen=smoothstep(0.0, dist*0.18+3.0, h-(p.z+rise*dist));
      sh=min(sh, mix(1.0, 0.28, pen));
    }
  }
  return sh;
}
float coneT(vec3 ro,vec3 rd,vec2 c,float R,float h){
  float k=R/max(h,0.001);
  vec3 f=vec3(ro.x-c.x, ro.y-c.y, h-ro.z);
  float A=rd.x*rd.x+rd.y*rd.y-k*k*rd.z*rd.z;
  if(abs(A)<1e-5) return -1.0;
  float B=2.0*(f.x*rd.x+f.y*rd.y+k*k*f.z*rd.z);
  float C=f.x*f.x+f.y*f.y-k*k*f.z*f.z;
  float disk=B*B-4.0*A*C; if(disk<0.0) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05){ float z=ro.z+rd.z*t0; if(z>=0.0&&z<=h) t=t0; }
  if(t1>0.05){ float z=ro.z+rd.z*t1; if(z>=0.0&&z<=h&&(t<0.0||t1<t)) t=t1; }
  return t;
}
vec3 coneN(vec3 p,vec2 c,float R,float h){ float k=R/max(h,0.001); vec2 d=p.xy-c; return normalize(vec3(d, k*max(length(d),0.001))); }
float boxT(vec3 ro,vec3 rd,vec2 c,float r,float h){
  vec3 mn=vec3(c.x-r,c.y-r,0.0), mx=vec3(c.x+r,c.y+r,h);
  float tn=0.0, tf=1e8;
  if(abs(rd.x)<1e-5){ if(ro.x<mn.x||ro.x>mx.x) return -1.0; }
  else { float a=(mn.x-ro.x)/rd.x, b=(mx.x-ro.x)/rd.x; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.y)<1e-5){ if(ro.y<mn.y||ro.y>mx.y) return -1.0; }
  else { float a=(mn.y-ro.y)/rd.y, b=(mx.y-ro.y)/rd.y; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.z)<1e-5){ if(ro.z<mn.z||ro.z>mx.z) return -1.0; }
  else { float a=(mn.z-ro.z)/rd.z, b=(mx.z-ro.z)/rd.z; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  float t=tn>0.05?tn:(tf>0.05?tf:-1.0); return t;
}
vec3 boxN(vec3 p,vec2 c,float r,float h){
  vec3 q=(p-vec3(c,h*0.5))/vec3(r,r,max(h*0.5,0.001)); vec3 a=abs(q);
  if(a.x>=a.y&&a.x>=a.z) return vec3(sign(q.x),0.0,0.0);
  if(a.y>=a.z) return vec3(0.0,sign(q.y),0.0);
  return vec3(0.0,0.0,sign(q.z));
}
float ellT(vec3 ro,vec3 rd,vec2 c,float R,float H){
  vec3 f=vec3((ro.x-c.x)/R,(ro.y-c.y)/R,ro.z/H), d=vec3(rd.x/R,rd.y/R,rd.z/H);
  float A=dot(d,d), B=2.0*dot(f,d), C=dot(f,f)-1.0, disk=B*B-4.0*A*C;
  if(disk<0.0||A<1e-8) return -1.0;
  float s=sqrt(disk), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A), t=-1.0;
  if(t0>0.05&&ro.z+rd.z*t0>=0.0) t=t0;
  if(t1>0.05&&ro.z+rd.z*t1>=0.0&&(t<0.0||t1<t)) t=t1;
  return t;
}
vec3 ellN(vec3 p,vec2 c,float R,float H){ return normalize(vec3((p.x-c.x)/(R*R),(p.y-c.y)/(R*R),p.z/(H*H))); }
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
  float tGround=rd.z<0.0?-ro.z/rd.z:1e8;
  float tBest=1e8, kBest=0.0, hBest=1.0; vec3 nBest=vec3(0.0,0.0,1.0), pBest=ro; vec4 qBest=vec4(0.0);
  for(int i=0;i<12;i++){
    float kk=kind[i]; if(kk<0.5) continue;
    vec4 q=obj[i]; float t=-1.0; vec3 n=vec3(0.0,0.0,1.0);
    if(kk>3.5&&kk<4.5){ t=boxT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=boxN(ro+rd*t,q.xy,q.z,q.w); }
    else if(kk>2.5&&kk<3.5){ t=ellT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=ellN(ro+rd*t,q.xy,q.z,q.w); }
    else if(kk<2.5) t=marchMassif(ro,rd,q,step(1.5,kk));
    else { t=coneT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=coneN(ro+rd*t,q.xy,q.z,q.w); }
    if(t>0.0&&t<tBest&&t<tGround){
      tBest=t; kBest=kk; hBest=q.w; pBest=ro+rd*t; qBest=q;
      if(kk>=2.5){ nBest=n; if(dot(nBest,rd)>0.0) nBest=-nBest; }
    }
  }
  vec3 col;
  if(showScn<0.5) kBest=0.0;
  if(kBest>0.5&&kBest<2.5){
    nBest=massifN(pBest.xy, qBest, step(1.5, kBest));
    if(dot(nBest, rd)>0.0) nBest=-nBest;
    float wl=clamp(tBest*0.022, 4.0, 140.0);
    float a=vN(pBest.xy/wl), b=vN(pBest.xy/wl+vec2(0.5,0.15)), c=vN(pBest.xy/wl+vec2(0.15,0.5));
    float a2=vN(pBest.xy/(wl*3.2)+2.0), b2=vN(pBest.xy/(wl*3.2)+vec2(2.4,2.1)), c2=vN(pBest.xy/(wl*3.2)+vec2(2.1,2.4));
    nBest=normalize(nBest+vec3(a-b, a-c, 0.0)*0.7+vec3(a2-b2, a2-c2, 0.0)*0.38);
  }
  float hlen=length(rd.xy);
  float toward=hlen>1e-4?dot(rd.xy/hlen, vec2(sin(sunA),cos(sunA))):0.0;
  vec3 gcol=showScn>0.5?ground*mix(0.9,1.08,clamp(toward*0.5+0.5,0.0,1.0)):vec3(0.02,0.025,0.04);
  if(showScn>0.5&&rd.z<0.0){
    float tG=-ro.z/rd.z;
    vec2 gp=(ro+rd*tG).xy;
    gcol*=mix(0.90, 1.06, texture(weather, gp*0.00028+0.12).b);
    if(cloudOn>0.5){
      vec2 wind=vec2(cloudDrift, cloudDrift*0.42);
      float c0=texture(weather, (gp+wind)*cloudScale*0.33).r;
      vec3 sp=vec3(gp,0.0)+sd*(1800.0/max(sd.z, 0.2));
      float c1=texture(weather, (sp.xy+wind)*cloudScale*0.33).r;
      float cov=clamp(cloudCov+(max(c0, c1)-0.56)/0.09*0.26, 0.0, 1.0);
      gcol*=mix(1.0, 0.5, smoothstep(0.3, 0.8, cov));
    }
    if(kBest<0.5) gcol*=mix(0.58, 1.0, scnShadow(vec3(gp, 0.0), sd));
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
      float grit=vN(pBest.xy/max(6.0, R*0.045));
      vec3 rock=mix(vec3(0.42,0.37,0.33), vec3(0.24,0.18,0.15), clamp(1.0-mtnSnow,0.0,1.0)*0.9);
      if(volc>0.5) rock=vec3(0.22,0.16,0.14);
      vec3 scree=rock*vec3(1.16, 1.10, 1.04);
      albedo=mix(rock, scree, smoothstep(0.22, 0.70, steep));
      albedo*=mix(0.76, 1.06, grit);
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
    float sh=kBest<2.5?scnShadow(pBest, sd):1.0;
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

