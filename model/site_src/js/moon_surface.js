/* ---------- the Moon's face through time ---------- */
// Its look follows the age the sky shows (epoch_time.js ageMaOf).
// The dark maria are basalt that flooded the great basins from about 3.9 Ga, most of it by 3.3 Ga
// (Hiesinger et al. 2011, GSA Special Paper 477): before then the near side was bright highland
// crust from limb to limb. They did not darken together. Each mare here has a date its floor
// began to go dark: a little before its oldest dated basalt, from the Apollo and Luna samples
// (Apollo 11 low-K basalts to 3.88 Ga, Apollo 17 3.7–3.8 Ga, Luna 16 and 24 3.3–3.4 Ga) and the
// crater-count ages of its oldest surface units, since the first flows are buried under later
// ones. Its floor then darkens over 150 Myr, as flood basalts spread fast. So at 3.8 Ga
// Tranquillitatis is two-thirds dark and Serenitatis and Nectaris a third, while Imbrium, only
// 50–100 Myr old, is still a bright basin and Procellarum has not begun. Libration brings the
// limb and some of the far side into view, so its maria are here too: Orientale (basalts from
// 3.7 Ga; Whitten et al. 2011), Moscoviense (3.9–2.6 Ga; Morota et al. 2009) and Ingenii.
// [name, selenographic latitude and longitude, radius (degrees), onset (Ga)]; dark ground on the
// near side nearer none is Procellarum's (the last).
const MARIA=[['Tranquillitatis', 8.5, 31.4, 13, 3.90], ['Serenitatis', 28, 17.5, 10, 3.85], ['Nectaris', -15.2, 35.5, 5, 3.85],
  ['Fecunditatis', -7.8, 51.3, 10, 3.80], ['Crisium', 17, 59.1, 9, 3.80], ['Australe', -38.9, 93, 10, 3.90], ['Marginis', 13.3, 86.1, 6, 3.80],
  ['Smythii', 1.3, 87.5, 6, 3.85], ['Vaporum', 13.3, 3.6, 4, 3.75], ['Nubium', -21.3, -16.6, 11, 3.75], ['Humorum', -24.4, -38.6, 7, 3.75],
  ['Cognitum', -10, -23, 5, 3.70], ['Imbrium', 32.8, -15.6, 18, 3.70], ['Frigoris', 56, 1.4, 10, 3.70], ['Insularum', 7.5, -30.9, 8, 3.65],
  ['Orientale', -19.4, -92.8, 6, 3.75], ['Moscoviense', 27.3, 147.9, 4, 3.90], ['Ingenii', -33.7, 163.5, 3, 3.60],
  ['Procellarum', 18, -57, 20, 3.60]];
function mareVec(lat, lon){ return [cosd(lat)*sind(lon), sind(lat), cosd(lat)*cosd(lon)]; }
// The newborn Moon, 4.5 Ga, some ten million years after the giant impact, still has its magma ocean
// open at the top: rafts of dark crust broken by cracks and lakes of lava at 1,400–1,600 K (the
// molten globe, molten_moon.js). Per square kilometre that lava shines about as brightly as the
// sunlit Moon (see lunarLava), so the disk glows orange by day and night alike, and the air about
// it carries a red aureole: the globe's red excess is the share that glows (moonGlow, drawn in the
// sky shader and drawMoonOnDome), at 0.65 so the lit relief of the rafts stays clear beside it.
// Drawn so from the impact (airtime.py T_IMPACT, 4,510 Ma) for 20 Myr; then, as a crust closes
// over it, it cools into the Moon of 4.0 Ga by 4,450 Ma: the lava's glow fades and the black rafts
// grey as the one globe gives way to the other (moonMelt, 1 to 0). The Early Hadean's epoch,
// 10 Myr on, sees it wholly molten. The times are a guess.
const MOLTEN_FROM_MA=4510, MOLTEN_TO_MA=4490, MOLTEN_COOL_MA=4450;
function moonMelt(key){ const a=ageMaOf(key); return a>MOLTEN_FROM_MA||a<=MOLTEN_COOL_MA?0:smooth01(MOLTEN_COOL_MA, MOLTEN_TO_MA, a); }
// In steps of 1/64, for the globe's texture and the limb, made again at each step.
function moonMeltQ(key){ return Math.round(moonMelt(key)*64)/64; }
function moonMolten(key){ return moonMelt(key)>0; }
function moonGlow(key){ return 0.65*moonMelt(key); }
// The light the molten Moon casts on the night (vr_paint.js): the sunlight its globe reflects, its
// mean over the near side a quarter of today's (0.247 in linear luminance, the dark crust and the
// lava's own colour) and orange (MOLTEN_REFL_RGB, today's moonlight's colour times the globes'
// ratio in each linear channel, at today's luminance); and the lava's own light, about 0.4 of the
// disk glowing as bright per square kilometre as the sunlit Moon, the colour of melt at 1,400-1,600 K
// (MOLTEN_LAVA_RGB, at the same luminance).
const MOLTEN_REFL=0.247, MOLTEN_REFL_RGB=[2.14, 0.51, 0.147], MOLTEN_LAVA_RGB=[1.84, 0.66, 0.15];
// The Moon's whole globe for each epoch (moon_maps.py, from the LRO colour mosaic toned to a
// full-Moon photograph): today's; before Tycho (108 Myr old; Apollo 17 samples of its ray,
// Arvidson et al. 1976), its rays, the brightest on the full Moon, gone; at 3.8 and 4.0 Ga the
// maria part-flooded and not yet (MARIA); and the molten newborn Moon, laid over the 4.0 Ga globe
// as it cools (moonMelted). Equirectangular, longitude
// −180° at the left edge and north at the top, in mareVec's frame; the shader and the dome draw it
// turned on the Moon's axes (moon.js moonAxes), so it librates.
const MOON_MAPS=__MOON_MAPS__;
function moonMapName(key){
  if(moonMeltQ(key)>=1) return 'molten';
  const ma=ageMaOf(key);
  return ma>=4000?'ma4000':ma>=3800?'ma3800':ma>=109?'notycho':'now';
}
// Each globe is fetched the first time its epoch is shown: the image for the walk-around view's
// texture, and a 1024 x 512 copy of its pixels for the dome (dome_bodies.js paintMoonSprite).
// moonShown is the epoch's globe once it is ready, and the last one shown until then.
const moonMaps=new Map(); let moonShown=null;
function moonMapLoad(name){
  let m=moonMaps.get(name);
  if(!m){
    m={name, img:null, px:null}; moonMaps.set(name, m);
    if(name==='molten') loadMoonRelief('molten_relief');
    fetch(MOON_MAPS[name]).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
      const c=document.createElement('canvas'); c.width=1024; c.height=512;
      const ctx=c.getContext('2d', {willReadFrequently:true}); ctx.drawImage(bm, 0, 0, 1024, 512);
      m.px=ctx.getImageData(0, 0, 1024, 512).data; m.img=bm; if(!moonShown) moonShown=m;
      const k=EP[dIdx].key;
      if(moonMapName(k)===name||name==='molten'&&moonMolten(k)){ moonReady=true; uploadMoon(); requestRender(); }
    }).catch(()=>{});
  }
  return m;
}
function moonMap(key){
  const m=moonMapLoad(moonMapName(key));
  if(m.img) moonShown=m;
  return moonShown;
}
// While the Moon cools, the molten globe over moonMap's and its share (moonMeltQ), once it is in.
function moonMelted(key){
  const k=moonMeltQ(key); if(!(k>0&&k<1)) return null;
  const m=moonMapLoad('molten'); return m.img?{m, k}:null;
}
// The Moon's heights (moon_maps.py), on the globes' grid, one byte from MOON_RELIEF[name][0] to [1]
// km: today's (relief), the LRO laser altimeter's over a sphere of 1737.4 km, 5760 x 2880, fetched
// once the page is up (boot.js) and used for every epoch but the first; and the newborn Moon's
// (molten_relief, molten_moon.js), its crust's rafts riding over the melt's level, fetched with its
// globe. They light the globe's slopes and cast its shadows (the sky shader, from the texture's
// alpha, moonTexPixels) and shape its limb (moonLimbSync); until they are in, the limb keeps a
// made-up profile and the globe no relief.
const MOON_RELIEF={relief:[-9.2, 10.9], molten_relief:[-0.15, 2.25]};
const moonReliefs={};
function loadMoonRelief(name='relief'){
  if(name in moonReliefs||!MOON_MAPS[name]) return; moonReliefs[name]=null;
  fetch(MOON_MAPS[name]).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
    const c=document.createElement('canvas'); c.width=bm.width; c.height=bm.height;
    const ctx=c.getContext('2d', {willReadFrequently:true}); ctx.drawImage(bm, 0, 0);
    const d=ctx.getImageData(0, 0, bm.width, bm.height).data, h=new Uint8Array(bm.width*bm.height);
    for(let i=0;i<h.length;i++) h[i]=d[i*4];
    moonReliefs[name]={h, w:bm.width, ht:bm.height, range:MOON_RELIEF[name]}; moonLimbKey=''; uploadMoon(); requestRender();
  }).catch(()=>{});
}
// Whether the epoch's globe has heights in (either of the two while the Moon cools; the other is
// level then).
function moonReliefOn(){ const k=moonMeltQ(EP[dIdx].key); return !!(k>0&&moonReliefs.molten_relief||k<1&&moonReliefs.relief); }
// The heights' range in km, [low, span], as the texture holds them: while the Moon cools its alpha
// is the two globes' mixed in its share, and so is the range, so they go over from one to the
// other (syncMoonTex).
function moonHRange(key){
  const k=moonMeltQ(key), a=MOON_RELIEF.relief, b=MOON_RELIEF.molten_relief, lo=a[0]+(b[0]-a[0])*k;
  return [lo, a[1]+(b[1]-a[1])*k-lo];
}
// A globe's pixels for the walk-around view's texture, the heights in alpha (level where there
// are none).
function moonTexPixels(m){
  const W=m.img.width, H=m.img.height, c=document.createElement('canvas'); c.width=W; c.height=H;
  const ctx=c.getContext('2d', {willReadFrequently:true}); ctx.drawImage(m.img, 0, 0);
  const name=m.name==='molten'?'molten_relief':'relief', px=ctx.getImageData(0, 0, W, H).data, R=moonReliefs[name];
  if(R) for(let j=0;j<H;j++){
    const rj=Math.floor((j+0.5)*R.ht/H)*R.w;
    for(let i=0;i<W;i++) px[(j*W+i)*4+3]=R.h[rj+Math.floor((i+0.5)*R.w/W)];
  }
  else { const r=MOON_RELIEF[name], flat=Math.round(-r[0]/(r[1]-r[0])*255); for(let i=3;i<px.length;i+=4) px[i]=flat; }
  return new Uint8Array(px.buffer);
}
// The limb: at each of LIMB_N position angles (from north through east, as moon.js limbH), how far
// the skyline stands out from the sphere, as a share of its radius: the highest of the ground along
// that angle from 6° behind the limb to 6° in front of it, projected on the sky, so it changes as
// the Moon librates. Its height is drawn twice over (LIMB_X), so Baily's beads show on the
// enlarged disk (DISK_SCALE). Made again when the Moon has turned by
// 0.06° or so; moonLimbGen counts the profiles.
const LIMB_N=1024, LIMB_X=2, LIMB_RANGE=0.03, moonLimbProf=new Float32Array(LIMB_N);
// The molten Moon's shape: still fluid, and turning once in its 32-hour orbit at 8 Earth radii, it
// is drawn out by the Earth's tide and flattened by its spin into an ellipsoid whose long axis
// points at the Earth. Its radius at body-frame direction p (x east, y north, z the near side's
// middle), as a share of the mean one, is h_f(q_t P2(z) - q_s P2(y)/3), with q_t = GM_E R^3/(GM_M
// a^3), q_s = ω²R^3/GM_M, and the fluid Love number h_f = 2.435 from Darwin-Radau and today's
// moment of inertia, 0.393 MR^2 (2.5 for a uniform Moon). The near side's middle stands 16 km
// above the mean, the poles 11 km below, the leading and trailing points 4.5 km below: so the disk
// seen from the Earth, almost down the long axis, is 0.4% narrower pole to pole than across and
// 0.3–0.7% smaller than the mean sphere. It is drawn at its true size, not the relief's LIMB_X.
const MOON_HF=2.435, GM_EARTH=398600.4, GM_MOON=4902.8;
function moonTide(key){
  if(!moonMolten(key)) return null;
  const a=moonDist()*EARTH_R_KM, r3=MOON_R_KM**3/(a**3*GM_MOON);
  return [MOON_HF*GM_EARTH*r3, MOON_HF*(GM_EARTH+GM_MOON)*r3/3];
}
function tideAt(t, x1, x2){ return t?t[0]*(1.5*x2*x2-0.5)-t[1]*(1.5*x1*x1-0.5):0; }
let moonLimbKey='', moonLimbGen=0;
for(let i=0;i<LIMB_N;i++) moonLimbProf[i]=limbFake(i/LIMB_N*2*Math.PI)*LIMB_X/3;
function moonLimbSync(mo){
  if(!mo||!mo.ax) return;
  const b=moonBasis(mo), ax=mo.ax, body=v=>[vdot(v, ax.E), vdot(v, ax.P), vdot(v, ax.M)];
  const eB=body(b.east), nB=body(b.north), mB=body(b.md);
  // While the Moon cools, the molten globe's profile and the 4.0 Ga one's, mixed in its share.
  const key0=EP[dIdx].key, k=moonMeltQ(key0), Rm=k>0&&moonReliefs.molten_relief||null, Rn=k<1&&moonReliefs.relief||null;
  const key=k+(Rm?'m':'')+(Rn?'n':'')+(Rm||Rn||k>0?nB.concat(mB).map(x=>Math.round(x*1000)).join(','):'');
  if(key===moonLimbKey) return;
  moonLimbKey=key; moonLimbGen++;
  if(k<1) limbProfile(moonLimbProf, Rn, 1, null, eB, nB, mB);
  if(k>0){
    const p=k<1?limbScratch:moonLimbProf;
    limbProfile(p, Rm, 0.3, moonTide(key0), eB, nB, mB);
    if(k<1) for(let i=0;i<LIMB_N;i++) moonLimbProf[i]+=(p[i]-moonLimbProf[i])*k;
  }
}
const limbScratch=new Float32Array(LIMB_N);
// One profile into out, from the heights R; until they are in, the made-up one (drawn at three
// times real relief, so scaled to LIMB_X) at fake times that (a third for the molten Moon's low
// rafts). On the molten Moon the tide's shape is added along the limb.
function limbProfile(out, R, fake, tide, eB, nB, mB){
  const limbTide=(sp, cp)=>tideAt(tide, eB[1]*sp+nB[1]*cp, eB[2]*sp+nB[2]*cp);
  if(!R){ const s=fake*LIMB_X/3; for(let i=0;i<LIMB_N;i++){ const pa=i/LIMB_N*2*Math.PI; out[i]=s*limbFake(pa)+limbTide(Math.sin(pa), Math.cos(pa)); } return; }
  const lo=R.range[0]/MOON_R_KM, k=(R.range[1]-R.range[0])/255/MOON_R_KM;
  const NF=193, fc=new Float64Array(NF), fs=new Float64Array(NF);
  for(let j=0;j<NF;j++){ const f=(j-(NF-1)/2)/16*Math.PI/180; fc[j]=Math.cos(f); fs[j]=Math.sin(f); }
  for(let i=0;i<LIMB_N;i++){
    const pa=i/LIMB_N*2*Math.PI, sp=Math.sin(pa), cp=Math.cos(pa);
    const u0=eB[0]*sp+nB[0]*cp, u1=eB[1]*sp+nB[1]*cp, u2=eB[2]*sp+nB[2]*cp;
    let best=-1;
    for(let j=0;j<NF;j++){
      // In the plane of that angle and the line of sight, φ toward the viewer.
      const p0=u0*fc[j]-mB[0]*fs[j], p1=u1*fc[j]-mB[1]*fs[j], p2=u2*fc[j]-mB[2]*fs[j];
      const x=Math.min(R.w-1, Math.floor((Math.atan2(p0, p2)/Math.PI+1)*R.w/2)), y=Math.min(R.ht-1, Math.max(0, Math.floor((0.5-Math.asin(Math.max(-1, Math.min(1, p1)))/Math.PI)*R.ht)));
      const r=(1+lo+R.h[y*R.w+x]*k+tideAt(tide, p1, p2))*fc[j]; if(r>best) best=r;
    }
    // The heights over the tide's shape at the limb drawn LIMB_X over, that shape as it is.
    const t0=limbTide(sp, cp);
    out[i]=LIMB_X*(best-1-t0)+t0;
  }
}
// The albedo (0-255 RGB, into out) of a globe's small copy at body-frame direction v.
function moonAlbedo(m, v, out){
  const lon=Math.atan2(v[0], v[2]), lat=Math.asin(Math.max(-1, Math.min(1, v[1])));
  const i=Math.min(1023, Math.floor((lon/Math.PI+1)*512)), j=Math.min(511, Math.max(0, Math.floor((0.5-lat/Math.PI)*512))), o=(j*1024+i)*4;
  out[0]=m.px[o]; out[1]=m.px[o+1]; out[2]=m.px[o+2]; return out;
}
// Mare volcanism: fissures feeding the flood basalts fountained lava at about 1,400 K, as bright
// per square kilometre as the sunlit Moon and far redder. A few to a hundred square kilometres of
// it glowing at once is a point of magnitude +4 to −1 from 40 Earth radii (the page draws +3 to
// −1, as fainter ones are lost in the moonlit sky beside the Moon), on the night side a red star
// on the Moon. Each eruption lasted months; years without one were common, so this is a sky with
// eruptions under way: one to three each lunation, changing at full Moon when the night side is
// out of sight, in the maria then filling (from 50 Myr before a mare's onset to 500 Myr after),
// the larger ones more often.
function lunarLava(key){
  const ma=ageMaOf(key), live=MARIA.filter(m=>ma<=m[4]*1000+50&&ma>=m[4]*1000-500&&mareVec(m[1], m[2])[2]>0);
  if(!live.length) return [];
  const k=Math.floor((astroDay()-DN_NEW0)/synodic()+0.5), rnd=mulberry32(metHash(key+'|lava|'+k)), out=[];
  const n=1+Math.floor(rnd()*3), dm=5*Math.log10(moonDist()/40), tot=live.reduce((a, m)=>a+m[3]*m[3], 0);
  for(let i=0;i<n;i++){
    let u=rnd()*tot, m=live[0]; for(const c of live){ u-=c[3]*c[3]; if(u<=0){ m=c; break; } }
    // A vent within 0.6 of the mare's radius of its centre, on the near side; the brightness is
    // for the Moon at 40 Earth radii.
    const a=2*Math.PI*rnd(), r=0.6*m[3]*Math.sqrt(rnd()), v=mareVec(m[1]+r*Math.sin(a), m[2]+r*Math.cos(a)/Math.max(0.2, cosd(m[1])));
    if(v[2]<0.2) continue;
    out.push({id:key+'|lava|'+k+'|'+i, sv:v, mag:3-4*rnd()+dm, temp:1300+250*rnd(), lava:true, mare:m[0]});
  }
  // On the disk as the Moon is turned now (moonBasis east and north), and none past the limb.
  const mo=skyNow&&skyNow.moon; if(!mo||!mo.ax) return [];
  const b=moonBasis(mo), ax=mo.ax;
  return out.filter(f=>{
    const w=vadd(vscale(ax.E, f.sv[0]), vscale(ax.P, f.sv[1]), vscale(ax.M, f.sv[2]));
    f.x=vdot(w, b.east); f.y=vdot(w, b.north); return -vdot(w, b.md)>0.15;
  });
}
