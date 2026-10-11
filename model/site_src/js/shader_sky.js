const VRFS_SRC=`#version 300 es
precision highp float;
// The programs (keepLoops below): VRFS_BOOT, without the scenery, compiles in a couple of seconds
// and shows the sky while VRFS_MAIN, with it, compiles; the Sun's photosphere close up is added
// (skyDetail) only once the view zooms in on the Sun (vr_init.js wantDetail). The planets' and
// moons' disks are drawn by a pass of their own (shader_bodies.js), here only their points.
#define SCENERY 1
#define DETAIL_SUN 1
// Random values in red (vN); the first row's green, blue and alpha hold the lunar eclipse's table.
uniform sampler2D noiseTex;
uniform sampler2D sky; uniform sampler2D moonMap; uniform sampler2D starMap; uniform sampler2D starBin; uniform sampler2D starIdx; uniform sampler2D weather; uniform sampler2D hitInfo; uniform sampler2D hitNrm; uniform sampler2D shadowTex; uniform vec2 hitScale, shScale; uniform sampler2D roadCells; uniform vec4 roadBox; uniform vec2 roadDim; uniform vec2 res;
uniform float yaw,pitch,fov,sunAz,sunEl,sunRad,sunOn,nr,na,sunMu,showScn,mtnSnow;
// For a deep zoom (fineEU): the view's azimuth less the Sun's (x, radians) and its altitude less
// the Sun's true altitude (y, degrees), and the same for the Moon (z, w), in double precision.
uniform vec4 fineRel;
uniform float moonAz,moonEl,moonRad,moonOn,moonGlow,latRad,starPx,cloudCov,cloudScale,cloudDrift,cloudOn,clockH,snowCover,waterT,snOn;
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
// The clocks of the fine detail drawn once zoomed in (vr_paint.js): x the granulation's, in
// granule lifetimes (8 minutes) mod 4096; y days mod 2000, for Jupiter's winds.
uniform vec4 fineT;
uniform sampler2D mwTex;
uniform vec4 toneU; // display curve: k, p, cap, cd/m² per unit r (color.js toneT)
uniform float rCd,mwOn,mwScale,mwK,mwDB;
uniform vec3 galX,galY,galZ;
// The aurora, from its own pass (aurora.js) at reduced size, in cd/m² times 1000.
uniform sampler2D aurTex; uniform float aurOn;
// Ice halos (halo.js): x the Sun's and y the Moon's halo luminance over the sky reference per
// unit of haloAt, with their colours as linear RGB of unit luminance.
uniform vec2 haloK; uniform vec3 haloSunLin, haloMoonLin;
// A lunar eclipse (lunar_eclipse.js): the shadow's light along its radius (linear, sRGB-coded, in
// noiseTex's first row), and where its axis meets the Moon's disk (xy, in the disk's radii), the scale from disk radii
// to the table's span (z), and whether the Moon is in the penumbra at all (w).
uniform vec4 eclU;
${HALO_GLSL}
${DSO_GLSL}
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
// is nearer than the Sun and 16 when Saturn has no rings. moonGain is what zooming in adds to the limit for the planets and moons (planets.js moonGain).
// S is where the body is on the view's image plane (xy, worked out in double precision) and the
// refraction's squeeze of altitude there (z), from which a deep zoom places its disk (below).
// M is the direction of its prime meridian's point on the equator (planets.js meridian).
uniform vec4 bodyP[${BODY_MAX}], bodyC[${BODY_MAX}], bodyL[${BODY_MAX}], bodyN[${BODY_MAX}], bodyS[${BODY_MAX}], bodyM[${BODY_MAX}]; uniform float bodyCnt, moonGain;
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
// The sea (vr_paint.js ZONES 'sea'): water everywhere beyond this radius of land round the origin; 0 for none.
uniform float seaR;
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
void roadSeg(vec2 p, vec4 r, float foot, inout float d, inout float line){
  vec2 pa=p-r.xy, ba=r.zw-r.xy;
  if(abs(pa.x-ba.x*0.5)>abs(ba.x)*0.5+4.0 || abs(pa.y-ba.y*0.5)>abs(ba.y)*0.5+4.0) return;
  float len=length(ba), h=clamp(dot(pa, ba)/(len*len), 0.0, 1.0), e=length(pa-ba*h)-3.4;
  if(e<d){ d=e; line=(1.0-smoothstep(0.08, 0.08+foot, abs(e+3.4)))*step(fract(h*len/9.0), 0.4); }
}
vec2 roadAt(vec2 p, float foot){
  float d=1e4, line=0.0;
  for(int i=0;i<int(gridN);i++){
    vec4 g=grid[i];
    if(length(p-g.xy)>g.z+(g.w<1.5?21.0:12.0)) continue;
    vec2 sp=g.w<1.5?vec2(42.0):vec2(48.0, 120.0), s=abs(p-sp*floor(p/sp+0.5));
    d=min(d, min(s.x, s.y)-2.4);
  }
  if(roadN<0.5) return vec2(d, line);
  // The cell's list (roads.js roadCellsFor), unless the footprint is too wide for it or the cell overflowed.
  bool all=roadBox.w<0.5 || foot>64.0; // ROAD_FOOT
  if(!all){
    vec2 c=(p-roadBox.xy)/roadBox.z;
    if(c.x<0.0||c.y<0.0||c.x>=roadDim.x||c.y>=roadDim.y) return vec2(d, line);
    ivec2 ci=ivec2(c);
    vec4 s0=texelFetch(roadCells, ivec2(ci.x*2, ci.y), 0)*255.0, s1=texelFetch(roadCells, ivec2(ci.x*2+1, ci.y), 0)*255.0;
    if(s0.x>254.5) all=true;
    else {
      float sl[8]=float[8](s0.x, s0.y, s0.z, s0.w, s1.x, s1.y, s1.z, s1.w);
      for(int k=0;k<8;k++){ int i=int(sl[k]+0.5)-1; if(i<0) break; roadSeg(p, road[i], foot, d, line); }
    }
  }
  if(all) for(int i=0;i<int(roadN);i++) roadSeg(p, road[i], foot, d, line);
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
// centre in the 545 nm image.
const float SUN_DISP[20]=float[20](${SUN_DISP.join(', ')});
const float SUN_APPS[10]=float[10](${SUN_APP.map(v=>v.toFixed(1)).join(', ')});
// Zoomed in to arcseconds, the angle from a disk's centre can't come from the dot product of two
// unit vectors: their float steps are a pixel or more, and acos near a small angle magnifies them
// tens of times, so the limb comes out jagged. fineEU gives the offset exactly instead, in the
// target's tangent plane along its azimuth (x) and altitude (y) axes (azAxis, altAxis), for a
// ray dAz radians round in azimuth from it at true altitude t (degrees); h is the target's true
// altitude and dt is t-h, passed apart so it keeps its precision.
vec2 fineEU(float dAz, float t, float h, float dt){
  float tr=t*0.01745329252, s=sin(dAz*0.5);
  return vec2(sin(dAz)*cos(tr), sin(dt*0.01745329252)+sin(h*0.01745329252)*cos(tr)*2.0*s*s);
}
// asin by its series, for a fine offset: GPUs' own asin is a polynomial fit good to only about
// 1e-4 radians, a hundred pixels at the deepest zoom. To x^7 it is good to 4e-8 at 0.22 radians,
// the corona's reach; a disk's edge is under 0.02.
float asinS(float x){ float x2=x*x; return x*(1.0+x2*(1.0/6.0+x2*(3.0/40.0+x2*(5.0/112.0)))); }
vec3 azAxis(float az){ float a=az*0.01745329252; return vec3(cos(a), -sin(a), 0.0); }
vec3 altAxis(float az, float h){ float a=az*0.01745329252, hr=h*0.01745329252; return vec3(-sin(a)*sin(hr), -cos(a)*sin(hr), cos(hr)); }
// With fn, the ray's offsets from the Sun come from fineEU: dAz in azimuth (radians), dApp its
// apparent altitude less the view's (degrees), dH the view's altitude less the Sun's.
vec4 sunDiskAt(float comp, float app, vec3 sd, float rd, out vec3 off, bool fn, float dAz, float dApp, float dH){
  float wob=sunMir.w*(0.6*sin(comp*1432.4+waterT*2.1)+0.4*sin(comp*3610.0-waterT*3.3))*exp(-max(app, 0.0)/rd), ap=app+wob;
  float extra=0.0, apH=dH+dApp+wob; // apH: ap less the Sun's true altitude
  if(sunMir.x>0.0 && ap<sunMir.x){ apH=sunMir.x-sunEl+(sunMir.x-ap)*sunMir.y; ap=sunMir.x+(sunMir.x-ap)*sunMir.y; extra=sunMir.z; }
  vec3 eS=azAxis(sunAz), uS=altAxis(sunAz, sunEl);
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
    float bb=(1.0+dispX*(SUN_DISP[b]-1.0))*bend, te=(ap-bb)*0.01745329252, ct=cos(te), d;
    vec3 rv=vec3(sin(comp)*ct, cos(comp)*ct, sin(te)), ov;
    if(fn){ vec2 eu=fineEU(dAz, ap-bb, sunEl, apH-bb); ov=eS*eu.x+uS*eu.y; d=asinS(length(eu)); }
    else{ ov=rv-sd*dot(rv, sd); d=acos(clamp(dot(rv, sd), -1.0, 1.0)); }
    // Each image's edge is spread over the gap to the next band's (or a pixel), so the rim is a
    // gradient rather than ten steps.
    float gap=max(dispX*abs(SUN_DISP[b]-SUN_DISP[min(b+1, 19)])*bend*0.01745329252, px);
    float cov=clamp(0.5+(sunRad-d)/gap, 0.0, 1.0);
    // The surface is placed by the 545 nm image alone: taking the nearest image's offset would
    // hold it still across the rows where the images' centres lie, smearing the granulation there.
    if(b==8) off=ov;
    if(cov<=0.0) continue;
    int k0=i*20+b, k1=k0+20;
    float t=mix(sunTau[k0/4][k0%4], sunTau[k1/4][k1%4], f);
    P+=sunW[b]*exp(-t-(t+sunOff)*extra)*cov;
    r=min(r, d/sunRad);
  }
  return vec4(P, r);
}
// The photosphere at q (disk radii, x toward celestial east, y north) as multipliers of linear
// R, G, B, pxR disk radii to a pixel (sunspots.js sunSurfaceAt): the map's spots raised to the
// display's gamma, as a white-light photograph is shown, plus faculae, brightest near mu 1/4.
// Once the disk is large enough, the network of the supergranulation (cells about 30 Mm across,
// bright at their edges) shows toward the limb too.
vec3 h33(vec3 p){ p=fract(p*vec3(0.1031, 0.1030, 0.0973)); p+=dot(p, p.yxz+33.33); return fract((p.xxy+p.yxx)*p.zyx); }
// The photosphere finer than the map (about 1,070 km a texel), drawn once a texel spans a few
// pixels, after high-resolution images of the Sun (the Swedish 1-m Solar Telescope, DKIST):
// granulation, convection cells about 1,300 km across, bright and rising inside, dark and sinking
// in narrow lanes, living about eight minutes, the larger ones splitting from a dark knot at their
// middle (exploding granules), with a finer level of fragments inside them; magnetic bright
// points strung along the lanes in faculae; the penumbra's filaments, a few hundred km wide,
// running from the umbra out across it; umbral dots in the umbra; and every boundary of the map's
// spots made ragged by warping where it is read, a fractal edge in place of the texels' blur.
// Voronoi distances to the nearest two of a jittered lattice's points round p, and the nearest
// cell; the points drift with phase t, so the cells change shape as they live.
vec2 sunVor(vec3 p, float t, out vec3 cell){
  vec3 ip=floor(p); float f1=8.0, f2=8.0; cell=ip;
  for(int k=0;k<27;k++){
    vec3 g=ip+vec3(float(k%3)-1.0, float((k/3)%3)-1.0, float(k/9)-1.0), r=h33(g);
    vec3 d=g+0.5+0.38*sin(6.2831853*(r+t*vec3(0.05, 0.07, 0.06)))-p;
    float e=dot(d, d);
    if(e<f1){ f2=f1; f1=e; cell=g; } else if(e<f2) f2=e;
  }
  return vec2(sqrt(f1), sqrt(f2));
}
// Granulation's intensity (a multiple of the mean) at P (unit vector, solar frame) and its lanes
// (y, 1 in a lane), where a granule spans gpx pixels and Z is the cosine of the view angle.
vec2 granulation(vec3 P, float gpx, float Z){
  float T=fineT.x; vec3 cell, p=P*535.0;
  // A smooth warp bends the cells' straight Voronoi edges into the rounded shapes of real granules.
  p+=0.2*sin(p.yzx*1.3+p.zxy*0.7+T*0.3);
  vec2 f=sunVor(p, T, cell);
  vec3 r=h33(cell+17.0);
  float life=fract(T*0.6+r.x), e=f.y-f.x;
  float v=(0.72+0.34*sin(3.14159*life))*(0.55+0.45*smoothstep(0.0, 0.45, e));
  float lane=1.0-smoothstep(0.02, 0.11, e);
  v*=1.0-0.65*lane;
  // A large granule late in its life splits from a dark knot at its middle.
  if(r.y>0.78){ float ex=smoothstep(0.55, 1.0, life); v*=1.0-0.55*ex*(1.0-smoothstep(0.0, 0.32*ex+0.01, f.x)); }
  float I=1.0+2.6*(v-0.70)*0.14*(0.35+0.65*Z);
  // Fragments, a third the size, within the granules.
  float k2=smoothstep(2.0, 6.0, gpx/3.0);
  if(k2>0.0){ vec3 c2; vec2 g2=sunVor(P*1605.0+31.7, T*1.7, c2); I*=1.0+0.045*k2*(smoothstep(0.0, 0.3, g2.y-g2.x)-0.6); }
  float k1=smoothstep(2.0, 5.0, gpx);
  return vec2(mix(1.0, I, k1), lane*k1);
}
// The penumbra's filaments at map texel tc, running along dir (the way out from the umbra, in
// texels with longitude foreshortened by cl), as a multiple of the penumbra's intensity: oriented
// noise in each of the four nearest texels' own frames, blended, so the stripes follow dir as it
// turns round the spot without shearing.
float penFilaments(vec2 tc, vec2 dir, float cl, float ppt){
  vec2 base=floor(tc-0.5)+0.5, w=tc-base, pr=vec2(-dir.y, dir.x);
  float acc=0.0, ww=0.0;
  float o1=smoothstep(1.5, 6.0, ppt), o2=smoothstep(3.0, 12.0, ppt), o3=smoothstep(6.0, 24.0, ppt);
  for(int k=0;k<4;k++){
    vec2 c=base+vec2(float(k&1), float(k>>1)), rel=(tc-c)*vec2(cl, 1.0);
    float wk=((k&1)==1?w.x:1.0-w.x)*((k>>1)==1?w.y:1.0-w.y);
    float s=dot(rel, pr), a=dot(rel, dir), hs=h12(mod(c, vec2(4096.0, 2048.0)))*97.0;
    // Bright filaments a couple of hundred km wide (ridged noise across) and a few thousand long.
    float r1=1.0-abs(2.0*vN(vec2(s*4.0+hs, a*0.22+hs*1.3))-1.0);
    float f=o1*0.7*(r1*r1*r1-0.3)+o2*0.25*(vN(vec2(s*9.1-hs, a*0.5+hs))-0.5)+o3*0.15*(vN(vec2(s*19.0+hs*0.7, a*1.0-hs))-0.5);
    acc+=wk*f; ww+=wk*wk;
  }
  return 1.0+1.6*acc/sqrt(max(ww, 0.25));
}
vec3 sunSurface(vec2 q, float pxR){
  float cP=cos(sunOri.x), sP=sin(sunOri.x), cB=cos(sunOri.y), sB=sin(sunOri.y);
  float X=q.x*cP-q.y*sP, Y=q.x*sP+q.y*cP, Z=sqrt(max(0.0, 1.0-X*X-Y*Y));
  float lat=asin(clamp(Y*cB+Z*sB, -1.0, 1.0)), cmd=atan(-X, Z*cB-Y*sB);
  // Differential rotation against the equator (sunspots.js diffRot), in turns a day.
  float s2=sin(lat)*sin(lat), dr=(-2.39*s2-1.78*s2*s2)/360.0, lon0=cmd/6.28318530718-sunOri.z;
  float lon=fract(lon0-dr*sunDrift.x), v=lat/3.14159265+0.5, pxT=pxR/sqrt(max(Z, 0.04))/6.28318530718;
  float Wt=float(textureSize(sunMap, 0).x), ppt=1.0/max(Wt*pxT, 1e-6), cl=max(cos(lat), 0.02);
  // Zoomed in, the map is read where a fractal warp of up to about a texel moves it, so the
  // edges of spots and plages come out ragged on every scale down to the pixel.
  // In a penumbra only the warp's part along the filaments (dir: outward from the umbra, up the
  // gradient of a blurred copy of the map) is kept, so the edges fray but the filaments stay straight.
  vec2 wo=vec2(0.0), uv0=vec2(lon, v), dir=vec2(0.0);
  float kw=DETAIL_SUN==1?smoothstep(1.5, 6.0, ppt):0.0, gl=0.0;
  if(kw>0.0){
    float d=2.0/Wt;
    float gx=dot(textureLod(sunMap, uv0+vec2(d/cl, 0.0), 2.0).rgb-textureLod(sunMap, uv0-vec2(d/cl, 0.0), 2.0).rgb, vec3(0.3333));
    float gy=dot(textureLod(sunMap, uv0+vec2(0.0, d*2.0), 2.0).rgb-textureLod(sunMap, uv0-vec2(0.0, d*2.0), 2.0).rgb, vec3(0.3333));
    dir=vec2(gx, gy); gl=length(dir); dir=gl>1e-5?dir/gl:vec2(0.0);
    float Lb=dot(textureLod(sunMap, uv0, 2.0).rgb, vec3(0.2126, 0.7152, 0.0722)), penB=smoothstep(0.45, 0.6, Lb)*(1.0-smoothstep(0.88, 0.97, Lb));
    vec2 tc=vec2(lon0*Wt, v*Wt*0.5), wv=vec2(0.0); float amp=0.55, fr=1.3;
    for(int o=0;o<5;o++){
      wv+=amp*smoothstep(1.0, 3.0, ppt/fr)*(vec2(vN(tc*fr+vec2(13.1, 7.7)), vN(tc*fr+vec2(3.7, 29.3)))-0.5);
      amp*=0.5; fr*=2.17;
    }
    wv=mix(wv, dir*dot(wv, dir), penB*smoothstep(1e-4, 2e-3, gl));
    wo=kw*wv/vec2(Wt*cl, Wt*0.5);
  }
  vec2 uv=uv0+wo;
  vec4 t=textureLod(sunMap, uv, log2(max(1.0, Wt*pxT)));
  if(sunDrift.z>0.0) t=mix(t, textureLod(sunMap2, vec2(fract(lon0-dr*sunDrift.y), v)+wo, log2(max(1.0, float(textureSize(sunMap2, 0).x)*pxT))), sunDrift.z);
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
  vec3 I=pow(t.rgb, vec3(2.2));
  // The map blurs each spot's edges across a texel; zoomed in, the ramps from umbra to penumbra and
  // from penumbra to photosphere are squeezed into steps (frayed by the warp above), as sharp as
  // they are on the Sun.
  if(kw>0.0){
    float L=dot(t.rgb, vec3(0.2126, 0.7152, 0.0722)), Ls=L;
    if(L>0.40 && L<0.62) Ls=0.40+0.22/(1.0+exp(-(L-0.51)/0.012));
    else if(L>0.84 && L<0.985) Ls=0.84+0.145/(1.0+exp(-(L-0.93)/0.007));
    I*=pow(mix(1.0, Ls/max(L, 1e-3), kw), 2.2);
  }
  // A granule is 0.0019 of the radius across, foreshortened toward the limb.
  float gpx=0.0019*sqrt(max(Z, 0.04))/pxR;
  if(DETAIL_SUN==1 && gpx>2.0){
    float Lr=dot(t.rgb, vec3(0.2126, 0.7152, 0.0722));
    float quiet=smoothstep(0.90, 0.985, Lr), umb=1.0-smoothstep(0.42, 0.6, Lr), pen=(1.0-quiet)*(1.0-umb);
    float la=lon0*6.28318530718;
    vec3 Ps=vec3(cl*cos(la), cl*sin(la), sin(lat));
    float m=1.0;
    if(quiet>0.0){
      vec2 g=granulation(Ps, gpx, Z);
      // Magnetic bright points in faculae: dots a couple of hundred km across, in the lanes, faint
      // in white light near the disk's middle.
      float bp=0.0, kf=smoothstep(0.05, 0.4, fac)*g.y;
      if(kf>0.01 && gpx>12.0){ vec3 cb; vec2 fb=sunVor(Ps*3500.0+11.0, fineT.x*2.0, cb);
        bp=kf*step(0.72, h33(cb+3.0).x)*exp(-fb.x*fb.x/0.05)*smoothstep(12.0, 30.0, gpx); }
      m=mix(m, g.x*(1.0+0.35*bp), quiet);
    }
    if(pen>0.0 && ppt>1.5 && gl>1e-4) m=mix(m, penFilaments(uv0*vec2(Wt, Wt*0.5), dir, cl, ppt), pen*smoothstep(1e-4, 4e-3, gl));
    if(umb>0.0){
      // Umbral dots, a few hundred km across and about a thousand K hotter than the umbra round them.
      float dpx=0.00043/pxR;
      if(dpx>1.5){ vec3 cu; vec2 f=sunVor(Ps*2300.0+71.3, fineT.x*0.4, cu); float br=h33(cu+5.0).x;
        m=mix(m, 1.0+2.2*step(0.45, br)*br*exp(-f.x*f.x/0.03), umb*smoothstep(1.5, 4.0, dpx)); }
    }
    I*=m;
  }
  return I+fac*c*vec3(0.10, 0.13, 0.18);
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
// The same for a nebula or galaxy, at least DSO_STEP of sRGB over the sky per tenfold of light
// (color.js toneDso).
vec3 overSkyDso(vec3 skyC, float rBg, float r, vec3 L){
  float rNew=rBg+r, tBg=toneT(rBg), tNew=toneT(rNew);
  if(rBg>0.0) tNew=max(tNew, s2lin(min(lin2s(tBg)+${DSO_STEP.toFixed(5)}*log(rNew/rBg)*0.4342945, 1.0)));
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
  // The width of the blend from ground to sky at the horizon, taken here where every pixel runs
  // it, so the derivative is defined; below it the sky's work is skipped (its colour is unused).
  float hw=max(fwidth(elevDeg),0.04);
  float sunA=sunAz*0.01745329252;
  vec3 sd=azElDir(sunAz, sunEl);
  ivec2 hp=ivec2(gl_FragCoord.xy*hitScale);
  vec4 hit=texelFetch(hitInfo, hp, 0);
  vec4 hn=texelFetch(hitNrm, hp, 0);
  float tBest=1e8, kBest=0.0, hBest=1.0, tLand=-1.0, shBest=texelFetch(shadowTex, ivec2(gl_FragCoord.xy*shScale), 0).r;
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
      if(seaR>0.0 && pk<-0.5){
        // The sea: its shore wanders as a pool's does, and the land darkens, wet, toward it.
        float d=length(gp)/seaR;
        if(d<3.0) d+=(vN(gp/(seaR*0.3)+1.7)-0.5)*0.45+(vN(gp/(seaR*0.08)+5.0)-0.5)*0.1;
        if(d>1.0){ pk=0.0; edge=(d-1.0)*seaR; }
        else if(pk>-1.5){ shore=smoothstep(1.0-8.0/seaR, 1.0, d); if(shore>0.0) pk=-10.0; }
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
  }else if(elevDeg<=-hw){
    col=gcol;
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
    // Zoomed in (fineEU), the pixel's place from the image plane: its azimuth less the view's
    // (dAzPx, radians) and its apparent altitude less the view's (dAppPx, degrees), both small
    // and so known to a float's full relative precision; appF is its apparent altitude.
    bool fine=fy<0.02;
    vec2 fuv=((gl_FragCoord.xy/res)*2.0-1.0)*vec2(fy*res.x/max(res.y, 1.0), fy);
    float fcp=cos(pitch), fsp=sin(pitch), fh=fcp-fuv.y*fsp, fw=fuv.x*fuv.x/(fh*fh);
    float dAzPx=atan(fuv.x, fh), dAppPx=atan(fuv.y-fsp*fh*fw/(sqrt(1.0+fw)+1.0), sqrt(fh*fh+fuv.x*fuv.x)*fcp+(fsp+fuv.y*fcp)*fsp)*57.2957795;
    float appF=fine?pitch*57.2957795+dAppPx:elevDeg, refF=refK*bennett(appF);
    bool inSun=false; float sunR=2.0; vec3 sunP=vec3(0.0), sunOffV=vec3(0.0);
    if(sunOn>0.5&&te>-1.5&&dot(src,sd)>cos(sunRad*2.5+0.03)){
      vec4 sk=sunDiskAt(comp, appF, sd, sunRad*57.2957795, sunOffV, fine, fineRel.x+dAzPx, dAppPx, fineRel.y);
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
      float cm=dot(src,md), am=acos(clamp(cm, -1.0, 1.0));
      vec3 mo=src; bool near=cm>cos(moonRad*1.01);
      if(fine){ vec2 eu=fineEU(fineRel.z+dAzPx, te, moonEl, fineRel.w+dAppPx-refF); mo=azAxis(moonAz)*eu.x+altAxis(moonAz, moonEl)*eu.y; am=asinS(length(eu)); near=am<moonRad*1.01; }
      bool inMoon=near&&am<moonRad*(1.0+limbH(atan(dot(mo,east), dot(mo,north))));
      if(inMoon){
        onBody=true; onMoon=true;
        {
        // In front of the Sun the Moon is drawn like the rest of its disk: the sky in front of it
        // plus its own dim light.
        skyC=skyBase;
        float s=sin(moonRad);
        float x=dot(mo,east)/s, y=dot(mo,north)/s, rr=sqrt(x*x+y*y);
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
          if(t<1.0) moonC=lin2s3(s2lin3(moonC)*s2lin3(textureLod(noiseTex, vec2((t*${LUN_LUT_N-1}.0+0.5)/128.0, 0.5/128.0), 0.0).gba));
        }
        // The molten Moon (moon_surface.js moltenFace): the face's red excess is the lava's own
        // light, on the night side as on the day, and the Earth's shadow does not dim it.
        if(moonGlow>0.0) moonC+=moonGlow*1.3*alb*smoothstep(0.0, 0.7, alb.r-alb.b)*T;
        float skyY=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
        skyC+=moonC*(1.0-smoothstep(0.0, 1.15, skyY));
        }
      } else if(moonGlow>0.0){
        // Its light scattered in the air about it: a red aureole, close and bright, then wide.
        float d=am/moonRad-1.0;
        if(d<6.0){
          float mu=max(sin(max(te,0.0)*0.01745329252), 0.04), skyY=dot(skyC, vec3(0.2126, 0.7152, 0.0722));
          skyC+=moonGlow*vec3(0.95, 0.30, 0.07)*exp(-vec3(0.12, 0.22, 0.48)/mu)*(0.30*exp(-d*4.0)+0.07*exp(-d*0.9))*(1.0-smoothstep(0.0, 1.15, skyY));
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
    if(dsoCnt>0.5 && !onBody && te>-1.0){
      // The nebulae and galaxies, behind the air like the Milky Way.
      vec3 img; float wImg, ext=extinctionAt(te, mwK);
      vec3 Ld=dsoAt(src, 2.0*fy/res.y, img, wImg)*ext, sky0=skyC;
      float rD=dot(Ld, vec3(0.2126, 0.7152, 0.0722));
      if(rD>rBg*0.003) skyC=overSkyDso(skyC, rBg, rD, Ld);
      // Zoomed in, the picture over the sky, dimmed by the air (dso.js dsoView).
      if(wImg>0.0) skyC=mix(skyC, lin2s3(clamp(s2lin3(sky0)+s2lin3(img)*ext, 0.0, 1.0)), wImg);
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
      vec3 co=src; float a=acos(clamp(dot(src, sd), -1.0, 1.0))/sunRad;
      if(fine){ vec2 eu=fineEU(fineRel.x+dAzPx, te, sunEl, fineRel.y+dAppPx-refF); co=azAxis(sunAz)*eu.x+altAxis(sunAz, sunEl)*eu.y; a=asinS(length(eu))/sunRad; }
      float pa=atan(dot(co, ee), dot(co, nn));
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
          // Two texels a star (stars.js starBinsFor): direction and size, then colour and magnitude.
          int id=(start+k)*2;
          ivec2 at=ivec2(id- (id/1024)*1024, id/1024);
          vec4 sp=texelFetch(starIdx, at, 0);
          if(sp.w<=0.0) continue;
          // No narrower than about half a screen pixel, so a faint star does not shimmer as the view turns.
          float sig=max(sp.w*starPx, sigMin);
          // The squared chord, from the difference: 1-dot(src, star) loses the float's precision
          // once zoomed in, where a pixel is a few 1e-4 rad and 1-cos only a few 1e-8.
          vec3 dd=src-sp.xyz; float d2=dot(dd, dd);
          if(d2>16.0*sig*sig) continue;
          float wgt=exp(-0.5*d2/(sig*sig));
          vec4 sc=texelFetch(starIdx, at+ivec2(1, 0), 0);
          skyC+=sc.rgb*wgt*(1.0-smoothstep(lim-0.8, lim+0.2, sc.a+dm))*dim;
        }
      }
    }
    if(bodyCnt>0.5 && te>0.0 && !onMoon){
      // The planets and moons: a point like a star's while the drawn disk is under a pixel or two,
      // fading as the disk grows; the disk is drawn by the bodies' own pass (shader_bodies.js),
      // over the Sun too. Each shows as a star does, by its magnitude through the air against the
      // naked-eye limit here.
      float lim=nakedEyeLimit(rBg*rCd), pxA=2.0*fy/res.y, sigMin=1.2*fy/res.y;
      float dm=-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25), dim=pow(10.0, -0.2*dm);
      // Zoomed in to arcseconds a pixel is only a few float steps of a unit vector, and src, built
      // through atan, asin and the refraction, is off by several: a moon's disk would come out in
      // blocks. There the offset from a body is taken on the image plane instead, from the pixel's
      // place less the body's, both small numbers known to a float's full relative precision, and
      // turned to a direction by the view's right and up axes, up squeezed by the refraction.
      vec3 axR=vec3(cos(yaw), -sin(yaw), 0.0), axU=vec3(-sin(yaw)*fsp, -cos(yaw)*fsp, fcp);
      for(int b=0;b<${BODY_MAX};b++){
        if(float(b)>=bodyCnt) break;
        vec4 P=bodyP[b], C=bodyC[b], L=bodyL[b], N=bodyN[b];
        int kind=int(mod(N.w, 8.0)+0.5);
        bool ringed=kind==4 && N.w<15.5;
        if(inSun && mod(N.w, 16.0)<7.5) continue;
        float sig=max(C.w*starPx, sigMin), reach=max(P.w*(ringed?2.3:1.0)+2.0*pxA, 4.0*sig);
        vec3 dd=src-P.xyz;
        if(fine){ vec4 S=bodyS[b]; dd=axR*(fuv.x-S.x)+axU*((fuv.y-S.y)*S.z); }
        float d2=dot(dd, dd);
        if(d2>reach*reach) continue;
        float rPx=P.w/pxA, diskK=smoothstep(1.0, 3.0, rPx), vis=1.0-smoothstep(lim-0.8, lim+0.2, L.w+dm-moonGain);
        if(vis<=0.0 || diskK>=1.0) continue;
        skyC+=C.rgb*exp(-0.5*d2/(sig*sig))*(1.0-diskK)*dim*vis;
      }
    }
    if(metN>0.5 && te>-0.5) skyC=meteorsAt(skyC+metFlash, src, onBody);
    col=mix(gcol, skyC, smoothstep(-hw,hw,elevDeg));
  }
#if SCENERY
  if(seaR>0.0 && showScn>0.5){
    // Steam off the hot sea (about 200 °C under the 30-bar air): a layer some 50 m deep in wisps
    // drifting with the wind, sampled at the middle of the ray's run through it. Over a long run
    // the wisps average out, so the far sea and the islands' feet fade into a pale band.
    float H=50.0, tEnd=min(kBest>0.5?tBest:(rd.z<0.0?-ro.z/rd.z:30000.0), 30000.0), t0=0.0, t1=tEnd;
    if(abs(rd.z)>1e-5){ float a=(H-ro.z)/rd.z, b=-ro.z/rd.z; t0=max(t0, min(a, b)); t1=min(t1, max(a, b)); }
    else if(ro.z>H) t1=t0;
    float L=max(t1-t0, 0.0);
    if(L>0.0){
      vec2 mp=(ro+rd*(0.5*(t0+t1))).xy, dr=vec2(0.6, 0.25)*waterT;
      float w=vN((mp-dr)/120.0)*0.6+vN((mp-dr*1.7)/38.0+3.1)*0.4;
      float dens=mix(0.0022*smoothstep(0.42, 0.75, w), 0.00016, smoothstep(600.0, 5000.0, L));
      float a=(1.0-exp(-dens*L))*smoothstep(0.9, 1.3, length(mp)/seaR)*0.85;
      col=mix(col, skyLook(normalize(vec3(rd.xy, 0.05)))*1.08, a);
    }
  }
#endif
  fragColor=vec4(col,1.0);
}`;
// ANGLE on Windows compiles through Direct3D, whose compiler unrolls a loop of constant count,
// copying its body that many times, and inlines every call: the sky shader took over 15 seconds.
// Each loop of four or more passes counts instead to its count plus loopZero, a uniform left at 0,
// so it stays one loop.
function keepLoops(src){
  return src.replace(/for\(int (\w+)=0;\1<([0-9]+);\1\+\+\)/g, (m, v, n)=>+n>=4?`for(int ${v}=0;${v}<${n}+loopZero;${v}++)`:m)
    .replace('precision highp float;', 'precision highp float;\nuniform int loopZero;');
}
const VRFS=keepLoops(VRFS_SRC);
// The program with the Sun's photosphere close up or without.
function skyDetail(sun){ return VRFS.replace('#define DETAIL_SUN 1', '#define DETAIL_SUN '+(sun?1:0)); }
const VRFS_MAIN=skyDetail(false);
const VRFS_BOOT=VRFS_MAIN.replace('#define SCENERY 1', '#define SCENERY 0');
