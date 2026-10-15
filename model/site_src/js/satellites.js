// Lawler, Boley & Rein 2022, AJ 163, 21: every filed shell of Starlink, OneWeb,
// Kuiper, and StarNet/GW, 65,262 satellites. Brightness is their Lambertian sphere
// with effective area 0.8 m², plus 0.5 mag of fixed scatter and Kasten & Young
// airmass. Magnitude is V, the same scale as the star catalog. Equinox geometry
// matches the dome: local midnight puts the observer on the anti-sun axis, and a
// satellite in Earth's shadow is dark.
const SAT_SHELLS=[[7178,30,328],[7178,40,334],[7178,53,345],[2000,96.9,360],[1998,75,373],[4000,53,499],[144,148,604],[324,115.7,614],[2547,53,346],[2478,48,341],[2493,42,336],[1600,53,550],[1584,53.2,540],[720,70,570],[348,97.6,560],[172,97.6,560],[720,87.9,1200],[1764,87.9,1200],[2304,40,1200],[2304,55,1200],[480,85,590],[2000,50,600],[3600,55,508],[1728,30,1145],[1728,40,1145],[1728,50,1145],[1728,60,1145],[1156,51.9,630],[1296,42,610],[784,33,509]];
const SAT_RE=6371, SAT_GM=398600.4418, SAT_AU=149597870.7, SAT_MSUN=-26.77;
const SAT_PREF=(2/(3*Math.PI*Math.PI))*(0.8/((SAT_AU*1000)*(SAT_AU*1000)));
// Boley, Lawler & Rein 2026, arXiv:2608.02757. Blue Origin's Sunrise (51,600),
// the paper's conservative 800 m² panels, and the relaxed nodal spread, ±10° of the
// terminator, rather than the tight ring. Not the million-satellite SpaceX filing, and
// not panels of several thousand square meters. Their brightness is not the paper's
// sphere at albedo 0.2 but the drawn shape's, its wings turned to the Sun (odcLight):
// at dusk and dawn, seeing the sunlit faces, about a magnitude fainter at the bright
// end; through the night, seeing only the wings' backs over a dark Earth, too faint
// to see, where the sphere showed hundreds of 3rd to 5th magnitude.
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15, 1|a); t=t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function gauss01(rng){ let u=0, v=0; while(u===0) u=rng(); while(v===0) v=rng(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
function ssoInc(aKm){
  const mmot=Math.sqrt(SAT_GM/(aKm*aKm*aKm));
  const c=-2*1.99096871e-7*Math.pow(aKm/6378.137,2)/(3*1.08262668e-3*mmot);
  return Math.acos(Math.max(-1, Math.min(1, c)));
}
const SAT_N=SAT_SHELLS.reduce((n,s)=>n+s[0],0);
const SAT_A=new Float64Array(SAT_N), SAT_CI=new Float64Array(SAT_N), SAT_SI=new Float64Array(SAT_N);
const SAT_CO=new Float64Array(SAT_N), SAT_SO=new Float64Array(SAT_N), SAT_M0=new Float64Array(SAT_N);
const SAT_RATE=new Float64Array(SAT_N), SAT_DV=new Float64Array(SAT_N);
(()=>{ const rng=mulberry32(2100); let p=0;
  for(const [n,incDeg,alt] of SAT_SHELLS){
    const a=SAT_RE+alt, rate=Math.sqrt(SAT_GM/(a*a*a))*60, inc=incDeg*Math.PI/180, ci=Math.cos(inc), si=Math.sin(inc);
    for(let k=0;k<n;k++,p++){
      const node=2*Math.PI*k/n;
      SAT_A[p]=a; SAT_CI[p]=ci; SAT_SI[p]=si; SAT_CO[p]=Math.cos(node); SAT_SO[p]=Math.sin(node);
      SAT_M0[p]=rng()*2*Math.PI; SAT_RATE[p]=rate; SAT_DV[p]=gauss01(rng)*0.5;
    }
  }
})();
const ODC_SHELLS=[];
for(let i=0;i<30;i++) ODC_SHELLS.push([740, 500+(800-500)*i/29]);
for(let i=0;i<98;i++) ODC_SHELLS.push([300, 810+(1800-810)*i/97]);
const ODC_N=ODC_SHELLS.reduce((n,s)=>n+s[0],0);
const ODC_A=new Float64Array(ODC_N), ODC_CI=new Float64Array(ODC_N), ODC_SI=new Float64Array(ODC_N);
const ODC_CO=new Float64Array(ODC_N), ODC_SO=new Float64Array(ODC_N), ODC_M0=new Float64Array(ODC_N);
const ODC_RATE=new Float64Array(ODC_N);
(()=>{ const rng=mulberry32(2608); let p=0, even=true;
  for(const [n,alt] of ODC_SHELLS){
    const a=SAT_RE+alt, rate=Math.sqrt(SAT_GM/(a*a*a))*60, inc=ssoInc(a), ci=Math.cos(inc), si=Math.sin(inc);
    let om=(even?Math.PI/2:Math.PI/2+Math.PI)+(rng()*2-1)*10*Math.PI/180;
    even=!even;
    const co=Math.cos(om), so=Math.sin(om);
    for(let k=0;k<n;k++,p++){
      ODC_A[p]=a; ODC_CI[p]=ci; ODC_SI[p]=si; ODC_CO[p]=co; ODC_SO[p]=so;
      ODC_M0[p]=rng()*2*Math.PI; ODC_RATE[p]=rate;
    }
  }
})();
// The light a datacenter sends toward o (unit, from it to the observer), as its intensity per unit
// of sunlight (m²/sr), from the shape drawDatacentersVR draws: its wings and bus square to the Sun,
// which is along −x in this frame, its radiators edge-on to it, square to its way along the orbit
// (0, ay, az); U is its own up. Each face is Lambertian, lit by the Sun if it faces it and by the
// Earth below (as ODCFS lights it), seen in proportion to its area turned to the observer:
//   wings, 800 m², cells 0.06 (dark blue, with the grid between) and white backs 0.6;
//   the bus's two broad faces, 24 m², 0.55; the radiators, 288 m² a face, 0.82.
// Shadows of one part on another are left out.
function odcLight(ox, oy, oz, ux, uy, uz, ay, az){
  const No=-ox, NU=-ux, Ao=ay*oy+az*oz, AU=ay*uy+az*uz;
  const earth=0.25*Math.min(1, Math.max(0, 0.5+0.6*NU)), P=Math.max;
  const front=(1+earth*P(-NU, 0))*P(No, 0), back=earth*P(NU, 0)*P(-No, 0);
  const I=800*(0.06*front+0.6*back)+24*0.55*(front+back)+288*0.82*earth*(P(-AU, 0)*P(Ao, 0)+P(AU, 0)*P(-Ao, 0));
  return I/Math.PI;
}
function placeSatellites(latDeg, tex, marks, up){
  const lat=latDeg*Math.PI/180, ang=minutes/1440*Math.PI*2, cl=Math.cos(lat), sl=Math.sin(lat);
  const ox=SAT_RE*cl*Math.cos(ang), oy=SAT_RE*cl*Math.sin(ang), oz=SAT_RE*sl;
  const upx=ox/SAT_RE, upy=oy/SAT_RE, upz=oz/SAT_RE;
  let ex=-upy, ey=upx; const em=Math.hypot(ex,ey)||1; ex/=em; ey/=em;
  const nx=-upz*ey, ny=upz*ex, nz=upx*ey-upy*ex, RE2=SAT_RE*SAT_RE, hit=[];
  // A vector from the frame the orbits are in (the Sun along -x) to the observer's east, north, up.
  const enu=(vx, vy, vz)=>[vx*ex+vy*ey, vx*nx+vy*ny+vz*nz, vx*upx+vy*upy+vz*upz];
  const scan=(n, pref, scatter, A, CI, SI, CO, SO, M0, RATE, DV, odc)=>{
    for(let i=0;i<n;i++){
      const ci=CI[i], si=SI[i], co=CO[i], so=SO[i], r=A[i];
      // The height above the observer's horizon plane goes as r(P cos u + Q sin u). An orbit
      // whose highest point stays below the plane never rises here, so skip it unplaced.
      const P=co*upx+so*upy, Q=(co*upy-so*upx)*ci+si*upz;
      if(r*r*(P*P+Q*Q)<RE2*0.999999) continue;
      const u=M0[i]+RATE[i]*minutes, cu=Math.cos(u), su=Math.sin(u);
      const x=r*(co*cu-so*su*ci), y=r*(so*cu+co*su*ci), z=r*(su*si);
      // Below the horizon plane: dark to this observer whatever else holds.
      if(x*upx+y*upy+z*upz<=SAT_RE) continue;
      if(x>=0 && y*y+z*z<=RE2) continue;
      const sx=x-ox, sy=y-oy, sz=z-oz, dist=Math.hypot(sx,sy,sz);
      const shx=sx/dist, shy=sy/dist, shz=sz/dist, sel=shx*upx+shy*upy+shz*upz;
      if(sel<=0.02) continue;
      const phi=Math.acos(Math.max(-1, Math.min(1, shx)));
      const phase=(Math.PI-phi)*Math.cos(phi)+Math.sin(phi);
      if(phase<=1e-8) continue;
      const el=Math.asin(sel)*180/Math.PI;
      const air=airmass(el);
      // A datacenter's light is its shape's (odcLight), turned to the Sun along its orbit; the
      // others' a Lambertian sphere's.
      const vx=-co*su-so*cu*ci, vy=-so*su+co*cu*ci, vz=cu*si, va=Math.hypot(vy, vz)||1;
      const lit=odc?odcLight(-shx, -shy, -shz, x/r, y/r, z/r, vy/va, vz/va)/(dist*dist*1e6):pref*phase/((dist/SAT_AU)*(dist/SAT_AU));
      if(!(lit>0)) continue;
      const mag=SAT_MSUN-2.5*Math.log10(lit)+(scatter?DV[i]:0)+0.15*(air-1);
      if(mag>6.5) continue;
      const az=Math.atan2(shx*ex+shy*ey, shx*nx+shy*ny+shz*nz)*180/Math.PI;
      const h={mag, az:(az%360+360)%360, el};
      // A datacenter keeps what its drawn shape needs (drawDatacentersVR): its distance (km), its
      // way along its orbit, the Sun's way from it and its own up, in the observer's frame.
      if(odc) h.odc={dist, F:enu(vx, vy, vz), S:enu(-1, 0, 0), U:enu(x/r, y/r, z/r)};
      hit.push(h);
    }
  };
  scan(SAT_N, SAT_PREF, true, SAT_A, SAT_CI, SAT_SI, SAT_CO, SAT_SO, SAT_M0, SAT_RATE, SAT_DV);
  scan(ODC_N, 0, false, ODC_A, ODC_CI, ODC_SI, ODC_CO, ODC_SO, ODC_M0, ODC_RATE, null, true);
  if(hit.length>SAT_CAP) hit.sort((a,b)=>a.mag-b.mag);
  const nDome=Math.min(hit.length, DOME_SAT_CAP), nTex=Math.min(hit.length, SAT_CAP);
  for(let k=0;k<nDome;k++){
    const s=hit[k], show=pointDisplay(s.mag), dir=horizDir(s.az, s.el);
    marks.push({az:s.az, el:s.el, px:show.px, rgb:show.rgb, mag:s.mag, odc:s.odc});
    if(k>=nTex) continue;
    const i=STAR_N+k, o=i*4;
    // A datacenter's direction is written longer by its angular size, so the sky shader can fade
    // its point as the drawn shape takes over (shader_sky.js); everything else's is a unit vector.
    const g=s.odc?1+ODC_SPAN/(s.odc.dist*1000):1;
    tex[o]=dir[0]*g; tex[o+1]=dir[1]*g; tex[o+2]=dir[2]*g; tex[o+3]=show.px;
    const c=STAR_MAP_W*4+o; tex[c]=show.rgb[0]; tex[c+1]=show.rgb[1]; tex[c+2]=show.rgb[2]; tex[c+3]=s.mag;
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  }
}

// The orbital datacenters close up, drawn when the zoom resolves them, as the airliners are
// (contrails.js drawPlanesVR): a simple shape after the designs proposed for them (Starcloud's
// four subsystems, solar arrays, radiators, compute and laser terminals; Google's Project
// Suncatcher; the flat-packed 3-tonne Starcloud-3 that fits Starship's Starlink dispenser). In the
// metres of its own frame, z toward the Sun, x along its orbit, y across:
//   - a flat-packed bus 7.4 m by 3.2 m and 0.8 m thick, foil-grey, holding the compute;
//   - two solar wings on a boom along the orbit, each 40 m by 10 m, 800 m² in all (the arrays
//     Boley, Lawler & Rein take for Sunrise), turned square to the Sun, dark blue cells in a grid
//     of 2 m panels, white backs;
//   - two white radiators across the orbit, 18 m by 8 m, edge-on to the Sun so it does not heat
//     them, radiating from both faces (288 m² a side, a little over a third of the arrays, as
//     Starcloud's 838 W a square metre against the cells' output asks);
//   - four laser terminals for the links to the others, small grey domes at the bus's corners.
// Sunlight is the Sun's above the air; the air in front dims it by its extinction.
const ODC_SPAN=86;
const ODCFS=`#version 300 es
precision highp float;
uniform sampler2D cloudTex, hitInfo;
uniform vec2 res;
uniform float yaw, pitch, fov, showScn, trans;
uniform vec3 rel, axA, axB, axN, sunL, upS;
out vec4 fragColor;
${VIEW_RAY_GLSL}
// Ray (o, d) against the box of half-size h about c: distance and the face's normal, or -1.
float boxHit(vec3 o, vec3 d, vec3 c, vec3 h, out vec3 n){
  vec3 m=1.0/d, q=m*(o-c), k=abs(m)*h, t1=-q-k, t2=-q+k;
  float tN=max(max(t1.x, t1.y), t1.z), tF=min(min(t2.x, t2.y), t2.z);
  n=-sign(d)*step(t1.yzx, t1.xyz)*step(t1.zxy, t1.xyz);
  return tN>tF||tF<0.0?-1.0:tN;
}
void part(vec3 o, vec3 d, vec3 c, vec3 h, float id, inout float tB, inout vec3 nB, inout float idB){
  vec3 n; float t=boxHit(o, d, c, h, n);
  if(t>0.0 && t<tB){ tB=t; nB=n; idB=id; }
}
void dome(vec3 o, vec3 d, vec3 c, float r, inout float tB, inout vec3 nB, inout float idB){
  vec3 oc=o-c; float b=dot(oc, d), h=b*b-dot(oc, oc)+r*r;
  if(h<0.0) return;
  float t=-b-sqrt(h);
  if(t>0.0 && t<tB){ tB=t; nB=(oc+d*t)/r; idB=4.0; }
}
// The nearest surface: its distance, normal and part (0 bus, 1 wing, 2 boom, 3 radiator, 4 terminal).
float datacenter(vec3 o, vec3 d, out vec3 n, out float id){
  float t=1.0e9; n=vec3(0.0, 0.0, 1.0); id=-1.0;
  part(o, d, vec3(0.0), vec3(1.6, 3.7, 0.4), 0.0, t, n, id);
  part(o, d, vec3(23.0, 0.0, 0.0), vec3(20.0, 5.0, 0.04), 1.0, t, n, id);
  part(o, d, vec3(-23.0, 0.0, 0.0), vec3(20.0, 5.0, 0.04), 1.0, t, n, id);
  part(o, d, vec3(0.0), vec3(3.0, 0.12, 0.12), 2.0, t, n, id);
  part(o, d, vec3(0.0, 12.7, 0.0), vec3(0.03, 9.0, 4.0), 3.0, t, n, id);
  part(o, d, vec3(0.0, -12.7, 0.0), vec3(0.03, 9.0, 4.0), 3.0, t, n, id);
  for(int i=0;i<4;i++){ vec2 s=vec2(float(i&1), float(i>>1))*2.0-1.0; dome(o, d, vec3(1.3*s.x, 3.3*s.y, -0.45), 0.35, t, n, id); }
  return t;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  vec3 o0=vec3(dot(rel, axA), dot(rel, axB), dot(rel, axN));
  vec3 col=vec3(0.0); float cov=0.0;
  for(int i=0;i<4;i++){
    vec2 off=vec2(float(i&1), float(i>>1))*0.5-0.25;
    vec3 rd=viewRay(fc+off, res, fov, yaw, pitch), d=normalize(vec3(dot(rd, axA), dot(rd, axB), dot(rd, axN)));
    // From just short of it: the box tests lose their precision from hundreds of kilometres.
    float t0=max(-dot(o0, d)-80.0, 0.0);
    vec3 o=o0+d*t0, n; float id;
    float t=datacenter(o, d, n, id);
    if(t>=1.0e8) continue;
    vec3 p=o+d*t;
    if(dot(n, d)>0.0) n=-n;
    vec3 alb;
    if(id<0.5) alb=vec3(0.55, 0.52, 0.45);
    else if(id<1.5){
      // Cells on the sunward face, dark blue in a grid of panels, the backs white.
      vec2 g=abs(fract(p.xy/vec2(2.0, 2.5))-0.5);
      alb=n.z>0.0?mix(vec3(0.035, 0.05, 0.10), vec3(0.14), step(0.47, max(g.x, g.y))):vec3(0.6);
    }
    else if(id<2.5) alb=vec3(0.4);
    else if(id<3.5) alb=vec3(0.82);
    else alb=vec3(0.45);
    // The Sun on the faces turned to it (z), and the Earth's light on those turned down to it: a
    // quarter of the Sun's from a lit Earth filling half the sky below (albedo 0.3), less as more
    // of what it sees of the Earth is night.
    float earth=0.25*clamp(0.5+0.6*upS.z, 0.0, 1.0);
    vec3 L=sunL*(max(n.z, 0.0)+earth*max(-dot(n, upS), 0.0)+0.01);
    col+=alb*L; cov+=0.25;
  }
  if(cov<=0.0) discard;
  vec3 c=col/(cov*4.0)*trans;
  c=mix(c, 0.6+0.4*(1.0-exp(-(c-0.6)/0.4)), step(0.6, c));
  c=pow(c, vec3(1.0/2.2));
  float occ=1.0-texture(cloudTex, fc/res).a;
  if(showScn>0.5){ vec4 h=texture(hitInfo, fc/res); if(h.g>0.5 && h.r>0.0) occ=0.0; }
  fragColor=vec4(c*cov*occ, cov*occ);
}`;
const ODCV={job:null, prog:null, u:null};
// Draws each datacenter the zoom resolves over the composited view, scissored to its patch,
// behind the clouds by their opacity and behind the land.
function drawDatacentersVR(gl, c, ez){
  const marks=skyNow&&skyNow.starMarks;
  if(!marks||EP[dIdx].key!=='y2100') return;
  const fovR=vrFov*Math.PI/180, H=c.height, W=c.width, fy=Math.tan(fovR/2), fx=fy*W/H, pixA=2*fy/H;
  // Resolved only zoomed in: even the nearest, 500 km off, needs a view under half a degree.
  if(ODC_SPAN/(500e3*pixA)<1.5) return;
  if(!ODCV.job){
    ODCV.job=glProgramAsync(gl, vrGL.vs, ODCFS);
    whenLinked(gl, [ODCV.job], p=>{
      if(!p) return;
      ODCV.u=uniformLocs(gl, p, ['res', 'yaw', 'pitch', 'fov', 'showScn', 'trans', 'rel', 'axA', 'axB', 'axN', 'sunL', 'upS']);
      gl.useProgram(p); bindSamplers(gl, p, [['cloudTex', 2], ['hitInfo', 10]]); gl.useProgram(vrGL.prog);
      ODCV.prog=p; requestVR();
    });
  }
  if(!ODCV.prog) return;
  const yaw=vrYaw*Math.PI/180, pitch=vrPitch*Math.PI/180, cp=Math.cos(pitch), sp=Math.sin(pitch), cy=Math.cos(yaw), sy=Math.sin(yaw);
  const u=ODCV.u, k=extK(EP[dIdx].key);
  let drawn=false;
  for(const m of marks){
    if(!m.odc||m.el<=0) continue;
    const dist=m.odc.dist*1000, R=ODC_SPAN/2/dist/pixA+2;
    if(R<2.6) continue;
    // Where its point is drawn: refracted as the sky shader refracts it.
    const dir=horizDir(m.az, shaderApparent(m.el).a), depth=dir[0]*sy*cp+dir[1]*cy*cp+dir[2]*sp;
    if(depth<0.05) continue;
    const X=((dir[0]*cy-dir[1]*sy)/depth/fx*0.5+0.5)*W, Y=((-dir[0]*sy*sp-dir[1]*cy*sp+dir[2]*cp)/depth/fy*0.5+0.5)*H;
    if(X+R<0||X-R>W||Y+R<0||Y-R>H) continue;
    if(!drawn){
      drawn=true;
      gl.useProgram(ODCV.prog); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.SCISSOR_TEST);
      gl.uniform2f(u.res, W, H); gl.uniform1f(u.yaw, yaw); gl.uniform1f(u.pitch, pitch); gl.uniform1f(u.fov, fovR);
      gl.uniform1f(u.showScn, vrScenery&&vrGL.hitInfo?1:0);
      // The Sun above the air, as bright on a white face as on the airliners' sunlit sides.
      const mx=Math.max(...POINT_TINT), s=POINT_TINT.map(v=>Math.pow(v/mx, 2.2)*3.2);
      gl.uniform3f(u.sunL, s[0], s[1], s[2]);
    }
    // Its frame: z to the Sun, x its way along the orbit square to that, y across.
    const N=m.odc.S, F=m.odc.F, fd=F[0]*N[0]+F[1]*N[1]+F[2]*N[2];
    let A=[F[0]-fd*N[0], F[1]-fd*N[1], F[2]-fd*N[2]];
    const al=Math.hypot(...A)||1; A=A.map(v=>v/al);
    const B=[N[1]*A[2]-N[2]*A[1], N[2]*A[0]-N[0]*A[2], N[0]*A[1]-N[1]*A[0]];
    gl.uniform3f(u.rel, -dir[0]*dist, -dir[1]*dist, -dir[2]*dist);
    gl.uniform3fv(u.axA, A); gl.uniform3fv(u.axB, B); gl.uniform3fv(u.axN, N);
    const U=m.odc.U; gl.uniform3f(u.upS, U[0]*A[0]+U[1]*A[1]+U[2]*A[2], U[0]*B[0]+U[1]*B[1]+U[2]*B[2], U[0]*N[0]+U[1]*N[1]+U[2]*N[2]);
    gl.uniform1f(u.trans, extinction(m.el, k));
    gl.scissor(Math.floor(X-R), Math.floor(Y-R), Math.ceil(2*R)+1, Math.ceil(2*R)+1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  if(drawn){ gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND); gl.useProgram(vrGL.prog); }
}
