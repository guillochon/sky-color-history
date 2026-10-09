/* ---------- the Moon's face through time ---------- */
// Ages (Ma) of the epochs whose Moon looked different from today's.
const MOON_MA={kpg66:66, carbon30:300, ordovician466:466, snowball07:700, proterozoic22:2200,
  archean27thin:2700, archean27:2700, archean27vthick:2700, archean38:3800, hadean40:4000, hadean44:4400};
// The dark maria are basalt that flooded the great basins from about 3.9 Ga, most of it by 3.3 Ga
// (Hiesinger et al. 2011, GSA Special Paper 477): before then the near side was bright highland
// crust from limb to limb. maria is the share of today's darkening, taken as rising evenly over
// those 600 Myr. Tycho is 108 Myr old (Apollo 17 samples of its ray; Arvidson et al. 1976), so its
// rays, the brightest on the full Moon, are missing before it.
function moonFace(key){
  const ma=MOON_MA[key]||0;
  return {maria:Math.max(0, Math.min(1, (3900-ma)/600)), tycho:ma<108};
}
// The photograph remade for a face, kept per face. Sizes are in the photograph's pixels (1024
// across). A pixel's brightness is pulled to that of the highlands (MOON_HL, the 85th percentile
// of the photograph's brightness 20 pixels across) at the scale of a few pixels, which floods the
// maria with highland and keeps the small craters. Tycho's rays are pulled down to the ground
// around them, strongest near the crater and fading 400 pixels out, and the crater itself is
// covered with highland from 100 pixels east of it. The wide averages are worked on a grid four
// pixels to the cell.
const MOON_HL=0.755, moonFaces=new Map();
function moonSurface(key){
  const f=moonFace(key), id=f.maria.toFixed(2)+'|'+f.tycho;
  if(f.maria===1&&f.tycho||!moonReady) return moonImg;
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
  if(f.maria<1){
    // The flooded basins also take the highlands' warmer, greyer colour.
    const Bs=up(blur(Lc, 6)), Bc=up(blur(Lc, 20)), e=1-f.maria;
    for(let p=0;p<N;p++){
      scale(p, Math.pow(Math.max(0.8, Math.min(3, MOON_HL/Math.max(Bs[p], 1e-3))), e));
      const k=0.8*e*Math.max(0, Math.min(1, (MOON_HL-Bc[p])/(MOON_HL-0.4)));
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
// Mare volcanism, from about 3.9 to 3.1 Ga: fissures feeding the flood basalts fountained lava at
// about 1,400 K, as bright per square kilometre as the sunlit Moon and far redder. A few to a
// hundred square kilometres of it glowing at once is a point of magnitude +4 to −1 from 40 Earth
// radii (the page draws +3 to −1, as fainter ones are lost in the moonlit sky beside the Moon), on the night side a red star on the Moon. Each eruption lasted months; years without one
// were common, so this is a sky with eruptions under way: one to three each lunation, at mare
// sites, changing at full Moon when the night side is out of sight.
const LAVA_SITES=[[-0.77,-0.19],[-0.55,0.16],[0.58,-0.05],[-0.38,-0.38],[-0.81,0.09],[-0.20,0.25],[-0.19,-0.48],[0.33,-0.48],[0.83,-0.02],
  [0.16,-0.23],[-0.50,-0.56],[-0.53,0.42],[0.55,-0.27],[-0.16,-0.09],[-0.31,-0.69],[0.34,-0.11],[-0.69,-0.45],[-0.56,-0.27]];
function lunarLava(key){
  const ma=MOON_MA[key]||0;
  if(ma<3100||ma>3900) return [];
  const k=Math.floor((astroDay()-DN_NEW0)/synodic()+0.5), rnd=mulberry32(metHash(key+'|lava|'+k)), out=[];
  const n=1+Math.floor(rnd()*3), dm=5*Math.log10((MOON_RE[key]||40)/40);
  for(let i=0;i<n;i++){
    const s=LAVA_SITES[Math.floor(rnd()*LAVA_SITES.length)];
    // Within a site the vents wander a little; the brightness is for the Moon at 40 Earth radii.
    out.push({id:key+'|lava|'+k+'|'+i, x:s[0]+0.06*(rnd()-0.5), y:s[1]+0.06*(rnd()-0.5), mag:3-4*rnd()+dm, temp:1300+250*rnd(), lava:true});
  }
  return out;
}
