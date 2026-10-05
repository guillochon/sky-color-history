// Shared by the view, cloud, and composite shaders.
// massifRad must match scRad, and landH must match landHeight in vr_paint.js.
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
float hillH(vec2 p){
  const float cell=1200.0;
  vec2 g=floor(p/cell);
  float h=0.0;
  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 id=g+vec2(float(i), float(j));
      if(h12(id)<0.34) continue;
      vec2 jit=vec2(h12(id+1.7), h12(id+3.1));
      vec2 c=(id+0.5+(jit-0.5)*0.50)*cell;
      float R=mix(280.0, 640.0, h12(id+5.5));
      float H=mix(48.0, 170.0, h12(id+8.2));
      float u=length(p-c)/R;
      if(u<1.0) h=max(h, pow(1.0-u*u, 1.55)*H);
    }
  }
  return h;
}
float rollH(vec2 p){
  float a=vN(p*0.00042);
  float b=vN(p*0.00017+vec2(4.2, 2.6));
  float c=vN(p*0.00008+vec2(9.0, 1.4));
  float d=vN(p*0.0017+vec2(2.2, 7.1));
  float e=vN(p*0.00085+vec2(5.0, 0.4));
  return (a*0.34+b*0.24+c*0.18)*28.0+(d*0.60+e*0.40)*32.0;
}
float landH(vec2 p){
  float roll=rollH(p);
  float h=roll+hillH(p);
  for(int i=0;i<12;i++){
    float kk=kind[i];
    if(kk<0.5) continue;
    vec4 q=obj[i];
    float dist=length(p-q.xy);
    if(kk<2.5){
      float R=massifRad(q.z, step(1.5, kk));
      float w=1.0-smoothstep(R*0.90, R*1.06, dist);
      h=mix(h, roll, w);
    }else{
      float inner=max(q.z*1.6, 55.0), outer=inner+90.0;
      float w=1.0-smoothstep(inner, outer, dist);
      h=mix(h, rollH(q.xy), w);
    }
  }
  return h;
}
float marchLand(vec3 ro, vec3 rd, float tMax){
  if(tMax<0.8) return -1.0;
  if(ro.z<=landH(ro.xy)+0.15) return 0.35;
  float t=1.2, prev=0.2;
  for(int i=0;i<56;i++){
    if(t>=tMax) return -1.0;
    vec3 p=ro+rd*t;
    if(p.z<=landH(p.xy)){
      float lo=prev, hi=t;
      for(int j=0;j<6;j++){
        float mid=0.5*(lo+hi);
        vec3 m=ro+rd*mid;
        if(m.z<=landH(m.xy)) hi=mid; else lo=mid;
      }
      return hi;
    }
    prev=t;
    t+=min(420.0, max(12.0, t*0.11));
  }
  return -1.0;
}
vec3 landN(vec2 p){
  float e=16.0;
  float hx=landH(p+vec2(e,0.0))-landH(p-vec2(e,0.0));
  float hy=landH(p+vec2(0.0,e))-landH(p-vec2(0.0,e));
  return normalize(vec3(-hx, -hy, 2.0*e));
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
  float s0=massifH(p0.xy, q, volc);
  if(s0>0.3 && p0.z<=s0+rollH(p0.xy)) return t0;
  const int N=28;
  float dt=(t1-t0)/float(N);
  float prev=t0;
  for(int i=1;i<=28;i++){
    float t=min(t0+dt*float(i), t1);
    vec3 p=ro+rd*t;
    float s=massifH(p.xy, q, volc);
    if(s>0.3 && p.z<=s+rollH(p.xy)){
      float lo=prev, hi=t;
      for(int j=0;j<6;j++){
        float mid=0.5*(lo+hi);
        vec3 m=ro+rd*mid;
        float ms=massifH(m.xy, q, volc);
        if(ms>0.3 && ms+rollH(m.xy)>=m.z) hi=mid; else lo=mid;
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
