const VRFS=`#version 300 es
precision highp float;
// VRFS_BOOT sets this to 0: sky and plain ground only, which compiles fast enough to show
// while the full program compiles in the background.
#define SCENERY 1
uniform sampler2D noiseTex;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform sampler2D weather; uniform sampler2D hitInfo; uniform sampler2D hitNrm; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn,mtnSnow;
uniform float moonAz,moonEl,moonRad,moonOn,latRad,starPx,cloudCov,cloudScale,cloudDrift,cloudOn,clockH,snowCover,waterT,snOn;
uniform vec3 snDir,snCol,snLight,mlDir,mlLight;
uniform vec3 sunCol,ground,eye;
// The setting Sun (sunDiskAt).
uniform float refK, sunOff; uniform vec4 sunTau[50]; uniform vec3 sunW[20]; uniform vec3 sunG; uniform vec4 sunLay[4]; uniform vec4 sunMir;
uniform float corona, coronaMap[16], coronaRim;
// The photosphere's spots and faculae (sunspots.js): its heliographic map, and x the position angle
// of the Sun's north pole from celestial north, y the latitude of the disk's centre (B0), z the
// rotation phase in turns, w whether the map is ready.
uniform sampler2D sunMap; uniform vec4 sunOri;
// The next day's map, and x the days from the first map's day to now, y from the next's, z the
// next's weight: each is carried to now by the latitude's differential rotation and blended; w
// the time in days modulo ten years, for the network, which turns the same way.
uniform sampler2D sunMap2; uniform vec4 sunDrift;
uniform sampler2D mwTex;
uniform vec4 toneU; // display curve: k, p, cap, cd/m² per unit r (color.js toneT)
uniform float rCd,mwOn,mwScale,mwK,mwDB;
uniform vec3 galX,galY,galZ;
// The aurora, from its own pass (aurora.js) at reduced size, in cd/m² times 1000.
uniform sampler2D aurTex; uniform float aurOn;
// Ice halos (halo.js): x the Sun's and y the Moon's halo luminance over the sky reference per
// unit of haloAt, with their colours as linear RGB of unit luminance.
uniform vec2 haloK; uniform vec3 haloSunLin, haloMoonLin;
// A lunar eclipse (lunar_eclipse.js): the shadow's light along its radius (linear, sRGB-coded),
// and where its axis meets the Moon's disk (xy, in the disk's radii), the scale from disk radii
// to the table's span (z), and whether the Moon is in the penumbra at all (w).
uniform sampler2D eclTex; uniform vec4 eclU;
${HALO_GLSL}
// The Ordovician ring and the meteors (debris.js, meteors.js).
${RING_GLSL}
${MET_GLSL}
${COMET_GLSL}
${TONE_GLSL}
${AUR_MIX_GLSL}
${VIEW_RAY_GLSL}
// Naked-eye limiting magnitude against a sky of L cd/m² (color.js nakedEyeLimit).
float nakedEyeLimit(float L){
  float msky=-2.5*log(max(L, 1e-12)/10.8e4)/2.302585;
  return 7.93-5.0*log(pow(10.0, 4.316-msky/5.0)+1.0)/2.302585;
}
// Extinction toward true altitude el (degrees), k magnitudes per airmass (milkyway.js).
${AIRMASS_GLSL}
float extinctionAt(float el, float k){
  return pow(10.0, -0.4*k*(airmass(max(el, 0.0))-1.0));
}
uniform vec4 beads[6];
// The planets and their moons (planets.js): per body, P its direction and drawn radius (radians),
// C the colour of its point and that point's size (as a star's), L the way to the Sun from it and
// its magnitude, N its north pole and its kind (0-6 Mercury to Neptune, 7 a moon), plus 8 when it
// is nearer than the Sun and 16 when Saturn has no rings. moonGain is what zooming in adds to the limit for the moons, Uranus and Neptune (planets.js moonGain).
uniform vec4 bodyP[${BODY_MAX}], bodyC[${BODY_MAX}], bodyL[${BODY_MAX}], bodyN[${BODY_MAX}]; uniform float bodyCnt, moonGain;
// Moons' shadows that may fall on their planets (planets.js moonShadow): M the moon's place about
// its planet in the planet's radii and w the planet's index among the bodies; K x the moon's radius
// in the planet's, y the Sun's angular radius there.
// Jupiter's Great Red Spot (planets.js grsAt): its longitude's direction in Jupiter's equator, and
// x its length (degrees of longitude), y width (latitude), z centre latitude, w how red
// it is; x is 0 when there is none.
uniform vec3 grsDir; uniform vec4 grsAB;
uniform vec4 shadowM[${SHADOW_MAX}], shadowK[${SHADOW_MAX}]; uniform float shadowCnt;
float limbH(float pa){ return 0.002*sin(7.0*pa+1.3)+0.00167*sin(12.0*pa+4.1)+0.00133*sin(19.0*pa+2.2)+0.001*sin(29.0*pa+5.0)+0.00083*sin(41.0*pa+0.7)+0.00067*sin(57.0*pa+3.3)+0.0005*sin(83.0*pa+1.9); } // moon.js limbH
uniform vec4 obj[12];
uniform vec4 pond[8];
uniform float pondN;
uniform vec4 grid[6];
uniform vec4 road[64];
uniform float gridN, roadN;
uniform float kind[12];
out vec4 fragColor;
float h12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973));
  q+=dot(q, q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
// Value noise from a 128x128 texture of random values. Sampling at the lattice point plus the
// smoothstepped fraction makes the bilinear filter do the smooth interpolation in one fetch,
// which keeps the compiled shader far smaller than hashing four corners per call.
float vN(vec2 p){
  vec2 i=floor(p), f=fract(p);
  return textureLod(noiseTex, (i+f*f*(3.0-2.0*f)+0.5)/128.0, 0.0).r;
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
vec3 vNd(vec2 p){ // value noise and its gradient
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f), du=6.0*f*(1.0-f);
  float a=textureLod(noiseTex, (i+0.5)/128.0, 0.0).r, b=textureLod(noiseTex, (i+vec2(1.5, 0.5))/128.0, 0.0).r;
  float c=textureLod(noiseTex, (i+vec2(0.5, 1.5))/128.0, 0.0).r, d=textureLod(noiseTex, (i+1.5)/128.0, 0.0).r, k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y, du*vec2(b-a+k*u.y, c-a+k*u.x));
}
// Metre-scale relief on the open ground: xy is the height gradient, z the height in metres.
// Octaves finer than the pixel footprint fade out so the far field doesn't shimmer.
vec3 groundRelief(vec2 p, float foot){
  const mat2 rot=mat2(0.8, 0.6, -0.6, 0.8);
  mat2 R=mat2(1.0);
  vec2 g=vec2(0.0); float h=0.0, wl=34.0, amp=1.8;
  for(int i=0;i<6;i++){
    float f=1.0/wl, fade=1.0-smoothstep(0.15, 0.45, foot*f);
    if(fade<=0.0) break;
    vec3 n=vNd(R*p*f+float(i)*7.31);
    h+=(n.x-0.5)*amp*fade;
    g+=(n.yz*R)*f*amp*fade;
    R=rot*R; wl*=0.36; amp*=0.40;
  }
  return vec3(g, h);
}
float groundMottle(vec2 p, float foot){
  float m=0.0, wl=22.0, amp=0.5;
  for(int i=0;i<5;i++){
    float fade=1.0-smoothstep(0.15, 0.45, foot/wl);
    if(fade<=0.0) break;
    m+=(vN(p/wl+float(i)*4.13+11.0)-0.5)*amp*fade;
    wl*=0.32; amp*=0.8;
  }
  return m;
}
// Roads (roads.js). x: how far outside the paving p is, in metres. y: 1 on a road's dashed centre
// line. grid[i] is a town's (centre, radius, type), road[i] a segment between towns.
vec2 roadAt(vec2 p, float foot){
  float d=1e4, line=0.0;
  for(int i=0;i<int(gridN);i++){
    vec4 g=grid[i];
    if(length(p-g.xy)>g.z+(g.w<1.5?21.0:12.0)) continue;
    vec2 sp=g.w<1.5?vec2(42.0):vec2(48.0, 120.0), s=abs(p-sp*floor(p/sp+0.5));
    d=min(d, min(s.x, s.y)-2.4);
  }
  for(int i=0;i<int(roadN);i++){
    vec4 r=road[i];
    vec2 pa=p-r.xy, ba=r.zw-r.xy;
    if(abs(pa.x-ba.x*0.5)>abs(ba.x)*0.5+4.0 || abs(pa.y-ba.y*0.5)>abs(ba.y)*0.5+4.0) continue;
    float len=length(ba), h=clamp(dot(pa, ba)/(len*len), 0.0, 1.0), e=length(pa-ba*h)-3.4;
    if(e<d){ d=e; line=(1.0-smoothstep(0.08, 0.08+foot, abs(e+3.4)))*step(fract(h*len/9.0), 0.4); }
  }
  return vec2(d, line);
}
float massifRad(float R, float volc){ return volc>1.5?R*1.08:R*mix(1.28, 1.12, volc); }
float apparentEl(float h){ // Saemundsson 1986, true altitude (deg) to apparent, times the epoch's refK
  if(h>80.0) return h;
  float u=h+10.3/(h+5.11);
  if(u<0.25) return h;
  return h+refK*(1.02/tan(u*0.01745329252))/60.0;
}
float bennett(float app){ // Bennett 1982: today's refraction (deg) at apparent altitude app
  return app>80.0?0.0:(1.0/tan((app+7.31/(app+4.4))*0.01745329252))/60.0;
}
float trueAlt(float app){ return app-refK*bennett(app); } // apparent altitude (deg) to true
// The setting Sun (sunset.js): twenty images, one per 20 nm band, each bent by its own amount
// (SUN_DISP, enlarged by dispX) and dimmed by its own optical depth along the ray (sunTau, twenty
// bands at each of the apparent altitudes SUN_APPS, less sunOff, four to a vec4). The day's inversion layers (sunLay) step
// the true altitude a ray reaches and darken the rays trapped along them; below an inferior
// mirage's mirror line (sunMir) the rays come up off the warm surface layer, so the disk there
// is an inverted, squeezed image of the rays above. sunG takes band light to linear sRGB, so the
// disk's middle is sunCol. xyz is the band light reaching this ray, w its
// fraction of the disk's radius in the nearest image, and off the ray's offset from the Sun's
// centre in that image.
const float SUN_DISP[20]=float[20](${SUN_DISP.join(', ')});
const float SUN_APPS[10]=float[10](${SUN_APP.map(v=>v.toFixed(1)).join(', ')});
vec4 sunDiskAt(float comp, float app, vec3 sd, float rd, out vec3 off){
  float ap=app+sunMir.w*(0.6*sin(comp*1432.4+waterT*2.1)+0.4*sin(comp*3610.0-waterT*3.3))*exp(-max(app, 0.0)/rd);
  float extra=0.0;
  if(sunMir.x>0.0 && ap<sunMir.x){ ap=sunMir.x+(sunMir.x-ap)*sunMir.y; extra=sunMir.z; }
  float bend=refK*bennett(ap);
  for(int i=0;i<4;i++){
    vec4 L=sunLay[i];
    if(L.y<=0.0) continue;
    float w=max(L.y, tan(fov*0.5)/res.y*57.2957795); // at least a pixel thick
    bend+=L.z*smoothstep(L.x-w, L.x+w, ap);
    extra+=L.w*exp(-pow((app-L.x)/w, 2.0));
  }
  float dispX=${DISK_SCALE.toFixed(1)}*(1.0+5.0*exp(-max(ap, 0.0)/0.6)), px=2.0*tan(fov*0.5)/res.y;
  float a=clamp(app, 0.0, 30.0), f; int i=0;
  for(int k=1;k<9;k++) if(a>SUN_APPS[k]) i=k;
  f=(a-SUN_APPS[i])/(SUN_APPS[i+1]-SUN_APPS[i]);
  vec3 P=vec3(0.0); float r=2.0; off=vec3(0.0);
  for(int b=0;b<20;b++){
    float te=(ap-(1.0+dispX*(SUN_DISP[b]-1.0))*bend)*0.01745329252, ct=cos(te);
    vec3 rv=vec3(sin(comp)*ct, cos(comp)*ct, sin(te));
    float d=acos(clamp(dot(rv, sd), -1.0, 1.0));
    // Each image's edge is spread over the gap to the next band's (or a pixel), so the rim is a
    // gradient rather than ten steps.
    float gap=max(dispX*abs(SUN_DISP[b]-SUN_DISP[min(b+1, 19)])*bend*0.01745329252, px);
    float cov=clamp(0.5+(sunRad-d)/gap, 0.0, 1.0);
    if(cov<=0.0) continue;
    int k0=i*20+b, k1=k0+20;
    float t=mix(sunTau[k0/4][k0%4], sunTau[k1/4][k1%4], f);
    P+=sunW[b]*exp(-t-(t+sunOff)*extra)*cov;
    if(d/sunRad<r){ r=d/sunRad; off=rv-sd*dot(rv, sd); }
  }
  return vec4(P, r);
}
// The photosphere at q (disk radii, x toward celestial east, y north) as multipliers of linear
// R, G, B, pxR disk radii to a pixel (sunspots.js sunSurfaceAt): the map's spots raised to the
// display's gamma, as a white-light photograph is shown, plus faculae, brightest near mu 1/4.
// Once the disk is large enough, the network of the supergranulation (cells about 30 Mm across,
// bright at their edges) shows toward the limb too.
vec3 h33(vec3 p){ p=fract(p*vec3(0.1031, 0.1030, 0.0973)); p+=dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
vec3 sunSurface(vec2 q, float pxR){
  float cP=cos(sunOri.x), sP=sin(sunOri.x), cB=cos(sunOri.y), sB=sin(sunOri.y);
  float X=q.x*cP-q.y*sP, Y=q.x*sP+q.y*cP, Z=sqrt(max(0.0, 1.0-X*X-Y*Y));
  float lat=asin(clamp(Y*cB+Z*sB, -1.0, 1.0)), cmd=atan(-X, Z*cB-Y*sB);
  // Differential rotation against the equator (sunspots.js diffRot), in turns a day.
  float s2=sin(lat)*sin(lat), dr=(-2.39*s2-1.78*s2*s2)/360.0, lon0=cmd/6.28318530718-sunOri.z;
  float lon=fract(lon0-dr*sunDrift.x), v=lat/3.14159265+0.5, pxT=pxR/sqrt(max(Z, 0.04))/6.28318530718;
  vec4 t=textureLod(sunMap, vec2(lon, v), log2(max(1.0, float(textureSize(sunMap, 0).x)*pxT)));
  if(sunDrift.z>0.0) t=mix(t, textureLod(sunMap2, vec2(fract(lon0-dr*sunDrift.y), v), log2(max(1.0, float(textureSize(sunMap2, 0).x)*pxT))), sunDrift.z);
  float w=1.0-Z, fac=t.a, c=9.48*Z*w*w*w;
  if(pxR<0.012){
    float cl=cos(lat), la=fract(lon0-dr*sunDrift.w)*6.28318530718;
    vec3 p=vec3(cl*cos(la), cl*sin(la), sin(lat))*23.0, ip=floor(p);
    float f1=8.0, f2=8.0;
    for(int k=0;k<27;k++){
      vec3 g=ip+vec3(float(k%3)-1.0, float((k/3)%3)-1.0, float(k/9)-1.0), d=g+h33(g)-p;
      float e=dot(d, d);
      if(e<f1){ f2=f1; f1=e; } else if(e<f2) f2=e;
    }
    // Bright along the cell edges, broken into patches (the network is a chain of small
    // magnetic elements, not a continuous line).
    vec3 pp=p*2.7, ip2=floor(pp), fp=fract(pp); fp=fp*fp*(3.0-2.0*fp);
    float clump=mix(mix(mix(h33(ip2).x, h33(ip2+vec3(1,0,0)).x, fp.x), mix(h33(ip2+vec3(0,1,0)).x, h33(ip2+vec3(1,1,0)).x, fp.x), fp.y),
                    mix(mix(h33(ip2+vec3(0,0,1)).x, h33(ip2+vec3(1,0,1)).x, fp.x), mix(h33(ip2+vec3(0,1,1)).x, h33(ip2+vec3(1,1,1)).x, fp.x), fp.y), fp.z);
    fac=max(fac, 0.3*(1.0-smoothstep(0.0, 0.45, sqrt(f2)-sqrt(f1)))*smoothstep(0.35, 0.75, clump)*smoothstep(0.012, 0.006, pxR));
  }
  return pow(t.rgb, vec3(2.2))+fac*c*vec3(0.10, 0.13, 0.18);
}
// A planet's cloud tops or ground at planetographic latitude lat (degrees): Mercury's grey rock,
// Venus's clouds, Mars's ochre with its darker south and polar caps, Jupiter's belts and zones,
// Saturn's fainter bands, Uranus's pale cyan (paler toward the poles), Neptune's blue with a
// darker southern band; a moon in its own tint.
float bandOf(float lat, float a, float b, float w){ return smoothstep(a-w, a+w, lat)-smoothstep(b-w, b+w, lat); }
vec3 bodyAlbedo(int kind, float lat, vec3 tint){
  if(kind==0) return vec3(0.66, 0.62, 0.57);
  if(kind==1) return vec3(1.0, 0.96, 0.84);
  if(kind==2) return mix(mix(vec3(0.86, 0.52, 0.33), vec3(0.66, 0.42, 0.30), 0.6*bandOf(lat, -45.0, -5.0, 6.0)), vec3(0.95, 0.95, 0.97), smoothstep(68.0, 74.0, abs(lat)));
  if(kind==3){
    float belt=bandOf(lat, 7.0, 18.0, 1.5)+bandOf(lat, -21.0, -8.0, 1.5)+0.55*(bandOf(lat, 24.0, 31.0, 1.5)+bandOf(lat, -33.0, -26.0, 1.5))+0.3*(bandOf(lat, 36.0, 42.0, 2.0)+bandOf(lat, -44.0, -38.0, 2.0));
    return mix(mix(vec3(0.95, 0.91, 0.82), vec3(0.70, 0.53, 0.40), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.60, 0.58), smoothstep(45.0, 70.0, abs(lat)));
  }
  if(kind==5) return mix(vec3(0.58, 0.84, 0.92), vec3(0.70, 0.88, 0.92), smoothstep(50.0, 80.0, abs(lat)));
  if(kind==6) return mix(vec3(0.50, 0.66, 0.95), vec3(0.40, 0.55, 0.90), bandOf(lat, -30.0, -15.0, 4.0));
  if(kind==4) return mix(mix(vec3(0.93, 0.85, 0.64), vec3(0.78, 0.68, 0.50), 0.5*(bandOf(lat, 18.0, 32.0, 3.0)+bandOf(lat, -32.0, -18.0, 3.0))), vec3(0.70, 0.70, 0.64), smoothstep(55.0, 75.0, abs(lat)));
  return tint/max(max(tint.r, tint.g), max(tint.b, 1e-4))*0.85;
}
// The Red Spot at normal nrm (planets.js grsPaint): the pale hollow it pushes into the belt, then
// the spot, a little paler at its middle.
vec3 grsPaint(vec3 c, vec3 nrm, vec3 n, float lat){
  vec3 a=normalize(nrm-n*dot(nrm, n)), d=normalize(grsDir-n*dot(grsDir, n));
  float dl=atan(dot(cross(d, a), n), dot(d, a))*57.2957795, e=length(vec2(dl/(0.5*grsAB.x), (lat-grsAB.z)/(0.5*grsAB.y)));
  c=mix(c, vec3(0.95, 0.91, 0.82), 0.85*(1.0-smoothstep(1.2, 1.45, e)));
  return mix(c, vec3(0.80, 0.42, 0.30), grsAB.w*(1.0-smoothstep(0.8, 1.0, e))*(0.85+0.15*smoothstep(0.0, 0.7, e)));
}
const float BODY_FLAT[8]=float[8](${BODY_FLAT.map(v=>v.toFixed(5)).join(', ')});
// How bright each kind's disk is drawn, after its albedo, and its Minnaert k (planets.js BODY_GAIN, BODY_MINN).
const float BODY_GAIN[8]=float[8](${BODY_GAIN.map(v=>v.toFixed(2)).join(', ')}), BODY_MINN[8]=float[8](${BODY_MINN.map(v=>v.toFixed(2)).join(', ')});
// A body's disk where the view ray is o (the offset across the sky, in drawn radii) and the line of
// sight v: its lit colour (rgb) and coverage (a), the surface point x and how far along v it lies
// (t, toward the observer negative). The disk is the flattened spheroid about pole n, lit from L,
// darkening toward the terminator and, by its Minnaert k, the limb; rPx is its radius in pixels.
vec4 bodyDisk(vec3 o, vec3 v, vec3 n, vec3 L, int kind, float rPx, vec3 tint, out vec3 x, out float t){
  float f=BODY_FLAT[kind], k=1.0/(1.0-f)-1.0;
  vec3 op=o+k*dot(o, n)*n, vp=v+k*dot(v, n)*n;
  float a=dot(vp, vp), bh=dot(op, vp)/a, rho2=max(dot(op, op)-bh*bh*a, 0.0);
  float cov=clamp(0.5+(1.0-sqrt(rho2))*rPx, 0.0, 1.0);
  t=1e9; x=o;
  if(cov<=0.0) return vec4(0.0);
  t=-bh-sqrt(max(1.0-rho2, 0.0)/a); x=o+t*v;
  vec3 nrm=normalize(x+(1.0/((1.0-f)*(1.0-f))-1.0)*dot(x, n)*n);
  float mu0=dot(nrm, L), mu=max(dot(nrm, -v), 0.05), w=1.5/max(rPx, 1.0);
  float km=BODY_MINN[kind], lit=smoothstep(-w, w, mu0)*min(pow(max(mu0, 0.0)+0.01, km)*pow(mu, km-1.0), 1.3);
  float lat=asin(clamp(dot(nrm, n), -1.0, 1.0))*57.2957795;
  vec3 alb=bodyAlbedo(kind, lat, tint);
  if(kind==3 && grsAB.x>0.0) alb=grsPaint(alb, nrm, n, lat);
  return vec4(alb*lit*BODY_GAIN[kind], cov);
}
// Saturn's rings at r planet radii, w the radial blur: brightness (x) and opacity (y) of the C ring,
// the B ring (brightest in its outer half), the Cassini division and the A ring.
vec2 saturnRing(float r, float w){
  float C=smoothstep(1.239-w, 1.239+w, r)-smoothstep(1.527-w, 1.527+w, r), B=smoothstep(1.527-w, 1.527+w, r)-smoothstep(1.951-w, 1.951+w, r);
  float D=smoothstep(1.951-w, 1.951+w, r)-smoothstep(2.025-w, 2.025+w, r), A=smoothstep(2.025-w, 2.025+w, r)-smoothstep(2.267-w, 2.267+w, r);
  return vec2(0.18*C+mix(0.72, 1.0, smoothstep(1.55, 1.75, r))*B+0.12*D+0.62*A, 0.12*C+0.95*B+0.1*D+0.6*A);
}
int starCubeCell(vec3 d){
  float ax=abs(d.x), ay=abs(d.y), az=abs(d.z);
  int face; float u, v, s;
  if(ax>=ay && ax>=az){
    s=ax;
    if(d.x>=0.0){ face=0; u=d.y/s; }
    else { face=1; u=-d.y/s; }
    v=d.z/s;
  }else if(ay>=ax && ay>=az){
    s=ay;
    if(d.y>=0.0){ face=2; u=d.x/s; }
    else { face=3; u=-d.x/s; }
    v=d.z/s;
  }else{
    s=az;
    if(d.z>=0.0){ face=4; u=d.x/s; }
    else { face=5; u=-d.x/s; }
    v=d.y/s;
  }
  int iu=clamp(int(floor((u+1.0)*4.0)), 0, 7);
  int iv=clamp(int(floor((v+1.0)*4.0)), 0, 7);
  return (face*8+iv)*8+iu;
}
// Window lights. Each window switches on at its own point as the sun goes from 3 degrees above
// the horizon to 5 below, and off at its own time within an hour of offAt (local hours). One in
// twelve stays on all night. dark runs 0 to 1 over that dusk.
float windowOn(vec2 id, float seed, float frac, float offAt, float dark){
  float pick=h12(id+seed*97.0), a=h12(id+seed*31.0+5.1), b=h12(id+seed*13.0+9.7);
  float on=(b>0.92 || (clockH>=12.0 && clockH<offAt-1.0+2.0*b))?1.0:0.0;
  return step(pick, frac)*step(a*0.8+0.1, dark)*on;
}
// The average of windowOn over many windows, for buildings too far away to resolve them.
float windowMean(float frac, float offAt, float dark){
  float pOn=0.08+(clockH>=12.0?clamp(0.92-(clockH-offAt+1.0)*0.5, 0.0, 0.92):0.0);
  return frac*clamp((dark-0.1)/0.8, 0.0, 1.0)*pOn;
}
// The direction toward azimuth az and elevation el (degrees).
vec3 azElDir(float az, float el){
  float a=az*0.01745329252, z=(90.0-el)*0.01745329252;
  return normalize(vec3(sin(a)*sin(z), cos(a)*sin(z), cos(z)));
}
// Light of luminance ratio r and linear color L (of luminance r) added to the sky's display
// color skyC, of luminance ratio rBg, under the display curve: the pixel goes to the curve's
// value for the sum, its color the luminance-weighted mix.
vec3 overSky(vec3 skyC, float rBg, float r, vec3 L){
  float rNew=rBg+r, tBg=toneT(rBg), tNew=toneT(rNew);
  return lin2s3(clamp(s2lin3(skyC)*(tBg>0.0?(tNew/tBg)*(rBg/rNew):0.0)+L*(tNew/rNew), 0.0, 1.0));
}
// Light at night from the Moon (ml) and a supernova (sn), on a surface with normal n.
vec3 nightLit(vec3 n){ return snLight*max(dot(n, snDir), 0.0)+mlLight*max(dot(n, mlDir), 0.0); }
vec3 skyLook(vec3 d){
  float c=atan(d.x, d.y); if(c<0.0) c+=6.28318530718;
  float el=asin(clamp(d.z, -1.0, 1.0))*57.2957795;
  return texture(sky, vec2((fract(c/6.28318530718)*na+0.5)/(na+1.0), ((90.0-max(el, 0.0))/90.0*nr+0.5)/(nr+1.0))).rgb;
}
void main(){
  float fy=tan(fov*0.5);
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch);
  vec3 ro=eye;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float elevDeg=asin(clamp(rd.z,-1.0,1.0))*57.2957795;
  float compDeg=comp*57.2957795;
  float sunA=sunAz*0.01745329252;
  vec3 sd=azElDir(sunAz, sunEl);
  vec4 hit=texelFetch(hitInfo, ivec2(gl_FragCoord.xy), 0);
  vec4 hn=texelFetch(hitNrm, ivec2(gl_FragCoord.xy), 0);
  float tBest=1e8, kBest=0.0, hBest=1.0, tLand=-1.0, shBest=hit.b;
  vec3 nBest=vec3(0.0,0.0,1.0), pBest=ro; vec4 qBest=vec4(0.0);
  bool hill=showScn>0.5 && hit.g>0.5 && hit.g<1.5 && hit.a>40.0;
  if(hill){
    tBest=hit.r; kBest=1.0; nBest=hn.rgb; pBest=ro+rd*hit.r;
    hBest=hn.a; qBest=vec4(pBest.xy, hit.a, hn.a);
  }else if(showScn>0.5 && hit.r>0.0){
    tBest=hit.r; kBest=hit.g; nBest=hn.rgb; pBest=ro+rd*hit.r;
    if(kBest>5.5){ hBest=hit.a; qBest=vec4(0.0, 0.0, hit.a, hn.a); } // towns: height or eave, and a seed
    else { qBest=obj[int(hit.a+0.5)]; hBest=qBest.w; }
  }
  vec3 col;
  if(showScn<0.5){ kBest=0.0; tLand=-1.0; }
  if(kBest>0.5&&kBest<3.5){
    float wl=clamp(tBest*0.034, 8.0, 220.0);
    float a=vN(pBest.xy/wl), b=vN(pBest.xy/wl+vec2(0.5,0.15)), c=vN(pBest.xy/wl+vec2(0.15,0.5));
    nBest=normalize(nBest+vec3(a-b, a-c, 0.0)*0.28);
  }
  float hlen=length(rd.xy);
  float toward=hlen>1e-4?dot(rd.xy/hlen, vec2(sin(sunA),cos(sunA))):0.0;
  vec3 gcol=showScn>0.5?ground*mix(0.9,1.08,clamp(toward*0.5+0.5,0.0,1.0)):vec3(0.02,0.025,0.04);
  if(showScn>0.5&&(tLand>0.0||rd.z<0.0)){
    float tG=tLand>0.0?tLand:-ro.z/rd.z;
    vec3 gp3=ro+rd*tG; vec2 gp=gp3.xy;
    vec3 nG=tLand>0.0?nBest:rollN(gp);
    gcol*=mix(0.90, 1.06, texture(weather, gp*0.00028+0.12).b);
    gcol*=mix(0.84, 1.10, vN(gp*0.00115+3.0));
#if SCENERY
    float foot=tG*2.0*fy/res.y/sqrt(max(abs(rd.z), 0.002));
    vec3 relief=groundRelief(gp, foot);
    if(tLand<0.0) nG=normalize(nG+vec3(-relief.xy, 0.0));
    // Bare and grassy patches, scaled by how colourful the ground is so snow stays white.
    float gmx=max(gcol.r, max(gcol.g, gcol.b)), chroma=(gmx-min(gcol.r, min(gcol.g, gcol.b)))/max(gmx, 1e-4);
    float patchy=smoothstep(0.38, 0.66, vN(gp/120.0+7.7)+(vN(gp/31.0+2.3)-0.5)*0.55-relief.z*0.12);
    float colourful=clamp(chroma*1.6, 0.0, 1.0);
    gcol*=mix(vec3(1.0), mix(vec3(0.88, 1.04, 0.94), vec3(1.24, 1.06, 0.72), patchy), colourful);
    gcol*=1.0+groundMottle(gp, foot)*mix(0.3, 0.8, colourful);
    gcol*=1.0+clamp(relief.z*0.18, -0.14, 0.08);
    // Asphalt, a little worn, and white dashes down the middle of the roads between towns.
    // Far off, where a road is narrower than a pixel, it fades to its share of the pixel.
    if(tLand<0.0 && kBest<0.5){
      vec2 rd2=roadAt(gp, foot);
      float pave=(1.0-smoothstep(-0.5*foot, 0.5*foot, rd2.x))*clamp(5.0/max(foot, 1e-3), 0.0, 1.0);
      if(pave>0.0){
        float lum=dot(ground, vec3(0.3, 0.55, 0.15))*mix(0.84, 1.10, vN(gp*0.00115+3.0));
        vec3 asph=lum*vec3(0.80, 0.79, 0.77)*(0.9+0.2*vN(gp/5.0))*(1.0+groundMottle(gp, foot)*0.15);
        asph=mix(asph, lum*vec3(2.2), rd2.y*0.8);
        gcol=mix(gcol, asph, pave);
        nG=normalize(mix(nG, rollN(gp), pave));
      }
    }
#endif
    gcol=mix(gcol, gcol*vec3(0.84, 0.78, 0.70), (1.0-smoothstep(0.55, 0.92, nG.z))*0.5);
    gcol=mix(gcol, gcol*vec3(1.06, 1.02, 0.95), smoothstep(28.0, 130.0, gp3.z)*0.4);
    if(cloudOn>0.5){
      vec2 wind=vec2(cloudDrift, cloudDrift*0.42);
      float c0=texture(weather, (gp+wind)*cloudScale*0.33).r;
      vec3 sp=gp3+sd*(1800.0/max(sd.z, 0.2));
      float c1=texture(weather, (sp.xy+wind)*cloudScale*0.33).r;
      float cov=clamp(cloudCov+(max(c0, c1)-0.56)/0.09*0.26, 0.0, 1.0);
      gcol*=mix(1.0, 0.5, smoothstep(0.3, 0.8, cov));
    }
    if(kBest<0.5){
      float ndl=max(dot(nG, sd), 0.0);
      float rel=clamp((0.20+ndl)/(0.20+max(sd.z, 0.05)), 0.32, 1.9);
      gcol*=rel*mix(0.80, 1.0, nG.z);
      gcol*=mix(0.58, 1.0, shBest);
      gcol+=nightLit(nG)*0.16;
    }
#if SCENERY
    // Pools: pond[i] is (centre, radius, kind) with kind 0 water, 1 magma, 2 ice, 3 swamp.
    // The shore wanders with two octaves of noise. Hills are kept out of them by the hit pass.
    if(tLand<0.0 && kBest<0.5){
      float pk=-1.0, edge=0.0, shore=0.0;
      for(int i=0;i<int(pondN);i++){
        vec4 q=pond[i];
        float d=length(gp-q.xy)/q.z;
        if(d>1.5) continue;
        d+=(vN(gp/(q.z*0.3)+q.xy*0.013)-0.5)*0.45+(vN(gp/(q.z*0.08)+5.0)-0.5)*0.1;
        if(d<1.0){ pk=q.w; edge=(1.0-d)*q.z; break; }
        shore=max(shore, 1.0-smoothstep(1.0, 1.0+5.0/q.z, d));
        if(shore>0.0) pk=q.w-10.0;
      }
      float light=0.42+0.58*sunMu, detail=1.0-smoothstep(0.3, 1.5, foot);
      if(pk>-0.5 && (pk<0.5 || pk>2.5)){
        // Two ripple layers drifting different ways over a slow swell. waterT is real seconds;
        // swamp water moves at a third of the speed.
        float wt=waterT*(pk>2.5?0.3:1.0);
        vec3 r1=vNd(gp*0.45+vec2(0.31, 0.17)*wt), r2=vNd(gp*1.3+7.0-vec2(0.22, 0.41)*wt), r3=vNd(gp*0.12+vec2(-0.05, 0.04)*wt);
        vec3 wn=normalize(vec3(-((r1.yz*0.45+r2.yz*0.35)*detail+r3.yz*0.25)*0.12, 1.0));
        vec3 refl=reflect(rd, wn);
        float fres=0.02+0.98*pow(1.0-clamp(-dot(rd, wn), 0.0, 1.0), 5.0);
        vec3 deep=pk>2.5?vec3(0.035, 0.045, 0.02):vec3(0.012, 0.035, 0.05);
        vec3 wc=mix(deep*light, skyLook(refl), fres);
        wc+=sunCol*pow(max(dot(refl, sd), 0.0), 300.0)*step(0.0, sd.z)*2.0;
        wc+=snLight*pow(max(dot(refl, snDir), 0.0), 300.0)*6.0+mlLight*pow(max(dot(refl, mlDir), 0.0), 120.0)*4.0;
        if(pk>2.5) wc=mix(wc, vec3(0.10, 0.16, 0.05)*light, smoothstep(0.55, 0.72, vN(gp/7.0+vec2(0.02, 0.01)*waterT))*0.75);
        gcol=mix(gcol*0.55, wc, smoothstep(0.0, 3.0, edge));
      }else if(pk>0.5 && pk<1.5){
        // The crust and its cracks creep together at about 3.5 cm/s, the open melt churns,
        // and the glow pulses.
        vec2 creep=vec2(0.035, 0.018)*waterT;
        float crust=vN((gp-creep)/9.0)*0.6+vN((gp-creep)/3.1)*0.4;
        float crack=mix(0.1, 1.0-smoothstep(0.0, 0.05, abs(vN((gp-creep)/5.0+3.3)-0.5)), detail);
        float pool=smoothstep(6.0, 40.0, edge)*smoothstep(0.45, 0.7, vN(gp/30.0+9.1+vec2(0.013, -0.009)*waterT));
        float glow=max(pool, crack*0.8)*(0.75+0.25*crust)*smoothstep(0.0, 3.0, edge);
        glow*=0.82+0.18*sin(waterT*1.3+vN(gp/12.0)*12.0);
        gcol=gcol*0.3*(0.8+0.4*crust)+vec3(1.9, 0.55, 0.08)*glow*(0.6+0.6*pool);
      }else if(pk>1.5 && pk<2.5){
        vec3 refl=reflect(rd, vec3(0.0, 0.0, 1.0));
        float fres=0.02+0.98*pow(1.0-clamp(-rd.z, 0.0, 1.0), 5.0);
        float crack=(1.0-smoothstep(0.0, 0.03, abs(vN(gp/12.0)-0.5)))*detail;
        vec3 ice=gcol*vec3(0.55, 0.74, 0.92)*(0.9+0.2*vN(gp/40.0));
        gcol=mix(ice, skyLook(refl), fres*0.7)+gcol*0.25*crack;
      }else if(pk<-5.0){
        float k=pk+10.0;
        gcol*=k>0.5&&k<1.5?vec3(mix(1.0, 0.35, shore)):(k>1.5&&k<2.5?vec3(1.0):mix(vec3(1.0), vec3(0.62, 0.6, 0.56), shore));
      }
    }
#endif
  }
#if SCENERY
  if(kBest>7.5){
    // Trees (8). hBest is style*2+part: part 0 trunk, 1 crown. Leaf clumps bump the crown
    // normal at metre scale and fade with distance; foliage wraps light a little.
    float sty=floor(hBest*0.5+0.25), part=hBest-sty*2.0, seed=qBest.w, foot=tBest*2.0*fy/res.y;
    vec3 n=nBest, albedo;
    if(part<0.5){
      albedo=sty>4.5?vec3(0.05, 0.045, 0.04):(sty>1.5&&sty<2.5?vec3(0.30, 0.29, 0.21):vec3(0.27, 0.21, 0.15));
      float ang=atan(n.y, n.x), detail=1.0-smoothstep(0.05, 0.2, foot);
      float bark=sty>1.5&&sty<2.5
        ?step(0.32, abs(fract(ang*1.6+pBest.z*0.8)-0.5)+abs(fract(ang*1.6-pBest.z*0.8)-0.5))
        :step(0.3, fract(ang*3.0+vN(vec2(ang*3.0, pBest.z*0.5))*0.6));
      albedo*=mix(1.0, 0.75+0.25*bark, detail);
    }else{
      vec3 leaf=sty<0.5?vec3(0.16, 0.27, 0.07):(sty<1.5?vec3(0.07, 0.16, 0.07):(sty<2.5?vec3(0.13, 0.21, 0.06):(sty<3.5?vec3(0.15, 0.29, 0.07):vec3(0.16, 0.25, 0.09))));
      leaf*=mix(0.8, 1.2, fract(seed*13.1));
      float detail=1.0-smoothstep(0.15, 0.6, foot);
      vec3 q=pBest*1.3;
      float a=vN(q.xy+q.z*1.7), b=vN(q.yz*1.1+3.1), c=vN(q.zx*1.2+7.3);
      n=normalize(n+(vec3(a, b, c)-0.5)*1.4*detail);
      albedo=leaf*mix(1.0, 0.7+0.6*a, detail);
    }
    float wrap=part>0.5?clamp(dot(n, sd)*0.65+0.35, 0.0, 1.0):max(dot(n, sd), 0.0);
    float ao=mix(0.5, 1.0, n.z*0.5+0.5)*mix(0.7, 1.0, smoothstep(0.0, 2.0, pBest.z));
    col=albedo*(0.45*ao+0.9*wrap)*(0.42+0.58*sunMu)+albedo*(snLight*max(dot(n, snDir)*0.65+0.35, 0.0)+mlLight*max(dot(n, mlDir)*0.65+0.35, 0.0));
    col=mix(col, skyLook(rd), clamp(1.0-exp(-tBest/16000.0), 0.0, 0.8));
  }else if(kBest>5.5){
    // Towers (6) and houses (7). Wall coordinates are world x or y, which line up with the bays
    // because footprints sit on the bay grid. Window detail fades to its average once a bay
    // spans only a few pixels.
    float seed=qBest.w, foot=tBest*2.0*fy/res.y, z=pBest.z;
    vec3 n=nBest;
    float u=abs(n.x)>0.5?pBest.y:pBest.x;
    float night=1.0-smoothstep(0.03, 0.25, sunMu), dark=clamp((3.0-sunEl)/8.0, 0.0, 1.0);
    vec3 refl=reflect(rd, n);
    vec3 env=refl.z>0.0?skyLook(refl):ground*0.7;
    vec3 glass=mix(vec3(0.035, 0.045, 0.055), env, 0.25+0.6*pow(1.0-abs(dot(rd, n)), 4.0));
    vec3 albedo; float win=0.0, lit=0.0;
    if(kBest<6.5){
      float sty=fract(seed*7.13);
      albedo=sty<0.35?vec3(0.60, 0.59, 0.56):(sty<0.6?vec3(0.50, 0.34, 0.26):(sty<0.8?vec3(0.72, 0.70, 0.64):vec3(0.26, 0.30, 0.34)));
      vec2 ws=sty<0.8?vec2(0.55, 0.5):vec2(0.92, 0.8);
      if(abs(n.z)<0.3){
        float bx=u/3.0, bz=z/3.5;
        float m=step(abs(fract(bx)-0.5), ws.x*0.5)*step(abs(fract(bz)-0.55), ws.y*0.5)*step(0.5, z);
        float detail=1.0-smoothstep(0.5, 1.4, foot);
        win=mix(ws.x*ws.y, m, detail);
        float litFrac=mix(0.2, 0.55, fract(seed*3.71));
        lit=mix(windowMean(litFrac, 22.0, dark), windowOn(vec2(floor(bx), floor(bz)), seed, litFrac, 22.0, dark), detail);
      }else albedo=vec3(0.36, 0.36, 0.35);
    }else{
      float pa=fract(seed*5.31), pb=fract(seed*11.7);
      vec3 siding=pa<0.2?vec3(0.86, 0.85, 0.80):(pa<0.4?vec3(0.80, 0.72, 0.58):(pa<0.55?vec3(0.62, 0.70, 0.76):(pa<0.7?vec3(0.84, 0.78, 0.56):(pa<0.85?vec3(0.56, 0.32, 0.24):vec3(0.66, 0.66, 0.62)))));
      vec3 roof=pb<0.4?vec3(0.20, 0.20, 0.21):(pb<0.65?vec3(0.32, 0.24, 0.18):(pb<0.85?vec3(0.55, 0.27, 0.18):vec3(0.30, 0.34, 0.36)));
      if(n.z>0.3){
        float detail=1.0-smoothstep(0.08, 0.3, foot);
        albedo=roof*mix(1.0, 0.82+0.18*step(0.18, fract(z/0.32)), detail);
      }else{
        albedo=siding;
        // One row of windows per storey, centred in each 3.6 m bay, none in the gable.
        float bx=u/3.6, sill=z<3.0?z-0.95:z-3.7;
        float m=step(abs(fract(bx)-0.5), 0.17)*step(0.0, sill)*step(sill, 1.25)*step(z, hBest-0.25);
        float detail=1.0-smoothstep(0.25, 0.7, foot);
        win=mix(0.13, m, detail);
        lit=mix(windowMean(0.5, 22.5, dark), windowOn(vec2(floor(bx), floor(z/2.8)), seed, 0.5, 22.5, dark), detail);
      }
    }
    float ndl=max(dot(n, sd), 0.0);
    float ao=mix(0.62, 1.0, clamp(n.z, 0.0, 1.0))*mix(0.7, 1.0, smoothstep(0.0, 2.5, z));
    col=mix(albedo*((0.40*ao+0.95*ndl)*(0.42+0.58*sunMu)+nightLit(n)), glass, win);
    col+=vec3(1.0, 0.74, 0.42)*win*lit*0.9;
    col=mix(col, skyLook(rd), clamp(1.0-exp(-tBest/16000.0), 0.0, 0.8));
  }else if(kBest>0.5){
    float volc=step(1.5, kBest);
    vec3 albedo=vec3(0.46,0.38,0.31);
    vec3 emit=vec3(0.0);
    if(kBest>4.5) albedo=vec3(0.10,0.26,0.08);
    else if(kBest>3.5) albedo=vec3(0.74,0.71,0.66);
    else if(kBest>2.5){
      // Glacier: white snow on the flats, blue ice on the cliffs, banded by its layers.
      // Layers are hBest*0.022 thick, warped, and dip gently across the massif. Each layer has
      // one band of its own width, position, and colour (deep blue, turquoise, pale blue, grey
      // debris, or near-white), with faint fine lines between. Far away it fades to the mean.
      float sp=hBest*0.022;
      vec2 dip=vec2(cos(qBest.x*0.013), sin(qBest.y*0.017))*0.03;
      float lay=pBest.z/sp+(vN(pBest.xy/90.0)-0.5)*2.5+vN(pBest.xy/25.0)*0.6+dot(pBest.xy-qBest.xy, dip)/sp;
      float detail=1.0-smoothstep(1.0, 4.0, tBest*2.0*fy/res.y/max(sp, 1.0));
      float li=floor(lay), lf=fract(lay);
      float r1=h12(vec2(li, 3.7)), r2=h12(vec2(li, 9.1)), r3=h12(vec2(li, 5.3));
      float wd=mix(0.06, 0.85, r2*r2), ctr=mix(wd*0.5, 1.0-wd*0.5, r3);
      float m=(1.0-smoothstep(wd*0.5-0.03, wd*0.5+0.03, abs(lf-ctr)))*mix(0.55, 0.95, fract(r1*7.3));
      vec3 bc=r1<0.3?vec3(0.18, 0.42, 0.75):(r1<0.5?vec3(0.32, 0.66, 0.84):(r1<0.7?vec3(0.62, 0.80, 0.93):(r1<0.85?vec3(0.46, 0.53, 0.60):vec3(0.90, 0.95, 0.99))));
      float thin=1.0-smoothstep(0.0, 0.05, abs(fract(lay*3.1+r3)-0.5));
      vec3 base=vec3(0.80, 0.89, 0.96);
      vec3 face=mix(base, bc, m)*(1.0-0.12*thin);
      face=mix(mix(base, vec3(0.5, 0.68, 0.85), 0.3), face, detail);
      face*=0.92+0.16*vN(pBest.xy/6.0+pBest.z*0.3);
      albedo=mix(face, vec3(0.94, 0.96, 0.99), smoothstep(0.55, 0.85, nBest.z));
      emit=vec3(0.06, 0.13, 0.22)*(1.0-smoothstep(0.4, 0.8, nBest.z))*(0.42+0.58*sunMu);
    }
    else {
      float hh=clamp(pBest.z/max(hBest,1.0), 0.0, 1.6);
      float steep=clamp(nBest.z, 0.0, 1.0);
      float R=massifRad(qBest.z, volc);
      float u=length(pBest.xy-qBest.xy)/max(R, 1.0);
      float grit=vN(pBest.xy/max(18.0, R*0.09));
      vec3 rock=mix(vec3(0.42,0.37,0.33), vec3(0.24,0.18,0.15), clamp(1.0-mtnSnow,0.0,1.0)*0.9);
      if(volc>0.5) rock=vec3(0.22,0.16,0.14);
      vec3 scree=rock*vec3(1.16, 1.10, 1.04);
      albedo=mix(rock, scree, smoothstep(0.22, 0.70, steep));
      albedo*=mix(0.88, 1.04, grit);
      albedo=mix(mix(ground, rock, 0.4), albedo, smoothstep(0.02, 0.18, hh));
      if(volc>0.5) albedo=mix(albedo, vec3(0.40,0.13,0.05), (1.0-smoothstep(0.06, 0.32, u))*0.85);
      float snowLine=mix(0.88, 0.56, clamp(mtnSnow,0.0,1.0));
      float snow=mtnSnow*step(volc, 0.5)*smoothstep(300.0, 670.0, hBest);
      snow*=smoothstep(snowLine, snowLine+0.12, hh)*smoothstep(0.36, 0.74, steep);
      // snowCover (Snowball Earth) buries every slope but the steep rock faces, whatever the height.
      snow=max(snow, snowCover*step(volc, 0.5)*smoothstep(0.3, 0.6, steep));
      albedo=mix(albedo, vec3(0.94,0.95,0.97), snow);
      if(volc>0.5){
        float seed=texture(weather, qBest.xy*0.00041+0.13).r;
        float erupt=smoothstep(0.32, 0.66, seed);
        float bowl=(1.0-smoothstep(0.035, 0.16, u))*smoothstep(0.20, 0.50, hh);
        float da=atan(pBest.y-qBest.y, pBest.x-qBest.x)-seed*6.2831853;
        da=abs(mod(da+3.14159265, 6.2831853)-3.14159265);
        float streak=(1.0-smoothstep(0.04, 0.28, da))*(1.0-smoothstep(0.14, 0.62, u))*smoothstep(0.03, 0.12, u);
        float hot=max(bowl, streak*0.75)*erupt;
        albedo=mix(albedo, vec3(0.08,0.07,0.07), hot*0.65);
        emit=vec3(1.15, 0.36, 0.04)*hot*(0.55+0.85*(1.0-sunMu));
      }
    }
    float ndl=max(dot(nBest,sd),0.0);
    float sh=kBest<3.5?shBest:1.0;
    float ao=mix(0.58, 1.0, clamp(nBest.z,0.0,1.0));
    float lit=(0.40*ao+0.95*ndl*sh)*(0.42+0.58*sunMu);
    if(kBest>2.5&&kBest<3.5) lit=(0.62+0.6*ndl*sh)*(0.42+0.58*sunMu); // ice scatters light into its shade
    col=albedo*(lit+nightLit(nBest))+emit;
    if(kBest<3.5){
      float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
      float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
      vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
      float fog=1.0-exp(-tBest/16000.0);
      col=mix(col, skyC, clamp(fog, 0.0, 0.8));
      float hh=pBest.z/max(hBest,1.0);
      col=mix(gcol, col, smoothstep(0.0, 0.035, hh));
    }
  }else
#endif
  if(tLand>0.0){
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec3 skyC=texture(sky, vec2(uTex, vTex)).rgb;
    float fog=1.0-exp(-tLand/18000.0);
    col=mix(gcol, skyC, clamp(fog, 0.0, 0.82));
  }else{
    float uTex=(fract(compDeg/360.0)*na+0.5)/(na+1.0);
    float vTex=((90.0-max(elevDeg,0.0))/90.0*nr+0.5)/(nr+1.0);
    vec4 skyT=texture(sky, vec2(uTex,vTex));
    vec3 skyC=skyT.rgb;
    float skyL=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
    // Sky luminance as a fraction of the reference, carried in the texture's alpha as a log.
    float rBg=pow(10.0, skyT.a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)});
    float te=trueAlt(elevDeg), teR=te*0.01745329252, cth=cos(teR);
    vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
    bool inSun=false; float sunR=2.0; vec3 sunP=vec3(0.0), sunOffV=vec3(0.0);
    if(sunOn>0.5&&te>-1.5&&dot(src,sd)>cos(sunRad*2.5+0.03)){
      vec4 sk=sunDiskAt(comp, elevDeg, sd, sunRad*57.2957795, sunOffV);
      inSun=sk.x+sk.y+sk.z!=0.0; sunR=min(sk.w, 1.0); sunP=max(sk.rgb, vec3(0.0));
    }
    bool onBody=inSun, onMoon=false;
    vec3 skyBase=skyC;
    if(inSun){
      // Limb darkening (moon.js sunLimbRGB): dimmer and redder toward the edge. The bands that
      // reach this ray, over those at the disk's middle, colour sunCol: redder low on the disk,
      // a rim of the last colour the air lets through at its top. The disk is far brighter than
      // the display, so its range is squeezed (brightness to the power 0.45, hue kept), as the
      // eye and a camera both see a setting Sun: dark red at the bottom is still bright. Below a
      // tenth of the middle's brightness it falls off faster, so a rim the air has all but put
      // out (green through soot or haze) stays dark beside the disk.
      float r=sunR, mu=sqrt(max(0.01, 1.0-r*r));
      vec3 lin=s2lin3(sunCol), v=sunP*sunG;
      float vm=max(v.r, max(v.g, v.b)), lm=max(lin.r, max(lin.g, lin.b)), x=vm/max(lm, 1e-6);
      if(vm>0.0) lin=v*(lm*(x>0.1?pow(x, 0.45):0.355*pow(x*10.0, 1.3))/vm);
      lin=clamp(lin, 0.0, 1.0);
      vec3 c=lin*vec3(${SUN_LD_C.map(v=>v.toFixed(4)).join(', ')});
      c*=max(lin.r, max(lin.g, lin.b))/max(max(c.r, max(c.g, c.b)), 1e-9);
      // Over the sky in front of it, as opaque as it is bright against that sky, so an image
      // fainter than the sky (the violet one, all but gone in the air) disappears into it.
      vec3 dsk=clamp(c*pow(vec3(mu), vec3(${SUN_LD.map(v=>v.toFixed(4)).join(', ')})), 0.0, 1.0), sl=s2lin3(skyBase);
      float op=clamp((dot(dsk, vec3(0.2126, 0.7152, 0.0722))/max(dot(sl, vec3(0.2126, 0.7152, 0.0722)), 1e-6)-0.1)*3.0, 0.0, 1.0);
      // Spots and faculae, placed on the image the ray sees (squeezed by refraction low down),
      // with the Sun's north from celestial north. The disk's opacity stays the unspotted disk's:
      // an umbra is dark against the photosphere but still far brighter than the sky.
      if(sunOri.w>0.5){
        vec3 ncpS=vec3(0.0, cos(latRad), sin(latRad)), nS=ncpS-sd*dot(ncpS, sd);
        nS=dot(nS, nS)<1e-8?vec3(1.0, 0.0, 0.0):normalize(nS);
        vec2 q=vec2(dot(sunOffV, normalize(cross(nS, sd))), dot(sunOffV, nS))/sin(sunRad);
        float ql=length(q); if(ql>0.998) q*=0.998/ql;
        dsk=clamp(dsk*sunSurface(q, 2.0*tan(fov*0.5)/res.y/sunRad), 0.0, 1.0);
      }
      skyC=lin2s3(mix(sl, dsk, op));
    }
    if(moonOn>0.5&&te>-1.2){
      vec3 md=azElDir(moonAz, moonEl);
      vec3 ncp=vec3(0.0, cos(latRad), sin(latRad));
      vec3 north=ncp-md*dot(ncp,md);
      if(dot(north,north)<1e-6) north=vec3(1.0,0.0,0.0);
      north=normalize(north);
      vec3 east=normalize(cross(north, md));
      // The limb has mountains and valleys; sunlight through the valleys makes Baily's beads.
      float cm=dot(src,md);
      bool inMoon=cm>cos(moonRad*1.01)&&acos(clamp(cm, -1.0, 1.0))<moonRad*(1.0+limbH(atan(dot(src,east), dot(src,north))));
      if(inMoon){
        onBody=true; onMoon=true;
        {
        // In front of the Sun the Moon is drawn like the rest of its disk: the sky in front of it
        // plus its own dim light.
        skyC=skyBase;
        float s=sin(moonRad);
        float x=dot(src,east)/s, y=dot(src,north)/s, rr=sqrt(x*x+y*y);
        if(rr>1.0){ x/=rr; y/=rr; rr=1.0; }
        vec3 alb=texture(moonMap, vec2(x*0.5+0.5, y*0.5+0.5)).rgb;
        vec3 nrm=normalize(east*x+north*y-md*sqrt(max(1.0-rr*rr,0.0)));
        float lit=smoothstep(-0.02, 0.05, dot(nrm,sd));
        // The air in front of the Moon extincts it (blue first) and the sky
        // already drawn is that same air, so a bright sky veils the disk.
        float mu=max(sin(max(te,0.0)*0.01745329252), 0.04);
        vec3 T=exp(-vec3(0.12, 0.22, 0.48)/mu);
        vec3 moonC=alb*(0.06+0.94*lit)*T;
        if(eclU.w>0.5){
          float t=length(vec2(x, y)-eclU.xy)*eclU.z;
          if(t<1.0) moonC=lin2s3(s2lin3(moonC)*s2lin3(texture(eclTex, vec2((t*${LUN_LUT_N-1}.0+0.5)/${LUN_LUT_N}.0, 0.5)).rgb));
        }
        float skyY=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
        skyC+=moonC*(1.0-smoothstep(0.0, 1.15, skyY));
        }
      }
    }
    if(mwOn>0.5 && !onBody && te>-1.0 && rBg<6e-6){
      // The Milky Way, behind the air: its light dimmed by extinction and added to the sky's
      // under the same display curve, coloured by its share.
      vec3 gq=vec3(dot(src, galX), dot(src, galY), dot(src, galZ));
      float gb=asin(clamp(gq.z, -1.0, 1.0))*57.2957795-mwDB;
      if(abs(gb)<${MW_BMAX.toFixed(1)}){
        float gl=atan(gq.y, gq.x)*57.2957795;
        float rMw=texture(mwTex, vec2((gl+180.0)/360.0, (gb+${MW_BMAX.toFixed(1)})/${(2*MW_BMAX).toFixed(1)})).r*mwScale*extinctionAt(te, mwK);
        if(rMw>rBg*0.003) skyC=overSky(skyC, rBg, rMw, vec3(${mwLinGLSL()})*rMw);
      }
    }
    if(haloK.x+haloK.y>0.0 && !onBody && te>-1.0){
      // Diamond dust: the halos, and the glints of single crystals, most of them where the halos are.
      vec3 L=vec3(0.0);
      if(haloK.x>0.0) L+=haloAt(src, sd)*haloSunLin*haloK.x;
      if(haloK.y>0.0){
        float mA=moonAz*0.01745329252, mZ=(90.0-moonEl)*0.01745329252;
        L+=haloAt(src, vec3(sin(mA)*sin(mZ), cos(mA)*sin(mZ), cos(mZ)))*haloMoonLin*haloK.y;
      }
      float rH=dot(L, vec3(0.2126, 0.7152, 0.0722));
      vec3 cell=floor(src/(3.0*fy/res.y));
      float pick=h12(cell.xy+cell.z*17.31), tw=fract(pick*91.7+waterT*0.35);
      float glint=step(0.988, pick)*pow(max(sin(tw*6.2831853), 0.0), 12.0)*14.0;
      L+=haloSunLin*rH*glint; rH*=1.0+glint;
      if(rH>rBg*0.003) skyC=overSky(skyC, rBg, rH, L);
    }
    if(ringV.z>0.5 && !onBody && te>-1.0){
      float rR=ringAtG(src, sd, 1.2*fy/res.y)*extinctionAt(max(te, 0.0), mwK);
      if(rR>rBg*0.003) skyC=overSky(skyC, rBg, rR, ringLin*rR);
    }
    if(cometN>0.5 && !onBody && te>-0.5){
      vec3 Lc=cometsAt(src, 1.2*fy/res.y)*extinctionAt(max(te, 0.0), mwK);
      float rC=dot(Lc, vec3(0.2126, 0.7152, 0.0722));
      if(rC>rBg*0.003) skyC=overSky(skyC, rBg, rC, Lc);
    }
    if(aurOn>0.5 && !onBody && te>-0.5) skyC=auroraMix(skyC, rBg, texture(aurTex, gl_FragCoord.xy/res)*0.001);
    if(corona>0.001 && !onBody && te>-1.0){
      // The corona around the hidden Sun: a bright inner glow falling off steeply, and fainter
      // streamers, strongest toward the solar equator, out to about six solar radii. A thin pink
      // rim (chromosphere) with a few prominences shows where the Moon's edge is close.
      vec3 cn=vec3(0.0, cos(latRad), sin(latRad)), nn=cn-sd*dot(cn, sd);
      nn=dot(nn, nn)<1e-6?vec3(1.0, 0.0, 0.0):normalize(nn);
      vec3 ee=normalize(cross(nn, sd));
      float a=acos(clamp(dot(src, sd), -1.0, 1.0))/sunRad;
      float pa=atan(dot(src, ee), dot(src, nn));
      vec2 ring=vec2(cos(pa), sin(pa));
      float streak=vN(ring*3.0+vec2(17.0, 5.0))*0.7+vN(ring*9.0+vec2(3.0, 11.0))*0.3;
      float streamer=(0.25+1.6*streak*streak)*(0.5+0.5*abs(ring.y));
      // The epoch's corona as today's at the radius where today's is as bright (corona.js
      // coronaMap: 16 samples from 1 to 12 radii).
      float tm=clamp((a-1.0)/11.0*15.0, 0.0, 15.0);
      int i0=min(int(tm), 14);
      float am=a>12.0?coronaMap[15]*a/12.0:mix(coronaMap[i0], coronaMap[i0+1], tm-float(i0));
      float I=(1.0*pow(am, -6.0)+0.9*pow(am, -2.2)*streamer)*(1.0-smoothstep(3.5, 6.5, am))*(1.0-smoothstep(5.0, 12.0, a));
      float prom=smoothstep(0.62, 0.86, vN(ring*7.0+vec2(29.0, 2.0)));
      float rim=1.0-smoothstep(1.0, 1.03+0.07*prom, a);
      float mu=max(sin(max(te, 0.0)*0.01745329252), 0.04);
      vec3 T=exp(-vec3(0.12, 0.22, 0.48)/mu);
      skyC+=corona*T*(I*vec3(1.0, 0.97, 0.92)+rim*vec3(1.0, 0.3, 0.42)*1.5*coronaRim);
    }
    if(beads[0].w>0.0 && te>-1.0){
      // Baily's beads and the diamond ring: glare around each piece of photosphere still
      // showing through the limb valleys.
      float px=2.0*fy/res.y;
      for(int i=0;i<6;i++){
        vec4 b=beads[i];
        if(b.w<=0.0) break;
        float a=acos(clamp(dot(src, b.xyz), -1.0, 1.0)), g=a/(px*2.5*sqrt(b.w));
        skyC+=sunCol*b.w*(2.5/(1.0+g*g)+0.35*exp(-a/(sunRad*0.3)));
      }
    }
    if(snOn>0.5 && te>0.0){
      // The supernova: unresolved, so a core of a couple of pixels and a glare halo, plus the
      // light the air scatters back over the whole dome at night.
      float a=2.0*asin(min(0.5*length(src-snDir), 1.0)), px=2.0*fy/res.y;
      float dark=1.0-smoothstep(0.05, 0.4, skyL);
      float g=a/(px*2.5);
      skyC+=snCol*((1.0-smoothstep(px*1.2, px*3.2, a))*3.0+0.7/(1.0+g*g)*(0.5+0.5*dark)+0.45*exp(-a/0.012)*(0.35+0.65*dark)
        +dark*(0.14*exp(-a/0.05)+0.035*exp(-a/0.3)+0.012));
    }
    if(!onBody && te>0.0){
      // Each star shows when brighter than the naked-eye limit for the sky around it.
      float lim=nakedEyeLimit(rBg*rCd);
      if(lim>-5.0){
        // Through the air (mwK magnitudes per airmass) every star here is fainter by the same dm:
        // less of it shows, and what shows is dimmer (day.js starThroughAir).
        float dm=-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25), dim=pow(10.0, -0.2*dm), sigMin=1.2*fy/res.y;
        int cell=starCubeCell(src);
        vec4 info=texelFetch(starBin, ivec2(cell- (cell/64)*64, cell/64), 0);
        int start=int(info.r+0.5), count=int(info.g+0.5);
        for(int k=0;k<96;k++){
          if(k>=count) break;
          int id=start+k;
          int si=int(texelFetch(starIdx, ivec2(id- (id/1024)*1024, id/1024), 0).r+0.5);
          vec4 sp=texelFetch(starMap, ivec2(si, 0), 0);
          if(sp.w<=0.0) continue;
          // No narrower than about half a screen pixel, so a faint star does not shimmer as the view turns.
          float sig=max(sp.w*starPx, sigMin);
          // The squared chord, from the difference: 1-dot(src, star) loses the float's precision
          // once zoomed in, where a pixel is a few 1e-4 rad and 1-cos only a few 1e-8.
          vec3 dd=src-sp.xyz; float d2=dot(dd, dd);
          if(d2>16.0*sig*sig) continue;
          float wgt=exp(-0.5*d2/(sig*sig));
          vec4 sc=texelFetch(starMap, ivec2(si, 1), 0);
          skyC+=sc.rgb*wgt*(1.0-smoothstep(lim-0.8, lim+0.2, sc.a+dm))*dim;
        }
      }
    }
    if(bodyCnt>0.5 && te>0.0 && !onMoon){
      // The planets and moons: a point like a star's while the drawn disk is under a pixel or two,
      // the lit disk once it is larger. Each shows as a star does, by its magnitude through the air
      // against the naked-eye limit here.
      // In front of the Sun, a planet nearer than it is a dark disk.
      float lim=nakedEyeLimit(rBg*rCd), pxA=2.0*fy/res.y, sigMin=1.2*fy/res.y;
      float dm=-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25), dim=pow(10.0, -0.2*dm);
      // The air dims a disk as it does a star, and reddens it: green and blue lose about 0.07 and
      // 0.2 magnitudes more than red to each airmass.
      vec3 T=dim*exp(-vec3(0.0, 0.064, 0.184)/max(sin(te*0.01745329252), 0.04));
      for(int b=0;b<${BODY_MAX};b++){
        if(float(b)>=bodyCnt) break;
        vec4 P=bodyP[b], C=bodyC[b], L=bodyL[b], N=bodyN[b];
        int kind=int(mod(N.w, 8.0)+0.5);
        bool ringed=kind==4 && N.w<15.5;
        if(inSun && mod(N.w, 16.0)<7.5) continue;
        float sig=max(C.w*starPx, sigMin), reach=max(P.w*(ringed?2.3:1.0)+2.0*pxA, 4.0*sig);
        vec3 dd=src-P.xyz; float d2=dot(dd, dd);
        if(d2>reach*reach) continue;
        float rPx=P.w/pxA, diskK=smoothstep(1.0, 3.0, rPx), vis=1.0-smoothstep(lim-0.8, lim+0.2, L.w+dm-(kind>=5?moonGain:0.0));
        vec3 o=(src-P.xyz*dot(src, P.xyz))/sin(P.w), x; float t;
        if(inSun){
          vec4 dk=bodyDisk(o, P.xyz, N.xyz, L.xyz, kind, rPx, C.rgb, x, t);
          skyC=mix(skyC, skyBase, dk.a*min(rPx, 1.0));
          continue;
        }
        if(vis<=0.0) continue;
        vec3 add=C.rgb*exp(-0.5*d2/(sig*sig))*(1.0-diskK)*dim;
        if(diskK>0.0){
          vec4 dk=bodyDisk(o, P.xyz, N.xyz, L.xyz, kind, rPx, C.rgb, x, t);
          vec3 dc=dk.rgb*dk.a;
          if(dk.a>0.0) for(int k=0;k<${SHADOW_MAX};k++){
            if(float(k)>=shadowCnt) break;
            vec4 M=shadowM[k]; vec2 K=shadowK[k].xy;
            if(abs(M.w-float(b))>0.5) continue;
            vec3 q=x-M.xyz; float along=dot(q, L.xyz);
            if(along>=0.0) continue;
            float perp=length(q-along*L.xyz), spread=-along*K.y, pw=0.7/max(rPx, 1.0);
            dc*=1.0-0.97*(1.0-smoothstep(max(K.x-spread, 0.0)-pw, K.x+spread+pw, perp));
          }
          float vn=dot(P.xyz, N.xyz);
          if(ringed && abs(vn)>1e-4){
            // The rings, in the equator: lit on the Sun's side (seen from the other, only what light
            // gets through), dark in the planet's shadow, and casting their own shadow on it.
            vec3 Lr=L.xyz;
            if(dk.a>0.0){ float ts=-dot(x, N.xyz)/dot(Lr, N.xyz); if(ts>0.0) dc*=1.0-0.85*saturnRing(length(x+ts*Lr), 0.02).y; }
            float tr=-dot(o, N.xyz)/vn; vec3 xr=o+tr*P.xyz;
            vec2 rg=saturnRing(length(xr), 0.8/rPx/max(abs(vn), 0.03));
            if(rg.y>0.0){
              float s=dot(xr, Lr), sh=s<0.0?smoothstep(0.97, 1.03, length(xr-s*Lr)):1.0;
              vec3 rc=vec3(0.86, 0.78, 0.64)*rg.x*sh*(dot(Lr, N.xyz)*vn<0.0?1.0:0.12);
              float ro=rg.y*smoothstep(0.0, 0.03, abs(vn));
              dc=tr<t?rc*ro+dc*(1.0-ro):dc+rc*ro*(1.0-dk.a);
            }
          }
          add+=dc*T*diskK;
        }
        skyC+=add*vis;
      }
    }
    if(metN>0.5 && te>-0.5) skyC=meteorsAt(skyC+metFlash, src, onBody);
    float w=max(fwidth(elevDeg),0.04);
    col=mix(gcol, skyC, smoothstep(-w,w,elevDeg));
  }
  fragColor=vec4(col,1.0);
}`;
const VRFS_BOOT=VRFS.replace('#define SCENERY 1', '#define SCENERY 0');
