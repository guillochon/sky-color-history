// The rocky bodies' surfaces, from spacecraft maps (all public domain): Mercury from MESSENGER's
// MDIS MD3 color mosaic (1000, 750 and 430 nm; USGS), Mars from Viking's color mosaic (USGS), Io
// from Galileo's color over the Galileo and Voyager mosaic, Europa from the Galileo and Voyager
// mosaic (gray, in Europa's tint), Ganymede from the Galileo and Voyager color mosaic (all USGS
// Astrogeology), Callisto from the Galileo and Voyager mosaic (gray, in Callisto's tint; USGS), and
// Tethys, Dione and Rhea from Cassini's color maps (PIA18439, PIA18434, PIA18438;
// NASA/JPL-Caltech/SSI/LPI); Ceres and Vesta from Dawn's Framing Camera mosaics (gray, in their
// tints; DLR, USGS), and Phobos from Mars Express's SRC mosaic (DLR, USGS). Each map is turned to start at longitude 0 (the IAU prime meridian;
// the moons' faces the host), east to the right; the gaps (Europa south of 83°S, Callisto's south
// polar region over a third of its longitudes, slivers at other poles, Vesta's north and Ceres's far
// south, dark when Dawn mapped them) filled from round about,
// smooth where there is no data; the colors toned
// toward true color, the Cassini and USGS color composites reaching into the ultraviolet and
// infrared; and each scaled to the same mean brightness (surfaces.py, small_bodies.py).
//
// One file per body (surf/<name>.webp: Mercury's and Mars's 4096 x 2048, each moon's 1024 x 512),
// fetched only once the walk-around view draws that body as a disk of a few pixels (vr_paint.js
// uploadBodies). It is decoded off the main thread and read out once, and its pixels go into the
// nebulae's texture array as 512-pixel tiles (every texture unit being in use, the maps share it),
// the array remade with room for each map as it arrives. Uploading tiles straight from the image
// made the browser convert the whole image again for each one, freezing the page for half a minute.
const SURF_FILES=__SURF_FILES__;
// Mercury's, Mars's, Theia's, Ceres's, Vesta's, Phobos's, proto-Mercury's, Anteros's and Enyo's heights
// (relief_maps.py: MESSENGER's and MOLA's; theia_map.py and embryo_maps.py: from their imagined
// basins and craters; small_bodies.py: Dawn's and Mars
// Express's shapes, over the spheroids planets.js draws them as), on their maps' grid, one byte from
// SURF_RELIEF[name][0] to [1] km; the radius they stand on (km) and the Sun's angular radius there
// (radians). They ride in their maps' alpha (level ground until they come) and light the slopes, cast
// the shadows and shape the outlines of the bodies' disks (shader_bodies.js surfReliefLit, bodyDisk).
const RELIEF_FILES=__RELIEF_FILES__, SURF_RELIEF={Mercury:[-5.5, 4.7, 2439.4, 0.012], Mars:[-8.3, 21.3, 3389.5, 0.0031], Theia:[-15, 7.5, 3400, 0.0047],
  Ceres:[-7.3, 9.4, 482.1, 0.00168], Vesta:[-19.7, 23.1, 280.98, 0.00197], Phobos:[-1.6, 2.0, 12.12, 0.0031],
  Protomercury:[-13, 8, 3500, 0.0120], Anteros:[-15, 9.5, 3300, 0.00838], Enyo:[-21, 12, 700, 0.00266]};
// Each mapped body's kind in the shaders' code (surfCode): 0 a moon's two tiles, no heights; 1
// Mercury's and 2 Mars's 8 x 4 tiles; from 3 on two tiles with heights, in SURF_RELIEF's order. The
// code holds up to SURF_KINDS kinds.
const SURF_KIND={Mercury:1, Mars:2}, SURF_KINDS=16;
Object.keys(SURF_RELIEF).filter(n=>!SURF_KIND[n]).forEach((n, i)=>{ SURF_KIND[n]=3+i; });
const surfMaps={};
let surfReliefIn=0;
function surfPixels(url){
  return fetch(url).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
    const cv=new OffscreenCanvas(bm.width, bm.height), ctx=cv.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(bm, 0, 0); const w=bm.width, h=bm.height, px=ctx.getImageData(0, 0, w, h).data; bm.close();
    return {w, h, px};
  });
}
// The heights into the map's alpha, once both are in.
function surfMergeRelief(m){
  if(!m.px||!m.relief||m.reliefIn||m.relief.w!==m.w||m.relief.h!==m.h) return;
  const a=m.px, r=m.relief.px;
  for(let i=3;i<a.length;i+=4) a[i]=r[i-3];
  m.reliefIn=true; m.relief=null; surfReliefIn++; requestVR();
}
// Ask for body name's map; true once it is in the texture array. Until its heights come, its alpha
// is the level of height 0.
function wantSurface(name){
  const s=surfMaps[name];
  if(s) return s.base!=null;
  const m=surfMaps[name]={px:null, w:0, h:0, base:null, relief:null, reliefIn:false};
  surfPixels(SURF_FILES[name]).then(d=>{
    const R=SURF_RELIEF[name];
    if(R){ const lv=Math.round(-R[0]/(R[1]-R[0])*255); for(let i=3;i<d.px.length;i+=4) d.px[i]=lv; }
    m.w=d.w; m.h=d.h; m.px=d.px; surfMergeRelief(m); requestVR();
  }).catch(()=>{});
  if(RELIEF_FILES[name]) surfPixels(RELIEF_FILES[name]).then(d=>{ m.relief=d; surfMergeRelief(m); }).catch(()=>{});
  return false;
}
// The surface's code for the bodies' shader (bodyM's w): -1 for none, else its first layer times 8
// plus its kind (SURF_KIND).
function surfCode(name){
  const s=name&&surfMaps[name];
  return s&&s.base!=null?s.base*SURF_KINDS+(SURF_KIND[name]||0):-1;
}
// The nebulae's tiles (dso.js, from their pixels; left empty until they are in), every map that
// has arrived, and the pieces of each nebula's full-size tile that has, in one array (unit 6),
// mipmapped; remade whenever any arrives.
function buildSkyArray(gl){
  const n=DSO.objects.length, N=DSO_N, ready=Object.keys(surfMaps).filter(k=>surfMaps[k].px);
  let layers=n;
  for(const k of ready){ const m=surfMaps[k]; m.base=layers; layers+=(m.w/N)*(m.h/N); }
  const hi=Object.values(dsoHi).filter(m=>m.px);
  for(const m of hi){ m.base=layers; layers+=DSO_S*DSO_S; }
  const t=gl.createTexture();
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.log2(N)+1, gl.RGBA8, N, N, layers);
  // A tile below the image's first row needs the image's full height as the unpack image height,
  // or WebGL refuses rows skipped past the tile's own height.
  const put=(px, w, h, cols, count, base)=>{
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, w); gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, h);
    for(let i=0;i<count;i++){
      gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, (i%cols)*N); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, Math.floor(i/cols)*N);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, base+i, N, N, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
  };
  if(dsoPx) put(dsoPx.data, dsoPx.width, dsoPx.height, DSO.cols, n, 0);
  for(const k of ready){ const m=surfMaps[k]; put(m.px, m.w, m.h, m.w/N, (m.w/N)*(m.h/N), m.base); }
  for(const m of hi) put(m.px, DSO_S*N, DSO_S*N, DSO_S, DSO_S*DSO_S, m.base);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.activeTexture(gl.TEXTURE0);
  if(vrGL.dsoTex) gl.deleteTexture(vrGL.dsoTex);
  vrGL.dsoTex=t; vrGL.skyArrayMaps=ready.length; vrGL.skyArrayDso=!!dsoPx; vrGL.skyArrayHi=hi.length;
}
// Make or remake the array when a map has arrived since it was made.
function syncSurfTex(gl){
  const ready=Object.keys(surfMaps).filter(k=>surfMaps[k].px).length;
  if(ready&&(ready!==(vrGL.skyArrayMaps||0)||surfReliefIn!==(vrGL.skyArrayRelief||0))){ buildSkyArray(gl); vrGL.skyArrayRelief=surfReliefIn; }
}
// The sky shader's lookup: the map with code c (surfCode) at east longitude lon and latitude lat
// (degrees), lod the level of detail of a 512-texel map round the equator.
const SURF_GLSL=`
vec4 surfTex(float c, float lon, float lat, float lod){
  float kind=mod(c, ${SURF_KINDS}.0), base=floor(c/${SURF_KINDS}.0+0.01), u=fract(lon/360.0), v=clamp((90.0-lat)/180.0, 0.0, 1.0);
  float layer, s, t;
  if(kind>0.5 && kind<2.5){ float x=min(u*8.0, 7.9999), y=min(v*4.0, 3.9999); layer=floor(y)*8.0+floor(x); s=fract(x); t=fract(y); lod+=3.0; }
  else { float x=min(u*2.0, 1.9999); layer=floor(x); s=fract(x); t=v; lod+=1.0; }
  return textureLod(dsoTex, vec3(s, t, base+layer), max(lod, 0.0));
}
vec3 surfAt(float c, float lon, float lat, float lod){
  // Mars's disk is drawn brighter (planets.js BODY_GAIN); its map a little darker to match.
  float kind=mod(c, ${SURF_KINDS}.0);
  return surfTex(c, lon, lat, lod).rgb*(kind>1.5&&kind<2.5?1.3:1.78);
}
// For each kind with heights (SURF_KIND, 0 for none): their lowest and span, the radius they stand on
// (km) and the Sun's angular radius there (SURF_RELIEF).
const vec4 SURF_HRS[${SURF_KINDS}]=vec4[${SURF_KINDS}](${Array.from({length:SURF_KINDS}, (_, k)=>k).map(k=>{ const n=Object.keys(SURF_KIND).find(n=>SURF_KIND[n]===k), r=n&&SURF_RELIEF[n]; return 'vec4('+(r?[r[0], r[1]-r[0], r[2], r[3]].map(v=>v.toFixed(5)):['0.0', '0.0', '1.0', '0.0']).join(', ')+')'; }).join(', ')});
vec3 surfHR(float c){ return SURF_HRS[int(mod(c, ${SURF_KINDS}.0)+0.5)].xyz; }
// Their heights in km, from their maps' alpha.
float surfH(float c, float lon, float lat, float lod){
  vec3 hr=surfHR(c);
  return surfTex(c, lon, lat, lod).a*hr.y+hr.x;
}`;
