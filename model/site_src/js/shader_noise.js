const NOISEFS=`#version 300 es
precision highp float;
uniform float layer, kind, side;
out vec4 fragColor;
vec3 hash33(vec3 c){
  vec3 p=fract(c*vec3(0.1031,0.1030,0.0973));
  p+=dot(p, p.yxz+33.33);
  return fract((p.xxy+p.yzz)*p.zyx);
}
float worley(vec3 p, float cells){
  vec3 g=p*cells, f=fract(g); vec3 i=floor(g);
  float md=8.0;
  for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec3 o=vec3(float(x),float(y),float(z));
    vec3 feat=hash33(mod(i+o, cells));
    vec3 d=o+feat-f;
    md=min(md, dot(d,d));
  }
  return 1.0-clamp(sqrt(md), 0.0, 1.0);
}
float worleyFbm(vec3 p, float base){
  return worley(p, base)*0.625+worley(p, base*2.0)*0.25+worley(p, base*4.0)*0.125;
}
float perlin(vec3 p, float period){
  vec3 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  float v=0.0;
  for(int z=0;z<=1;z++) for(int y=0;y<=1;y++) for(int x=0;x<=1;x++){
    vec3 o=vec3(float(x),float(y),float(z));
    vec3 g=hash33(mod(i+o, period))*2.0-1.0;
    float w=(x==0?1.0-u.x:u.x)*(y==0?1.0-u.y:u.y)*(z==0?1.0-u.z:u.z);
    v+=dot(g, f-o)*w;
  }
  return v;
}
float perlinFbm(vec3 p){
  float a=0.5, f=4.0, s=0.0, w=0.0;
  for(int i=0;i<4;i++){ s+=a*perlin(p*f, f); w+=a; a*=0.5; f*=2.0; }
  return s/max(w, 1.0e-4);
}
float remapN(float v, float lo, float hi, float a, float b){ return a+(v-lo)/max(hi-lo,1.0e-4)*(b-a); }
void main(){
  vec3 uv=vec3(gl_FragCoord.xy/side, layer);
  if(kind<0.5){
    float perl=perlinFbm(uv)*0.5+0.5;
    float w4=worleyFbm(uv, 4.0);
    float w8=worleyFbm(uv, 8.0);
    float w16=worleyFbm(uv, 16.0);
    float pw=clamp(remapN(perl, 0.0, 1.0, w4, 1.0), 0.0, 1.0);
    fragColor=vec4(pw, w4, w8, w16);
  }else{
    fragColor=vec4(worleyFbm(uv, 3.0), worleyFbm(uv, 7.0), worleyFbm(uv, 13.0), 1.0);
  }
}`;
