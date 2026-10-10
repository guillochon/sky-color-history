// The nebulae and galaxies that binoculars show under a dark sky (dso.py): survey images, their
// stars taken out, each standing for the object's light in cd/m² in linear sRGB. The tiles come
// in one image (dso.webp, fetched once the page is up), DSO_N pixels square in rows of
// DSO.cols, north up and east to the left on the tangent plane; each channel is the cube root of
// its share of the tile's brightest light (top). Per epoch each object has its place (J2000 RA
// and Dec), its size as a share of today's (galaxies were nearer or further, planetary nebulae
// and the Crab younger), and how much of it there was (no nebula of today's shone in the deep past).
const DSO=__DSO__, DSO_IMG='__DSO_IMG__', DSO_N=DSO.n, DSO_LV=64;
// For the dome, each tile as linear light at 64 pixels and each halving down to one (dsoMips[i][l],
// l=0 the 64), once the image is in; for VR the image itself, uploaded as a texture array.
let dsoImg=null, dsoMips=null, dsoPx=null;
function loadDso(){
  const img=new Image();
  img.onload=()=>{
    const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height;
    const ctx=cv.getContext('2d', {willReadFrequently:true}); ctx.drawImage(img, 0, 0);
    const lin=new Float32Array(256); for(let c=0;c<256;c++) lin[c]=Math.pow(c/255, 3);
    const step=DSO_N/DSO_LV;
    dsoMips=DSO.objects.map((o, i)=>{
      const px=ctx.getImageData((i%DSO.cols)*DSO_N, Math.floor(i/DSO.cols)*DSO_N, DSO_N, DSO_N).data;
      let n=DSO_LV, m=new Float32Array(n*n*3);
      for(let y=0;y<DSO_N;y++) for(let x=0;x<DSO_N;x++){
        const s=(y*DSO_N+x)*4, d=(Math.floor(y/step)*n+Math.floor(x/step))*3;
        m[d]+=lin[px[s]]; m[d+1]+=lin[px[s+1]]; m[d+2]+=lin[px[s+2]];
      }
      const k=o.top/(step*step); for(let j=0;j<m.length;j++) m[j]*=k;
      const levels=[m];
      while(n>1){
        const h=n/2, q=new Float32Array(h*h*3);
        for(let y=0;y<h;y++) for(let x=0;x<h;x++) for(let c=0;c<3;c++)
          q[(y*h+x)*3+c]=0.25*(m[((2*y)*n+2*x)*3+c]+m[((2*y)*n+2*x+1)*3+c]+m[((2*y+1)*n+2*x)*3+c]+m[((2*y+1)*n+2*x+1)*3+c]);
        levels.push(q); m=q; n=h;
      }
      return levels;
    });
    // The whole image's pixels for the VR texture array (surfaces.js buildSkyArray), read once:
    // uploading tiles from the image itself converts it all again for each.
    dsoPx=ctx.getImageData(0, 0, img.width, img.height);
    cv.width=cv.height=0;
    dsoImg=img;
    renderDay();
  };
  img.src=DSO_IMG;
}
// The objects in the sky now, for the epoch, date, clock time and latitude shown: each with its
// centre C and its east E and north N on the sky, in the local horizon frame (east, north, up),
// the tangent-plane half-width of its tile (hw), the cosine of the angle out to the tile's corner
// (cosR), and the light its tile's top stands for, times how much of it there is (k).
function dsoPlace(lat){
  if(!dsoMips) return [];
  const key=EP[dIdx].key, year=STAR_YEAR[key]||pageDate()[0], LST=localSidereal(), out=[];
  const dir=(ra, dec)=>{ const p=starMeanPlace([ra, dec, 0, 0, 0, 0], key, year), q=raDecAltaz(lat, p.ra, p.dec, LST); return horizDir(q.az, q.alt); };
  DSO.objects.forEach((o, i)=>{
    const e=o.ep[key]; if(!e||!(e[3]>0)) return;
    const hw=o.hw*e[2], R=Math.atan(hw*Math.SQRT2), C=dir(e[0], e[1]);
    if(C[2]<-Math.sin(Math.min(R+0.02, 1.5))) return;
    const n=dir(e[0], e[1]+(e[1]>89?-0.05:0.05)), sg=e[1]>89?-1:1, dn=vdot(n, C);
    let N=[(n[0]-C[0]*dn)*sg, (n[1]-C[1]*dn)*sg, (n[2]-C[2]*dn)*sg];
    const l=Math.hypot(...N); N=N.map(v=>v/l);
    const E=[N[1]*C[2]-N[2]*C[1], N[2]*C[0]-N[0]*C[2], N[0]*C[1]-N[1]*C[0]];
    out.push({i, o, C, E, N, hw, cosR:Math.cos(R), k:o.top*e[3], f:e[3], s:e[2]});
  });
  return out;
}
// Light (linear sRGB, cd/m², before the air) of one object toward direction d, seen in a pixel
// pix radians across: the dome's tiles at the level whose texels are about a pixel.
function dsoLight(p, d, pix, out){
  const c=vdot(d, p.C); if(c<p.cosR) return false;
  const u=0.5-vdot(d, p.E)/c/(2*p.hw), v=0.5-vdot(d, p.N)/c/(2*p.hw);
  if(u<0||u>1||v<0||v>1) return false;
  let l=Math.max(0, Math.min(Math.log2(DSO_LV), Math.ceil(Math.log2(pix*DSO_LV/(2*p.hw)))));
  const n=DSO_LV>>l, m=dsoMips[p.i][l], f=p.f;
  const x=Math.max(0, Math.min(n-1.001, u*n-0.5)), y=Math.max(0, Math.min(n-1.001, v*n-0.5)), i=Math.floor(x), j=Math.floor(y), fx=x-i, fy=y-j;
  const i1=Math.min(i+1, n-1), j1=Math.min(j+1, n-1);
  for(let q=0;q<3;q++){
    const a=m[(j*n+i)*3+q]*(1-fx)+m[(j*n+i1)*3+q]*fx, b=m[(j1*n+i)*3+q]*(1-fx)+m[(j1*n+i1)*3+q]*fx;
    out[q]+=(a*(1-fy)+b*fy)*f;
  }
  return true;
}
// All the objects' light toward d (out, linear sRGB cd/m²), and the brightest of them there.
function dsoAt(list, d, pix, out){
  out[0]=out[1]=out[2]=0; let best=null, bestY=0;
  const d0=d[0], d1=d[1], d2=d[2];
  for(let k=0;k<list.length;k++){
    const p=list[k], C=p.C;
    if(d0*C[0]+d1*C[1]+d2*C[2]<p.cosR) continue;
    const y0=out[0]*0.2126+out[1]*0.7152+out[2]*0.0722;
    if(dsoLight(p, d, pix, out)){ const y=out[0]*0.2126+out[1]*0.7152+out[2]*0.0722-y0; if(y>bestY){ bestY=y; best=p; } }
  }
  return best;
}
// The spectra the probe gives them (spectrum.js): galaxies their stars' light; an H II region
// Balmer and forbidden lines over a little scattered starlight; a planetary nebula's light mostly
// doubly ionised oxygen; the Crab's synchrotron glow and its filaments; a reflection nebula the
// blue of its stars, scattered.
const DSO_SP={};
function dsoSpectrum(kind){
  if(DSO_SP[kind]) return DSO_SP[kind];
  const hii=[[656.3, 3], [658.4, 1], [654.8, 0.33], [486.1, 1], [434.0, 0.47], [500.7, 1.5], [495.9, 0.5], [671.6, 0.2], [673.1, 0.2]];
  const pn=[[500.7, 10], [495.9, 3.3], [486.1, 1], [434.0, 0.47], [656.3, 3], [658.4, 2], [654.8, 0.66], [468.6, 0.4]];
  const S={g:SP_MW, n:spNorm(spAdd([1, spLines(hii)], [0.1, SP_MW])), p:spNorm(spAdd([1, spLines(pn)], [0.03, SP_MW])),
    s:spNorm(spAdd([1, spNorm(Float32Array.from(SP_LAM, l=>Math.pow(l/550, -0.6)))], [0.4, spLines([[656.3, 3], [658.4, 3], [500.7, 2], [671.6, 1], [673.1, 1]])])),
    r:spNorm(spPlanck(16000))}[kind];
  return DSO_SP[kind]=S;
}
// The texture array for the VR sky (unit 6), made once the image is in: a layer per tile,
// mipmapped, and after them any surface maps (surfaces.js buildSkyArray).
function syncDsoTex(gl){
  if(dsoPx&&!vrGL.skyArrayDso) buildSkyArray(gl);
}
// Into the sky shader: those whose tile can reach the screen, nearest the middle of the view
// first, up to DSO_MAX. C is the centre and the cosine of the tile's corner, E the east and the
// half-width, N the north and the layer, K the light 1.0 stands for, over the display's unit and
// above the air.
const DSO_MAX=10, DSO_U={C:new Float32Array(DSO_MAX*4), E:new Float32Array(DSO_MAX*4), N:new Float32Array(DSO_MAX*4), K:new Float32Array(DSO_MAX)};
function uploadDso(gl, u){
  const list=skyNow.dso||[];
  if(!vrGL.dsoTex||!list.length){ gl.uniform1f(u.dsoCnt, 0); return; }
  const c=gl.canvas, fy=Math.tan(vrFov*Math.PI/360), fx=fy*c.width/Math.max(c.height, 1);
  const edge=Math.atan(Math.hypot(fx, fy)), yw=vrYaw*Math.PI/180, pt=vrPitch*Math.PI/180;
  const fwd=[Math.sin(yw)*Math.cos(pt), Math.cos(yw)*Math.cos(pt), Math.sin(pt)];
  const seen=list.map(p=>[p, vdot(p.C, fwd)]).filter(([p, c])=>c>Math.cos(Math.min(edge+Math.acos(p.cosR)+0.02, Math.PI)))
    .sort((a, b)=>b[1]-a[1]).slice(0, DSO_MAX);
  const k=extZenith(EP[dIdx].key)/skyNow.rCd;
  seen.forEach(([p], i)=>{
    DSO_U.C.set(p.C, i*4); DSO_U.C[i*4+3]=p.cosR;
    DSO_U.E.set(p.E, i*4); DSO_U.E[i*4+3]=p.hw;
    DSO_U.N.set(p.N, i*4); DSO_U.N[i*4+3]=p.i;
    DSO_U.K[i]=p.k*k;
  });
  gl.uniform4fv(u.dsoC, DSO_U.C); gl.uniform4fv(u.dsoE, DSO_U.E); gl.uniform4fv(u.dsoN, DSO_U.N); gl.uniform1fv(u.dsoK, DSO_U.K);
  gl.uniform1f(u.dsoCnt, seen.length);
}
const DSO_GLSL=`
uniform highp sampler2DArray dsoTex;
uniform vec4 dsoC[${DSO_MAX}], dsoE[${DSO_MAX}], dsoN[${DSO_MAX}]; uniform float dsoK[${DSO_MAX}], dsoCnt;
// The nebulae and galaxies toward src, in a pixel pix radians across (dso.js dsoLight).
vec3 dsoAt(vec3 src, float pix){
  vec3 L=vec3(0.0);
  for(int i=0;i<${DSO_MAX};i++){
    if(float(i)>=dsoCnt) break;
    float c=dot(src, dsoC[i].xyz);
    if(c<dsoC[i].w) continue;
    float hw=dsoE[i].w;
    vec2 uv=0.5-vec2(dot(src, dsoE[i].xyz), dot(src, dsoN[i].xyz))/(c*2.0*hw);
    if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) continue;
    vec3 q=textureLod(dsoTex, vec3(uv, dsoN[i].w), log2(max(pix*${DSO_N}.0/(2.0*hw), 1e-6))).rgb;
    L+=q*q*q*dsoK[i];
  }
  return L;
}`;
