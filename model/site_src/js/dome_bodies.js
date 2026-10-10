// Star places use this year for proper motion and precession, instead of the date picker's.
const STAR_YEAR={volcanic:1815};
// Each epoch's star places for the year last shown, and how each star is drawn: these change
// only with the epoch and the year, so a render redoes only the hour angle.
const STAR_PLACES={};
function starPlaces(epochKey, year){
  const list=starsFor(epochKey), P=STAR_PLACES[epochKey];
  if(P && P.year===year && P.list===list) return P;
  const n=Math.min(list.length, STAR_N), ra=new Float64Array(n), dec=new Float64Array(n), show=[];
  for(let i=0;i<n;i++){ const place=starMeanPlace(list[i], epochKey, year); ra[i]=place.ra; dec[i]=place.dec; show.push(starDisplay(list[i])); }
  return STAR_PLACES[epochKey]={year, list, n, ra, dec, show};
}
function placeStars(lat){
  const epochKey=EP[dIdx].key;
  const year=STAR_YEAR[epochKey]||pageDate()[0];
  const LST=localSidereal(), P=starPlaces(epochKey, year), list=P.list;
  const tex=new Float32Array(STAR_MAP_W*8), marks=[], up=[], bodies=[];
  for(let i=0;i<P.n;i++){
    const star=list[i];
    const p=raDecAltaz(lat, P.ra[i], P.dec[i], LST), show=P.show[i], o=i*4;
    if(!(p.alt>0)) continue;
    const dir=horizDir(p.az, p.alt);
    tex[o]=dir[0]; tex[o+1]=dir[1]; tex[o+2]=dir[2]; tex[o+3]=show.px;
    const c=STAR_MAP_W*4+o; tex[c]=show.rgb[0]; tex[c+1]=show.rgb[1]; tex[c+2]=show.rgb[2]; tex[c+3]=star[2];
    marks.push({az:p.az, el:p.alt, px:show.px, rgb:show.rgb, mag:star[2], star, ra:P.ra[i], dec:P.dec[i]});
    up.push({i, x:dir[0], y:dir[1], z:dir[2]});
  }
  placePlanets(lat, marks, bodies, epochKey, year, LST);
  if(epochKey==='y2100') placeSatellites(lat, tex, marks, up);
  // The cube cells are for the VR sky shader only.
  const bins=vrOn?starBinsFor(up):{info:null, idx:null, count:0};
  return {tex, marks, bodies, bins:bins.info, idx:bins.idx, idxCount:bins.count};
}
// Sky luminance ratio at (el, az), interpolated in log from the dome grid (skyNow.rgrid, rows
// of DOME_NA+1 from the zenith down). Each render makes a new grid, and its logs are kept with it.
const skyLogs=new WeakMap();
function skyRAt(rgrid, el, az){
  const NR=DOME_NR, NA=DOME_NA, NC=NA+1, vz=Math.max(0,Math.min(90,90-el));
  let ang=az%360; if(ang<0) ang+=360;
  let L=skyLogs.get(rgrid); if(!L){ L=Float64Array.from(rgrid, v=>Math.log(v)); skyLogs.set(rgrid, L); }
  const fr=vz/90*NR, ir=Math.min(NR-1,Math.floor(fr)), tr=fr-ir, fa=ang/360*NA, ia=Math.min(NA-1,Math.floor(fa)), ta=fa-ia, c=ir*NC+ia;
  const a=L[c]*(1-ta)+L[c+1]*ta, b=L[c+NC]*(1-ta)+L[c+NC+1]*ta;
  return Math.exp(a*(1-tr)+b*tr);
}
// A star shows in full when 0.8 mag brighter than the naked-eye limit for the sky around it,
// fading out to 0.2 mag fainter than the limit.
function starVisible(mag, L){ const lim=nakedEyeLimit(L); return 1-smooth01(lim-0.8, lim+0.2, mag); }
function drawStarsOnDome(marks, rgrid, rCd, key, moon){
  const {cx, cy, R, z}=domeView();
  // The Moon is added onto what is drawn under it (drawMoonOnDome), so what it covers is left out
  // here: its drawn disk, enlarged like the Sun's, hides stars and planets a few degrees from it.
  const mUp=moon&&moonReady&&moon.el>=-moon.radDeg, mrr=mUp?R*(90-moon.el)/90:0, ma=mUp?moon.az*Math.PI/180:0;
  const mx=cx+mrr*Math.sin(ma), my=cy-mrr*Math.cos(ma), mrad=mUp?moon.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG):0;
  dctx.save();
  dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
  dctx.globalCompositeOperation='lighter';
  const disks=[];
  for(const s of marks){
    if(markHidden(s)) continue;
    // Through the air a star is fainter, so less of it shows, and smaller and dimmer when it does.
    const m0=s.mag==null?0:s.mag, m=starThroughAir(m0, s.el, key), dim=Math.pow(10, -0.2*(m-m0));
    const vis=starVisible(m-(m0-markMag(s)), skyRAt(rgrid, s.el, s.az)*rCd), night=vis*dim;
    if(night<0.03) continue;
    const rr=R*(90-s.el)/90, a=s.az*Math.PI/180, x=cx+rr*Math.sin(a), y=cy-rr*Math.cos(a);
    if(mUp&&(x-mx)**2+(y-my)**2<mrad*mrad) continue;
    // A planet drawn more than a pixel or two across is its lit disk (after the points), not a point.
    const rPx=s.body&&s.kind!=null?s.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG):0, diskK=smooth01(1, 3, rPx);
    if(diskK>0) disks.push([s.body, x, y, rPx, night*diskK]);
    if(diskK>=1) continue;
    const col=s.rgb.map(c=>Math.round(Math.min(255, c*night*(1-diskK)*255)));
    if(s.px<2.2){
      dctx.fillStyle='rgb('+col[0]+','+col[1]+','+col[2]+')';
      dctx.beginPath(); dctx.arc(x,y,Math.max(0.6, s.px*0.55),0,Math.PI*2); dctx.fill();
      continue;
    }
    const g=dctx.createRadialGradient(x,y,0,x,y,s.px);
    g.addColorStop(0, 'rgb('+col[0]+','+col[1]+','+col[2]+')');
    g.addColorStop(0.35, 'rgba('+col[0]+','+col[1]+','+col[2]+',0.45)');
    g.addColorStop(1, 'rgba('+col[0]+','+col[1]+','+col[2]+',0)');
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(x,y,s.px,0,Math.PI*2); dctx.fill();
  }
  dctx.restore();
  for(const d of disks) drawBodyOnDome(...d);
}
const vdot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const vscale=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const vadd=(a,b,c)=>[a[0]+b[0]+c[0],a[1]+b[1]+c[1],a[2]+b[2]+c[2]];
const vcross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
function vnorm(a){ const m=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/m,a[1]/m,a[2]/m]; }
// Geminga's supernova, at the birthplace Pellizza et al. (2005) trace the pulsar back to:
// Galactic l 198°, b -12°, which is J2000 RA 85.25°, Dec +7.44°, in Orion. Peak V about -10.9:
// a Type II-P supernova (M -16.75, Richardson et al. 2014) at 147 pc, the geometric middle
// of their 90-240 pc. Early on a II-P is hot, so it is drawn blue-white.
//
// The supernova that ejected the runaway zeta Oph and PSR B1706-16, 1.78 Myr ago at 107 pc
// (Neuhauser et al. 2019). Peak V about -11.6 for a Type II-P at 107 pc. Their abstract gives no
// position; RA 242.4, Dec -21.0 is where a straight-line trace of zeta Oph's Hipparcos motion
// (RV -9 to -15 km/s) puts it 1.78 Myr ago, in Scorpius about 7 degrees NW of Antares.
const SUPERNOVA={
  geminga:{ra:85.25, dec:7.44, mag:-10.9, rgb:[0.86, 0.92, 1.0], name:'Geminga’s supernova'},
  zetaoph:{ra:242.4, dec:-21.0, mag:-11.6, rgb:[0.86, 0.92, 1.0], name:'The supernova that launched ζ Oph'},
};
function supernovaPlace(lat){
  const sn=SUPERNOVA[EP[dIdx].key];
  if(!sn) return null;
  const year=pageDate()[0], LST=localSidereal();
  const place=starMeanPlace([sn.ra, sn.dec, sn.mag, 0, 0, 0], EP[dIdx].key, year);
  const p=raDecAltaz(lat, place.ra, place.dec, LST);
  return {az:p.az, el:p.alt, mag:sn.mag, rgb:sn.rgb, name:sn.name};
}
// A point too bright to resolve: a white core and a glare halo, bright enough to show by day.
function drawSupernovaOnDome(sn){
  if(!sn||sn.el<0) return;
  const {cx, cy, R}=domeView();
  const rr=R*(90-sn.el)/90, a=sn.az*Math.PI/180, x=cx+rr*Math.sin(a), y=cy-rr*Math.cos(a);
  const fade=smooth01(0, 4, sn.el), c=sn.rgb.map(v=>Math.round(v*255)).join(',');
  dctx.save(); dctx.beginPath(); dctx.arc(cx,cy,R,0,Math.PI*2); dctx.clip();
  dctx.globalCompositeOperation='lighter';
  const g=dctx.createRadialGradient(x,y,0,x,y,26);
  g.addColorStop(0, `rgba(${c},${0.9*fade})`); g.addColorStop(0.12, `rgba(${c},${0.45*fade})`); g.addColorStop(1, `rgba(${c},0)`);
  dctx.fillStyle=g; dctx.beginPath(); dctx.arc(x,y,26,0,Math.PI*2); dctx.fill();
  dctx.fillStyle=`rgba(255,255,255,${fade})`; dctx.beginPath(); dctx.arc(x,y,2.6,0,Math.PI*2); dctx.fill();
  dctx.restore();
}
function horizDir(az,el){ const a=az*Math.PI/180, e=el*Math.PI/180, c=Math.cos(e); return [Math.sin(a)*c, Math.cos(a)*c, Math.sin(e)]; }
function smooth01(e0,e1,x){ const t=Math.max(0,Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t); }
function moonLit(moon, sunAz, sunEl){ return (1-vdot(horizDir(moon.az,moon.el), horizDir(sunAz,sunEl)))/2; }
function moonSkyScale(moon, sunAz, sunEl){
  const d=vdot(horizDir(moon.az, moon.el), horizDir(sunAz, sunEl));
  const a=Math.acos(Math.max(-1, Math.min(1, -d)))*180/Math.PI;
  const phase=Math.pow(10, -0.4*(0.026*a + 4e-9*a*a*a*a));
  const opp=a<7 ? 1+MOON_OPP*(1-a/7) : 1;
  const re=MOON_RE[EP[dIdx].key]||MOON_RE_NOW;
  return MOON_SUN_FULL*phase*opp*(MOON_RE_NOW/re)*(MOON_RE_NOW/re);
}
// Fraction of a solar disk of radius rSun covered by a lunar disk of radius rMoon.
// Separation and radii are in the same units. A true overlap is a subset of an
// enlarged one, since both radii are scaled by the same factor.
function sunCovered(sep, rSun, rMoon){
  if(!(rSun>0)) return 0;
  const d=sep, R=rMoon;
  if(d>=rSun+R) return 0;
  if(d<=Math.abs(R-rSun)) return R>=rSun?1:(R*R)/(rSun*rSun);
  const r2=rSun*rSun, R2=R*R, d2=d*d;
  const ang=Math.acos(Math.min(1, Math.max(-1, (d2+r2-R2)/(2*d*rSun))));
  const bng=Math.acos(Math.min(1, Math.max(-1, (d2+R2-r2)/(2*d*R))));
  const area=r2*ang+R2*bng-0.5*Math.sqrt(Math.max(0,(-d+rSun+R)*(d+rSun-R)*(d-rSun+R)*(d+rSun+R)));
  return Math.min(1, Math.max(0, area/(Math.PI*r2)));
}
// Whether the Sun is up at any point of an eclipse from a to b (ms), sampled ninefold.
function sunUpDuring(a, b){
  if(!(b>a)) return false;
  for(let n=0;n<=8;n++) if(eclipseAt(a+(b-a)*n/8).el>0) return true;
  return false;
}
// How far the enlarged disks are from the eclipse condition at time ms: negative while they
// overlap, or with central set while one disk lies wholly inside the other.
function eclipseGap(ms, central, scale=DISK_SCALE){
  const e=eclipseAt(ms);
  return e.sep-scale*(central?Math.abs(e.rM-e.rS):e.rS+e.rM);
}
// The first eclipse starting after afterMs with the Sun up, searched new Moon by new Moon:
// any overlap of the disks as drawn in VR, or with central set a total or annular phase.
// Returns {start, end, type} or null.
function findNextEclipse(afterMs, central){
  const msOf=d=>(d-DN_UNIX)*86400000, gr=(Math.sqrt(5)-1)/2, f=ms=>eclipseGap(ms, central);
  let k=Math.round((dayOfMs(afterMs)-DN_NEW0)/synodic())-1;
  const kEnd=k+Math.ceil((central?40:8)*TROPICAL_YEAR/synodic())+2;
  for(;k<=kEnd;k++){
    const t0=msOf(lunation(k).t0), span=0.3*86400000;
    let a=t0-span, b=t0+span, c=b-gr*(b-a), e=a+gr*(b-a), fc=f(c), fe=f(e);
    for(let i=0;i<30;i++){
      if(fc<fe){ b=e; e=c; fe=fc; c=b-gr*(b-a); fc=f(c); }
      else { a=c; c=e; fc=fe; e=a+gr*(b-a); fe=f(e); }
    }
    const mid=(a+b)/2;
    if(f(mid)>=0 || f(t0-span)<0 || f(t0+span)<0) continue;
    let lo=t0-span, hi=mid;
    for(let i=0;i<24;i++){ const m=(lo+hi)/2; if(f(m)<0) hi=m; else lo=m; }
    const start=hi; lo=mid; hi=t0+span;
    for(let i=0;i<24;i++){ const m=(lo+hi)/2; if(f(m)<0) lo=m; else hi=m; }
    const end=lo;
    if(start<=afterMs || !sunUpDuring(start, end)) continue;
    const g=eclipseAt(mid);
    return {start, end, type:central?(g.rM>g.rS?'total':'annular'):'partial'};
  }
  return null;
}
// When the current total or annular phase ends, for the time left in the readouts.
function centralEnd(ms, scale){
  if(eclipseGap(ms, true, scale)>=0) return null;
  let lo=ms, hi=ms+0.3*86400000;
  if(eclipseGap(hi, true, scale)<0) return null;
  for(let i=0;i<24;i++){ const m=(lo+hi)/2; if(eclipseGap(m, true, scale)<0) lo=m; else hi=m; }
  return lo;
}
const moonImg=new Image(), moonSprite=document.createElement('canvas');
moonSprite.width=moonSprite.height=96;
let moonReady=false;
function moonBasis(moon){
  const md=horizDir(moon.az, moon.el), lat=LATDEG[dLat]*Math.PI/180, ncp=[0, Math.cos(lat), Math.sin(lat)];
  let north=vadd(ncp, vscale(md, -vdot(ncp,md)), [0,0,0]);
  if(vdot(north,north)<1e-8) north=[1,0,0];
  north=vnorm(north);
  return {md, north, east:vnorm(vcross(north, md))};
}
function paintMoonSprite(moon, sunAz, sunEl){
  const sctx=moonSprite.getContext('2d',{willReadFrequently:true});
  sctx.clearRect(0,0,96,96); sctx.drawImage(moonSurface(EP[dIdx].key),0,0,96,96);
  const img=sctx.getImageData(0,0,96,96), px=img.data, b=moonBasis(moon), sd=horizDir(sunAz,sunEl);
  const E=b.east, N=b.north, M=b.md;
  for(let j=0;j<96;j++) for(let i=0;i<96;i++){
    const u=(i+0.5)/96*2-1, v=1-(j+0.5)/96*2, o=(j*96+i)*4;
    if(u*u+v*v>1){ px[o+3]=0; continue; }
    // The surface normal there, facing us, and its light from the Sun.
    const w=-Math.sqrt(1-u*u-v*v), x=E[0]*u+N[0]*v+M[0]*w, y=E[1]*u+N[1]*v+M[1]*w, z=E[2]*u+N[2]*v+M[2]*w, m=Math.hypot(x,y,z)||1;
    const lit=smooth01(-0.02,0.05, x/m*sd[0]+y/m*sd[1]+z/m*sd[2]);
    px[o+3]=Math.round(lit*255);
  }
  sctx.putImageData(img,0,0);
}
function drawMoonOnDome(moon, sunAz, sunEl, lu){
  if(!moonReady||moon.el<-moon.radDeg) return;
  const W=dome.width, H=dome.height, {cx, cy, R, z}=domeView();
  const rr=R*(90-moon.el)/90, a=moon.az*Math.PI/180, mx=cx+rr*Math.sin(a), my=cy-rr*Math.cos(a);
  const rad=moon.radDeg*(DOME_DISK*z/SUN_RADIUS_DEG);
  const b=moonBasis(moon), step=vnorm(vadd(b.md, vscale(b.north,0.02), [0,0,0]));
  const el2=Math.asin(Math.max(-1,Math.min(1,step[2])))*180/Math.PI;
  let az2=Math.atan2(step[0], step[1])*180/Math.PI; if(az2<0) az2+=360;
  const rr2=R*(90-el2)/90, p1x=cx+rr2*Math.sin(az2*Math.PI/180), p1y=cy-rr2*Math.cos(az2*Math.PI/180);
  paintMoonSprite(moon, sunAz, sunEl);
  const ef=[1, 1, 1];
  // Same veil as the VR sky: extinct the Moon (blue first) and add it onto the
  // air already drawn, so a bright sky hides the photograph.
  const spr=moonSprite.getContext('2d',{willReadFrequently:true}).getImageData(0,0,96,96).data;
  const ang=Math.atan2(p1x-mx, -(p1y-my)), ca=Math.cos(ang), sa=Math.sin(ang);
  const x0=Math.max(0,Math.floor(mx-rad-1)), y0=Math.max(0,Math.floor(my-rad-1));
  const x1=Math.min(W-1,Math.ceil(mx+rad+1)), y1=Math.min(H-1,Math.ceil(my+rad+1));
  if(x1<x0||y1<y0) return;
  const bw=x1-x0+1, bh=y1-y0+1, img=dctx.getImageData(x0,y0,bw,bh), px=img.data;
  // The sprite, bilinear, into s (zero outside it).
  const s=new Float64Array(4), at=(i,j,k)=>(i<0||j<0||i>95||j>95)?0:spr[(j*96+i)*4+k];
  const samp=(u,v)=>{
    const x=(u*0.5+0.5)*96-0.5, y=((1-v)*0.5)*96-0.5, i0=Math.floor(x), j0=Math.floor(y), tx=x-i0, ty=y-j0;
    for(let k=0;k<4;k++){
      const a=at(i0,j0,k)*(1-tx)+at(i0+1,j0,k)*tx, b=at(i0,j0+1,k)*(1-tx)+at(i0+1,j0+1,k)*tx;
      s[k]=a*(1-ty)+b*ty;
    }
    return s;
  };
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const dx=x-cx, dy=y-cy; if(dx*dx+dy*dy>R*R) continue;
    const qx=x-mx, qy=y-my, lx=qx*ca+qy*sa, ly=-qx*sa+qy*ca, u=lx/rad, v=-ly/rad;
    if(u*u+v*v>1) continue;
    samp(u,v); const lit=s[3]/255, wlit=0.06+0.94*lit;
    // In the Earth's shadow, its light (in linear terms) on the photograph's.
    if(lu){ lunarFactor(lu, u, v, ef); for(let q=0;q<3;q++) s[q]=255*Math.pow(Math.pow(s[q]/255, 2.2)*ef[q], 1/2.2); }
    const el=90*(1-Math.hypot(dx,dy)/R), mu=Math.max(Math.sin(Math.max(el,0)*Math.PI/180), 0.04);
    const Tr=Math.exp(-0.12/mu), Tg=Math.exp(-0.22/mu), Tb=Math.exp(-0.48/mu);
    const o=((y-y0)*bw+(x-x0))*4;
    const skyY=(0.2126*px[o]+0.7152*px[o+1]+0.0722*px[o+2])/255;
    const veil=1-smooth01(0, 1.15, skyY);
    px[o]=Math.min(255, px[o]+s[0]/255*wlit*Tr*veil*255);
    px[o+1]=Math.min(255, px[o+1]+s[1]/255*wlit*Tg*veil*255);
    px[o+2]=Math.min(255, px[o+2]+s[2]/255*wlit*Tb*veil*255);
  }
  dctx.putImageData(img,x0,y0);
}
// The epoch's face of the Moon (moon_surface.js) into the walk-around view's texture, when it
// has changed. True if it did.
function syncMoonTex(){
  if(!vrGL||!moonReady) return false;
  const src=moonSurface(EP[dIdx].key); if(vrGL.moonSrc===src) return false;
  const gl=vrGL.gl; gl.bindTexture(gl.TEXTURE_2D, vrGL.moonTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  vrGL.moonSrc=src; return true;
}
function uploadMoon(){ if(syncMoonTex()&&vrOn) paintVR(); }
moonImg.onload=()=>{ moonReady=true; uploadMoon(); renderDay(); warmMoonFaces(); };
