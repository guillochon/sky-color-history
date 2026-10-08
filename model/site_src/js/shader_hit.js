// Mountains and hills are marched in this pass, and towns and woods in the next one (TOWNFS).
// Folding the terrain into the sky shader makes the driver take about fifteen seconds to link
// the program. On Windows a program can take seconds more to compile on its first draw, which
// stalls the browser, so the towns are a pass of their own and each stall stays shorter.
// hitVariant() and townVariant() define GLACIERS, TOWNS, and TREES for the current epoch, so
// each program compiles only the scenery that epoch shows. The defaults include everything.
const TOWN_GLSL=`
// Towns and woods are lots on a grid. town[i] is (centre x, centre y, radius, type). Types:
// 0 keeps hills out and nothing else (pools), 1 city of towers on 42 m lots, 2 neighbourhood of
// houses on 24 m lots, 3 broadleaf and conifer wood, 4 Carboniferous forest, 5 dead wood, all
// on 10 m lots. Everything on a lot stays inside it, so the first hit along the grid walk is the
// nearest. Must match townLot and friends in vr_paint.js.
float lotCell(float ty){ return ty<1.5?42.0:(ty<2.5?24.0:10.0); }
float lotOcc(vec2 g, vec4 tw, float cell){
  float r=length((g+0.5)*cell-tw.xy)/tw.z;
  if(r>=1.0) return 0.0;
  float p=tw.w<1.5?mix(0.95, 0.45, r*r):(tw.w<2.5?mix(0.92, 0.70, r):mix(0.85, 0.3, r*r));
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
// House on lot g. Walls are whole multiples of 3.6 m on a 3.6 m grid, so window bays line up
// with the corners. w is the world footprint; swap means the ridge runs along y.
void houseLot(vec2 g, out vec2 mn, out vec2 w, out bool swap, out float eave, out float slope){
  const float cell=24.0;
  swap=h12(g+vec2(7.7, 2.2))>0.5;
  w=3.6*vec2(h12(g+vec2(2.1, 8.4))>0.5?4.0:3.0, h12(g+vec2(9.7, 3.3))>0.6?3.0:2.0);
  if(swap) w=w.yx;
  mn=vec2(lotCorner(g.x, cell, w.x, 3.6, h12(g+vec2(4.2, 0.6))), lotCorner(g.y, cell, w.y, 3.6, h12(g+vec2(0.8, 6.1))));
  eave=h12(g+4.4)>0.62?5.6:2.9;
  slope=mix(0.45, 0.8, h12(g+6.6));
}
void clipPlane(vec3 pn, float d, vec3 o, vec3 rd, inout float tN, inout float tF, inout vec3 nN){
  float den=dot(pn, rd), num=d-dot(pn, o);
  if(abs(den)<1e-7){ if(num<0.0) tF=-1.0; return; }
  float t=num/den;
  if(den<0.0){ if(t>tN){ tN=t; nN=pn; } }
  else tF=min(tF, t);
}
// Four walls, a floor, and two roof slopes, which together are convex.
float houseT(vec3 ro, vec3 rd, vec2 mn, vec2 w, bool swap, float eave, float slope, out vec3 n){
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
// Tree styles: 0 broadleaf, 1 conifer, 2 lycopsid, 3 tree fern, 4 horsetail, 5 dead snag.
// c is the trunk, h the height, rc the crown's reach from the trunk.
bool forestTree(vec2 g, float ty, out vec2 c, out float h, out float rc, out float sty){
  const float cell=10.0;
  float b=h12(g+vec2(9.7, 3.3)), k=h12(g+4.4);
  rc=mix(2.2, 4.2, h12(g+vec2(2.1, 8.4)));
  c=g*cell+rc+vec2(h12(g+vec2(4.2, 0.6)), h12(g+vec2(0.8, 6.1)))*(cell-2.0*rc);
  if(ty<3.5){ sty=k<0.55?0.0:1.0; h=sty<0.5?mix(7.0, 13.0, b):mix(12.0, 28.0, b); }
  else if(ty<4.5){ sty=k<0.55?2.0:(k<0.8?3.0:4.0); h=sty<2.5?mix(18.0, 34.0, b):(sty<3.5?mix(5.0, 9.0, b):mix(8.0, 16.0, b)); }
  else { sty=5.0; h=mix(4.0, 18.0, b); rc=0.6; }
  return true;
}
// A yard tree in the widest gap beside the house, if the lot has one.
bool yardTree(vec2 g, vec2 mn, vec2 w, out vec2 c, out float h, out float rc, out float sty){
  const float cell=24.0;
  c=vec2(0.0); h=0.0; rc=0.0; sty=0.0;
  if(h12(g+vec2(6.2, 1.9))>0.6) return false;
  vec2 lo=g*cell, gl=mn-lo, gh=lo+cell-(mn+w);
  bool alongX=max(gl.x, gh.x)>max(gl.y, gh.y);
  float gap=alongX?max(gl.x, gh.x):max(gl.y, gh.y);
  rc=min(3.6, gap*0.5-0.3);
  if(rc<1.6) return false;
  float along=h12(g+vec2(1.4, 5.5));
  if(alongX){ c.x=gl.x>gh.x?lo.x+gl.x*0.5:mn.x+w.x+gh.x*0.5; c.y=lo.y+rc+along*(cell-2.0*rc); }
  else { c.y=gl.y>gh.y?lo.y+gl.y*0.5:mn.y+w.y+gh.y*0.5; c.x=lo.x+rc+along*(cell-2.0*rc); }
  sty=h12(g+vec2(8.8, 0.3))<0.8?0.0:1.0;
  h=mix(5.0, 10.0, h12(g+vec2(2.7, 4.9)));
  return true;
}
float sphT(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc=ro-c;
  float b=dot(oc, rd), q=b*b-dot(oc, oc)+r*r;
  if(q<0.0) return -1.0;
  float t=-b-sqrt(q);
  return t>0.05?t:-1.0;
}
// Trunk, then a crown of three clumps, a cone, or a flat umbrella, depending on the style.
float treeT(vec3 ro, vec3 rd, vec2 c, float h, float rc, float sty, float seed, out vec3 n, out float part){
  float tr=0.2+0.012*h, zt=h*0.3;
  if(sty<0.5) zt=h-1.4*rc;
  else if(sty<1.5) zt=h*0.3;
  else if(sty<2.5){ tr=0.3+0.013*h; zt=h-0.5*rc; }
  else if(sty<3.5){ tr=0.22; zt=h-0.2*rc; }
  else if(sty<4.5){ tr=0.18; zt=h*0.15; }
  else { tr=0.25+0.012*h; zt=h; }
  float best=-1.0; part=0.0; n=vec3(0.0, 0.0, 1.0);
  vec2 oc=ro.xy-c;
  float A=dot(rd.xy, rd.xy);
  if(A>1e-8){
    float B=dot(oc, rd.xy), D=B*B-A*(dot(oc, oc)-tr*tr);
    if(D>=0.0){
      float t=(-B-sqrt(D))/A, z=ro.z+rd.z*t;
      if(t>0.05 && z>=0.0 && z<=zt){ best=t; n=vec3(normalize(oc+rd.xy*t), 0.0); }
    }
  }
  if(sty>4.5) return best;
  if(sty<0.5 || (sty>1.5 && sty<2.5)){
    bool lyc=sty>1.5;
    for(int k=0;k<3+loopPad;k++){
      float a=seed*6.2831853+float(k)*2.0944;
      vec3 cc; float r;
      if(lyc){ r=0.45*rc; cc=vec3(c+vec2(cos(a), sin(a))*0.5*rc, h-r-0.3*rc*float(k)/2.0); }
      else if(k==0){ r=0.8*rc; cc=vec3(c, h-r); }
      else { r=0.6*rc; cc=vec3(c+vec2(cos(a), sin(a))*0.35*rc, h-1.35*rc); }
      float t=sphT(ro, rd, cc, r);
      if(t>0.0 && (best<0.0 || t<best)){ best=t; n=normalize(ro+rd*t-cc); part=1.0; }
    }
  }else if(sty>2.5 && sty<3.5){
    vec3 rad=vec3(rc, rc, 0.3*rc), o=(ro-vec3(c, h-0.3*rc))/rad, d=rd/rad;
    float a=dot(d, d), b=dot(o, d), q=b*b-a*(dot(o, o)-1.0);
    if(q>=0.0){
      float t=(-b-sqrt(q))/a;
      if(t>0.05 && (best<0.0 || t<best)){ best=t; n=normalize((o+d*t)/rad); part=1.0; }
    }
  }else{
    // Cone from z0 up to the tip at h: conifers, and the narrow spindles of horsetails.
    float z0=sty<1.5?h*0.15:h*0.1, R=sty<1.5?rc:0.45*rc, k=R/(h-z0);
    vec3 f=vec3(oc, h-ro.z);
    float a=A-k*k*rd.z*rd.z, b=2.0*(dot(f.xy, rd.xy)+k*k*f.z*rd.z), cq=dot(f.xy, f.xy)-k*k*f.z*f.z;
    float q=b*b-4.0*a*cq;
    if(abs(a)>1e-6 && q>=0.0){
      float sq=sqrt(q), t0=(-b-sq)/(2.0*a), t1=(-b+sq)/(2.0*a), t=-1.0;
      float z=ro.z+rd.z*t0; if(t0>0.05 && z>=z0 && z<=h) t=t0;
      z=ro.z+rd.z*t1; if(t1>0.05 && z>=z0 && z<=h && (t<0.0 || t1<t)) t=t1;
      if(t>0.0 && (best<0.0 || t<best)){
        vec2 dd=ro.xy+rd.xy*t-c;
        best=t; n=normalize(vec3(dd, k*max(length(dd), 0.001))); part=1.0;
      }
    }
  }
  return best;
}
// kOut: 6 tower, 7 house, 8 tree. aOut: tower height, house eave, or tree style*2+part.
float marchTown(vec3 ro, vec3 rd, float tMax, vec4 tw, out vec3 nOut, out float kOut, out float aOut, out float sOut){
  float ty=tw.w;
  if(ty<0.5) return -1.0;
  float cell=lotCell(ty);
  vec2 span=cylSpan(ro, rd, tw.xy, tw.z+cell, -1.0, ty<1.5?180.0:(ty<2.5?16.0:36.0));
  if(span.x<0.0 || span.x>=tMax) return -1.0;
  float t1=min(span.y, tMax);
  vec2 g=floor((ro.xy+rd.xy*span.x)/cell);
  vec2 r=rd.xy, stp=vec2(r.x>=0.0?1.0:-1.0, r.y>=0.0?1.0:-1.0);
  float ax=abs(r.x), ay=abs(r.y);
  float tx=ax<1e-5?1e8:(((r.x>=0.0?g.x+1.0:g.x)*cell)-ro.x)/r.x;
  float ty2=ay<1e-5?1e8:(((r.y>=0.0?g.y+1.0:g.y)*cell)-ro.y)/r.y;
  float tdx=ax<1e-5?1e8:cell/ax, tdy=ay<1e-5?1e8:cell/ay;
  int steps=int(4.0*(tw.z+cell)/cell)+4;
  for(int i=0;i<steps+loopPad;i++){
    if(lotOcc(g, tw, cell)>0.5){
      float best=-1.0;
      bool tree=false; vec2 tc; float th, trc, tsty;
#if TOWNS
      if(ty<1.5){
        vec3 n; float a, s;
        float t=towerT(ro, rd, g, tw, n, a, s);
        if(t>0.0){ best=t; nOut=n; kOut=6.0; aOut=a; sOut=s; }
      }else if(ty<2.5){
        vec2 mn, w; bool swap; float eave, slope; vec3 n;
        houseLot(g, mn, w, swap, eave, slope);
        float t=houseT(ro, rd, mn, w, swap, eave, slope, n);
        if(t>0.0){ best=t; nOut=n; kOut=7.0; aOut=eave; sOut=h12(g+vec2(5.3, 1.7)); }
#if TREES
        tree=yardTree(g, mn, w, tc, th, trc, tsty);
#endif
      }
#endif
#if TREES
      if(ty>2.5) tree=forestTree(g, ty, tc, th, trc, tsty);
      if(tree){
        vec3 n; float part, seed=h12(g+vec2(3.3, 7.1));
        float t=treeT(ro, rd, tc, th, trc, tsty, seed, n, part);
        if(t>0.0 && (best<0.0 || t<best)){ best=t; nOut=n; kOut=8.0; aOut=tsty*2.0+part; sOut=seed; }
      }
#endif
      if(best>0.0 && best<tMax) return best;
    }
    if(min(tx, ty2)>t1) break;
    if(tx<ty2){ g.x+=stp.x; tx+=tdx; }
    else { g.y+=stp.y; ty2+=tdy; }
  }
  return -1.0;
}
`;
const HITFS=`#version 300 es
precision highp float;
#ifndef GLACIERS
#define GLACIERS 1
#endif
uniform sampler2D weather;
uniform vec2 res;
uniform float yaw,pitch,fov,showScn,sunAz,sunEl;
uniform vec3 eye;
uniform vec4 obj[12];
uniform float kind[12];
uniform float scnCount, hillN;
uniform int loopPad;
uniform vec4 town[16];
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
    if(kk<0.5||kk>=3.5) continue;
    vec4 q=obj[i]; float volc=kk>2.5?2.0:step(1.5, kk);
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
${VIEW_RAY_GLSL}
void main(){
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch);
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
      else if(kk<3.5) t=marchMassif(ro,rd,q,kk>2.5?2.0:step(1.5,kk));
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
  bool hillWins=tHill>0.0 && (tObj<0.0 || tHill<tObj);
  bool objWins=tObj>0.0 && !hillWins;
  vec3 nOut=vec3(0.0,0.0,1.0), pShade=ro;
  float kShade=0.0;
  if(objWins){
    pShade=ro+rd*tObj; kShade=kObj;
    nOut=kObj<3.5?massifN(pShade.xy, qObj, kObj>2.5?2.0:step(1.5, kObj)):nObj;
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
  if(kShade<3.5) sh=scnShadow(vec3(pShade.xy, max(pShade.z, 0.0)), sd);
  if(hillWins){
    hitInfo=vec4(tHill, 1.0, sh, rHill);
    hitNrm=vec4(nOut, hHill);
  }else{
    hitInfo=vec4(tObj, kObj, sh, iObj);
    hitNrm=vec4(nOut, -1.0);
  }
}
`;
// The town pass: reads the terrain pass's hit buffers (landInfo, landNrm) and writes them on,
// with any tower, house, or tree that stands nearer.
const TOWNFS=`#version 300 es
precision highp float;
#ifndef TOWNS
#define TOWNS 1
#endif
#ifndef TREES
#define TREES 1
#endif
uniform sampler2D landInfo, landNrm;
uniform vec2 res;
uniform float yaw,pitch,fov;
uniform vec3 eye;
uniform int loopPad;
uniform vec4 town[16];
uniform float townN;
layout(location=0) out vec4 hitInfo;
layout(location=1) out vec4 hitNrm;
${HIT_COMMON}
${TOWN_GLSL}
${VIEW_RAY_GLSL}
void main(){
  vec4 info=texelFetch(landInfo, ivec2(gl_FragCoord.xy), 0), nrm=texelFetch(landNrm, ivec2(gl_FragCoord.xy), 0);
  hitInfo=info; hitNrm=nrm;
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch), ro=eye;
  if(rd.z>=0.6) return;
  float cap=rd.z<0.0?-ro.z/rd.z:1e8;
  if(info.r>0.0) cap=min(cap, info.r);
  for(int i=0;i<int(townN)+loopPad;i++){
    vec3 n; float k, a, s;
    float t=marchTown(ro, rd, cap, town[i], n, k, a, s);
    if(t>0.0 && t<cap){ cap=t; hitInfo=vec4(t, k, 1.0, a); hitNrm=vec4(n, s); }
  }
}
`;
// g is '1' for glaciers; tr is two digits, towns and trees.
function hitVariant(g){
  return HITFS.replace('precision highp float;', 'precision highp float;\n#define GLACIERS '+g);
}
function townVariant(tr){
  return TOWNFS.replace('precision highp float;', 'precision highp float;\n#define TOWNS '+tr[0]+'\n#define TREES '+tr[1]);
}
