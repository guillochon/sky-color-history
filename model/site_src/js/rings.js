// Saturn's rings from their measured optical depth (ring_profile.js), shaded for the day's
// geometry: muV and mu0 the sines of the ring plane's opening to the viewer and to the Sun.
// Each 10 km band of particles, single-scattering (Chandrasekhar's layer, as Cuzzi et al. 1984 and
// after): seen from the lit side its brightness is
//   I = K/4 · mu0/(muV+mu0) · (1 − exp(−tau(1/muV+1/mu0))),
// so a thin band brightens as the rings open less and an opaque one does not; seen from the dark
// side only what gets through, K/4 · mu0/(muV−mu0) · (exp(−tau/muV) − exp(−tau/mu0)), which leaves
// the opaque B ring black and the thin C ring and Cassini division glowing. Light scattered more
// than once adds up to a third more where the rings are thick, so the B ring's denser bands still
// show, a little brighter, though no light gets through either. K is the particles' albedo times
// their phase function: the A ring's 0.7 of the B ring's, the C ring's and the Cassini division's
// half and greyer, the F ring's dust half (Voyager's and HST's photometry: I/F near 0.6, 0.4 and
// 0.1). The rings brighten toward opposition (the Seeliger effect), by a third in the last degree.
// The light let through toward the viewer and the Sun is exp(−tau/mu): the opacity of the rings
// over what is behind, and their shadow on the planet.
// Younger rings (age, their age at the epoch over today's, drawn from Chrysalis's break-up in the
// illustrated case, 160 Myr ago, within Wisdom et al.'s 100–200 Myr range) were more massive and cleaner. Saturn draws ring material in (ring rain, hundreds to tens of
// thousands of kg/s by Cassini's Grand Finale; O'Donoghue et al. 2019, Waite et al. 2018) and a ring
// spreading by its own friction loses mass as about 1/age (Salmon et al. 2010): between them the
// depth is taken as age^−0.75 times today's, half again at 66 Ma. The darkening of the C ring and
// the Cassini division is the meteoroid dust they have gathered (Cuzzi & Estrada 1998), so much
// less on rings younger and more massive: in proportion to age over mass, two fifths of today's at
// 66 Ma. Both are guesses at the size of a difference, for a past whose rings no one has seen.
const SAT_RING_TEX_W=1024, SAT_RING_ROWS=Math.ceil((SAT_RING_N+1)/SAT_RING_TEX_W);
const SAT_RING_TAU=(()=>{
  const b=atob(SAT_RING_TAU_B64), t=new Float32Array(SAT_RING_N);
  for(let i=0;i<SAT_RING_N;i++){ const c=b.charCodeAt(i)/255; t[i]=SAT_RING_TAU_MAX*c*c; }
  return t;
})();
// The particles at r planet radii: their K without the dust (scaled so that the opaque B ring,
// lit, at mu=mu0 and opposition, is drawn 0.95, about as bright as the middle of the globe), how
// much of the dust's darkening they have (1 in the C ring and the Cassini division, which today
// takes K to half), their greyness without the dust and how grey the dust makes them.
function satRingParticles(r){
  const km=r*60268, s=(a, b)=>smooth01(a, b, km);
  // C ring, its ramp into the B ring, the Cassini division, its ramp into the A ring, the F ring.
  const toB=s(90600, 92100), toCD=s(117450, 117600), toA=s(120900, 122100), toF=s(138000, 139500);
  return [7.6*(1-0.3*toA-0.2*toF), 1-toB+toCD*(1-toA), 0.2*toA+0.4*toF, 1-0.2*toCD];
}
const SAT_RING_K=(()=>{
  const k=new Float32Array(SAT_RING_N*4);
  for(let i=0;i<SAT_RING_N;i++) k.set(satRingParticles(SAT_RING_R0+(i+0.5)*SAT_RING_DR), i*4);
  return k;
})();
// The depth's factor and the dust's share of today's, for rings age (their age at the epoch over
// today's).
function satRingYouth(age){ const f=Math.pow(Math.max(age, 0.05), -0.75); return {f, dust:Math.min(1, age/f)}; }
// The running sums, bin by bin, of each band's brightness I, its opacity toward the viewer, its
// opacity toward the Sun and its grey part of I (lit: the viewer on the Sun's side; alpha the
// phase angle, degrees; age as satRingYouth). A box filter of any width is then two lookups.
function satRingTable(muV, mu0, lit, alpha, age=1){
  muV=Math.max(muV, 0.002); mu0=Math.max(mu0, 0.002);
  const S=(1+0.35*Math.exp(-alpha/0.8))/1.35*Math.pow(10, -0.4*0.017*alpha)/4;
  const out=new Float32Array(SAT_RING_TEX_W*SAT_RING_ROWS*4), acc=[0, 0, 0, 0], near=Math.abs(muV-mu0)<1e-4, y=satRingYouth(age);
  for(let i=0;i<SAT_RING_N;i++){
    const P=SAT_RING_K.subarray(i*4, i*4+4), dust=P[1]*y.dust, grey=dust*P[3]+P[2];
    const t=SAT_RING_TAU[i]*y.f, K=P[0]*(1-0.5*dust)*S*(1+0.35*(1-Math.exp(-t/2)))/1.35, eV=Math.exp(-t/muV), e0=Math.exp(-t/mu0);
    // From the dark side, a little multiply scattered light too.
    const I=lit?K*mu0/(muV+mu0)*(1-eV*e0):K*((near?t/muV*eV:mu0/(muV-mu0)*(eV-e0))+0.04*(1-Math.exp(-t)));
    acc[0]+=I; acc[1]+=1-eV; acc[2]+=1-e0; acc[3]+=I*grey;
    out.set(acc, (i+1)*4);
  }
  return out;
}
// The rings' table for a body's geometry, kept while the geometry holds.
let satRingLast=null;
function satRingTableFor(b){
  const n=b.pole, muV=Math.abs(vdot(b.dir, n)), mu0=Math.abs(vdot(b.light, n)), lit=vdot(b.light, n)*vdot(b.dir, n)<0;
  const alpha=Math.acos(Math.max(-1, Math.min(1, -vdot(b.light, b.dir))))*180/Math.PI, age=b.ringAge??1, q=satRingLast;
  if(q&&q.lit===lit&&q.age===age&&Math.abs(q.muV-muV)<3e-4&&Math.abs(q.mu0-mu0)<3e-4&&Math.abs(q.alpha-alpha)<0.03) return q.tab;
  satRingLast={muV, mu0, lit, alpha, age, tab:satRingTable(muV, mu0, lit, alpha, age)};
  return satRingLast.tab;
}
// The rings at r planet radii averaged over r±w: brightness, opacity toward the viewer and toward
// the Sun, and the grey part of the brightness.
function satRingAt(tab, r, w){
  const a=(r-SAT_RING_R0)/SAT_RING_DR, h=Math.max(w/SAT_RING_DR, 0.5), out=[0, 0, 0, 0];
  const add=(x, sg)=>{
    x=Math.max(0, Math.min(SAT_RING_N, x)); const i=Math.min(Math.floor(x), SAT_RING_N-1), f=x-i;
    for(let k=0;k<4;k++){ const p=tab[i*4+k]; out[k]+=sg*(p+(tab[i*4+4+k]-p)*f)/(2*h); }
  };
  add(a+h, 1); add(a-h, -1);
  return out;
}
// The same for the bodies' shader, from the table on texture unit 16.
const SAT_RING_GLSL=`
uniform highp sampler2D satRingTex;
vec4 satRingCum(float x){
  x=clamp(x, 0.0, ${SAT_RING_N}.0); int i=min(int(x), ${SAT_RING_N-1}), j=i+1;
  vec4 a=texelFetch(satRingTex, ivec2(i%${SAT_RING_TEX_W}, i/${SAT_RING_TEX_W}), 0), b=texelFetch(satRingTex, ivec2(j%${SAT_RING_TEX_W}, j/${SAT_RING_TEX_W}), 0);
  return mix(a, b, x-float(i));
}
vec4 saturnRing(float r, float w){
  float a=(r-${SAT_RING_R0.toFixed(6)})/${SAT_RING_DR.toFixed(8)}, h=max(w/${SAT_RING_DR.toFixed(8)}, 0.5);
  return (satRingCum(a+h)-satRingCum(a-h))/(2.0*h);
}
`;
// Uploads body b's table to unit 16 when it has changed.
function syncSatRingTex(gl, b){
  const tab=satRingTableFor(b);
  gl.activeTexture(gl.TEXTURE16);
  if(!vrGL.satRingTex){
    vrGL.satRingTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, vrGL.satRingTex);
    texParams(gl, gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SAT_RING_TEX_W, SAT_RING_ROWS, 0, gl.RGBA, gl.FLOAT, null);
  }else gl.bindTexture(gl.TEXTURE_2D, vrGL.satRingTex);
  if(vrGL.satRingTab!==tab){ gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SAT_RING_TEX_W, SAT_RING_ROWS, gl.RGBA, gl.FLOAT, tab); vrGL.satRingTab=tab; }
  gl.activeTexture(gl.TEXTURE0);
}
