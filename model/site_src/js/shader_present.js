const COMPFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex; uniform sampler2D weather; uniform vec2 res;
uniform float yaw,pitch,fov,showScn;
uniform vec3 eye;
uniform vec4 obj[12];
uniform float kind[12];
out vec4 fragColor;
${TERR}
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
float boxT(vec3 ro,vec3 rd,vec2 c,float r,float h){
  vec3 mn=vec3(c.x-r,c.y-r,0.0), mx=vec3(c.x+r,c.y+r,h);
  float tn=0.0, tf=1e8;
  if(abs(rd.x)<1e-5){ if(ro.x<mn.x||ro.x>mx.x) return -1.0; }
  else { float a=(mn.x-ro.x)/rd.x, b=(mx.x-ro.x)/rd.x; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.y)<1e-5){ if(ro.y<mn.y||ro.y>mx.y) return -1.0; }
  else { float a=(mn.y-ro.y)/rd.y, b=(mx.y-ro.y)/rd.y; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  if(abs(rd.z)<1e-5){ if(ro.z<mn.z||ro.z>mx.z) return -1.0; }
  else { float a=(mn.z-ro.z)/rd.z, b=(mx.z-ro.z)/rd.z; if(a>b){ float s=a; a=b; b=s; } tn=max(tn,a); tf=min(tf,b); if(tn>tf) return -1.0; }
  return tn>0.05?tn:(tf>0.05?tf:-1.0);
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
float shellT(vec3 ro, vec3 rd, float H){
  float R=833333.0;
  vec2 dh=ro.xy-eye.xy;
  float c=dot(dh,dh)+(ro.z-H)*(ro.z+H+2.0*R);
  if(c>=0.0) return -1.0;
  float b=dot(vec3(dh, ro.z+R), rd);
  float disc=b*b-c;
  if(disc<=0.0) return -1.0;
  return -c/(b+sqrt(disc));
}
vec4 toneCloud(vec4 c){
  vec3 x=c.rgb/max(c.a, 1.0e-4);
  float m=max(x.r, max(x.g, x.b));
  if(m>1.0) x*=1.0/(1.0+0.35*(m-1.0));
  return vec4(x*c.a, c.a);
}
void main(){
  vec4 c=texture(cloudTex, gl_FragCoord.xy/res);
  if(c.a<0.004){ fragColor=c; return; }
  if(showScn>0.5){
    float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
    float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
    float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
    float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
    vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
    vec3 ro=eye;
    float tIn=shellT(ro, rd, 1200.0);
    if(tIn>=0.0){
      float tHit=1e8;
      for(int i=0;i<12;i++){
        float kk=kind[i]; if(kk<0.5) continue;
        vec4 q=obj[i]; float t=-1.0;
        if(kk>3.5&&kk<4.5) t=boxT(ro,rd,q.xy,q.z,q.w);
        else if(kk>2.5&&kk<3.5) t=ellT(ro,rd,q.xy,q.z,q.w);
        else if(kk<2.5) t=marchMassif(ro,rd,q,step(1.5,kk));
        else t=coneT(ro,rd,q.xy,q.z,q.w);
        if(t>0.0&&t<tHit) tHit=t;
      }
      if(tHit<tIn){ fragColor=vec4(0.0); return; }
    }
  }
  fragColor=toneCloud(c);
}`;
