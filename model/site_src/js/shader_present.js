// The rain and snow (clouds.js cloudPrecip), drawn in front of the clouds and the land at full
// resolution: the shafts and the veil between the eye and the cloud base or the ground, and the
// drops and flakes falling close by. rainP is the rate from the cloud (mm/h): x steady, y showers,
// z drizzle, and w the share falling as snow. rainQ: x the height where it has all evaporated (0
// when it reaches the ground), y the shafts' lean per metre of fall, z the rate on the eye.
// bowTex: the drops' phase function by angle and drop size, with the rainbows (rainbow.js).
const RAIN_GLSL=`
uniform sampler2D weather, bowTex;
uniform float cloudCov, cloudScale, cloudDrift, cloudBase, sunAz, sunEl, sunVis;
uniform vec3 sunCol, groundCol;
uniform vec4 rainP, rainQ;
vec3 rnLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }
// What falls from the cloud over xy, as clouds.js rainMapAt has it: x rain and showers, y
// drizzle (mm/h), z the cover there and w its thickness, as cloudShape reads them. The steady
// rain falls in bands under the thicker half of a deck, the showers under the thickest cells.
vec4 rainMap(vec2 xy){
  vec4 w=texture(weather, (xy+vec2(cloudDrift, cloudDrift*0.42))*cloudScale*0.33);
  float cov=1.0/(1.0+exp(-(log(cloudCov/(1.0-cloudCov))+(w.r-0.56)/0.09*1.05)));
  float th=clamp((w.b-0.30)/0.38, 0.0, 1.0), sheet=smoothstep(0.55, 0.9, cov)*smoothstep(0.35, 0.75, th);
  return vec4(rainP.x*sheet+rainP.y*smoothstep(0.55, 0.85, th)*smoothstep(0.3, 0.6, cov), rainP.z*sheet, cov, th);
}
// Extinction (per metre) of rain R and drizzle D (mm/h): rain about 0.25 R^0.63 per km, so 1 mm/h
// leaves some 15 km of visibility and 50 mm/h barely 1.5 km; drizzle's small drops dim more for
// their water; snow, 3 S^0.7 per km of melted S, dims ten times as much as rain.
float rainSigma(vec4 m){
  float rain=2.5e-4*pow(m.x, 0.63)+1.0e-3*pow(m.y, 0.6), snow=3.0e-3*pow(m.x+m.y, 0.7);
  return mix(rain, snow, rainP.w);
}
// The light on the rain under the cloud: the sky's, cut by the cloud overhead (amb, scaled there
// by what the cover lets through), and the Sun's (sunB, where it gets under the cloud), linear.
void rainLight(out vec3 amb, out vec3 sunB, out vec3 sd){
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  sunB=rnLin(sunCol)*sunVis*3.2*mix(0.3, 1.0, smoothstep(0.0, 0.10, sd.z))*smoothstep(-0.02, 0.01, sd.z);
  vec3 zen=rnLin(texture(sky, vec2(0.5, 0.5/(nr+1.0))).rgb);
  vec3 mid=rnLin(texture(sky, vec2((fract(sunAz/360.0+0.5)*na+0.5)/(na+1.0), (0.6*nr+0.5)/(nr+1.0))).rgb);
  amb=(zen*0.45+mid*0.55)*0.8+rnLin(groundCol)*0.2;
}
// What the cloud over the rain lets through of the sky's light: less where it is thick, and
// much less over heavy rain, which only falls from a deep cloud (a shower's tower lets through a
// tenth or less, and its shaft hangs dark against the sky). Light through cloud is grey, not blue.
float rainShade(vec4 m){ return (1.0-m.z*mix(0.55, 0.92, m.w))*exp(-m.x/6.0); }
vec3 rainAmb(vec3 amb, vec4 m){ return mix(amb, vec3(dot(amb, vec3(0.2126, 0.7152, 0.0722))), sqrt(m.z))*rainShade(m); }
// Snow scatters mostly forward (per steradian, as the clouds' phase).
float rainPhase(float c){ float g=0.7; return mix((1.0-g*g)/(12.566*pow(1.0+g*g-2.0*g*c, 1.5)), 0.0796, 0.4); }
// Drops, at the angle u (0 forward, 1 back, as a share of 180°) for the rain m (rainMap): the
// table's row for the drops falling there (rainbow.js BOW_D, 0.1 to 1 mm, log-spaced). Steady rain
// and showers by their median drop, 0.89 R^0.21 mm (Marshall & Palmer 1948), held to 1 mm, past
// which drops flatten and their bows break up; drizzle 0.15 mm, whose bow is broad and pale. A
// quarter of the light is spread evenly, for what has scattered more than once.
vec3 rainDropPhase(float u, vec4 m){
  float R=max(m.x, 1.0e-3), D=(min(1.0, 0.89*pow(R, 0.21))*R+0.15*m.y)/(R+m.y);
  float row=clamp(log(D/0.1)/2.302585*5.0, 0.0, 5.0);
  return 0.75*texture(bowTex, vec2((u*2047.0+0.5)/2048.0, (row+0.5)/6.0)).rgb+0.25*0.0796;
}
// The rain between ro and tEnd along rd, in front of skyC: premultiplied linear colour, opacity.
// Twenty steps, closer together near the eye, without jitter (this pass keeps no history).
vec4 rainVeil(vec3 ro, vec3 rd, float tEnd, vec3 skyC){
  vec3 amb, sunB, sd;
  rainLight(amb, sunB, sd);
  float cs=dot(rd, sd), ph=rainPhase(cs), ub=acos(clamp(cs, -1.0, 1.0))/3.14159265, T=1.0, tPrev=0.0, fade=max(200.0, 0.3*(cloudBase-rainQ.x));
  vec3 col=vec3(0.0);
  for(int i=0;i<20;i++){
    float u=(float(i)+1.0)/20.0, t=tEnd*u*u, dt=t-tPrev, tm=t-0.5*dt;
    tPrev=t;
    vec3 p=ro+rd*tm;
    vec2 dh=p.xy-eye.xy;
    float alt=p.z+dot(dh, dh)/(2.0*833333.0), below=cloudBase-alt;
    if(below<0.0) continue;
    // The shaft over p left the base upwind in the shear; in dry air it is gone below rainQ.x.
    vec2 at=p.xy+vec2(0.92, 0.39)*below*rainQ.y;
    vec4 m=rainMap(at);
    float fall=rainQ.x>0.0?clamp((alt-rainQ.x)/fade, 0.0, 1.0):1.0;
    // Fall streaks: the shafts are fibrous, finer across the wind than along it.
    float fib=mix(0.55, 1.45, stN(vec2(dot(at, vec2(0.39, -0.92))/500.0, dot(at, vec2(0.92, 0.39))/2500.0)));
    float s=rainSigma(m)*fall*fib;
    if(s<1.0e-7) continue;
    vec3 L=rainAmb(amb, m);
    if(sunB.g>0.0){
      // Sunlight that slips under the cloud through the gaps on the sun's way in: few under a
      // deck, none under a shower's tower.
      vec4 ms=rainMap(p.xy+sd.xy*(below/max(sd.z, 0.03)));
      float gap=1.0-ms.z;
      L+=sunB*mix(rainDropPhase(ub, m), vec3(ph), rainP.w)*gap*gap*exp(-ms.x/4.0);
    }
    // Far rain takes on the sky behind it, as the clouds do.
    L=mix(L, skyC, (1.0-exp(-tm/38000.0))*0.85);
    float a=1.0-exp(-s*dt);
    col+=T*a*L; T*=1.0-a;
    if(T<0.01) break;
  }
  return vec4(col, 1.0-T);
}
// The drops or flakes falling within a few metres, on four cylinders about the eye 1.5, 3, 6 and
// 12 m out, nearest first, falling at 7 m/s (rain) or 1 m/s (snow) in real time. How many there
// are follows the rate: density D drops to a cell, one per cell at 3 mm/h of rain or 0.25 mm/h of
// snow (melted), up to six at 18 mm/h or 1.5 mm/h and more, each layer its own drops in the same cells. A
// drop is a streak, as an eye or a camera sees one move in a 30th of a second; a flake a soft
// dot, swaying. pa is a pixel's size in radians, tHit what is nearer.
vec4 rainNear(vec3 rd, float tHit, float pa, vec3 L){
  float R=rainQ.z;
  if(R<0.02) return vec4(0.0);
  bool snow=rainP.w>0.5;
  float az=atan(rd.x, rd.y), el=asin(clamp(rd.z, -1.0, 1.0));
  float keep=1.0-smoothstep(1.0, 1.3, abs(el));
  if(keep<=0.0) return vec4(0.0);
  float cw=snow?0.3:0.12, ch=snow?0.3:1.2, v=snow?1.0:7.0;
  float D=snow?clamp(R/0.25, 0.08, 6.0):clamp(R/3.0, 0.06, 6.0);
  vec4 acc=vec4(0.0);
  for(int k=0;k<4;k++){
    float r=1.5*exp2(float(k));
    if(r>tHit) break;
    float N=floor(6.2831853*r/cw), X=az/6.2831853*N, ci=floor(X), fx=fract(X), px=pa*r;
    for(int l=0;l<6;l++){
      float p=clamp(D-float(l), 0.0, 1.0);
      if(p<=0.0) break;
      float Z=r*tan(el)/ch+v*waterT/ch+stH(vec2(ci, 7.0+float(k)+19.0*float(l)));
      float cj=floor(Z), fz=fract(Z);
      vec2 id=vec2(ci, cj)+float(k)*vec2(13.1, 71.7)+float(l)*vec2(37.3, 11.9);
      if(stH(id)>p) continue;
      float a;
      if(snow){
        // A flake 8 mm across, swaying about its column as it falls.
        float x0=0.2+0.6*stH(id+3.1)+0.12*sin(waterT*1.7+stH(id+5.3)*6.28), z0=0.2+0.6*stH(id+9.7);
        vec2 d=vec2((fx-x0)*cw, (fz-z0)*ch);
        float rad=max(0.004, px*0.7);
        a=0.9*exp(-dot(d, d)/(rad*rad))*min(1.0, 0.004/rad);
      }else{
        // A streak 25 cm long and a 2 mm drop wide, or a pixel, dimmed for the share it fills.
        float x0=0.1+0.8*stH(id+3.1), z0=0.1+0.6*stH(id+9.7), len=0.25/ch;
        float dx=(fx-x0)*cw, wd=max(0.002, px*0.7);
        a=0.3*exp(-dx*dx/(wd*wd))*smoothstep(z0, z0+0.03, fz)*smoothstep(z0+len, z0+len-0.03, fz)*min(1.0, 0.002/wd);
      }
      a*=keep;
      acc+=vec4(L*a, a)*(1.0-acc.a);
    }
  }
  return acc;
}
`;
const COMPFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex; uniform sampler2D hitInfo; uniform vec2 res;
uniform float yaw,pitch,fov,showScn,seaR,waterT,nr,na;
uniform vec3 eye; uniform sampler2D sky;
out vec4 fragColor;
${SHELL_GLSL}
vec4 toneCloud(vec4 c){
  vec3 x=c.rgb/max(c.a, 1.0e-4);
  float m=max(x.r, max(x.g, x.b));
  if(m>1.0) x*=1.0/(1.0+0.35*(m-1.0));
  return vec4(x*c.a, c.a);
}
${VIEW_RAY_GLSL}
${STEAM_GLSL}
${RAIN_GLSL}
// Linear premultiplied colour to the display values the clouds are blended in, with their shoulder.
vec4 rainDisplay(vec4 v){
  if(v.a<1.0e-4) return vec4(0.0);
  vec3 c=v.rgb/v.a;
  c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
  return vec4(pow(c, vec3(1.0/2.2))*v.a, v.a);
}
void main(){
  vec4 c=texture(cloudTex, gl_FragCoord.xy/res);
  bool rain=rainP.x+rainP.y+rainP.z>0.0;
  if(c.a<0.004 && !rain){ fragColor=c; return; }
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch), ro=eye;
  vec4 occ=texture(hitInfo, gl_FragCoord.xy/res);
  float tHit=showScn>0.5 && occ.g>0.5 && occ.r>0.0?occ.r:1.0e8;
  if(c.a<0.004) c=vec4(0.0);
  else{
    float tIn=shellT(ro, rd, 1200.0);
    c=tIn>=0.0 && tHit<tIn?vec4(0.0):toneCloud(c);
  }
  fragColor=c;
  if(seaR>0.0 && showScn>0.5 && c.a>0.0){
    // Steam in front of the clouds (STEAM_GLSL): they show through it as the sky does, and the
    // steam the sky pass laid under them, which this blend would hide, is put back.
    float tIn=shellT(ro, rd, 1200.0), a=steamOpacity(ro, rd, tIn>=0.0?tIn:30000.0);
    fragColor.rgb=fragColor.rgb*(1.0-a)+steamColor(rd)*a*fragColor.a;
  }
  if(rain){
    // As far as the cloud base, the land, or the ground (on the 833 km sphere the passes curve
    // the level by), and no further than 60 km.
    float tEnd=min(tHit, 60000.0);
    if(rd.z>=0.0){
      float tB=shellT(ro, rd, cloudBase);
      if(tB>=0.0){
        tEnd=min(tEnd, tB);
        // A raining cloud's base is dark: the cloud pass doesn't know the rain, so shade it here.
        if(tB<tHit) fragColor.rgb*=mix(0.3, 1.0, exp(-rainMap(ro.xy+rd.xy*tB).x/8.0));
      }
    }
    else{ float R=833333.0, disc=rd.z*rd.z-2.0*max(ro.z, 0.0)/R; if(disc>0.0) tEnd=min(tEnd, R*(-rd.z-sqrt(disc))); }
    float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
    float elevDeg=asin(clamp(rd.z, -1.0, 1.0))*57.2957795;
    vec3 skyC=rnLin(texture(sky, vec2((fract(comp*57.2957795/360.0)*na+0.5)/(na+1.0), ((90.0-max(elevDeg, 0.0))/90.0*nr+0.5)/(nr+1.0))).rgb);
    vec4 veil=rainDisplay(rainVeil(ro, rd, tEnd, skyC));
    fragColor=veil+(1.0-veil.a)*fragColor;
    vec3 amb, sunB, sd;
    rainLight(amb, sunB, sd);
    float pa=2.0*(fov<2e-3?0.5*fov:tan(fov*0.5))/res.y;
    vec4 me=rainMap(ro.xy);
    vec4 drops=rainDisplay(rainNear(rd, tHit, pa, rainAmb(amb, me)*1.3+sunB*0.05*exp(-me.x/4.0)));
    fragColor=drops+(1.0-drops.a)*fragColor;
  }
}`;
