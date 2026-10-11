/* ---------- the Moon's face through time ---------- */
// Ages (Ma) of the epochs whose Moon looked different from today's.
const MOON_MA={hadean45:4500, kpg66:66, carbon30:300, ordovician466:466, snowball07:700, proterozoic22:2200,
  archean27thin:2700, archean27:2700, archean27vthick:2700, archean38:3800, hadean40:4000};
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
// The newborn Moon, 4.5 Ga, a few million years after the giant impact, still has its magma ocean
// open at the top: rafts of dark crust broken by cracks and lakes of lava at 1,400–1,600 K (the
// molten globe, molten_moon.js). Per square kilometre that lava shines about as brightly as the
// sunlit Moon (see lunarLava), so the disk glows orange by day and night alike, and the air about
// it carries a red aureole: the globe's red excess is the share that glows (moonGlow, drawn in the
// sky shader and drawMoonOnDome).
const MOON_MOLTEN={hadean45:1};
function moonGlow(key){ return MOON_MOLTEN[key]||0; }
// The Moon's whole globe for each epoch (moon_maps.py, from the LRO colour mosaic toned to a
// full-Moon photograph): today's; before Tycho (108 Myr old; Apollo 17 samples of its ray,
// Arvidson et al. 1976), its rays, the brightest on the full Moon, gone; at 3.8 and 4.0 Ga the
// maria part-flooded and not yet (MARIA); and the molten newborn Moon. Equirectangular, longitude
// −180° at the left edge and north at the top, in mareVec's frame; the shader and the dome draw it
// turned on the Moon's axes (moon.js moonAxes), so it librates.
const MOON_MAPS=__MOON_MAPS__;
function moonMapName(key){
  if(MOON_MOLTEN[key]) return 'molten';
  const ma=MOON_MA[key]||0;
  return ma>=4000?'ma4000':ma>=3800?'ma3800':ma>=108?'notycho':'now';
}
// Each globe is fetched the first time its epoch is shown: the image for the walk-around view's
// texture, and a 1024 x 512 copy of its pixels for the dome (dome_bodies.js paintMoonSprite).
// moonShown is the epoch's globe once it is ready, and the last one shown until then.
const moonMaps=new Map(); let moonShown=null;
function moonMap(key){
  const name=moonMapName(key); let m=moonMaps.get(name);
  if(!m){
    m={name, img:null, px:null}; moonMaps.set(name, m);
    fetch(MOON_MAPS[name]).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
      const c=document.createElement('canvas'); c.width=1024; c.height=512;
      const ctx=c.getContext('2d', {willReadFrequently:true}); ctx.drawImage(bm, 0, 0, 1024, 512);
      m.px=ctx.getImageData(0, 0, 1024, 512).data; m.img=bm;
      if(moonMapName(EP[dIdx].key)===name){ moonReady=true; uploadMoon(); requestRender(); }
    }).catch(()=>{});
  }
  if(m.img) moonShown=m;
  return moonShown;
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
  const ma=MOON_MA[key]||0, live=MARIA.filter(m=>ma<=m[4]*1000+50&&ma>=m[4]*1000-500&&mareVec(m[1], m[2])[2]>0);
  if(!live.length) return [];
  const k=Math.floor((astroDay()-DN_NEW0)/synodic()+0.5), rnd=mulberry32(metHash(key+'|lava|'+k)), out=[];
  const n=1+Math.floor(rnd()*3), dm=5*Math.log10((MOON_RE[key]||40)/40), tot=live.reduce((a, m)=>a+m[3]*m[3], 0);
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
