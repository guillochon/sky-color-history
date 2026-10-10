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
// Juno and Hubble images: the belts' edges rolled up by the Kelvin-Helmholtz instability of the
// shear between neighbouring jets into chains of curling billows, on four scales one inside the
// next; turbulence carried along by the winds, rougher in the belts than in the zones; dark
// festoons trailing from the North Equatorial Belt's southern edge into the Equatorial Zone, with
// hot spots at their heads; barges; the chain of white ovals in the South South Temperate Belt;
// the bands wandering, darkening and stirring along their length; and the Red Spot's spiral
// streaks, collar, hollow and wake (grsPaintFine).
// The zonal wind (m/s, east positive) at planetographic latitude lat, the jets of the Cassini
// profile (Porco et al. 2003, Science 299, 1541) smoothed to Gaussians, and the same in degrees of
// longitude a day.
float jG(float x, float c, float w){ float d=(x-c)/w; return exp(-d*d); }
float jupWind(float lat){
  return 140.0*jG(lat, 23.7, 1.6)-30.0*jG(lat, 18.0, 2.5)+105.0*jG(lat, 7.0, 3.5)+60.0*jG(lat, 0.0, 4.0)+105.0*jG(lat, -7.0, 3.5)
        -55.0*jG(lat, -17.5, 2.5)+40.0*jG(lat, -26.5, 2.0)-25.0*jG(lat, -30.0, 2.0)+30.0*jG(lat, 31.0, 2.0)-20.0*jG(lat, 35.0, 2.0)+25.0*jG(lat, -35.0, 2.0);
}
float jupWindDeg(float lat){ return jupWind(lat)*0.06924/max(cos(lat*0.01745329252), 0.1); }
// Bands and zones (bodyAlbedo's), with edges w degrees wide.
float jupBelt(float lat, float w){
  return bandOf(lat, 7.0, 18.0, w)+bandOf(lat, -21.0, -8.0, w)+0.55*(bandOf(lat, 24.0, 31.0, w)+bandOf(lat, -33.0, -26.0, w))+0.3*(bandOf(lat, 36.0, 42.0, w*1.3)+bandOf(lat, -44.0, -38.0, w*1.3));
}
vec3 jupColor(float lat, float belt){
  return mix(mix(vec3(0.95, 0.91, 0.82), vec3(0.70, 0.53, 0.40), clamp(belt, 0.0, 1.0)), vec3(0.62, 0.60, 0.58), smoothstep(45.0, 70.0, abs(lat)));
}
// Noise round Jupiter in cells of which 128 (the noise texture's period) make the full circle of
// longitude, so it wraps seamlessly and never repeats; latitude in Mercator measure, so the cells
// stay round. X, Y in those cells; three kinds in one loop of octaves (the compiler keeps one copy),
// each down to twice the pixel (pxC cells): x the turbulence, y a finer texture, z streaks four
// times longer along the winds than across. The turbulence moves the bands' edges, so its octaves
// fall off faster than they shrink: its slope stays under one and an edge never folds over itself.
vec3 jupNoise(vec2 P, float pxC){
  vec3 a=vec3(0.5), ww=vec3(0.0), acc=vec3(0.0); float f=1.0;
  for(int o=0;o<10;o++){
    vec2 k=smoothstep(vec2(1.5*pxC), vec2(3.0*pxC), vec2(1.0, 0.25)/f);
    if(k.x<=0.0) break;
    float so=float(o)*7.3;
    acc+=a*vec3(k.x, k.x, k.y)*(vec3(vN(P*f+3.1+so), vN(P*f*2.0+9.7+so), vN(vec2(P.x, P.y*4.0)*f+5.3+so))-0.5); ww+=a;
    a*=vec3(0.4, 0.55, 0.55); f*=2.0;
  }
  return acc/max(ww, 1e-4);
}
// Slow change along the bands: sinusoids of 2, 3 and 5 waves round the planet, their phases
// drifting with latitude, between 0 and 1.
float jupSlow(float lon, float lat, float seed){
  float L=lon*0.01745329252;
  return 0.5+0.5*(0.5*sin(2.0*L+seed*6.1+lat*0.21)+0.3*sin(3.0*L+seed*2.3-lat*0.17)+0.2*sin(5.0*L+seed*4.7+lat*0.31));
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
  // Many billows have not rolled up; the rest by differing amounts.
  // Faded to nothing before the edge of the billow's cell, so neighbours meet without a step.
  float win=1.0-smoothstep(0.32, 0.48, abs(x-ix));
  float a=ang*smoothstep(0.3, 0.55, hj)*(0.4+0.6*hj)*exp(-dot(d, d)/(Rk*Rk))*win, c=cos(a), s=sin(a);
  d=vec2(c*d.x-s*d.y, s*d.x+c*d.y);
  return vec2(cx+d.x/cl, b+(hk-0.5)*R*0.8+d.y);
}
// Jupiter's cloud tops at planetographic latitude lat and east longitude lon (System II, degrees),
// pxD degrees of the surface to a pixel; T days (fineT.y).
vec3 jupiterAlbedo(float lat, float lon, float pxD){
  float w=clamp(pxD*2.0, 0.04, 1.5);
  if(pxD>2.5) return jupColor(lat, jupBelt(lat, 1.5));
  float T=fineT.y, cl=max(cos(lat*0.01745329252), 0.1), u=jupWindDeg(lat);
  float beltness=clamp(jupBelt(lat, 2.0), 0.0, 1.0);
  // Turbulence carried by the winds, in two copies half a period apart, each restarting when the
  // other is at full strength, so the shear never smears it out (a flow map, period 4 days).
  float ph=T/4.0, f1=fract(ph), f2=fract(ph+0.5), wA=1.0-abs(2.0*f1-1.0);
  float Y=log(tan(0.785398+clamp(lat, -80.0, 80.0)*0.00872665))*20.371833, pxC=pxD*0.355556/cl;
  vec2 pA=vec2((lon-u*f1*4.0)*0.355556, Y), pB=vec2((lon-u*f2*4.0)*0.355556+41.0, Y+17.0);
  vec3 nz=vec3(0.0);
  for(int k=0;k<2;k++) nz+=(k==0?1.0-wA:wA)*jupNoise(k==0?pB:pA, pxC);
  float tn=nz.x, tf=nz.y, tz=nz.z;
  // The bands wander a degree or so along their length, and their turbulence comes and goes.
  float s1=jupSlow(lon-u*T*0.05, lat, 1.0), s2=jupSlow(lon, lat, 2.0);
  vec2 q=vec2(lon, lat+(2.0*s1-1.0)*0.9+(0.4+0.8*beltness)*(0.6+0.8*s2)*tn);
  // The billows: at each boundary between a belt and a zone, up to four chains, each set turning the
  // way of the shear's vorticity there and carried along at the wind of the boundary, active along
  // some stretches of it and quiet along others.
  float B[12]=float[12](7.0, 18.0, 24.0, 31.0, 36.0, 42.0, -8.0, -21.0, -26.0, -33.0, -38.0, -44.0);
  for(int i=0;i<12;i++){
    float b=B[i];
    if(abs(q.y-b)>5.0) continue;
    float du=jupWind(b+0.5)-jupWind(b-0.5), sg=du>0.0?-1.0:1.0, st=clamp(abs(du)/25.0, 0.35, 1.0);
    float cb=max(cos(b*0.01745329252), 0.1), x0=q.x-jupWindDeg(b)*T;
    st*=smoothstep(0.25, 0.65, jupSlow(x0, b, 3.0+float(i)*0.71));
    vec2 r=vec2(x0, q.y);
    // Each chain a third the size of the last, fading in once a billow spans a dozen pixels or so:
    // a spiral any smaller can't be drawn and would alias into combs.
    float N=33.0, R=1.5, ang=2.6, sd0=0.37, sd1=0.0;
    for(int c=0;c<4;c++){
      float fade=smoothstep(R*0.22, R*0.11, pxD);
      if(fade<=0.0) break;
      r=khRoll(r, b, N, R, ang*sg*st*fade, float(i)*sd0+sd1, cb);
      N*=3.0; R/=3.0; ang-=0.2; sd0+=0.42; sd1+=0.37;
    }
    q=vec2(r.x+jupWindDeg(b)*T, r.y);
  }
  float belt=jupBelt(q.y, w);
  vec3 c=jupColor(q.y, belt);
  // The belts darker and redder along some stretches than others.
  c=mix(c, c*vec3(0.92, 0.86, 0.82), belt*(s2-0.4));
  // The North Equatorial Belt's southern edge, about 7°N: dark blue-grey hot spots, gaps in the
  // clouds a few degrees long, and from some of them thin festoons curving west and down across the
  // Equatorial Zone; a dozen round the planet at uneven spacing, moving with its wind.
  if(lat>-1.0 && lat<9.5){
    float xf=lon-jupWindDeg(6.5)*T, sF=clamp((7.0-q.y)/6.5, 0.0, 1.0);
    float k0=floor(xf/30.0), fest=0.0, hot=0.0;
    for(int j=0;j<2;j++){
      float k=k0+float(j), hf=h12(vec2(mod(k, 12.0), 7.7)), hg=h12(vec2(mod(k, 12.0), 3.1)), x0=k*30.0+(hf-0.5)*16.0;
      float lc=x0-(14.0+12.0*hg)*pow(sF, 1.2);
      float dx=(xf-lc)*cl+0.8*tn*(1.0+sF), wd=0.9*(1.0-0.5*sF)+0.25, dh=(xf-x0)*cl;
      fest=max(fest, exp(-dx*dx/(wd*wd))*smoothstep(0.05, 0.2, sF)*(1.0-smoothstep(0.55, 0.95, sF))*step(0.45, hf)*clamp(0.7+2.0*tf, 0.0, 1.2));
      hot=max(hot, exp(-dh*dh/(4.0+5.0*hg)-(q.y-7.0)*(q.y-7.0)/0.5)*step(0.25, hf));
    }
    c=mix(c, vec3(0.50, 0.53, 0.58), 0.45*fest+0.55*hot);
  }
  // White ovals in the South South Temperate Belt, near 41°S, eight cells round, some empty.
  if(lat>-46.0 && lat<-36.0){
    float xo=lon-jupWindDeg(-41.0)*T, k=floor(xo/45.0+0.5), ho=h12(vec2(mod(k, 8.0), 3.3));
    vec2 d=vec2((xo-k*45.0-(ho-0.5)*20.0)*cl/2.2, (q.y+41.0+(ho-0.5)*1.2)/1.4);
    float e=length(d);
    c=mix(c, c*0.85, 0.5*(1.0-smoothstep(1.0, 1.35, e))*smoothstep(0.85, 1.0, e)*step(0.4, ho));
    c=mix(c, vec3(0.96, 0.95, 0.92), (1.0-smoothstep(0.75, 1.0, e))*step(0.4, ho));
  }
  // Barges: dark red-brown cyclones in the North Equatorial Belt's northern edge, near 15°N.
  if(lat>11.0 && lat<19.0){
    float xb=lon-jupWindDeg(15.5)*T, k=floor(xb/40.0+0.5), hb=h12(vec2(mod(k, 9.0), 9.1));
    vec2 d=vec2((xb-k*40.0-(hb-0.5)*20.0)*cl/2.6, (q.y-15.5)/1.0);
    c=mix(c, vec3(0.50, 0.30, 0.24), 0.7*(1.0-smoothstep(0.6, 1.0, length(d)))*step(0.55, hb));
  }
  // Cloud texture: brightness from the same turbulence, and streaks along the winds, darker and
  // redder or paler in turn in the belts; the zones mostly paler, white plumes rather than smudges.
  float zt=(0.12+0.10*beltness)*tf+0.26*beltness*tz+(1.0-beltness)*0.10*max(tz, -0.1);
  c*=1.0+zt;
  c=mix(c, c*vec3(1.06, 0.95, 0.86), clamp(beltness*tz*3.0, 0.0, 1.0));
  return c;
}
// The Red Spot close up (after Juno, Voyager and Hubble): an anticyclone turning counterclockwise
// once in about six days at its edge, slower inside, its clouds drawn into spiral streaks; a paler
// orange-pink middle, the deepest red in a collar near the edge, a thin dark rim, and round it the
// pale Red Spot Hollow; to the west a turbulent wake in the South Equatorial Belt.
vec3 grsPaintFine(vec3 c, vec3 nrm, vec3 n, float lat, float pxD){
  vec3 a=normalize(nrm-n*dot(nrm, n)), d=normalize(grsDir-n*dot(grsDir, n));
  float dl=atan(dot(cross(d, a), n), dot(d, a))*57.2957795;
  vec2 E=vec2(dl/(0.5*grsAB.x), (lat-grsAB.z)/(0.5*grsAB.y));
  float e=length(E), T=fineT.y, pxE=pxD/(0.5*grsAB.y);
  // The wake: rough light and dark streaks west of the spot and a little north of its middle.
  vec2 wq=vec2((E.x+2.4)/1.9, (E.y-0.35)/0.7);
  float wake=exp(-dot(wq, wq))*smoothstep(0.9, 1.4, e);
  if(wake>0.01){
    // Filaments drawn out along the flow, three times longer than wide, folded by a slower swirl.
    vec2 wp=vec2(dl*0.35-T*1.5, lat*1.6+0.6*sin(dl*0.4+T*0.7));
    float wn=vN(wp+11.0)-0.5+0.5*(vN(wp*2.3+vec2(3.0, 7.0))-0.5);
    c=mix(c, wn>0.0?vec3(0.93, 0.90, 0.84):c*0.75, 0.75*wake*smoothstep(0.05, 0.3, abs(wn)));
  }
  float hol=1.0-smoothstep(1.15, 1.5, e+0.12*(vN(E*3.0+T*0.2)-0.5));
  c=mix(c, vec3(0.95, 0.92, 0.86), 0.8*hol);
  if(e<1.12){
    // Spiral streaks: long arcs (ten cells round, eighteen across the radius) about the middle, the
    // angle turned by the rotation (faster outward) and wound with radius. Two copies half a turn
    // apart, each faded out where its angle wraps, so no seam shows.
    float om=1.05*smoothstep(0.15, 0.9, e), u=fract((atan(E.y, E.x)+om*T+2.2*e*e)/6.2831853);
    float k1=smoothstep(1.5*pxE, 3.0*pxE, 1.0/18.0), k2=smoothstep(1.5*pxE, 3.0*pxE, 1.0/54.0), w1=1.0-abs(2.0*u-1.0);
    vec2 s1=vec2(u*10.0, e*18.0), s2=vec2(fract(u+0.5)*10.0+50.0, e*18.0);
    float st=w1*(k1*(vN(s1)-0.5)+0.5*k2*(vN(s1*3.0+7.0)-0.5))+(1.0-w1)*(k1*(vN(s2)-0.5)+0.5*k2*(vN(s2*3.0+7.0)-0.5));
    vec3 red=mix(vec3(0.86, 0.56, 0.42), vec3(0.80, 0.40, 0.28), smoothstep(0.1, 0.55, e));
    red=mix(red, vec3(0.66, 0.28, 0.20), smoothstep(0.6, 0.85, e)*(1.0-smoothstep(0.92, 1.0, e)));
    red*=1.0+0.45*st;
    float inside=1.0-smoothstep(0.96, 1.04, e+0.04*st);
    c=mix(c, c*0.78, 0.6*smoothstep(0.9, 1.0, e)*(1.0-smoothstep(1.03, 1.12, e)));
    c=mix(c, red, grsAB.w*inside);
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
  if(kind==3) alb=jupiterAlbedo(lat, lon, pxS);
#endif
#if DETAIL_MAP
  // A body with a spacecraft map (M.w its code, surfaces.js) shows it, mipmapped to the pixel.
  if(M.w>-0.5) alb=surfAt(M.w, lon, lat, log2(max(512.0/360.0*pxS, 1e-6)));
#endif
#if DETAIL_JUP
  if(kind==3 && grsAB.x>0.0) alb=grsPaintFine(alb, nrm, n, lat, pxS);
#else
  if(kind==3 && grsAB.x>0.0) alb=grsPaint(alb, nrm, n, lat);
#endif
  return vec4(alb*lit*BODY_GAIN[kind], cov);
}
// Saturn's rings at r planet radii, w the radial blur: brightness (x) and opacity (y) of the C ring,
// the B ring (brightest in its outer half), the Cassini division and the A ring.
vec2 saturnRing(float r, float w){
  float C=smoothstep(1.239-w, 1.239+w, r)-smoothstep(1.527-w, 1.527+w, r), B=smoothstep(1.527-w, 1.527+w, r)-smoothstep(1.951-w, 1.951+w, r);
  float D=smoothstep(1.951-w, 1.951+w, r)-smoothstep(2.025-w, 2.025+w, r), A=smoothstep(2.025-w, 2.025+w, r)-smoothstep(2.267-w, 2.267+w, r);
  return vec2(0.18*C+mix(0.72, 1.0, smoothstep(1.55, 1.75, r))*B+0.12*D+0.62*A, 0.12*C+0.95*B+0.1*D+0.6*A);
}
`;
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
    // gets through), dark in the planet's shadow, and casting their own shadow on it.
    vec3 Lr=bL.xyz;
    if(dk.a>0.0){ float ts=-dot(x, bN.xyz)/dot(Lr, bN.xyz); if(ts>0.0) dc*=1.0-0.85*saturnRing(length(x+ts*Lr), 0.02).y; }
    float tr=-dot(o, bN.xyz)/vn; vec3 xr=o+tr*bP.xyz;
    vec2 rg=saturnRing(length(xr), 0.8/rPx/max(abs(vn), 0.03));
    if(rg.y>0.0){
      float s=dot(xr, Lr), sh=s<0.0?smoothstep(0.97, 1.03, length(xr-s*Lr)):1.0;
      vec3 rc=vec3(0.86, 0.78, 0.64)*rg.x*sh*(dot(Lr, bN.xyz)*vn<0.0?1.0:0.12);
      float ro=rg.y*smoothstep(0.0, 0.03, abs(vn));
      dc=tr<t?rc*ro+dc*(1.0-ro):dc+rc*ro*(1.0-dk.a);
    }
  }
  fragColor=vec4(dc*T*diskK*vis*hz, 0.0);
}`;
// The bodies' program with the close-up detail in set f ('jup', 'map') and none other.
function bodyFS(f){
  return keepLoops(BODYFS_SRC.replace('#define DETAIL_JUP 1', '#define DETAIL_JUP '+(f.has('jup')?1:0)).replace('#define DETAIL_MAP 1', '#define DETAIL_MAP '+(f.has('map')?1:0)));
}
const BODY_UNIFORMS=['res','hitScale','yaw','pitch','fov','showScn','refK','rCd','mwK','moonGain','starPx','nr','na','fineT','grsDir','grsAB',
  'bP','bC','bL','bN','bS','bM','shadowM[0]','shadowK[0]','shadowCnt','sunQ','moonQ'];
function setupBodyProg(gl, p){
  gl.useProgram(p);
  bindSamplers(gl, p, [['sky',0],['noiseTex',12],['hitInfo',10],['dsoTex',6]]);
  return {p, u:uniformLocs(gl, p, BODY_UNIFORMS)};
}
