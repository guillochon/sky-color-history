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
// The map's terms that depend only on longitude, or only on latitude, are worked out once per
// column or row. Spots (galactic longitude and latitude, and their widths in each, in degrees):
// the bulge; the Sagittarius and Scutum star clouds; the Coalsack and the Ophiuchus and Taurus
// dust; the Large and Small Magellanic Clouds and M31.
const MW_SPOT=[[0, -1, 10, 8], [2, -4.5, 3, 2.5], [27, -2.5, 2.5, 2], [301, -1, 2.0, 2.0], [354, 16, 6, 5], [172, -15, 6, 5],
  [280.5, -32.9, 3.2, 2.6], [302.8, -44.3, 1.6, 1.1], [121.2, -21.6, 1.1, 0.45]];
// Fractal value noise: the cell size (degrees) and seed of each of mwSurface's six, three octaves
// each, on cells periodic in longitude.
const MW_FBM=[[2.4, 1], [1.6, 2], [1.2, 3], [1.5, 4], [1.5, 5], [1.0, 6]];
const MW_OCT=MW_FBM.flatMap(([cell, seed])=>[[cell, seed], [cell/2.5, seed+7], [cell/6, seed+13]]);
function mwGs(x, w){ return Math.exp(-0.5*(x/w)*(x/w)); }
// A cell corner's hash, from the XOR of its column's and its row's (and seed's) parts.
function mwHash(h){
  h=Math.imul(h^(h>>>13), 1274126177); h^=h>>>16;
  return (h>>>0)/4294967296;
}
// Longitude l: the band's brightness along the plane, its scale height, the rift's latitude and the
// dust's strength, each spot's longitude factor, and each noise octave's two columns of cells
// (hashed) and the weight across them.
function mwColumn(l){
  const dl=c=>((l-c+540)%360)-180, hx=new Int32Array(MW_OCT.length*2), ux=new Float64Array(MW_OCT.length);
  MW_OCT.forEach(([cell], k)=>{
    const P=Math.round(360/cell), x=(l+180)/cell, ix=Math.floor(x), fx=x-ix, w=i=>((i%P)+P)%P;
    hx[2*k]=Math.imul(w(ix), 374761393); hx[2*k+1]=Math.imul(w(ix+1), 374761393); ux[k]=fx*fx*(3-2*fx);
  });
  const A=0.15+1.0*mwGs(dl(0), 24)+0.6*mwGs(dl(27), 7)+1.6*mwGs(dl(76), 13)+0.3*mwGs(dl(130), 30)
    +0.9*mwGs(dl(287), 13)+0.8*mwGs(dl(310), 15)+0.6*mwGs(dl(338), 11);
  return {A, h:5.0+4.0*mwGs(dl(0), 35), rift:1.2*Math.exp(-Math.pow(dl(38)/42, 4)), dust:0.2+0.8*mwGs(dl(35), 50),
    spot:MW_SPOT.map(([lc, , wl])=>mwGs(dl(lc), wl)), hx, ux};
}
// Latitude b: each spot's latitude factor, and each noise octave's two rows of cells (hashed with
// the seed) and the weight across them.
function mwRow(b){
  const hy=new Int32Array(MW_OCT.length*2), vy=new Float64Array(MW_OCT.length);
  MW_OCT.forEach(([cell, seed], k)=>{
    const y=(b+90)/cell, iy=Math.floor(y), fy=y-iy, hs=Math.imul(seed, 1442695041);
    hy[2*k]=Math.imul(iy, 668265263)^hs; hy[2*k+1]=Math.imul(iy+1, 668265263)^hs; vy[k]=fy*fy*(3-2*fy);
  });
  return {b, spot:MW_SPOT.map(([, bc, , wb])=>mwGs(b-bc, wb)), hy, vy};
}
function mwNoise(C, R, k){
  const x0=C.hx[2*k], x1=C.hx[2*k+1], y0=R.hy[2*k], y1=R.hy[2*k+1], u=C.ux[k], v=R.vy[k];
  const a=mwHash(x0^y0), c=mwHash(x1^y0), d=mwHash(x0^y1), e=mwHash(x1^y1);
  return a+(c-a)*u+(d-a)*v+(a-c-d+e)*u*v;
}
function mwFbm(C, R, f){ return 0.55*mwNoise(C, R, 3*f)+0.3*mwNoise(C, R, 3*f+1)+0.15*mwNoise(C, R, 3*f+2); }
function mwSpot(C, R, k){ return C.spot[k]*R.spot[k]; }
function mwSurface(C, R){
  const b=R.b;
  let I=C.A*Math.exp(-Math.abs(b)/C.h)*(0.45+1.1*mwFbm(C, R, 0));
  I+=0.8*mwSpot(C, R, 0)*(0.7+0.6*mwFbm(C, R, 1));
  I+=0.5*mwSpot(C, R, 1)+0.3*mwSpot(C, R, 2);
  let tau=C.dust*Math.exp(-Math.abs(b-C.rift)/2.0)*(0.35+1.3*mwFbm(C, R, 2));
  tau+=1.3*mwSpot(C, R, 3)+0.9*mwSpot(C, R, 4)*mwFbm(C, R, 3)*2+0.5*mwSpot(C, R, 5)*mwFbm(C, R, 4)*2;
  I*=Math.exp(-tau);
  I+=0.6*mwSpot(C, R, 6)*(0.7+0.6*mwFbm(C, R, 5))+0.32*mwSpot(C, R, 7)+0.22*mwSpot(C, R, 8);
  return I;
}
function buildMilkyWay(){
  if(mwMap) return mwMap;
  const m=new Float32Array(MW_W*MW_H), cols=Array.from({length:MW_W}, (_, i)=>mwColumn(-180+(i+0.5)/MW_W*360));
  let peak=0;
  for(let j=0;j<MW_H;j++){
    const R=mwRow(-MW_BMAX+(j+0.5)/MW_H*2*MW_BMAX);
    for(let i=0;i<MW_W;i++){ const v=mwSurface(cols[i], R); m[j*MW_W+i]=v; if(v>peak) peak=v; }
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
  const epochKey=EP[dIdx].key;
  const year=STAR_YEAR[epochKey]||pageDate()[0];
  const LST=localSidereal();
  const toHoriz=v=>{
    const ra=Math.atan2(v[1], v[0])*180/Math.PI, dec=Math.asin(Math.max(-1, Math.min(1, v[2])))*180/Math.PI;
    const place=starMeanPlace([ra, dec, 0, 0, 0, 0], epochKey, year);
    const p=raDecAltaz(lat, place.ra, place.dec, LST); return horizDir(p.az, p.alt);
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
// Airmass toward true altitude el (degrees, from 0 up), Kasten & Young 1989; AIRMASS_GLSL in shaders.
function airmass(el){ return 1/(Math.sin(el*Math.PI/180)+0.50572*Math.pow(el+6.07995, -1.6364)); }
const AIRMASS_GLSL=`
float airmass(float el){ return 1.0/(sin(el*0.01745329252)+0.50572*pow(el+6.07995, -1.6364)); }`;
// Atmospheric extinction toward true altitude el (degrees), k magnitudes per airmass.
function extinction(el, k){
  if(el<=-1) return 0;
  const X=airmass(Math.max(el, 0));
  return Math.pow(10, -0.4*k*(X-1));
}
// The Milky Way's colour at unit luminance, in linear sRGB, for the sky shader.
function mwLinGLSL(){ return xyzLin(xyY2XYZ([MW_XY[0], MW_XY[1], 1])).map(v=>v.toFixed(5)).join(', '); }
