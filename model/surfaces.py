"""The rocky bodies' surface maps for the walk-around view -> site/surfaces.webp (surfaces.js).

Sources, all public domain (NASA/USGS; Cassini maps NASA/JPL-Caltech/SSI/LPI):
  Mercury   USGS MESSENGER MDIS MD3 colour mosaic, 665 m (796 MB GeoTIFF), downsampled to 4096 px:
            https://planetarymaps.usgs.gov/mosaic/Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_665m.tif
  Mars      USGS Viking colour mosaic, 925 m (798 MB GeoTIFF), downsampled to 4096 px:
            https://planetarymaps.usgs.gov/mosaic/Mars_Viking_ClrMosaic_global_925m.tif
  Io        USGS Galileo SSI / Voyager colour-merged 1 km mosaic, 1024 px JPG
  Europa    USGS Voyager / Galileo SSI 500 m mosaic, 1024 px JPG (nothing south of 83 S: filled)
  Ganymede  USGS Voyager / Galileo SSI colour mosaic 1.4 km, 1024 px JPG
  Tethys, Dione, Rhea  Cassini colour maps PIA18439, PIA18434, PIA18438 (Wikimedia 3840 px copies)
  Callisto is left out: its mosaic has nothing south of about 60 S over a third of its longitudes.
Each map is turned so its left edge is longitude 0 (east to the right), its no-data pixels are
filled from round about (push-pull over a pyramid, wrapping in longitude), its colour is toned
down toward true colour by a factor per body, and it is scaled to a mean luminance of 0.45
(cosine-weighted; the shader brings it to 0.8). One file per body, fetched only when the view zooms
in on it: Mercury's and Mars's 4096 x 2048, each moon's 1024 x 512 (site/surf/<name>.webp).

Usage: python surfaces.py <download dir with io/io.jpg, europa/europa.jpg, ...>
       <mercury 4096x2048 png> <mars 4096x2048 png> <out dir> <preview dir>
(the 4096 px pngs are box-downsampled from the GeoTIFFs)
"""
import sys
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

dl, merc, mars, out, prev = sys.argv[1:6]
# name, file, left-edge longitude, saturation kept, tint for a grayscale map
BODIES = [
    ('io', f'{dl}/io/io.jpg', 180, 0.55, None),
    ('europa', f'{dl}/europa/europa.jpg', 0, 1.0, (1.0, 0.96, 0.88)),
    ('ganymede', f'{dl}/ganymede/ganymede.jpg', 0, 0.45, None),
    ('tethys', f'{dl}/tethys/tethys.jpg', 0, 0.22, None),
    ('dione', f'{dl}/dione/dione.jpg', 0, 0.22, None),
    ('rhea', f'{dl}/rhea/rhea.jpg', 0, 0.22, None),
]
LUM = np.array([0.2126, 0.7152, 0.0722])


def load(path, size):
    im = Image.open(path)
    gray = im.mode in ('L', 'I;16', 'I')
    im = im.convert('RGB')
    a = np.asarray(im, dtype=np.float32) / 255.0
    return a, gray


def fill(a, valid):
    """Fill invalid pixels from valid ones: average down a pyramid, then fill back up."""
    levels = [(a * valid[..., None], valid.astype(np.float32))]
    while min(levels[-1][1].shape) > 4:
        s, w = levels[-1]
        H, W = w.shape
        H2, W2 = H // 2, W // 2
        s = s[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2, 3).sum((1, 3))
        w = w[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).sum((1, 3))
        levels.append((s, w))
    # Up: at each level, pixels with no weight take the coarser level's value.
    s, w = levels[-1]
    cur = s / np.maximum(w, 1e-6)[..., None]
    if (w <= 0).any():
        cur[w <= 0] = (s.sum((0, 1)) / max(w.sum(), 1e-6))
    for s, w in reversed(levels[:-1]):
        H, W = w.shape
        up = np.repeat(np.repeat(cur, 2, 0), 2, 1)
        up = np.pad(up, ((0, H - up.shape[0]), (0, W - up.shape[1]), (0, 0)), mode='edge')
        # smooth the upsampled field a little (wrapping in longitude)
        up = 0.5 * up + 0.25 * (np.roll(up, 1, 1) + np.roll(up, -1, 1))
        up = 0.5 * up + 0.25 * (np.pad(up, ((1, 0), (0, 0), (0, 0)), mode='edge')[:-1] + np.pad(up, ((0, 1), (0, 0), (0, 0)), mode='edge')[1:])
        own = s / np.maximum(w, 1e-6)[..., None]
        k = np.clip(w / 4.0, 0, 1)[..., None] if s is not levels[0][0] else (w > 0)[..., None].astype(np.float32)
        cur = own * k + up * (1 - k)
    return cur


def process(a, gray, left, sat, tint, size, name):
    if left:
        a = np.roll(a, -int(round(a.shape[1] * left / 360.0)) % a.shape[1], axis=1)
    valid = a.max(axis=2) > 2.5 / 255.0
    # Grow the gap a few pixels: the edges of no-data regions are often dark fringes.
    g = 2 + a.shape[1] // 1024
    # Only sizeable black regions are gaps (an opening: erode, then dilate back and g further);
    # lone black pixels are shadows.
    inv = ~valid
    e = 3 + a.shape[1] // 2048
    for _ in range(e):
        inv = inv & np.roll(inv, 1, 0) & np.roll(inv, -1, 0) & np.roll(inv, 1, 1) & np.roll(inv, -1, 1)
    # Near the poles any black pixel is a gap.
    rp = max(2, a.shape[0] // 30)
    inv[:rp] |= ~valid[:rp]; inv[-rp:] |= ~valid[-rp:]
    for _ in range(e + g):
        inv = inv | np.roll(inv, 1, 0) | np.roll(inv, -1, 0) | np.roll(inv, 1, 1) | np.roll(inv, -1, 1)
    valid = ~inv
    print(f'{name}: {100 * (1 - valid.mean()):.2f}% filled')
    a = fill(a, valid)
    im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).resize(size, Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255.0
    L = (a * LUM).sum(2, keepdims=True)
    a = L + sat * (a - L)
    if tint is not None:
        t = np.array(tint, dtype=np.float32)
        a = a * (t / (t * LUM).sum())
    lat = (0.5 - (np.arange(a.shape[0]) + 0.5) / a.shape[0]) * np.pi
    wgt = np.cos(lat)[:, None]
    mean = ((a * LUM).sum(2) * wgt).sum() / (wgt.sum() * a.shape[1])
    a = a * (0.45 / mean)
    return np.clip(a, 0, 1)


import os
os.makedirs(out, exist_ok=True)


def save(name, a):
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(f'{out}/{name}.webp', 'WEBP', quality=88, method=6)
    Image.fromarray((a * 255 + 0.5).astype(np.uint8)).resize((768, 384), Image.LANCZOS).save(f'{prev}/{name}_out.png')


m, _ = load(merc, (4096, 2048))
save('mercury', process(m, False, 180, 0.35, None, (4096, 2048), 'mercury'))
m, _ = load(mars, (4096, 2048))
save('mars', process(m, False, 180, 0.7, None, (4096, 2048), 'mars'))
for name, path, left, sat, tint in BODIES:
    a, gray = load(path, None)
    save(name, process(a, gray, left, sat, tint, (1024, 512), name))
