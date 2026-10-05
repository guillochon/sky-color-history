// Marched by the hit shader. massifRad must match scRad.
// The dome grids must match landHeight in vr_paint.js.
const TERR=`
float h12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973));
  q+=dot(q, q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float vN(vec2 p){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(h12(i), h12(i+vec2(1.0,0.0)), u.x), mix(h12(i+vec2(0.0,1.0)), h12(i+vec2(1.0,1.0)), u.x), u.y);
}
float massifRad(float R, float volc){ return R*mix(1.28, 1.12, volc); }
float rollAt(vec2 p){
  return vN(p*0.00028)*16.0+vN(p*0.0001+vec2(3.0, 1.2))*12.0;
}
vec3 rollN(vec2 p){
  float e=90.0;
  float hx=rollAt(p+vec2(e,0.0))-rollAt(p-vec2(e,0.0));
  float hy=rollAt(p+vec2(0.0,e))-rollAt(p-vec2(0.0,e));
  return normalize(vec3(-hx, -hy, 2.0*e));
}
float domeT(vec3 ro, vec3 rd, vec2 c, float R, float H){
  vec3 f=vec3((ro.x-c.x)/R, (ro.y-c.y)/R, ro.z/H);
  vec3 d=vec3(rd.x/R, rd.y/R, rd.z/H);
  float A=dot(d,d), B=2.0*dot(f,d), C=dot(f,f)-1.0, disc=B*B-4.0*A*C;
  if(disc<0.0||A<1e-8) return -1.0;
  float s=sqrt(disc), t0=(-B-s)/(2.0*A), t1=(-B+s)/(2.0*A);
  float t=t0>0.2?t0:(t1>0.2?t1:-1.0);
  if(t<0.0||ro.z+rd.z*t<0.0) return -1.0;
  return t;
}
vec3 domeN(vec3 p, vec2 c, float R, float H){
  return normalize(vec3((p.x-c.x)/(R*R), (p.y-c.y)/(R*R), p.z/(H*H)));
}
float gridDomes(vec3 ro, vec3 rd, float tMax, float cell, float thresh, float r0, float r1, float h0, float h1, float seed, out vec3 nOut){
  float best=-1.0;
  nOut=vec3(0.0, 0.0, 1.0);
  vec2 r=rd.xy;
  vec2 g=floor(ro.xy/cell);
  vec2 stp=vec2(r.x>=0.0?1.0:-1.0, r.y>=0.0?1.0:-1.0);
  float ax=abs(r.x), ay=abs(r.y);
  float tx=ax<1e-5?1e8:(((r.x>=0.0?g.x+1.0:g.x)*cell)-ro.x)/r.x;
  float ty=ay<1e-5?1e8:(((r.y>=0.0?g.y+1.0:g.y)*cell)-ro.y)/r.y;
  float tdx=ax<1e-5?1e8:cell/ax;
  float tdy=ay<1e-5?1e8:cell/ay;
  for(int i=0;i<12;i++){
    float tExit=min(tx, ty);
    if(ro.z+rd.z*max(tExit-min(tdx, tdy), 0.0)>h1+30.0 && rd.z>=0.0) break;
    if(h12(g+seed)>=thresh){
      vec2 jit=vec2(h12(g+seed+1.7), h12(g+seed+3.1));
      vec2 c=(g+0.5+(jit-0.5)*0.44)*cell;
      float R=mix(r0, r1, h12(g+seed+5.5));
      float H=mix(h0, h1, h12(g+seed+8.2));
      float t=domeT(ro, rd, c, R, H);
      if(t>0.2 && t<tMax && (best<0.0||t<best)){
        best=t;
        nOut=domeN(ro+rd*t, c, R, H);
      }
    }
    if(tExit>tMax || (best>0.0 && tExit>best)) break;
    if(tx<ty){ g.x+=stp.x; tx+=tdx; }
    else { g.y+=stp.y; ty+=tdy; }
  }
  return best;
}
float marchLand(vec3 ro, vec3 rd, float tMax, out vec3 n){
  n=vec3(0.0, 0.0, 1.0);
  if(tMax<0.4||rd.z>0.5) return -1.0;
  vec3 nH, nS;
  float tH=gridDomes(ro, rd, tMax, 1500.0, 0.42, 220.0, 400.0, 46.0, 155.0, 0.0, nH);
  float tS=gridDomes(ro, rd, tMax, 2800.0, 0.0, 520.0, 760.0, 16.0, 40.0, 19.0, nS);
  if(tH>0.0 && (tS<0.0||tH<=tS)){ n=nH; return tH; }
  if(tS>0.0){ n=nS; return tS; }
  return -1.0;
}
float ridge(vec2 p){
  float a=texture(weather, p).b;
  float b=texture(weather, p*2.35+0.37).a;
  a=pow(1.0-abs(a*2.0-1.0), 1.45);
  b=pow(1.0-abs(b*2.0-1.0), 1.45);
  return a*0.64+b*0.36;
}
float onePeak(vec2 p, vec2 c, float R, float H, float volc, float seed){
  vec2 d=p-c;
  float r=length(d);
  if(r>=R || R<1.0) return 0.0;
  float ang=atan(d.y, d.x);
  float wob=0.74+0.26*texture(weather, vec2(ang*0.52+seed*2.0, seed*3.7)).g;
  float u=r/(R*wob);
  if(u>=1.0) return 0.0;
  ang+= (texture(weather, d/(R*0.62)+seed).r-0.5)*1.6;
  float core=pow(1.0-smoothstep(0.0, mix(0.74, 0.90, volc), u), mix(1.18, 0.92, volc));
  float skirt=pow(1.0-u, mix(1.9, 1.35, volc));
  float prof=core*mix(0.78, 0.90, volc)+skirt*mix(0.22, 0.10, volc);
  float sp1=0.5+0.5*sin(ang*mix(2.0, 3.6, volc)+seed*20.0);
  float sp2=0.5+0.5*sin(ang*mix(3.2, 5.2, volc)-seed*9.0);
  float spoke=smoothstep(0.22, 0.78, mix(sp1, sp2, 0.42));
  float spokeAmt=smoothstep(0.08, 0.24, u);
  prof*=mix(1.0, mix(mix(0.90, 0.94, volc), 1.0, spoke), spokeAmt);
  float ero=ridge(d/(R*0.62)+seed*3.1);
  float eroAmt=smoothstep(0.08, 0.24, u);
  prof*=mix(1.0, mix(0.94, 1.06, ero), eroAmt);
  if(volc>0.5){
    float rim=smoothstep(0.045, 0.10, u)*(1.0-smoothstep(0.12, 0.22, u));
    float bowl=1.0-smoothstep(0.02, 0.145, u);
    prof+=rim*0.11-bowl*0.18;
  }
  return max(prof, 0.0)*H;
}
float massifH(vec2 p, vec4 q, float volc){
  vec2 c=q.xy;
  float R=massifRad(q.z, volc), H=q.w;
  float s0=texture(weather, c*0.00041+0.13).r;
  float s1=texture(weather, c*0.00041+0.71).g;
  float ang=s0*6.2831853;
  vec2 off=vec2(cos(ang), sin(ang));
  float h=onePeak(p, c+off*R*mix(0.09, 0.02, volc), R*0.88, H, volc, s0);
  if(volc<0.5){
    h=max(h, onePeak(p, c-off*R*0.36, R*0.50, H*(0.46+0.28*s1), 0.0, s1+0.17));
    h=max(h, onePeak(p, c+vec2(-off.y, off.x)*R*0.40, R*0.38, H*(0.34+0.22*s0), 0.0, s0+0.63));
  }else{
    h=max(h, onePeak(p, c+off*R*0.50, R*0.30, H*0.46, 0.25, s1));
  }
  return h;
}
vec2 cylSpan(vec3 ro, vec3 rd, vec2 c, float R, float z0, float z1){
  float t0=0.05, t1=1e8;
  if(abs(rd.z)<1e-5){ if(ro.z<z0||ro.z>z1) return vec2(-1.0); }
  else {
    float a=(z0-ro.z)/rd.z, b=(z1-ro.z)/rd.z;
    if(a>b){ float s=a; a=b; b=s; }
    t0=max(t0, a); t1=min(t1, b);
  }
  vec2 oc=ro.xy-c;
  float A=dot(rd.xy, rd.xy);
  if(A<1e-8){ if(dot(oc,oc)>R*R) return vec2(-1.0); }
  else {
    float B=2.0*dot(oc, rd.xy), C=dot(oc,oc)-R*R, disc=B*B-4.0*A*C;
    if(disc<0.0) return vec2(-1.0);
    float s=sqrt(disc), u0=(-B-s)/(2.0*A), u1=(-B+s)/(2.0*A);
    t0=max(t0, u0); t1=min(t1, u1);
  }
  if(t1<t0) return vec2(-1.0);
  return vec2(t0, t1);
}
float marchMassif(vec3 ro, vec3 rd, vec4 q, float volc){
  float R=massifRad(q.z, volc);
  float tPlane=rd.z<0.0?-ro.z/rd.z:1e8;
  vec2 span=cylSpan(ro, rd, q.xy, R, -4.0, q.w*1.55+40.0);
  if(span.x<0.0) return -1.0;
  float t0=span.x, t1=min(span.y, tPlane);
  if(t1<t0) return -1.0;
  vec3 p0=ro+rd*t0;
  float h0=massifH(p0.xy, q, volc);
  if(h0>0.3 && p0.z<=h0) return t0;
  const int N=28;
  float dt=(t1-t0)/float(N);
  float prev=t0;
  for(int i=1;i<=28;i++){
    float t=min(t0+dt*float(i), t1);
    vec3 p=ro+rd*t;
    float h=massifH(p.xy, q, volc);
    if(h>0.3 && p.z<=h){
      float lo=prev, hi=t;
      for(int j=0;j<6;j++){
        float mid=0.5*(lo+hi);
        vec3 m=ro+rd*mid;
        if(massifH(m.xy, q, volc)>=m.z) hi=mid; else lo=mid;
      }
      return hi;
    }
    prev=t;
    if(t>=t1) break;
  }
  return -1.0;
}
vec3 massifN(vec2 p, vec4 q, float volc){
  float e=max(massifRad(q.z, volc)*0.028, 3.0);
  float hx=massifH(p+vec2(e,0.0), q, volc)-massifH(p-vec2(e,0.0), q, volc);
  float hy=massifH(p+vec2(0.0,e), q, volc)-massifH(p-vec2(0.0,e), q, volc);
  return normalize(vec3(-hx, -hy, 2.0*e));
}
`;
