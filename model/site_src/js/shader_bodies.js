// The planets' and moons' disks, in a pass of their own after the sky's (vr_paint.js drawBodies):
// one draw per body, clipped to the box round its disk (and Saturn's rings), added to the sky
// already drawn, or over the Sun, for a planet in front of it, the sky's own color laid over the
// Sun. The sky pass draws them only as points. Kept apart so that the close-up detail of Jupiter's
// or Saturn's clouds or of the spacecraft maps is a small program of its own, compiled only once
// the view zooms in on one of them (vr_init.js wantDetail): in the sky's program each cost a
// recompile of all of it, several seconds.
const BODY_GLSL=`
// A planet's cloud tops or ground at planetographic latitude lat (degrees): Mercury's gray rock,
// Venus's clouds, Mars's ocher with its darker south and polar caps, Jupiter's belts and zones,
// Saturn's fainter bands, Uranus's pale cyan (paler toward the poles), Neptune's paler blue with a
// darker equator and its dark band near 60°S, or Oceanus's own (bE.w 1); a moon in its own tint.
float bandOf(float lat, float a, float b, float w){ return smoothstep(a-w, a+w, lat)-smoothstep(b-w, b+w, lat); }
// Oceanus's bands (planets.js ocBelt, ocColor), edges w degrees wide: an ice giant's, laid out as
// Neptune's and Uranus's circulation is, air rising at mid-latitudes, where the clouds are thick and
// bright, and sinking at the equator and the poles, where they are thin (Fletcher et al. 2020): a
// broad darker equatorial belt, bright zones from about 18° to 45°, narrower belts near 50°, darker
// polar caps. Drawn first in Neptune's colors; giantEra (bE) then makes them its own warmer deck's.
float ocBelt(float lat, float w){
  return 0.7*bandOf(lat, -15.0, 15.0, w*2.0)+0.25*(bandOf(lat, 28.0, 32.0, w)+bandOf(lat, -32.0, -28.0, w))+0.55*(bandOf(lat, 46.0, 56.0, w)+bandOf(lat, -56.0, -46.0, w));
}
vec3 ocColor(float lat, float belt){
  return mix(mix(vec3(0.70, 0.84, 0.95), vec3(0.48, 0.62, 0.84), clamp(belt, 0.0, 1.0)), vec3(0.52, 0.66, 0.86), 0.7*smoothstep(60.0, 75.0, abs(lat)));
}
vec3 bodyAlbedo(int kind, float lat, vec3 tint){
  if(kind==0) return vec3(0.66, 0.62, 0.57);
  if(kind==1) return vec3(1.0, 0.96, 0.84);
  if(kind==2) return mix(mix(vec3(0.86, 0.52, 0.33), vec3(0.66, 0.42, 0.30), 0.6*bandOf(lat, -45.0, -5.0, 6.0)), vec3(0.95, 0.95, 0.97), smoothstep(68.0, 74.0, abs(lat)));
  if(kind==3){
    float belt=bandOf(lat, 7.0, 18.0, 1.5)+bandOf(lat, -21.0, -8.0, 1.5)+0.55*(bandOf(lat, 24.0, 31.0, 1.5)+bandOf(lat, -33.0, -26.0, 1.5))+0.3*(bandOf(lat, 36.0, 42.0, 2.0)+bandOf(lat, -44.0, -38.0, 2.0));
    return mix(mix(vec3(0.95, 0.91, 0.82), vec3(0.70, 0.53, 0.40), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.60, 0.58), smoothstep(45.0, 70.0, abs(lat)));
  }
  if(kind==5) return mix(vec3(0.58, 0.84, 0.92), vec3(0.70, 0.88, 0.92), smoothstep(50.0, 80.0, abs(lat)));
  if(kind==6 && bE.w>0.5) return ocColor(lat, ocBelt(lat, 4.0));
  if(kind==6) return mix(mix(vec3(0.56, 0.74, 0.95), vec3(0.45, 0.60, 0.88), 0.3*bandOf(lat, -10.0, 10.0, 4.0)+0.5*bandOf(lat, -64.0, -57.0, 2.0)), vec3(0.62, 0.80, 0.96), 0.5*smoothstep(65.0, 85.0, abs(lat)));
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
// Saturn's color with the season (bodyDisk, planets.js satSeason), sl the sine of the Sun's latitude
// on it: the winter hemisphere, out of the Sun, clears of the haze that yellows the summer one and
// shows bluish, as Cassini saw the north in 2004-2009 (it turned golden again by about 2016). The
// change lags the season by several years; drawn without the lag.
vec3 satSeason(vec3 c, float lat, float sl){
  float w=clamp(-sl*sign(lat)/0.45, 0.0, 1.0)*smoothstep(20.0, 45.0, abs(lat));
  return mix(c, vec3(0.62, 0.74, 0.86), 0.5*w);
}
// A giant's clouds when it was young and warmer (planets.js giantEra, in bE): as it cooled, the
// clouds that top it now formed only later (Fortney et al. 2011). bE.x, its top ice cloud not yet
// formed: Jupiter's and Saturn's ammonia, whose cloud tops lay under NH4SH haze, paler and less
// colored; Neptune's and Oceanus's methane, leaving its deck of H2S higher, as Uranus's top deck
// is H2S now (Irwin et al. 2018), and as pale a cyan. bE.y, warmer still, a high deck of NH4SH and water clouds (Sudarsky et al. 2000's
// class II): bright and near white, a gas giant's a little cream, an ice giant's pale cyan through
// the methane above it, its bands in brightness more than hue. bE.z, too warm for water to condense
// high (their class III): clear, a deep azure of Rayleigh scattering and methane absorption, dark.
vec3 eraAlb(int kind, vec3 c){
  if(kind<3 || kind>6 || kind==5 || bE.x+bE.y+bE.z<=0.0) return c;
  float l=dot(c, vec3(0.30, 0.55, 0.15));
  bool ice=kind==6;
  c=mix(c, ice?l*vec3(0.75, 1.08, 1.19):l*vec3(1.05, 1.01, 0.92)+0.06, ice?0.7*bE.x:0.6*bE.x);
  c=mix(c, (ice?vec3(0.76, 0.91, 1.0):vec3(0.96, 0.95, 0.92))*(0.35+0.8*l), 0.85*bE.y);
  return mix(c, vec3(0.13, 0.21, 0.42)*(0.8+0.3*l), bE.z);
}
#if DETAIL_JUP || DETAIL_SAT || DETAIL_NEP
// Jupiter close up (bodyDisk, once its disk is a few dozen pixels across), after Voyager, Cassini,
// Juno and Hubble images: the clouds a tracer stirred by eddies and drawn out by the jets, so the
// belts and zones and the finer banding within them are marbled into curls and filaments, rougher
// in the belts than in the zones; the belts' edges rolled up by the Kelvin-Helmholtz instability
// of the shear between neighboring jets into chains of curling billows; the Red Spot a vortex in
// the same flow, winding the clouds round it into its collar, with its turbulent wake; dark
// festoons trailing from the North Equatorial Belt's southern edge into the Equatorial Zone, with
// hot spots at their heads; barges; the chain of white ovals in the South South Temperate Belt;
// and the bands wandering, darkening and stirring along their length.
// Saturn the same flow with its own winds and bands (one program has one of them, DETAIL_JUP or
// DETAIL_SAT), after Cassini's images: calmer, its colors muted by the haze above the clouds, finer
// banding toward the poles; the hexagon about the north pole; the polar vortices; the ribbon wave
// on the jet at 47°N; the storms of Storm Alley at 40°S.
// The zonal wind (m/s, east positive) at planetographic latitude lat as a sum of Gaussian jets;
// clWindS is the same smoothed over s degrees, each Gaussian widened and lowered to keep its area.
float jG(float x, float c, float w, float s){ float W=sqrt(w*w+s*s), d=(x-c)/W; return w/W*exp(-d*d); }
#if DETAIL_JUP
// Jupiter's: the jets of the Cassini profile (Porco et al. 2003, Science 299, 1541).
float clWindS(float lat, float s){
  return 140.0*jG(lat, 23.7, 1.6, s)-30.0*jG(lat, 18.0, 2.5, s)+105.0*jG(lat, 7.0, 3.5, s)+60.0*jG(lat, 0.0, 4.0, s)+105.0*jG(lat, -7.0, 3.5, s)
        -55.0*jG(lat, -17.5, 2.5, s)+40.0*jG(lat, -26.5, 2.0, s)-25.0*jG(lat, -30.0, 2.0, s)+30.0*jG(lat, 31.0, 2.0, s)-20.0*jG(lat, 35.0, 2.0, s)+25.0*jG(lat, -35.0, 2.0, s);
}
// A meter a second in degrees of longitude a day on the equator (System II).
const float CL_MS=0.06924;
// Bands and zones (bodyAlbedo's), with edges w degrees wide.
float clBelt(float lat, float w){
  return bandOf(lat, 7.0, 18.0, w)+bandOf(lat, -21.0, -8.0, w)+0.55*(bandOf(lat, 24.0, 31.0, w)+bandOf(lat, -33.0, -26.0, w))+0.3*(bandOf(lat, 36.0, 42.0, w*1.3)+bandOf(lat, -44.0, -38.0, w*1.3));
}
vec3 clColor(float lat, float belt){
  return mix(mix(vec3(0.95, 0.91, 0.82), vec3(0.70, 0.53, 0.40), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.60, 0.58), smoothstep(45.0, 70.0, abs(lat)));
}
// The boundaries between belts and zones, where the billows roll up; how hard the eddies stir and
// the billows turn.
const float CL_B[12]=float[12](7.0, 18.0, 24.0, 31.0, 36.0, 42.0, -8.0, -21.0, -26.0, -33.0, -38.0, -44.0);
const float CL_STIR=1.0, CL_KH=1.0;
// Whether the Red Spot is drawn, and how it turns.
#define CL_SPOT (grsAB.x>0.0)
#define CL_SPIN 1.0
// Its radius (km), and how many km the cloud tops rise for each e-fold in brightness (cloudTop):
// about a scale height (25 km at the cloud tops), so zones stand some 12 km over the belts.
const float CL_RKM=71492.0, CL_HKM=30.0;
#elif DETAIL_NEP
// Neptune's: Voyager 2's cloud-tracked winds, u = -398 + 0.188 lat² - 1.2e-5 lat⁴ m/s (Sromovsky et
// al. 1993), retrograde at 400 m/s at the equator and prograde at 250 near 70°, in System III (the
// radio period, 16.11 hours); smoothed over s degrees in closed form, each power of the latitude
// averaged over a Gaussian of that width. Held beyond 80°.
float clWindS(float lat, float s){
  float p=clamp(lat, -80.0, 80.0), p2=p*p, s2=s*s;
  return -398.0+0.188*(p2+s2)-1.2e-5*(p2*p2+6.0*p2*s2+3.0*s2*s2);
}
const float CL_MS=0.19989;
// Bands: the equator a little darker, and the dark circumpolar wave near 60°S (drawn with its wander
// below); in true color Neptune is a pale greenish blue only a little bluer than Uranus (Irwin et
// al. 2024), not the deep blue of the contrast-stretched Voyager images.
// Oceanus has its own (bodyAlbedo's).
float clBelt(float lat, float w){
  if(bE.w>0.5) return ocBelt(lat, w);
  return 0.3*bandOf(lat, -10.0, 10.0, w*2.0)+0.5*bandOf(lat, -64.0, -57.0, w);
}
vec3 clColor(float lat, float belt){
  if(bE.w>0.5) return ocColor(lat, belt);
  return mix(mix(vec3(0.56, 0.74, 0.95), vec3(0.45, 0.60, 0.88), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.80, 0.96), 0.5*smoothstep(65.0, 85.0, abs(lat)));
}
const float CL_B[12]=float[12](10.0, 20.0, 30.0, 45.0, 56.0, 68.0, -10.0, -20.0, -30.0, -45.0, -56.0, -68.0);
// Its deck is smooth: little stirring, and no billows rolled up between bands. A deck of water
// clouds, when the planet was warm enough (bE.y), is stirred more by the storms that latent heat drives.
#define CL_STIR (0.3+0.3*bE.y)
const float CL_KH=0.0;
// The dark vortex, when there is one (planets.js nepSpotAt, in grsAB); it turns as an anticyclone,
// one way in the south and the other in the north.
#define CL_SPOT (grsAB.x>0.0)
#define CL_SPIN (grsAB.z<0.0?1.0:-1.0)
// Its deck's scale height is near 20 km, but the bright methane clouds stand 50 to 100 km over it
// (their shadows on it in Voyager 2's images; Smith et al. 1989), several times what the deck's own shading would give.
const float CL_RKM=24764.0, CL_HKM=150.0;
#else
// Saturn's: Cassini's cloud-top winds of 2004-2009 in the continuum (García-Melendo et al. 2011,
// Icarus 215, 62; their PDS table), fit by 20 Gaussians to 6 m/s rms, in System III. North of 84°N,
// where the table ends, the polar jet is the south's mirrored (Cassini found one as strong).
float clWindS(float lat, float s){
  return 141.0*jG(lat, -87.5, 3.5, s)+86.0*jG(lat, -73.9, 1.7, s)-15.0*jG(lat, -68.3, 2.4, s)+120.0*jG(lat, -60.6, 2.1, s)-150.0*jG(lat, -52.8, 3.4, s)
        +190.0*jG(lat, -50.8, 6.8, s)-59.0*jG(lat, -44.0, 4.2, s)+59.0*jG(lat, -33.8, 3.2, s)+82.0*jG(lat, -24.0, 7.4, s)+346.0*jG(lat, -9.9, 10.7, s)
        +53.0*jG(lat, 0.0, 2.3, s)+367.0*jG(lat, 9.6, 11.4, s)+71.0*jG(lat, 23.9, 5.6, s)+58.0*jG(lat, 33.5, 5.7, s)-42.0*jG(lat, 39.2, 2.7, s)
        +137.0*jG(lat, 47.8, 3.0, s)+89.0*jG(lat, 61.5, 2.8, s)+85.0*jG(lat, 66.4, 2.0, s)-12.0*jG(lat, 73.2, 2.2, s)+75.0*jG(lat, 78.1, 1.5, s)
        +141.0*jG(lat, 87.5, 3.5, s);
}
const float CL_MS=0.08214;
// The belts lie where the wind falls off poleward, from an eastward jet to the next westward one,
// as Jupiter's do: the broad pair at 18-32° (bodyAlbedo's), and fainter, narrower ones toward the
// poles; the hexagon's is drawn apart.
float clBelt(float lat, float w){
  return 0.5*(bandOf(lat, 18.0, 32.0, w*2.0)+bandOf(lat, -32.0, -18.0, w*2.0))+0.3*(bandOf(lat, 34.0, 40.0, w)+bandOf(lat, -40.0, -34.0, w))
        +0.3*(bandOf(lat, 49.0, 55.0, w)+bandOf(lat, -55.0, -49.0, w))+0.25*(bandOf(lat, 62.0, 68.0, w)+bandOf(lat, -68.0, -62.0, w))+0.25*bandOf(lat, -79.0, -74.0, w);
}
vec3 clColor(float lat, float belt){
  return mix(mix(vec3(0.93, 0.85, 0.64), vec3(0.78, 0.68, 0.50), clamp(belt, 0.0, 1.0)), vec3(0.70, 0.70, 0.64), smoothstep(55.0, 75.0, abs(lat)));
}
const float CL_B[12]=float[12](18.0, 32.0, 40.0, 49.0, 55.0, 62.0, -18.0, -32.0, -40.0, -49.0, -55.0, -62.0);
// Saturn's clouds are seen through more haze, and its eddies show less.
const float CL_STIR=0.45, CL_KH=0.7;
#define CL_SPOT false
#define CL_SPIN 1.0
// Its scale height near the cloud tops is about 40 km, and its storms rise as far over the deck.
const float CL_RKM=60268.0, CL_HKM=50.0;
// How far (degrees, outward positive) a point pc degrees from the north pole at east longitude lon
// lies from the hexagon's jet: a hexagon in the plane about the pole, its sides 12.3° from it
// (77.7°N) and their middles at longitudes 30° + 60°n, its corners rounded 3.5° in radius as in
// Cassini's images, so they lie at 76.3°N (Quílez's distance to a hexagon).
float clHexD(float pc, float lon){
  const vec3 k=vec3(-0.866025404, 0.5, 0.577350269);
  const float rr=3.5;
  float a=lon*0.01745329252;
  vec2 p=abs(pc*vec2(cos(a), sin(a)));
  p-=2.0*min(dot(k.xy, p), 0.0)*k.xy;
  p-=vec2(clamp(p.x, -k.z*(12.3-rr), k.z*(12.3-rr)), 12.3-rr);
  return length(p)*sign(p.y)-rr;
}
#endif
// The cloud tops' height (km, up to a constant) where their color is c: brighter is higher. The
// thick white ammonia ice forms where air rises (the zones, white ovals and convective plumes), and
// the darker colors show where it sinks and the clouds thin (the belts, hot spots, festoons and
// barges). The Red Spot, an anticyclone, is red yet stands some 8 km over the clouds round it:
// within it, the height is a dome, rising 8 km over the pale Hollow, streaked by its own clouds.
// e0 is where a point lies in the spot's ellipse (clSpotE).
float cloudTop(vec3 c, float e0){
  float h=CL_HKM*log(max(dot(c, vec3(0.30, 0.55, 0.15)), 0.05));
#if DETAIL_JUP
  float ins=grsAB.w*(1.0-smoothstep(0.85, 1.05, e0));
  h=mix(h, CL_HKM*log(0.9)+8.0*(1.0-0.4*e0*e0)+(h-CL_HKM*log(0.55)), ins);
#endif
  return h;
}
float clWind(float lat){ return clWindS(lat, 0.0); }
float clWindDeg(float lat){ return clWind(lat)*CL_MS/max(cos(lat*0.01745329252), 0.1); }
// Value noise and its gradient at p, from hashed values at whole cells, N cells round in x, so
// it wraps seamlessly about the planet at any whole N.
vec3 vNg(vec2 p, float N){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f), du=6.0*f*(1.0-f);
  float x0=mod(i.x, N), x1=mod(i.x+1.0, N);
  float a=h12(vec2(x0, i.y)), b=h12(vec2(x1, i.y)), c=h12(vec2(x0, i.y+1.0)), d=h12(vec2(x1, i.y+1.0)), k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y, du*vec2(b-a+k*u.y, c-a+k*u.x));
}
// Slow change along the bands: sinusoids of 2, 3 and 5 waves round the planet, their phases
// drifting with latitude, between 0 and 1.
float clSlow(float lon, float lat, float seed){
  float L=lon*0.01745329252;
  return 0.5+0.5*(0.5*sin(2.0*L+seed*6.1+lat*0.21)+0.3*sin(3.0*L+seed*2.3-lat*0.17)+0.2*sin(5.0*L+seed*4.7+lat*0.31));
}
// Positions round Jupiter are in cells of which 128 (the noise texture's period) make the full
// circle of longitude, so noise of whole multiples of them wraps seamlessly, and latitude in
// Mercator measure, so the cells stay round: clY and clLat turn latitude to and from it.
float clY(float lat){ return log(tan(0.785398+clamp(lat, -84.0, 84.0)*0.00872665))*20.371833; }
float clLat(float Y){ return (2.0*atan(exp(Y/20.371833))-1.5707963)*57.2957795; }
// The eddies' stream function at P (cells) and its gradient: five octaves of noise, cells three
// times as long along the winds as across, each scaled so that all turn alike, the finer a little
// weaker; an octave fades out before its eddies shrink under a few pixels (pxC cells), and is not
// worked out at all till then, so the two finest (eddies some 0.7° and 0.35° across) cost nothing
// short of a deep zoom. The eddies drift at u (cells a day), in two copies half a period apart,
// each restarting when the other is at full strength, so the shear never smears them out. Each
// octave has its own period, the smaller eddies living shorter (4, 2.6, 1.7, 1.1 and 0.7 days),
// and its own phase, so they renew at different times rather than all at once.
vec3 clPsi(vec2 P, float u, float pxC, float T){
  vec3 g=vec3(0.0);
  // One loop over both copies and the octaves of each (D3D keeps a loop of ten as a loop).
  for(int j=0;j<10;j++){
    float k=float(j/5), o=float(j-5*(j/5)), f0=0.5*exp2(o), fd=smoothstep(2.0*pxC, 5.0*pxC, 1.0/f0);
    if(fd<=0.0) continue;
    float pd=4.0*pow(0.65, o), ph=T/pd+0.37*o;
    float wA=1.0-abs(2.0*fract(ph)-1.0), fk=fract(ph+0.5*k), wk=(k<0.5?wA:1.0-wA)/max(sqrt(wA*wA+(1.0-wA)*(1.0-wA)), 0.5);
    vec2 Q=vec2(P.x-u*fk*pd+k*41.0, P.y+k*17.0), f=vec2(1.0, 3.0)*f0;
    vec3 n=vNg(Q*f+o*7.3, 128.0*f.x);
    g+=wk*fd*pow(0.8, o)/(f.x*f.y)*vec3(n.x-0.5, n.yz*f);
  }
  return g;
}
// How strongly the eddies stir at q (cells), T days: most in the belts and their edges and toward
// the poles, less in the zones; in patches of storms some 45 degrees long, calm stretches between,
// which drift with the wind smoothed over 8 degrees and break out and die away over a dozen days
// (two slices of noise, each drifting from its own start, the one fading in as the other fades
// out); not at all in the Red Spot (gC, gA as in cloudFlow) and its collar, and most west of
// it, in the South Equatorial Belt, its turbulent wake.
// What of it depends on the latitude la alone: the smoothed wind's drift (x) and the strength
// before the patches (y); the cloud's march asks it at two latitudes for three points.
vec2 clStirLat(float la){
  return vec2(clWindS(la, 8.0)*CL_MS*0.355556/max(cos(la*0.01745329252), 0.1),
              CL_STIR*(0.55+0.65*clamp(clBelt(la, 3.0), 0.0, 1.0)+0.5*smoothstep(40.0, 60.0, abs(la))));
}
// At q, with lp its latitude's clStirLat.
float clStir(vec2 q, vec2 lp, vec2 gC, vec2 gA, float T){
  float uS=lp.x;
  vec2 E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA, wq=vec2((E.x+2.8)/1.8, (E.y-0.35)/0.75);
  float ph=T/12.0, i0=floor(ph), fr=fract(ph), pa=0.0;
  for(int k=0;k<2;k++){
    float sl=i0+float(k), n=vNg(vec2((q.x-uS*(T-12.0*sl))*0.0625+sl*3.7, q.y*0.4+sl*5.3), 8.0).x;
    pa+=(k==0?1.0-smoothstep(0.0, 1.0, fr):smoothstep(0.0, 1.0, fr))*smoothstep(0.3, 0.7, n);
  }
  float s=lp.y*(0.4+1.2*pa);
  return CL_SPOT?s*(1.0+1.6*exp(-dot(wq, wq)))*smoothstep(1.0, 1.7, length(E)):s;
}
// One chain of Kelvin-Helmholtz billows along the boundary at latitude b, N to the circle of
// longitude (so the chain closes on itself), R in radius: each point near one is turned about it by
// up to ang radians, most at its middle, which rolls the boundary up into a spiral. q is (longitude,
// latitude) in degrees; cl the cosine of the latitude.
vec2 khRoll(vec2 q, float b, float N, float R, float ang, float seed, float cl){
  float dy=q.y-b;
  if(abs(dy)>3.0*R) return q;
  float lam=360.0/N, x=q.x/lam+seed, ix=floor(x+0.5), id=mod(ix, N);
  float hj=h12(vec2(id, seed*13.1)), hk=h12(vec2(seed*7.7, id));
  float cx=(ix+(hj-0.5)*0.3-seed)*lam, Rk=R*(0.6+0.5*hk);
  vec2 d=vec2((q.x-cx)*cl, dy-(hk-0.5)*R*0.8);
  // A few billows have not rolled up; the rest by differing amounts.
  // Faded to nothing before the edge of the billow's cell, so neighbors meet without a step.
  float win=(1.0-smoothstep(0.32, 0.48, abs(x-ix)))*(1.0-smoothstep(2.0*R, 3.0*R, abs(dy)));
  float a=ang*smoothstep(0.05, 0.3, hj)*(0.4+0.6*hj)*exp(-dot(d, d)/(Rk*Rk))*win, c=cos(a), s=sin(a);
  d=vec2(c*d.x-s*d.y, s*d.x+c*d.y);
  return vec2(cx+d.x/cl, b+(hk-0.5)*R*0.8+d.y);
}
// The cloud tops at planetographic latitude lat and east longitude lon (Jupiter's System II,
// Saturn's System III; degrees), pxD degrees of the surface to a pixel; aux Jupiter's Red Spot's
// longitude, or the sine of the Sun's latitude on Saturn; T days (fineT.y). The clouds are a
// tracer: each point is turned by the billows, then followed back along the eddies' streamlines
// and round the Red Spot, which roll the edges of the belts and zones and the finer banding within
// them into curls and filaments, sheared out along the winds; the color is the banding where it
// ends up. Then Jupiter's festoons and hot spots, barges and white ovals, or Saturn's hexagon,
// polar vortices, ribbon and storms.
// In two parts: cloudFlow follows the point back, the costly part, to where its cloud came from
// (q, in cells, and gT, as below; w 0 where the disk is too small for any of it), and cloudColor
// colors it there. Where the flow is smooth across the pixels, cloudColor alone can be asked again
// a little way off (bodyDisk's relief).
// The Red Spot (grsAB: its length and width in degrees, its latitude and redness; aux its
// longitude) in cells: its middle and its half-axes.
vec2 clSpotC(float aux){ return vec2(aux*0.355556, clY(grsAB.z)); }
vec2 clSpotA(){ return 0.177778*vec2(grsAB.x, grsAB.y/cos(grsAB.z*0.01745329252)); }
// Where (lat, lon) lies in the spot's ellipse, 1 at its edge; far off without one.
float clSpotE(float lat, float lon, float aux){
  return CL_SPOT?length(vec2(mod(lon*0.355556-aux*0.355556+64.0, 128.0)-64.0, clY(lat)-clY(grsAB.z))/clSpotA()):1e3;
}
vec4 cloudFlow(float lat, float lon, float pxD, float aux){
  bool grs=CL_SPOT;
  vec2 gC=clSpotC(aux), gA=clSpotA();
  float e0=clSpotE(lat, lon, aux);
  if(pxD>2.5) return vec4(0.0);
  float T=fineT.y, cl=max(cos(lat*0.01745329252), 0.1), pxC=pxD*0.355556/cl;
  // Stirring: strongest in the belts and their edges and toward the poles, calmer in the zones.
  // The billows: at each boundary between a belt and a zone, two chains, the second a third the
  // size of the first, each turning the way of the shear's vorticity there and carried along at
  // the wind of the boundary, active along some stretches of it and quiet along others and near
  // the Red Spot; a chain fades in once a billow spans several pixels.
  vec2 q=vec2(lon, lat);
  for(int i=0;i<12;i++){
    float b=CL_B[i];
    if(abs(q.y-b)>7.5) continue;
    float du=clWind(b+0.5)-clWind(b-0.5), sg=du>0.0?-1.0:1.0, st=clamp(abs(du)/25.0, 0.35, 1.0);
    float cb=max(cos(b*0.01745329252), 0.1), x0=q.x-clWindDeg(b)*T;
    st*=smoothstep(0.1, 0.4, clSlow(x0, b, 3.0+float(i)*0.71))*smoothstep(1.2, 2.0, e0);
    vec2 r=vec2(x0, q.y);
    float N=24.0, R=2.5, ang=5.0, sd0=0.37, sd1=0.0;
    for(int c=0;c<2;c++){
      float fade=smoothstep(R*0.3, R*0.15, pxD);
      if(fade<=0.0) break;
      r=khRoll(r, b, N, R, CL_KH*ang*sg*st*fade, float(i)*sd0+sd1, cb);
      N*=3.0; R/=3.0; ang-=0.3; sd0+=0.42; sd1+=0.37;
    }
    q=vec2(r.x+clWindDeg(b)*T, r.y);
  }
  q=vec2(q.x*0.355556, clY(q.y));
  // Each step of the way back, everything that moves the clouds is taken where they are then, not
  // where they end up, so the steps make a flow and the clouds are never folded over themselves.
  for(int s=0;s<16;s++){
    float la=clLat(q.y), cq=max(cos(la*0.01745329252), 0.1);
    // The eddies drift with the wind smoothed over a few degrees: carried by the narrow jets
    // themselves they would be sheared into hairlines.
    float u4=clWindS(la, 4.0);
    vec3 g=clPsi(q, u4*CL_MS/cq*0.355556, pxC, T);
    vec2 E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA;
    float e=grs?length(E):1e3, x=max(e-0.95, 0.0);
    // Along the streamlines of the eddies' stream function times their strength, which keeps the
    // flow from crowding the clouds into creases; and the jets' own shear (against the smoothed
    // wind) drawing what they stir out along the bands, though not across the Red Spot's edge.
    // The strength here and a twentieth of a cell east and north, in one loop (a loop of four
    // stays a loop in D3D, which would copy the function three times over); the point east is at
    // this latitude, so it shares its clStirLat.
    float Sv[3]; vec2 lp=vec2(0.0);
    for(int j=0;j<4;j++){
      if(j==3) break;
      vec2 qj=q+0.05*vec2(j==1, j==2);
      if(j!=1) lp=clStirLat(j==0?la:clLat(qj.y));
      Sv[j]=clStir(qj, lp, gC, gA, T);
    }
    float S=Sv[0], Sx=(Sv[1]-S)*20.0, Sy=(Sv[2]-S)*20.0;
    q+=0.05*vec2(-(S*g.z+g.x*Sy), S*g.y+g.x*Sx)+smoothstep(1.0, 1.7, e)*vec2(0.0025*(clWind(la)-u4), 0.0);
    // The Red Spot, an anticyclone, turning the clouds about it along its ellipses: faster toward
    // its edge, so what it draws in winds into spirals, and dying away beyond it. Round its edge
    // the flow also runs a little inward, so the collar is drawn in as arms spiralling onto the
    // rim rather than circling it in rings (followed back, outward).
    if(e<2.0){
      float a=-0.375*CL_SPIN*(0.7+0.3*smoothstep(0.3, 0.85, e))*exp(-x*x/0.08);
      E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA;
      E=mat2(cos(a), sin(a), -sin(a), cos(a))*E*(1.0+0.02*smoothstep(0.93, 1.05, e)*exp(-(e-1.15)*(e-1.15)/0.09));
      q=gC+E*gA;
    }
  }
  // And its inside turning as a whole, once in about six days, all but its rim (gT, where the
  // turning dies away and would wind the clouds ever tighter).
  float gT=1.0;
  if(grs){
    vec2 E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA;
    float eT=length(E), a=-1.047*CL_SPIN*T*(1.0-smoothstep(0.86, 0.93, eT));
    gT=1.0-smoothstep(0.84, 0.88, eT)*(1.0-smoothstep(0.92, 0.95, eT));
    E=mat2(cos(a), sin(a), -sin(a), cos(a))*E; q=gC+E*gA;
  }
  return vec4(q, gT, 1.0);
}
// Its color (rgb), and in a the height (km) its storms add to cloudTop's: the white ovals' and
// storms' domes, which their color alone would leave flat.
vec4 cloudColor(vec4 F, float lat, float lon, float pxD, float aux){
  bool grs=CL_SPOT;
  vec2 gC=clSpotC(aux), gA=clSpotA(), q=F.xy;
  float gT=F.z, w=clamp(pxD*2.0, 0.25, 1.5), zk=0.0;
#if DETAIL_JUP
  if(F.w<0.5) return vec4(mix(clColor(lat, clBelt(lat, 1.5)), vec3(0.80, 0.42, 0.30), grsAB.w*(1.0-smoothstep(0.8, 1.0, clSpotE(lat, lon, aux)))), 0.0);
#elif DETAIL_NEP
  if(F.w<0.5) return vec4(mix(clColor(lat, clBelt(lat, 1.5)), vec3(0.24, 0.34, 0.66), 0.6*grsAB.w*(1.0-smoothstep(0.8, 1.0, clSpotE(lat, lon, aux)))), 0.0);
#else
  if(F.w<0.5) return vec4(bodyAlbedo(4, lat, vec3(1.0)), 0.0);
#endif
  float T=fineT.y, cl=max(cos(lat*0.01745329252), 0.1), pxC=pxD*0.355556/cl;
  // The bands wander a degree or so along their length, and darken along some stretches. The
  // wander drifts all at one rate, a turn in T's 2000 days, so it meets itself when T wraps:
  // drifting with each latitude's own wind it was sheared, late in T, into fine streaks.
  float s1=clSlow(lon-0.18*T, lat, 1.0), s2=clSlow(lon, lat, 2.0);
  float la=clLat(q.y)+(2.0*s1-1.0)*0.9;
  float belt=clBelt(la, w);
  vec3 c=clColor(la, belt);
  // Finer banding within the belts and zones, from noise in the carried latitude, and patches
  // along them, both carried with the clouds; a band too fine for the pixels is left out. Deep in
  // a zoom, two finer layers of each, at a half and a quarter the size of the finest before.
  float yq=q.y, k1=smoothstep(1.5, 3.0, 0.4/pxC), k2=smoothstep(1.5, 3.0, 0.15/pxC), k3=smoothstep(1.5, 3.0, 0.075/pxC), k4=smoothstep(1.5, 3.0, 0.0375/pxC);
  float dye=0.6*(vNg(vec2(yq*0.8, 3.0), 1e4).x-0.5)+0.5*k1*(vNg(vec2(yq*2.0, 9.0), 1e4).x-0.5)+0.35*k2*(vNg(vec2(yq*6.0, 1.0), 1e4).x-0.5)
           +0.5*k1*(vNg(q*vec2(1.0, 2.5)+5.0, 128.0).x-0.5)+0.3*k2*(vNg(q*vec2(3.0, 7.0)+2.0, 384.0).x-0.5);
  if(k3>0.0) dye+=k3*(0.35*(vNg(vec2(yq*12.0, 15.0), 1e4).x-0.5)+0.3*(vNg(q*vec2(6.0, 14.0)+8.0, 768.0).x-0.5))
                 +k4*(0.3*(vNg(vec2(yq*24.0, 27.0), 1e4).x-0.5)+0.25*(vNg(q*vec2(12.0, 28.0)+11.0, 1536.0).x-0.5));
  // Each band, and each finer band within it, a slightly different hue: redder or yellower,
  // grayer or bluer, a little lighter or darker, and so along its length, all carried with the
  // clouds like the banding itself.
  vec3 hv=vec3(vNg(vec2(yq*1.2, 21.0), 1e4).x, vNg(vec2(yq*3.0, 33.0), 1e4).x, vNg(q*vec2(1.0, 3.0)+40.0, 128.0).x)-0.5;
  hv.yz*=k1;
#if DETAIL_JUP
  c*=1.0+(0.5+0.5*belt)*(hv.x*vec3(0.10, -0.02, -0.14)+hv.y*vec3(0.04, 0.05, -0.10)+hv.z*vec3(-0.06, -0.02, 0.08)+0.08*(hv.x+hv.y));
  // Close up the zones whiter and the belts more orange; the belts darker and redder along some
  // stretches than others, and at their edges; the polar regions mottled.
  float pol=smoothstep(34.0, 56.0, abs(la));
  c*=mix(vec3(0.98, 1.0, 1.04), vec3(1.06, 0.97, 0.86), belt*(1.0-pol));
  c=mix(c, vec3(0.62, 0.57, 0.50), 0.8*pol);
  c=mix(c, c*vec3(0.92, 0.86, 0.82), belt*(s2-0.4));
  float bw=clamp(clBelt(la, max(w, 1.2)), 0.0, 1.0);
  c*=1.0-0.2*bw*(1.0-bw)*4.0;
  // In the belts, brown streaks and pale filaments; in the zones, white and pale blue-gray.
  c=mix(c, c*vec3(0.80, 0.70, 0.62), belt*clamp(-dye*2.5, 0.0, 1.0));
  c=mix(c, vec3(0.94, 0.92, 0.86), belt*smoothstep(0.08, 0.3, dye)*0.75*(1.0-0.7*pol));
  c=mix(c, vec3(0.74, 0.77, 0.82), (1.0-belt)*smoothstep(0.08, 0.3, -dye)*0.45*(1.0-pol));
  c*=1.0+(0.12+0.4*pol)*mix(1.0-belt, 1.0, pol)*dye;
#elif DETAIL_NEP
  // Neptune's deck barely varies: faint shading along the bands, a little bluer or greener.
  c*=1.0+0.25*(hv.x*vec3(-0.04, 0.0, 0.05)+hv.y*vec3(0.02, 0.03, -0.02)+0.04*hv.z)+mix(0.04, 0.12, bE.y)*dye;
#else
  // Saturn's the same, a half to a third as strong through its haze: the belts browner and the
  // zones paler along some stretches; toward the poles, many fine bands of differing shades.
  float pol=smoothstep(30.0, 50.0, abs(la));
  c*=1.0+0.5*(0.5+0.5*belt)*(hv.x*vec3(0.06, 0.0, -0.10)+hv.y*vec3(0.03, 0.03, -0.06)+hv.z*vec3(-0.03, -0.01, 0.04)+0.06*(hv.x+hv.y));
  c=mix(c, c*vec3(0.94, 0.90, 0.86), belt*(s2-0.4));
  c=mix(c, c*vec3(0.88, 0.82, 0.76), 0.6*belt*clamp(-dye*2.0, 0.0, 1.0));
  c=mix(c, vec3(0.95, 0.90, 0.76), 0.35*(1.0-belt)*smoothstep(0.08, 0.3, dye)*(1.0-pol));
  c*=1.0+(0.06+0.08*pol)*dye+0.12*pol*k1*(vNg(vec2(yq*4.0, 51.0), 1e4).x-0.5);
#endif
  // The Red Spot: what the vortex holds is red, deepest toward its edge, streaked by the same
  // clouds wound into it, with a darker rim; round it the pale Red Spot Hollow, which the belt
  // north of it bends away from.
  if(grs){
#if DETAIL_NEP
    // A dark vortex: a deeper blue oval, streaked by the clouds wound into it, and bright methane
    // clouds along its poleward edge, where the flow over it lifts them (Voyager's companions).
    vec2 Ed=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA;
    float e=length(Ed), ins=1.0-smoothstep(0.85, 1.0, e), pole=smoothstep(0.1, 0.6, sign(grsAB.z)*Ed.y/max(e, 1e-3));
    c=mix(c, vec3(0.24, 0.34, 0.66)*(1.0+0.25*dye*gT), 0.7*grsAB.w*ins*(0.75+0.25*smoothstep(0.0, 0.8, e)));
    c=mix(c, vec3(0.95, 0.97, 1.0), 0.85*grsAB.w*pole*exp(-(e-1.2)*(e-1.2)/0.025));
#else
    float e=length(vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA), ins=1.0-smoothstep(0.93, 1.0, e);
    c=mix(c, vec3(0.94, 0.92, 0.87), 0.75*(1.0-smoothstep(1.1, 1.45, e+0.25*dye))*(1.0-ins));
    vec3 red=mix(vec3(0.88, 0.55, 0.38), vec3(0.80, 0.38, 0.25), smoothstep(0.2, 0.8, e));
    red*=(1.0+0.5*dye*gT)*(1.0-0.22*smoothstep(0.8, 0.95, e));
    red=mix(red, vec3(0.92, 0.70, 0.55), smoothstep(0.12, 0.35, dye)*0.45*(1.0-smoothstep(0.6, 0.85, e)));
    // A paler spot (grsAB.w under 1) fades toward pale salmon, not the clouds wound up beneath it.
    c=mix(c, mix(vec3(0.93, 0.86, 0.78)*(1.0+0.15*dye*gT), red, grsAB.w), ins);
    // The clouds wound into it stand out on its dome (cloudTop's) as ridges and troughs.
    zk+=2.0*ins*grsAB.w*dye*gT;
#endif
  }
#if DETAIL_JUP
  // The North Equatorial Belt's southern edge, about 7°N: dark blue-gray hot spots, gaps in the
  // clouds a few degrees long, and from some of them thin festoons curving west and down across the
  // Equatorial Zone; a dozen round the planet at uneven spacing, moving with its wind.
  if(lat>-1.0 && lat<9.5){
    float xf=lon-clWindDeg(6.5)*T, sF=clamp((7.0-la)/6.5, 0.0, 1.0);
    float k0=floor(xf/30.0), fest=0.0, hot=0.0;
    for(int j=0;j<2;j++){
      float k=k0+float(j), hf=h12(vec2(mod(k, 12.0), 7.7)), hg=h12(vec2(mod(k, 12.0), 3.1)), x0=k*30.0+(hf-0.5)*16.0;
      float lc=x0-(14.0+12.0*hg)*pow(sF, 1.2);
      float dx=(xf-lc)*cl+1.6*dye*(1.0+sF), wd=0.9*(1.0-0.5*sF)+0.25, dh=(xf-x0)*cl;
      fest=max(fest, exp(-dx*dx/(wd*wd))*smoothstep(0.05, 0.2, sF)*(1.0-smoothstep(0.55, 0.95, sF))*step(0.45, hf));
      hot=max(hot, exp(-dh*dh/(4.0+5.0*hg)-(la-7.0)*(la-7.0)/0.5)*step(0.25, hf));
    }
    c=mix(c, vec3(0.50, 0.55, 0.62), 0.5*fest+0.55*hot);
  }
  // White ovals in the South South Temperate Belt, near 41°S, eight cells round, some empty.
  if(lat>-46.0 && lat<-36.0){
    float xo=lon-clWindDeg(-41.0)*T, k=floor(xo/45.0+0.5), ho=h12(vec2(mod(k, 8.0), 3.3));
    vec2 d=vec2((xo-k*45.0-(ho-0.5)*20.0)*cl/2.2, (lat+41.0+(ho-0.5)*1.2)/1.4);
    float e=length(d), on=(1.0-smoothstep(0.75, 1.0, e))*step(0.4, ho);
    // Anticyclones like the Red Spot, they stand a few km over the clouds round them, domed, with
    // their own clouds wound into two arms turning once in about four days.
    float arm=sin(2.0*atan(d.y, d.x)+7.0*e-1.57*T+6.3*ho);
    c=mix(c, c*0.85, 0.5*(1.0-smoothstep(1.0, 1.35, e))*smoothstep(0.85, 1.0, e)*step(0.4, ho));
    c=mix(c, vec3(0.96, 0.95, 0.92)*(1.0+0.07*arm*smoothstep(0.1, 0.5, e)+0.1*dye), on);
    zk+=on*(5.0*(1.0-e*e)+1.5*arm*smoothstep(0.1, 0.5, e));
  }
  // Barges: dark red-brown cyclones in the North Equatorial Belt's northern edge, near 15°N.
  if(lat>11.0 && lat<19.0){
    float xb=lon-clWindDeg(15.5)*T, k=floor(xb/40.0+0.5), hb=h12(vec2(mod(k, 9.0), 9.1));
    vec2 d=vec2((xb-k*40.0-(hb-0.5)*20.0)*cl/2.6, (lat-15.5)/1.0);
    c=mix(c, vec3(0.50, 0.30, 0.24), 0.7*(1.0-smoothstep(0.6, 1.0, length(d)))*step(0.55, hb));
  }
#elif DETAIL_NEP
  // Bright clouds of methane ice high above the deck, in streaks some tens of degrees long and a
  // degree or two wide: at southern mid-latitudes (20-50°S), near 30°N, and small ones near 70°S
  // (Voyager; Keck and HST since). Each lives some days, drawn out by the shear of the winds that
  // carry it: two generations of noise, each carried by the wind at its latitude from its own start
  // eight days apart, the one fading in as the other fades out, so the shear never builds past that.
  // None while it was too warm for methane ice (bE.x), but when warmer still, the tops of storms
  // of moist convection in the water clouds (bE.y), in the same rising mid-latitudes; on Oceanus in
  // both hemispheres alike.
  {
    float oc=bE.w, env=max(1.0-bE.x, bE.y)*(mix(0.9, 0.8, oc)*bandOf(la, -50.0, -21.0, 3.0)+mix(0.7, 0.8, oc)*bandOf(la, 22.0, mix(40.0, 50.0, oc), 3.0)+0.7*(1.0-oc)*bandOf(la, -73.0, -66.0, 1.5));
    if(env>0.01){
      float ph=T/8.0, i0=floor(ph), fr=fract(ph), cw=0.0, ud=clWindDeg(la);
      for(int k=0;k<2;k++){
        float sl=i0+float(k), xq=(lon-ud*(T-8.0*sl))*0.355556+sl*31.7;
        float n=vNg(vec2(xq*0.35, q.y*2.2+sl*7.3), 128.0*0.35).x*0.7+vNg(vec2(xq*1.1, q.y*6.0+sl*3.1), 128.0*1.1).x*0.3;
        cw+=(k==0?1.0-smoothstep(0.0, 1.0, fr):smoothstep(0.0, 1.0, fr))*smoothstep(0.66, 0.82, n);
      }
      c=mix(c, vec3(0.95, 0.97, 1.0), 0.8*env*cw*smoothstep(4.0, 1.5, pxD));
    }
  }
  // The dark circumpolar wave near 60°S (the South Polar Wave), wandering a few degrees in latitude
  // round the planet and drifting 4.866° a day in System III (Karkoschka 2011; Chavez et al. 2023),
  // with the bright band just north of it.
  if(la<-48.0 && la>-72.0 && bE.w<0.5){
    float lw=-60.5+2.5*sin((lon-4.866*T)*0.01745329252)+0.4*dye;
    c=mix(c, vec3(0.38, 0.52, 0.84), 0.45*exp(-(la-lw)*(la-lw)/6.0));
    c*=1.0+0.10*exp(-(la-lw-5.5)*(la-lw-5.5)/4.0);
  }
#else
  // The hexagon: the jet at 78°N meanders in a standing wave of six (Godfrey 1988), fixed in
  // System III, its sides 13,800 km long, at 77.7°N midway along each, its corners rounded
  // (clHexD; where they lie in longitude is not known here). The jet itself a dark lane, a little
  // ragged; inside it the clouds bluish-gray in the north's winter, golden by its summer (Cassini,
  // 2012-2016).
  // In the jet, the clouds drawn out along it into streaks, carried at its 100 m/s; along its
  // outer edge a bank of brighter clouds; the jet itself a trough, and the clouds within the
  // hexagon, seen through thinner haze, lower than those outside. (Its heights are not measured:
  // these are a few km, as the brightness of the clouds suggests elsewhere.)
  float pc=90.0-abs(lat), sg=sign(lat), fw=max(pxD, 0.3);
  if(lat>65.0){
    float hd=clHexD(pc, lon)+0.4*dye;
    float xj=(lon-clWindDeg(77.0)*T)*0.355556, env=exp(-hd*hd/4.0);
    float stk=(vNg(vec2(xj*0.5, hd*4.0+3.0), 64.0).x-0.5)+0.6*smoothstep(1.5, 3.0, 0.08/fw)*(vNg(vec2(xj*1.5, hd*12.0+7.0), 192.0).x-0.5);
    float bank=exp(-(hd-1.2)*(hd-1.2)/0.6);
    c=mix(c, mix(vec3(0.56, 0.63, 0.68), vec3(0.80, 0.73, 0.55), smoothstep(-0.15, 0.35, aux)), 0.35*(1.0-smoothstep(-fw, fw, hd)));
    // Either side of the jet, out to some 5°, lanes of cloud 0.7° apart following its shape.
    float lane=sin(hd*9.0+1.5*dye)*smoothstep(0.5, 1.2, abs(hd))*smoothstep(5.5, 2.5, abs(hd))*smoothstep(0.2, 0.07, pxD);
    c*=(1.0-0.22*exp(-hd*hd/max(0.6, fw*fw)))*(1.0+0.18*env*stk+0.08*bank+0.07*lane);
    zk+=-8.0*(1.0-smoothstep(-1.5, 0.5, hd))-6.0*exp(-hd*hd/0.8)+5.0*bank+8.0*env*stk+2.0*lane;
  }
  // The north polar region's smaller weather (Cassini, 2012-2016): within the hexagon many small
  // bright storms, a few hundred km across, their tops domed some 7 km over the clouds and each
  // rimmed by a faint darker ring, and fewer outside it; concentric bands of cloud round the polar
  // vortex out to some 7°; and a few larger storms south of the hexagon, a degree or so in radius,
  // each a pale dome ringed by brighter cloud. All are laid on a grid in the plane about the pole
  // (degrees from it), turning with the wind at 80°N, and shown once they span a few pixels.
  if(lat>64.0){
    float k2=smoothstep(0.7, 0.25, pxD);
    float rl=(lon-clWindDeg(80.0)*T)*0.01745329252;
    float hx=clHexD(pc, lon), inh=1.0-smoothstep(-0.5, 0.5, hx);
    vec2 P=pc*vec2(cos(rl), sin(rl));
    if(pxD<0.33){
      // Three sizes, the cells 1.1°, 0.6° and 0.33° across, each shown once its storms span a few
      // pixels; few large and many small, packed within the hexagon and fewer outside, bunched in
      // patches and none in the jet. The plane is swirled first (turned about the pole by an angle
      // wandering with place, and pushed about by noise), which sweeps them into the curving
      // streams Cassini saw. Each soft-edged, brightest in its middle.
      float sw=0.35*sin(pc*0.9)+0.9*(vNg(P*0.18+21.0, 1e4).x-0.5), cw=cos(sw), sn=sin(sw);
      vec2 Q=mat2(cw, sn, -sn, cw)*P+0.6*(vec2(vNg(P*0.5+3.0, 1e4).x, vNg(P*0.5+8.0, 1e4).x)-0.5);
      float dome=0.0, core=0.0, rim=0.0, pat=vNg(Q*0.35+2.0, 1e4).x;
      float dens=mix(0.25, 0.75, inh)*(0.35+0.65*smoothstep(0.2, 0.6, pat))*(1.0-0.9*exp(-hx*hx/2.0));
      for(int j=0;j<3;j++){
        float cs=j==0?1.1:j==1?0.6:0.33, sj=float(j)*17.3, kj=smoothstep(0.3*cs, 0.1*cs, pxD);
        if(kj<=0.0) break;
        vec2 id=floor(Q/cs), f=fract(Q/cs)-0.5;
        vec2 o=vec2(h12(id+sj), h12(id.yx+5.3+sj))-0.5;
        float hr=h12(id+9.7+sj), r=0.1+0.28*hr*hr, on=kj*step(1.0-dens, h12(id+31.1+sj));
        float d=length(f-0.25*o)/r;
        dome=max(dome, on*max(1.0-d*d, 0.0)); core=max(core, on*exp(-d*d*3.0)); rim=max(rim, on*exp(-(d-1.2)*(d-1.2)/0.05));
      }
      c=mix(c, min(c*1.25+0.06, vec3(1.0)), 0.35*smoothstep(0.0, 0.6, dome)+0.35*core);
      c*=1.0-0.06*rim;
      zk+=7.0*dome-1.5*rim;
    }
    if(k2>0.0){
      // The bands wander and come and go round the vortex.
      float cr=sin(pc*7.85+2.0*dye+0.8*sin(3.0*rl+pc))*smoothstep(0.25, 0.65, vNg(P*0.6+11.0, 1e4).x)*smoothstep(0.9, 1.8, pc)*smoothstep(7.0, 3.0, pc);
      c*=1.0+0.07*k2*cr;
      zk+=2.5*k2*cr;
      vec2 id=floor(P/7.0), f=fract(P/7.0)-0.5, o=vec2(h12(id+3.9), h12(id.yx+8.1))-0.5;
      float r=0.12+0.06*h12(id+4.4), d=length(f-0.25*o)/r;
      float on=step(0.6, h12(id+12.7))*smoothstep(13.0, 15.0, pc)*smoothstep(26.0, 22.0, pc);
      float ring=exp(-(d-0.8)*(d-0.8)/0.02);
      c=mix(c, min(c*1.15+0.05, vec3(1.0)), on*k2*(0.5*ring+0.25*(1.0-smoothstep(0.6, 1.0, d))));
      zk+=on*k2*(6.0*max(1.0-d*d, 0.0)+2.0*ring);
      // A large pale anticyclone within the hexagon, near a corner, some 1.5° in radius, its
      // clouds wound into it in two arms (Cassini, 2013).
      vec2 dv=(P-9.0*vec2(-0.666, 0.746))/1.5;
      float dl=length(dv), arm=sin(2.0*atan(dv.y, dv.x)+6.0*dl-1.2*T), in1=1.0-smoothstep(0.75, 1.0, dl);
      c=mix(c, mix(c, vec3(0.88, 0.86, 0.82), 0.6)*(1.0+0.06*arm*dl), k2*in1);
      c*=1.0+0.1*k2*exp(-(dl-0.88)*(dl-0.88)/0.01);
      zk+=k2*(6.0*max(1.0-dl*dl, 0.0)+1.5*arm*dl*in1);
    }
  }
  // The polar vortices, a few degrees across, at both poles: a dark eye about a degree in radius
  // ringed by the bright wall of its clouds, and arms spiralling out to some 5 degrees from the
  // pole, turning with the winds (cyclones: anticlockwise in the north, seen from above). The
  // eyewall's clouds stand 30 to 70 km over the floor of the eye, from the shadows they cast in
  // Cassini's images (Dyudina et al. 2008, of the south's; the north's is alike): set here 25 km,
  // and the eye's darkness and the wall's brightness (cloudTop's) add some 35 more.
  if(pc<6.0){
    float k=smoothstep(1.5, 0.4, pxD), ph=lon*0.01745329252*sg+clWindDeg(88.0*sg)*T*0.01745329252*0.5;
    float arm=sin(3.0*ph+5.0*log(pc+0.3)+3.0*dye), wall=exp(-(pc-1.4)*(pc-1.4)/0.12), eye=1.0-smoothstep(0.9, 1.35, pc);
    c=mix(c, vec3(0.40, 0.41, 0.40), 0.7*k*(1.0-smoothstep(0.7, 1.1, pc)));
    c*=1.0+k*(0.25*wall+0.08*arm*smoothstep(1.4, 2.2, pc)*smoothstep(6.0, 3.0, pc));
    zk+=k*(10.0*wall-15.0*eye+3.0*arm*smoothstep(1.4, 2.2, pc)*smoothstep(6.0, 3.0, pc)+4.0*eye*dye);
    // Close up, the eye's floor and wall in concentric rings of cloud some 0.35° apart.
    float er=sin(pc*18.0+1.5*dye)*(1.0-smoothstep(1.3, 1.8, pc))*smoothstep(0.12, 0.04, pxD);
    c*=1.0+0.12*er;
    zk+=2.0*er;
  }
  // The ribbon: a thin wave along the jet at 47°N, some 50 crests round the planet, half a
  // degree high, drifting a little slower than the jet; bright to its north, dark to its south.
  if(lat>44.0 && lat<51.0){
    float lr=47.2+0.5*sin((lon-0.7*clWindDeg(47.5)*T)*50.0*0.01745329252), dl=lat-lr;
    c*=1.0+0.14*smoothstep(0.6, 0.2, pxD)*clamp(dl/0.3, -1.0, 1.0)*exp(-dl*dl/0.4);
  }
  // Storm Alley, near 40°S (35°S planetocentric): small bright convective storms and their dark
  // companions, a few at a time in eight stretches round the planet, carried by the wind there.
  if(lat>-44.0 && lat<-37.0){
    float xs=lon-clWindDeg(-40.5)*T, k=floor(xs/45.0+0.5), hs=h12(vec2(mod(k, 8.0), 5.9));
    vec2 d=vec2((xs-k*45.0-(hs-0.5)*24.0)*cl/1.2, (lat+40.5+(hs-0.5))/0.8);
    float e=length(d), on=(1.0-smoothstep(0.6, 1.0, e))*step(0.5, hs);
    c=mix(c, c*0.82, 0.5*(1.0-smoothstep(0.8, 1.4, length(d-vec2(1.6, 0.4))))*step(0.5, hs));
    // Their tops rise well over the deck, billowed by the convection beneath.
    c=mix(c, vec3(0.97, 0.95, 0.90)*(1.0+0.1*dye), on);
    zk+=on*10.0*(1.0-e*e);
  }
#endif
  return vec4(c, zk);
}
#endif
const float BODY_FLAT[8]=float[8](${BODY_FLAT.map(v=>v.toFixed(5)).join(', ')});
// How bright each kind's disk is drawn, after its albedo, and its Minnaert k (planets.js BODY_GAIN, BODY_MINN).
const float BODY_GAIN[8]=float[8](${BODY_GAIN.map(v=>v.toFixed(2)).join(', ')}), BODY_MINN[8]=float[8](${BODY_MINN.map(v=>v.toFixed(2)).join(', ')});
#if DETAIL_MAP
// The relief of the bodies with heights (surfaces.js SURF_RELIEF, in their maps' alpha), as the
// Moon's (shader_sky.js reliefLight): at surface point nrm (longitude lon, latitude lat; pole n,
// prime meridian mp), lit from L and seen from V, the slope over two texels or the pixel (pxS
// degrees) lit by Minnaert's law (k km, terminator width w), and the Sun, its disk sunA radians in
// radius, hidden behind rims and peaks out some 14 steps toward it, the ray rising off the curved
// ground. With the Sun lower than the highest ground can see past (sqrt(2·span/R) below the
// sphere's horizon) everything is dark. Ground the viewer cannot see, a slope turned away or ground
// behind a rim toward the viewer near the limb, keeps the smooth sphere's light litS, so shadows
// hidden behind the rims that cast them, near full phase, are not drawn.
// On a flattened body (Ceres, Vesta, Phobos) the maps' latitudes are planetocentric: pc is the
// surface point's direction from the middle, nrm the spheroid's normal there; the heights tilt nrm,
// and the walks toward the Sun and the viewer go over the sphere through pc.
float surfReliefLit(float c, vec3 nrm, vec3 pc, vec3 n, vec3 mp, vec3 L, vec3 V, float lon, float lat, float pxS, float km, float w, float litS){
  // Mercury's and Mars's maps are 4096 texels round (surfTex's level 3 past a 512-texel map's), the
  // rest 1024 (level 1).
  float kind=mod(c, ${SURF_KINDS}.0), big=kind>0.5&&kind<2.5?1.0:0.0, lv=big>0.5?3.0:1.0;
  vec4 hrs=SURF_HRS[int(kind+0.5)];
  float R=hrs.z, span=hrs.y, sunA=hrs.w;
  float tD=360.0/(big>0.5?4096.0:1024.0), st=max(pxS/tD, 2.0), l5=log2(st)-1.0-lv, d=st*tD, dr=d*0.01745329252;
  vec3 tE=cross(n, pc); float cl=length(tE); tE=cl>1e-4?tE/cl:mp; vec3 tN=cross(pc, tE), cE=cross(n, mp);
  float dE=(surfH(c, lon+d, lat, l5)-surfH(c, lon-d, lat, l5))/(2.0*dr*R*max(cl, 0.05));
  float dN=(surfH(c, lon, lat+d, l5)-surfH(c, lon, lat-d, l5))/(2.0*dr*R);
  vec3 nR=normalize(nrm-dE*tE-dN*tN);
  float mu0=dot(nR, L), mu=dot(nR, V), m0s=dot(nrm, L), mus=dot(nrm, V), cut=sqrt(2.0*span/R);
  float sh=m0s>-cut?1.0:0.0, hid=smoothstep(0.08, 0.0, mu);
  bool toS=m0s>-cut&&m0s<0.4, toV=mus<0.35;
  if(toS||toV){
    float p0s=dot(pc, L), pvs=dot(pc, V);
    vec3 dS=toS?normalize(L-pc*p0s):pc, dV=toV?normalize(V-pc*pvs):pc;
    float eS=asin(clamp(m0s, -1.0, 1.0)), eV=asin(clamp(mus, -1.0, 1.0)), h0=surfH(c, lon, lat, l5), oS=-1.0, oV=-1.0, s=1.5*dr;
    for(int k=0;k<14;k++){
      float lk=max(l5, log2(s/(tD*0.01745329252)/3.0)-lv);
      if(toS){ vec3 q=pc*cos(s)+dS*sin(s); float hk=surfH(c, atan(dot(q, cE), dot(q, mp))*57.2957795, asin(clamp(dot(q, n), -1.0, 1.0))*57.2957795, lk); oS=max(oS, atan(hk-((R+h0)*cos(eS)/max(cos(eS+s), 1e-3)-R), R*s)); }
      if(toV){ vec3 q=pc*cos(s)+dV*sin(s); float hk=surfH(c, atan(dot(q, cE), dot(q, mp))*57.2957795, asin(clamp(dot(q, n), -1.0, 1.0))*57.2957795, lk); oV=max(oV, atan(hk-((R+h0)*cos(eV)/max(cos(eV+s), 1e-3)-R), R*s)); }
      s*=1.38;
    }
    if(toS) sh=smoothstep(sunA, -sunA, oS);
    if(toV) hid=max(hid, smoothstep(-0.002, 0.002, oV));
  }
  float litR=smoothstep(-w, w, mu0)*sh*min(pow(max(mu0, 0.0)+0.01, km)*pow(max(mu, 0.05), km-1.0), 1.3);
  return mix(litR, litS, hid);
}
#endif
// A body's disk where the view ray is o (the offset across the sky, in drawn radii) and the line of
// sight v: its lit color (rgb) and coverage (a), the surface point x and how far along v it lies
// (t, toward the observer negative). The disk is the flattened spheroid about pole n (its kind's, or
// the body's own, bS.w less 1, when that is past 0.5), lit from L, darkening toward the terminator
// and, by its Minnaert k, the limb; rPx is its radius in pixels. A body with heights in its map has
// them shape its outline too: the ray is taken to graze the ground where it passes closest to the
// spheroid, raised or sunk by the height there (Vesta's south flattened by its basins, their central
// peak standing out; Phobos's long axes).
vec4 bodyDisk(vec3 o, vec3 v, vec3 n, vec3 L, int kind, float rPx, vec3 tint, vec4 M, out vec3 x, out float t){
  float f=bS.w>0.5?bS.w-1.0:BODY_FLAT[kind], k=1.0/(1.0-f)-1.0;
  vec3 op=o+k*dot(o, n)*n, vp=v+k*dot(v, n)*n;
  float a=dot(vp, vp), bh=dot(op, vp)/a, rho2=max(dot(op, op)-bh*bh*a, 0.0);
  // East longitude (degrees) from the prime meridian.
  vec3 mp=M.xyz-n*dot(M.xyz, n); mp=dot(mp, mp)>1e-8?normalize(mp):normalize(cross(n, abs(n.x)<0.9?vec3(1.0, 0.0, 0.0):vec3(0.0, 1.0, 0.0)));
  float edge=1.0;
#if DETAIL_MAP
  if(M.w>-0.5 && mod(M.w, ${SURF_KINDS}.0)>0.5 && rPx>2.0){
    // The closest point, back from the stretched sphere to the spheroid, and the height there.
    vec3 sp=op-bh*vp; sp/=max(length(sp), 1e-6);
    vec3 pl=normalize(sp-(k/(1.0+k))*dot(sp, n)*n);
    vec4 hrs=SURF_HRS[int(mod(M.w, ${SURF_KINDS}.0)+0.5)];
    float hl=surfH(M.w, atan(dot(pl, cross(n, mp)), dot(pl, mp))*57.2957795, asin(clamp(dot(pl, n), -1.0, 1.0))*57.2957795, log2(max(160.0/rPx, 1e-6)));
    edge=1.0+hl/hrs.z;
  }
#endif
  float cov=clamp(0.5+(edge-sqrt(rho2))*rPx, 0.0, 1.0);
  t=1e9; x=o;
  if(cov<=0.0) return vec4(0.0);
#if DETAIL_MAP
  // Within a raised or sunk outline, the ray is moved in toward the middle, by the whole of the
  // height at the outline and none of it at the middle, so the outline meets the spheroid's limb:
  // past the limb every ray would meet the same limb point, the map smeared out from it.
  if(edge!=1.0){
    float s=1.0+(edge-1.0)*rho2/(edge*edge);
    op=bh*vp+(op-bh*vp)/s; o=op-(k/(1.0+k))*dot(op, n)*n; rho2/=s*s;
  }
#endif
  t=-bh-sqrt(max(1.0-rho2, 0.0)/a); x=o+t*v;
  vec3 nrm=normalize(x+(1.0/((1.0-f)*(1.0-f))-1.0)*dot(x, n)*n), pc=normalize(x);
  float mu0=dot(nrm, L), mu=max(dot(nrm, -v), 0.05), w=1.5/max(rPx, 1.0);
  float km=BODY_MINN[kind], lit=smoothstep(-w, w, mu0)*min(pow(max(mu0, 0.0)+0.01, km)*pow(mu, km-1.0), 1.3);
  float lat=asin(clamp(dot(nrm, n), -1.0, 1.0))*57.2957795;
  float lon=atan(dot(nrm, cross(n, mp)), dot(nrm, mp))*57.2957795;
  // The surface's degrees to a pixel there, foreshortened toward the limb.
  float pxS=57.2957795/max(rPx, 1.0)/max(mu, 0.08);
  vec3 alb=bodyAlbedo(kind, lat, tint);
#if DETAIL_JUP || DETAIL_SAT || DETAIL_NEP
#if DETAIL_JUP
  const int GK=3;
#elif DETAIL_SAT
  const int GK=4;
#else
  const int GK=6;
#endif
  if(kind==GK){
    // Deep in a zoom the clouds' finest detail, about 0.1° (less toward the poles, where the cells
    // narrow with the meridians), spans many pixels: there they are read from the ALB_PASS's grid
    // of one texel to albK.x pixels, where a texel is under 0.0125°, an eighth of the detail, and
    // the four texels about the pixel are on the disk, and worked out here everywhere else.
    vec4 ca=vec4(0.0);
#if !ALB_PASS
    if(albK.x>1.5 && albK.x*pxS*16.0<=min(0.2, 0.4*cos(lat*0.01745329252))) ca=texture(albTex, gl_FragCoord.xy/(albK.x*vec2(textureSize(albTex, 0))));
#endif
    float aux=GK==4?dot(n, L):atan(dot(grsDir, cross(n, mp)), dot(grsDir, mp))*57.2957795;
#if ALB_PASS
    alb=cloudColor(cloudFlow(lat, lon, pxS, aux), lat, lon, pxS, aux).rgb;
    return vec4(alb, cov>0.999?1.0:0.0);
#else
    bool cached=ca.a>0.999;
    vec4 F=vec4(0.0);
    if(!cached) F=cloudFlow(lat, lon, pxS, aux);
    // The cloud tops' relief at true scale (cloudTop, in radii): the normal tilted by the height's
    // slope across the pixels (Mikkelsen's surface gradient, from the screen derivatives of the
    // height and of x), and lit again. Seen from Earth the Sun is never more than 12° from behind
    // us, so the slopes show mostly as the light and shade of the limb and, most of all, of the
    // terminator, where the Sun is low over the clouds. Faded out within a few pixels of the limb,
    // where the pixels beside a pixel may lie off the disk.
    // The slope is the height's 1.5 pixels either way in x and in y: the flow's place and the
    // latitude and longitude are smooth across the pixels, so they are carried on by their screen
    // derivatives (longitudes wrapped) and the clouds colored there again (cloudColor, without
    // following the flow anew). Over three pixels, the sharp edges of the clouds' colors give
    // smooth slopes; the screen derivative of the height itself, taken over each 2×2 block of
    // pixels, would turn them into stippled ridges. That is used only where the clouds were read
    // from the ALB_PASS's grid, smooth already (the storms' domes, cloudColor's a, are left out
    // there), or where a block of pixels mixes both.
    vec2 qX=dFdx(F.xy), qY=dFdy(F.xy), aX=vec2(dFdx(lat), dFdx(lon)), aY=vec2(dFdy(lat), dFdy(lon));
    qX.x=mod(qX.x+64.0, 128.0)-64.0; qY.x=mod(qY.x+64.0, 128.0)-64.0;
    aX.y=mod(aX.y+180.0, 360.0)-180.0; aY.y=mod(aY.y+180.0, 360.0)-180.0;
    float fl=cached||F.w<0.5?0.0:1.0;
    bool fine=fl>0.5 && dFdx(fl)==0.0 && dFdy(fl)==0.0;
    // One call of cloudColor in a loop, which D3D keeps as a loop, rather than five copies of it (a
    // local array indexed by i would have it unrolled): the height here, and summed across in x and y.
    float hR=0.0, hX=0.0, hY=0.0;
    for(int i=0;i<5;i++){
      if(i>0 && !fine) break;
      float sx=i==1?1.5:i==2?-1.5:0.0, sy=i==3?1.5:i==4?-1.5:0.0;
      float la=lat+sx*aX.x+sy*aY.x, lo=lon+sx*aX.y+sy*aY.y;
      vec4 ci=vec4(ca.rgb, 0.0);
      if(i>0 || !cached) ci=cloudColor(vec4(F.xy+sx*qX+sy*qY, F.zw), la, lo, pxS, aux);
      if(i==0) alb=ci.rgb;
      float hi=(cloudTop(ci.rgb, clSpotE(la, lo, aux))+ci.a)/CL_RKM;
      if(i==0) hR=hi; else if(i<3) hX+=sx*hi/4.5; else hY+=sy*hi/4.5;
    }
    float dhX=dFdx(hR), dhY=dFdy(hR);
    if(!fine){ hX=dhX; hY=dhY; }
    // Where the flow is stretched past a few times the pixel (just within the Red Spot's rim, where
    // its turning dies away), the clouds' place jumps from pixel to pixel and their slope is noise:
    // there it is left out.
    float qs=max(length(qX), length(qY))/(pxS*0.355556/max(cos(lat*0.01745329252), 0.1));
    float hK=1.0-smoothstep(4.0, 8.0, qs);
    hX*=hK; hY*=hK;
    vec3 dX=dFdx(x), dY=dFdy(x), r1=cross(dY, nrm), r2=cross(nrm, dX);
    float det=dot(dX, r1), rim=smoothstep(2.0, 4.0, 0.5*mu*mu*rPx);
    if(abs(det)>1e-20){
      vec3 nB=normalize(nrm-rim*(hX*r1+hY*r2)/det);
      float mu0B=dot(nB, L), muB=max(dot(nB, -v), 0.05);
      lit=smoothstep(-w, w, mu0)*min(pow(max(mu0B, 0.0)+0.01, km)*pow(muB, km-1.0), 1.3);
    }
#endif
  }
#endif
  if(kind==4) alb=satSeason(alb, lat, dot(n, L));
  alb=eraAlb(kind, alb);
#if DETAIL_MAP
  // A body with a spacecraft map (M.w its code, surfaces.js) shows it, mipmapped to the pixel, at the
  // planetocentric latitude the maps are drawn in.
  float latC=asin(clamp(dot(pc, n), -1.0, 1.0))*57.2957795;
  if(M.w>-0.5) alb=surfAt(M.w, lon, latC, log2(max(512.0/360.0*pxS, 1e-6)));
  // The relief of those with heights, once the disk is a few pixels across.
  if(M.w>-0.5 && mod(M.w, ${SURF_KINDS}.0)>0.5 && rPx>8.0) lit=surfReliefLit(M.w, nrm, pc, n, mp, L, -v, lon, latC, pxS, km, w, lit);
#endif
#if !DETAIL_JUP
  if(kind==3 && grsAB.x>0.0) alb=grsPaint(alb, nrm, n, lat);
#endif
  return vec4(alb*lit*BODY_GAIN[kind], cov);
}
// Saturn's rings (rings.js): saturnRing(r, w), the measured rings at r planet radii averaged over
// r±w, shaded for the day.
${SAT_RING_GLSL}`;
const BODYFS_SRC=`#version 300 es
precision highp float;
#define DETAIL_JUP 1
#define DETAIL_SAT 1
#define DETAIL_NEP 1
#define DETAIL_MAP 1
#ifndef ALB_PASS
#define ALB_PASS 0
#endif
// A giant's clouds worked out ahead on a coarser grid (ALB_PASS, which writes them): albK.x pixels
// to a texel, 0 for none.
uniform sampler2D albTex; uniform vec4 albK;
uniform sampler2D sky; uniform sampler2D noiseTex; uniform sampler2D hitInfo; uniform highp sampler2DArray dsoTex;
uniform vec2 res, hitScale; uniform float yaw, pitch, fov, showScn, refK, rCd, mwK, moonGain, starPx, nr, na;
// 0 with the air off (sunset.js airOff): no reddening.
uniform float airOn;
uniform vec4 fineT; uniform vec3 grsDir; uniform vec4 grsAB;
// The body (as the sky shader's bodyP..bodyM, one of them), the moons' shadows falling on it, and
// the Sun's and Moon's directions and drawn radii (w, 0 when not up). For a moon of Saturn that the
// rings may shade (planets.js ring), bR its middle from Saturn's (Saturn radii) and its radius, bRN
// Saturn's pole and the Sun's angular radius there; bR.w 0 for any other body.
uniform vec4 bP, bC, bL, bN, bS, bM, bR, bRN;
// A giant's clouds in its youth (planets.js giantEra; eraAlb), and w 1 for Oceanus.
uniform vec4 bE;
// Uranus's rings (planets.js URA_RINGS, uraRingEl): each ring's semimajor axis, a·e, half its mean
// width (Uranus's radii) and periapse (radians, from uRingAx about the IAU pole bN backwards).
uniform vec4 uRingEl[${URA_RINGS.length}]; uniform vec3 uRingAx;
uniform vec4 shadowM[${SHADOW_MAX}], shadowK[${SHADOW_MAX}]; uniform float shadowCnt;
uniform vec4 sunQ, moonQ;
out vec4 fragColor;
${OUT_GLSL}
float h12(vec2 p){
  vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973));
  q+=dot(q, q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float vN(vec2 p){
  vec2 i=floor(p), f=fract(p);
  return textureLod(noiseTex, (i+f*f*(3.0-2.0*f)+0.5)/128.0, 0.0).r;
}
${AIRMASS_GLSL}
${NAKED_EYE_GLSL}
float extinctionAt(float el, float k){ return pow(10.0, -0.4*k*(airmass(max(el, 0.0))-1.0)); }
float bennett(float app){ return app>80.0?0.0:(1.0/tan((app+7.31/(app+4.4))*0.01745329252))/60.0; }
float trueAlt(float app){ return app-refK*bennett(app); }
${VIEW_RAY_GLSL}
${SURF_GLSL}
${BODY_GLSL}
// Uranus's rings at xr (Uranus's radii, in the equator), averaged over radii xr±w: brightness,
// opacity toward the viewer and the Sun, and the gray part of the brightness (all of it), as
// saturnRing. Each ring the ellipse of its orbit, its width growing with its radius and its depth
// thinning in proportion, so that what it blocks is the same all round; a band of particles lit
// and seen as Saturn's rings' (rings.js), but dark: an opaque ring lit and seen square on is drawn
// 0.05, against the B ring's 0.95, as the particles' albedo of a few hundredths (Voyager) makes it.
const float URA_TAU[${URA_RINGS.length}]=float[${URA_RINGS.length}](${URA_RINGS.map(r=>r[7].toFixed(3)).join(', ')});
const float URA_DWDR[${URA_RINGS.length}]=float[${URA_RINGS.length}](${URA_RINGS.map(r=>r[6].toFixed(3)).join(', ')});
vec4 uranusRing(vec3 xr, float w, float muV, float mu0, bool lit){
  float r=length(xr);
  if(r+w<1.6 || r-w>2.06) return vec4(0.0);
  vec3 n=bN.xyz; float th=3.14159265-atan(dot(xr, cross(n, uRingAx)), dot(xr, uRingAx));
  muV=max(muV, 0.002); mu0=max(mu0, 0.002);
  vec4 acc=vec4(0.0);
  for(int k=0;k<${URA_RINGS.length};k++){
    vec4 E=uRingEl[k];
    float e=E.y/E.x, rr=E.x*(1.0-e*e)/(1.0+e*cos(th-E.w)), hw=max(E.z+0.5*URA_DWDR[k]*(rr-E.x), 1e-6);
    float f=max(0.0, min(r+w, rr+hw)-max(r-w, rr-hw))/(2.0*w);
    if(f<=0.0) continue;
    float tau=URA_TAU[k]*E.z/hw, eV=exp(-tau/muV), e0=exp(-tau/mu0);
    float I=lit?0.1*mu0/(muV+mu0)*(1.0-eV*e0):0.1*(abs(muV-mu0)<1e-4?tau/muV*eV:mu0/(muV-mu0)*(eV-e0));
    acc+=f*vec4(I, 1.0-eV, 1.0-e0, I);
  }
  return acc;
}
void main(){
  float fy=(fov<2e-3?0.5*fov:tan(fov*0.5));
  // The pixel: in the ALB_PASS, the full view's at this texel's middle.
#if ALB_PASS
  vec2 FC=gl_FragCoord.xy*albK.x;
#else
  vec2 FC=gl_FragCoord.xy;
#endif
  vec3 rd=viewRay(FC, res, fov, yaw, pitch);
  float elevDeg=asin(clamp(rd.z, -1.0, 1.0))*57.2957795, hw=max(fwidth(elevDeg), 0.04);
  // Not below the horizon, behind the scenery, or behind the Moon.
  if(elevDeg<=-hw) discard;
  if(showScn>0.5 && texelFetch(hitInfo, ivec2(FC*hitScale), 0).r>0.0) discard;
  float te=trueAlt(elevDeg);
  if(te<=0.0) discard;
  float comp=atan(rd.x, rd.y); if(comp<0.0) comp+=6.28318530718;
  float teR=te*0.01745329252, cth=cos(teR);
  vec3 src=vec3(sin(comp)*cth, cos(comp)*cth, sin(teR));
  if(moonQ.w>0.0 && dot(src, moonQ.xyz)>cos(moonQ.w)) discard;
  vec4 skyT=texture(sky, vec2((fract(comp/6.28318530718)*na+0.5)/(na+1.0), ((90.0-max(elevDeg, 0.0))/90.0*nr+0.5)/(nr+1.0)));
  float rBg=pow(10.0, skyT.a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)});
  bool inSun=sunQ.w>0.0 && dot(src, sunQ.xyz)>cos(sunQ.w);
  int kind=int(mod(bN.w, 8.0)+0.5);
  bool ringed=kind==4 && bN.w<15.5, uRinged=kind==5 && bN.w<15.5;
  if(inSun && mod(bN.w, 16.0)<7.5) discard;
  // Its brightness as the sky shader's point's: by its magnitude through the air against the
  // naked-eye limit here; the air dims it and reddens it, green and blue losing about 0.07 and 0.2
  // magnitudes more than red to each airmass.
  float lim=nakedEyeLimit(rBg*rCd), pxA=2.0*fy/res.y;
  float dm=-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25), dim=pow(10.0, -0.2*dm);
  vec3 T=dim*exp(-airOn*vec3(0.0, 0.064, 0.184)/max(sin(teR), 0.04));
  float rPx=bP.w/pxA, diskK=smoothstep(1.0, 3.0, rPx), vis=1.0-smoothstep(lim-0.8, lim+0.2, bL.w+dm-moonGain);
  // The offset from the body: zoomed in, from the image plane (as the sky shader's).
  vec3 dd=src-bP.xyz;
  if(fy<0.02){
    vec2 fuv=((FC/res)*2.0-1.0)*vec2(fy*res.x/max(res.y, 1.0), fy);
    float fcp=cos(pitch), fsp=sin(pitch);
    vec3 axR=vec3(cos(yaw), -sin(yaw), 0.0), axU=vec3(-sin(yaw)*fsp, -cos(yaw)*fsp, fcp);
    dd=axR*(fuv.x-bS.x)+axU*((fuv.y-bS.y)*bS.z);
  }
  // Over the radius's sine; for a radius under a milliradian the radius itself, as exact there and
  // safe from the GPU's sine, which loses its last digits for tiny angles (a small moon deep in the
  // zoom, a few 1e-7 radians, was drawn at half its size).
  vec3 o=(dd-bP.xyz*dot(dd, bP.xyz))/(bP.w<1e-3?bP.w:sin(bP.w)), x; float t;
#if ALB_PASS
  fragColor=bodyDisk(o, bP.xyz, bN.xyz, bL.xyz, kind, rPx, bC.rgb, bM, x, t);
  return;
#endif
  float hz=smoothstep(-hw, hw, elevDeg);
  if(inSun){
    // A planet nearer than the Sun, dark against it: the sky without the Sun laid over it.
    vec4 dk=bodyDisk(o, bP.xyz, bN.xyz, bL.xyz, kind, rPx, bC.rgb, bM, x, t);
    float a=dk.a*min(rPx, 1.0)*hz;
    fragColor=toOutPre(vec4(skyT.rgb*a, a));
    return;
  }
  if(vis<=0.0 || diskK<=0.0) discard;
  vec4 dk=bodyDisk(o, bP.xyz, bN.xyz, bL.xyz, kind, rPx, bC.rgb, bM, x, t);
  vec3 dc=dk.rgb*dk.a;
  if(dk.a>0.0) for(int k=0;k<${SHADOW_MAX};k++){
    if(float(k)>=shadowCnt) break;
    vec4 M=shadowM[k]; vec2 K=shadowK[k].xy;
    vec3 q=x-M.xyz; float along=dot(q, bL.xyz);
    if(along>=0.0) continue;
    float perp=length(q-along*bL.xyz), spread=-along*K.y, pw=0.7/max(rPx, 1.0);
    dc*=1.0-0.97*(1.0-smoothstep(max(K.x-spread, 0.0)-pw, K.x+spread+pw, perp));
  }
  if(bR.w>0.0 && dk.a>0.0){
    // A moon of Saturn in the rings' shadow, as the globe is: where the line to the Sun from each
    // point crosses the rings, what they let through, blurred by a pixel's width and the Sun's
    // disk seen from that far behind them, both stretched across the rings by their slant.
    vec3 X=bR.xyz+bR.w*x; float ln=dot(bL.xyz, bRN.xyz), ts=-dot(X, bRN.xyz)/ln;
    if(abs(ln)>1e-4 && ts>0.0) dc*=1.0-saturnRing(length(X+ts*bL.xyz), max(bR.w/max(rPx, 1.0), ts*bRN.w)/max(abs(ln), 0.02)).z;
  }
  float vn=dot(bP.xyz, bN.xyz);
  if(ringed && abs(vn)>1e-4){
    // The rings, in the equator: lit on the Sun's side (seen from the other, only what light
    // gets through), dark in the planet's shadow, and casting their own shadow on it, blurred by
    // a pixel's width and the Sun's (0.0015 planet radii across the gap).
    vec3 Lr=bL.xyz; float ln=dot(Lr, bN.xyz);
    if(dk.a>0.0){ float ts=-dot(x, bN.xyz)/ln; if(ts>0.0) dc*=1.0-saturnRing(length(x+ts*Lr), max(0.8/rPx/max(abs(ln), 0.05), 0.0015)).z; }
    float tr=-dot(o, bN.xyz)/vn; vec3 xr=o+tr*bP.xyz;
    vec4 rg=saturnRing(length(xr), 0.8/rPx/max(abs(vn), 0.03));
    if(rg.y>0.0){
      // Saturn's shadow on them: the oblate globe's outline seen from the Sun, 1 across its equator
      // and sqrt(c²cos²B+sin²B) along its pole (c the polar radius, B the Sun's latitude), its edge
      // blurred by a pixel and by the Sun's disk (0.00049 radians) from that far behind the globe.
      // Nearly edge-on, the rings are thinner than a pixel.
      float s=dot(xr, Lr), sh=1.0, fade=smoothstep(0.0, 0.03, abs(vn));
      if(s<0.0){
        vec3 e1=normalize(cross(bN.xyz, Lr)), e2=cross(Lr, e1), q=xr-s*Lr;
        float c=1.0-BODY_FLAT[4], pb=sqrt(c*c*(1.0-ln*ln)+ln*ln), pw=max(1.0/rPx, -s*0.00049);
        sh=smoothstep(1.0-pw, 1.0+pw, length(vec2(dot(q, e1), dot(q, e2)/pb)));
      }
      vec3 rc=mix(vec3(0.86, 0.78, 0.64), vec3(0.74, 0.73, 0.70), clamp(rg.w/max(rg.x, 1e-6), 0.0, 1.0))*rg.x*sh*fade;
      float ro=rg.y*fade;
      dc=tr<t?rc+dc*(1.0-ro):dc+rc*(1.0-dk.a);
    }
  }
  if(uRinged && abs(vn)>1e-4){
    // Uranus's rings, as Saturn's: lit on the Sun's side, in the planet's shadow behind it, and
    // casting their shadows on it, blurred by a pixel's width.
    vec3 Lr=bL.xyz; float ln=dot(Lr, bN.xyz), muV=abs(vn), mu0=abs(ln); bool lit=ln*vn<0.0;
    if(dk.a>0.0){ float ts=-dot(x, bN.xyz)/ln; if(ts>0.0) dc*=1.0-uranusRing(x+ts*Lr, max(0.8/rPx/max(mu0, 0.05), 1e-5), muV, mu0, lit).z; }
    float tr=-dot(o, bN.xyz)/vn; vec3 xr=o+tr*bP.xyz;
    vec4 rg=uranusRing(xr, 0.8/rPx/max(muV, 0.03), muV, mu0, lit);
    if(rg.y>0.0){
      float s=dot(xr, Lr), sh=1.0, fade=smoothstep(0.0, 0.03, muV);
      if(s<0.0){
        vec3 e1=normalize(cross(bN.xyz, Lr)), e2=cross(Lr, e1), q=xr-s*Lr;
        float c=1.0-BODY_FLAT[5], pb=sqrt(c*c*(1.0-ln*ln)+ln*ln), pw=1.0/rPx;
        sh=smoothstep(1.0-pw, 1.0+pw, length(vec2(dot(q, e1), dot(q, e2)/pb)));
      }
      vec3 rc=vec3(0.72, 0.71, 0.69)*rg.x*sh*fade;
      float ro=rg.y*fade;
      dc=tr<t?rc+dc*(1.0-ro):dc+rc*(1.0-dk.a);
    }
  }
  // Added to what is behind, except a moon on the near side of its planet (bN.w past 32), which
  // hides the planet's disk and rings under it: added, the rings' light would show through it.
  fragColor=toOutPre(vec4(dc*T*diskK*vis*hz, bN.w>31.5?dk.a*diskK*vis*hz:0.0));
}`;
// The bodies' program with the close-up detail in set f ('jup', 'sat', 'map') and none other; Jupiter's
// and Saturn's clouds share their functions' names, so a set holds at most one of the two.
// With alb, the pass that works out a giant's clouds alone, on a coarser grid (ALB_PASS).
function bodyFS(f, alb=false){
  const def=(k, on)=>s=>s.replace('#define DETAIL_'+k+' 1', '#define DETAIL_'+k+' '+(on?1:0));
  const src=[def('JUP', f.has('jup')), def('SAT', f.has('sat')&&!f.has('jup')), def('NEP', f.has('nep')&&!f.has('jup')&&!f.has('sat')), def('MAP', f.has('map'))].reduce((s, g)=>g(s), BODYFS_SRC);
  return keepLoops(alb?src.replace('#define DETAIL_MAP', '#define ALB_PASS 1\n#define DETAIL_MAP'):src);
}
const BODY_UNIFORMS=['res','hitScale','yaw','pitch','fov','showScn','refK','airOn','rCd','mwK','moonGain','starPx','nr','na','fineT','grsDir','grsAB',
  'bP','bC','bL','bN','bS','bM','bR','bRN','bE','shadowM[0]','shadowK[0]','shadowCnt','sunQ','moonQ','uRingEl[0]','uRingAx','albK'];
function setupBodyProg(gl, p){
  gl.useProgram(p);
  bindSamplers(gl, p, [['sky',0],['noiseTex',12],['hitInfo',10],['dsoTex',6],['satRingTex',16],['albTex',23]]);
  return {p, u:uniformLocs(gl, p, BODY_UNIFORMS)};
}
