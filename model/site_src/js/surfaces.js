// The rocky bodies' surfaces, from spacecraft maps (all public domain): Mercury from MESSENGER's
// MDIS MD3 colour mosaic (1000, 750 and 430 nm; USGS), Mars from Viking's colour mosaic (USGS), Io
// from Galileo's colour over the Galileo and Voyager mosaic, Europa from the Galileo and Voyager
// mosaic (grey, in Europa's tint), Ganymede from the Galileo and Voyager colour mosaic (all USGS
// Astrogeology), Callisto from the Galileo and Voyager mosaic (grey, in Callisto's tint; USGS), and
// Tethys, Dione and Rhea from Cassini's colour maps (PIA18439, PIA18434, PIA18438;
// NASA/JPL-Caltech/SSI/LPI). Each map is turned to start at longitude 0 (the IAU prime meridian;
// the moons' faces the host), east to the right; the gaps (Europa south of 83°S, Callisto's south
// polar region over a third of its longitudes, slivers at other poles) filled from round about,
// smooth where there is no data; the colours toned
// toward true colour, the Cassini and USGS colour composites reaching into the ultraviolet and
// infrared; and each scaled to the same mean brightness (surfaces.py).
//
// One file per body (surf/<name>.webp: Mercury's and Mars's 4096 x 2048, each moon's 1024 x 512),
// fetched only once the walk-around view draws that body as a disk of a few pixels (vr_paint.js
// uploadBodies). It is decoded off the main thread and read out once, and its pixels go into the
// nebulae's texture array as 512-pixel tiles (every texture unit being in use, the maps share it),
// the array remade with room for each map as it arrives. Uploading tiles straight from the image
// made the browser convert the whole image again for each one, freezing the page for half a minute.
const SURF_FILES=__SURF_FILES__;
const surfMaps={};
// Ask for body name's map; true once it is in the texture array.
function wantSurface(name){
  const s=surfMaps[name];
  if(s) return s.base!=null;
  const m=surfMaps[name]={px:null, w:0, h:0, base:null};
  fetch(SURF_FILES[name]).then(r=>r.blob()).then(b=>createImageBitmap(b, {colorSpaceConversion:'none', premultiplyAlpha:'none'})).then(bm=>{
    const cv=new OffscreenCanvas(bm.width, bm.height), ctx=cv.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(bm, 0, 0); m.w=bm.width; m.h=bm.height; m.px=ctx.getImageData(0, 0, m.w, m.h).data; bm.close();
    requestVR();
  }).catch(()=>{});
  return false;
}
// The surface's code for the sky shader (bodyM's w): -1 for none, else its first layer times 4
// plus its kind (0 a moon's two tiles, 1 Mercury's and 2 Mars's 8 x 4).
function surfCode(name){
  const s=name&&surfMaps[name];
  return s&&s.base!=null?s.base*4+(name==='Mercury'?1:name==='Mars'?2:0):-1;
}
// The nebulae's tiles (dso.js, from their pixels; left empty until they are in) and every map that
// has arrived, in one array (unit 6), mipmapped; remade whenever either arrives.
function buildSkyArray(gl){
  const n=DSO.objects.length, N=DSO_N, ready=Object.keys(surfMaps).filter(k=>surfMaps[k].px);
  let layers=n;
  for(const k of ready){ const m=surfMaps[k]; m.base=layers; layers+=(m.w/N)*(m.h/N); }
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
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.activeTexture(gl.TEXTURE0);
  if(vrGL.dsoTex) gl.deleteTexture(vrGL.dsoTex);
  vrGL.dsoTex=t; vrGL.skyArrayMaps=ready.length; vrGL.skyArrayDso=!!dsoPx;
}
// Make or remake the array when a map has arrived since it was made.
function syncSurfTex(gl){
  const ready=Object.keys(surfMaps).filter(k=>surfMaps[k].px).length;
  if(ready&&ready!==(vrGL.skyArrayMaps||0)) buildSkyArray(gl);
}
// The sky shader's lookup: the map with code c (surfCode) at east longitude lon and latitude lat
// (degrees), lod the level of detail of a 512-texel map round the equator.
const SURF_GLSL=`
vec3 surfAt(float c, float lon, float lat, float lod){
  float kind=mod(c, 4.0), base=floor(c/4.0+0.01), u=fract(lon/360.0), v=clamp((90.0-lat)/180.0, 0.0, 1.0);
  float layer, s, t;
  if(kind>0.5){ float x=min(u*8.0, 7.9999), y=min(v*4.0, 3.9999); layer=floor(y)*8.0+floor(x); s=fract(x); t=fract(y); lod+=3.0; }
  else { float x=min(u*2.0, 1.9999); layer=floor(x); s=fract(x); t=v; lod+=1.0; }
  // Mars's disk is drawn brighter (planets.js BODY_GAIN); its map a little darker to match.
  return textureLod(dsoTex, vec3(s, t, base+layer), max(lod, 0.0)).rgb*(kind>1.5?1.3:1.78);
}`;
