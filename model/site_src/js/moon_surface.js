/* ---------- the Moon's face through time ---------- */
// Ages (Ma) of the epochs whose Moon looked different from today's.
const MOON_MA={kpg66:66, carbon30:300, ordovician466:466, snowball07:700, proterozoic22:2200,
  archean27thin:2700, archean27:2700, archean27vthick:2700, archean38:3800, hadean40:4000, hadean44:4400};
// The dark maria are basalt that flooded the great basins from about 3.9 Ga, most of it by 3.3 Ga
// (Hiesinger et al. 2011, GSA Special Paper 477): before then the near side was bright highland
// crust from limb to limb. They did not darken together. Each mare here has a date its floor
// began to go dark: a little before its oldest dated basalt, from the Apollo and Luna samples
// (Apollo 11 low-K basalts to 3.88 Ga, Apollo 17 3.7–3.8 Ga, Luna 16 and 24 3.3–3.4 Ga) and the
// crater-count ages of its oldest surface units, since the first flows are buried under later
// ones. Its floor then darkens over 150 Myr, as flood basalts spread fast. So at 3.8 Ga
// Tranquillitatis is two-thirds dark and Serenitatis and Nectaris a third, while Imbrium, only
// 50–100 Myr old, is still a bright basin and Procellarum has not begun. [name, selenographic
// latitude and longitude, radius (degrees), onset (Ga)]; dark ground nearer none is Procellarum's.
const MARIA=[['Tranquillitatis', 8.5, 31.4, 13, 3.90], ['Serenitatis', 28, 17.5, 10, 3.85], ['Nectaris', -15.2, 35.5, 5, 3.85],
  ['Fecunditatis', -7.8, 51.3, 10, 3.80], ['Crisium', 17, 59.1, 9, 3.80], ['Australe', -38.9, 93, 10, 3.90], ['Marginis', 13.3, 86.1, 6, 3.80],
  ['Smythii', 1.3, 87.5, 6, 3.85], ['Vaporum', 13.3, 3.6, 4, 3.75], ['Nubium', -21.3, -16.6, 11, 3.75], ['Humorum', -24.4, -38.6, 7, 3.75],
  ['Cognitum', -10, -23, 5, 3.70], ['Imbrium', 32.8, -15.6, 18, 3.70], ['Frigoris', 56, 1.4, 10, 3.70], ['Insularum', 7.5, -30.9, 8, 3.65],
  ['Procellarum', 18, -57, 20, 3.60]];
const MARE_RAMP=150, MARE_DEFAULT=MARIA.length-1;
function mareVec(lat, lon){ return [cosd(lat)*sind(lon), sind(lat), cosd(lat)*cosd(lon)]; }
// Share of today's darkening of each mare at ma (Ma).
function mareShares(ma){ return MARIA.map(m=>Math.max(0, Math.min(1, (m[4]*1000-ma)/MARE_RAMP))); }
// Tycho is 108 Myr old (Apollo 17 samples of its ray; Arvidson et al. 1976), so its rays, the
// brightest on the full Moon, are missing before it.
function moonFace(key){
  const ma=MOON_MA[key]||0;
  return {ma, shares:mareShares(ma), tycho:ma<108};
}
// The photograph's disk: centre and radius in its pixels (1024 across). North is down in it, and
// the texture is flipped when drawn.
const MOON_PHOTO_R=0.98;
// The photograph remade for a face, kept per face. Sizes are in the photograph's pixels (1024
// across). A pixel's brightness is pulled to that of the highlands (MOON_HL, the 85th percentile
// of the photograph's brightness 20 pixels across) at the scale of a few pixels, which floods the
// maria with highland and keeps the small craters. Tycho's rays are pulled down to the ground
// around them, strongest near the crater and fading 400 pixels out, and the crater itself is
// covered with highland from 100 pixels east of it. The wide averages are worked on a grid four
// pixels to the cell.
const MOON_HL=0.755, moonFaces=new Map();
function moonSurface(key){
  const f=moonFace(key), id=f.shares.map(v=>v.toFixed(2)).join(',')+'|'+f.tycho, dated=f.shares.some(v=>v<1);
  if(!dated&&f.tycho||!moonReady) return moonImg;
  let c=moonFaces.get(id); if(c) return c;
  const W=moonImg.naturalWidth, H=moonImg.naturalHeight, N=W*H, sc=W/1024, q=4, w=Math.ceil(W/q), h=Math.ceil(H/q), n=w*h;
  c=document.createElement('canvas'); c.width=W; c.height=H;
  const ctx=c.getContext('2d', {willReadFrequently:true}); ctx.drawImage(moonImg, 0, 0);
  const img=ctx.getImageData(0, 0, W, H), px=img.data;
  const rgb=new Float32Array(N*3), L=new Float32Array(N), keep=new Uint8Array(N), cell=new Int32Array(N);
  for(let j=0, p=0;j<H;j++) for(let i=0;i<W;i++, p++){
    const r=px[p*4]/255, g=px[p*4+1]/255, b=px[p*4+2]/255;
    rgb[p*3]=r; rgb[p*3+1]=g; rgb[p*3+2]=b; L[p]=0.2126*r+0.7152*g+0.0722*b;
    keep[p]=Math.max(r, g, b)>0.02?1:0; cell[p]=((j/q)|0)*w+((i/q)|0);
  }
  // Box blur of radius r over a gw-wide grid, along rows then columns, the given number of times
  // (three is near a Gaussian).
  const tmp=new Float32Array(N), cs=new Float64Array(W), box=(a, gw, gh, r, times=3)=>{
    for(let k=0;k<times;k++){
      for(let j=0;j<gh;j++){
        const o=j*gw; let s=0;
        for(let i=0;i<r&&i<gw;i++) s+=a[o+i];
        for(let i=0;i<gw;i++){ if(i+r<gw) s+=a[o+i+r]; if(i-r-1>=0) s-=a[o+i-r-1]; tmp[o+i]=s; }
      }
      cs.fill(0);
      for(let j=-r-1;j<gh;j++){
        if(j+r>=0&&j+r<gh){ const o=(j+r)*gw; for(let i=0;i<gw;i++) cs[i]+=tmp[o+i]; }
        if(j-r-1>=0){ const o=(j-r-1)*gw; for(let i=0;i<gw;i++) cs[i]-=tmp[o+i]; }
        if(j>=0){ const o=j*gw; for(let i=0;i<gw;i++) a[o+i]=cs[i]; }
      }
    }
  };
  // On the coarse grid: the disk's share of each cell, the mean of a full-size map over the disk
  // in each cell, a blur that keeps to the disk (off it counts as missing, not as black), and
  // back to full size, bilinear.
  const dl=new Float32Array(n), cnt=new Float32Array(n);
  for(let j=0, p=0;j<H;j++) for(let i=0;i<W;i++, p++){
    const u=(i+0.5)/W*2-1, v=(j+0.5)/H*2-1; cnt[cell[p]]++; if(u*u+v*v<0.97) dl[cell[p]]++;
  }
  for(let k=0;k<n;k++) dl[k]/=cnt[k];
  const coarse=a=>{ const o=new Float32Array(n); for(let p=0;p<N;p++){ o[cell[p]]+=a[p]; } for(let k=0;k<n;k++) o[k]/=cnt[k]; return o; };
  const norms=new Map(), blur=(a, r)=>{
    const rq=Math.max(1, Math.round(r*sc/q));
    let nm=norms.get(rq); if(!nm){ nm=Float32Array.from(dl); box(nm, w, h, rq); norms.set(rq, nm); }
    const o=new Float32Array(n); for(let k=0;k<n;k++) o[k]=a[k]*dl[k];
    box(o, w, h, rq); for(let k=0;k<n;k++) o[k]/=Math.max(nm[k], 1e-9);
    return o;
  };
  const up=a=>{
    const o=new Float32Array(N);
    for(let j=0;j<H;j++){
      const y=Math.max(0, Math.min(h-1.001, (j+0.5)/q-0.5)), j0=y|0, ty=y-j0;
      for(let i=0;i<W;i++){
        const x=Math.max(0, Math.min(w-1.001, (i+0.5)/q-0.5)), i0=x|0, tx=x-i0, b=j0*w+i0;
        o[j*W+i]=(a[b]*(1-tx)+a[b+1]*tx)*(1-ty)+(a[b+w]*(1-tx)+a[b+w+1]*tx)*ty;
      }
    }
    return o;
  };
  const scale=(p, g)=>{ rgb[p*3]*=g; rgb[p*3+1]*=g; rgb[p*3+2]*=g; };
  let Lc=coarse(L);
  if(!f.tycho){
    // The ground around the rays: the wide average, taken again three times with whatever is
    // brighter than it cut down to it. The rays are a few pixels wide, so what is brighter than
    // that ground over five pixels is dimmed to it, and the finer craters keep their contrast.
    let bg=blur(Lc, 25);
    for(let k=0;k<3;k++){ const m=new Float32Array(n); for(let p=0;p<n;p++) m[p]=Math.min(Lc[p], bg[p]); bg=blur(m, 25); }
    const B=up(bg), Bm=Float32Array.from(L); box(Bm, W, H, 2, 2);
    const tx=437*sc, ty=160*sc;
    for(let j=0, p=0;j<H;j++) for(let i=0;i<W;i++, p++){
      const d=Math.hypot(i-tx, j-ty)/sc/420, e=Math.exp(-d*d);
      if(e>1e-3) scale(p, Math.pow(Math.min(1, Math.min(B[p], 0.93*MOON_HL)/Math.max(Bm[p]/625, 1e-3)), e));
    }
    const ox=Math.round(100*sc), oy=Math.round(40*sc), R=Math.ceil(60*sc);
    for(let j=Math.max(0, Math.floor(ty-R));j<Math.min(H-oy, ty+R);j++) for(let i=Math.max(0, Math.floor(tx-R));i<Math.min(W-ox, tx+R);i++){
      const d=Math.hypot(i-tx, j-ty)/sc/26, C=Math.exp(-d*d*d*d), p=j*W+i, o=(j+oy)*W+i+ox;
      for(let k=0;k<3;k++) rgb[p*3+k]+=(rgb[o*3+k]-rgb[p*3+k])*C;
    }
    for(let p=0;p<N;p++) L[p]=0.2126*rgb[p*3]+0.7152*rgb[p*3+1]+0.0722*rgb[p*3+2];
    Lc=coarse(L);
  }
  if(dated){
    // Each cell takes the share of the mare nearest it on the sphere, in units of that mare's
    // radius (Procellarum's beyond 1.6 of them), softened over about 12 pixels. Bright ground is
    // flattened as far as the least-flooded mare is: the rays of today's young craters go too.
    const sh=new Float32Array(n), cv=MARIA.map(m=>mareVec(m[1], m[2])), c0=512*sc, R=512*sc*MOON_PHOTO_R;
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const X=((i+0.5)*q-c0)/R, Y=((j+0.5)*q-c0)/R, Z=Math.sqrt(Math.max(0, 1-X*X-Y*Y));
      let best=1.6, m=MARE_DEFAULT;
      for(let k=0;k<MARIA.length;k++){
        const v=cv[k], d=Math.acos(Math.max(-1, Math.min(1, X*v[0]+Y*v[1]+Z*v[2])))*180/Math.PI/MARIA[k][3];
        if(d<best){ best=d; m=k; }
      }
      sh[j*w+i]=f.shares[m];
    }
    // The flooded basins also take the highlands' warmer, greyer colour.
    const S=up(blur(sh, 12)), Bs=up(blur(Lc, 6)), Bc=up(blur(Lc, 20)), e0=1-Math.min(...f.shares);
    for(let p=0;p<N;p++){
      const g=Math.max(0.8, Math.min(3, MOON_HL/Math.max(Bs[p], 1e-3))), e=g>1?1-S[p]:e0;
      scale(p, Math.pow(g, e));
      const k=0.8*(1-S[p])*Math.max(0, Math.min(1, (MOON_HL-Bc[p])/(MOON_HL-0.4)));
      const y=0.2126*rgb[p*3]+0.7152*rgb[p*3+1]+0.0722*rgb[p*3+2];
      rgb[p*3]+=(1.03*y-rgb[p*3])*k; rgb[p*3+1]+=(y-rgb[p*3+1])*k; rgb[p*3+2]+=(0.95*y-rgb[p*3+2])*k;
    }
  }
  for(let p=0;p<N;p++) for(let k=0;k<3;k++) px[p*4+k]=keep[p]?Math.round(Math.min(1, rgb[p*3+k])*255):0;
  ctx.putImageData(img, 0, 0);
  moonFaces.set(id, c);
  return c;
}
// The older faces are made while the page is idle, so changing epoch does not wait for them.
function warmMoonFaces(){
  const keys=['carbon30', 'archean38', 'hadean44'], next=()=>{ const k=keys.shift(); if(!k) return; moonSurface(k); (window.requestIdleCallback||setTimeout)(next); };
  (window.requestIdleCallback||setTimeout)(next);
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
  const ma=MOON_MA[key]||0, live=MARIA.filter(m=>ma<=m[4]*1000+50&&ma>=m[4]*1000-500);
  if(!live.length) return [];
  const k=Math.floor((astroDay()-DN_NEW0)/synodic()+0.5), rnd=mulberry32(metHash(key+'|lava|'+k)), out=[];
  const n=1+Math.floor(rnd()*3), dm=5*Math.log10((MOON_RE[key]||40)/40), tot=live.reduce((a, m)=>a+m[3]*m[3], 0);
  for(let i=0;i<n;i++){
    let u=rnd()*tot, m=live[0]; for(const c of live){ u-=c[3]*c[3]; if(u<=0){ m=c; break; } }
    // A vent within 0.6 of the mare's radius of its centre, on the near side; the brightness is
    // for the Moon at 40 Earth radii. On the disk (moonBasis east and north), x is K·v₀ and y −K·v₁.
    const a=2*Math.PI*rnd(), r=0.6*m[3]*Math.sqrt(rnd()), v=mareVec(m[1]+r*Math.sin(a), m[2]+r*Math.cos(a)/Math.max(0.2, cosd(m[1])));
    if(v[2]<0.2) continue;
    out.push({id:key+'|lava|'+k+'|'+i, x:MOON_PHOTO_R*v[0], y:-MOON_PHOTO_R*v[1], mag:3-4*rnd()+dm, temp:1300+250*rnd(), lava:true, mare:m[0]});
  }
  return out;
}
