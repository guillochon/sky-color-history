// The planets' and moons' disks, in a pass of their own after the sky's (vr_paint.js drawBodies):
// one draw per body, clipped to the box round its disk (and Saturn's rings), added to the sky
// already drawn, or over the Sun, for a planet in front of it, the sky's own colour laid over the
// Sun. The sky pass draws them only as points. Kept apart so that the close-up detail of Jupiter's
// clouds or of the spacecraft maps is a small program of its own, compiled only once the view
// zooms in on one of them (vr_init.js wantDetail): in the sky's program each cost a recompile of
// all of it, several seconds.
const BODY_GLSL=`
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
// Jupiter close up (bodyDisk, once its disk is a few dozen pixels across), after Voyager, Cassini,
// Juno and Hubble images: the clouds a tracer stirred by eddies and drawn out by the jets, so the
// belts and zones and the finer banding within them are marbled into curls and filaments, rougher
// in the belts than in the zones; the belts' edges rolled up by the Kelvin-Helmholtz instability
// of the shear between neighbouring jets into chains of curling billows; the Red Spot a vortex in
// the same flow, winding the clouds round it into its collar, with its turbulent wake; dark
// festoons trailing from the North Equatorial Belt's southern edge into the Equatorial Zone, with
// hot spots at their heads; barges; the chain of white ovals in the South South Temperate Belt;
// and the bands wandering, darkening and stirring along their length.
// The zonal wind (m/s, east positive) at planetographic latitude lat, the jets of the Cassini
// profile (Porco et al. 2003, Science 299, 1541) smoothed to Gaussians, and the same in degrees of
// longitude a day.
// jupWindS is the same smoothed over s degrees, each Gaussian widened and lowered to keep its area.
float jG(float x, float c, float w, float s){ float W=sqrt(w*w+s*s), d=(x-c)/W; return w/W*exp(-d*d); }
float jupWindS(float lat, float s){
  return 140.0*jG(lat, 23.7, 1.6, s)-30.0*jG(lat, 18.0, 2.5, s)+105.0*jG(lat, 7.0, 3.5, s)+60.0*jG(lat, 0.0, 4.0, s)+105.0*jG(lat, -7.0, 3.5, s)
        -55.0*jG(lat, -17.5, 2.5, s)+40.0*jG(lat, -26.5, 2.0, s)-25.0*jG(lat, -30.0, 2.0, s)+30.0*jG(lat, 31.0, 2.0, s)-20.0*jG(lat, 35.0, 2.0, s)+25.0*jG(lat, -35.0, 2.0, s);
}
float jupWind(float lat){ return jupWindS(lat, 0.0); }
float jupWindDeg(float lat){ return jupWind(lat)*0.06924/max(cos(lat*0.01745329252), 0.1); }
// Bands and zones (bodyAlbedo's), with edges w degrees wide.
float jupBelt(float lat, float w){
  return bandOf(lat, 7.0, 18.0, w)+bandOf(lat, -21.0, -8.0, w)+0.55*(bandOf(lat, 24.0, 31.0, w)+bandOf(lat, -33.0, -26.0, w))+0.3*(bandOf(lat, 36.0, 42.0, w*1.3)+bandOf(lat, -44.0, -38.0, w*1.3));
}
vec3 jupColor(float lat, float belt){
  return mix(mix(vec3(0.95, 0.91, 0.82), vec3(0.70, 0.53, 0.40), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.60, 0.58), smoothstep(45.0, 70.0, abs(lat)));
}
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
float jupSlow(float lon, float lat, float seed){
  float L=lon*0.01745329252;
  return 0.5+0.5*(0.5*sin(2.0*L+seed*6.1+lat*0.21)+0.3*sin(3.0*L+seed*2.3-lat*0.17)+0.2*sin(5.0*L+seed*4.7+lat*0.31));
}
// Positions round Jupiter are in cells of which 128 (the noise texture's period) make the full
// circle of longitude, so noise of whole multiples of them wraps seamlessly, and latitude in
// Mercator measure, so the cells stay round: jupY and jupLat turn latitude to and from it.
float jupY(float lat){ return log(tan(0.785398+clamp(lat, -84.0, 84.0)*0.00872665))*20.371833; }
float jupLat(float Y){ return (2.0*atan(exp(Y/20.371833))-1.5707963)*57.2957795; }
// The eddies' stream function at P (cells) and its gradient: three octaves of noise, cells three
// times as long along the winds as across, each scaled so that all turn alike, the finer a little
// weaker; an octave fades out before its eddies shrink under a few pixels (pxC cells). The eddies
// drift at u (cells a day), in two copies half a period apart, each restarting when the other is
// at full strength, so the shear never smears them out. Each octave has its own period, the
// smaller eddies living shorter (4, 2.6 and 1.7 days), and its own phase, so they renew at
// different times rather than all at once.
vec3 jupPsi(vec2 P, float u, float pxC, float T){
  vec3 g=vec3(0.0);
  // One loop over both copies and the octaves of each (D3D keeps a loop of six as a loop).
  for(int j=0;j<6;j++){
    float k=float(j/3), o=float(j-3*(j/3)), pd=4.0*pow(0.65, o), ph=T/pd+0.37*o;
    float wA=1.0-abs(2.0*fract(ph)-1.0), fk=fract(ph+0.5*k), wk=(k<0.5?wA:1.0-wA)/max(sqrt(wA*wA+(1.0-wA)*(1.0-wA)), 0.5);
    vec2 Q=vec2(P.x-u*fk*pd+k*41.0, P.y+k*17.0), f=vec2(0.5, 1.5)*exp2(o);
    vec3 n=vNg(Q*f+o*7.3, 128.0*f.x);
    g+=wk*smoothstep(2.0*pxC, 5.0*pxC, 1.0/f.x)*pow(0.8, o)/(f.x*f.y)*vec3(n.x-0.5, n.yz*f);
  }
  return g;
}
// How strongly the eddies stir at q (cells), T days: most in the belts and their edges and toward
// the poles, less in the zones; in patches of storms some 45 degrees long, calm stretches between,
// which drift with the wind smoothed over 8 degrees and break out and die away over a dozen days
// (two slices of noise, each drifting from its own start, the one fading in as the other fades
// out); not at all in the Red Spot (gC, gA as in jupiterAlbedo) and its collar, and most west of
// it, in the South Equatorial Belt, its turbulent wake.
float jupStir(vec2 q, vec2 gC, vec2 gA, float T){
  float la=jupLat(q.y), uS=jupWindS(la, 8.0)*0.024620/max(cos(la*0.01745329252), 0.1);
  vec2 E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA, wq=vec2((E.x+2.8)/1.8, (E.y-0.35)/0.75);
  float ph=T/12.0, i0=floor(ph), fr=fract(ph), pa=0.0;
  for(int k=0;k<2;k++){
    float sl=i0+float(k), n=vNg(vec2((q.x-uS*(T-12.0*sl))*0.0625+sl*3.7, q.y*0.4+sl*5.3), 8.0).x;
    pa+=(k==0?1.0-smoothstep(0.0, 1.0, fr):smoothstep(0.0, 1.0, fr))*smoothstep(0.3, 0.7, n);
  }
  float s=(0.55+0.65*clamp(jupBelt(la, 3.0), 0.0, 1.0)+0.5*smoothstep(40.0, 60.0, abs(la)))*(0.4+1.2*pa);
  return grsAB.x>0.0?s*(1.0+1.6*exp(-dot(wq, wq)))*smoothstep(1.0, 1.7, length(E)):s;
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
  // Faded to nothing before the edge of the billow's cell, so neighbours meet without a step.
  float win=(1.0-smoothstep(0.32, 0.48, abs(x-ix)))*(1.0-smoothstep(2.0*R, 3.0*R, abs(dy)));
  float a=ang*smoothstep(0.05, 0.3, hj)*(0.4+0.6*hj)*exp(-dot(d, d)/(Rk*Rk))*win, c=cos(a), s=sin(a);
  d=vec2(c*d.x-s*d.y, s*d.x+c*d.y);
  return vec2(cx+d.x/cl, b+(hk-0.5)*R*0.8+d.y);
}
// Jupiter's cloud tops at planetographic latitude lat and east longitude lon (System II, degrees),
// pxD degrees of the surface to a pixel, the Red Spot at longitude glon; T days (fineT.y). The
// clouds are a tracer: each point is turned by the billows, then followed back along the eddies'
// streamlines and round the Red Spot, which roll the edges of the belts and zones and the finer
// banding within them into curls and filaments, sheared out along the winds; the colour is the
// banding where it ends up. Then the festoons and hot spots, barges and white ovals.
vec3 jupiterAlbedo(float lat, float lon, float pxD, float glon){
  // The Red Spot (grsAB: its length and width in degrees, its latitude and redness; glon its
  // longitude) in cells: its middle, its half-axes, and where a point is in them.
  bool grs=grsAB.x>0.0;
  vec2 gC=vec2(glon*0.355556, jupY(grsAB.z)), gA=0.177778*vec2(grsAB.x, grsAB.y/cos(grsAB.z*0.01745329252));
  vec2 E0=vec2(mod(lon*0.355556-gC.x+64.0, 128.0)-64.0, jupY(lat)-gC.y)/gA;
  float e0=grs?length(E0):1e3;
  float w=clamp(pxD*2.0, 0.25, 1.5);
  if(pxD>2.5) return mix(jupColor(lat, jupBelt(lat, 1.5)), vec3(0.80, 0.42, 0.30), grsAB.w*(1.0-smoothstep(0.8, 1.0, e0)));
  float T=fineT.y, cl=max(cos(lat*0.01745329252), 0.1), pxC=pxD*0.355556/cl;
  // The bands wander a degree or so along their length, and darken along some stretches. The
  // wander drifts all at one rate, a turn in T's 2000 days, so it meets itself when T wraps:
  // drifting with each latitude's own wind it was sheared, late in T, into fine streaks.
  float s1=jupSlow(lon-0.18*T, lat, 1.0), s2=jupSlow(lon, lat, 2.0);
  // Stirring: strongest in the belts and their edges and toward the poles, calmer in the zones.
  // The billows: at each boundary between a belt and a zone, two chains, the second a third the
  // size of the first, each turning the way of the shear's vorticity there and carried along at
  // the wind of the boundary, active along some stretches of it and quiet along others and near
  // the Red Spot; a chain fades in once a billow spans several pixels.
  vec2 q=vec2(lon, lat);
  float B[12]=float[12](7.0, 18.0, 24.0, 31.0, 36.0, 42.0, -8.0, -21.0, -26.0, -33.0, -38.0, -44.0);
  for(int i=0;i<12;i++){
    float b=B[i];
    if(abs(q.y-b)>7.5) continue;
    float du=jupWind(b+0.5)-jupWind(b-0.5), sg=du>0.0?-1.0:1.0, st=clamp(abs(du)/25.0, 0.35, 1.0);
    float cb=max(cos(b*0.01745329252), 0.1), x0=q.x-jupWindDeg(b)*T;
    st*=smoothstep(0.1, 0.4, jupSlow(x0, b, 3.0+float(i)*0.71))*smoothstep(1.2, 2.0, e0);
    vec2 r=vec2(x0, q.y);
    float N=24.0, R=2.5, ang=5.0, sd0=0.37, sd1=0.0;
    for(int c=0;c<2;c++){
      float fade=smoothstep(R*0.3, R*0.15, pxD);
      if(fade<=0.0) break;
      r=khRoll(r, b, N, R, ang*sg*st*fade, float(i)*sd0+sd1, cb);
      N*=3.0; R/=3.0; ang-=0.3; sd0+=0.42; sd1+=0.37;
    }
    q=vec2(r.x+jupWindDeg(b)*T, r.y);
  }
  q=vec2(q.x*0.355556, jupY(q.y));
  // Each step of the way back, everything that moves the clouds is taken where they are then, not
  // where they end up, so the steps make a flow and the clouds are never folded over themselves.
  for(int s=0;s<16;s++){
    float la=jupLat(q.y), cq=max(cos(la*0.01745329252), 0.1);
    // The eddies drift with the wind smoothed over a few degrees: carried by the narrow jets
    // themselves they would be sheared into hairlines.
    vec3 g=jupPsi(q, jupWindS(la, 4.0)*0.06924/cq*0.355556, pxC, T);
    vec2 E=vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA;
    float e=grs?length(E):1e3, x=max(e-0.95, 0.0);
    // Along the streamlines of the eddies' stream function times their strength, which keeps the
    // flow from crowding the clouds into creases; and the jets' own shear (against the smoothed
    // wind) drawing what they stir out along the bands, though not across the Red Spot's edge.
    // The strength here and a twentieth of a cell east and north, in one loop (a loop of four
    // stays a loop in D3D, which would copy the function three times over).
    float Sv[3];
    for(int j=0;j<4;j++){ if(j==3) break; Sv[j]=jupStir(q+0.05*vec2(j==1, j==2), gC, gA, T); }
    float S=Sv[0], Sx=(Sv[1]-S)*20.0, Sy=(Sv[2]-S)*20.0;
    q+=0.05*vec2(-(S*g.z+g.x*Sy), S*g.y+g.x*Sx)+smoothstep(1.0, 1.7, e)*vec2(0.0025*(jupWind(la)-jupWindS(la, 4.0)), 0.0);
    // The Red Spot, an anticyclone, turning the clouds about it along its ellipses: faster toward
    // its edge, so what it draws in winds into spirals, and dying away beyond it. Round its edge
    // the flow also runs a little inward, so the collar is drawn in as arms spiralling onto the
    // rim rather than circling it in rings (followed back, outward).
    if(e<2.0){
      float a=-0.375*(0.7+0.3*smoothstep(0.3, 0.85, e))*exp(-x*x/0.08);
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
    float eT=length(E), a=-1.047*T*(1.0-smoothstep(0.86, 0.93, eT));
    gT=1.0-smoothstep(0.84, 0.88, eT)*(1.0-smoothstep(0.92, 0.95, eT));
    E=mat2(cos(a), sin(a), -sin(a), cos(a))*E; q=gC+E*gA;
  }
  float la=jupLat(q.y)+(2.0*s1-1.0)*0.9;
  float belt=jupBelt(la, w);
  vec3 c=jupColor(la, belt);
  // Finer banding within the belts and zones, from noise in the carried latitude, and patches
  // along them, both carried with the clouds; a band too fine for the pixels is left out.
  float yq=q.y, k1=smoothstep(1.5, 3.0, 0.4/pxC), k2=smoothstep(1.5, 3.0, 0.15/pxC);
  float dye=0.6*(vNg(vec2(yq*0.8, 3.0), 1e4).x-0.5)+0.5*k1*(vNg(vec2(yq*2.0, 9.0), 1e4).x-0.5)+0.35*k2*(vNg(vec2(yq*6.0, 1.0), 1e4).x-0.5)
           +0.5*k1*(vNg(q*vec2(1.0, 2.5)+5.0, 128.0).x-0.5)+0.3*k2*(vNg(q*vec2(3.0, 7.0)+2.0, 384.0).x-0.5);
  // Each band, and each finer band within it, a slightly different hue: redder or yellower,
  // greyer or bluer, a little lighter or darker, and so along its length, all carried with the
  // clouds like the banding itself.
  vec3 hv=vec3(vNg(vec2(yq*1.2, 21.0), 1e4).x, vNg(vec2(yq*3.0, 33.0), 1e4).x, vNg(q*vec2(1.0, 3.0)+40.0, 128.0).x)-0.5;
  hv.yz*=k1;
  c*=1.0+(0.5+0.5*belt)*(hv.x*vec3(0.10, -0.02, -0.14)+hv.y*vec3(0.04, 0.05, -0.10)+hv.z*vec3(-0.06, -0.02, 0.08)+0.08*(hv.x+hv.y));
  // Close up the zones whiter and the belts more orange; the belts darker and redder along some
  // stretches than others, and at their edges; the polar regions mottled.
  float pol=smoothstep(34.0, 56.0, abs(la));
  c*=mix(vec3(0.98, 1.0, 1.04), vec3(1.06, 0.97, 0.86), belt*(1.0-pol));
  c=mix(c, vec3(0.62, 0.57, 0.50), 0.8*pol);
  c=mix(c, c*vec3(0.92, 0.86, 0.82), belt*(s2-0.4));
  float bw=clamp(jupBelt(la, max(w, 1.2)), 0.0, 1.0);
  c*=1.0-0.2*bw*(1.0-bw)*4.0;
  // In the belts, brown streaks and pale filaments; in the zones, white and pale blue-grey.
  c=mix(c, c*vec3(0.80, 0.70, 0.62), belt*clamp(-dye*2.5, 0.0, 1.0));
  c=mix(c, vec3(0.94, 0.92, 0.86), belt*smoothstep(0.08, 0.3, dye)*0.75*(1.0-0.7*pol));
  c=mix(c, vec3(0.74, 0.77, 0.82), (1.0-belt)*smoothstep(0.08, 0.3, -dye)*0.45*(1.0-pol));
  c*=1.0+(0.12+0.4*pol)*mix(1.0-belt, 1.0, pol)*dye;
  // The Red Spot: what the vortex holds is red, deepest toward its edge, streaked by the same
  // clouds wound into it, with a darker rim; round it the pale Red Spot Hollow, which the belt
  // north of it bends away from.
  if(grs){
    float e=length(vec2(mod(q.x-gC.x+64.0, 128.0)-64.0, q.y-gC.y)/gA), ins=1.0-smoothstep(0.93, 1.0, e);
    c=mix(c, vec3(0.94, 0.92, 0.87), 0.75*(1.0-smoothstep(1.1, 1.45, e+0.25*dye))*(1.0-ins));
    vec3 red=mix(vec3(0.88, 0.55, 0.38), vec3(0.80, 0.38, 0.25), smoothstep(0.2, 0.8, e));
    red*=(1.0+0.5*dye*gT)*(1.0-0.22*smoothstep(0.8, 0.95, e));
    red=mix(red, vec3(0.92, 0.70, 0.55), smoothstep(0.12, 0.35, dye)*0.45*(1.0-smoothstep(0.6, 0.85, e)));
    // A paler spot (grsAB.w under 1) fades toward pale salmon, not the clouds wound up beneath it.
    c=mix(c, mix(vec3(0.93, 0.86, 0.78)*(1.0+0.15*dye*gT), red, grsAB.w), ins);
  }
  // The North Equatorial Belt's southern edge, about 7°N: dark blue-grey hot spots, gaps in the
  // clouds a few degrees long, and from some of them thin festoons curving west and down across the
  // Equatorial Zone; a dozen round the planet at uneven spacing, moving with its wind.
  if(lat>-1.0 && lat<9.5){
    float xf=lon-jupWindDeg(6.5)*T, sF=clamp((7.0-la)/6.5, 0.0, 1.0);
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
    float xo=lon-jupWindDeg(-41.0)*T, k=floor(xo/45.0+0.5), ho=h12(vec2(mod(k, 8.0), 3.3));
    vec2 d=vec2((xo-k*45.0-(ho-0.5)*20.0)*cl/2.2, (lat+41.0+(ho-0.5)*1.2)/1.4);
    float e=length(d);
    c=mix(c, c*0.85, 0.5*(1.0-smoothstep(1.0, 1.35, e))*smoothstep(0.85, 1.0, e)*step(0.4, ho));
    c=mix(c, vec3(0.96, 0.95, 0.92), (1.0-smoothstep(0.75, 1.0, e))*step(0.4, ho));
  }
  // Barges: dark red-brown cyclones in the North Equatorial Belt's northern edge, near 15°N.
  if(lat>11.0 && lat<19.0){
    float xb=lon-jupWindDeg(15.5)*T, k=floor(xb/40.0+0.5), hb=h12(vec2(mod(k, 9.0), 9.1));
    vec2 d=vec2((xb-k*40.0-(hb-0.5)*20.0)*cl/2.6, (lat-15.5)/1.0);
    c=mix(c, vec3(0.50, 0.30, 0.24), 0.7*(1.0-smoothstep(0.6, 1.0, length(d)))*step(0.55, hb));
  }
  return c;
}
const float BODY_FLAT[8]=float[8](${BODY_FLAT.map(v=>v.toFixed(5)).join(', ')});
// How bright each kind's disk is drawn, after its albedo, and its Minnaert k (planets.js BODY_GAIN, BODY_MINN).
const float BODY_GAIN[8]=float[8](${BODY_GAIN.map(v=>v.toFixed(2)).join(', ')}), BODY_MINN[8]=float[8](${BODY_MINN.map(v=>v.toFixed(2)).join(', ')});
// A body's disk where the view ray is o (the offset across the sky, in drawn radii) and the line of
// sight v: its lit colour (rgb) and coverage (a), the surface point x and how far along v it lies
// (t, toward the observer negative). The disk is the flattened spheroid about pole n, lit from L,
// darkening toward the terminator and, by its Minnaert k, the limb; rPx is its radius in pixels.
vec4 bodyDisk(vec3 o, vec3 v, vec3 n, vec3 L, int kind, float rPx, vec3 tint, vec4 M, out vec3 x, out float t){
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
  // East longitude (degrees) from the prime meridian.
  vec3 mp=M.xyz-n*dot(M.xyz, n); mp=dot(mp, mp)>1e-8?normalize(mp):normalize(cross(n, abs(n.x)<0.9?vec3(1.0, 0.0, 0.0):vec3(0.0, 1.0, 0.0)));
  float lon=atan(dot(nrm, cross(n, mp)), dot(nrm, mp))*57.2957795;
  // The surface's degrees to a pixel there, foreshortened toward the limb.
  float pxS=57.2957795/max(rPx, 1.0)/max(mu, 0.08);
  vec3 alb=bodyAlbedo(kind, lat, tint);
#if DETAIL_JUP
  if(kind==3) alb=jupiterAlbedo(lat, lon, pxS, atan(dot(grsDir, cross(n, mp)), dot(grsDir, mp))*57.2957795);
#endif
#if DETAIL_MAP
  // A body with a spacecraft map (M.w its code, surfaces.js) shows it, mipmapped to the pixel.
  if(M.w>-0.5) alb=surfAt(M.w, lon, lat, log2(max(512.0/360.0*pxS, 1e-6)));
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
#define DETAIL_MAP 1
uniform sampler2D sky; uniform sampler2D noiseTex; uniform sampler2D hitInfo; uniform highp sampler2DArray dsoTex;
uniform vec2 res, hitScale; uniform float yaw, pitch, fov, showScn, refK, rCd, mwK, moonGain, starPx, nr, na;
uniform vec4 fineT; uniform vec3 grsDir; uniform vec4 grsAB;
// The body (as the sky shader's bodyP..bodyM, one of them), the moons' shadows falling on it, and
// the Sun's and Moon's directions and drawn radii (w, 0 when not up).
uniform vec4 bP, bC, bL, bN, bS, bM;
uniform vec4 shadowM[${SHADOW_MAX}], shadowK[${SHADOW_MAX}]; uniform float shadowCnt;
uniform vec4 sunQ, moonQ;
out vec4 fragColor;
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
float nakedEyeLimit(float L){
  float msky=-2.5*log(max(L, 1e-12)/10.8e4)/2.302585;
  return 7.93-5.0*log(pow(10.0, 4.316-msky/5.0)+1.0)/2.302585;
}
float extinctionAt(float el, float k){ return pow(10.0, -0.4*k*(airmass(max(el, 0.0))-1.0)); }
float bennett(float app){ return app>80.0?0.0:(1.0/tan((app+7.31/(app+4.4))*0.01745329252))/60.0; }
float trueAlt(float app){ return app-refK*bennett(app); }
${VIEW_RAY_GLSL}
${SURF_GLSL}
${BODY_GLSL}
void main(){
  float fy=tan(fov*0.5);
  vec3 rd=viewRay(gl_FragCoord.xy, res, fov, yaw, pitch);
  float elevDeg=asin(clamp(rd.z, -1.0, 1.0))*57.2957795, hw=max(fwidth(elevDeg), 0.04);
  // Not below the horizon, behind the scenery, or behind the Moon.
  if(elevDeg<=-hw) discard;
  if(showScn>0.5 && texelFetch(hitInfo, ivec2(gl_FragCoord.xy*hitScale), 0).r>0.0) discard;
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
  bool ringed=kind==4 && bN.w<15.5;
  if(inSun && mod(bN.w, 16.0)<7.5) discard;
  // Its brightness as the sky shader's point's: by its magnitude through the air against the
  // naked-eye limit here; the air dims it and reddens it, green and blue losing about 0.07 and 0.2
  // magnitudes more than red to each airmass.
  float lim=nakedEyeLimit(rBg*rCd), pxA=2.0*fy/res.y;
  float dm=-2.5*log(max(extinctionAt(te, mwK), 1e-9))/2.302585+(mwK-0.25), dim=pow(10.0, -0.2*dm);
  vec3 T=dim*exp(-vec3(0.0, 0.064, 0.184)/max(sin(teR), 0.04));
  float rPx=bP.w/pxA, diskK=smoothstep(1.0, 3.0, rPx), vis=1.0-smoothstep(lim-0.8, lim+0.2, bL.w+dm-moonGain);
  // The offset from the body: zoomed in, from the image plane (as the sky shader's).
  vec3 dd=src-bP.xyz;
  if(fy<0.02){
    vec2 fuv=((gl_FragCoord.xy/res)*2.0-1.0)*vec2(fy*res.x/max(res.y, 1.0), fy);
    float fcp=cos(pitch), fsp=sin(pitch);
    vec3 axR=vec3(cos(yaw), -sin(yaw), 0.0), axU=vec3(-sin(yaw)*fsp, -cos(yaw)*fsp, fcp);
    dd=axR*(fuv.x-bS.x)+axU*((fuv.y-bS.y)*bS.z);
  }
  vec3 o=(dd-bP.xyz*dot(dd, bP.xyz))/sin(bP.w), x; float t;
  float hz=smoothstep(-hw, hw, elevDeg);
  if(inSun){
    // A planet nearer than the Sun, dark against it: the sky without the Sun laid over it.
    vec4 dk=bodyDisk(o, bP.xyz, bN.xyz, bL.xyz, kind, rPx, bC.rgb, bM, x, t);
    float a=dk.a*min(rPx, 1.0)*hz;
    fragColor=vec4(skyT.rgb*a, a);
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
      // Nearly edge-on, the rings are thinner than a pixel.
      float s=dot(xr, Lr), sh=s<0.0?smoothstep(0.97, 1.03, length(xr-s*Lr)):1.0, fade=smoothstep(0.0, 0.03, abs(vn));
      vec3 rc=mix(vec3(0.86, 0.78, 0.64), vec3(0.74, 0.73, 0.70), clamp(rg.w/max(rg.x, 1e-6), 0.0, 1.0))*rg.x*sh*fade;
      float ro=rg.y*fade;
      dc=tr<t?rc+dc*(1.0-ro):dc+rc*(1.0-dk.a);
    }
  }
  // Added to what is behind, except a moon on the near side of its planet (bN.w past 32), which
  // hides the planet's disk and rings under it: added, the rings' light would show through it.
  fragColor=vec4(dc*T*diskK*vis*hz, bN.w>31.5?dk.a*diskK*vis*hz:0.0);
}`;
// The bodies' program with the close-up detail in set f ('jup', 'map') and none other.
function bodyFS(f){
  return keepLoops(BODYFS_SRC.replace('#define DETAIL_JUP 1', '#define DETAIL_JUP '+(f.has('jup')?1:0)).replace('#define DETAIL_MAP 1', '#define DETAIL_MAP '+(f.has('map')?1:0)));
}
const BODY_UNIFORMS=['res','hitScale','yaw','pitch','fov','showScn','refK','rCd','mwK','moonGain','starPx','nr','na','fineT','grsDir','grsAB',
  'bP','bC','bL','bN','bS','bM','shadowM[0]','shadowK[0]','shadowCnt','sunQ','moonQ'];
function setupBodyProg(gl, p){
  gl.useProgram(p);
  bindSamplers(gl, p, [['sky',0],['noiseTex',12],['hitInfo',10],['dsoTex',6],['satRingTex',16]]);
  return {p, u:uniformLocs(gl, p, BODY_UNIFORMS)};
}
