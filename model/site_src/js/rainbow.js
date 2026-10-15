// Rainbows: the light raindrops send each way (the phase function, per steradian, normalized to a
// drop's cross-section), in linear sRGB relative to the sunlight's own color, for the rain veil
// (shader_present.js rainVeil). Geometric optics for each internal reflection, Airy theory about
// the primary and secondary bows, a log-normal spread of drop sizes, the Sun's disk; rainbow.py
// has the method and its check against Lorenz-Mie theory.
// It is worked out here, per epoch, because the bows move with how much more water bends light
// than the air: hot water bends less, and so does very dense air. In the Early Hadean (30 bar of
// CO2, rain near 85 °C) the primary bow widens to 45.6° and the secondary narrows to 44.6°, so the
// two cross and Alexander's dark band is gone; in the proto-Earth's guessed 4 bar at 90 °C the
// band is 3.7° wide; elsewhere the bows are within 0.3° of today's 41.8° and 51.5°.
// RAIN_AIR_N: the surface air's refractivity at 0 °C and its own pressure ((n-1)·1e6, its gases'
// partial pressures in epochs.py times airgrid.py's REFRAC; rainbow.py prints them).
const RAIN_AIR_N={protoearth455:1658, hadean45:13845, hadean40:528, archean38:284, archean27clear:262, archean27thin:265,
  archean27:263, archean27vthick:265, proterozoic22:248, snowball07:242, cryogenian65:242, ordovician466:282, carbon30:325};
// The table: BOW_W angles from 0° to 180°, one row per drop size in BOW_D (mm, log-spaced: drizzle
// to the biggest drops that keep their shape).
const BOW_W=2048, BOW_D=[0.1, 0.16, 0.25, 0.4, 0.63, 1.0];
// Water's refractive index (IAPWS R9-97) at lam nm and T °C, with its density at 1 bar (Kell 1975).
function waterN(lam, T){
  const rho=1-(T+288.9414)/(508929.2*(T+68.12963))*(T-3.9863)**2, Tb=(T+273.15)/273.15, lb=lam/589, l2=lb*lb;
  const A=rho*(0.244257733+9.74634476e-3*rho-3.73234996e-3*Tb+2.68678472e-4*l2*Tb+1.58920570e-3/l2+2.45934259e-3/(l2-0.2292020**2)+0.900704920/(l2-5.432937**2)-1.66626219e-2*rho*rho);
  return Math.sqrt((1+2*A)/(1-A));
}
// Ai(-z)²: its Maclaurin series near the turning point, the asymptotic forms beyond.
function airyAi2(z){
  const x=-z;
  if(x>4){ const s=2/3*x**1.5; return (Math.exp(-s)/(2*Math.sqrt(Math.PI)*x**0.25)*(1-5/(72*s)))**2; }
  if(z>6){ const s=2/3*z**1.5, ph=s+Math.PI/4; return ((Math.sin(ph)-5/(72*s)*Math.cos(ph))/(Math.sqrt(Math.PI)*z**0.25))**2; }
  // Ai(x) = c1 f(x) − c2 g(x), f = Σ 3^k (1/3)_k x^(3k)/(3k)!, g = Σ 3^k (2/3)_k x^(3k+1)/(3k+1)!.
  let f=1, g=x, tf=1, tg=x;
  for(let k=1;k<40;k++){
    tf*=x*x*x/((3*k-1)*(3*k)); tg*=x*x*x/((3*k)*(3*k+1));
    f+=tf; g+=tg;
    if(Math.abs(tf)+Math.abs(tg)<1e-14*(Math.abs(f)+Math.abs(g))) break;
  }
  const a=0.355028053887817*f-0.258819403792807*g;
  return a*a;
}
// The same, fast: from a table up to z = 40, the leading asymptotic term past it.
let airyTab=null;
function airyAi2Fast(z){
  if(z<=-8) return 0;
  if(z>=40){ const s=Math.sin(2/3*z*Math.sqrt(z)+Math.PI/4); return s*s/(Math.PI*Math.sqrt(z)); }
  if(!airyTab) airyTab=Float64Array.from({length:12001}, (_, j)=>airyAi2(-8+j*0.004));
  const u=(z+8)/0.004, j=Math.min(11999, Math.floor(u)), f=u-j;
  return airyTab[j]+(airyTab[j+1]-airyTab[j])*f;
}
// For relative index m: the scattering angle (rad) of a ray at impact parameter b after k internal
// reflections (k=−1: reflected off the outside), and the share of its light, s and p.
function bowRay(m, b, k){
  const i=Math.asin(b), r=Math.asin(b/m), ci=Math.cos(i), cr=Math.cos(r);
  const D=k<0?Math.PI-2*i:2*(i-(k+1)*r)+k*Math.PI;
  const Rs=((ci-m*cr)/(ci+m*cr))**2, Rp=((m*ci-cr)/(m*ci+cr))**2;
  return [Math.acos(Math.cos(D)), k<0?Rs:(1-Rs)**2*Rs**k, k<0?Rp:(1-Rp)**2*Rp**k];
}
// Geometric optics of order k on the angle grid th (rad): each branch b(θ) of the rays, as the
// light per steradian, s and p (the mean of the two is the unpolarized sunlight's).
function bowGeometric(m, k, th, outS, outP){
  const N=4000, bs=new Float64Array(N), ts=new Float64Array(N);
  // Denser toward grazing incidence, where the angle turns fastest.
  for(let j=0;j<N;j++){
    const u=(j+0.5)/N, b=1-(1-u)*(1-u), i=Math.asin(b), r=Math.asin(b/m);
    bs[j]=b; ts[j]=Math.acos(Math.cos(k<0?Math.PI-2*i:2*(i-(k+1)*r)+k*Math.PI));
  }
  let a0=0;
  while(a0<N-1){
    const dir=Math.sign(ts[a0+1]-ts[a0]);
    let a1=a0+1; while(a1<N-1 && Math.sign(ts[a1+1]-ts[a1])===dir) a1++;
    const lo=Math.min(ts[a0], ts[a1]), hi=Math.max(ts[a0], ts[a1]);
    let j=dir>0?a0:a1;
    for(let q=0;q<th.length;q++){
      const t=th[q];
      if(t<=lo||t>=hi) continue;
      // The segment of the run holding t.
      if(dir>0){ while(j<a1-1 && ts[j+1]<t) j++; } else { while(j>a0+1 && ts[j-1]<t) j--; }
      const jn=dir>0?j+1:j-1, f=(t-ts[j])/(ts[jn]-ts[j]), b=bs[j]+(bs[jn]-bs[j])*f;
      const dtdb=Math.abs((ts[jn]-ts[j])/(bs[jn]-bs[j]));
      const [, es, ep]=bowRay(m, b, k), w=b/(Math.PI*Math.sin(t)*Math.max(dtdb, 1e-9));
      outS[q]+=es*w; outP[q]+=ep*w;
    }
    a0=a1;
  }
}
// The geometric bow of order k: incidence, impact parameter, angle (rad), and c, half the second
// derivative of the angle in b (signed: positive where the angle grows on both sides).
function bowPoint(m, k){
  const i=Math.acos(Math.sqrt((m*m-1)/(k*(k+2)))), b=Math.sin(i), h=1e-4, t=bb=>bowRay(m, bb, k)[0];
  return {i, b, th:t(b), c:(t(b+h)-2*t(b)+t(b-h))/(2*h*h)};
}
// The table for rain at T °C under the air of refractivity airN: Float32 RGBA, BOW_W by BOW_D.length.
function rainbowTable(T, airN){
  const W=BOW_W, th=Float64Array.from({length:W}, (_, q)=>Math.max(1e-4, Math.min(Math.PI-1e-4, q/(W-1)*Math.PI)));
  const step=Math.PI/(W-1), rows=BOW_D.length, out=new Float32Array(W*rows*4);
  const acc=Array.from({length:rows}, ()=>[new Float64Array(W), new Float64Array(W), new Float64Array(W)]);
  // Sunlight above the air (5772 K), in 20 nm steps, as linear sRGB per step.
  const lams=Array.from({length:21}, (_, j)=>380+20*j), M3=[[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]];
  const sunRGB=[0, 0, 0], lamRGB=lams.map(l=>{
    const S=1/(l**5*Math.expm1(1.4388e7/(l*5772)));
    const X=[1.056*spG(l, 599.8, 37.9, 31.0)+0.362*spG(l, 442.0, 16.0, 26.7)-0.065*spG(l, 501.1, 20.4, 26.2),
      0.821*spG(l, 568.8, 46.9, 40.5)+0.286*spG(l, 530.9, 16.3, 31.1), 1.217*spG(l, 437.0, 11.8, 36.0)+0.681*spG(l, 459.0, 26.0, 13.8)];
    const c=M3.map(r=>S*(r[0]*X[0]+r[1]*X[1]+r[2]*X[2]));
    c.forEach((v, q)=>sunRGB[q]+=v);
    return c;
  });
  // Each row's drops: a log-normal of 30% about its size, weighted by their cross-section.
  const sub=[-2, -1, 0, 1, 2].map(s=>({f:Math.exp(0.3*s*0.8), w:Math.exp(-0.5*(s*0.8)**2)*Math.exp(2*0.3*s*0.8)}));
  const wsum=sub.reduce((a, s)=>a+s.w, 0);
  // Per wavelength: every order's geometric light (the bows' too) added to each row once, then
  // per drop size the bows' Airy correction where it differs from that.
  const g=new Float64Array(W), bS=new Float64Array(W), bP=new Float64Array(W), bowG=[new Float64Array(W), new Float64Array(W)];
  lams.forEach((lam, li)=>{
    const m=waterN(lam, T)/(1+airN), col=lamRGB[li];
    bS.fill(0); bP.fill(0);
    for(const k of [-1, 0, 3]) bowGeometric(m, k, th, bS, bP);
    for(let q=0;q<W;q++) g[q]=(bS[q]+bP[q])/2;
    const bows=[1, 2].map((k, n)=>{
      bS.fill(0); bP.fill(0); bowGeometric(m, k, th, bS, bP);
      const G=bowG[n];
      for(let q=0;q<W;q++){ G[q]=(bS[q]+bP[q])/2; g[q]+=G[q]; }
      const B=bowPoint(m, k), [, es, ep]=bowRay(m, B.b, k);
      return {...B, side:Math.sign(B.c), c3:Math.cbrt(Math.abs(B.c)), K:2*B.b/(Math.sin(B.th)*Math.abs(B.c)**(2/3))*(es+ep)/2};
    });
    for(let r=0;r<rows;r++){
      const a=acc[r], c0=col[0], c1=col[1], c2=col[2];
      const corr=new Float64Array(W);
      for(const s of sub){
        const x=2*Math.PI*(BOW_D[r]*s.f*500)/(lam*1e-3), x23=x**(2/3), wt=s.w/wsum;
        for(let n=0;n<2;n++){
          const B=bows[n], G=bowG[n], zs=B.side*x23/B.c3, fr0=Math.PI*B.c3/x23/step, Kx=B.K*Math.cbrt(x)*wt;
          for(let q=0;q<W;q++){
            const z=(th[q]-B.th)*zs;
            if(z>0){
              // Airy over its own far field, about 1 on average; where its fringes are finer than
              // the grid they average out.
              const sz=Math.sqrt(z), keep=Math.min(1, Math.max(0, (fr0/sz-1)/2));
              if(keep>0) corr[q]+=wt*G[q]*(2*Math.PI*sz*airyAi2Fast(z)-1)*keep;
            } else if(z>-8) corr[q]+=Kx*airyAi2Fast(z);
          }
        }
      }
      for(let q=0;q<W;q++){ const p=g[q]+corr[q]; a[0][q]+=p*c0; a[1][q]+=p*c1; a[2][q]+=p*c2; }
    }
  });
  // The Sun's disk, 0.533° across: each angle the mean over its chord, then relative to the sunlight.
  const R=0.2665*Math.PI/180/step, n=Math.ceil(R), ker=[];
  for(let j=-n;j<=n;j++) ker.push(Math.sqrt(Math.max(0, 1-(j/R)**2)));
  const ks=ker.reduce((a, b)=>a+b, 0);
  for(let r=0;r<rows;r++){
    for(let q=0;q<W;q++){
      const c=[0, 0, 0];
      for(let j=-n;j<=n;j++){ const qq=Math.min(W-1, Math.max(0, q+j)), w=ker[j+n]/ks; for(let e=0;e<3;e++) c[e]+=acc[r][e][qq]*w; }
      for(let e=0;e<3;e++) c[e]/=sunRGB[e];
      // Bow colors outside sRGB, toward gray of the same luminance until they fit.
      const Y=0.2126*c[0]+0.7152*c[1]+0.0722*c[2], lo=Math.min(c[0], c[1], c[2]);
      if(lo<0 && Y>0){ const t=Y/(Y-lo); for(let e=0;e<3;e++) c[e]=Y+(c[e]-Y)*t; }
      const o=(r*W+q)*4;
      out[o]=Math.max(0, c[0]); out[o+1]=Math.max(0, c[1]); out[o+2]=Math.max(0, c[2]); out[o+3]=1;
    }
  }
  return out;
}
// The table for the epoch shown, with rain at T °C, worked out again when the bows would move a
// tenth of a degree (about 7 °C of rain, or a change of epoch).
let bowCache=null;
function rainbowNow(key, T){
  const airN=(RAIN_AIR_N[key]??292)*1e-6*273.15/(Math.max(0, T)+273.15), Tc=Math.min(95, Math.max(0, T));
  const m=waterN(550, Tc)/(1+airN), id=Math.round(m*1500);
  if(bowCache && bowCache.id===id) return bowCache;
  bowCache={id, m, data:rainbowTable(Tc, airN), ver:(bowCache?bowCache.ver:0)+1};
  return bowCache;
}
// The table on texture unit 19 for the composite pass (shader_present.js bowTex), sent again when
// it changes; B null (no rain, or all snow) leaves what is there, or a black texel to start.
function bindRainbow(gl, B){
  gl.activeTexture(gl.TEXTURE19);
  if(!vrGL.bowTex){
    vrGL.bowTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, vrGL.bowTex);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(4));
    vrGL.bowVer=0;
  } else gl.bindTexture(gl.TEXTURE_2D, vrGL.bowTex);
  if(B && B.ver!==vrGL.bowVer){
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, BOW_W, BOW_D.length, 0, gl.RGBA, gl.FLOAT, B.data);
    vrGL.bowVer=B.ver;
  }
  gl.activeTexture(gl.TEXTURE2);
}
