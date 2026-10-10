const TEMPFS=`#version 300 es
precision highp float;
uniform sampler2D currTex, histTex, metaTex;
uniform vec2 res;
uniform float yaw,pitch,prevYaw,prevPitch,fov,histValid,histW;
// With cbOn, currTex and metaTex are half as wide and hold the pixels marched this frame: pixel
// (x, y) of the res-sized view is among them when x+y+cbPar is even, at texel (x/2, y). The
// others take the reprojected history, or, where there is none, their marched neighbours' mean.
uniform float cbOn, cbPar;
uniform vec3 eye, prevEye;
out vec4 fragColor;
${VIEW_RAY_GLSL}
void main(){
  ivec2 fp=ivec2(gl_FragCoord.xy), cs=textureSize(currTex, 0);
  bool cb=cbOn>0.5, fresh=!cb || ((fp.x+fp.y+int(cbPar))&1)==0;
  ivec2 cp=cb?ivec2(fp.x>>1, fp.y):fp;
  vec4 cur;
  float tMean;
  if(fresh){ cur=texelFetch(currTex, cp, 0); tMean=texelFetch(metaTex, cp, 0).r; }
  else {
    // The four neighbours, all marched this frame: left and right in this row, above and below.
    ivec2 nb[4]=ivec2[4](ivec2((fp.x-1)>>1, fp.y), ivec2((fp.x+1)>>1, fp.y), ivec2(fp.x>>1, fp.y-1), ivec2(fp.x>>1, fp.y+1));
    cur=vec4(0.0); float tS=0.0, tN=0.0;
    for(int i=0;i<4;i++){
      ivec2 q=clamp(nb[i], ivec2(0), cs-1);
      cur+=texelFetch(currTex, q, 0)*0.25;
      float tq=texelFetch(metaTex, q, 0).r; if(tq>=1.0){ tS+=tq; tN+=1.0; }
    }
    tMean=tN>0.0?tS/tN:0.0;
  }
  if(histValid<0.5){ fragColor=cur; return; }
  // Clamp history to the range of this frame's 3x3 neighbourhood, so moving
  // clouds and new edges do not ghost while the jitter noise still averages out.
  // Alpha and the unpremultiplied colour are clamped separately; clamping
  // premultiplied channels one by one paired a high alpha with a dark colour.
  float aLo=fresh?cur.a:1e4, aHi=fresh?cur.a:-1e4;
  vec3 cLo=vec3(1e4), cHi=vec3(-1e4);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec4 s=texelFetch(currTex, clamp(cp+ivec2(x, y), ivec2(0), cs-1), 0);
    aLo=min(aLo, s.a); aHi=max(aHi, s.a);
    if(s.a>0.01){ vec3 c=s.rgb/s.a; cLo=min(cLo, c); cHi=max(cHi, c); }
  }
  float fy=tan(fov*0.5), fx=fy*(res.x/max(res.y,1.0));
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch);
  // Where this frame found no cloud, reproject as if at the cloud base.
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
  fragColor=fresh?mix(cur, vec4(hc*ha, ha), histW):vec4(hc*ha, ha);
}`;
