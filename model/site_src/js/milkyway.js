// The Milky Way, as V surface brightness (cd/m²) on a grid in galactic longitude and latitude,
// built once in the browser. It is a model, not a survey: a disk whose brightness along the
// plane follows the bright star fields (Sagittarius, Scutum, Cygnus, Carina, Crux and Centaurus,
// Norma and Scorpius) and fades toward the anticentre, thicker toward the bulge, mottled by
// noise; a bulge; the Sagittarius and Scutum star clouds; dust in a thin layer that splits the
// band from Cygnus to Sagittarius (the Great Rift), plus the Coalsack and the Ophiuchus and
// Taurus clouds. The Magellanic Clouds and M31 are images (dso.js). The brightest field, the Sagittarius star
// cloud, is set to 8.5e-4 cd/m² (about 20.2 mag/arcsec² on its own, 20.0 with the natural sky,
// at the bright end of what is measured), and the band elsewhere runs from about 40% of that in Cygnus to a tenth toward the
// anticentre, in line with the integrated starlight of Leinert et al. 1998 (A&AS 127, 1).
// Its colour is its starlight's, worked out from the spectrum the probe gives it (spectrum.js
// spMWAt), so the two agree: old stars and young ones in the share mwSurface gives each place,
// reddened by the dust in front of them. Young stars (B, A and F) keep to a layer a few degrees
// thick, strongest along the spiral arms seen end on and the nearby OB associations, and patchy
// as their clusters are; the bulge is old. The dust is the map's own (tau, the e-folds of V light
// it takes out), reddening the light that gets through by the Cardelli, Clayton & Mathis (1989)
// law with R_V = 3.1, so the band is browner along the Great Rift and the edges of the dark
// clouds. MW_XY is the band's mean colour so made (weighted by light), for the nebulae's
// background starlight (dso.js).
const MW_W=1024, MW_H=288, MW_BMAX=50, MW_PEAK=8.5e-4, MW_XY=[0.353, 0.357];
// mwMap: V surface brightness (cd/m²); mwRGB: its light in linear sRGB (cd/m², three per pixel);
// mwAge: the young stars' share of the light and the dust's tau (two per pixel).
let mwMap=null, mwRGB=null, mwAge=null;
// The map's terms that depend only on longitude, or only on latitude, are worked out once per
// column or row. Spots (galactic longitude and latitude, and their widths in each, in degrees):
// the bulge; the Sagittarius and Scutum star clouds; the Coalsack and the Ophiuchus and Taurus
// dust.
const MW_SPOT=[[0, -1, 10, 8], [2, -4.5, 3, 2.5], [27, -2.5, 2.5, 2], [301, -1, 2.0, 2.0], [354, 16, 6, 5], [172, -15, 6, 5]];
// The young stars' brightest stretches (galactic longitude, width, weight, in degrees): Cygnus,
// Carina, Crux and Centaurus, Norma, Scutum, Cassiopeia and Perseus, Monoceros and Orion, Vela.
const MW_YOUNG=[[80, 12, 1.0], [287, 8, 1.0], [305, 10, 0.8], [330, 10, 0.6], [28, 8, 0.6], [120, 20, 0.5], [205, 20, 0.4], [263, 6, 0.6]];
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
// dust's strength, the young stars' share in the plane, each spot's longitude factor, and each
// noise octave's two columns of cells (hashed) and the weight across them.
function mwColumn(l){
  const dl=c=>((l-c+540)%360)-180, hx=new Int32Array(MW_OCT.length*2), ux=new Float64Array(MW_OCT.length);
  MW_OCT.forEach(([cell], k)=>{
    const P=Math.round(360/cell), x=(l+180)/cell, ix=Math.floor(x), fx=x-ix, w=i=>((i%P)+P)%P;
    hx[2*k]=Math.imul(w(ix), 374761393); hx[2*k+1]=Math.imul(w(ix+1), 374761393); ux[k]=fx*fx*(3-2*fx);
  });
  const A=0.15+1.0*mwGs(dl(0), 24)+0.6*mwGs(dl(27), 7)+1.6*mwGs(dl(76), 13)+0.3*mwGs(dl(130), 30)
    +0.9*mwGs(dl(287), 13)+0.8*mwGs(dl(310), 15)+0.6*mwGs(dl(338), 11);
  const young=0.12+0.45*MW_YOUNG.reduce((s, [lc, w, k])=>s+k*mwGs(dl(lc), w), 0);
  return {A, young, h:5.0+4.0*mwGs(dl(0), 35), rift:1.2*Math.exp(-Math.pow(dl(38)/42, 4)), dust:0.2+0.8*mwGs(dl(35), 50),
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
// The light there (relative), with the young stars' share of it and the dust's tau left in MW_PX.
const MW_PX={young:0, tau:0};
function mwSurface(C, R){
  const b=R.b, bulge=mwSpot(C, R, 0);
  let I=C.A*Math.exp(-Math.abs(b)/C.h)*(0.45+1.1*mwFbm(C, R, 0));
  I+=0.8*bulge*(0.7+0.6*mwFbm(C, R, 1));
  I+=0.5*mwSpot(C, R, 1)+0.3*mwSpot(C, R, 2);
  let tau=C.dust*Math.exp(-Math.abs(b-C.rift)/2.0)*(0.35+1.3*mwFbm(C, R, 2));
  tau+=1.3*mwSpot(C, R, 3)+0.9*mwSpot(C, R, 4)*mwFbm(C, R, 3)*2+0.5*mwSpot(C, R, 5)*mwFbm(C, R, 4)*2;
  MW_PX.young=Math.min(0.85, 0.05+C.young*Math.exp(-Math.abs(b)/2.5)*(0.3+1.4*mwFbm(C, R, 5))*(1-0.9*Math.min(1, bulge)));
  MW_PX.tau=tau;
  return I*Math.exp(-tau);
}
// Linear sRGB of unit luminance for starlight with young share y under dust tau (spMWAt), on a
// grid of MW_CY by MW_CT up to tau MW_TMAX, made once.
const MW_CY=11, MW_CT=25, MW_TMAX=6;
let mwColTab=null;
function mwColour(y, tau, out){
  if(!mwColTab){
    mwColTab=new Float32Array(MW_CY*MW_CT*3);
    for(let a=0;a<MW_CY;a++) for(let t=0;t<MW_CT;t++) mwColTab.set(spRGB(spMWAt(a/(MW_CY-1), t/(MW_CT-1)*MW_TMAX).S), (a*MW_CT+t)*3);
  }
  const fa=Math.max(0, Math.min(1, y))*(MW_CY-1), ft=Math.max(0, Math.min(MW_TMAX, tau))/MW_TMAX*(MW_CT-1);
  const a=Math.min(MW_CY-2, Math.floor(fa)), t=Math.min(MW_CT-2, Math.floor(ft)), u=fa-a, v=ft-t;
  for(let q=0;q<3;q++){
    const T=(i, k)=>mwColTab[((a+i)*MW_CT+t+k)*3+q];
    out[q]=(T(0, 0)*(1-v)+T(0, 1)*v)*(1-u)+(T(1, 0)*(1-v)+T(1, 1)*v)*u;
  }
  return out;
}
function buildMilkyWay(){
  if(mwMap) return mwMap;
  const n=MW_W*MW_H, m=new Float32Array(n), age=new Float32Array(n*2), rgb=new Float32Array(n*3), c=[0, 0, 0];
  const cols=Array.from({length:MW_W}, (_, i)=>mwColumn(-180+(i+0.5)/MW_W*360));
  let peak=0;
  for(let j=0;j<MW_H;j++){
    const R=mwRow(-MW_BMAX+(j+0.5)/MW_H*2*MW_BMAX);
    for(let i=0;i<MW_W;i++){ const k=j*MW_W+i, v=mwSurface(cols[i], R); m[k]=v; age[2*k]=MW_PX.young; age[2*k+1]=MW_PX.tau; if(v>peak) peak=v; }
  }
  for(let k=0;k<n;k++){
    m[k]*=MW_PEAK/peak; mwColour(age[2*k], age[2*k+1], c);
    rgb[3*k]=m[k]*c[0]; rgb[3*k+1]=m[k]*c[1]; rgb[3*k+2]=m[k]*c[2];
  }
  mwAge=age; mwRGB=rgb;
  return mwMap=m;
}
// The map at galactic longitude l and latitude b (degrees), bilinear: its V surface brightness, and
// into rgb (if given) its light in linear sRGB and into age (if given) its young share and tau.
function mwSample(l, b, rgb, age){
  if(!mwMap || Math.abs(b)>=MW_BMAX){ if(rgb) rgb[0]=rgb[1]=rgb[2]=0; if(age) age[0]=age[1]=0; return 0; }
  const x=((l+180)/360*MW_W-0.5+MW_W)%MW_W, y=Math.max(0, Math.min(MW_H-1.001, (b+MW_BMAX)/(2*MW_BMAX)*MW_H-0.5));
  const i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j, i1=(i+1)%MW_W;
  const w00=(1-fx)*(1-fy), w10=fx*(1-fy), w01=(1-fx)*fy, w11=fx*fy, k00=j*MW_W+i, k10=j*MW_W+i1, k01=k00+MW_W, k11=k10+MW_W;
  if(rgb) for(let q=0;q<3;q++) rgb[q]=mwRGB[3*k00+q]*w00+mwRGB[3*k10+q]*w10+mwRGB[3*k01+q]*w01+mwRGB[3*k11+q]*w11;
  if(age) for(let q=0;q<2;q++) age[q]=mwAge[2*k00+q]*w00+mwAge[2*k10+q]*w10+mwAge[2*k01+q]*w01+mwAge[2*k11+q]*w11;
  return mwMap[k00]*w00+mwMap[k10]*w10+mwMap[k01]*w01+mwMap[k11]*w11;
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
// Brightness (cd/m²) of the Milky Way seen in horizon direction d, before the air; into age (if
// given) the young stars' share of it and the dust's tau.
function mwAt(basis, d, age){
  const x=vdot(d, basis[0]), y=vdot(d, basis[1]), z=vdot(d, basis[2]);
  return mwSample(Math.atan2(y, x)*180/Math.PI, Math.asin(Math.max(-1, Math.min(1, z)))*180/Math.PI-basis.db, null, age);
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
