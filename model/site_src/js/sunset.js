/* ---------- the setting Sun: refraction by wavelength, mirages, and the flash ---------- */
// The epoch's refraction as a multiple of today's (gen_site.py sun_bands): its gases' surface
// refractivity. apparentEl and the shader's trueAlt scale today's curve by it.
function refK(){ return (EP[dIdx]&&EP[dIdx].sun)?EP[dIdx].sun.k:1; }
// The disk is drawn as twenty images, one per 20 nm band centred on 385, 405, ... 765 nm. Air
// bends band b by SUN_DISP[b] times what it bends 550 nm (Edlén 1966). The spread is tiny: at the
// horizon the 525 and 565 nm images are 6 arcseconds apart. Like the disk, it is enlarged, and
// more so at the horizon, where a flash is a sliver (shader_sky.js dispX).
const SUN_BANDS=20;
function edlen(nm){ const s2=(1000/nm)**2; return 8342.54+2406147/(130-s2)+15998/(38.9-s2); }
const SUN_DISP=Array.from({length:SUN_BANDS}, (_, b)=>+(edlen(385+20*b)/edlen(550)).toFixed(5));
const SUN_APP=[0, 0.3, 0.7, 1.2, 2, 3, 5, 8, 14, 30];
// Each band's optical depth at apparent altitude app (degrees).
function sunTauAt(app){
  const t=EP[dIdx].sun.t, a=Math.max(0, Math.min(30, app));
  let i=0; while(i<SUN_APP.length-2 && a>SUN_APP[i+1]) i++;
  const f=(a-SUN_APP[i])/(SUN_APP[i+1]-SUN_APP[i]);
  return Array.from({length:SUN_BANDS}, (_, b)=>t[i*SUN_BANDS+b]*(1-f)+t[(i+1)*SUN_BANDS+b]*f);
}
// The bands' light through the air at apparent altitude app, as linear sRGB, times e^off (the
// shader's optical depths are less off, so the thickest air stays inside single precision).
function sunBandsAt(app, off=0){
  const w=EP[dIdx].sun.w, c=[0, 0, 0];
  sunTauAt(app).forEach((t, b)=>{ const T=Math.exp(off-t); for(let q=0;q<3;q++) c[q]+=w[b*3+q]*T; });
  return c;
}
// The day's layering of the low air, from the date and the epoch, so a given evening always sets
// the same way. Sizes are in drawn solar radii (rd degrees), as the disk is drawn enlarged.
//   lay[i] = (apparent altitude of a thin inversion layer, its half-thickness, the jump in true
//            altitude across it, the extra optical depth along it as a share of the path's)
//   Where the jump is steeper than the layer is thick, the rays cross over and a strip of the
//   disk shows twice, once inverted; where it is gentle the edge only steps. The rays trapped
//   along a layer travel far through the densest air, so it crosses the disk as a dark line.
//   mir = (the mirror line of an inferior mirage, how much its inverted image is squeezed, the
//          extra optical depth of the grazing path, the shimmer of the edges)
//   Over warm water or ground, the rays below the mirror line curve up off the warm air next to
//   the surface, and the bottom of the Sun meets its own inverted image: the omega.
// The cold surface of Snowball Earth makes inversions common and inferior mirages rare; the warm
// oceans of the Hadean and Archean the reverse.
const MIRAGE_ODDS={snowball07:[0.05, 0.75], hadean44:[0.55, 0.2], hadean40:[0.55, 0.2], archean38:[0.5, 0.25],
  archean27thin:[0.5, 0.25], archean27:[0.5, 0.25], archean27vthick:[0.5, 0.25]};
let sunsetCache=null;
function sunsetLayers(rd){
  const m=/^(-?\d+)-(\d+)-(\d+)$/.exec(document.getElementById('moonDate').value||'');
  const day=Math.floor((m?utcDay(+m[1], +m[2], +m[3]):Date.now()/86400000)), key=EP[dIdx].key;
  const id=`${key}|${day}|${rd.toFixed(4)}`;
  if(sunsetCache&&sunsetCache.id===id) return sunsetCache;
  const rnd=mulberry32((day*2654435761^[...key].reduce((h, c)=>h*31+c.charCodeAt(0)|0, 7))>>>0);
  const [pInf, pLay]=MIRAGE_ODDS[key]||[0.35, 0.4];
  const lay=new Float32Array(16), mir=new Float32Array(4);
  if(rnd()<pLay){
    const n=1+Math.floor(rnd()*4);
    for(let i=0;i<n;i++){
      const sign=rnd()<0.6?1:-1;
      lay.set([rd*2.2*Math.pow(rnd(), 1.5), rd*(0.015+0.04*rnd()), sign*rd*(0.03+0.12*rnd()), 0.15+0.65*rnd()], i*4);
    }
  }
  if(rnd()<pInf) mir.set([rd*(0.1+0.35*rnd()), 1.2+0.8*rnd(), 0.03+0.07*rnd(), 0]);
  mir[3]=rd*0.012*rnd()*rnd();
  return sunsetCache={id, lay, mir};
}
