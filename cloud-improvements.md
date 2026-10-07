# VR cloud renderer: suggested improvements

Scope: `CLOUDFS`, `makeCloudNoise`, `cloudField` and the cloud pass in `paintVR`, all in `model/gen_site.py` (around lines 1107–1597). Items are ordered by payoff. Items 1–4 fix the cloud **shape**. Items 5–8 fix the **lighting and rendering**. Items 9–12 are about **performance and polish**. Several later items depend on items 1–3, so do those first.

---

## Diagnosis

1. **The noise is sampled in 2D.** Every `texture(noise, …)` call in `cloudDen` uses `vec3(plane*sc*k, <constant>)`. That reads a fixed z-slice of the 3D texture. The only vertical structure comes from the analytic `body` slab profile and the `ph*0.55` term in the `inn` lookup. The result is 2D blobs pushed straight up into columns, with no overhangs, no cauliflower tops and no vertical billowing. This is the biggest reason the shapes look off.
2. **The vertical profile is a symmetric slab floating at a random altitude.** `center` is anywhere from 0.18 to 0.82 of a 1.5–16.2 km layer, and `halfH` reaches 0.46. So a cloud can be a puffy symmetric lens centred at 9–10 km. Real cumulus have a **flat base at a shared condensation level**, rounded tops, and density that grows with height before it rolls off. Cirrus-type clouds belong at 8–12 km, not puffy ones.
3. **The noise basis is thin.** It has two channels of single-octave inverted Worley F1 (4 and 2 cells) in a 64³ texture. There is no Perlin-Worley base, no Worley FBM, and no high-frequency erosion texture. Inverted F1 on its own gives smooth spheres with creases along cell boundaries.
4. **Coverage multiplies the shape instead of eroding it.** `gate*core*body*shape` multiplies four smoothsteps, so every edge gets the same soft fuzz. The usual remap approach (below) gives crisp billowy edges with wispy fringes.
5. **The visible tiling has a known cause.** The gate repeats every ~1/(sc·0.42) ≈ 60 km and the billows every ~16 km. Shallow rays reach 100 km or more through this shell, so the repeats show.
6. **Self-shadowing skips the near field.** `lightBeer` takes 2 samples, at 1.6–5.2 km and 2.2× that. No density within ~1.5 km of the sample shadows it, so small-scale detail never darkens itself, and clouds read as flat cutouts.
7. **Each sample is tone-mapped on its own into an RGBA8 target.** `lin/=peak` plus the hue fix-up runs per sample, before compositing. This flattens contrast: bright and mid-lit parts get pulled together. It works around 8-bit clipping instead of fixing it.
8. **The view march is uniform and too coarse.** It takes 36 fixed steps across tIn to tOut, with `dt ≥ 160 m`, and on shallow rays several km. Much of the LOD logic (`kMax`, the `cell` vs `dt` comments, the 3-tap `bodySum` averaging) exists to hide that step size.
9. Minor issues:
   - The `deck` argument to `cloudDen` is unused.
   - `lightBeer` passes the *view* ray's `dt` and `lod` into the shadow density. Shadow detail therefore changes with view distance, not with the light path.
   - The jitter (`ign`) is fixed per pixel, so the noise pattern is frozen to the screen rather than averaging out over frames.

---

## Shape

### 1. Real 3D noise textures (replace `makeCloudNoise`)
Build two tileable textures, following the Schneider / Horizon Zero Dawn (HZD) layout:

- **Base, 128³ RGBA8:**
  - R = Perlin-Worley (Perlin FBM remapped by inverted Worley FBM).
  - G, B, A = inverted Worley FBM at 3 increasing frequencies (for example 4/8/16 cells, 3 octaves each, weights 0.625/0.25/0.125).
- **Detail, 32³ RGB8:** inverted Worley FBM at 3 higher frequencies.

Generating this in JS at 128³ takes ~1–2 s. Better options:
- Generate on the GPU by rendering into each z-layer of the 3D texture with `framebufferTextureLayer`, using one draw per slice.
- Generate once and cache it in IndexedDB.

Sample both textures in **true 3D**, using altitude as the third coordinate:
```glsl
vec3 q = vec3(plane, alt) * sc;            // alt in metres, same scale as xy
q.z *= 1.6;                                 // a little vertical stretch reads more cumulus
vec4 n = texture(noiseBase, q);
float fbm = n.g*0.625 + n.b*0.25 + n.a*0.125;
float base = remap(n.r, fbm - 1.0, 1.0, 0.0, 1.0);
```
To break up the repeats, use non-integer scale ratios between textures (for example 1.0 / 0.37 / 2.9) and rotate the domain between lookups:
```glsl
const mat3 ROT = mat3(0.80,0.36,-0.48, -0.60,0.48,-0.64, 0.0,0.80,0.60);
```

### 2. Add a weather map and replace the floating slab with a height gradient
Add a separate 2D texture (256² or 512², REPEAT, sampled at large scale) with these channels:
- R = coverage
- G = cloud type (0 = stratus, 0.5 = cumulus, 1 = cumulonimbus)
- B = top height

Use it in place of the `gate` lookup and the `center`/`halfH` logic:

```glsl
float remap(float v, float a, float b, float c, float d){ return c + (v-a)/(b-a)*(d-c); }

// h = 0 at cloud base, 1 at the top of this cloud's column
float heightGradient(float h, float type){
  // stratus: thin, low; cumulus: quick rise, rounded top; Cb: tall, anvil-ish
  vec4 st = vec4(0.00,0.05,0.10,0.20);
  vec4 cu = vec4(0.00,0.07,0.45,0.75);
  vec4 cb = vec4(0.00,0.08,0.80,1.00);
  vec4 g = type < 0.5 ? mix(st, cu, type*2.0) : mix(cu, cb, (type-0.5)*2.0);
  return smoothstep(g.x, g.y, h) * (1.0 - smoothstep(g.z, g.w, h));
}
```
Make the layer much thinner. Use a **shared base around 1.2–2.0 km**, with ±150 m low-frequency variation at most, and a top from the weather map. That is ~2–4 km for cumulus, and up to ~10 km only where type≈1. A 14.7 km slab is the main reason the march is so coarse.

Earlier commits moved away from a shared base because it produced a long bright rim. The fix for that is lighting (items 5–6) plus a short ramp at the base (`smoothstep(0, 0.07, h)`). Abandoning flat bases is not the fix: flat, darker bases are what make cumulus read as cumulus.

### 3. Remap-based density (replace `gate*core*body*shape`)
```glsl
float base   = remap(lowFreqNoise * heightGradient(h, type), 1.0 - coverage, 1.0, 0.0, 1.0);
base        *= coverage;                    // keeps thin coverage from turning into haze
if (base <= 0.0) return 0.0;               // cheap early-out, before any detail fetch
// Detail erodes edges: wispy at the bottom, billowy at the top
vec3 d = texture(noiseDetail, q * 6.3 + curlOffset).rgb;
float dfbm = d.r*0.625 + d.g*0.25 + d.b*0.125;
float detailMod = mix(dfbm, 1.0 - dfbm, clamp(h * 6.0, 0.0, 1.0));
float density = remap(base, detailMod * 0.35, 1.0, 0.0, 1.0);
return max(density, 0.0) * densityScale;
```
Optional: add a small 2D curl-noise texture to offset `q` before the detail lookup, scaled by `(1-h)`. It gives the bottoms a turbulent, torn look.

### 4. Per-era cloud *type*, not just coverage
Extend `CLOUD_COV` / `cloudField` to return `{cov, type, base, top}`. Suggested values:
- Hadean steam: a high-coverage stratiform deck (type ~0.1, thick).
- Carboniferous: cumulus congestus with occasional Cb (type 0.6–0.9).
- Snowball, impact winter: thin, sparse stratus/cirrus (type ~0).
- Modern: fair-weather cumulus (type ~0.5).

Feed these in as uniforms that bias the weather-map channels.

---

## Lighting and rendering

### 5. Better light march
Take 5–6 shadow samples with growing step length so the near field is covered:
```glsl
const float LS[6] = float[](40.0, 120.0, 280.0, 600.0, 1200.0, 3000.0);
float tau = 0.0, prev = 0.0;
for (int i = 0; i < 6; i++) {
  float s = LS[i];
  float d = cloudDenCheap(p + sd * s, /*detail=*/ i < 2);  // detail only on the nearest taps
  tau += d * (s - prev); prev = s;
}
```
Compute the shadow LOD from the **light step size**, not from the view ray's `dt`.

### 6. Proper phase function and multiple-scattering approximation
Replace `pow(dot(rd,sd),5)` with a dual-lobe Henyey-Greenstein:
```glsl
float hg(float c, float g){ float g2=g*g; return (1.0-g2)/(4.0*3.14159*pow(1.0+g2-2.0*g*c, 1.5)); }
float phase(float c){ return mix(hg(c, 0.8), hg(c, -0.25), 0.3); }
```
Then use the Wrenninge / Hillaire multi-octave scattering approximation. It is the cheapest large realism win, because thick clouds stop going muddy grey and get the bright, soft interior:
```glsl
vec3 S = vec3(0.0); float a = 1.0, b = 1.0, c = 1.0;
for (int o = 0; o < 4; o++) {
  S += a * exp(-tau * sigmaE * b) * phase(c * cosTheta) * sunCol;
  a *= 0.5; b *= 0.5; c *= 0.5;
}
```
Optionally multiply by a "powder" term `1.0 - exp(-2.0 * density * k)`, mixed in by view-to-sun angle. It darkens edges seen away from the sun.

### 7. Height-dependent ambient
`amb` is currently one sky texel, applied uniformly. Pass two colours instead:
- `skyZenith`, sampled from the top rows of the sky texture.
- `groundBounce`, from `groundRGB()` × sun.

Then:
```glsl
vec3 ambient = mix(groundBounce * 0.6, skyZenith, h);   // h = height fraction in the cloud
```
This gives darker, warmer bases and bluish tops, with no extra rays.

### 8. Linear HDR accumulation, tone-map once
- Render the cloud pass into **RGBA16F**. This needs `EXT_color_buffer_float`, which is nearly universal on WebGL2. Fall back to the current path without it.
- Remove the per-sample `lin/=peak` and the hue fix-up. Accumulate physically linear radiance.
- Apply one tone-map in `COMPFS`, using the same curve the sky uses, so cloud and sky brightness stay consistent. If the sky texture is already display-referred sRGB, convert it to linear when the cloud shader samples it, then convert back after tone-mapping.

This one change brings back most of the shading contrast that per-sample normalisation removes.

Also raise extinction toward realistic values once stepping is adaptive (item 9). The current `0.0032/3` per metre gives a ~1 km mean free path, which makes clouds look like smoke. Real cumulus are closer to ~0.02–0.05 /m. Raise it gradually and tune by eye.

---

## Performance and polish

### 9. Adaptive view march
- Use large steps (~400–800 m) while sampling **only** the weather map plus base noise.
- On the first non-zero density, step back one step and switch to small steps (~60–150 m, growing with distance).
- After ~6 empty small steps, return to large steps.
- Cap the march at ~60–80 km and fade density to zero approaching the cap, rather than integrating hundreds of km of shallow ray.

With a 2–4 km layer this gives much finer sampling for the same or lower cost. Most of the `lod`/`kMax`/`bodySum` workarounds can then be removed.

### 10. Temporal accumulation
- Change the jitter every frame: `ign` offset by `frameIndex * 5.588238`, or a 64² blue-noise texture rotated per frame.
- Keep a history texture. Reproject with last frame's yaw, pitch and eye, which is easy because clouds sit far away and the ray direction is known. Blend at ~0.9 history, and reject history when its alpha differs a lot.
- This lets the cloud target drop to 1/2 resolution, or 1/4 with a 4-frame checkerboard, while looking *better* than the current 2/3 static jitter.

### 11. Wind shear and evolution
- Offset sampling by `windDir * h * shear` so tops lean downwind.
- Animate the 3D noise slowly through time, separately from drift, so clouds billow and change shape instead of only translating. With true 3D sampling this is just an extra offset term on `q`.

### 12. Cloud shadows on the ground (cheap, big realism win)
In `VRFS` (the ground branch), march from the ground point toward the sun to the cloud base and sample the weather-map coverage once or twice. Darken `gcol` by `mix(1.0, 0.45, coverageAlongSun)`. Moving shadows on the plain sell the scale a lot.

Optional extra: add a 2D cirrus layer at ~9 km. It is a single textured spherical shell with an FBM alpha, lit with the HG phase, and costs almost nothing, but it adds a lot to modern, Carboniferous and volcanic skies.

---

## Suggested order of work
1. 3D noise textures + true-3D sampling (items 1, 3).
2. Weather map + height gradient + thinner layer (item 2).
3. HDR target + remove per-sample normalisation (item 8).
4. Light march + HG + multi-scatter (items 5, 6), then the ambient gradient (item 7).
5. Adaptive stepping, then raise extinction (item 9).
6. Temporal accumulation (item 10), then shear, ground shadows, cirrus, and per-era types (items 4, 11, 12).

## References
- Schneider & Vos, *The Real-Time Volumetric Cloudscapes of Horizon Zero Dawn*, SIGGRAPH 2015 (remap, height gradients, noise layout, powder).
- Hillaire, *Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite*, SIGGRAPH 2016 (energy-conserving integration, multi-scatter octaves).
- Wrenninge et al., *Oz: The Great and Volumetric*, SIGGRAPH 2013 (multiple-scattering approximation).
- Schneider, *Nubis: Authoring Real-Time Volumetric Cloudscapes*, SIGGRAPH 2017 (adaptive marching, temporal reprojection).
