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
uniform float scnCount, hillN;
uniform int loopPad;
uniform vec4 town[8];
uniform float townN;
layout(location=0) out vec4 hitInfo;
layout(location=1) out vec4 hitNrm;
${TERR}
float scnShadow(vec3 p, vec3 sd){
  if(sd.z<=0.04) return 1.0;
  float sh=1.0;
  vec2 dir=sd.xy; float hl=length(dir);
  if(hl<1e-3) return 1.0;
  dir/=hl; float rise=sd.z/hl;
  for(int i=0;i<12+loopPad;i++){
    float kk=kind[i];
    if(kk<0.5||kk>=2.5) continue;
    vec4 q=obj[i]; float volc=step(1.5, kk);
    float R=massifRad(q.z, volc);
    if(length(p.xy-q.xy)>R+q.w*min(5.5, 1.15/max(sd.z, 0.04))) continue;
    for(int s=1;s<=5+loopPad;s++){
      float dist=R*(0.04*float(s)+0.018*float(s*s));
      float h=massifH(p.xy+dir*dist, q, volc);
      float pen=smoothstep(0.0, dist*0.18+3.0, h-(p.z+rise*dist));
      sh=min(sh, mix(1.0, 0.28, pen));
    }
  }
  return sh;
}
// Towns are lots on a grid. town[i] is (centre x, centre y, radius, n): n>0 is a city of
// towers on 42 m lots, n<0 a neighbourhood of houses on 24 m lots. Each building sits inside
// its lot, so the first hit along the grid walk is the nearest. Must match townLot in vr_paint.js.
float lotOcc(vec2 g, vec4 tw, float cell){
  float r=length((g+0.5)*cell-tw.xy)/tw.z;
  if(r>=1.0) return 0.0;
  float p=tw.w>0.0?mix(0.95, 0.45, r*r):mix(0.92, 0.70, r);
  return step(h12(g*1.31+17.0), p);
}
// Footprint corner snapped to a grid of the given pitch, somewhere inside the lot.
float lotCorner(float g, float cell, float w, float pitch, float h){
  float lo=pitch*ceil((g*cell+2.5)/pitch), hi=g*cell+cell-2.5-w;
  return lo+pitch*floor(h*(floor((hi-lo)/pitch)+1.0));
}
float slabT(vec3 ro, vec3 rd, vec3 mn, vec3 mx, out vec3 n){
  vec3 d=vec3(abs(rd.x)<1e-6?1e-6:rd.x, abs(rd.y)<1e-6?1e-6:rd.y, abs(rd.z)<1e-6?1e-6:rd.z);
  vec3 t0=(mn-ro)/d, t1=(mx-ro)/d, tn=min(t0, t1), tf=max(t0, t1);
  float a=max(max(tn.x, tn.y), tn.z), b=min(min(tf.x, tf.y), tf.z);
  if(a<0.05 || b<a) return -1.0;
  n=a==tn.x?vec3(-sign(d.x), 0.0, 0.0):(a==tn.y?vec3(0.0, -sign(d.y), 0.0):vec3(0.0, 0.0, -sign(d.z)));
  return a;
}
// Tower on lot g. Edges sit on a 3 m grid so window bays line up. Tall ones may stand on a podium.
float towerT(vec3 ro, vec3 rd, vec2 g, vec4 tw, out vec3 n, out float ht, out float seed){
  const float cell=42.0;
  seed=h12(g+vec2(5.3, 1.7));
  float r=length((g+0.5)*cell-tw.xy)/tw.z;
  vec2 w=3.0*floor(mix(vec2(6.0), vec2(12.99), vec2(h12(g+vec2(2.1, 8.4)), h12(g+vec2(9.7, 3.3)))));
  vec2 mn=vec2(lotCorner(g.x, cell, w.x, 3.0, h12(g+vec2(4.2, 0.6))), lotCorner(g.y, cell, w.y, 3.0, h12(g+vec2(0.8, 6.1))));
  float core=(1.0-r)*(1.0-r);
  float floors=floor(mix(3.0, 9.0, h12(g+4.4))+core*mix(6.0, 40.0, h12(g+6.6)));
  ht=floors*3.5+1.2;
  float t=-1.0; vec3 nb;
  if(ht>50.0 && seed>0.45){
    float pod=4.0*3.5+1.2;
    float tp=slabT(ro, rd, vec3(mn, 0.0), vec3(mn+w, pod), nb);
    if(tp>0.0){ t=tp; n=nb; }
    float tt=slabT(ro, rd, vec3(mn+3.0, 0.0), vec3(mn+w-3.0, ht), nb);
    if(tt>0.0 && (t<0.0 || tt<t)){ t=tt; n=nb; }
  }else{
    t=slabT(ro, rd, vec3(mn, 0.0), vec3(mn+w, ht), nb);
    if(t>0.0) n=nb;
  }
  return t;
}
void clipPlane(vec3 pn, float d, vec3 o, vec3 rd, inout float tN, inout float tF, inout vec3 nN){
  float den=dot(pn, rd), num=d-dot(pn, o);
  if(abs(den)<1e-7){ if(num<0.0) tF=-1.0; return; }
  float t=num/den;
  if(den<0.0){ if(t>tN){ tN=t; nN=pn; } }
  else tF=min(tF, t);
}
// Gabled house on lot g: four walls, a floor, and two roof slopes, which together are convex.
// Walls are whole multiples of 3.6 m on a 3.6 m grid, so window bays line up with the corners.
float houseT(vec3 ro, vec3 rd, vec2 g, out vec3 n, out float eave, out float seed){
  const float cell=24.0;
  seed=h12(g+vec2(5.3, 1.7));
  bool swap=h12(g+vec2(7.7, 2.2))>0.5;
  vec2 w=3.6*vec2(h12(g+vec2(2.1, 8.4))>0.5?4.0:3.0, h12(g+vec2(9.7, 3.3))>0.6?3.0:2.0);
  if(swap) w=w.yx;
  vec2 mn=vec2(lotCorner(g.x, cell, w.x, 3.6, h12(g+vec2(4.2, 0.6))), lotCorner(g.y, cell, w.y, 3.6, h12(g+vec2(0.8, 6.1))));
  eave=h12(g+4.4)>0.62?5.6:2.9;
  float slope=mix(0.45, 0.8, h12(g+6.6));
  vec3 o=ro-vec3(mn+w*0.5, 0.0), d=rd;
  vec2 hw=w*0.5;
  if(swap){ o=o.yxz; d=d.yxz; hw=hw.yx; }
  float tN=-1e9, tF=1e9; vec3 nN=vec3(0.0, 0.0, -1.0);
  clipPlane(vec3(1.0, 0.0, 0.0), hw.x, o, d, tN, tF, nN);
  clipPlane(vec3(-1.0, 0.0, 0.0), hw.x, o, d, tN, tF, nN);
  clipPlane(vec3(0.0, 1.0, 0.0), hw.y, o, d, tN, tF, nN);
  clipPlane(vec3(0.0, -1.0, 0.0), hw.y, o, d, tN, tF, nN);
  clipPlane(vec3(0.0, 0.0, -1.0), 0.0, o, d, tN, tF, nN);
  clipPlane(vec3(0.0, slope, 1.0), eave+slope*hw.y, o, d, tN, tF, nN);
  clipPlane(vec3(0.0, -slope, 1.0), eave+slope*hw.y, o, d, tN, tF, nN);
  if(tN<0.05 || tF<tN) return -1.0;
  n=normalize(swap?nN.yxz:nN);
  return tN;
}
float marchTown(vec3 ro, vec3 rd, float tMax, vec4 tw, out vec3 nOut, out float aOut, out float sOut){
  bool city=tw.w>0.0;
  float cell=city?42.0:24.0;
  vec2 span=cylSpan(ro, rd, tw.xy, tw.z+cell, -1.0, city?180.0:11.0);
  if(span.x<0.0 || span.x>=tMax) return -1.0;
  float t1=min(span.y, tMax);
  vec2 g=floor((ro.xy+rd.xy*span.x)/cell);
  vec2 r=rd.xy, stp=vec2(r.x>=0.0?1.0:-1.0, r.y>=0.0?1.0:-1.0);
  float ax=abs(r.x), ay=abs(r.y);
  float tx=ax<1e-5?1e8:(((r.x>=0.0?g.x+1.0:g.x)*cell)-ro.x)/r.x;
  float ty=ay<1e-5?1e8:(((r.y>=0.0?g.y+1.0:g.y)*cell)-ro.y)/r.y;
  float tdx=ax<1e-5?1e8:cell/ax, tdy=ay<1e-5?1e8:cell/ay;
  int steps=int(4.0*(tw.z+cell)/cell)+4;
  for(int i=0;i<steps+loopPad;i++){
    if(lotOcc(g, tw, cell)>0.5){
      vec3 n; float a, s;
      float t=city?towerT(ro, rd, g, tw, n, a, s):houseT(ro, rd, g, n, a, s);
      if(t>0.0 && t<tMax){ nOut=n; aOut=a; sOut=s; return t; }
    }
    if(min(tx, ty)>t1) break;
    if(tx<ty){ g.x+=stp.x; tx+=tdx; }
    else { g.y+=stp.y; ty+=tdy; }
  }
  return -1.0;
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
  float tHill=-1.0, rHill=1.0, hHill=1.0; vec3 nHill=vec3(0.0,0.0,1.0);
  if(showScn>0.5 && rd.z<0.5){
    float cap=min(tBest, 14000.0);
    if(rd.z>0.02) cap=min(cap, (480.0-ro.z)/rd.z);
    else if(rd.z<-0.0001) cap=min(cap, (-6.0-ro.z)/rd.z);
    tHill=marchLand(ro, rd, cap, nHill, rHill, hHill);
  }
  float tTown=-1.0, aTown=0.0, sTown=0.0, kTown=0.0; vec3 nTown=vec3(0.0, 0.0, 1.0);
  if(showScn>0.5 && rd.z<0.6){
    float cap=min(tBest, tGround);
    if(tHill>0.0) cap=min(cap, tHill);
    for(int i=0;i<int(townN)+loopPad;i++){
      vec3 n; float a, s;
      float t=marchTown(ro, rd, cap, town[i], n, a, s);
      if(t>0.0 && t<cap){ cap=t; tTown=t; nTown=n; aTown=a; sTown=s; kTown=town[i].w>0.0?6.0:7.0; }
    }
  }
  if(tTown>0.0){
    hitInfo=vec4(tTown, kTown, 1.0, aTown);
    hitNrm=vec4(nTown, sTown);
    return;
  }
  bool hillWins=tHill>0.0 && (tObj<0.0 || tHill<tObj);
  bool objWins=tObj>0.0 && !hillWins;
  vec3 nOut=vec3(0.0,0.0,1.0), pShade=ro;
  float kShade=0.0;
  if(objWins){
    pShade=ro+rd*tObj; kShade=kObj;
    nOut=kObj<2.5?massifN(pShade.xy, qObj, step(1.5, kObj)):nObj;
    if(dot(nOut, rd)>0.0) nOut=-nOut;
  }else if(hillWins){
    pShade=ro+rd*tHill; kShade=1.0; nOut=nHill;
  }else if(rd.z<0.0){
    pShade=ro+rd*(-ro.z/rd.z);
  }else{
    hitInfo=vec4(-1.0, 0.0, 1.0, 0.0);
    hitNrm=vec4(0.0, 0.0, 1.0, -1.0);
    return;
  }
  float sh=1.0;
  if(kShade<0.5 || (kShade>=0.5 && kShade<2.5)) sh=scnShadow(vec3(pShade.xy, max(pShade.z, 0.0)), sd);
  if(hillWins){
    hitInfo=vec4(tHill, 1.0, sh, rHill);
    hitNrm=vec4(nOut, hHill);
  }else{
    hitInfo=vec4(tObj, kObj, sh, iObj);
    hitNrm=vec4(nOut, -1.0);
  }
}
`;
