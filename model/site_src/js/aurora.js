/* ---------- Aurorae ---------- */
// Where the aurora is. Electrons from the magnetotail light an oval round the magnetic pole,
// fixed relative to the Sun: today, in moderate activity (Kp 3), it spans about 63–72° magnetic
// latitude on the night side and 73–78° on the day side (Feldstein's ovals). Storms widen it and
// push its equatorward edge far south, to near 50° at Kp 9. The oval's field lines reach out to a
// distance set by the magnetopause, so with a dipole field (L = 1/cos²λ) each edge's latitude
// follows from L scaled by the magnetopause distance relative to today. That
// distance goes as (B²/ρv²)^(1/6): a weaker field or a denser, faster solar wind brings it in.
// The magnetic pole is taken at the geographic pole, so magnetic local time is the local solar time.
// Per epoch: [magnetopause distance relative to today, typical Kp, energy into the aurora relative
// to today's typical arc, oxygen emission relative to today, nitrogen emission relative to today].
//   - 3.45 Ga: the field was half to 70% of today's, and the young Sun's wind much denser, with
//     the magnetopause at about 5 Earth radii, half today's (Tarduno et al. 2010, Science 327,
//     1238). A 4.0–4.2 Ga field from Jack Hills zircons (Tarduno et al. 2015, 2020) is disputed;
//     here it is taken weak. A young Sun flares and throws off mass far more often (Airapetian et
//     al. 2016, Nature Geosci. 9, 452), so storms are the usual state: higher Kp, more energy.
//   - The wind weakens with age (Wood et al. 2005: mass loss falling as about t^-2.3), so the
//     magnetopause moves out and the oval toward the pole through the Proterozoic.
//   - The green 557.7 nm and red 630 nm lines come from oxygen atoms. With O2 at 1% of today's
//     (2.2 Ga), fewer atoms are made in the upper air: 30%, as for the airglow (day.js). With no O2
//     at all, CO2 split by electrons still gives the green line, as Perseverance saw in a Martian
//     aurora (Knutsen et al. 2025, Sci. Adv.), but with CO2 a few percent of the air it is weak:
//     12%. The 30-bar Hadean air is mostly CO2, so there the green line is stronger (60%) and
//     nitrogen's bands faint.
//   - Nitrogen's blue-violet N2+ bands and the pink-red N2 first positive bands go with the N2.
//     Without oxygen atoms to quench excited N2, the first positive bands gain 30%.
// All of these are estimates, set to show the trend rather than to predict a particular night.
const AURORA_EPOCH={
  hadean44:[0.40, 6.0, 6.0, 0.6, 0.15],
  hadean40:[0.45, 6.0, 5.0, 0.12, 1],
  archean38:[0.50, 5.5, 4.0, 0.12, 1],
  archean27thin:[0.60, 5.0, 3.0, 0.12, 1],
  archean27:[0.60, 5.0, 3.0, 0.12, 1],
  archean27vthick:[0.60, 5.0, 3.0, 0.12, 1],
  proterozoic22:[0.80, 4.0, 2.0, 0.3, 1],
  snowball07:[0.95, 3.3, 1.2, 0.8, 1],
};
const AURORA_TODAY=[1, 3, 1, 1, 1];
// Column brightness of a typical arc today, looking up along the field (kR of 557.7 nm, IBC II),
// which a substorm raises eightfold (about 150 kR, IBC III),
// and of the faint diffuse aurora equatorward of the arcs.
const AUR_IV=20, AUR_DIFF=1.0;
// Linear sRGB (cd/m²) per kR of each emission, from the CIE 1931 functions as in skymodel.py:
// O 557.7 nm; O 630.0 + 636.4 nm; N2+ first negative (427.8 nm, with 391.4, 423.6 and 470.9 nm
// and the N2 second positive bands at 380–406 nm, per kR of 427.8); N2 first positive (646–688 and
// 595–606 nm). Some are outside sRGB; the shader moves them in at constant luminance.
const AUR_RGB=[[5.6821e-05, 2.5589e-04, -3.2342e-05], [2.8106e-04, -2.3548e-05, -2.7534e-06], [3.5841e-05, -4.8614e-05, 5.0564e-04], [1.0517e-04, 1.6209e-06, -2.3369e-06]];
// How bright each looks to the dark-adapted eye, which sees with its rods: scotopic luminance per
// kR (CIE 1951 V'(λ), 1700 lm/W) over that of the natural night sky per unit of its photopic
// luminance. The sky's ratio is about 1.6: half of it sunlight-coloured (5772 K, 2.3) and half
// airglow (the green line 0.9, sodium 0.2, the continuum about 1.6). Rods see nitrogen's violet
// 26 times better than cones do, and hardly see the red line at all (0.03), which is why red
// aurora so often shows in photographs and barely to the eye. The shader moves from this to
// photopic luminance as the sky brightens from 0.005 to 5 cd/m² (CIE mesopic range); see
// AUR_MIX_GLSL.
const AUR_SCOT=[1.729e-4, 1.284e-6, 2.447e-4, 2.342e-6].map(v=>v/1.6);
// Today's ratios to the green line in an arc: 427.8 nm at 0.3 and the visible first positive bands
// at 0.2. The red line is set in the shader (0.15 on the night side, far more at the cusp).
const AUR_RATIO=[1, 1, 0.30, 0.2];
const AUR_LAMBDA=[557.7, 630, 430, 665];
const AUR_N=4096, AUR_ARCS=4, KM_DEG=111.2;
// Arcs: offset poleward of the oval's centre line (in its half-widths), brightness, and sheet
// half-width (km). The brightest is the most equatorward, where substorms break up; the diffuse
// aurora lies along the equatorward edge.
const AUR_ARC=[[-0.3, 1, 3.0], [0.05, 0.55, 5.0], [0.4, 0.45, 4.0], [0.7, 0.3, 6.5]];
// Today's oval for activity kp: centre and half-width (degrees) at midnight and noon.
function aurOvalToday(kp){ return [69-0.2*kp-0.1*kp*kp, 77-0.5*kp, 2.5+0.4*kp+0.05*kp*kp, 1.5+0.25*kp]; }
function aurScaleLat(lat, rmp){ const L=rmp/Math.pow(Math.cos(lat*Math.PI/180), 2); return L<=1.0001?0:Math.acos(Math.sqrt(1/L))*180/Math.PI; }
function aurHashI(i, j, s){
  let h=(Math.imul(i|0, 0x27d4eb2d)^Math.imul(j|0, 0x165667b1)^Math.imul(s|0, 0x9e3779b1))>>>0;
  h=Math.imul(h^(h>>>15), 0x85ebca6b)>>>0; h=Math.imul(h^(h>>>13), 0xc2b2ae35)>>>0;
  return ((h^(h>>>16))>>>0)/4294967296;
}
// Value noise in x (period P cells) and y.
function aurNoise(x, y, P, s){
  const xi=Math.floor(x), yi=Math.floor(y), fx=x-xi, fy=y-yi, ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
  const x0=((xi%P)+P)%P, x1=(x0+1)%P;
  const a=aurHashI(x0, yi, s), b=aurHashI(x1, yi, s), c=aurHashI(x0, yi+1, s), d=aurHashI(x1, yi+1, s);
  return a+(b-a)*ux+(c-a)*uy+(a-b-c+d)*ux*uy;
}
function aurStrHash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h, 16777619); } return h>>>0; }
// Hours from b to a round the clock, -12 to 12.
function aurCirc(a, b){ return ((a-b)%24+36)%24-12; }
// The page's day as a whole number of the epoch's days, the same all through the date in every
// calendar. Everything random about a night hangs on it and on the clock, never on the date
// string, so nothing jumps when the clock passes midnight.
function aurDayIndex(){ return Math.round(astroDay()*24/dayHours()-minutes/DAYMIN); }
// Substorms: two a night, one in the evening (21:36–23:24) and one after midnight (1:00–3:00),
// at times set by the night. Each brightens the arcs near midnight within minutes and fades over
// about half an hour. t is minutes since the start of day n; the onsets of the two nights before
// are counted too, so one carries on across midnight. rise is the e-folding time of the onset
// (minutes): 6 for the brightening, longer for the arcs' poleward spread.
function aurSubstorm(n, t, kh, rise=6){
  let s=0;
  for(let m=n-2;m<=n;m++){
    const day=(m-n)*1440;
    for(const t0 of [day+(21.6+1.8*aurHashI(m, 1, kh))*60, day+1440+(1.0+2.0*aurHashI(m, 2, kh))*60]){
      const dt=t-t0;
      if(dt>0) s+=(1-Math.exp(-dt/rise))*Math.exp(-dt/35);
    }
  }
  return Math.min(1.2, s*1.6);
}
// The aurora for the page's epoch, place and time, or {on:false, why} when none shows.
// A great storm (the Aurora storm button), of the class of September 1859, when aurora stood
// overhead near 40° magnetic latitude: the oval as for Kp 11, past the top of the Kp scale (Kp 7
// above the night's, at most); three times the energy; substorms one after another; and the red
// line strong, as low-energy electrons pour in at the oval's equatorward edge.
let aurStorm=false;
function auroraState(key, latDeg, clockMin, zenithCd){
  const [rmp, kp0, drive0, fO, fN]=AURORA_EPOCH[key]||AURORA_TODAY;
  // Each night has its own activity, blended into the next across the middle of the day.
  const seed=aurStrHash(key), n=aurDayIndex(), x=clockMin/DAYMIN, w=smooth01(0.35, 0.65, x);
  const night=j=>aurHashI(n-1, j, seed)*(1-w)+aurHashI(n, j, seed)*w;
  let kp=Math.max(0, kp0+(night(3)-0.5)*2), drive=drive0*(0.7+0.6*night(4));
  if(aurStorm){ kp=Math.min(11, kp+7); drive*=3; }
  const [cm, cn, wm, wn]=aurOvalToday(kp), e=[cm-wm, cm+wm, cn-wn, cn+wn].map(l=>aurScaleLat(l, rmp));
  const mid=(e[0]+e[1])/2, noon=(e[2]+e[3])/2, hwm=(e[1]-e[0])/2, hwn=(e[3]-e[2])/2;
  // Centre A+B·cos θ and half-width W0+W1·cos θ, θ the magnetic local time from noon.
  const A=(mid+noon)/2, B=(noon-mid)/2, W0=(hwm+hwn)/2, W1=(hwn-hwm)/2, mlt0=clockMin/DAYMIN*24;
  const here=A+B*Math.cos((mlt0-12)*Math.PI/12);
  const st={on:false, key, lat:latDeg, mlt0, A, B, W0, W1, here, mid, fO, fN};
  if(extK(key)>5){ st.why='hidden'; return st; }
  // An arc's red top, 300 km up, clears the horizon out to about 2,000 km (18°).
  let nearest=180;
  for(let m=0;m<24;m+=0.25){ const c=Math.cos((m-12)*Math.PI/12); nearest=Math.min(nearest, Math.abs(A+B*c-latDeg)-(W0+W1*c)); }
  st.edge=nearest;
  if(nearest>18){ st.why='far'; return st; }
  if(zenithCd>2){ st.why='bright'; return st; }
  st.on=true;
  st.sub=aurSubstorm(n, x*1440, seed); st.spread=aurSubstorm(n, x*1440, seed, 20);
  if(aurStorm){ const b=0.6+0.3*Math.sin((n+x)*1440/23); st.sub=Math.max(st.sub, b); st.spread=Math.max(st.spread, b); }
  st.red=aurStorm?5:1;
  st.iv=AUR_IV*drive; st.diff=AUR_DIFF*drive*(1+st.sub);
  st.spec=[fO*AUR_RATIO[0], fO*AUR_RATIO[1], fN*AUR_RATIO[2], fN*(1+0.3*(1-Math.min(fO, 1)))*AUR_RATIO[3]];
  // Extinction per emission: Rayleigh as λ^-4 and the rest of each epoch's extinction (aerosol or
  // haze) as λ^-α, with the organic haze steeper.
  const k=extK(key), alpha=key==='hadean44'?4:(key.startsWith('archean27')?2:1.3);
  st.k=AUR_LAMBDA.map(l=>0.15*Math.pow(550/l, 4)+Math.max(0, k-0.15)*Math.pow(550/l, alpha));
  // The window of longitudes the arcs texture covers: everywhere within 21.6° of here, or all
  // the way round when that reaches the pole.
  const reach=21.6;
  if(latDeg+reach>=89){ st.span=360; }
  else {
    let w=0; const r=Math.cos(reach*Math.PI/180), sp=Math.sin(latDeg*Math.PI/180), cp=Math.cos(latDeg*Math.PI/180);
    for(let l=Math.max(-89, latDeg-reach); l<=latDeg+reach; l+=0.5){
      const c=(r-sp*Math.sin(l*Math.PI/180))/(cp*Math.cos(l*Math.PI/180));
      if(c<1) w=Math.max(w, c<=-1?180:Math.acos(c)*180/Math.PI);
    }
    st.span=Math.min(360, 2*w+4);
  }
  st.refLat=Math.max(mid, 20);
  st.seed=seed;
  return st;
}
// The arcs at real time t (seconds): per texel of longitude east of here, for each arc, its
// offset poleward of its place in the oval (km), the offset's slope (km per degree of longitude), its
// brightness, and how tall its rays reach.
function auroraArcs(st, t){
  const N=AUR_N, out=st.arcBuf||(st.arcBuf=new Float32Array(N*AUR_ARCS*4)), off=new Float32Array(N);
  const cosRef=Math.cos(st.refLat*Math.PI/180), C=360*KM_DEG*cosRef, dl=st.span/N;
  const cells=L=>Math.max(1, Math.round(C/L)), P1=cells(900), P2=cells(180), P3=cells(35), PE=cells(1400), PM=cells(220), PH=cells(9);
  for(let i=0;i<AUR_ARCS;i++){
    const bI=AUR_ARC[i][1], sd=st.seed+i*101, dir=i%2?-1:1;
    for(let j=0;j<N;j++){
      const lon=(j+0.5)*dl-st.span/2, mlt=st.mlt0+lon/15, f=((mlt/24)%1+1)%1;
      const wMid=Math.exp(-0.5*Math.pow(aurCirc(mlt, 23.5)/2.8, 2)), sub=st.sub*wMid;
      let o=(st.spread||0)*wMid*(25+30*i);
      o+=60*(aurNoise(f*P1-dir*1.5*t*P1/C, t/120+i*17, P1, sd)-0.5)*2;
      o+=25*(aurNoise(f*P2+dir*2.5*t*P2/C, t/30+i*7, P2, sd+1)-0.5)*2;
      o+=7*(aurNoise(f*P3-dir*4*t*P3/C, t/8+i*3, P3, sd+2)-0.5)*2;
      off[j]=o;
      const env=i===0?0.55+0.45*aurNoise(f*PE, t/300, PE, sd+3):Math.max(0, Math.min(1, (aurNoise(f*PE, t/300, PE, sd+3)-0.35)/0.35));
      const med=0.6+0.4*aurNoise(f*PM+t*3*PM/C, t/25, PM, sd+4);
      const mltW=0.22+0.78*Math.exp(-0.5*Math.pow(aurCirc(mlt, 23)/4.2, 2))+0.3*Math.exp(-0.5*Math.pow(aurCirc(mlt, 12)/2, 2));
      const edge=st.span<360?Math.min(1, Math.min(j, N-1-j)/(N*0.03)):1;
      const o4=(i*N+j)*4;
      out[o4+2]=bI*env*med*mltW*(1+7*sub)*edge;
      out[o4+3]=0.3+aurNoise(f*PH, t/6, PH, sd+5);
    }
    for(let j=0;j<N;j++){
      const a=j>0?off[j-1]:(st.span>=360?off[N-1]:off[j]), b=j<N-1?off[j+1]:(st.span>=360?off[0]:off[j]);
      const o4=(i*N+j)*4; out[o4]=off[j]; out[o4+1]=(b-a)/(2*dl);
    }
  }
  return out;
}
// Rays: bright field-aligned streaks half a kilometre to two wide, in clusters along the arc a
// few kilometres apart, 0.5 km a texel and 4,096 km round.
function auroraRayData(){
  const N=8192, v=new Float32Array(N); let s=777;
  const rnd=()=>{ s=(Math.imul(s, 1103515245)+12345)>>>0; return s/4294967296; };
  for(let k=0;k<1100;k++){
    const c=rnd()*N, w=0.5+2.2*rnd()*rnd(), a=0.15+0.85*Math.pow(rnd(), 3);
    for(let d=-Math.ceil(w*3);d<=Math.ceil(w*3);d++){ const j=((Math.floor(c)+d)%N+N)%N; v[j]+=a*Math.exp(-0.5*Math.pow((Math.floor(c)+d-c)/w, 2)); }
  }
  let mx=0; for(const x of v) mx=Math.max(mx, x);
  return Uint8Array.from(v, x=>Math.round(255*Math.min(1, x/(mx*0.5))));
}
const AUR_RAYS=auroraRayData();
// Ray brightness from the two texture lookups (as in the shader), and its mean, so that rays
// gather an arc's light without changing its total.
function aurRayCurve(rr){ const x=Math.min(1, Math.max(0, (rr-0.05)/0.7)); return 0.15+2.2*x*x*(3-2*x); }
const AUR_RAY_MEAN=(()=>{ let s=0, n=0; for(let i=0;i<AUR_RAYS.length;i+=3) for(let j=0;j<AUR_RAYS.length;j+=97){ s+=aurRayCurve((0.7*AUR_RAYS[i]+0.3*AUR_RAYS[j])/255); n++; } return s/n; })();
// Textures for the arcs and rays in a WebGL2 context; store keeps them per context. The arcs
// are uploaded when version v is new.
function auroraTextures(gl, store, arcs, v){
  if(!store.aurArcs){
    const mk=()=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    store.aurArcs=mk(); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, AUR_N, AUR_ARCS, 0, gl.RGBA, gl.FLOAT, null);
    store.aurRays=mk(); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 8192, 1, 0, gl.RED, gl.UNSIGNED_BYTE, AUR_RAYS);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  gl.bindTexture(gl.TEXTURE_2D, store.aurArcs);
  if(store.v!==v){ gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, AUR_N, AUR_ARCS, gl.RGBA, gl.FLOAT, arcs); store.v=v; }
}
// The arcs for now, shared by the dome and VR. Folds and brightness change over seconds, so the
// arcs are rebuilt ten times a second; the rays move in the shader every frame (t).
let aurFrame={t:-1, st:null, arcs:null, v:0};
function auroraFrame(st){
  const t=(performance.now()/1000)%21600;
  if(aurFrame.st!==st || Math.abs(aurFrame.t-t)>0.1){ aurFrame={t, st, arcs:auroraArcs(st, t), v:aurFrame.v+1}; }
  return {t, arcs:aurFrame.arcs, v:aurFrame.v};
}
// Uniform locations for a program that includes AUR_GLSL.
const AUR_UNIFORMS=['aurRayK','aurW0','aurW1','aurRed','aurLat','aurMlt0','aurA','aurB','aurSpan','aurIv','aurDiff','aurT','aurRefLat','aurSub','aurVr','aurSpec','aurK','aurSun'];
function auroraUniforms(gl, prog, arcsUnit, raysUnit){
  const u={}; for(const n of AUR_UNIFORMS) u[n]=gl.getUniformLocation(prog, n);
  gl.useProgram(prog);
  gl.uniform1i(gl.getUniformLocation(prog, 'aurArcs'), arcsUnit); gl.uniform1i(gl.getUniformLocation(prog, 'aurRays'), raysUnit);
  return u;
}
function auroraSetUniforms(gl, u, st, t, sunDir){
  // The rays' place along the arc, in turns of the ray texture (4,096 km) per hour of magnetic local
  // time, a whole number of turns round the oval.
  gl.uniform1f(u.aurRayK, Math.max(1, Math.round(360*KM_DEG*Math.cos(st.refLat*Math.PI/180)/4096))/24);
  gl.uniform1f(u.aurW0, st.W0); gl.uniform1f(u.aurW1, st.W1); gl.uniform1f(u.aurRed, st.red); gl.uniform1f(u.aurLat, st.lat*Math.PI/180); gl.uniform1f(u.aurMlt0, st.mlt0);
  gl.uniform1f(u.aurA, st.A); gl.uniform1f(u.aurB, st.B); gl.uniform1f(u.aurSpan, st.span);
  gl.uniform1f(u.aurIv, st.iv); gl.uniform1f(u.aurDiff, st.diff); gl.uniform1f(u.aurT, t);
  gl.uniform1f(u.aurRefLat, st.refLat); gl.uniform1f(u.aurSub, st.sub); gl.uniform1f(u.aurVr, 4+10*st.sub);
  gl.uniform4fv(u.aurSpec, st.spec); gl.uniform4fv(u.aurK, st.k); gl.uniform3fv(u.aurSun, sunDir);
}
const glv=v=>v.map(x=>x.toExponential(4)).join(', ');
// auroraLight(rd, pxAng): the aurora's light in direction rd (east, north, up), as linear sRGB in
// cd/m², with its luminance to the dark-adapted eye (as above) in w. It marches up the ray in
// altitude, from 80 to 420 km, more finely low down where the arcs' lower borders are. Each arc
// is a sheet along the field, a Gaussian across it, so the light from each step is the exact
// integral of that Gaussian along the step: a sheet seen edge-on along its length is bright,
// seen face-on dim. Field lines lean toward the equator going up (dip angle from
// tan I = 2 tan λ), so overhead the rays converge on the magnetic zenith south of the zenith.
// Emission by height, per unit column, for an arc with lower border hb (108 km, lower in a
// substorm, higher at the cusp): green 557.7 nm from hb with a scale height of 22–36 km (taller in
// bright rays); N2+ blue reaching 1.7 times higher; the N2 first positive bands in a thin layer
// at the lower border, pinker in substorms when faster electrons reach lower; red 630 nm peaking
// 105 km above it (quenched below), in a wider sheet since O(1D) lives 110 s. In sunlight, high up, N2+ scatters sunlight resonantly and the blue gains up
// to fourfold. The day-side cusp is mostly red. Pulsating patches flicker in the morning diffuse
// aurora.
const AUR_GLSL=`
uniform sampler2D aurArcs; uniform sampler2D aurRays;
uniform float aurRayK, aurRed, aurLat, aurMlt0, aurA, aurB, aurW0, aurW1, aurSpan, aurIv, aurDiff, aurT, aurRefLat, aurSub, aurVr;
uniform vec4 aurSpec, aurK;
uniform vec3 aurSun;
const float AUR_RE=6371.0, AUR_KMD=${KM_DEG.toFixed(1)};
float aurErf(float x){
  float s=sign(x); x=abs(x); float t=1.0/(1.0+0.3275911*x);
  return s*(1.0-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*exp(-x*x));
}
// The integral of exp(-d²/2σ²) over a step of length L along which d goes linearly from d0 to d1.
float aurSheet(float d0, float d1, float L, float sg){
  float dd=d1-d0;
  if(abs(dd)<0.02*sg){ float dm=0.5*(d0+d1)/sg; return L*exp(-0.5*dm*dm); }
  float k=0.70710678/sg;
  return L/dd*sg*1.25331414*(aurErf(d1*k)-aurErf(d0*k));
}
float aurHash(vec2 p){ vec3 q=fract(vec3(p.xyx)*vec3(0.1031, 0.1030, 0.0973)); q+=dot(q, q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float aurNoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(aurHash(i), aurHash(i+vec2(1.0, 0.0)), f.x), mix(aurHash(i+vec2(0.0, 1.0)), aurHash(i+vec2(1.0, 1.0)), f.x), f.y); }
float aurCirc(float a, float b){ return mod(a-b+36.0, 24.0)-12.0; }
const float AUR_FR[4]=float[4](${AUR_ARC.map(a=>a[0].toFixed(2)).join(', ')});
// Arc i at point P (Earth-centred km; ax the axis, m0 the meridian here): the signed distance
// across its sheet (km), its texel a, and the point's place along the arc s (km).
float aurArcD(int i, vec3 P, vec3 ax, vec3 m0, float cosRef, out float s, out vec4 a){
  float r=length(P), h=r-AUR_RE; vec3 n=P/r;
  float latR=asin(clamp(dot(n, ax), -1.0, 1.0));
  vec3 pp=n-ax*dot(n, ax);
  float lonD=atan(pp.x, dot(pp, m0))*57.2957795, mlt=aurMlt0+lonD/15.0, th=(mlt-12.0)*0.261799388;
  float latF=latR*57.2957795+(h-110.0)/(2.0*tan(max(latR, 0.05))*AUR_KMD);
  a=abs(lonD)<0.5*aurSpan?textureLod(aurArcs, vec2(lonD/aurSpan+0.5, (float(i)+0.5)*0.25), 0.0):vec4(0.0);
  float slope=(-(aurB+AUR_FR[i]*aurW1)*sin(th)*0.0174532925*AUR_KMD+a.g)/(AUR_KMD*max(cos(latR), 0.02));
  s=mlt*aurRayK;
  return ((latF-aurA-aurB*cos(th)-AUR_FR[i]*(aurW0+aurW1*cos(th)))*AUR_KMD-a.r)*inversesqrt(1.0+slope*slope);
}
vec4 auroraLight(vec3 rd, float pxAng){
  if(rd.z<=0.0) return vec4(0.0);
  float sl=sin(aurLat), cl=cos(aurLat);
  vec3 ax=vec3(0.0, cl, sl), m0=vec3(0.0, -sl, cl);
  float b2=AUR_RE*AUR_RE*rd.z*rd.z;
  // Skip rays that pass nowhere near the oval.
  bool near=false; float dlPrev=0.0;
  for(int k=0;k<7;k++){
    float h=80.0+340.0*float(k)/6.0, t=-AUR_RE*rd.z+sqrt(b2+(2.0*AUR_RE+h)*h);
    vec3 n=normalize(vec3(rd.xy*t, AUR_RE+rd.z*t));
    float lat=asin(clamp(dot(n, ax), -1.0, 1.0))*57.2957795;
    vec3 pp=n-ax*dot(n, ax);
    float mlt=aurMlt0+atan(pp.x, dot(pp, m0))*3.81971863;
    float c=cos((mlt-12.0)*0.261799388), dl=lat-(aurA+aurB*c);
    if(abs(dl)<aurW0+aurW1*c+5.0 || (k>0 && dl*dlPrev<0.0)){ near=true; break; }
    dlPrev=dl;
  }
  if(!near) return vec4(0.0);
  const float SIG[4]=float[4](${AUR_ARC.map(a=>a[2].toFixed(1)).join(', ')});
  vec4 I=vec4(0.0);
  float dPrev[4]=float[4](0.0, 0.0, 0.0, 0.0);
  float tPrev=0.0, hPrev=80.0, sPrev=0.0, cosRef=cos(aurRefLat*0.0174532925);
  const int NS=48;
  for(int k=0;k<=NS;k++){
    float h=80.0+340.0*pow(float(k)/float(NS), 1.8);
    float t=-AUR_RE*rd.z+sqrt(b2+(2.0*AUR_RE+h)*h);
    vec3 P=vec3(rd.xy*t, AUR_RE+rd.z*t), n=P/(AUR_RE+h);
    float latR=asin(clamp(dot(n, ax), -1.0, 1.0)), lat=latR*57.2957795;
    vec3 pp=n-ax*dot(n, ax);
    float lonD=atan(pp.x, dot(pp, m0))*57.2957795, mlt=aurMlt0+lonD/15.0;
    float th=(mlt-12.0)*0.261799388, lc=aurA+aurB*cos(th), dlc=-aurB*sin(th)*0.0174532925;
    float hw=aurW0+aurW1*cos(th), dhw=-aurW1*sin(th)*0.0174532925;
    float L=t-tPrev, hm=0.5*(h+hPrev);
    float kmLon=AUR_KMD*max(cos(latR), 0.02);
    // The foot of this point's field line, at 110 km.
    float latF=lat+(h-110.0)/(2.0*tan(max(latR, 0.05))*AUR_KMD);
    float cusp=exp(-0.5*pow(aurCirc(mlt, 12.0)/2.2, 2.0));
    float u=lonD/aurSpan+0.5;
    bool inWin=abs(lonD)<0.5*aurSpan;
    float sKm=mlt*aurRayK;
    // A pixel's footprint along the arc, longer where the view runs along it, sets the rays' blur.
    float lodR=log2(max(t*pxAng/(0.5*max(length(cross(rd, normalize(cross(ax, n)))), 0.03)), 1.0));
    float sunUp=dot(P, aurSun)>0.0?1.0:smoothstep(-20.0, 20.0, length(cross(P, aurSun))-AUR_RE-40.0);
    sunUp*=smoothstep(130.0, 220.0, hm);
    float hb=108.0-6.0*aurSub+45.0*cusp;
    for(int i=0;i<4;i++){
      vec4 a=inWin?textureLod(aurArcs, vec2(u, (float(i)+0.5)*0.25), 0.0):vec4(0.0);
      float slope=((dlc+AUR_FR[i]*dhw)*AUR_KMD+a.g)/kmLon;
      float d=((latF-lc-AUR_FR[i]*hw)*AUR_KMD-a.r)*inversesqrt(1.0+slope*slope);
      if(k>0 && a.b>0.001 && (min(abs(d), abs(dPrev[i]))<110.0 || d*dPrev[i]<0.0)){
        float sg=SIG[i], d0=dPrev[i];
        float wG=aurSheet(d0, d, L, sg), wR=aurSheet(d0, d, L, 22.0)*sg/22.0;
        // Where in the step the ray meets the sheet: the rays and the height profile are taken
        // there, so they move smoothly from pixel to pixel instead of jumping between steps.
        float f=d*d0<0.0?d0/(d0-d):1.0/(1.0+exp(0.5*(d*d-d0*d0)/(sg*sg)));
        float hx=mix(hPrev, h, f), sx=mix(sPrev, sKm, f);
        if(d*d0<0.0){
          // One secant step on the crossing, so thin rays stay straight.
          float tf=mix(tPrev, t, f), sf, tc; vec4 af;
          float df=aurArcD(i, vec3(rd.xy*tf, AUR_RE+rd.z*tf), ax, m0, cosRef, sf, af);
          if(df*d0<0.0){ float g=d0/(d0-df); tc=mix(tPrev, tf, g); sx=mix(sPrev, sf, g); }
          else { float g=df/(df-d); tc=mix(tf, t, g); sx=mix(sf, sKm, g); }
          hx=length(vec3(rd.xy*tc, AUR_RE+rd.z*tc))-AUR_RE;
        }
        float r1=textureLod(aurRays, vec2(sx-aurVr*aurT/4096.0+float(i)*0.137, 0.5), lodR).r;
        float r2=textureLod(aurRays, vec2(2.0*sx+aurVr*0.6*aurT/4096.0+float(i)*0.71, 0.5), lodR).r;
        float rr=r1*0.7+r2*0.3, ray=(0.15+2.2*smoothstep(0.05, 0.75, rr))*${(1/AUR_RAY_MEAN).toFixed(3)};
        float hg=(22.0+14.0*a.a)*(0.7+0.6*rr), z=max(hx-hb, 0.0);
        float e=smoothstep(hb-3.0, hb+2.0, hx);
        float pg=e*exp(-z/hg)/hg, pb=e*exp(-z/(1.7*hg))/(1.7*hg);
        float p1=smoothstep(hb-9.0, hb-3.0, hx)*exp(-max(hx-hb+5.0, 0.0)/7.0)/7.0;
        float hr=hb+105.0, pr=(hx<hr?exp(-pow((hx-hr)/38.0, 2.0)):exp(-(hx-hr)/95.0))/129.0;
        float bb=a.b*aurIv;
        I.x+=wG*bb*ray*pg*(1.0-0.75*cusp);
        I.z+=wG*bb*ray*pb*(1.0+3.0*sunUp);
        I.w+=wG*bb*ray*p1*(1.0-0.75*cusp)*(0.5+1.0*aurSub);
        I.y+=wR*bb*(0.6+0.4*ray)*pr*(0.15*aurRed+2.2*cusp);
      }
      dPrev[i]=d;
    }
    if(k>0){
      // Diffuse aurora equatorward of the arcs, flickering in patches toward dawn, and the red
      // glow over the whole oval.
      float dl=latF-lc;
      float gd=exp(-0.5*pow((dl+0.65*hw)/(0.3*hw), 2.0));
      if(gd>0.003){
        float wM=exp(-0.5*pow(aurCirc(mlt, 3.5)/2.5, 2.0));
        if(wM>0.01){
          vec2 q=vec2(lonD*kmLon, latF*AUR_KMD);
          float pat=smoothstep(0.55, 0.75, aurNoise(q/45.0)), ph=aurNoise(q/120.0+7.3);
          float on=smoothstep(0.2, 0.6, 0.5+0.5*sin(6.2831853*aurT/(6.0+6.0*ph)+ph*20.0));
          gd*=1.0-wM+wM*(0.25+1.6*pat*on);
        }
        float e=smoothstep(105.0, 112.0, hm), z=max(hm-110.0, 0.0), pg=e*exp(-z/25.0)/25.0;
        I.x+=L*aurDiff*gd*pg;
        I.z+=L*aurDiff*gd*pg*(1.0+3.0*sunUp);
      }
      float gr=exp(-0.5*pow(dl/(0.7*hw), 2.0));
      float hr=240.0+40.0*cusp, pr=(hm<hr?exp(-pow((hm-hr)/38.0, 2.0)):exp(-(hm-hr)/95.0))/129.0;
      I.y+=L*aurDiff*0.35*aurRed*gr*pr*(1.0+2.0*cusp);
    }
    tPrev=t; hPrev=h; sPrev=sKm;
  }
  I*=aurSpec;
  float el=asin(rd.z)*57.2957795;
  float X=1.0/(sin(el*0.0174532925)+0.50572*pow(el+6.07995, -1.6364));
  I*=pow(vec4(10.0), -0.4*aurK*X);
  return vec4(I.x*vec3(${glv(AUR_RGB[0])})+I.y*vec3(${glv(AUR_RGB[1])})+I.z*vec3(${glv(AUR_RGB[2])})+I.w*vec3(${glv(AUR_RGB[3])}),
    dot(I, vec4(${glv(AUR_SCOT)})));
}
`;
// The VR pass: the aurora for each pixel of a reduced-size target, in cd/m² times 1000.
const AURFS=`#version 300 es
precision highp float;
uniform vec2 res; uniform float yaw, pitch, fov;
${AUR_GLSL}
out vec4 fragColor;
void main(){
  float aspect=res.x/max(res.y, 1.0), fy=tan(fov*0.5), fx=fy*aspect;
  float u=((gl_FragCoord.x/res.x)*2.0-1.0)*fx, v=((gl_FragCoord.y/res.y)*2.0-1.0)*fy;
  float cp=cos(pitch), sp=sin(pitch), cy=cos(yaw), sy=sin(yaw);
  vec3 rd=normalize(vec3(sy*cp, cy*cp, sp)+u*vec3(cy, -sy, 0.0)+v*vec3(-sy*sp, -cy*sp, cp));
  fragColor=auroraLight(rd, 2.0*fy/res.y)*1000.0;
}`;
// The aurora's light (auroraLight) added to a sky of luminance ratio rBg shown as sRGB skyC,
// under the display curve, as the Milky Way is added in the sky shader. Its colour is the
// spectrum's, as the cones see it. Its brightness is the larger of what the rods and the cones
// see, a simple stand-in for mesopic vision, so violet shows by the rods and a red border by
// the cones; it becomes the cones' alone as the sky brightens through the mesopic range.
const AUR_MIX_GLSL=`
vec3 auroraMix(vec3 skyC, float rBg, vec4 aur){
  float Yp=dot(aur.rgb, vec3(0.2126, 0.7152, 0.0722));
  if(!(Yp>0.0)) return skyC;
  float m=clamp(log(max(rBg*rCd, 1e-9)/0.005)/6.9077553, 0.0, 1.0);
  float rA=mix(max(aur.a, Yp), Yp, m)/rCd;
  if(rA<rBg*0.002) return skyC;
  vec3 c=aur.rgb/Yp; float mn=min(c.r, min(c.g, c.b));
  if(mn<0.0) c=1.0+(c-1.0)/(1.0-mn);
  float rNew=rBg+rA, tBg=toneT(rBg), tNew=toneT(rNew);
  vec3 lin=s2lin3(skyC)*(tBg>0.0?(tNew/tBg)*(rBg/rNew):0.0)+c*tNew*(rA/rNew);
  return lin2s3(clamp(lin, 0.0, 1.0));
}`;
// The dome: the 2D dome canvas with the aurora added, drawn on a WebGL canvas laid over it.
const DOMEAURFS=`#version 300 es
precision highp float;
uniform sampler2D domeTex; uniform sampler2D skyLog;
uniform vec2 res; uniform float nr, na;
uniform vec4 toneU; uniform float rCd;
float lin2s(float v){ return v<=0.0031308?12.92*v:1.055*pow(v, 1.0/2.4)-0.055; }
float s2lin(float v){ return v<=0.04045?v/12.92:pow((v+0.055)/1.055, 2.4); }
vec3 s2lin3(vec3 c){ return vec3(s2lin(c.r), s2lin(c.g), s2lin(c.b)); }
vec3 lin2s3(vec3 c){ return vec3(lin2s(c.r), lin2s(c.g), lin2s(c.b)); }
float toneT(float r){
  if(r<=0.0) return 0.0;
  float su=lin2s(min(toneU.z, toneU.x*pow(r, toneU.y))), sl=${TOE_A}-${TOE_B}*exp(-log(r*toneU.w)/(2.302585*${TOE_W}));
  float m=max(su, sl), s=m+${TOE_W2}*log(1.0+exp(-abs(su-sl)/${TOE_W2}));
  return s2lin(clamp(s, 0.0, 1.0));
}
${AUR_GLSL}
${AUR_MIX_GLSL}
out vec4 fragColor;
void main(){
  vec2 uv=vec2(gl_FragCoord.x/res.x, 1.0-gl_FragCoord.y/res.y);
  vec3 base=texture(domeTex, uv).rgb;
  vec2 d=gl_FragCoord.xy-0.5*res; // east right, north up
  float R=res.x*0.46, r=length(d);
  if(r<R){
    float zen=90.0*r/R, az=atan(d.x, d.y), el=(90.0-zen)*0.0174532925;
    vec3 rd=vec3(sin(az)*cos(el), cos(az)*cos(el), sin(el));
    vec4 aur=auroraLight(rd, 1.5707963/R);
    vec4 s=texture(skyLog, vec2((fract(az/6.28318530718)*na+0.5)/(na+1.0), (zen/90.0*nr+0.5)/(nr+1.0)));
    float rBg=pow(10.0, s.a*${LOGR_SPAN.toFixed(1)}+${LOGR_LO.toFixed(1)});
    base=auroraMix(base, rBg, aur);
  }
  fragColor=vec4(base, 1.0);
}`;
// What the readout says.
function auroraReadout(st){
  if(!st) return '';
  if(st.why==='hidden') return 'hidden by the CO₂';
  // Distance from here to the oval's nearer edge, on this meridian now.
  const off=Math.abs(st.here-st.lat)-(st.W0+st.W1*Math.cos((st.mlt0-12)*Math.PI/12));
  const where=off<0.5?'overhead':`${Math.max(1, Math.round(off))}° ${st.here>st.lat?'north':'south'}`;
  if(st.why==='far') return st.lat<st.mid?'oval too far north':'inside the polar cap';
  const col=st.fO>=0.7?'green, red tops':(st.fO>=0.25?'pale green and violet':'violet and pink (nitrogen)');
  return `oval ${where} · `+(st.why==='bright'?'sky too bright':col);
}
// The dome overlay.
const domeAur={gl:null, canvas:null, prog:null, u:null, store:{}, raf:0, last:0, visible:true, shown:false};
function domeAurInit(){
  if(domeAur.gl||domeAur.failed) return domeAur.gl;
  const c=document.getElementById('domeAur');
  const gl=c&&c.getContext('webgl2', {alpha:false, depth:false, stencil:false, antialias:false, preserveDrawingBuffer:true});
  if(!gl){ domeAur.failed=true; return null; }
  const vs=glShader(gl, gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}');
  const fs=glShader(gl, gl.FRAGMENT_SHADER, DOMEAURFS);
  if(!vs||!fs){ domeAur.failed=true; return null; }
  const p=gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){ console.warn(gl.getProgramInfoLog(p)); domeAur.failed=true; return null; }
  const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u=auroraUniforms(gl, p, 2, 3);
  for(const n of ['res','nr','na','toneU','rCd']) u[n]=gl.getUniformLocation(p, n);
  gl.uniform1i(gl.getUniformLocation(p, 'domeTex'), 0); gl.uniform1i(gl.getUniformLocation(p, 'skyLog'), 1);
  const tex=()=>{ const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  domeAur.domeTex=tex(); domeAur.skyTex=tex();
  Object.assign(domeAur, {gl, canvas:c, prog:p, u});
  if(window.IntersectionObserver) new IntersectionObserver(es=>{ domeAur.visible=es[0].isIntersecting; if(domeAur.visible) domeAurKick(); }).observe(c);
  document.addEventListener('visibilitychange', domeAurKick);
  return gl;
}
// Called after renderDay draws the dome: take the new dome and sky, then draw.
function paintDomeAurora(){
  const st=skyNow&&skyNow.aur, on=!vrOn && st && st.on;
  const c=document.getElementById('domeAur');
  if(!on){ if(domeAur.shown){ c.style.display='none'; domeAur.shown=false; } return; }
  const gl=domeAurInit(); if(!gl) return;
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, domeAur.domeTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dome);
  const cg=skyNow.colgrid, h=cg.length, w=cg[0].length, data=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) data[(y*w+x)*4+3]=encodeLogR(skyNow.rgrid[y][x]);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, domeAur.skyTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  domeAur.nr=h-1; domeAur.na=w-1;
  drawDomeAurora();
  if(!domeAur.shown){ c.style.display='block'; domeAur.shown=true; }
  domeAurKick();
}
function drawDomeAurora(){
  const gl=domeAur.gl, st=skyNow&&skyNow.aur; if(!gl||!st||!st.on) return;
  const c=domeAur.canvas, u=domeAur.u, f=auroraFrame(st);
  gl.viewport(0, 0, c.width, c.height); gl.useProgram(domeAur.prog);
  gl.activeTexture(gl.TEXTURE2); auroraTextures(gl, domeAur.store, f.arcs, f.v);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, domeAur.store.aurRays);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, domeAur.store.aurArcs);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, domeAur.domeTex);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, domeAur.skyTex);
  gl.uniform2f(u.res, c.width, c.height); gl.uniform1f(u.nr, domeAur.nr); gl.uniform1f(u.na, domeAur.na);
  gl.uniform4f(u.toneU, skyNow.toneK, skyNow.toneP, 0.95, TOE_CD); gl.uniform1f(u.rCd, skyNow.rCd);
  auroraSetUniforms(gl, u, st, f.t, new Float32Array(horizDir(skyNow.sunAz, 90-skyNow.sza)));
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
// Keep the dome's aurora moving at about 30 frames a second while it can be seen.
function domeAurKick(){
  if(domeAur.raf) return;
  const step=now=>{
    domeAur.raf=0;
    if(vrOn||!domeAur.shown||!domeAur.visible||document.hidden) return;
    if(now-domeAur.last>=32){ domeAur.last=now; drawDomeAurora(); }
    domeAur.raf=requestAnimationFrame(step);
  };
  domeAur.raf=requestAnimationFrame(step);
}
// The dome's colour under the pointer, with the aurora when it shows.
function domePixel(x, y){
  if(!domeAur.shown||!domeAur.gl) return null;
  const px=new Uint8Array(4); domeAur.gl.readPixels(x, domeAur.canvas.height-1-y, 1, 1, domeAur.gl.RGBA, domeAur.gl.UNSIGNED_BYTE, px);
  return px;
}
