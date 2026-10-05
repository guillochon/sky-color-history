// Mountains and hills are marched in this pass. Folding the same code into the
// sky shader makes the driver take about fifteen seconds to link the program.
const HITFS=`#version 300 es
precision highp float;
uniform sampler2D weather;
uniform vec2 res;
uniform float yaw,pitch,fov,showScn,sunAz,sunEl;
uniform vec3 eye;
uniform vec4 obj[12];
uniform float kind[12];
uniform float scnCount;
layout(location=0) out vec4 hitInfo;
layout(location=1) out vec4 hitNrm;
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
void main(){
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  float tGround=rd.z<0.0?-ro.z/rd.z:1e8;
  float tObj=-1.0, kObj=0.0, iObj=0.0, tBest=1e8;
  vec3 nObj=vec3(0.0,0.0,1.0); vec4 qObj=vec4(0.0);
  if(showScn>0.5){
    for(int i=0;i<int(scnCount);i++){
      float kk=kind[i]; if(kk<0.5) continue;
      vec4 q=obj[i]; float t=-1.0; vec3 n=vec3(0.0,0.0,1.0);
      if(kk>3.5&&kk<4.5){ t=boxT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=boxN(ro+rd*t,q.xy,q.z,q.w); }
      else if(kk>2.5&&kk<3.5){ t=ellT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=ellN(ro+rd*t,q.xy,q.z,q.w); }
      else if(kk<2.5) t=marchMassif(ro,rd,q,step(1.5,kk));
      else { t=coneT(ro,rd,q.xy,q.z,q.w); if(t>0.0) n=coneN(ro+rd*t,q.xy,q.z,q.w); }
      if(t>0.0&&t<tBest&&t<tGround){
        tBest=t; tObj=t; kObj=kk; iObj=float(i); qObj=q; nObj=n;
      }
    }
  }
  float tLand=-1.0; vec3 nLand=vec3(0.0,0.0,1.0);
  if(showScn>0.5 && rd.z<0.5){
    float cap=min(tBest, 9000.0);
    if(rd.z>0.02) cap=min(cap, (210.0-ro.z)/rd.z);
    else if(rd.z<-0.0001) cap=min(cap, (-6.0-ro.z)/rd.z);
    vec3 nL;
    float tL=marchLand(ro, rd, cap, nL);
    if(tL>0.0&&tL<tBest){ tLand=tL; nLand=nL; if(dot(nLand, rd)>0.0) nLand=-nLand; }
  }
  bool landWins=tLand>0.0 && (tObj<0.0 || tLand<tObj);
  bool objWins=tObj>0.0 && !landWins;
  vec3 nOut=vec3(0.0,0.0,1.0), pShade=ro;
  float kShade=0.0;
  if(objWins){
    pShade=ro+rd*tObj; kShade=kObj;
    nOut=kObj<2.5?massifN(pShade.xy, qObj, step(1.5, kObj)):nObj;
    if(dot(nOut, rd)>0.0) nOut=-nOut;
  }else if(landWins){
    pShade=ro+rd*tLand; nOut=nLand;
  }else if(rd.z<0.0){
    pShade=ro+rd*(-ro.z/rd.z);
  }else{
    hitInfo=vec4(-1.0, 0.0, 1.0, 0.0);
    hitNrm=vec4(0.0, 0.0, 1.0, -1.0);
    return;
  }
  float sh=1.0;
  if(kShade<0.5 || (kShade>=0.5 && kShade<2.5)) sh=scnShadow(vec3(pShade.xy, max(pShade.z, 0.0)), sd);
  hitInfo=vec4(tObj, kObj, sh, iObj);
  hitNrm=vec4(nOut, landWins?tLand:-1.0);
}
`;
