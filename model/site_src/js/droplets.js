// Cloud and fog droplets (droplets.py): the light they send each way, for the cloudbows on sunlit
// clouds (shader_clouds.js) and the fogbows and glories in fog (shader_present.js). Lorenz-Mie
// theory for each epoch's droplets, whose size follows how much the air has for water to condense
// on: big droplets before life, small ones in the sulfate of a great eruption, the Chicxulub
// impact's, and today's polluted air. The table, site/drops.bin, is half floats: per row (a droplet
// population) DROPS.n angles from 0° to 180°, RGBA: the phase function in linear sRGB relative to
// the sunlight, an isotropic scatterer 1, and in A its luminance smoothed over 12°. DROPS.epochs:
// each epoch's [cloud row, fog row].
const DROPS=__DROPS__;
function dropRowsFor(key){ return DROPS.epochs[key]||DROPS.epochs.modern; }
// The table's columns: 0.1° apart to 20° (the forward peak about the Sun), 1° to 120°, 0.1° beyond
// (the bows and the glory), as droplets.py drop_angles lays them out.
const DROP_GLSL=`
uniform sampler2D dropTex;
float dropU(float th){
  float i=th<20.0?th*10.0:th<120.0?180.0+th:th*10.0-900.0;
  return (i+0.5)/${DROPS.n}.0;
}
// The droplets of row at th degrees from the Sun's direction.
vec4 dropAt(float th, float row){ return texture(dropTex, vec2(dropU(th), (row+0.5)/${DROPS.rows}.0)); }
`;
// The table on texture unit 20, fetched once; a black texel until it comes, and vrGL.dropOk then.
function bindDrops(gl){
  gl.activeTexture(gl.TEXTURE20);
  if(!vrGL.dropTex){
    vrGL.dropTex=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, vrGL.dropTex);
    texParams(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 1, 1, 0, gl.RGBA, gl.FLOAT, new Float32Array(4));
    const tex=vrGL.dropTex;
    fetch(DROPS.file).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status)).then(buf=>{
      if(!vrGL || vrGL.dropTex!==tex) return;
      gl.activeTexture(gl.TEXTURE20); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, DROPS.n, DROPS.rows, 0, gl.RGBA, gl.HALF_FLOAT, new Uint16Array(buf));
      gl.activeTexture(gl.TEXTURE0);
      vrGL.dropOk=true; requestVR();
    }).catch(e=>console.warn('drops.bin', e));
  } else gl.bindTexture(gl.TEXTURE_2D, vrGL.dropTex);
  gl.activeTexture(gl.TEXTURE0);
}
