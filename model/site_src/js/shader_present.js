const COMPFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex; uniform sampler2D hitInfo; uniform vec2 res;
uniform float yaw,pitch,fov,showScn;
uniform vec3 eye;
out vec4 fragColor;
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
      vec4 occ=texture(hitInfo, gl_FragCoord.xy/res);
      if(occ.g>0.5 && occ.r>0.0 && occ.r<tIn){ fragColor=vec4(0.0); return; }
    }
  }
  fragColor=toneCloud(c);
}`;
