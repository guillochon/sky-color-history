// The rocky bodies' surfaces, from spacecraft maps (all public domain): Mercury from MESSENGER's
// MDIS MD3 colour mosaic (1000, 750 and 430 nm; USGS), Mars from Viking's colour mosaic (USGS), Io from Galileo's colour over the Galileo
// and Voyager mosaic, Europa from the Galileo and Voyager mosaic (grey, in Europa's tint), Ganymede
// from the Galileo and Voyager colour mosaic (all USGS Astrogeology), and Tethys, Dione and Rhea
// from Cassini's colour maps (PIA18439, PIA18434, PIA18438; NASA/JPL-Caltech/SSI/LPI). Callisto has
// no map of its whole sphere (nothing south of about 60°S over a third of its longitudes), so it
// keeps its plain disk. Each map is turned to start at longitude 0 (the IAU prime meridian; the
// moons' faces the host), east to the right; the few gaps (Europa south of 83°S, slivers at other
// poles) filled from round about; the colours toned toward true colour, the Cassini and USGS
// colour composites reaching into the ultraviolet and infrared; and each scaled to the same mean
// brightness. In one image (surfaces.webp) of 512-pixel tiles, eight to a row: Mercury's and
// Mars's 4096 x 2048 maps as the first 32 each, then each moon's 1024 x 512 as two. Fetched the first time the
// walk-around view draws one of them as a disk of a few pixels (vr_paint.js uploadBodies), and put
// after the nebulae's tiles in their texture array.
const SURF_IMG='__SURF_IMG__', SURF_LAYERS=76, SURF_MAP={Mercury:0, Mars:1, Io:2, Europa:3, Ganymede:4, Tethys:5, Dione:6, Rhea:7};
let surfImg=null, surfAsked=false;
function syncSurfTex(gl){
  if(!surfAsked&&vrGL.surfWanted){
    surfAsked=true;
    const img=new Image();
    img.onload=()=>{ surfImg=img; requestVR(); };
    img.src=SURF_IMG;
  }
  if(!surfImg||!vrGL.dsoTex||vrGL.surfOn) return;
  const n=DSO.objects.length, N=DSO_N;
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D_ARRAY, vrGL.dsoTex);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, surfImg.width);
  for(let i=0;i<SURF_LAYERS;i++){
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, (i%8)*N); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, Math.floor(i/8)*N);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, n+i, N, N, 1, gl.RGBA, gl.UNSIGNED_BYTE, surfImg);
  }
  gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.activeTexture(gl.TEXTURE0);
  vrGL.surfOn=true;
}
// The sky shader's lookup: map m's colour at east longitude lon and latitude lat (degrees), lod the
// texture's level of detail in its own 512-pixel tiles' texels.
const SURF_GLSL=`
vec3 surfAt(int m, float lon, float lat, float lod){
  float u=fract(lon/360.0), v=clamp((90.0-lat)/180.0, 0.0, 1.0);
  float layer, s, t;
  if(m<=1){ float x=min(u*8.0, 7.9999), y=min(v*4.0, 3.9999); layer=float(m)*32.0+floor(y)*8.0+floor(x); s=fract(x); t=fract(y); lod+=3.0; }
  else { float x=min(u*2.0, 1.9999); layer=64.0+float(m-2)*2.0+floor(x); s=fract(x); t=v; lod+=1.0; }
  // Mars's disk is drawn brighter (planets.js BODY_GAIN); its map a little darker to match.
  return textureLod(dsoTex, vec3(s, t, ${DSO.objects.length}.0+layer), max(lod, 0.0)).rgb*(m==1?1.3:1.78);
}`;
