/* ---------- the Moon's face through time ---------- */
// Ages (Ma) of the epochs whose Moon looked different from today's.
const MOON_MA={hadean45:4500, kpg66:66, carbon30:300, ordovician466:466, snowball07:700, proterozoic22:2200,
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
  if(MOON_MOLTEN[key]) return moltenFace();
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
// The newborn Moon, 4.5 Ga, a few million years after the giant impact, still has its magma ocean
// open at the top: rafts of dark quench crust and the first pale anorthosite floating up, broken
// by cracks and lakes of lava at 1,400–1,600 K. Per square kilometre that lava shines about as
// brightly as the sunlit Moon (see lunarLava), so the disk glows orange by day and night alike,
// and the air about it carries a red aureole. The face is made on the sphere, so the rafts crowd
// toward the limb, 512 pixels across; its red excess is the share that glows (moonGlow, drawn
// in the sky shader and drawMoonOnDome).
const MOON_MOLTEN={hadean45:1};
function moonGlow(key){ return MOON_MOLTEN[key]||0; }
let moltenImg=null;
function moltenFace(){
  if(moltenImg) return moltenImg;
  const S=512, c=document.createElement('canvas'); c.width=c.height=S;
  const ctx=c.getContext('2d'), img=ctx.createImageData(S, S), px=img.data;
  const hash=(i, j, k, s)=>{
    let h=Math.imul(i, 374761393)^Math.imul(j, 668265263)^Math.imul(k, 1274126177)^Math.imul(s+1, 461845907);
    h=Math.imul(h^h>>>13, 1274126177); return ((h^h>>>16)>>>0)/4294967296;
  };
  // Value noise and its sum over three octaves (0 to 1), and the cells of a jittered grid: the
  // distances to the nearest two points and the nearest one's hash.
  const vn=(x, y, z, s)=>{
    const i=Math.floor(x), j=Math.floor(y), k=Math.floor(z), u=x-i, v=y-j, w=z-k;
    const a=u*u*(3-2*u), b=v*v*(3-2*v), e=w*w*(3-2*w), L=(p, q, r)=>hash(i+p, j+q, k+r, s);
    const x0=(L(0,0,0)*(1-a)+L(1,0,0)*a)*(1-b)+(L(0,1,0)*(1-a)+L(1,1,0)*a)*b;
    const x1=(L(0,0,1)*(1-a)+L(1,0,1)*a)*(1-b)+(L(0,1,1)*(1-a)+L(1,1,1)*a)*b;
    return x0*(1-e)+x1*e;
  };
  const fbm=(x, y, z, s)=>0.5*vn(x, y, z, s)+0.3*vn(2.1*x, 2.1*y, 2.1*z, s+7)+0.2*vn(4.3*x, 4.3*y, 4.3*z, s+13);
  const vor=(x, y, z, s)=>{
    const i=Math.floor(x), j=Math.floor(y), k=Math.floor(z); let f1=9, f2=9, h1=0;
    for(let p=-1;p<=1;p++) for(let q=-1;q<=1;q++) for(let r=-1;r<=1;r++){
      const I=i+p, J=j+q, K=k+r, dx=I+hash(I, J, K, s)-x, dy=J+hash(I, J, K, s+1)-y, dz=K+hash(I, J, K, s+2)-z, d=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(d<f1){ f2=f1; f1=d; h1=hash(I, J, K, s+3); } else if(d<f2) f2=d;
    }
    return [f1, f2, h1];
  };
  const sm=(a, b, x)=>{ const t=Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
  // Lava by heat: deep red where it has cooled, through orange to yellow where it is freshest.
  const RAMP=[[0.40, 0.05, 0.02], [0.85, 0.20, 0.03], [1.00, 0.45, 0.07], [1.00, 0.80, 0.38]];
  for(let j=0;j<S;j++) for(let i=0;i<S;i++){
    let X=(i+0.5)/S*2-1, Y=(j+0.5)/S*2-1; const r=Math.hypot(X, Y);
    // Beyond the disk the rim's colour, so the texture's filtering does not darken the limb.
    if(r>0.999){ X*=0.999/r; Y*=0.999/r; }
    const Z=Math.sqrt(Math.max(0, 1-X*X-Y*Y));
    // The rafts' edges wander: the point is pushed about by the noise before the cells are found.
    const wx=X+0.22*(fbm(1.7*X, 1.7*Y, 1.7*Z, 1)-0.5), wy=Y+0.22*(fbm(1.7*X, 1.7*Y, 1.7*Z, 2)-0.5), wz=Z+0.22*(fbm(1.7*X, 1.7*Y, 1.7*Z, 3)-0.5);
    const big=vor(3.2*wx, 3.2*wy, 3.2*wz, 10), small=vor(10*wx, 10*wy, 10*wz, 20), n=fbm(6*X, 6*Y, 6*Z, 30);
    const eB=big[1]-big[0], eS=small[1]-small[0];
    // Wide cracks between the great rafts, narrower ones within them where the crust is thin,
    // and some rafts sunk into open lakes with smaller floes still on them.
    const wB=0.05+0.12*fbm(2.5*X, 2.5*Y, 2.5*Z, 40);
    let heat=1-sm(0, wB, eB);
    heat=Math.max(heat, 0.75*(1-sm(0, 0.05+0.04*n, eS))*sm(0.45, 0.6, fbm(3*X, 3*Y, 3*Z, 50)));
    // Some stretches of crack have skinned over and only glow a dull red; others run fresh.
    heat*=0.4+0.6*sm(0.3, 0.65, fbm(4*X, 4*Y, 4*Z, 70));
    if(big[2]<0.22) heat=Math.max(heat, (0.55+0.45*n)*sm(0.06, 0.2, eB)*(1-sm(0.12, 0.2, eS)*sm(0.35, 0.5, n)));
    // Crust: dark basalt with paler anorthosite, warming to a dull red along the cracks.
    const g=0.09+0.07*n+0.12*sm(0.55, 0.75, fbm(1.3*X, 1.3*Y, 1.3*Z, 60)), warm=0.18*Math.exp(-eB/0.12)+0.08*Math.exp(-eS/0.05);
    const crust=[g+warm, g*0.92+warm*0.25, g*0.85+warm*0.1];
    const t=Math.max(0, Math.min(1, heat))*3, k=Math.min(2, Math.floor(t)), f=t-k, a=sm(0.02, 0.3, heat), o=(j*S+i)*4;
    for(let q=0;q<3;q++){
      const lava=RAMP[k][q]+(RAMP[k+1][q]-RAMP[k][q])*f;
      px[o+q]=Math.round(255*Math.min(1, crust[q]+(lava-crust[q])*a));
    }
    px[o+3]=255;
  }
  ctx.putImageData(img, 0, 0);
  return moltenImg=c;
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
