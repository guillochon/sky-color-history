"""Ceres's, Vesta's and Phobos's maps and shapes for the walk-around view -> site/surf/<name>.webp
(surfaces.js) and site/relief/<name>.webp.

Sources, public domain (USGS Astrogeology, made by DLR; asc-pds-services.s3.us-west-2.amazonaws.com/
mosaic/, where planetarymaps.usgs.gov/mosaic/ redirects):
  Ceres   Dawn FC global mosaic, 20 pixels a degree (Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif, Roatsch
          et al.), and the HAMO DTM, 60 a degree (Ceres_Dawn_FC_HAMO_DTM_DLR_Global_60ppd_Oct2016.tif,
          Preusker et al. 2016: radii, 16-bit metres over 470 km), both longitude 0 at the left edge, in
          the IAU's Kait system.
  Vesta   Dawn FC HAMO clear-filter mosaic, 74 a degree (Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd.tif),
          and the HAMO DTM, 48 a degree (Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd.tif: radii, 32-bit metres),
          both centred on longitude 0, in the Claudia Double Prime system the IAU adopted (Claudia
          crater at 146 E).
  Phobos  Mars Express SRC mosaic, 16 a degree (Phobos_ME_SRC_Mosaic_Global_16ppd.tif), and the HRSC
          shape, 2 a degree (Phobos_ME_HRSC_DEM_Global_2ppd.tif: heights over a sphere of 11.1 km, 16-bit
          metres; Willner et al. 2010), centred on longitude 0, which faces Mars.
All are planetocentric, east longitude. Each map is box-averaged to 1024 x 512 (the no-data pixels left
out, then filled from round about), turned so its left edge is longitude 0, given the body's tint and
scaled to a mean luminance of 0.45 (cosine-weighted), as surfaces.py does the moons'. Each shape's
radii are fit by the spheroid about the pole that matches them best (planetocentric: r = ac /
sqrt(c² cos² lat + a² sin² lat)), whose equatorial radius a and flattening 1 - c/a planets.js draws;
what is left, the relief over it (Vesta's south polar basins, Phobos's long axes), goes into one byte
from the lowest to the highest (printed for surfaces.js SURF_RELIEF), dithered, lossless, as
relief_maps.py does Mars's and Mercury's.

Usage: python small_bodies.py <dir with the six GeoTIFFs> [name ...]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.optimize import least_squares
Image.MAX_IMAGE_PIXELS = None

HERE = Path(__file__).resolve().parent
SURF, RELIEF = HERE.parent / 'site' / 'surf', HERE.parent / 'site' / 'relief'
W, H = 1024, 512
LUM = np.array([0.2126, 0.7152, 0.0722])
# Bodies whose maps' left and right edges, meeting once turned, leave a seam.
SEAM = {'phobos'}
# name: mosaic, DTM, the DTM's dtype, its no-data value, metres added to its values, the longitude
# at the left edge of both, tint
BODIES = {
    'ceres': ('Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif', 'Ceres_Dawn_FC_HAMO_DTM_DLR_Global_60ppd_Oct2016.tif', '<i2', -32768, 470000, 0, (0.92, 0.9, 0.86)),
    'vesta': ('Vesta_Dawn_FC_HAMO_Mosaic_Global_74ppd.tif', 'Vesta_Dawn_HAMO_DTM_DLR_Global_48ppd.tif', '<f4', None, 0, -180, (1.0, 0.92, 0.82)),
    'phobos': ('Phobos_ME_SRC_Mosaic_Global_16ppd.tif', 'Phobos_ME_HRSC_DEM_Global_2ppd.tif', '<i2', -32768, 11100, -180, (0.72, 0.66, 0.6)),
}


def raw(path, dtype):
    """The GeoTIFF's one band as a memory map (all these are uncompressed, their strips in order)."""
    im = Image.open(path)
    w, h = im.size
    return np.memmap(path, dtype, 'r', im.tag_v2[273][0], (h, w))


def shrink(a, bad):
    """Box-average to W x H, leaving out pixels bad(values) is true for: (sum, weight)."""
    h, w = a.shape
    if h < H:
        # Coarser than the grid (Phobos's shape): bilinear, wrapping in longitude.
        b = np.asarray(a, np.float64); ok = ~bad(b)
        b = np.pad(np.where(ok, b, np.nan), ((0, 0), (1, 1)), mode='wrap')
        y = ((np.arange(H) + 0.5) * h / H - 0.5).clip(0, h - 1); x = (np.arange(W) + 0.5) * w / W - 0.5 + 1
        return ndimage.map_coordinates(b, np.meshgrid(y, x, indexing='ij'), order=1, mode='nearest'), np.ones((H, W))
    ce = np.round(np.linspace(0, w, W + 1)).astype(int)[:-1]
    re = np.round(np.linspace(0, h, H + 1)).astype(int)
    s = np.zeros((H, W)); n = np.zeros((H, W))
    for j in range(H):
        b = np.asarray(a[re[j]:re[j + 1]], np.float64); ok = ~bad(b)
        s[j] = np.add.reduceat(np.where(ok, b, 0).sum(0), ce); n[j] = np.add.reduceat(ok.sum(0), ce)
    return s, n


def fill(v, ok):
    """No-data cells from round about: averages over ever wider boxes, wrapping in longitude, then
    smoothed by blurring them over and over at ever finer scales, the data held, so that what is
    filled blends into what is round it without blocks or steps."""
    v = np.where(ok, v, 0.0); w = ok.astype(np.float64); out = v.copy(); todo = ~ok; r = 1
    while todo.any() and r < 1024:
        s = ndimage.uniform_filter(v * w, 2 * r + 1, mode=('nearest', 'wrap')); n = ndimage.uniform_filter(w, 2 * r + 1, mode=('nearest', 'wrap'))
        k = todo & (n > 1e-6)
        out[k] = s[k] / n[k]; todo &= ~k; r *= 2
    gap = ~ok
    for sg in (32, 16, 8, 4, 2, 1):
        for _ in range(6):
            out[gap] = ndimage.gaussian_filter(out, sg, mode=('nearest', 'wrap'))[gap]
    return out


def turn(a, left):
    return np.roll(a, int(round(W * left / 360.0)), axis=1) if left else a


def colour(name, path, left, tint):
    s, n = shrink(raw(path, 'u1'), lambda b: b <= 0)
    g = s / np.maximum(n, 1) / 255.0
    lat = 90 - (np.arange(H) + 0.5) * 180 / H
    med = np.median(g[n > 0])
    # Poleward of 45 degrees, ground in shadow or night when the pictures were taken (Vesta's north,
    # Ceres's far south, Phobos's polar slopes) is a gap, a few pixels round it too; so are the
    # columns where Phobos's map's edges meet.
    gap = (n == 0) | ((g < 0.3 * med) & (np.abs(lat) > 45)[:, None])
    if name in SEAM:
        gap[:, :8] = gap[:, -8:] = True
    ok = ~ndimage.binary_dilation(gap, iterations=3)
    # The mosaics are not corrected for the light: toward the poles, the Sun low, the ground is drawn
    # darker. Poleward of 40 degrees each row's median is brought to the whole map's.
    for j in np.where(np.abs(lat) > 40)[0]:
        if ok[j].sum() > W // 8:
            w = min(1.0, (abs(lat[j]) - 40) / 20)
            g[j] /= np.clip(np.median(g[j][ok[j]]) / med, 0.3, 1.5) ** w
    print(f'{name}: map {100 * (1 - ok.mean()):.2f}% filled')
    g = turn(fill(g, ok), left)
    t = np.array(tint); a = g[..., None] * (t / (t * LUM).sum())
    lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
    wgt = np.cos(lat)[:, None]
    a = np.clip(a * (0.45 / (((a * LUM).sum(2) * wgt).sum() / (wgt.sum() * W))), 0, 1)
    q = (a * 255 + 0.5).astype(np.uint8)
    SURF.mkdir(exist_ok=True)
    Image.fromarray(q).save(SURF / f'{name}.webp', 'WEBP', quality=88, method=6)


def shape(name, path, dtype, nodata, base, left):
    a = raw(path, dtype)
    bad = (lambda b: (b == nodata) | ~np.isfinite(b)) if nodata is not None else (lambda b: ~np.isfinite(b) | (np.abs(b) > 1e9))
    s, n = shrink(a, bad)
    ok = (n > 0) & np.isfinite(s)
    if name in SEAM:
        ok[:, :8] = ok[:, -8:] = False
    r = turn(fill((np.where(ok, s, 0) / np.maximum(n, 1) + base) / 1000.0, ok), left)
    print(f'{name}: shape {100 * (1 - ok.mean()):.2f}% filled, radii {r.min():.2f} to {r.max():.2f} km')
    lat = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
    wgt = np.broadcast_to(np.sqrt(np.cos(lat))[:, None], r.shape)
    sph = lambda p: p[0] * p[1] / np.sqrt((p[1] * np.cos(lat)) ** 2 + (p[0] * np.sin(lat)) ** 2)[:, None]
    p = least_squares(lambda p: ((r - sph(p)) * wgt).ravel(), [r.max(), r.min()]).x
    h = r - sph(p)
    lo, hi = np.floor(h.min() * 10) / 10, np.ceil(h.max() * 10) / 10
    print(f'{name}: spheroid a {p[0]:.2f} km, c {p[1]:.2f}, flattening {1 - p[1] / p[0]:.5f}; relief {lo:.1f} to {hi:.1f} km (SURF_RELIEF [{lo}, {hi}, {p[0]:.2f}])')
    rng = np.random.default_rng(1)
    q = np.clip(np.round((h - lo) / (hi - lo) * 255 + rng.uniform(-0.5, 0.5, h.shape)), 0, 255).astype(np.uint8)
    RELIEF.mkdir(exist_ok=True)
    Image.fromarray(q).save(RELIEF / f'{name}.webp', lossless=True, method=6)


if __name__ == '__main__':
    src = Path(sys.argv[1])
    for name, (m, d, dt, nd, base, left, tint) in BODIES.items():
        if sys.argv[2:] and name not in sys.argv[2:]:
            continue
        colour(name, src / m, left, tint)
        shape(name, src / d, dt, nd, base, left)
