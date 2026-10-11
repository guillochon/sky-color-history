// Contrails: the lines of ice behind jet airliners at cruise height, in the epochs that have them,
// and the dust trails superbolides leave (Chelyabinsk, 2013). The cloud pass draws both
// (shader_clouds.js contrailsAt) as tubes of cloud along a path. Once made, a trail drifts with the
// wind as the clouds do (a jet's at the cirrus's pace), spreads, and fades. Everything comes from
// the sky's time, so a moment always has the same ones.
//
// Jets. Cruising airliners over busy mid-latitude land (Europe, the eastern US) average about 1.1
// per 10,000 km² by day: some 2,000 in the air over Europe's 10 million km² at once (Eurocontrol,
// about 30,000 flights a day of 1.5 hours). They are taken to fly straight through a circle of 150 km
// about the observer, beyond which a trail at 10 km is lost in the haze near the horizon, at
// 230–255 m/s and flight levels 300–400 (9.1–12.2 km), most along a few airways that cross the place
// in both directions. A contrail forms where the exhaust's water freezes (Schmidt 1941, Appleman
// 1953): at cruise height almost always at mid and high latitudes, under half the time in the warm
// tropical upper air. In dry air it is gone in seconds to a minute; in ice-supersaturated air
// (ISSRs, 10–20% of the cruise levels at mid-latitudes, in patches a hundred or two kilometres
// across, Gierens et al. 1999) it persists for hours, sinking 100–300 m with the wake vortices and
// spreading into contrail cirrus a few kilometres wide and a few tenths in optical depth
// (Schumann 2005; Minnis et al. 1998). Traffic falls at night, was under half today's in 1990, and
// is taken as twice today's in 2100.
//
// Superbolides. Meteors brighter than magnitude −15 (bodies of a metre and up) leave a trail of
// dust and condensed vapour from about 80 km down to where they break up, 25–40 km (Chelyabinsk's
// was −27, about 1–2 km wide, and was seen for over an hour, Borovička et al. 2013). They come from
// the meteor generator (meteors.js, stream 2), so the fireball that makes one is the one seen; today
// one falls within 1,100 km about once in three years, in the bombardment several an hour. The
// winds above the tropopause turn and change speed with height, so a trail is bent and sheared.
const CT_C=24, CT_S=256, CT_ROWS=CT_C+CT_S;      // trails and segments the cloud pass takes
const CT_R=150, CT_BIN=600, CT_LOOK=3*3600;      // km about the observer; flights are made per 10 minutes, kept 3 hours
const CT_N0=1.1e-4;                              // cruising airliners per km², busy mid-latitude land by day
const CT_TRAFFIC={modern:1, modernpoll:1, ozonehole:0.45, y2100:2};
const CT_LAT={'Equator':0.35, 'Mid-latitude':1, 'Polar':0.3, 'Mid-latitude S':0.2, 'Polar S':0.02};
const CT_FORM={'Equator':0.45, 'Mid-latitude':0.92, 'Polar':0.97, 'Mid-latitude S':0.92, 'Polar S':0.97};
const CT_ISSR={'Equator':0.10, 'Mid-latitude':0.15, 'Polar':0.12, 'Mid-latitude S':0.13, 'Polar S':0.10};
const CT_BOLIDE=-15;                             // meteors this bright or brighter leave a dust trail
const CT={flights:new Map(), key:'', n:0, T:0, data:null, tex:null, uploaded:''};
// Drift since a trail was made, in metres east and north, for a parcel z metres up, over dt seconds
// of sky time. The clouds move 88 m per clock minute toward −(1, 0.42) (vr_paint.js cloudScroll),
// the cirrus 1.6 times as fast (shader_clouds.js); air at jet heights moves with the cirrus. Above
// the tropopause the wind turns and changes speed with height, differently from day to day.
function ctDrift(z, dt){
  const m=88*dt/(dayHours()*2.5);
  let k=1+0.6*Math.min(1, Math.max(0, z)/9000), ang=0;
  if(z>13000){
    const day=Math.floor(CT.T/86400), p1=6.283*h12xy(day, 3.1), p2=6.283*h12xy(day, 7.7), w=smoothstep(13000, 19000, z);
    ang=w*2.2*Math.sin((z-13000)/9000+p1);
    k=1.6*(1-w)+w*1.6*(0.4+1.4*Math.abs(Math.sin((z-13000)/16000+p2)));
  }
  const c=Math.cos(ang), s=Math.sin(ang);
  return [-m*k*(c-0.42*s), -m*k*(s+0.42*c)];
}
function ctWave(t, period, s){ const x=t/period, i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return h12xy(i, s)*(1-u)+h12xy(i+1, s)*u; }
// Value noise in 3D, 0 to 1.
function ctNoise(x, y, z){
  const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z), fx=x-xi, fy=y-yi, fz=z-zi;
  const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), sz=fz*fz*(3-2*fz), h=(i, j, k)=>h12xy(i+157*k, j-113*k);
  const l=(k)=>{ const a=h(xi, yi, k)*(1-sx)+h(xi+1, yi, k)*sx, b=h(xi, yi+1, k)*(1-sx)+h(xi+1, yi+1, k)*sx; return a*(1-sy)+b*sy; };
  return l(zi)*(1-sz)+l(zi+1)*sz;
}
// The standard normal's quantile (Abramowitz & Stegun 26.2.23).
function probit(p){
  const q=p<0.5?p:1-p, t=Math.sqrt(-2*Math.log(q)), z=t-(2.515517+0.802853*t+0.010328*t*t)/(1+1.432788*t+0.189269*t*t+0.001308*t*t*t);
  return p<0.5?-z:z;
}
function ctPoisson(l, rng){ if(!(l>0)) return 0; if(l>40) return Math.max(0, Math.round(l+Math.sqrt(l)*gauss01(rng))); let n=0, p=Math.exp(-l), s=p; const u=rng(); while(u>s&&n<500){ n++; p*=l/n; s+=p; } return n; }
// The airways over this latitude's place: heading and offset from the observer (km).
function ctAirways(){
  const rng=mulberry32(metHash('airways|'+dLat)), out=[];
  for(let i=0;i<3;i++) out.push({h:Math.PI*rng(), p:(rng()*2-1)*70, w:0.5+rng()});
  return out;
}
// Traffic at local hour h: quiet from midnight to five, busy from seven to ten at night.
function ctHourly(h){ return 0.15+0.95*smooth01(4.5, 7.5, h)*(1-smooth01(21.5, 24.5, h)); }
// The flights of bin b (sky seconds [b·600, (b+1)·600)) entering the circle, made once and kept.
function ctFlights(b){
  const key=EP[dIdx].key, id=key+'|'+dLat+'|'+b;
  let got=CT.flights.get(id);
  if(got) return got;
  got=[];
  const traffic=(CT_TRAFFIC[key]||0)*(CT_LAT[dLat]??1);
  if(traffic>0){
    const rng=mulberry32(metHash('ct|'+id)), aw=ctAirways(), wsum=aw.reduce((a, w)=>a+w.w, 0);
    const T0=b*CT_BIN, hour=pageAt(T0/86400).min/60;
    // Flights crossing a circle of radius R, at density n and speed v: 2nvR a second.
    const n=ctPoisson(2*CT_N0*traffic*ctHourly(hour)*0.24*CT_R*CT_BIN, rng);
    const form=(CT_FORM[dLat]??0.9)*(key==='y2100'?0.85:1);
    for(let i=0;i<n;i++){
      let h, p;
      if(rng()<0.65){
        let u=rng()*wsum, w=aw[0]; for(const a of aw){ u-=a.w; if(u<=0){ w=a; break; } }
        const back=rng()<0.5; h=w.h+(back?Math.PI:0); p=(back?-w.p:w.p)+2.5*gauss01(rng);
      }else{ h=2*Math.PI*rng(); p=(rng()*2-1)*CT_R; }
      if(Math.abs(p)>=CT_R) continue;
      const c=Math.sqrt(CT_R*CT_R-p*p), d=[Math.sin(h), Math.cos(h)], nr=[Math.cos(h), -Math.sin(h)];
      const v=0.23+0.025*rng(), tin=T0+CT_BIN*rng();
      got.push({tin, tout:tin+2*c/v, E:[nr[0]*p-d[0]*c, nr[1]*p-d[1]*c], d, v, alt:(30+Math.floor(11*rng()))*0.3048,
        form:rng()<form, short:8+45*rng(), keep:1800+5400*rng(), seed:rng()});
    }
  }
  CT.flights.set(id, got);
  return got;
}
// How long a contrail made at (x, y) km, alt km, at sky time T lasts: seconds in dry air, hours
// in an ISSR. The ISSRs drift with the wind, and how much of the sky they fill follows the weather
// systems over days and the era's cirrus.
function ctLife(f, x, y, alt, T){
  const day=T/86400, dr=ctDrift(alt*1000, T-Math.floor(day)*86400);
  const fill=(CT_ISSR[dLat]??0.12)*(0.25+1.6*ctWave(day, 2.7, 4.2))*(0.5+((vrGL&&vrGL.field)?vrGL.field.cirrus:0.5));
  const nz=ctNoise((x-dr[0]/1000)/140+31.7*Math.floor(day), (y-dr[1]/1000)/140, alt/0.7+7.3*h12xy(Math.floor(day), 1.9));
  // The noise is near normal about 0.5 with a spread of 0.17: the threshold leaving the top fill of it.
  const thr=0.5+0.17*probit(1-Math.min(0.7, Math.max(0.005, fill)));
  return f.short+f.keep*smooth01(thr-0.03, thr+0.03, nz);
}
// One trail as points along it, oldest last: position (m, observer's horizon frame, curving with
// the Earth), horizontal and vertical widths (σ, m), optical depth seen from below, distance along.
// Jets: width and depth as the trail ages (s), and its fall with the wake vortices.
function ctJetPoint(f, te, T, life){
  const a=T-te, P=[f.E[0]+f.d[0]*f.v*(te-f.tin), f.E[1]+f.d[1]*f.v*(te-f.tin)];
  const z=f.alt*1000, dr=ctDrift(z, a), x=P[0]*1000+dr[0], y=P[1]*1000+dr[1];
  const sg=15+4*Math.pow(a, 0.75), sv=Math.min(sg, 15+3*Math.pow(a, 0.6));
  const tau=0.7*Math.min(1, Math.pow(69/sg, 0.55))*(1-Math.exp(-a/1.5))*Math.exp(-((a/life)**2));
  return {p:[x, y, z-180*(1-Math.exp(-a/90))-(x*x+y*y)/(2*MET_RE*1000)], sg, sv, tau, along:f.v*1000*(te-f.tin)};
}
function ctJets(T){
  const out=[];
  for(let b=Math.floor((T-CT_LOOK)/CT_BIN);b<=Math.floor(T/CT_BIN);b++) for(const f of ctFlights(b)){
    if(!f.form||T<f.tin) continue;
    const t1=Math.min(T, f.tout);
    // Probe along the path for the part still visible.
    let tOld=null;
    for(let i=0;i<=24;i++){
      const te=f.tin+(t1-f.tin)*i/24, P=[f.E[0]+f.d[0]*f.v*(te-f.tin), f.E[1]+f.d[1]*f.v*(te-f.tin)];
      if(T-te<2.2*ctLife(f, P[0], P[1], f.alt, te)){ tOld=te; break; }
    }
    if(tOld==null) continue;
    const aLo=T-t1, aHi=T-tOld, pts=[];
    for(let i=0;i<14;i++){
      const u=i/13, a=aLo<60?aLo+(aHi-aLo)*(0.3*u+0.7*u*u*u):aLo+(aHi-aLo)*u, te=T-a;
      const P=[f.E[0]+f.d[0]*f.v*(te-f.tin), f.E[1]+f.d[1]*f.v*(te-f.tin)];
      pts.push(ctJetPoint(f, te, T, ctLife(f, P[0], P[1], f.alt, te)));
    }
    out.push({kind:0, seed:f.seed, pts});
  }
  return out;
}
// The superbolides' dust trails, from the meteors still in MET.bolides (meteors.js).
function ctBolides(T){
  const out=[];
  for(const m of MET.bolides||[]){
    const s=Math.min(1, Math.max(0, (CT_BOLIDE-m.M)/12)), life=600+2400*s, xNow=Math.min(1, (T-m.t0)/m.T);
    if(!(xNow>0)) continue;
    // Dust is laid down where the meteor is bright, from about 80 km (higher in a thicker air) down.
    const hTop=80+(m.hb-metHeights(m.M, m.v, 0)[0]);
    let x0=0; for(;x0<0.9;x0+=0.02){ const P=metPoint(m, x0); if(Math.hypot(P[0], P[1], P[2]+MET_RE)-MET_RE<hTop) break; }
    if(xNow<=x0+0.01) continue;
    const sg0=120+900*s, tau0=0.2+2*Math.pow(s, 0.6), pts=[], phase=(m.t0-Math.floor(m.t0))*20;
    for(let i=0;i<14;i++){
      const x=x0+(xNow-x0)*i/13, a=T-(m.t0+x*m.T), P=metPoint(m, x), h=(Math.hypot(P[0], P[1], P[2]+MET_RE)-MET_RE)*1000;
      const dr=ctDrift(h, a), sg=sg0+3*Math.pow(a, 0.75);
      // Eddies kink the trail as it ages.
      const wig=Math.min(1, a/900)*sg*1.5, wx=wig*Math.sin(x*23+phase), wy=wig*Math.cos(x*17+1.3*phase);
      // As much dust as light: the light curve peaks at 1, and a flare leaves a thicker knot.
      const c=Math.sqrt(Math.min(1.5, Math.max(0, metCurve(m, x))));
      const tau=tau0*c*Math.pow(sg0/sg, 0.8)*(1-Math.exp(-a/2))*Math.exp(-((a/life)**2));
      pts.push({p:[P[0]*1000+dr[0]+wx, P[1]*1000+dr[1]+wy, P[2]*1000], sg, sv:sg*0.8, tau, along:m.L*1000*x});
    }
    // Newest last for the meteor; the shader does not mind the order.
    out.push({kind:1, seed:(m.t0*0.618)%1, pts});
  }
  return out;
}
// The trails at sky time T, nearest and thickest first, packed for the cloud pass: a header row per
// trail (bounding sphere; first segment row, segments, kind, seed), then a row per segment (the ends
// with their σ; optical depths and distances along; vertical σ).
function contrailData(T){
  const key=EP[dIdx].key+'|'+dLat+'|'+T+'|'+((vrGL&&vrGL.field)?vrGL.field.cirrus:0)+'|'+(MET.bolides||[]).length;
  if(key===CT.key) return CT;
  CT.key=key; CT.T=T;
  if(CT.flights.size>400){ const lo=Math.floor((T-CT_LOOK)/CT_BIN)-2; for(const k of CT.flights.keys()) if(+k.slice(k.lastIndexOf('|')+1)<lo) CT.flights.delete(k); }
  const trails=ctJets(T).concat(ctBolides(T)).map(t=>{
    let tmax=0, dmin=Infinity; for(const q of t.pts){ tmax=Math.max(tmax, q.tau); dmin=Math.min(dmin, Math.hypot(...q.p)); }
    t.score=tmax/(1+dmin/40000); return t;
  }).filter(t=>t.score>0.002).sort((a, b)=>b.score-a.score);
  const D=CT.data||(CT.data=new Float32Array(CT_ROWS*4*4));
  D.fill(0);
  let nc=0, row=CT_C;
  for(const t of trails){
    if(nc>=CT_C||row+t.pts.length-1>CT_ROWS) break;
    const lo=[Infinity, Infinity, Infinity], hi=[-Infinity, -Infinity, -Infinity];
    let smax=0;
    for(const q of t.pts){ for(let k=0;k<3;k++){ lo[k]=Math.min(lo[k], q.p[k]); hi[k]=Math.max(hi[k], q.p[k]); } smax=Math.max(smax, q.sg, q.sv); }
    const c=[(lo[0]+hi[0])/2, (lo[1]+hi[1])/2, (lo[2]+hi[2])/2];
    let r=0; for(const q of t.pts) r=Math.max(r, Math.hypot(q.p[0]-c[0], q.p[1]-c[1], q.p[2]-c[2]));
    D.set([c[0], c[1], c[2], r+4*smax+200, row, t.pts.length-1, t.kind, t.seed], nc*16);
    for(let i=0;i<t.pts.length-1;i++, row++){
      const A=t.pts[i], B=t.pts[i+1];
      D.set([A.p[0], A.p[1], A.p[2], A.sg, B.p[0], B.p[1], B.p[2], B.sg, A.tau, B.tau, A.along, B.along, A.sv, B.sv, 0, 0], row*16);
    }
    nc++;
  }
  CT.n=nc;
  return CT;
}
// Uploads the trails for the cloud pass to texture unit 16; the number of trails.
function contrailUpload(gl){
  if(!CT.tex){
    CT.tex=gl.createTexture();
    gl.activeTexture(gl.TEXTURE16); gl.bindTexture(gl.TEXTURE_2D, CT.tex);
    texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 4, CT_ROWS, 0, gl.RGBA, gl.FLOAT, null);
    CT.uploaded='';
  }
  const ct=vrClouds?contrailData(astroDay()*86400):null;
  gl.activeTexture(gl.TEXTURE16); gl.bindTexture(gl.TEXTURE_2D, CT.tex);
  if(ct&&ct.n&&CT.uploaded!==CT.key){ gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 4, CT_ROWS, gl.RGBA, gl.FLOAT, ct.data); CT.uploaded=CT.key; }
  gl.activeTexture(gl.TEXTURE0);
  return ct?ct.n:0;
}
// The airliners themselves, in the air now: position (m, as the trails), heading and right wing.
function ctPlanes(T){
  const out=[];
  for(let b=Math.floor((T-1500)/CT_BIN);b<=Math.floor(T/CT_BIN);b++) for(const f of ctFlights(b)){
    if(T<f.tin||T>f.tout) continue;
    const s=f.v*(T-f.tin), x=(f.E[0]+f.d[0]*s)*1000, y=(f.E[1]+f.d[1]*s)*1000;
    out.push({f, p:[x, y, f.alt*1000-(x*x+y*y)/(2*MET_RE*1000)], F:[f.d[0], f.d[1], 0], R:[f.d[1], -f.d[0], 0]});
  }
  return out;
}
// The lights an airliner carries at cruise: red on the left wingtip and green on the right, each
// shown from dead ahead to 110° round its side, about 40 cd; white on the tail, shown behind, 20 cd;
// the red anti-collision beacon under the fuselage, a flash a second; and white strobes on the
// wingtips and tail, a double flash every 1.3 s, a few thousand cd at the peak (CS-25.1385–1401).
// Local position (m, x forward, y right, z up), colour, candela, side (−1 left, 1 right, 2 behind,
// 0 all round) and flash (0 steady, 1 beacon, 2 strobe).
const CT_LIGHTS=[
  [[-6.6, -17.1, -0.8], [1.9, 0.3, 0.2], 40, -1, 0], [[-6.6, 17.1, -0.8], [0.35, 1.6, 0.8], 40, 1, 0],
  [[-17.8, 0, 0.9], [1.3, 1.3, 1.35], 20, 2, 0], [[2, 0, -2.1], [1.9, 0.25, 0.15], 250, 0, 1],
  [[-6.4, -17.2, -0.8], [1.5, 1.5, 1.6], 2500, 0, 2], [[-6.4, 17.2, -0.8], [1.5, 1.5, 1.6], 2500, 0, 2], [[-18, 0, 0.9], [1.5, 1.5, 1.6], 1500, 0, 2]
];
function ctFlash(kind, t){
  if(kind===1) return t%1<0.12;
  const p=t%1.3; return p<0.05||(p>0.15&&p<0.2);
}
// Draws the airliners over the composited view, each scissored to its patch; the cloud layer's
// opacity is on unit 2, the land's distances on 10, the sky on 0.
function drawPlanesVR(gl, c, ez, sunCol){
  if(!vrClouds||!CT_TRAFFIC[EP[dIdx].key]) return;
  if(!CT.planeJob){
    CT.planeJob=glProgramAsync(gl, vrGL.vs, PLANEFS);
    whenLinked(gl, [CT.planeJob], p=>{
      if(!p) return;
      CT.planeU=uniformLocs(gl, p, ['res', 'yaw', 'pitch', 'fov', 'showScn', 'nr', 'na', 'sunVis', 'eye', 'pP', 'pF', 'pR', 'sd', 'sunCol', 'cityUp', 'lD[0]', 'lC[0]', 'lN']);
      gl.useProgram(p); bindSamplers(gl, p, [['sky', 0], ['cloudTex', 2], ['hitInfo', 10]]); gl.useProgram(vrGL.prog);
      CT.planeProg=p; requestVR();
    });
  }
  if(!CT.planeProg) return;
  const T=astroDay()*86400, planes=ctPlanes(T);
  if(!planes.length) return;
  const key=EP[dIdx].key, fovR=vrFov*Math.PI/180, H=c.height, W=c.width, fy=Math.tan(fovR/2), fx=fy*W/H, pixA=2*fy/H;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const pxRad=0.35*fovR/Math.max(window.innerHeight, 1), now=performance.now()/1000, eye=[vrX, vrY, ez];
  const u=CT.planeU, lD=new Float32Array(32), lC=new Float32Array(24);
  let flashing=false, drawn=false;
  for(const P of planes){
    const rel=[P.p[0]-eye[0], P.p[1]-eye[1], P.p[2]-eye[2]], dist=Math.hypot(...rel), dir=rel.map(v=>v/dist);
    const depth=dir[0]*sy*cp+dir[1]*cy*cp+dir[2]*sp;
    if(depth<0.05||dir[2]<-0.02) continue;
    const sx=(dir[0]*cy-dir[1]*sy)/depth/fx, sy2=(-dir[0]*sy*sp-dir[1]*cy*sp+dir[2]*cp)/depth/fy;
    const X=(sx*0.5+0.5)*W, Y=(sy2*0.5+0.5)*H;
    // The lights, as stars of their brightness through the air (comets.js does the same).
    const el=Math.asin(dir[2])*180/Math.PI, az=Math.atan2(dir[0], dir[1])*180/Math.PI;
    const Lsky=skyRAt(skyNow.rgrid, Math.max(el, 0), az)*skyNow.rCd;
    const vx=-(dir[0]*P.F[0]+dir[1]*P.F[1]), vy=-(dir[0]*P.R[0]+dir[1]*P.R[1]), side=Math.atan2(vy, vx)*180/Math.PI;
    let n=0, sig=0;
    for(const [q, rgb, cd, s, fl] of CT_LIGHTS){
      const shown=s===0?1:s===2?smooth01(105, 115, Math.abs(side)):smooth01(-5, 5, s*side)*(1-smooth01(105, 115, s*side));
      if(!(shown>0)) continue;
      const m=starThroughAir(-14.18-2.5*Math.log10(cd*shown/(dist*dist)), Math.max(el, 0), key), vis=starVisible(m, Lsky);
      if(vis<0.01) continue;
      if(fl){ flashing=true; if(!ctFlash(fl, now+P.f.seed*7)) continue; }
      const amp=Math.min(1, 0.62*Math.sqrt(Math.pow(10, -0.4*(m-STAR_VANCHOR))))*vis, d=pointDisplay(m), s2=Math.max(d.px*pxRad, pixA*0.6);
      const w=[P.p[0]+P.F[0]*q[0]+P.R[0]*q[1]-eye[0], P.p[1]+P.F[1]*q[0]+P.R[1]*q[1]-eye[1], P.p[2]+q[2]-eye[2]], wl=Math.hypot(...w);
      lD.set([w[0]/wl, w[1]/wl, w[2]/wl, s2], n*4); lC.set(rgb.map(v=>v*amp), n*3); n++; sig=Math.max(sig, s2);
    }
    // The patch: the airliner's 40 m and its lights' glow, in pixels.
    const R=Math.max(25/dist, 4*sig)/pixA+2;
    if(R<2.6&&!n) continue;
    if(X+R<0||X-R>W||Y+R<0||Y-R>H) continue;
    if(!drawn){
      drawn=true;
      gl.useProgram(CT.planeProg); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
      gl.uniform2f(u.res, W, H); gl.uniform1f(u.yaw, yaw); gl.uniform1f(u.pitch, pitch); gl.uniform1f(u.fov, fovR);
      gl.uniform1f(u.showScn, vrScenery&&vrGL.hitInfo?1:0); gl.uniform1f(u.nr, skyNow.nr); gl.uniform1f(u.na, skyNow.na);
      gl.uniform1f(u.sunVis, skyNow.sunVis==null?1:skyNow.sunVis); gl.uniform3f(u.eye, eye[0], eye[1], eye[2]);
      gl.uniform3fv(u.sd, new Float32Array(horizDir(skyNow.sunAz, 90-skyNow.sza))); gl.uniform3fv(u.sunCol, sunCol);
      gl.uniform3fv(u.cityUp, skyNow.cityUp||new Float32Array(3));
    }
    gl.uniform3fv(u.pP, P.p); gl.uniform3fv(u.pF, P.F); gl.uniform3fv(u.pR, P.R);
    gl.uniform4fv(u.lD, lD); gl.uniform3fv(u.lC, lC); gl.uniform1f(u.lN, n);
    gl.scissor(Math.floor(X-R), Math.floor(Y-R), Math.ceil(2*R)+1, Math.ceil(2*R)+1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  if(drawn){ gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND); gl.useProgram(vrGL.prog); }
  // The beacons and strobes blink in real time, so keep painting while one could show.
  if(flashing&&!CT.timer) CT.timer=setTimeout(()=>{ CT.timer=0; requestVR(); }, 40);
}
