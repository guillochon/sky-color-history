const TEMPFS=`#version 300 es
precision highp float;
uniform sampler2D currTex, histTex, metaTex;
uniform vec2 res;
uniform float yaw,pitch,prevYaw,prevPitch,fov,histValid,histW;
uniform vec3 eye, prevEye;
out vec4 fragColor;
void main(){
  vec2 uv=gl_FragCoord.xy/res;
  vec4 cur=texture(currTex, uv);
  if(histValid<0.5){ fragColor=cur; return; }
  // Clamp history to the range of this frame's 3x3 neighbourhood, so moving
  // clouds and new edges do not ghost while the jitter noise still averages out.
  // Alpha and the unpremultiplied colour are clamped separately; clamping
  // premultiplied channels one by one paired a high alpha with a dark colour.
  float aLo=cur.a, aHi=cur.a;
  vec3 cLo=vec3(1e4), cHi=vec3(-1e4);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec4 s=texture(currTex, uv+vec2(float(x),float(y))/res);
    aLo=min(aLo, s.a); aHi=max(aHi, s.a);
    if(s.a>0.01){ vec3 c=s.rgb/s.a; cLo=min(cLo, c); cHi=max(cHi, c); }
  }
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float nu=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float nv=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+nu*vec3(cy,-sy,0.0)+nv*vec3(-sy*sp,-cy*sp,cp));
  // Where this frame found no cloud, reproject as if at the cloud base.
  float tMean=texture(metaTex, uv).r;
  if(tMean<1.0) tMean=1600.0/max(rd.z, 0.03);
  vec3 rel=eye+rd*tMean-prevEye;
  float py=prevYaw, pp=prevPitch, pcp=cos(pp), psp=sin(pp), pcy=cos(py), psy=sin(py);
  vec3 fwd=vec3(psy*pcp, pcy*pcp, psp);
  vec3 right=vec3(pcy, -psy, 0.0);
  vec3 up=vec3(-psy*psp, -pcy*psp, pcp);
  float z=dot(rel, fwd);
  if(z<1.0){ fragColor=cur; return; }
  vec2 huv=vec2(dot(rel, right)/z/fx, dot(rel, up)/z/fy)*0.5+0.5;
  if(huv.x<0.0||huv.x>1.0||huv.y<0.0||huv.y>1.0){ fragColor=cur; return; }
  vec4 h=texture(histTex, huv);
  float ha=clamp(h.a, aLo, aHi);
  vec3 hc=h.a>0.01?h.rgb/h.a:cur.rgb/max(cur.a, 0.01);
  if(cHi.x>=cLo.x) hc=clamp(hc, cLo, cHi);
  fragColor=mix(cur, vec4(hc*ha, ha), histW);
}`;
