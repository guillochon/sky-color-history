// The nebulae and galaxies that binoculars show under a dark sky (dso.py): survey images, their
// stars taken out, each standing for the object's light in cd/m² in linear sRGB. The tiles come
// in one image (dso.webp, fetched once the page is up), DSO_N pixels square in rows of
// DSO.cols, north up and east to the left on the tangent plane; each channel is the cube root of
// its share of the tile's brightest light (top). Per epoch each object has its place (J2000 RA
// and Dec), its size as a share of today's (galaxies were nearer or further, planetary nebulae
// and the Crab younger), and how much of it there was (no nebula of today's shone in the deep past).
const DSO=__DSO__, DSO_IMG='__DSO_IMG__', DSO_N=DSO.n, DSO_LV=64;
// Each object's tile at full size (DSO.hi, DSO_S atlas tiles across) in a file of its own
// (dso/<id>.webp), fetched once the walk-around view draws its atlas tile more than about 400
// pixels across, decoded off the main thread and read out once; its 512-pixel pieces join the
// texture array after the atlas's tiles and the surface maps (surfaces.js buildSkyArray), the array
// remade as each arrives.
const DSO_HI_FILES=__DSO_HI__, DSO_S=DSO.hi/DSO.n, dsoHi={};
function wantDsoHi(i){
  if(dsoHi[i]) return;
  const m=dsoHi[i]={px:null, base:null}, url=DSO_HI_FILES[DSO.objects[i].id];
  if(!url) return;
  fetch(url).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
    const cv=new OffscreenCanvas(bm.width, bm.height), ctx=cv.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(bm, 0, 0); m.px=ctx.getImageData(0, 0, bm.width, bm.height).data; bm.close();
    requestVR();
  }).catch(()=>{});
}
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
  const hi=Object.values(dsoHi).filter(m=>m.px).length;
  if(dsoPx&&(!vrGL.skyArrayDso||hi!==(vrGL.skyArrayHi||0))) buildSkyArray(gl);
}
// Into the sky shader: those whose tile can reach the screen, nearest the middle of the view
// first, up to DSO_MAX. C is the centre and the cosine of the tile's corner, E the east and the
// half-width, N the north and the layer, K the light 1.0 stands for, over the display's unit and
// above the air, W how far it is shown as a picture (dsoView), H the first layer of its full-size
// tile's pieces (-1 while there are none) and the cube root of that tile's top over the atlas's.
const DSO_MAX=10, DSO_U={C:new Float32Array(DSO_MAX*4), E:new Float32Array(DSO_MAX*4), N:new Float32Array(DSO_MAX*4), K:new Float32Array(DSO_MAX), W:new Float32Array(DSO_MAX), H:new Float32Array(DSO_MAX*2)};
// Zoomed in on an object, it is shown more and more as its picture (the tile as coded, a cube-root
// stretch in full colour) rather than as the eye would see its light: not at all while its tile
// spans a twentieth of the view's height or less, wholly once it spans half, smoothly between on
// a log scale. A telescope's view, as a photograph shows it.
function dsoView(hw, fov){
  const t=Math.max(0, Math.min(1, Math.log10(2*Math.atan(hw)/fov/0.05)));
  return t*t*(3-2*t);
}
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
    DSO_U.W[i]=dsoView(p.hw, vrFov*Math.PI/180);
    if(2*p.hw*c.height/(2*fy)>400) wantDsoHi(p.i);
    const h=dsoHi[p.i];
    DSO_U.H[i*2]=h&&h.base!=null?h.base:-1; DSO_U.H[i*2+1]=Math.cbrt(p.o.topHi/p.o.top);
  });
  gl.uniform4fv(u.dsoC, DSO_U.C); gl.uniform4fv(u.dsoE, DSO_U.E); gl.uniform4fv(u.dsoN, DSO_U.N); gl.uniform1fv(u.dsoK, DSO_U.K); gl.uniform1fv(u.dsoW, DSO_U.W); gl.uniform2fv(u.dsoH, DSO_U.H);
  gl.uniform1f(u.dsoCnt, seen.length);
}
const DSO_GLSL=`
uniform highp sampler2DArray dsoTex;
uniform vec4 dsoC[${DSO_MAX}], dsoE[${DSO_MAX}], dsoN[${DSO_MAX}]; uniform float dsoK[${DSO_MAX}], dsoW[${DSO_MAX}], dsoCnt; uniform vec2 dsoH[${DSO_MAX}];
// The nebulae and galaxies toward src, in a pixel pix radians across (dso.js dsoLight); img gets
// their pictures (sRGB) as zoom shows them (dsoView), the brightest, and w how far it is shown.
vec3 dsoAt(vec3 src, float pix, out vec3 img, out float w){
  vec3 L=vec3(0.0); img=vec3(0.0); w=0.0;
  for(int i=0;i<${DSO_MAX};i++){
    if(float(i)>=dsoCnt) break;
    float c=dot(src, dsoC[i].xyz);
    if(c<dsoC[i].w) continue;
    float hw=dsoE[i].w;
    vec2 uv=0.5-vec2(dot(src, dsoE[i].xyz), dot(src, dsoN[i].xyz))/(c*2.0*hw);
    if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) continue;
    float lod=log2(max(pix*${DSO_N}.0/(2.0*hw), 1e-6));
    vec3 q;
    // Finer than the atlas's texels, the piece of the full-size tile under src, at its own level.
    if(lod<0.0&&dsoH[i].x>=0.0){
      vec2 h=min(floor(uv*${DSO_S}.0), ${DSO_S-1}.0);
      q=textureLod(dsoTex, vec3(uv*${DSO_S}.0-h, dsoH[i].x+h.y*${DSO_S}.0+h.x), max(lod+${Math.log2(DSO_S)}.0, 0.0)).rgb*dsoH[i].y;
    } else q=textureLod(dsoTex, vec3(uv, dsoN[i].w), lod).rgb;
    L+=q*q*q*dsoK[i];
    // The picture's black is set a little above the tile's, and it fades out in a circle inside
    // the tile, or the stretch would show what is left of the survey's sky as a grey square.
    if(dsoW[i]>0.0){
      float e=smoothstep(0.5, 0.3, length(uv-0.5));
      img=max(img, max(q-0.1, 0.0)/0.9*e); w=max(w, dsoW[i]);
    }
  }
  return L;
}`;
