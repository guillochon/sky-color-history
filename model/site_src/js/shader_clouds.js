const CLOUDFS=`#version 300 es
precision highp float;
precision highp sampler2D;
precision highp sampler3D;
uniform sampler3D noiseBase;
uniform sampler3D noiseDetail;
uniform sampler2D weather;
uniform sampler2D sky;
uniform sampler2D hitInfo;
uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunMu,showScn,cloudCov,cloudScale,cloudDrift,cloudTime,cloudFrame,nr,na;
uniform float cloudType,cloudBase,cloudTop,cloudCirrus,useHDR;
uniform vec3 sunCol,groundCol,eye;
layout(location=0) out vec4 fragColor;
layout(location=1) out vec4 fragDepth;
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
float remap(float v, float lo, float hi, float a, float b){
  return a+(v-lo)/max(hi-lo,1.0e-4)*(b-a);
}
float sat(float x){ return clamp(x, 0.0, 1.0); }
vec3 toLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }
uniform float sunVis;
// The tallest column this era grows, from flat stratus to towering cumulus.
float layerThick(){ return mix(500.0, 7000.0, pow(cloudType, 1.6))*mix(0.75, 1.30, cloudTop); }
// Henyey-Greenstein scaled so an isotropic scatterer is 1.
float hg(float c, float g){
  float g2=g*g;
  return (1.0-g2)/pow(max(1.0+g2-2.0*g*c, 1.0e-4), 1.5);
}
float phase(float c){ return mix(hg(c, 0.55), hg(c, -0.2), 0.3); }
// Density at p. hOut is the height inside the local column, 0 at the base and 1 at its top.
float cloudDen(vec3 p, bool fine, out float hOut){
  hOut=0.0;
  vec2 dh=p.xy-eye.xy;
  float alt=p.z+dot(dh,dh)/(2.0*833333.0);
  float h0=alt-cloudBase;
  float thickMax=layerThick();
  if(h0<0.0||h0>thickMax) return 0.0;
  vec2 pl=p.xy+vec2(cloudDrift, cloudDrift*0.42);
  vec4 w=texture(weather, pl*cloudScale*0.33);
  // The weather fbm sits near 0.55 with a narrow spread, so normalise it first.
  float cov=sat(cloudCov+(w.r-0.56)/0.09*0.26);
  if(cov<0.01) return 0.0;
  float thick=thickMax*mix(0.45, 1.0, sat((w.b-0.30)/0.38));
  float h=h0/thick;
  if(h>=1.0) return 0.0;
  hOut=h;
  // Stratus is a slab. Cumulus has a flat base and a profile that falls away
  // with height, so only the strongest noise survives near the top: round domes.
  float cu=smoothstep(0.12, 0.45, cloudType+(w.g-0.5)*0.4);
  float stratus=smoothstep(0.0, 0.18, h)*smoothstep(1.0, 0.70, h);
  float cumulus=smoothstep(0.0, 0.05, h)*smoothstep(1.0, 0.18, h);
  float profile=mix(stratus, cumulus, cu)*cov;
  vec2 shear=vec2(0.92, 0.39)*h0*0.35;
  vec3 q=vec3(pl+shear, alt*1.15)/9000.0+vec3(0.0, 0.0, cloudTime/90000.0);
  vec4 n=texture(noiseBase, q);
  // Both channels come out of the generator in a narrow band (Perlin-Worley
  // about 0.62-0.85, Worley fbm about 0.30-0.66). Stretch them to 0-1 first.
  float pw=(n.r-0.62)/0.23;
  float wf=(n.g*0.5+n.b*0.3+n.a*0.2-0.30)/0.36;
  float shape=sat((pw*0.55+wf*0.45-0.5)*1.5+0.5);
  float d=sat(remap(shape, 1.0-profile, 1.0, 0.0, 1.0));
  if(d<=0.0) return 0.0;
  if(fine){
    vec3 dn=texture(noiseDetail, q*6.5+vec3(n.gb-0.5, 0.0)*0.12).rgb;
    float dfbm=sat((dn.r*0.625+dn.g*0.25+dn.b*0.125-0.30)/0.36);
    // Wispy and torn underneath, cauliflower billows above.
    float m=mix(1.0-dfbm, dfbm, sat(h*4.0));
    d=sat(remap(d, m*0.65, 1.0, 0.0, 1.0));
  }
  return d*mix(0.55, 1.0, sat(h*3.0));
}
float lightTau(vec3 p, vec3 sd, float j){
  float tau=0.0, prev=0.0, dump;
  float s=18.0;
  for(int i=0;i<8;i++){
    float x=prev+(s-prev)*j;
    tau+=cloudDen(p+sd*x, i<3, dump)*(s-prev);
    prev=s; s*=2.0;
  }
  return tau;
}
void main(){
  float aspect=res.x/max(res.y,1.0); float fy=tan(fov*0.5); float fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx;
  float v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy,-sy,0.0)+v*vec3(-sy*sp,-cy*sp,cp));
  vec3 ro=eye;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  fragColor=vec4(0.0); fragDepth=vec4(0.0);
  if(rd.z<0.0) return;
  float top=cloudBase+layerThick();
  float tIn=shellT(ro, rd, cloudBase), tOut=shellT(ro, rd, top);
  if(tIn<0.0||tOut<tIn) return;
  float tHit=1e8;
  if(showScn>0.5){
    vec4 occ=texture(hitInfo, gl_FragCoord.xy/res);
    if(occ.g>0.5 && occ.r>0.0) tHit=occ.r;
  }
  if(tHit<tIn) return;
  float tEnd=min(tOut, tIn+75000.0);

  // Light. The sky texture and sun colour are display values; work in linear.
  vec3 sunBase=toLin(sunCol)*sunVis*3.2*mix(0.3, 1.0, smoothstep(0.0, 0.10, sd.z));
  // After sunset the Earth's shadow climbs: a cloud stays sunlit, from below,
  // while it is above the shadow height for this depression angle.
  float shadowAlt=sd.z<0.0?6.371e6*(inversesqrt(1.0-sd.z*sd.z)-1.0):-1.0e9;
  vec3 sunL=sunBase*smoothstep(-250.0, 250.0, top-shadowAlt);
  vec3 zen=toLin(texture(sky, vec2(0.5, 0.5/(nr+1.0))).rgb);
  vec3 mid=toLin(texture(sky, vec2((fract(sunAz/360.0+0.5)*na+0.5)/(na+1.0), (0.6*nr+0.5)/(nr+1.0))).rgb);
  vec3 ambTop=(zen*0.45+mid*0.55);
  vec3 ambBot=toLin(groundCol)*0.55+mid*0.35;
  // Sunlight that reaches a shaded side after bouncing off other clouds and the ground.
  vec3 bounce=sunL*0.03*sat(sd.z*2.0+0.2);
  float cosT=dot(rd, sd);
  float ph0=phase(cosT), ph1=phase(cosT*0.55), ph2=phase(cosT*0.3);
  const float SIGMA=0.05;

  // Interleaved gradient noise, moved across the screen each frame (not just
  // offset), so successive frames decorrelate and the history averages it away.
  vec2 jp=gl_FragCoord.xy+5.588238*mod(cloudFrame, 64.0);
  float ign=fract(52.9829189*fract(dot(jp, vec2(0.06711056, 0.00583715))));
  float t=tIn, T=1.0, tAcc=0.0, wAcc=0.0;
  float dt=clamp(t*0.007, 35.0, 700.0);
  t+=dt*ign;
  vec3 col=vec3(0.0);
  for(int i=0;i<200;i++){
    if(T<0.02||t>tEnd) break;
    dt=clamp(t*0.007, 35.0, 700.0);
    vec3 p=ro+rd*t;
    float h;
    float coarse=cloudDen(p, false, h);
    if(coarse>0.0){
      float den=cloudDen(p, true, h);
      if(den>0.003){
        // Fixed shadow-sample positions: jittering them speckled the lit faces,
        // and the short first steps keep sunset rims from combing without it.
        float tau=lightTau(p, sd, 0.5)*SIGMA;
        float powder=1.0-0.6*exp(-den*SIGMA*900.0);
        vec2 dh=p.xy-eye.xy;
        vec3 sunP=sunBase*smoothstep(-250.0, 250.0, p.z+dot(dh,dh)/(2.0*833333.0)-shadowAlt);
        vec3 S=sunP*(exp(-tau)*ph0+0.5*exp(-tau*0.3)*ph1+0.2*exp(-tau*0.1)*ph2)*mix(powder, 1.0, sat(cosT*0.5+0.5));
        // Sky light from above is blocked by whatever cloud sits overhead, so a
        // thin patch of a deck stays lighter than a thick one.
        float hu, u1=cloudDen(p+vec3(0.0, 0.0, 280.0), false, hu), u2=cloudDen(p+vec3(0.0, 0.0, 900.0), false, hu);
        float occ=exp(-(u1*280.0+u2*620.0)*SIGMA*0.10);
        vec3 A=mix(ambBot, ambTop, smoothstep(0.0, 0.85, h))*mix(0.4, 1.0, occ)+bounce;
        vec3 L=S+A;
        float ext=exp(-den*SIGMA*dt);
        float a=1.0-ext;
        col+=T*a*L;
        tAcc+=t*T*a; wAcc+=T*a;
        T*=ext;
      }
    }else if(h==0.0){
      t+=dt*0.6;   // outside any column: skip faster
    }
    t+=dt;
  }

  if(cloudCirrus>0.02 && T>0.05){
    float tC=shellT(ro, rd, 9500.0);
    if(tC>0.0 && tC<140000.0){
      vec3 pc=ro+rd*tC;
      vec2 cpl=(pc.xy+vec2(cloudDrift, cloudDrift*0.42)*1.6);
      vec2 r=vec2(dot(cpl, vec2(0.92, 0.39)), dot(cpl, vec2(-0.39, 0.92)));
      float big=texture(weather, cpl*cloudScale*0.12+0.37).a;
      float s1=texture(noiseBase, vec3(r.x/42000.0, r.y/9000.0, 0.31)).g;
      float s2=texture(noiseDetail, vec3(r.x/9000.0, r.y/1600.0, 0.57)).r;
      float cir=smoothstep(0.50, 0.85, s1*0.75+s2*0.35)*smoothstep(0.45, 0.65, big+cloudCirrus*0.25)*cloudCirrus;
      cir*=smoothstep(0.0, 0.06, rd.z);
      if(cir>0.002){
        vec3 Lc=sunBase*smoothstep(-400.0, 400.0, 9500.0-shadowAlt)*mix(phase(cosT), 1.0, 0.3)*0.9+ambTop*1.1;
        float a=cir*0.55;
        col+=T*a*Lc; tAcc+=tC*T*a; wAcc+=T*a;
        T*=1.0-a;
      }
    }
  }

  float alpha=1.0-T;
  if(alpha<0.004) return;
  float tMean=tAcc/max(wAcc, 1.0e-5);
  vec3 c=col/alpha;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
  vec3 skyC=toLin(texture(sky, vec2((fract(comp*57.2957795/360.0)*na+0.5)/(na+1.0), ((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0))).rgb);
  // Air between us and the cloud: distant clouds take on the sky behind them.
  float fog=1.0-exp(-tMean/38000.0);
  c=mix(c, skyC, fog*0.85);
  // Soft shoulder instead of per-channel clipping, then back to display values.
  // Per channel, so an overexposed warm highlight goes to white, not to peach.
  c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
  c=pow(c, vec3(1.0/2.2));
  fragColor=vec4(c*alpha, alpha);
  fragDepth=vec4(tMean, 0.0, 0.0, 1.0);
}`;

