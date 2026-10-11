// The newborn Moon's face, 4.5 Ga, as a map of the whole globe for moon_maps.py (run by it with
// node): W x H, equirectangular, longitude -180 at the left edge, north at the top, written as raw
// RGB bytes to the file named last.
//
// A few million years after the giant impact the Moon still has its magma ocean open at the top:
// rafts of dark quench crust and the first pale anorthosite floating up, broken by cracks and lakes
// of lava at 1,400-1,600 K. Per square kilometre that lava shines about as brightly as the sunlit
// Moon (moon_surface.js lunarLava), so the disk glows orange by day and night alike; the map's red
// excess is the share that glows (moonGlow). Everything is made on the sphere, in the selenographic
// frame of moon_surface.js mareVec (x east, y north, z toward the Earth).
//
// Usage: node molten_moon.js <W> <H> <out.rgb>
const fs = require('fs');
const [W, H] = [+process.argv[2], +process.argv[3]], out = process.argv[4];
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
// The narrowest crack, in the noise's units: about half a pixel of a 512-pixel disk.
const PX=1/256;
const px=Buffer.alloc(W*H*3);
for(let j=0;j<H;j++){
  const lat=Math.PI/2-(j+0.5)/H*Math.PI, cl=Math.cos(lat), Y=Math.sin(lat);
  for(let i=0;i<W;i++){
    const lon=(i+0.5)/W*2*Math.PI-Math.PI, X=cl*Math.sin(lon), Z=cl*Math.cos(lon);
    // The rafts' edges wander at every scale: the point is pushed about by five octaves of noise,
    // each half the last, before the cells are found.
    let wx=X, wy=Y, wz=Z;
    for(let o=0, f=3, A=0.1;o<5;o++, f*=2.03, A*=0.5){ wx+=A*(vn(f*X, f*Y, f*Z, 1+3*o)-0.5); wy+=A*(vn(f*X, f*Y, f*Z, 2+3*o)-0.5); wz+=A*(vn(f*X, f*Y, f*Z, 3+3*o)-0.5); }
    const n=fbm(14*X, 14*Y, 14*Z, 30);
    // Cracks within cracks: four generations of floes, each about half the size of the last, so
    // the great rafts are themselves broken into plates, and those into chips. A finer crack is
    // narrower and dimmer, and is open only where the crust there is thin.
    const L=[], SC=[6, 12, 23, 42], AMP=[1, 0.8, 0.65, 0.5];
    let heat=0, warm=0;
    for(let l=0;l<4;l++){
      const s=SC[l], v=vor(s*wx, s*wy, s*wz, 10+10*l), e=v[1]-v[0];
      L.push(v);
      const w=Math.max((0.04+0.07*fbm(2.5*s/6*X, 2.5*s/6*Y, 2.5*s/6*Z, 40+l))*Math.pow(0.8, l), 0.6*s*PX);
      const open=l===0?1:sm(0.4, 0.55, fbm(1.5*s/6*X, 1.5*s/6*Y, 1.5*s/6*Z, 50+l));
      heat=Math.max(heat, AMP[l]*(1-sm(0, w, e))*open);
      warm+=0.14*Math.pow(0.5, l)*Math.exp(-e/(2.5*w))*open;
    }
    // Some stretches of crack have skinned over and only glow a dull red; others run fresh.
    heat*=0.4+0.6*sm(0.3, 0.65, fbm(9*X, 9*Y, 9*Z, 70));
    // Some second-generation plates have sunk into open lakes, the finest chips still on them.
    const lake=L[1], eL=lake[1]-lake[0], eC=L[3][1]-L[3][0];
    if(lake[2]<0.17) heat=Math.max(heat, (0.55+0.45*n)*sm(0.06, 0.2, eL)*(1-sm(0.1, 0.2, eC)*sm(0.4, 0.55, n)));
    // Crust: dark basalt with paler anorthosite, warming to a dull red along the cracks.
    const g=0.09+0.07*n+0.12*sm(0.55, 0.75, fbm(2.6*X, 2.6*Y, 2.6*Z, 60));
    const crust=[g+warm, g*0.92+warm*0.25, g*0.85+warm*0.1];
    const t=Math.max(0, Math.min(1, heat))*3, k=Math.min(2, Math.floor(t)), f=t-k, a=sm(0.02, 0.3, heat), o=(j*W+i)*3;
    for(let q=0;q<3;q++){
      const lava=RAMP[k][q]+(RAMP[k+1][q]-RAMP[k][q])*f;
      px[o+q]=Math.round(255*Math.min(1, crust[q]+(lava-crust[q])*a));
    }
  }
}
fs.writeFileSync(out, px);
