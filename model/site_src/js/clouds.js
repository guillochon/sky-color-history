function makeWeather(n){
  const data=new Uint8Array(n*n*4);
  const h=(i,j,s)=>{ let x=Math.imul(i|0,374761393)+Math.imul(j|0,668265263)+Math.imul(s|0,1274126177); x=(x^(x>>>13))>>>0; x=Math.imul(x,1274126177); return ((x^(x>>>16))>>>0)/4294967295; };
  const octave=(u,v,cells,seed)=>{
    const x=u*cells, y=v*cells, x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0;
    const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), w=i=>((i%cells)+cells)%cells;
    const s=(ix,iy)=>h(w(ix), w(iy), seed);
    return s(x0,y0)*(1-sx)*(1-sy)+s(x0+1,y0)*sx*(1-sy)+s(x0,y0+1)*(1-sx)*sy+s(x0+1,y0+1)*sx*sy;
  };
  const fbm=(u,v,seed)=>{ let a=0.5, cells=2, s=0, w=0; for(let i=0;i<5;i++){ s+=a*octave(u,v,cells,seed+i*19); w+=a; a*=0.5; cells*=2; } return s/w; };
  for(let y=0;y<n;y++) for(let x=0;x<n;x++){
    const u=x/n, v=y/n, o=(y*n+x)*4;
    data[o]=Math.round(Math.min(1, Math.max(0, fbm(u, v, 1)))*255);
    data[o+1]=Math.round(Math.min(1, Math.max(0, fbm(u+0.17, v+0.41, 2)))*255);
    data[o+2]=Math.round(Math.min(1, Math.max(0, fbm(u+0.63, v+0.11, 3)))*255);
    data[o+3]=Math.round(Math.min(1, Math.max(0, fbm(u+0.29, v+0.73, 4)))*255);
  }
  return data;
}
// prog is the linked NOISEFS program. It is deleted once the volumes are filled.
function makeCloudVolumes(gl, prog){
  const uLayer=gl.getUniformLocation(prog,'layer'), uKind=gl.getUniformLocation(prog,'kind'), uSide=gl.getUniformLocation(prog,'side');
  const fbo=gl.createFramebuffer();
  const fill=(tex, side, kind)=>{
    gl.bindTexture(gl.TEXTURE_3D, tex);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT, gl.TEXTURE_3D, gl.REPEAT);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, side, side, side, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.useProgram(prog); gl.uniform1f(uKind, kind); gl.uniform1f(uSide, side);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, side, side);
    for(let z=0;z<side;z++){
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex, 0, z);
      gl.uniform1f(uLayer, (z+0.5)/side);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
  const base=gl.createTexture(), detail=gl.createTexture();
  fill(base, 128, 0); fill(detail, 32, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteProgram(prog); gl.deleteFramebuffer(fbo);
  return {base, detail};
}
// Coverage, type, base altitude, and how tall the tops run, by era. cov is the typical cover;
// vary is how far passing weather systems swing it, as 12·vary in log-odds per standard deviation
// of the weather (cloudCover): at 0.25, as today, a day in six is clear and one in six overcast.
// Type 0 is a thin stratiform deck, 0.5 is fair-weather cumulus, 1 is cumulonimbus.
const CLOUD_ERA={
  protoearth455:{cov:0.6,vary:0.12,type:0.3,base:1700,top:0.5,cirrus:0.1},
  hadean45:{cov:0.88,vary:0.05,type:0.12,base:1900,top:0.55,cirrus:0.05},
  hadean40:{cov:0.74,vary:0.12,type:0.16,base:1800,top:0.50,cirrus:0.08},
  archean38:{cov:0.48,vary:0.2,type:0.35,base:1600,top:0.45,cirrus:0.15},
  archean27clear:{cov:0.42,vary:0.2,type:0.38,base:1600,top:0.40,cirrus:0.20},
  archean27thin:{cov:0.42,vary:0.2,type:0.38,base:1600,top:0.40,cirrus:0.20},
  archean27:{cov:0.30,vary:0.2,type:0.42,base:1550,top:0.45,cirrus:0.25},
  archean27vthick:{cov:0.16,vary:0.06,type:0.20,base:1700,top:0.30,cirrus:0.10},
  proterozoic22:{cov:0.58,vary:0.2,type:0.40,base:1550,top:0.50,cirrus:0.30},
  snowball07:{cov:0.22,vary:0.12,type:0.04,base:1400,top:0.20,cirrus:0.15},
  cryogenian65:{cov:0.55,vary:0.2,type:0.42,base:1550,top:0.50,cirrus:0.35},
  ordovician466:{cov:0.55,vary:0.22,type:0.45,base:1600,top:0.55,cirrus:0.45},
  carbon30:{cov:0.82,vary:0.15,type:0.78,base:1500,top:0.90,cirrus:0.45},
  cretaceous66:{cov:0.50,vary:0.25,type:0.55,base:1600,top:0.60,cirrus:0.50},
  kpg66:{cov:0.08,vary:0.04,type:0.02,base:2200,top:0.15,cirrus:0.05},
  zetaoph:{cov:0.50,vary:0.25,type:0.50,base:1600,top:0.55,cirrus:0.55},
  geminga:{cov:0.50,vary:0.25,type:0.50,base:1600,top:0.55,cirrus:0.55},
  volcanic:{cov:0.52,vary:0.2,type:0.22,base:1700,top:0.40,cirrus:0.70},
  modern:{cov:0.50,vary:0.25,type:0.50,base:1600,top:0.55,cirrus:0.55},
  modernpoll:{cov:0.56,vary:0.2,type:0.42,base:1450,top:0.50,cirrus:0.40},
  ozonehole:{cov:0.50,vary:0.25,type:0.50,base:1600,top:0.55,cirrus:0.55},
  y2100:{cov:0.50,vary:0.25,type:0.50,base:1600,top:0.55,cirrus:0.55}
};
// The surface air temperature by era (°C), for whether what falls is rain or snow, how much of it
// evaporates on the way down, and how hard it falls: eq, the annual mean at the Equator; grad, how
// much colder the poles run (the mean falls as sin² of the latitude); amp, the seasonal swing at
// the pole (half the range from the coldest month to the warmest), falling as |sin| of the latitude
// toward the Equator. Today's are fitted to the zonal means; the deep past's follow the report's
// climate for each epoch: the steaming sea after the Moon-forming impact, the warm Archean, the
// Snowball's frozen Equator, the impact winter after Chicxulub (Brugger et al. 2017, 26 °C or more
// colder for years), the hothouse Cretaceous.
const SURF_T_ERA={
  protoearth455:{eq:95,grad:10,amp:2}, hadean45:{eq:90,grad:10,amp:2}, hadean40:{eq:45,grad:15,amp:4},
  archean38:{eq:35,grad:20,amp:6}, archean27clear:{eq:30,grad:25,amp:8}, archean27thin:{eq:30,grad:25,amp:8},
  archean27:{eq:30,grad:25,amp:8}, archean27vthick:{eq:32,grad:22,amp:7}, proterozoic22:{eq:25,grad:35,amp:12},
  snowball07:{eq:-20,grad:30,amp:10}, cryogenian65:{eq:22,grad:40,amp:14}, ordovician466:{eq:32,grad:30,amp:12},
  carbon30:{eq:28,grad:40,amp:15}, cretaceous66:{eq:31,grad:25,amp:9}, kpg66:{eq:2,grad:25,amp:9},
  zetaoph:{eq:27,grad:40,amp:15}, geminga:{eq:25,grad:44,amp:16}, volcanic:{eq:26.3,grad:40,amp:15},
  modern:{eq:27,grad:40,amp:15}, modernpoll:{eq:27.5,grad:39,amp:15}, ozonehole:{eq:27.3,grad:39.5,amp:15},
  y2100:{eq:29.5,grad:37,amp:14}
};
// The date as a whole day number (k) and the minutes into it (m).
function cloudDate(){
  const d=/^(-?\d+)-(\d+)-(\d+)$/.exec(document.getElementById('moonDate').value||'');
  return {k:Math.floor(d?utcDay(+d[1], +d[2], +d[3]):Date.now()/86400000), m:minutes};
}
// The date and time as a day number, 24:00 the same as the next day's 00:00.
function cloudDay(){ const t=cloudDate(); return t.k+t.m/DAYMIN; }
// The weather over simulated time: standard normal values, one for the systems that come and go
// every few days (two timescales) and one for the high cirrus, partly tied to it; front, how fast
// the slower systems are building (+, a front coming) or clearing (−, one gone by); stab, how
// readily the air overturns; damp, how humid the low air is. Everything is derived from the date
// and time, so a given moment always looks the same.
function cloudWeather(key){
  const day=cloudDay(), seed=(metHash(key)%1000)*0.731;
  // Normal values at whole periods, eased between and rescaled so the blend stays standard normal.
  const wave=(t, period, s)=>{ const x=t/period, i=Math.floor(x), f=x-i, u=f*f*(3-2*f), g=j=>probit(Math.min(0.999, Math.max(0.001, h12xy(j, seed+s))));
    return (g(i)*(1-u)+g(i+1)*u)/Math.hypot(1-u, u); };
  const slow=t=>wave(t, 3.8, 0.0), z=0.85*slow(day)+0.53*wave(day, 1.3, 5.0);
  // slow's rate of change has a standard deviation of 0.48 a day.
  const front=Math.min(2.5, Math.max(-2.5, (slow(day+0.125)-slow(day-0.125))/0.25/0.48));
  return {z, zc:0.5*z+0.87*wave(day, 2.2, 9.0), front, stab:wave(day, 3.1, 13.0), damp:wave(day, 2.7, 17.0)};
}
// The day's kind of cloud, about the era's: the air's stability and the fronts move the type
// (ahead of a front the cloud spreads into sheets, behind it the cold air builds cumulus, and an
// unstable day grows towers by afternoon while a stable one lies flat under its inversion) and
// how tall the tops run; the humidity moves the base, low on a damp day or under a front's cloud
// and high in dry air. An era whose weather varies less (vary under 0.25) varies less in kind too.
function cloudRegime(e, w){
  const r=Math.min(1, e.vary/0.25), s=0.75*w.stab-0.45*w.front;
  return {
    type:Math.min(0.95, Math.max(0.02, e.type+0.2*r*s)),
    base:Math.min(3200, Math.max(450, e.base*Math.exp(r*(0.1*s-0.28*w.damp-0.12*w.z)))),
    top:Math.min(1, Math.max(0.1, e.top+0.18*r*s))
  };
}
// Coverage: the era's typical cover, moved in log-odds by the weather systems and a daily cycle, so
// clear days and overcast ones both come, as often as the era's vary allows. Cumulus days (type 0.3
// and up) build clouds through the afternoon; stratiform ones start overcast and burn off by midday.
// Near overcast (75% to 95%), deck ramps up: the cloud shader fills the gaps between clouds, and
// cumulus flattens into a layer about a kilometre thick.
function cloudCover(e, w, g){
  const h=(minutes%DAYMIN)/60, cu=smoothstep(0.22, 0.38, g.type);
  const daily=cu*(Math.exp(-(((h-15)/3.5)**2))-0.35)+(1-cu)*(Math.exp(-(((h-7)/3)**2))-0.3);
  const x=Math.log(e.cov/(1-e.cov))+12*e.vary*(w.z+0.6*daily);
  return Math.min(0.99, Math.max(0.005, 1/(1+Math.exp(-x))));
}
// Where the clouds are: the wind has carried them 88 m a clock minute toward −(1, 0.42) since
// day 0, and they change shape as they go, 35 m a minute through the noise along its slice's
// normal, so every date has its own clouds and a played clock moves them smoothly. The distances
// outgrow the shader's floats, so each lookup's place within its texture's tile is worked out here,
// from the whole days and the minutes apart: drift, the low clouds' weather map's (the shaders take
// vec2(1, 0.42)·drift, and it repeats after 50 of its tiles along x, 21 along y); noiseOff and
// detOff, the noise's and its detail's; cirW, cirS and cirD, the cirrus's (shader_clouds.js).
// minAbs, the minutes since day 0, tells a jump from the clock's own steps.
function cloudClock(scale){
  const {k, m}=cloudDate(), fr=x=>x-Math.floor(x), k1=Math.floor(k/65536), k0=k-k1*65536;
  // Turns of a lookup that moves c a metre, at rate metres a minute.
  const at=(c, rate)=>{ const d=c*rate*DAYMIN; return fr(fr(fr(d*65536)*k1)+fr(d*k0)+c*rate*m); };
  const R=NOISE_ROT, wind=[0, 1, 2].map(i=>(R[i]+0.42*R[3+i])/9000), shape=[0, 1, 2].map(i=>R[6+i]/90000);
  const lowOff=s=>wind.map((c, i)=>fr(at(c*s, 88)+at(shape[i]*s, 35)));
  const Dw=50/(scale*0.33);
  // The cirrus's place, rotated into its streaks' frame, per metre of the low clouds' drift.
  const ra=1.6*(0.92+0.39*0.42), rb=1.6*(-0.39+0.92*0.42), sl=CIRRUS_SLANT;
  const cirOff=(sx, sy)=>[at(ra/sx, 88), at(rb/sy, 88), at(ra/sx*sl[0]+rb/sy*sl[1], 88)];
  return {drift:Dw*at(1/Dw, 88), noiseOff:lowOff(1), detOff:lowOff(6.5), cirW:[at(1.6*scale*0.12, 88), at(1.6*0.42*scale*0.12, 88)],
    cirS:cirOff(42000, 9000), cirD:cirOff(9000, 1600), minAbs:k*DAYMIN+m};
}
function cloudField(key){
  const e=tableNow(CLOUD_ERA, key, CLOUD_ERA.modern), w=cloudWeather(key), g=cloudRegime(e, w), cov=cloudCover(e, w, g), scale=1/32000;
  const deck=smoothstep(0.75, 0.95, cov);
  // The cirrus comes and goes too: none on about a day in ten, up to twice the era's usual, and
  // thickening ahead of a front.
  const cirrus=Math.min(1, e.cirrus*Math.min(2, Math.max(0, 1+0.8*w.zc+0.4*w.front)));
  const type=g.type>0.2?g.type+(0.2-g.type)*deck:g.type, T=surfaceTemp(key, w, cov);
  return {cov, deck, type, base:g.base, top:g.top, cirrus, scale, T, rain:cloudPrecip(w, {cov, deck, type, base:g.base}, T), ...cloudClock(scale)};
}
// The air at the ground here and now (°C): the era's mean for the latitude, the season (warmest
// late in July in the north, January in the south), the day (warmest at 15:00, less so under
// cloud), and the weather (warm ahead of a front and in damp air, cold behind one).
function surfaceTemp(key, w, cov){
  const s=tableNow(SURF_T_ERA, key, SURF_T_ERA.modern), lat=(LATDEG[dLat]??45)*Math.PI/180, sn=Math.sin(lat);
  const f=yearFraction()[1], h=(minutes%DAYMIN)/60;
  const season=s.amp*Math.abs(sn)*Math.cos(2*Math.PI*(f-(lat<0?0.05:0.55)));
  return s.eq-s.grad*sn*sn+season+5*(1-0.7*cov)*Math.cos(2*Math.PI*(h-15)/24)+2*w.front+1.5*w.damp;
}
// What falls from the clouds, in mm of water an hour, from the same weather that makes them, so
// rain comes from the cloud drawn above it. Three kinds:
//   - strat, steady and widespread, from heavy cover when the systems run wet (w.z high, a
//     front coming, damp air): 1-5 mm/h, in bands under the thicker half of the cloud. Fronts belong to
//     the mid-latitudes' storm tracks, so it is a third as common at the Equator and half at 75°;
//   - conv, showers from the towers on an unstable day, strongest in the afternoon: 10-40 mm/h
//     under the thickest cells (shader_present.js rainMap), and only where the ground is warm
//     enough for the air to overturn. In the warm tropical air even modest cumulus rains;
//   - driz, drizzle from a low damp deck that isn't raining: 0.1-0.3 mm/h.
// Showers follow Clausius-Clapeyron, 6% a degree about 15 °C, and the steady rain about half
// that, as the mean precipitation does, so warm epochs pour and the Snowball barely snows.
// Calibrated so today's comes to about 1,800 mm a year at the Equator, 850 at 45° and 200 at 75°,
// falling in 5-8% of the hours (clouds.js alone, run over eight years). snow is the share falling
// as snow (it melts from 0 to 2.5 °C). virgaH is the height (m) where it has all evaporated, in
// dry air under a high base or over a hot surface; 0 when it reaches the ground. tilt is how far the shafts lean per metre of fall, in the wind's
// shear: rain falls at 7 m/s, snow at 1 m/s and leans more.
function cloudPrecip(w, c, T){
  const h=(minutes%DAYMIN)/60, cc=Math.min(3, Math.max(0.08, Math.exp(0.06*(T-15)))), cs=Math.min(2.5, Math.max(0.2, Math.exp(0.035*(T-15))));
  const s=w.z+0.5*Math.max(0, w.front)+0.3*w.damp;
  const wet=smoothstep(0.5, 1.3, s), sheet=smoothstep(0.55, 0.85, c.cov);
  const lat=(LATDEG[dLat]??45)*Math.PI/180, storms=0.35+0.65*Math.sin(2*lat)**2;
  const strat=sheet*wet*1.9*Math.exp(0.6*Math.max(0, s-1.3))*cs*storms;
  const driz=sheet*(1-wet)*smoothstep(0.3, 1.2, w.damp)*(1-smoothstep(900, 1400, c.base))*0.25*cs;
  const after=0.25+0.75*Math.exp(-(((h-16)/3)**2));
  const lo=0.5-0.2*smoothstep(15, 27, T);
  // A shower needs a deep cell, and a day of a few small cumulus has none: the towers that rain
  // come with the cover they spread (a tenth of the sky or less never showers, a third may).
  const conv=smoothstep(lo, lo+0.3, c.type)*smoothstep(0.1, 0.3, c.cov)*after*smoothstep(-5, 15, T)*22*cc;
  const snow=1-smoothstep(-0.5, 2.5, T);
  // The air under steady rain is saturated, so only showers and light rain dry out on the way.
  const dry=1-smoothstep(0.3, 1.2, strat);
  const vf=Math.min(0.97, (0.6*smoothstep(1700, 3000, c.base)+0.3*Math.min(1, Math.max(0, -0.7*w.damp)))*dry+smoothstep(35, 80, T));
  return {strat, conv, driz, snow, virgaH:vf*c.base, tilt:0.25+0.65*snow};
}
// The rain and snow at (x, y) (mm/h, as shader_present.js rainMap has them, there at the cloud
// base), and its cover and thickness there: rain, driz, cov, th.
function rainMapAt(f, x, y){
  const W=weatherData(), n=256, k=f.scale*0.33*n, wr=i=>((i%n)+n)%n;
  const o=(wr(Math.floor((y+0.42*f.drift)*k))*n+wr(Math.floor((x+f.drift)*k)))*4;
  const cov=1/(1+Math.exp(-(Math.log(f.covGL/(1-f.covGL))+(W[o]/255-0.56)/0.09*1.05))), th=Math.min(1, Math.max(0, (W[o+2]/255-0.30)/0.38));
  const r=f.rain, sheet=smoothstep(0.55, 0.9, cov)*smoothstep(0.35, 0.75, th);
  return {rain:r.strat*sheet+r.conv*smoothstep(0.55, 0.85, th)*smoothstep(0.3, 0.6, cov), driz:r.driz*sheet, cov, th};
}
// What is falling on the eye at (x, y, z), mm/h: the map where the shaft that reaches it left the
// cloud base, upwind in the shear, and nothing if it evaporates above.
function rainHere(f, x, y, z){
  const r=f.rain, d=Math.max(0, f.base-z)*r.tilt, m=rainMapAt(f, x+0.92*d, y+0.39*d);
  const fall=Math.min(1, Math.max(0, (z-r.virgaH)/Math.max(200, 0.3*(f.base-r.virgaH))));
  return r.virgaH>0?(m.rain+m.driz)*fall:m.rain+m.driz;
}
// The cover the shaders take (cloudCov) for the view from (x, y): the weather map moves the cover
// about it, more here and less there, and is centred on its mean within 40 km of the eye, where
// the clouds are seen, so the sky in view comes to the day's cover wherever the wind has taken the map.
function cloudCovHere(f, x, y){
  const W=weatherData(), n=256, k=f.scale*0.33*n, wr=i=>((i%n)+n)%n;
  let s=0;
  for(let i=-4;i<=4;i++) for(let j=-4;j<=4;j++) s+=W[(wr(Math.floor((y+0.42*f.drift+j*1.0e4)*k))*n+wr(Math.floor((x+f.drift+i*1.0e4)*k)))*4];
  const mid=s/81/255, x0=Math.log(f.cov/(1-f.cov))+(0.56-mid)/0.09*1.05;
  return 1/(1+Math.exp(-x0));
}
// For the clock line: what is falling on the eye at (x, y, z), as ' · rain 3.2 mm/h' and the like,
// or ' · virga' when it leaves the cloud over the eye and dries out before it gets down.
function rainLabel(f, x, y, z){
  const R=f.here||0, r=f.rain;
  if(R<0.05){
    if(!(r.virgaH>z)) return '';
    const d=Math.max(0, f.base-r.virgaH)*r.tilt, m=rainMapAt(f, x+0.92*d, y+0.39*d);
    return m.rain+m.driz>0.1?' · virga':'';
  }
  const kind=r.snow>0.5?'snow':r.driz>r.strat+r.conv?'drizzle':r.conv>r.strat?'showers':'rain';
  return ' · '+kind+' '+(R<10?R.toFixed(1):Math.round(R))+' mm/h';
}
function vrCaption(){
  if(vrAirOff) return (vrScenery?'The ground and the shapes are scenery. ':'')+'The air is off: no sky, extinction or refraction.';
  if(vrScenery&&vrClouds) return 'The ground, the shapes, and the clouds are scenery. The sky is the model.';
  if(vrScenery) return 'Clouds are hidden. The ground and the shapes are scenery. The sky is the model.';
  if(vrClouds) return 'The shapes are hidden. The clouds are scenery. The sky is the model.';
  return 'Scenery and clouds are hidden. The sky is the model.';
}
function allocCloudTex(gl, w, h, hdr){
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  if(hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return tex;
}
// The cloud layer's opacity, a quarter of its size, read back for the labels: a point behind
// cloud is hidden, and so is its label. The copy is read without waiting on the GPU (a pixel
// buffer and a fence), so the mask is a frame or two old; it keeps the view it was taken in, and
// a direction is looked up there. With labels on only.
function readCloudMask(fbo){
  const gl=vrGL.gl, mw=Math.max(1, Math.ceil(vrGL.cw/4)), mh=Math.max(1, Math.ceil(vrGL.ch/4)), hdr=!!vrGL.cloudHDR;
  takeCloudMask();
  if(vrGL.maskSync) return;
  if(!vrGL.maskFbo||vrGL.maskW!==mw||vrGL.maskH!==mh){
    if(vrGL.maskTex) gl.deleteTexture(vrGL.maskTex);
    vrGL.maskTex=allocCloudTex(gl, mw, mh, hdr); vrGL.maskFbo=vrGL.maskFbo||gl.createFramebuffer(); vrGL.maskW=mw; vrGL.maskH=mh;
    gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.maskFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.maskTex, 0);
    vrGL.maskPbo=vrGL.maskPbo||gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, vrGL.maskPbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, mw*mh*4*(hdr?4:1), gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fbo); gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, vrGL.maskFbo);
  gl.blitFramebuffer(0, 0, vrGL.cw, vrGL.ch, 0, 0, mw, mh, gl.COLOR_BUFFER_BIT, gl.LINEAR);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, vrGL.maskFbo);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, vrGL.maskPbo);
  gl.readPixels(0, 0, mw, mh, gl.RGBA, hdr?gl.FLOAT:gl.UNSIGNED_BYTE, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  vrGL.maskSync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  vrGL.maskPending={w:mw, h:mh, hdr, yaw:vrYaw, pitch:vrPitch, fov:vrFov, aspect:vrGL.cw/vrGL.ch};
  gl.flush();
  requestAnimationFrame(function poll(){ if(!vrGL||!vrGL.maskSync) return; if(takeCloudMask()) drawVRLabels(); else requestAnimationFrame(poll); });
}
// Collects the copy once the GPU has made it; true when a new mask arrived.
function takeCloudMask(){
  const gl=vrGL.gl, sync=vrGL.maskSync;
  if(!sync) return false;
  const st=gl.clientWaitSync(sync, 0, 0);
  if(st!==gl.ALREADY_SIGNALED&&st!==gl.CONDITION_SATISFIED) return false;
  gl.deleteSync(sync); vrGL.maskSync=null;
  // The copy lands in the same array each time; cloudAt is replaced with it below.
  const p=vrGL.maskPending, n=p.w*p.h*4;
  let px=vrGL.maskBuf;
  if(!px||px.length!==n||(px instanceof Float32Array)!==p.hdr) px=vrGL.maskBuf=p.hdr?new Float32Array(n):new Uint8Array(n);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, vrGL.maskPbo);
  gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  const k=p.hdr?1:1/255, fy=Math.tan(p.fov*Math.PI/360), fx=fy*p.aspect, yaw=p.yaw*Math.PI/180, pitch=p.pitch*Math.PI/180;
  const cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  // Opacity toward view direction d (apparent altitude), or 0 outside the view it was taken in.
  vrGL.cloudAt=d=>{
    const depth=d[0]*sy*cp+d[1]*cy*cp+d[2]*sp;
    if(depth<0.02) return 0;
    const x=(d[0]*cy-d[1]*sy)/depth/fx, y=(-d[0]*sy*sp-d[1]*cy*sp+d[2]*cp)/depth/fy;
    if(Math.abs(x)>1||Math.abs(y)>1) return 0;
    // Bilinear between the four nearest texels.
    const u=Math.max(0, Math.min(p.w-1, (x*0.5+0.5)*p.w-0.5)), v=Math.max(0, Math.min(p.h-1, (y*0.5+0.5)*p.h-0.5));
    const i=Math.min(p.w-2, Math.floor(u)), j=Math.min(p.h-2, Math.floor(v)), fu=u-i, fv=v-j, a=(ii, jj)=>px[(jj*p.w+ii)*4+3];
    return ((a(i, j)*(1-fu)+a(i+1, j)*fu)*(1-fv)+(a(i, j+1)*(1-fu)+a(i+1, j+1)*fu)*fv)*k;
  };
  return true;
}
// With cb (checkerboard, which needs the temporal pass), the march's targets are half as wide.
function ensureCloudTarget(w, h, cb){
  const gl=vrGL.gl;
  if(vrGL.cw===w&&vrGL.ch===h&&vrGL.cloudCBAsked===cb) return;
  vrGL.cw=w; vrGL.ch=h; vrGL.histOk=false; vrGL.cloudCBAsked=cb;
  const hdr=!!vrGL.cloudHDR, mw=cb?Math.ceil(w/2):w;
  for(const key of ['cloudTex','metaTex','accumTex','histTex']){ if(vrGL[key]) gl.deleteTexture(vrGL[key]); }
  vrGL.cloudTex=allocCloudTex(gl, mw, h, hdr);
  vrGL.accumTex=allocCloudTex(gl, w, h, hdr);
  vrGL.histTex=allocCloudTex(gl, w, h, hdr);
  vrGL.metaTex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, vrGL.metaTex);
  texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
  if(hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, mw, h, 0, gl.RED, gl.HALF_FLOAT, null);
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, mw, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.cloudFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.cloudTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, vrGL.metaTex, 0);
  vrGL.cloudMRT=fbComplete(gl, 'cloud'+hdr);
  if(!vrGL.cloudMRT) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);
  // Without the depth target there is no temporal pass to put a checkerboard together.
  vrGL.cloudCB=cb&&vrGL.cloudMRT; vrGL.cloudMW=vrGL.cloudCB?mw:w;
  if(cb&&!vrGL.cloudMRT){ gl.bindFramebuffer(gl.FRAMEBUFFER, null); vrGL.cw=0; ensureCloudTarget(w, h, false); vrGL.cloudCBAsked=cb; return; }
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.accumFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.accumTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, vrGL.histFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, vrGL.histTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
