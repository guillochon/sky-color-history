// Marched by the hit shader. massifRad must match scRad. The volc argument picks the style:
// 0 mountain, 1 volcano, 2 glacier.
// Hill cells must match hillHeight in vr_paint.js. hillN, loopPad, town and townN are hit-shader uniforms.
// On Windows, ANGLE hands this to the D3D compiler, which inlines every call and unrolls
// every loop with a constant bound. loopPad is always 0; adding it to a bound keeps the loop
// rolled, and each heavy function is called from one place inside such a loop. Written the
// obvious way, this shader took over five seconds to compile on every page load.
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
float massifRad(float R, float volc){ return volc>1.5?R*1.08:R*mix(1.28, 1.12, volc); }
// Hills stay out of towns. Must match hillClear in vr_paint.js.
bool hillClear(vec2 c, float R){
  for(int i=0;i<int(townN)+loopPad;i++){
    vec4 tw=town[i];
    if(length(c-tw.xy)<tw.z+R*1.28+60.0) return false;
  }
  return true;
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
// Ice plateaus with cliffs between them. The tiers follow a noisy elevation field, so their
// edges wander instead of ringing the centre. Each step gets its own height (0.4 to 1.6 of the
// mean), and low-frequency noise varies each cliff from sheer to a steep ramp and each bench
// from flat to sloping. The noise is kept smooth: high-frequency outlines make thin fins that
// the march steps over.
float glacierH(vec2 p, vec4 q){
  vec2 d=p-q.xy;
  float R=massifRad(q.z, 2.0), r=length(d);
  if(r>=R) return 0.0;
  float seed=texture(weather, q.xy*0.00041+0.37).r;
  float ang=atan(d.y, d.x);
  float u=r/(R*(0.74+0.26*texture(weather, vec2(ang*0.3+seed*2.0, seed*3.1)).g));
  if(u>=1.0) return 0.0;
  vec2 w=d/R;
  float n1=texture(weather, w*0.6+seed).b, n2=texture(weather, w*1.1+seed*1.7).a;
  float e=(1.0-u)*0.75+sqrt(1.0-u)*0.35*ridge(w*0.9+seed)+(n1-0.5)*0.25;
  float tiers=3.0+floor(seed*2.99), s=max(e*tiers+(n2-0.5)*1.6, 0.0), k=floor(s), f=fract(s);
  float b0=k+0.6*(h12(vec2(k, seed*37.0))-0.5), b1=k+1.0+0.6*(h12(vec2(k+1.0, seed*37.0))-0.5);
  float cliff=smoothstep(0.0, mix(0.04, 0.35, n1*n1), f);
  float prof=(b0+(b1-b0)*mix(cliff, f, mix(0.0, 0.55, n2)))/(tiers+0.5);
  return max(prof, 0.0)*smoothstep(0.0, 0.03, 1.0-u)*q.w;
}
float massifH(vec2 p, vec4 q, float volc){
#if GLACIERS
  if(volc>1.5) return glacierH(p, q);
#endif
  vec2 c=q.xy;
  float R=massifRad(q.z, volc), H=q.w;
  float s0=texture(weather, c*0.00041+0.13).r;
  float s1=texture(weather, c*0.00041+0.71).g;
  float ang=s0*6.2831853;
  vec2 off=vec2(cos(ang), sin(ang));
  float h=0.0;
  for(int k=0;k<(volc<0.5?3:2)+loopPad;k++){
    vec2 pc=c+off*R*mix(0.09, 0.02, volc); float pr=R*0.88, ph=H, pv=volc, ps=s0;
    if(k==1){
      if(volc<0.5){ pc=c-off*R*0.36; pr=R*0.50; ph=H*(0.46+0.28*s1); pv=0.0; ps=s1+0.17; }
      else { pc=c+off*R*0.50; pr=R*0.30; ph=H*0.46; pv=0.25; ps=s1; }
    }else if(k==2){ pc=c+vec2(-off.y, off.x)*R*0.40; pr=R*0.38; ph=H*(0.34+0.22*s0); pv=0.0; ps=s0+0.63; }
    h=max(h, onePeak(p, pc, pr, ph, pv, ps));
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
  // 28 steps across the span (64 for glaciers, whose cliffs are sharper), then 6 bisections
  // once a step lands inside.
  float nst=volc>1.5?64.0:28.0, dt=(t1-t0)/nst, prev=t0, lo=t0, hi=t0;
  int bis=-1;
  for(int i=0;i<=int(nst)+6+loopPad;i++){
    float t=bis<0?min(t0+dt*float(i), t1):0.5*(lo+hi);
    vec3 p=ro+rd*t;
    float h=massifH(p.xy, q, volc);
    if(bis<0){
      if(h>0.3 && p.z<=h){ if(i==0) return t; lo=prev; hi=t; bis=0; }
      else { prev=t; if(t>=t1) break; }
    }else{
      if(h>=p.z) hi=t; else lo=t;
      if(++bis>=6) return hi;
    }
  }
  return -1.0;
}
vec3 massifN(vec2 p, vec4 q, float volc){
  float e=max(massifRad(q.z, volc)*(volc>1.5?0.012:0.028), 3.0);
  vec4 s;
  for(int k=0;k<4+loopPad;k++){
    vec2 o=vec2(k==0?e:(k==1?-e:0.0), k==2?e:(k==3?-e:0.0));
    s[k]=massifH(p+o, q, volc);
  }
  return normalize(vec3(-(s.x-s.y), -(s.z-s.w), 2.0*e));
}
float marchLand(vec3 ro, vec3 rd, float tMax, out vec3 nOut, out float ROut, out float HOut){
  nOut=vec3(0.0, 0.0, 1.0); ROut=1.0; HOut=1.0;
  if(tMax<0.4||rd.z>0.5) return -1.0;
  const float cell=1800.0;
  float best=-1.0; vec2 cBest=vec2(0.0); float Rb=1.0, Hb=1.0;
  vec2 r=rd.xy;
  vec2 g=floor(ro.xy/cell);
  vec2 stp=vec2(r.x>=0.0?1.0:-1.0, r.y>=0.0?1.0:-1.0);
  float ax=abs(r.x), ay=abs(r.y);
  float tx=ax<1e-5?1e8:(((r.x>=0.0?g.x+1.0:g.x)*cell)-ro.x)/r.x;
  float ty=ay<1e-5?1e8:(((r.y>=0.0?g.y+1.0:g.y)*cell)-ro.y)/r.y;
  float tdx=ax<1e-5?1e8:cell/ax;
  float tdy=ay<1e-5?1e8:cell/ay;
  for(int i=0;i<int(hillN);i++){
    float tExit=min(tx, ty);
    if(ro.z+rd.z*max(tExit-min(tdx, tdy), 0.0)>340.0 && rd.z>=0.0) break;
    if(h12(g)>=0.46){
      vec2 jit=vec2(h12(g+1.7), h12(g+3.1));
      vec2 c=(g+0.5+(jit-0.5)*0.44)*cell;
      float R=mix(140.0, 340.0, h12(g+5.5));
      float H=mix(67.0, 188.0, h12(g+8.2));
      if(hillClear(c, R)){
        float t=marchMassif(ro, rd, vec4(c, R, H), 0.0);
        if(t>0.2 && t<tMax && (best<0.0||t<best)){ best=t; cBest=c; Rb=R; Hb=H; }
      }
    }
    if(tExit>tMax || (best>0.0 && tExit>best)) break;
    if(tx<ty){ g.x+=stp.x; tx+=tdx; }
    else { g.y+=stp.y; ty+=tdy; }
  }
  if(best<0.0) return -1.0;
  vec4 q=vec4(cBest, Rb, Hb);
  nOut=massifN((ro+rd*best).xy, q, 0.0);
  if(dot(nOut, rd)>0.0) nOut=-nOut;
  ROut=Rb; HOut=Hb;
  return best;
}
`;
