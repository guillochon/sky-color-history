// Distance along rd from ro to the layer H metres up, which curves away below eye as a sphere of
// radius 833 km does, or -1 (the cloud and present passes). For shaders that declare uniform vec3 eye.
const SHELL_GLSL=`
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
`;
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
uniform float cloudType,cloudBase,cloudTop,cloudCirrus,useHDR,cloudDeck;
// Checkerboard: with cbOn the target is half as wide, and each frame marches every other pixel
// of the res-sized view, the other half on the next frame (cbPar alternates); the temporal pass
// puts them together.
uniform float cbOn, cbPar;
uniform vec3 snDir,snLight,mlDir,mlLight;
uniform vec3 sunCol,groundCol,eye;
layout(location=0) out vec4 fragColor;
layout(location=1) out vec4 fragDepth;
${SHELL_GLSL}
float remap(float v, float lo, float hi, float a, float b){
  return a+(v-lo)/max(hi-lo,1.0e-4)*(b-a);
}
float sat(float x){ return clamp(x, 0.0, 1.0); }
vec3 toLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }
uniform float sunVis;
uniform vec3 cityUp;
// The tallest column this era grows, from flat stratus to towering cumulus. main sets it first.
float thickMax;
// Henyey-Greenstein scaled so an isotropic scatterer is 1.
float hg(float c, float g){
  float g2=g*g;
  return (1.0-g2)/pow(max(1.0+g2-2.0*g*c, 1.0e-4), 1.5);
}
float phase(float c){ return mix(hg(c, 0.55), hg(c, -0.2), 0.3); }
// Density at p without the fine detail or the fall-off at the base (cloudDen). hOut is the height
// inside the local column, 0 at the base and 1 at its top; q and ng are where the base noise was
// read and its green and blue, for cloudDetail.
float cloudShape(vec3 p, out float hOut, out vec3 q, out vec2 ng){
  hOut=0.0; q=vec3(0.0); ng=vec2(0.0);
  vec2 dh=p.xy-eye.xy;
  float alt=p.z+dot(dh,dh)/(2.0*833333.0);
  float h0=alt-cloudBase;
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
  q=vec3(pl+shear, alt*1.15)/9000.0+vec3(0.0, 0.0, cloudTime/90000.0);
  vec4 n=texture(noiseBase, q);
  ng=n.gb;
  // Both channels come out of the generator in a narrow band (Perlin-Worley
  // about 0.62-0.85, Worley fbm about 0.30-0.66). Stretch them to 0-1 first.
  float pw=(n.r-0.62)/0.23;
  float wf=(n.g*0.5+n.b*0.3+n.a*0.2-0.30)/0.36;
  float shape=sat((pw*0.55+wf*0.45-0.5)*1.5+0.5);
  float d=sat(remap(shape, 1.0-profile, 1.0, 0.0, 1.0));
  // Near overcast the noise still leaves gaps, so cloudDeck fills the layer with a textured sheet.
  return max(d, cloudDeck*stratus*cov*(0.35+0.45*shape));
}
// The fine detail eroding density d from cloudShape.
float cloudDetail(float d, float h, vec3 q, vec2 ng){
  vec3 dn=texture(noiseDetail, q*6.5+vec3(ng-0.5, 0.0)*0.12).rgb;
  float dfbm=sat((dn.r*0.625+dn.g*0.25+dn.b*0.125-0.30)/0.36);
  // Wispy and torn underneath, cauliflower billows above.
  float m=mix(1.0-dfbm, dfbm, sat(h*4.0));
  return sat(remap(d, m*0.65, 1.0, 0.0, 1.0));
}
// Thinner toward the base.
float baseFade(float h){ return mix(0.55, 1.0, sat(h*3.0)); }
// Density at p, with the fine detail if fine. hOut as for cloudShape.
float cloudDen(vec3 p, bool fine, out float hOut){
  vec3 q; vec2 ng;
  float d=cloudShape(p, hOut, q, ng);
  if(d<=0.0) return 0.0;
  if(fine) d=cloudDetail(d, hOut, q, ng);
  return d*baseFade(hOut);
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
// Light from a night source (the Moon or a supernova) scattered at p toward the viewer. Two
// density samples toward it stand in for a shadow march; the phase function gives the bright
// rim when the cloud is in front of it.
vec3 nightScatter(vec3 p, vec3 rd, vec3 dir, vec3 light){
  float hs, s1=cloudDen(p+dir*280.0, false, hs), s2=cloudDen(p+dir*900.0, false, hs);
  float tau=(s1*280.0+s2*620.0)*0.05, c=dot(rd, dir);
  return toLin(light)*0.6*(exp(-tau)*phase(c)+0.4*exp(-tau*0.3)*phase(c*0.55));
}
// Contrails and superbolide dust trails (contrails.js): tubes of cloud along a path, a row per
// trail in ctTex (bounding sphere; first segment row, segments, kind, seed) and a row per segment.
uniform highp sampler2D ctTex;
uniform float ctN;
// Adds the trails along rd, nearer than tHit, to col, T, tAcc and wAcc as the march does, each
// already taken into the haze before skyC. pixA is a pixel's angle.
void contrailsAt(vec3 ro, vec3 rd, float tHit, float ign, float pixA, vec3 sd, vec3 sunBase, float shadowAlt, vec3 amb, vec3 skyC, float ph0, float ph1, float ph2,
                 inout vec3 col, inout float T, inout float tAcc, inout float wAcc){
  for(int c=0;c<${CT_C};c++){
    if(float(c)>=ctN||T<0.02) break;
    vec4 H0=texelFetch(ctTex, ivec2(0, c), 0), H1=texelFetch(ctTex, ivec2(1, c), 0);
    vec3 oc=ro-H0.xyz; float hb=dot(oc, rd), hc=dot(oc, oc)-H0.w*H0.w;
    if(hc>0.0 && (hb>0.0 || hb*hb<hc)) continue;
    int s0=int(H1.x), ns=int(H1.y);
    float dust=H1.z, seed=H1.w;
    for(int j=0;j<16;j++){
      if(j>=ns||T<0.02) break;
      int row=s0+j;
      vec4 A=texelFetch(ctTex, ivec2(0, row), 0), B=texelFetch(ctTex, ivec2(1, row), 0);
      vec4 C=texelFetch(ctTex, ivec2(2, row), 0), D=texelFetch(ctTex, ivec2(3, row), 0);
      if(max(C.x, C.y)<0.002) continue;
      vec3 u=B.xyz-A.xyz; float L=length(u);
      if(L<1.0) continue;
      vec3 ud=u/L, w=ro-A.xyz;
      float b=dot(rd, ud), den=max(1.0-b*b, 1.0e-6), sp=(dot(ud, w)-b*dot(rd, w))/den;
      // Each point of a trail belongs to one segment; its two ends are capped.
      if((sp<0.0 && j>0) || (sp>=L && j<ns-1)) continue;
      sp=clamp(sp, 0.0, L);
      vec3 cp=A.xyz+ud*sp; float tc=dot(cp-ro, rd), x=sp/L;
      if(tc<=0.0 || tc>tHit) continue;
      // A trail thinner than a pixel is spread to one, as faint, so it does not flicker.
      float sg=mix(A.w, B.w, x), sv=mix(D.x, D.y, x), pm=pixA*tc*0.8, sgE=max(sg, pm), svE=max(sv, pm);
      float tau=mix(C.x, C.y, x)*sv/svE, smax=max(sgE, svE);
      if(length(ro+rd*tc-cp)>3.2*smax) continue;
      vec3 n1=normalize(cross(ud, vec3(0.0, 0.0, 1.0))+vec3(1.0e-5, 0.0, 0.0)), n2=cross(n1, ud);
      // Peak extinction, for an optical depth tau seen from below.
      float k0=tau/(2.5066*svE), hw=min(3.2*smax/max(sqrt(den), 0.08), 60.0*smax);
      float sinS=sqrt(max(1.0-dot(sd, ud)*dot(sd, ud), 0.0)), dtS=2.0*hw/6.0, tt=tc-hw+dtS*ign;
      float alt=cp.z+dot(cp.xy, cp.xy)/(2.0*6.371e6);
      vec3 sunP=sunBase*smoothstep(-250.0, 250.0, alt-shadowAlt);
      // The air between: thinner above, so a trail high up is clearer than a cloud as far away.
      float se=max(alt/max(tc, 1.0), 1.0e-3), fog=(1.0-exp(-8000.0/se*(1.0-exp(-max(alt, 0.0)/8000.0))/38000.0))*0.85;
      vec3 tint=mix(vec3(1.0), vec3(0.86, 0.79, 0.70), dust);
      for(int k=0;k<6;k++){
        vec3 q=ro+rd*tt-A.xyz; float al=dot(q, ud); vec3 rv=q-ud*al;
        float y1=dot(rv, n1)/sgE, y2=dot(rv, n2)/svE, g=exp(-0.5*(y1*y1+y2*y2));
        if(g>0.01 && tt>0.0){
          // Billows as the clouds have, fixed in the air that carries the trail: they fray its
          // edges, and the core stays whole. The path through the noise runs aslant, so its repeats
          // do not line up along the trail.
          float lam=mix(1400.0, 6000.0, dust), along=mix(C.z, C.w, clamp(al/L, 0.0, 1.0))/lam;
          vec4 n=textureLod(noiseBase, vec3(along, y1*sgE/lam+along*0.381, y2*svE*1.6/lam+along*0.2361)+vec3(seed*17.0, seed*5.0, 0.37+seed), 0.0);
          float pw=(n.r-0.62)/0.23, wf=(n.g*0.5+n.b*0.3+n.a*0.2-0.30)/0.36;
          float shp=0.4+0.6*sat((pw*0.55+wf*0.45-0.5)*1.5+0.5);
          float dn=k0*1.5*sat(remap(shp, 1.0-g, 1.0, 0.0, 1.0));
          if(dn>0.0){
            float tauS=k0*g*1.25*sgE/max(sinS, 0.15);
            vec3 S=sunP*(exp(-tauS)*ph0+0.5*exp(-tauS*0.3)*ph1+0.2*exp(-tauS*0.1)*ph2);
            vec3 Lc=(S+amb)*tint;
            for(int m=0;m<2;m++){
              vec3 nd=m==0?mlDir:snDir, nl=m==0?mlLight:snLight;
              if(nl.g>0.0005) Lc+=toLin(nl)*0.6*phase(dot(rd, nd))*exp(-tauS*0.5)*tint;
            }
            Lc=mix(Lc, skyC, fog);
            float ext=exp(-dn*dtS), a=1.0-ext;
            col+=T*a*Lc; tAcc+=tt*T*a; wAcc+=T*a; T*=ext;
          }
        }
        tt+=dtS;
      }
    }
  }
}
${VIEW_RAY_GLSL}
void main(){
  vec2 fc=gl_FragCoord.xy;
  if(cbOn>0.5) fc.x=floor(fc.x)*2.0+mod(floor(fc.y)+cbPar, 2.0)+0.5;
  vec3 rd=viewRay(fc, res, fov, yaw, pitch);
  vec3 ro=eye;
  float sunA=sunAz*0.01745329252, sunZen=(90.0-sunEl)*0.01745329252;
  vec3 sd=normalize(vec3(sin(sunA)*sin(sunZen), cos(sunA)*sin(sunZen), cos(sunZen)));
  fragColor=vec4(0.0); fragDepth=vec4(0.0);
  if(rd.z<0.0) return;
  thickMax=mix(500.0, 7000.0, pow(cloudType, 1.6))*mix(0.75, 1.30, cloudTop);
  float top=cloudBase+thickMax;
  float tIn=shellT(ro, rd, cloudBase), tOut=shellT(ro, rd, top);
  if(tIn<0.0||tOut<tIn) return;
  float tHit=1e8;
  if(showScn>0.5){
    vec4 occ=texture(hitInfo, fc/res);
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
  // A checkerboard marches each pixel every other frame; count its own frames, so it still
  // steps through all 64 offsets rather than every other one.
  vec2 jp=fc+5.588238*mod(cbOn>0.5?floor(cloudFrame*0.5):cloudFrame, 64.0);
  float ign=fract(52.9829189*fract(dot(jp, vec2(0.06711056, 0.00583715))));
  float t=tIn, T=1.0, tAcc=0.0, wAcc=0.0;
  float dt=clamp(t*0.007, 35.0, 700.0);
  t+=dt*ign;
  vec3 col=vec3(0.0);
  for(int i=0;i<200;i++){
    if(T<0.02||t>tEnd) break;
    dt=clamp(t*0.007, 35.0, 700.0);
    vec3 p=ro+rd*t;
    // The coarse shape first; the detail reuses its noise where there is any.
    float h; vec3 q; vec2 ng;
    float coarse=cloudShape(p, h, q, ng);
    if(coarse>0.0){
      float den=cloudDetail(coarse, h, q, ng)*baseFade(h);
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
        // cityUp: the city's own light, reflected up from the streets onto the cloud base. It
        // comes from below, so the cloud overhead does not shade it, and many scatterings carry
        // it through the cloud as they do the skylight.
        vec3 A=mix(ambBot, ambTop, smoothstep(0.0, 0.85, h))*mix(0.4, 1.0, occ)+cityUp+bounce;
        vec3 L=S+A;
        // The Moon and a supernova light the clouds at night.
        for(int k=0;k<2;k++){
          vec3 nd=k==0?mlDir:snDir, nl=k==0?mlLight:snLight;
          if(nl.g>0.0005) L+=nightScatter(p, rd, nd, nl);
        }
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
        Lc+=toLin(snLight)*0.6*mix(phase(dot(rd, snDir)), 1.0, 0.3)+toLin(mlLight)*0.6*mix(phase(dot(rd, mlDir)), 1.0, 0.3);
        float a=cir*0.55;
        col+=T*a*Lc; tAcc+=tC*T*a; wAcc+=T*a;
        T*=1.0-a;
      }
    }
  }

  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
  vec3 skyC=toLin(texture(sky, vec2((fract(comp*57.2957795/360.0)*na+0.5)/(na+1.0), ((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0))).rgb);
  // Air between us and the cloud: distant clouds take on the sky behind them.
  float a0=1.0-T;
  if(a0>1.0e-4) col=mix(col/a0, skyC, (1.0-exp(-tAcc/max(wAcc, 1.0e-5)/38000.0))*0.85)*a0;
  // The contrails, above the clouds and the cirrus.
  if(ctN>0.5 && T>0.02) contrailsAt(ro, rd, tHit, ign, 2.0*tan(fov*0.5)/res.y, sd, sunBase, shadowAlt, mix(ambBot, ambTop, 0.75)+bounce, skyC, ph0, ph1, ph2, col, T, tAcc, wAcc);
  float alpha=1.0-T;
  if(alpha<0.004) return;
  float tMean=tAcc/max(wAcc, 1.0e-5);
  vec3 c=col/alpha;
  // Soft shoulder instead of per-channel clipping, then back to display values.
  // Per channel, so an overexposed warm highlight goes to white, not to peach.
  c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
  c=pow(c, vec3(1.0/2.2));
  fragColor=vec4(c*alpha, alpha);
  fragDepth=vec4(tMean, 0.0, 0.0, 1.0);
}`;

// The airliners (contrails.js drawPlanesVR), one at a time over the few pixels each covers: a
// simple shape traced four times a pixel, lit as the clouds are, and its lights as points. Behind
// the clouds by their opacity, and behind the land and the town.
const PLANEFS=`#version 300 es
precision highp float;
uniform sampler2D sky, cloudTex, hitInfo;
uniform vec2 res;
uniform float yaw, pitch, fov, showScn, nr, na, sunVis;
uniform vec3 eye, pP, pF, pR, sd, sunCol, cityUp;
uniform vec4 lD[8];
uniform vec3 lC[8];
uniform float lN;
out vec4 fragColor;
${VIEW_RAY_GLSL}
vec3 toLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }
// Ray (o, d) against the capsule from a to b of radius r (Quilez): distance, or -1.
float capsule(vec3 o, vec3 d, vec3 a, vec3 b, float r){
  vec3 ba=b-a, oa=o-a;
  float baba=dot(ba, ba), bard=dot(ba, d), baoa=dot(ba, oa), rdoa=dot(d, oa), oaoa=dot(oa, oa);
  float qa=baba-bard*bard, qb=baba*rdoa-baoa*bard, qc=baba*oaoa-baoa*baoa-r*r*baba, h=qb*qb-qa*qc;
  if(h<0.0) return -1.0;
  float t=(-qb-sqrt(h))/qa, y=baoa+t*bard;
  if(y>0.0 && y<baba) return t;
  vec3 oc=y<=0.0?oa:o-b;
  qb=dot(d, oc); qc=dot(oc, oc)-r*r; h=qb*qb-qc;
  return h>0.0?-qb-sqrt(h):-1.0;
}
void capHit(vec3 o, vec3 d, vec3 a, vec3 b, float r, float alb, inout float tB, inout vec3 nB, inout float aB){
  float t=capsule(o, d, a, b, r);
  if(t>0.0 && t<tB){ vec3 p=o+d*t, ba=b-a; float h=clamp(dot(p-a, ba)/dot(ba, ba), 0.0, 1.0); tB=t; nB=(p-a-ba*h)/r; aB=alb; }
}
// A thin surface in the plane where axis k is c: the part with |span| under s whose chord runs
// back from le-sweep·|span| for root-taper·|span|. For wings, tailplane and fin.
void slabHit(vec3 o, vec3 d, int k, float c, float s, float le, float sweep, float root, float taper, float alb, bool fin, inout float tB, inout vec3 nB, inout float aB){
  float dk=k==2?d.z:d.y, ok=k==2?o.z:o.y;
  if(abs(dk)<1.0e-6) return;
  float t=(c-ok)/dk;
  if(t<=0.0 || t>=tB) return;
  vec3 p=o+d*t;
  float sp=k==2?abs(p.y):p.z-1.5;
  if(fin && sp<0.0) return;
  sp=abs(sp);
  float x0=le-sweep*sp, ch=root-taper*sp;
  if(sp<s && p.x<x0 && p.x>x0-ch){ tB=t; nB=k==2?vec3(0.0, 0.0, 1.0):vec3(0.0, 1.0, 0.0); aB=alb; }
}
// The nearest surface along local ray (o, d), metres, x forward, y right, z up: about an A320.
float airliner(vec3 o, vec3 d, out vec3 n, out float alb){
  // From just short of it: the capsule test loses its precision from kilometres away.
  float t0=max(-dot(o, d)-60.0, 0.0);
  o+=d*t0;
  float t=1.0e9; n=vec3(0.0, 0.0, 1.0); alb=0.0;
  capHit(o, d, vec3(-16.0, 0.0, 0.0), vec3(16.0, 0.0, 0.0), 2.0, 0.75, t, n, alb);
  capHit(o, d, vec3(-1.0, -5.8, -1.9), vec3(2.5, -5.8, -1.9), 0.9, 0.5, t, n, alb);
  capHit(o, d, vec3(-1.0, 5.8, -1.9), vec3(2.5, 5.8, -1.9), 0.9, 0.5, t, n, alb);
  slabHit(o, d, 2, -0.8, 17.0, 3.0, 0.47, 6.5, 0.28, 0.6, false, t, n, alb);
  slabHit(o, d, 2, 0.6, 6.3, -12.5, 0.6, 3.6, 0.3, 0.6, false, t, n, alb);
  slabHit(o, d, 1, 0.0, 9.5, -12.0, 0.75, 5.5, 0.3, 0.7, true, t, n, alb);
  return t<1.0e8?t+t0:t;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec3 up=cross(pR, pF), rd0=viewRay(fc, res, fov, yaw, pitch), rel=eye-pP;
  vec3 o=vec3(dot(rel, pF), dot(rel, pR), dot(rel, up));
  vec3 sunL=toLin(sunCol)*sunVis*3.2*smoothstep(0.0, 0.1, sd.z+0.1);
  float shadowAlt=sd.z<0.0?6.371e6*(inversesqrt(1.0-sd.z*sd.z)-1.0):-1.0e9;
  float alt=pP.z+dot(pP.xy, pP.xy)/(2.0*6.371e6);
  sunL*=smoothstep(-100.0, 100.0, alt-shadowAlt);
  vec3 zen=toLin(texture(sky, vec2(0.5, 0.5/(nr+1.0))).rgb);
  vec3 col=vec3(0.0); float cov=0.0, tMin=1.0e9;
  for(int i=0;i<4;i++){
    vec2 off=vec2(float(i&1), float(i>>1))*0.5-0.25;
    vec3 rd=viewRay(fc+off, res, fov, yaw, pitch), d=vec3(dot(rd, pF), dot(rd, pR), dot(rd, up)), n; float alb;
    float t=airliner(o, d, n, alb);
    if(t<1.0e8){
      vec3 nw=normalize(pF*n.x+pR*n.y+up*n.z);
      if(dot(nw, rd)>0.0) nw=-nw;
      // Sunlit sides, sky from above, the ground's light from below.
      vec3 L=sunL*max(dot(nw, sd), 0.0)+zen*(0.55+0.45*nw.z)+(zen*0.25+cityUp)*(0.5-0.5*nw.z);
      col+=alb*L; cov+=0.25; tMin=min(tMin, t);
    }
  }
  float comp=atan(rd0.x, rd0.y); if(comp<0.0) comp+=6.28318530718;
  vec3 skyC=toLin(texture(sky, vec2((fract(comp/6.28318530718)*na+0.5)/(na+1.0), ((90.0-max(asin(clamp(rd0.z, -1.0, 1.0))*57.2957795, 0.0))/90.0*nr+0.5)/(nr+1.0))).rgb);
  vec3 c=vec3(0.0);
  if(cov>0.0){
    c=col/(cov*4.0);
    // The air in front, thinner above, as for the contrails.
    float dist=length(rel), se=max(alt/max(dist, 1.0), 1.0e-3);
    c=mix(c, skyC, (1.0-exp(-8000.0/se*(1.0-exp(-max(alt, 0.0)/8000.0))/38000.0))*0.85);
    c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
    c=pow(c, vec3(1.0/2.2));
  }
  vec3 li=vec3(0.0);
  for(int i=0;i<8;i++){
    if(float(i)>=lN) break;
    vec3 dq=rd0-lD[i].xyz;
    li+=lC[i]*exp(-0.5*dot(dq, dq)/(lD[i].w*lD[i].w));
  }
  float occ=1.0-texture(cloudTex, fc/res).a;
  if(showScn>0.5){ vec4 h=texture(hitInfo, fc/res); if(h.g>0.5 && h.r>0.0 && h.r<length(rel)) occ=0.0; }
  fragColor=vec4((c*cov+li)*occ, cov*occ);
}`;
