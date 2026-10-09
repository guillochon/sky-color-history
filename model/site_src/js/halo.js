// Ice-crystal halos from diamond dust: tiny hexagonal plates and columns of ice glittering in
// clear, very cold air near the ground. Snowball Earth's air would have been full of them at every
// latitude; today they are common on the Antarctic plateau and in Arctic winter, and they belong
// to the polar skies of the other cold epochs. HALO_STRENGTH is how much of the full display each
// epoch shows at each latitude.
const HALO_STRENGTH={
  snowball07:{Equator:0.8, 'Mid-latitude':1, Polar:1},
  proterozoic22:{Polar:0.5},   // the tail of the Huronian glaciations
  ordovician466:{Polar:0.4},  // the cooling that led to the Late Ordovician ice age
  carbon30:{Polar:0.6},        // the Late Paleozoic Ice Age's Gondwana ice sheets
  zetaoph:{Polar:0.7}, geminga:{Polar:0.8, 'Mid-latitude':0.25}, // Pleistocene; 342 ka is a glacial maximum
  volcanic:{Polar:0.7}, ozonehole:{Polar:1}, modern:{Polar:0.6}, modernpoll:{Polar:0.3}, y2100:{Polar:0.4},
};
function haloStrength(key, lat){ const s=HALO_STRENGTH[key]; return (s&&s[lat])||0; }
// Refractive index of ice at 650, 550 and 450 nm (Warren & Brandt 2008), one per display channel,
// so each arc carries its own dispersion: red on the side toward the Sun.
const HALO_N=[1.3078, 1.3110, 1.3150];
// Peak brightness of each part, for a sun as bright as the overhead Sun through modern air,
// in units of the clean modern zenith at noon (YREF).
const HALO_AMP={ring22:1.2, ring46:0.12, dog:12, cza:1.5, circle:0.22, pillar:2.2, glow:1.4};
// The display of plates and columns. v is the view direction, s the Sun's (or Moon's), both unit
// vectors with z up. The result, per channel, is the light added to the sky in units of
// YREF times the source's direct-beam brightness relative to the overhead Sun's.
//  - 22° and 46° halos: randomly oriented crystals, minimum deviation through 60° and 90° prisms;
//    sharp inner edge, fading outward. Horizontal columns brighten its top and bottom (the
//    tangent arcs, here hugging the halo).
//  - Sun dogs: horizontal plates, minimum deviation for the oblique ray (Bravais' index
//    n' = sqrt(n² − sin²h)/cos h), gone once the Sun is above 61°.
//  - Circumzenithal arc: in through a plate's top face, out a side face, at elevation
//    asin(sqrt(n² − cos²h)); only for a Sun below 32°.
//  - Parhelic circle and 120° parhelia: plates reflecting off their side faces.
//  - Sun pillar: plates' faces reflecting a low Sun.
//  - A glow around the Sun from diffraction by the crystals.
const HALO_GLSL=`
float haloEdge(float x){ return smoothstep(-0.35, 0.1, x); }
vec3 haloAt(vec3 v, vec3 s){
  const float D=57.2957795;
  float th=acos(clamp(dot(v, s), -1.0, 1.0))*D;
  float sh=clamp(s.z, -1.0, 1.0), ch=sqrt(max(1.0-sh*sh, 1e-6)), h=asin(sh)*D;
  float e=asin(clamp(v.z, -1.0, 1.0))*D, ce=sqrt(max(1.0-v.z*v.z, 1e-6));
  float hv=length(v.xy), hs=length(s.xy);
  float al=(hv>1e-4&&hs>1e-4)?acos(clamp(dot(v.xy, s.xy)/(hv*hs), -1.0, 1.0))*D:0.0;
  // Where on the 22° ring: |cos| of the angle from the vertical through the Sun.
  vec3 t=v-s*dot(v, s), up=vec3(0.0, 0.0, 1.0)-s*sh;
  float vert=abs(dot(t, up))/max(length(t)*length(up), 1e-6);
  float tang=1.0+1.4*pow(vert, 10.0);
  float dogFade=1.0-smoothstep(35.0, 61.0, h), pilFade=1.0-smoothstep(4.0, 18.0, h);
  float n3[3]=float[3](${HALO_N.map(n=>n.toFixed(4)).join(', ')});
  vec3 o=vec3(0.0);
  for(int c=0;c<3;c++){
    float n=n3[c], I=0.0;
    float d22=2.0*asin(n*0.5)*D-60.0, x=th-d22;
    I+=${HALO_AMP.ring22.toFixed(3)}*haloEdge(x)*(0.55*exp(-max(x, 0.0)/0.8)+0.45*exp(-max(x, 0.0)/5.0))*mix(1.0, tang, exp(-max(x, 0.0)/1.5));
    float d46=2.0*asin(n*0.70710678)*D-90.0; x=th-d46;
    I+=${HALO_AMP.ring46.toFixed(3)}*smoothstep(-0.8, 0.4, x)*exp(-max(x, 0.0)/3.0);
    float np=sqrt(max(n*n-sh*sh, 0.0))/ch;
    if(np<2.0){
      x=(al-(2.0*asin(np*0.5)*D-60.0))*ch;
      float de=(e-h)/1.4;
      I+=${HALO_AMP.dog.toFixed(3)}*dogFade*haloEdge(x)*(0.75*exp(-max(x, 0.0)/1.0)+0.25*exp(-max(x, 0.0)/4.0))*exp(-0.5*de*de);
    }
    float q=n*n-ch*ch;
    if(q<1.0 && h>0.0){
      float de=(e-asin(sqrt(q))*D)/0.8, da=al/32.0;
      I+=${HALO_AMP.cza.toFixed(3)}*smoothstep(0.0, 6.0, h)*(1.0-smoothstep(0.93, 1.0, q))*exp(-0.5*(de*de+da*da));
    }
    o[c]=I;
  }
  float de=(e-h)/0.35, a120=(al-120.0)/2.5, px=al*ch/0.35;
  float w=${HALO_AMP.circle.toFixed(3)}*exp(-0.5*de*de)*(1.0+2.5*exp(-0.5*a120*a120));
  w+=${HALO_AMP.pillar.toFixed(3)}*pilFade*exp(-0.5*px*px)*exp(-abs(e-h)/(e>h?5.0:3.0));
  w+=${HALO_AMP.glow.toFixed(3)}*exp(-th/3.0);
  return o+w;
}`;
// The same in JavaScript, for the dome. out gets the three channels.
function haloEdge(x){ const t=Math.max(0, Math.min(1, (x+0.35)/0.45)); return t*t*(3-2*t); }
function smoothJS(a, b, x){ const t=Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); }
// The parts of haloAt that depend only on the source, worked out once per frame.
function haloSource(s){
  const D=180/Math.PI, sh=Math.max(-1, Math.min(1, s[2])), ch=Math.sqrt(Math.max(1-sh*sh, 1e-6)), h=Math.asin(sh)*D;
  const hs=Math.hypot(s[0], s[1]);
  const per=HALO_N.map(n=>{
    const np=Math.sqrt(Math.max(n*n-sh*sh, 0))/ch, q=n*n-ch*ch;
    return {d22:2*Math.asin(n*0.5)*D-60, d46:2*Math.asin(n*Math.SQRT1_2)*D-90,
            dog:np<2?2*Math.asin(np*0.5)*D-60:null, cza:(q<1&&h>0)?Math.asin(Math.sqrt(q))*D:null, czaW:smoothJS(0, 6, h)*(1-smoothJS(0.93, 1, q))};
  });
  const up=[-s[0]*sh, -s[1]*sh, 1-s[2]*sh]; up.push(Math.hypot(up[0], up[1], up[2]));
  return {s, sh, ch, h, hs, per, up, dogFade:1-smoothJS(35, 61, h), pilFade:1-smoothJS(4, 18, h)};
}
function haloAt(v, src, out){
  // Terms are skipped where they have fallen below about a percent of their peak.
  const D=180/Math.PI, A=HALO_AMP, s=src.s, h=src.h;
  const cs=Math.max(-1, Math.min(1, v[0]*s[0]+v[1]*s[1]+v[2]*s[2])), th=Math.acos(cs)*D;
  const e=Math.asin(Math.max(-1, Math.min(1, v[2])))*D, de0=e-h;
  const hv=Math.hypot(v[0], v[1]);
  const al=(hv>1e-4&&src.hs>1e-4)?Math.acos(Math.max(-1, Math.min(1, (v[0]*s[0]+v[1]*s[1])/(hv*src.hs))))*D:0;
  let tang=1;
  if(th>src.per[0].d22-1 && th<src.per[2].d22+6){
    const t0=v[0]-s[0]*cs, t1=v[1]-s[1]*cs, t2=v[2]-s[2]*cs, u=src.up;
    const vert=Math.abs(t0*u[0]+t1*u[1]+t2*u[2])/Math.max(Math.hypot(t0, t1, t2)*u[3], 1e-6), v2=vert*vert, v4=v2*v2;
    tang=1+1.4*v4*v4*v2;
  }
  const dogOn=src.dogFade>0 && Math.abs(de0)<6;
  for(let c=0;c<3;c++){
    const p=src.per[c]; let I=0, x=th-p.d22;
    if(x>-0.35 && x<30){ const xp=Math.max(x, 0); I+=A.ring22*haloEdge(x)*(0.55*Math.exp(-xp/0.8)+0.45*Math.exp(-xp/5))*(1+(tang-1)*Math.exp(-xp/1.5)); }
    x=th-p.d46;
    if(x>-0.8 && x<15) I+=A.ring46*smoothJS(-0.8, 0.4, x)*Math.exp(-Math.max(x, 0)/3);
    if(dogOn && p.dog!==null){
      x=(al-p.dog)*src.ch;
      if(x>-0.35 && x<25){ const xp=Math.max(x, 0), de=de0/1.4; I+=A.dog*src.dogFade*haloEdge(x)*(0.75*Math.exp(-xp/1.0)+0.25*Math.exp(-xp/4))*Math.exp(-0.5*de*de); }
    }
    if(p.cza!==null && Math.abs(e-p.cza)<3.5){ const de=(e-p.cza)/0.8, da=al/32; I+=A.cza*p.czaW*Math.exp(-0.5*(de*de+da*da)); }
    out[c]=I;
  }
  let w=A.glow*Math.exp(-th/3);
  if(Math.abs(de0)<1.2){ const de=de0/0.35, a120=(al-120)/2.5; w+=A.circle*Math.exp(-0.5*de*de)*(1+2.5*Math.exp(-0.5*a120*a120)); }
  const px=al*src.ch/0.35;
  if(src.pilFade>0 && px<3.5) w+=A.pillar*src.pilFade*Math.exp(-0.5*px*px)*Math.exp(-Math.abs(de0)/(de0>0?5:3));
  out[0]+=w; out[1]+=w; out[2]+=w;
  return out;
}
// The direct beam of a source at solar zenith angle sza, relative to the overhead Sun through
// modern air, from the epoch's day-cycle record.
function directBeam(rec, sza){
  const noonY=DAY.epochs['modern']['Equator'].sun[0][2];
  if(sza>=SZ[SZ.length-1]) return 0;
  const [i, t]=bracket(SZ, Math.max(sza, SZ[0])), j=Math.min(i+1, rec.sun.length-1);
  return Math.max(0, rec.sun[i][2]*(1-t)+rec.sun[j][2]*t)/noonY;
}
// Each dome pixel's direction (x, y, z) and elevation in degrees, kept with the dome geometry.
function domePixelDirs(geo){
  if(geo.pdir) return geo.pdir;
  const {W, H, cx, cy, R}=geo, d=new Float32Array(W*H*4);
  for(let y=0, j=0;y<H;y++) for(let x=0;x<W;x++, j++){
    const dx=x-cx, dy=y-cy, r=Math.hypot(dx, dy);
    if(r>R) continue;
    const el=90-90*r/R, v=horizDir(Math.atan2(dx, -dy)*180/Math.PI, el);
    d[j*4]=v[0]; d[j*4+1]=v[1]; d[j*4+2]=v[2]; d[j*4+3]=el;
  }
  return geo.pdir=d;
}
// Add the halos to dome pixel j (bytes at o of px), over the sky cell c at (tr, ta), mixed under
// the display curve the way the Milky Way is.
function domeHaloPixel(px, o, j, c, tr, ta, halos, H){
  const d=H.dir, v=H.v, w=H.w, L=H.L, eDeg=d[j*4+3];
  v[0]=d[j*4]; v[1]=d[j*4+1]; v[2]=d[j*4+2];
  L[0]=L[1]=L[2]=0;
  for(const hl of halos){
    const src=hl.src, s=src.s, cs=v[0]*s[0]+v[1]*s[1]+v[2]*s[2], cza=src.per[1].cza;
    // Past 50° from the source only the parhelic circle and the circumzenithal arc remain.
    if(cs<0.643 && Math.abs(eDeg-src.h)>2 && (cza===null || Math.abs(eDeg-cza)>4)) continue;
    haloAt(v, src, w);
    for(let q=0;q<3;q++) L[q]+=w[q]*hl.lin[q]*hl.k;
  }
  const rH=0.2126*L[0]+0.7152*L[1]+0.0722*L[2];
  if(!(rH>0)) return;
  const g=H.rgrid, NC=H.NC, rBg=(g[c]*(1-ta)+g[c+1]*ta)*(1-tr)+(g[c+NC]*(1-ta)+g[c+NC+1]*ta)*tr;
  if(rH<rBg*0.003) return;
  const rNew=rBg+rH, tBg=toneAt(H.T, rBg), tNew=toneAt(H.T, rNew), a=tBg>0?(tNew/tBg)*(rBg/rNew):0, b=tNew/rNew;
  for(let q=0;q<3;q++) px[o+q]=linToByte(SRGB_LIN[px[o+q]]*a+L[q]*b);
}
