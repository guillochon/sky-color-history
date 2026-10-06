// The Milky Way, as V surface brightness (cd/m²) on a grid in galactic longitude and latitude,
// built once in the browser. It is a model, not a survey: a disk whose brightness along the
// plane follows the bright star fields (Sagittarius, Scutum, Cygnus, Carina, Crux and Centaurus,
// Norma and Scorpius) and fades toward the anticentre, thicker toward the bulge, mottled by
// noise; a bulge; the Sagittarius and Scutum star clouds; dust in a thin layer that splits the
// band from Cygnus to Sagittarius (the Great Rift), plus the Coalsack and the Ophiuchus and
// Taurus clouds; and the Magellanic Clouds and M31. The brightest field, the Sagittarius star
// cloud, is set to 8.5e-4 cd/m² (about 20.2 mag/arcsec² on its own, 20.0 with the natural sky,
// at the bright end of what is measured), and the band elsewhere runs from about 40% of that in Cygnus to a tenth toward the
// anticentre, in line with the integrated starlight of Leinert et al. 1998 (A&AS 127, 1). Its
// colour is that of integrated starlight, about 4800 K.
const MW_W=1024, MW_H=288, MW_BMAX=50, MW_PEAK=8.5e-4, MW_XY=[0.350, 0.360];
let mwMap=null;
function mwHash(ix, iy, seed){
  let h=Math.imul(ix, 374761393)^Math.imul(iy, 668265263)^Math.imul(seed, 1442695041);
  h=Math.imul(h^(h>>>13), 1274126177); h^=h>>>16;
  return (h>>>0)/4294967296;
}
// Value noise on cells of `cell` degrees, periodic in longitude.
function mwNoise(l, b, cell, seed){
  const P=Math.round(360/cell), x=(l+180)/cell, y=(b+90)/cell, ix=Math.floor(x), iy=Math.floor(y);
  const fx=x-ix, fy=y-iy, u=fx*fx*(3-2*fx), v=fy*fy*(3-2*fy), w=i=>((i%P)+P)%P;
  const a=mwHash(w(ix), iy, seed), c=mwHash(w(ix+1), iy, seed), d=mwHash(w(ix), iy+1, seed), e=mwHash(w(ix+1), iy+1, seed);
  return a+(c-a)*u+(d-a)*v+(a-c-d+e)*u*v;
}
function mwFbm(l, b, cell, seed){ return 0.55*mwNoise(l, b, cell, seed)+0.3*mwNoise(l, b, cell/2.5, seed+7)+0.15*mwNoise(l, b, cell/6, seed+13); }
function mwSurface(l, b){
  const dl=c=>((l-c+540)%360)-180, gs=(x, w)=>Math.exp(-0.5*(x/w)*(x/w));
  const spot=(lc, bc, wl, wb)=>gs(dl(lc), wl)*gs(b-bc, wb);
  const A=0.15+1.0*gs(dl(0), 24)+0.6*gs(dl(27), 7)+1.6*gs(dl(76), 13)+0.3*gs(dl(130), 30)
    +0.9*gs(dl(287), 13)+0.8*gs(dl(310), 15)+0.6*gs(dl(338), 11);
  const h=5.0+4.0*gs(dl(0), 35);
  let I=A*Math.exp(-Math.abs(b)/h)*(0.45+1.1*mwFbm(l, b, 2.4, 1));
  I+=0.8*spot(0, -1, 10, 8)*(0.7+0.6*mwFbm(l, b, 1.6, 2));
  I+=0.5*spot(2, -4.5, 3, 2.5)+0.3*spot(27, -2.5, 2.5, 2);
  const rift=1.2*Math.exp(-Math.pow(dl(38)/42, 4));
  let tau=(0.2+0.8*gs(dl(35), 50))*Math.exp(-Math.abs(b-rift)/2.0)*(0.35+1.3*mwFbm(l, b, 1.2, 3));
  tau+=1.3*spot(301, -1, 2.0, 2.0)+0.9*spot(354, 16, 6, 5)*mwFbm(l, b, 1.5, 4)*2+0.5*spot(172, -15, 6, 5)*mwFbm(l, b, 1.5, 5)*2;
  I*=Math.exp(-tau);
  I+=0.6*spot(280.5, -32.9, 3.2, 2.6)*(0.7+0.6*mwFbm(l, b, 1.0, 6))+0.32*spot(302.8, -44.3, 1.6, 1.1)+0.22*spot(121.2, -21.6, 1.1, 0.45);
  return I;
}
function buildMilkyWay(){
  if(mwMap) return mwMap;
  const m=new Float32Array(MW_W*MW_H);
  let peak=0;
  for(let j=0;j<MW_H;j++){
    const b=-MW_BMAX+(j+0.5)/MW_H*2*MW_BMAX;
    for(let i=0;i<MW_W;i++){ const v=mwSurface(-180+(i+0.5)/MW_W*360, b); m[j*MW_W+i]=v; if(v>peak) peak=v; }
  }
  for(let i=0;i<m.length;i++) m[i]*=MW_PEAK/peak;
  return mwMap=m;
}
function mwSample(l, b){
  if(!mwMap || Math.abs(b)>=MW_BMAX) return 0;
  const x=((l+180)/360*MW_W-0.5+MW_W)%MW_W, y=Math.max(0, Math.min(MW_H-1.001, (b+MW_BMAX)/(2*MW_BMAX)*MW_H-0.5));
  const i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j, i1=(i+1)%MW_W;
  const at=(a, c)=>mwMap[c*MW_W+a];
  return (at(i, j)*(1-fx)+at(i1, j)*fx)*(1-fy)+(at(i, j+1)*(1-fx)+at(i1, j+1)*fx)*fy;
}
// The galactic axes (toward the centre, toward l=90°, toward the north pole) in the local
// horizon frame (east, north, up), for the date, clock time, and latitude shown. They are moved
// from J2000 to the stars' year with the same precession as the stars.
const GAL_AXES=[[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445], [-0.8676661490, -0.1980763734, 0.4559837762]];
function galacticBasis(lat){
  const epochKey=EP[dIdx].key, ins=instantUT();
  const year=STAR_YEAR[epochKey]||+(document.getElementById('moonDate').value||localISODate(new Date())).slice(0,4);
  const eq=moonEquatorial(dayNumber(ins.y,ins.m,ins.D,ins.ut));
  const LST=rev(rev(eq.Ls+180+ins.ut*15)+ins.lon);
  const toHoriz=v=>{
    const ra=Math.atan2(v[1], v[0])*180/Math.PI, dec=Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI;
    const place=starMeanPlace([ra, dec, 0, 0, 0, 0], epochKey, year);
    let H=rev(LST-rev(place.ra)); if(H>180) H-=360;
    const p=altaz(lat, place.dec, H); return horizDir(p.az, p.alt);
  };
  // Rows of GAL_AXES are the galactic axes in J2000 equatorial coordinates. At a traced epoch
  // (STAR_EPOCH_GAL, from build_star_epochs.py) the plane is where it is now, but the Sun was
  // elsewhere on its orbit, so the Galactic centre, and the bright part of the band, lay at
  // another longitude: the first two axes turn about the pole to put it there.
  const [x, y, z]=GAL_AXES.map(toHoriz), L=((STAR_EPOCH_GAL[epochKey]||{}).mwL||0)*Math.PI/180;
  const c=Math.cos(L), s=Math.sin(L);
  const basis=[[c*x[0]+s*y[0], c*x[1]+s*y[1], c*x[2]+s*y[2]], [c*y[0]-s*x[0], c*y[1]-s*x[1], c*y[2]-s*x[2]], z];
  basis.db=mwLatShift(epochKey);
  return basis;
}
// How far the band sits from the galactic equator (degrees): seen from above the plane it
// shifts the other way, by the Sun's extra height over the 1.5 kpc or so that most of the
// band's light comes from. Today's 20.8 pc is already in the map.
function mwLatShift(key){ const g=STAR_EPOCH_GAL[key]; return g?-Math.atan((g.sunZ-20.8)/1500)*180/Math.PI:0; }
// Brightness (cd/m²) of the Milky Way seen in horizon direction d, before the air.
function mwAt(basis, d){
  const x=vdot(d, basis[0]), y=vdot(d, basis[1]), z=vdot(d, basis[2]);
  return mwSample(Math.atan2(y, x)*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, z)))*180/Math.PI-basis.db);
}
// Atmospheric extinction toward true altitude el (degrees), k magnitudes per airmass
// (Kasten & Young 1989 airmass).
function extinction(el, k){
  if(el<=-1) return 0;
  const h=Math.max(el, 0), X=1/(Math.sin(h*Math.PI/180)+0.50572*Math.pow(h+6.07995, -1.6364));
  return Math.pow(10, -0.4*k*(X-1));
}
// The Milky Way's colour at unit luminance, in linear sRGB, for the sky shader.
function mwLinGLSL(){ return xyzLin(xyY2XYZ([MW_XY[0], MW_XY[1], 1])).map(v=>v.toFixed(5)).join(', '); }
